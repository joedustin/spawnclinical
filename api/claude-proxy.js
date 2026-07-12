// SPAWN Clinical — Anthropic Claude proxy (spawn generation)
// Ported from api/claude-proxy.php. The API key stays server-side only.
// Frontend (index.html callClaude) reads `.content[0].text` on success.
import { applyCors, readJson } from '../lib/http.js';

const MODEL          = 'claude-sonnet-4-6';
const MAX_TOKENS_CAP = 8192;

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: { message: 'Server missing ANTHROPIC_API_KEY' } });

  const body = readJson(req);
  const messages = Array.isArray(body.messages) ? body.messages : null;
  if (!messages) return res.status(400).json({ error: { message: 'messages[] is required' } });

  const payload = {
    model: MODEL,
    max_tokens: Math.min(parseInt(body.max_tokens, 10) || 4096, MAX_TOKENS_CAP),
    messages,
  };
  if (body.system) payload.system = body.system;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    return res.status(r.status).json(data); // pass Anthropic response through unchanged
  } catch (e) {
    return res.status(502).json({ error: { message: 'Upstream error: ' + e.message } });
  }
}
