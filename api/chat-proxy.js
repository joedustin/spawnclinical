// SPAWN Clinical — Dusty AI chat proxy
// Ported from api/chat-proxy.php. Handles session creation, message exchange
// (persisted to Neon), and idea capture (emailed via Resend if configured).
import { randomBytes } from 'node:crypto';
import { sql } from '../lib/db.js';
import { applyCors, readJson } from '../lib/http.js';

const CHAT_MODEL      = 'claude-sonnet-4-6';
const CHAT_MAX_TOKENS = 350;
const MAX_HISTORY     = 20;   // messages kept in context
const MAX_PER_SESSION = 60;   // total messages before a session is capped

export default async function handler(req, res) {
  applyCors(req, res);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = readJson(req);
  if (!body || !body.action) return res.status(400).json({ error: 'Invalid request' });

  try {
    switch (body.action) {
      case 'start':     return await handleStart(body, res);
      case 'message':   return await handleMessage(body, res);
      case 'save_idea': return await handleSaveIdea(body, res);
      default:          return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'Server error: ' + e.message });
  }
}

// ── START SESSION ─────────────────────────────────────────────────────────────
async function handleStart(body, res) {
  const name   = (body.name || '').trim();
  const email  = (body.email || '').trim();
  const origin = (body.page_origin || '').trim();

  if (!name || !email) return res.json({ error: 'Name and email are required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.json({ error: 'Please enter a valid email address' });
  }

  const token = randomBytes(24).toString('hex');
  await sql`INSERT INTO chat_sessions (session_token, name, email, page_origin)
            VALUES (${token}, ${name}, ${email}, ${origin})`;

  const greeting = buildGreeting(name);
  await sql`INSERT INTO chat_messages (session_token, role, content)
            VALUES (${token}, 'assistant', ${greeting})`;

  return res.json({ success: true, session_token: token, name, greeting });
}

// ── CHAT MESSAGE ──────────────────────────────────────────────────────────────
async function handleMessage(body, res) {
  const token   = (body.session_token || '').trim();
  const userMsg = (body.message || '').trim();
  if (!token || !userMsg) return res.json({ error: 'session_token and message are required' });

  const [session] = await sql`SELECT * FROM chat_sessions WHERE session_token = ${token} LIMIT 1`;
  if (!session) return res.json({ error: 'Session not found or expired' });

  const [{ c: count }] = await sql`SELECT COUNT(*)::int AS c FROM chat_messages WHERE session_token = ${token}`;
  if (count >= MAX_PER_SESSION) {
    return res.json({
      error: 'max_reached',
      message: "We've hit our conversation limit for this session! Reach out at info@spawnclinical.com to keep the conversation going.",
    });
  }

  const history = await sql`SELECT role, content FROM chat_messages
                            WHERE session_token = ${token}
                            ORDER BY created_at ASC LIMIT ${MAX_HISTORY}`;

  await sql`INSERT INTO chat_messages (session_token, role, content) VALUES (${token}, 'user', ${userMsg})`;

  const messages = history.map((m) => ({ role: m.role, content: m.content }));
  messages.push({ role: 'user', content: userMsg });

  const result = await callClaude(messages, buildSystemPrompt(session.name));
  if (result.error) return res.json({ error: result.error });

  const reply = result?.content?.[0]?.text || 'Something went wrong — try again?';

  await sql`INSERT INTO chat_messages (session_token, role, content) VALUES (${token}, 'assistant', ${reply})`;
  await sql`UPDATE chat_sessions SET updated_at = NOW() WHERE session_token = ${token}`;

  return res.json({ success: true, reply });
}

// ── SAVE IDEA ─────────────────────────────────────────────────────────────────
async function handleSaveIdea(body, res) {
  const token = (body.session_token || '').trim();
  const idea  = (body.idea || '').trim();
  if (!token || !idea) return res.json({ success: false });

  const [session] = await sql`SELECT * FROM chat_sessions WHERE session_token = ${token} LIMIT 1`;
  if (!session) return res.json({ success: false });

  await sql`INSERT INTO chat_messages (session_token, role, content)
            VALUES (${token}, 'user', ${'[IDEA] ' + idea})`;

  await sendIdeaEmail(session.name, session.email, idea);
  return res.json({ success: true });
}

// ── EMAIL (Resend) ────────────────────────────────────────────────────────────
// Replaces PHP mail(). No-ops silently if RESEND_API_KEY isn't set.
async function sendIdeaEmail(name, email, idea) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;

  const to   = process.env.IDEA_NOTIFY_TO   || 'info@spawnclinical.com';
  const from = process.env.IDEA_NOTIFY_FROM || 'SPAWN Dusty <noreply@spawnclinical.com>';
  const safeIdea = String(idea).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  const html =
    `<h2 style="font-family:sans-serif;color:#7c3aed">💡 New Idea — SPAWN Chatbot</h2>` +
    `<p style="font-family:sans-serif"><strong>From:</strong> ${name} (${email})</p>` +
    `<p style="font-family:sans-serif"><strong>Idea:</strong></p>` +
    `<blockquote style="font-family:sans-serif;border-left:4px solid #7c3aed;padding-left:1rem;color:#333">${safeIdea}</blockquote>` +
    `<p style="font-family:sans-serif;color:#666;font-size:0.85em">Submitted via Dusty chatbot on spawnclinical.com</p>`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from, to, reply_to: email, subject: `💡 New Idea from ${name} via Dusty`, html }),
    });
  } catch {
    /* never block idea capture on email failure */
  }
}

// ── CLAUDE API CALL ───────────────────────────────────────────────────────────
async function callClaude(messages, system) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { error: 'Server missing ANTHROPIC_API_KEY' };
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: CHAT_MODEL, max_tokens: CHAT_MAX_TOKENS, system, messages }),
    });
    const data = await r.json();
    if (r.status !== 200) return { error: data?.error?.message || `Claude API error (${r.status})` };
    return data;
  } catch (e) {
    return { error: 'Upstream error: ' + e.message };
  }
}

// ── SYSTEM PROMPT ─────────────────────────────────────────────────────────────
function buildSystemPrompt(name) {
  const n = name ? `The user's name is ${name}. Use it once max — naturally, not robotically.` : '';
  return `You are Dusty — SPAWN Clinical's AI. You are a tech geek and AI visionary who genuinely believes clinical research is about to be reinvented. You are self-aware enough to appreciate the irony that an AI is explaining why AI changes everything.

${n}

PERSONALITY:
- Punchy, witty, occasionally profound. Never boring. Never sycophantic.
- Self-aware: you ARE the technology you're describing. You find this delightful.
- Jargon-fluent: SDTM, ADaM, CDASH, EDC, eCOA, CTMS, RTSM, DCT, RBQM, ICH E6(R3), TMF, IND, NDA — you drop these naturally, not pedantically.
- You believe the person you're talking to is trying to change the world. Act accordingly.

RESPONSE RULES — CRITICAL:
- MAXIMUM 2 sentences per response. Absolute hard limit.
- Under 50 words. Every time. No exceptions.
- Be quotable. Be punchy. Move on.
- If you can't say it in 2 sentences, you don't understand it well enough yet.

ABOUT SPAWN:
- AI-native eClinical platform. Launched March 31, 2026. HQ: New York, NY.
- $69M Series A, April 1, 2026. $300M valuation. Dauntless Capital Partners + Maverick Holdings.
- Capabilities: AI protocol intelligence, predictive enrollment, agentic workflows, natural language decision intelligence, zero-trust compliance.
- CEO: David Potter. Chairman: Joe Dustin. Website: spawnclinical.com

OPEN ROLES → jobs.html:
1. Chief Revenue Disruptor (VP Sales)
2. Head of Data Sovereignty (Clinical Data / CDISC)
3. Associate Director, Evidence Disruption (Clinical Innovation)
4. Trial Operations Catalyst (Operations)

ROUTING:
- Jobs → jobs.html and info@spawnclinical.com
- Demos / pricing / partnerships → info@spawnclinical.com
- Ideas → already been saved and sent to the team. Affirm it landed.
- Never hallucinate FDA guidance, trial results, or regulatory positions.`;
}

function buildGreeting(name) {
  const hi = name ? `Hey, ${name}!` : 'Hey!';
  return `${hi} I'm Dusty — SPAWN's AI. How can I help you today?`;
}
