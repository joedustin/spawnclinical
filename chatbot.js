/**
 * SPAWN Clinical — Dusty AI Chat Widget v2
 * Self-contained: injects CSS, HTML, and all logic.
 * Appears on: index, gallery, news, jobs pages.
 */
(function () {
  'use strict';

  const API       = 'api/chat-proxy.php';
  const TOKEN_KEY = 'dusty_token_v1';
  const NAME_KEY  = 'dusty_name_v1';

  // ── CSS ──────────────────────────────────────────────────────────────────────
  const css = `
/* ── DUSTY CHAT BUTTON ── */
#dusty-btn{
  position:fixed;bottom:1.75rem;right:1.75rem;z-index:8000;
  width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;
  background:linear-gradient(135deg,#22C55E,#06B6D4);
  display:flex;align-items:center;justify-content:center;
  font-size:1.45rem;transition:transform 0.25s,box-shadow 0.25s;
  animation:dusty-pulse 2.8s infinite;
}
#dusty-btn:hover{transform:scale(1.1);box-shadow:0 0 28px rgba(34,197,94,0.55)}
#dusty-btn.open{animation:none;box-shadow:0 0 24px rgba(34,197,94,0.4)}
@keyframes dusty-pulse{
  0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.45)}
  50%{box-shadow:0 0 0 10px rgba(34,197,94,0)}
}
#dusty-badge{
  position:absolute;top:-3px;right:-3px;width:16px;height:16px;
  background:#ef4444;border-radius:50%;border:2px solid #05050E;display:none;
}
#dusty-badge.show{display:block}

/* ── CHAT PANEL ── */
#dusty-panel{
  position:fixed;bottom:5.5rem;right:1.75rem;z-index:8000;
  width:360px;max-height:560px;
  background:#0D0D1F;border:1px solid rgba(124,58,237,0.35);
  border-radius:20px;display:flex;flex-direction:column;
  box-shadow:0 24px 64px rgba(0,0,0,0.55),0 0 0 1px rgba(34,197,94,0.08);
  transform:scale(0.9) translateY(20px);transform-origin:bottom right;
  opacity:0;pointer-events:none;
  transition:opacity 0.3s,transform 0.35s cubic-bezier(0.16,1,0.3,1);
  overflow:hidden;
}
#dusty-panel.open{opacity:1;pointer-events:all;transform:scale(1) translateY(0)}

/* ── PANEL HEADER ── */
.dusty-header{
  display:flex;align-items:center;gap:0.65rem;
  padding:1rem 1.25rem;border-bottom:1px solid rgba(255,255,255,0.06);
  background:linear-gradient(135deg,rgba(124,58,237,0.12),rgba(6,182,212,0.07));
  flex-shrink:0;
}
.dusty-avatar{
  width:36px;height:36px;border-radius:50%;flex-shrink:0;
  background:linear-gradient(135deg,#22C55E,#06B6D4);
  display:flex;align-items:center;justify-content:center;font-size:1rem;
}
.dusty-header-info{flex:1;min-width:0}
.dusty-header-name{
  font-family:'Orbitron',monospace;font-weight:700;font-size:0.8rem;
  color:#F1F5F9;letter-spacing:0.04em;
}
.dusty-header-status{font-size:0.68rem;color:#22C55E;margin-top:1px}
.dusty-header-close{
  background:none;border:none;color:rgba(148,163,184,0.55);
  font-size:1.2rem;cursor:pointer;line-height:1;padding:0.2rem;
  transition:color 0.2s;flex-shrink:0;
}
.dusty-header-close:hover{color:#F1F5F9}

/* ── PRE-CHAT GATE ── */
.dusty-gate{
  padding:1.5rem 1.25rem;display:flex;flex-direction:column;gap:0.9rem;
  overflow-y:auto;flex:1;
}
.dusty-gate-intro{font-size:0.83rem;color:#94A3B8;line-height:1.7}
.dusty-gate-intro strong{color:#F1F5F9}
.dusty-field label{
  display:block;font-size:0.68rem;font-weight:600;letter-spacing:0.1em;
  text-transform:uppercase;color:#94A3B8;margin-bottom:0.35rem;
  font-family:'Inter',sans-serif;
}
.dusty-field input{
  width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
  border-radius:10px;padding:0.65rem 0.9rem;color:#F1F5F9;
  font-size:0.87rem;font-family:'Inter',sans-serif;
  box-sizing:border-box;outline:none;transition:border-color 0.2s;
}
.dusty-field input::placeholder{color:rgba(148,163,184,0.4)}
.dusty-field input:focus{border-color:rgba(34,197,94,0.5);box-shadow:0 0 0 3px rgba(34,197,94,0.08)}
.dusty-gate-error{font-size:0.75rem;color:#FCA5A5;margin-top:-0.4rem;display:none}
.dusty-gate-error.show{display:block}
.dusty-start-btn{
  font-family:'Orbitron',monospace;font-weight:700;font-size:0.76rem;
  letter-spacing:0.08em;text-transform:uppercase;
  padding:0.75rem 1.5rem;border-radius:999px;border:none;cursor:pointer;
  background:linear-gradient(135deg,#22C55E,#16A34A);
  color:#fff;box-shadow:0 0 16px rgba(34,197,94,0.35);transition:all 0.25s;
}
.dusty-start-btn:hover{transform:scale(1.03);box-shadow:0 0 28px rgba(34,197,94,0.5)}
.dusty-start-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}

/* ── CHAT MESSAGES ── */
.dusty-messages{
  flex:1;overflow-y:auto;padding:1rem 1.1rem;
  display:flex;flex-direction:column;gap:0.75rem;
  scrollbar-width:thin;scrollbar-color:rgba(124,58,237,0.3) transparent;
}
.dusty-messages::-webkit-scrollbar{width:4px}
.dusty-messages::-webkit-scrollbar-thumb{background:rgba(124,58,237,0.3);border-radius:2px}
.dusty-msg{display:flex;flex-direction:column;gap:0.2rem;max-width:88%}
.dusty-msg.user{align-self:flex-end;align-items:flex-end}
.dusty-msg.assistant{align-self:flex-start;align-items:flex-start}
.dusty-msg-bubble{
  padding:0.65rem 0.9rem;border-radius:14px;font-size:0.84rem;
  line-height:1.6;color:#F1F5F9;word-break:break-word;
}
.dusty-msg.user .dusty-msg-bubble{
  background:linear-gradient(135deg,rgba(124,58,237,0.55),rgba(6,182,212,0.4));
  border:1px solid rgba(124,58,237,0.3);border-bottom-right-radius:4px;
}
.dusty-msg.assistant .dusty-msg-bubble{
  background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);
  border-bottom-left-radius:4px;color:#E2E8F0;
}
.dusty-msg-time{font-size:0.62rem;color:rgba(148,163,184,0.45);padding:0 0.25rem}

/* ── QUICK-OPTION BUTTONS (main menu) ── */
.dusty-options{
  display:flex;flex-direction:column;gap:0.45rem;
  padding:0.2rem 0;align-self:flex-start;
  width:calc(100% - 0.25rem);
}
.dusty-option-btn{
  background:rgba(34,197,94,0.07);
  border:1px solid rgba(34,197,94,0.22);
  border-radius:999px;color:#4ADE80;
  font-size:0.8rem;padding:0.55rem 1rem;
  cursor:pointer;text-align:left;
  font-family:'Inter',sans-serif;
  transition:all 0.2s;line-height:1.3;
}
.dusty-option-btn:hover{
  background:rgba(34,197,94,0.16);
  border-color:rgba(34,197,94,0.45);
  transform:translateX(3px);
}

/* ── ACTION BUTTONS (CTAs within chat) ── */
.dusty-action-btns{
  display:flex;flex-wrap:wrap;gap:0.45rem;
  margin-top:0.15rem;align-self:flex-start;
}
.dusty-action-btn{
  background:linear-gradient(135deg,rgba(124,58,237,0.2),rgba(6,182,212,0.12));
  border:1px solid rgba(124,58,237,0.35);
  border-radius:999px;color:#A78BFA;
  font-size:0.77rem;padding:0.42rem 0.85rem;
  cursor:pointer;font-family:'Inter',sans-serif;
  transition:all 0.2s;white-space:nowrap;
}
.dusty-action-btn:hover{
  background:linear-gradient(135deg,rgba(124,58,237,0.35),rgba(6,182,212,0.22));
  border-color:rgba(124,58,237,0.55);color:#C4B5FD;transform:scale(1.04);
}

/* ── TYPING INDICATOR ── */
.dusty-typing{
  display:none;align-items:center;gap:0.4rem;
  padding:0.65rem 0.9rem;
  background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);
  border-radius:14px;border-bottom-left-radius:4px;
  margin:0 1.1rem 0.4rem;align-self:flex-start;width:fit-content;
}
.dusty-typing.show{display:flex}
.dusty-dot{
  width:6px;height:6px;background:#22C55E;border-radius:50%;
  animation:dusty-bounce 1.2s infinite;
}
.dusty-dot:nth-child(2){animation-delay:0.18s}
.dusty-dot:nth-child(3){animation-delay:0.36s}
@keyframes dusty-bounce{
  0%,80%,100%{transform:translateY(0);opacity:0.5}
  40%{transform:translateY(-5px);opacity:1}
}

/* ── INPUT ROW ── */
.dusty-input-row{
  display:flex;gap:0.5rem;padding:0.85rem 1.1rem;
  border-top:1px solid rgba(255,255,255,0.06);flex-shrink:0;
  background:rgba(5,5,14,0.4);
}
.dusty-input{
  flex:1;background:rgba(255,255,255,0.05);
  border:1px solid rgba(255,255,255,0.08);border-radius:999px;
  padding:0.6rem 1rem;color:#F1F5F9;font-size:0.84rem;
  font-family:'Inter',sans-serif;outline:none;transition:border-color 0.2s;
}
.dusty-input:focus{border-color:rgba(34,197,94,0.4)}
.dusty-input::placeholder{color:rgba(148,163,184,0.35)}
.dusty-send-btn{
  width:38px;height:38px;border-radius:50%;border:none;cursor:pointer;
  background:linear-gradient(135deg,#22C55E,#16A34A);
  color:#fff;font-size:0.9rem;display:flex;align-items:center;
  justify-content:center;flex-shrink:0;align-self:flex-end;transition:all 0.2s;
}
.dusty-send-btn:hover{transform:scale(1.1);box-shadow:0 0 16px rgba(34,197,94,0.4)}
.dusty-send-btn:disabled{opacity:0.45;cursor:not-allowed;transform:none;box-shadow:none}

@media(max-width:400px){
  #dusty-panel{width:calc(100vw - 2rem);right:1rem}
  #dusty-btn{right:1rem;bottom:1rem}
}
`;

  // ── HTML ─────────────────────────────────────────────────────────────────────
  const html = `
<button id="dusty-btn" aria-label="Chat with Dusty">🧬<span id="dusty-badge"></span></button>
<div id="dusty-panel" role="dialog" aria-label="Dusty AI Chat">
  <div class="dusty-header">
    <div class="dusty-avatar">🧬</div>
    <div class="dusty-header-info">
      <div class="dusty-header-name">Dusty</div>
      <div class="dusty-header-status">● Online — SPAWN AI</div>
    </div>
    <button class="dusty-header-close" aria-label="Close chat">×</button>
  </div>

  <!-- Pre-chat gate -->
  <div class="dusty-gate" id="dusty-gate">
    <p class="dusty-gate-intro">
      Hey! I'm <strong>Dusty</strong> — SPAWN's AI.<br>
      Quick intro before we change the world together.
    </p>
    <div class="dusty-field">
      <label for="dusty-name-input">Your Name</label>
      <input type="text" id="dusty-name-input" placeholder="Dr. Jane Smith" autocomplete="name">
    </div>
    <div class="dusty-field">
      <label for="dusty-email-input">Your Email</label>
      <input type="email" id="dusty-email-input" placeholder="you@organization.com" autocomplete="email">
    </div>
    <div class="dusty-gate-error" id="dusty-gate-error"></div>
    <button class="dusty-start-btn" id="dusty-start-btn">Let's Talk →</button>
  </div>

  <!-- Chat area -->
  <div class="dusty-messages" id="dusty-messages" style="display:none"></div>
  <div class="dusty-typing" id="dusty-typing">
    <div class="dusty-dot"></div>
    <div class="dusty-dot"></div>
    <div class="dusty-dot"></div>
  </div>
  <div class="dusty-input-row" id="dusty-input-row" style="display:none">
    <input class="dusty-input" id="dusty-input" type="text"
      placeholder="Ask me anything…" autocomplete="off" maxlength="1000">
    <button class="dusty-send-btn" id="dusty-send-btn" aria-label="Send">➤</button>
  </div>
</div>
`;

  // ── STATE ─────────────────────────────────────────────────────────────────────
  let sessionToken = sessionStorage.getItem(TOKEN_KEY) || null;
  let userName     = sessionStorage.getItem(NAME_KEY)  || '';
  let panelOpen    = false;
  let busy         = false;
  let currentMode  = null; // 'idea' | 'question' | 'job' | 'spawn'
  let ideaSaved    = false;

  // ── DOM REFS ──────────────────────────────────────────────────────────────────
  let btn, panel, gate, gateErr, nameInput, emailInput, startBtn;
  let messagesEl, typingEl, inputRow, inputEl, sendBtn;

  // ── INJECT ────────────────────────────────────────────────────────────────────
  function inject() {
    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    while (wrapper.firstChild) document.body.appendChild(wrapper.firstChild);

    btn        = document.getElementById('dusty-btn');
    panel      = document.getElementById('dusty-panel');
    gate       = document.getElementById('dusty-gate');
    gateErr    = document.getElementById('dusty-gate-error');
    nameInput  = document.getElementById('dusty-name-input');
    emailInput = document.getElementById('dusty-email-input');
    startBtn   = document.getElementById('dusty-start-btn');
    messagesEl = document.getElementById('dusty-messages');
    typingEl   = document.getElementById('dusty-typing');
    inputRow   = document.getElementById('dusty-input-row');
    inputEl    = document.getElementById('dusty-input');
    sendBtn    = document.getElementById('dusty-send-btn');

    btn.addEventListener('click', togglePanel);
    panel.querySelector('.dusty-header-close').addEventListener('click', closePanel);
    startBtn.addEventListener('click', startSession);
    sendBtn.addEventListener('click', sendMessage);
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    nameInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') emailInput.focus();
    });
    emailInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') startSession();
    });

    // Restore existing session
    if (sessionToken) {
      showChatUI();
      showInputRow();
      currentMode = 'question';
      addMessage('assistant', "Welcome back! What are we disrupting today? 🧬");
    }
  }

  // ── PANEL CONTROLS ────────────────────────────────────────────────────────────
  function togglePanel() { panelOpen ? closePanel() : openPanel(); }

  function openPanel() {
    panelOpen = true;
    panel.classList.add('open');
    btn.classList.add('open');
    document.getElementById('dusty-badge').classList.remove('show');
    if (!sessionToken) nameInput.focus();
    else if (inputRow.style.display !== 'none') setTimeout(function() { inputEl.focus(); }, 100);
  }

  function closePanel() {
    panelOpen = false;
    panel.classList.remove('open');
    btn.classList.remove('open');
  }

  // ── START SESSION ─────────────────────────────────────────────────────────────
  async function startSession() {
    const name  = nameInput.value.trim();
    const email = emailInput.value.trim();

    gateErr.classList.remove('show');
    if (!name)  { showGateError('Please enter your name.'); nameInput.focus(); return; }
    if (!email) { showGateError('Please enter your email.'); emailInput.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showGateError('Please enter a valid email address.'); emailInput.focus(); return;
    }

    startBtn.disabled = true;
    startBtn.textContent = 'Starting…';

    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:      'start',
          name,
          email,
          page_origin: window.location.pathname,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to start session');

      sessionToken = data.session_token;
      userName     = data.name;
      sessionStorage.setItem(TOKEN_KEY, sessionToken);
      sessionStorage.setItem(NAME_KEY,  userName);

      showChatUI();
      addMessage('assistant', data.greeting);
      setTimeout(showOptions, 350);

    } catch (err) {
      showGateError(err.message || 'Something went wrong. Try again.');
      startBtn.disabled = false;
      startBtn.textContent = "Let's Talk →";
    }
  }

  function showGateError(msg) {
    gateErr.textContent = msg;
    gateErr.classList.add('show');
  }

  // ── SHOW CHAT UI ──────────────────────────────────────────────────────────────
  function showChatUI() {
    gate.style.display       = 'none';
    messagesEl.style.display = 'flex';
    inputRow.style.display   = 'none'; // hidden until mode selected
  }

  function showInputRow() {
    inputRow.style.display = 'flex';
    setTimeout(function() { inputEl.focus(); }, 100);
  }

  // ── MAIN MENU ─────────────────────────────────────────────────────────────────
  function showOptions() {
    var existing = document.getElementById('dusty-options');
    if (existing) existing.remove();

    var wrap = document.createElement('div');
    wrap.className = 'dusty-options';
    wrap.id = 'dusty-options';

    var options = [
      { emoji: '💡', label: 'Share an Idea',   fn: handleIdeaMode    },
      { emoji: '❓', label: 'Ask a Question',  fn: handleQuestionMode },
      { emoji: '💼', label: 'Find a Job',      fn: handleJobMode      },
      { emoji: '⚡', label: 'Spawn a Solution', fn: handleSpawnMode   },
    ];

    options.forEach(function(opt) {
      var b = document.createElement('button');
      b.className = 'dusty-option-btn';
      b.innerHTML = '<span style="margin-right:0.45rem">' + opt.emoji + '</span>' + opt.label;
      b.addEventListener('click', function() {
        wrap.remove();
        addMessage('user', opt.emoji + ' ' + opt.label);
        opt.fn();
      });
      wrap.appendChild(b);
    });

    messagesEl.appendChild(wrap);
    scrollMessages();
  }

  function resetToOptions() {
    currentMode = null;
    ideaSaved   = false;
    inputRow.style.display = 'none';
    addMessage('assistant', "What else can I do for you?");
    setTimeout(showOptions, 250);
  }

  // ── MODE HANDLERS ─────────────────────────────────────────────────────────────
  function handleIdeaMode() {
    currentMode = 'idea';
    ideaSaved   = false;
    inputEl.placeholder = "What's the idea? Be bold — the wilder, the better…";
    showInputRow();
    addMessage('assistant', "I'm all ears. 🧠 What idea has been rattling around in your head?");
  }

  function handleQuestionMode() {
    currentMode = 'question';
    inputEl.placeholder = 'Ask me anything — no acronym too arcane…';
    showInputRow();
    addMessage('assistant', "Go ahead. I speak fluent CDISC, sarcasm, and existential dread about clinical timelines. 🎯");
  }

  function handleJobMode() {
    currentMode = 'job';
    addMessage('assistant', "Oh, you want in on the revolution. Smart move. 🚀 Four roles. Life-changing career trajectory. Clinical research, transformed.");
    setTimeout(function() {
      addActionButtons([
        { label: '💼 View Open Roles →', fn: function() { window.location.href = 'jobs.html'; } },
        { label: '↩ Show Menu',          fn: resetToOptions },
      ]);
      setTimeout(showOptions, 1200);
    }, 200);
  }

  function handleSpawnMode() {
    currentMode = 'spawn';
    addMessage('assistant', "Now we're talking. Describe what you need — the AI builds your eClinical strategy in seconds. ⚡ Go ahead, imagine something that shouldn't be possible.");
    setTimeout(function() {
      addActionButtons([
        { label: '⚡ Open the Generator →', fn: function() { openSpawnGenerator(null); } },
        { label: '↩ Show Menu',             fn: resetToOptions },
      ]);
      setTimeout(showOptions, 1200);
    }, 200);
  }

  function openSpawnGenerator(prefill) {
    var modal = document.getElementById('spawn-modal');
    if (modal) {
      // On index.html — open the modal
      modal.classList.add('open');
      if (prefill) {
        var ta = document.getElementById('spawn-prompt');
        if (ta) ta.value = prefill;
      }
      closePanel();
    } else {
      // Navigate to index.html
      var url = prefill
        ? 'index.html?idea=' + encodeURIComponent(prefill)
        : 'index.html';
      window.location.href = url;
    }
  }

  // ── SEND MESSAGE ──────────────────────────────────────────────────────────────
  async function sendMessage() {
    if (busy || !sessionToken) return;
    var text = inputEl.value.trim();
    if (!text) return;

    // "menu" keyword — show options without hitting the API
    if (text.toLowerCase() === 'menu') {
      inputEl.value = '';
      addMessage('user', 'menu');
      resetToOptions();
      return;
    }

    var capturedText = text;
    var wasIdeaMode  = (currentMode === 'idea' && !ideaSaved);

    inputEl.value = '';
    addMessage('user', text);
    setTyping(true);
    busy = true;
    sendBtn.disabled = true;

    try {
      var res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:        'message',
          session_token: sessionToken,
          message:       text,
        }),
      });
      var data = await res.json();
      setTyping(false);

      if (data.error === 'max_reached') {
        addMessage('assistant', data.message);
      } else if (!data.success) {
        addMessage('assistant', 'Hit a snag — try again in a moment.');
      } else {
        addMessage('assistant', data.reply);
        if (wasIdeaMode) {
          ideaSaved = true;
          saveIdea(capturedText); // fire and forget
          setTimeout(function() {
            addActionButtons([
              { label: '⚡ Turn This Into a SPAWN →', fn: function() { openSpawnGenerator(capturedText); } },
              { label: '↩ Show Menu',                 fn: resetToOptions },
            ]);
            setTimeout(showOptions, 1200);
          }, 400);
        }
      }
    } catch (err) {
      setTyping(false);
      addMessage('assistant', 'Connection issue — check your internet and try again.');
    }

    busy = false;
    sendBtn.disabled = false;
    if (inputRow.style.display !== 'none') setTimeout(function() { inputEl.focus(); }, 50);
  }

  // ── SAVE IDEA (fire & forget) ─────────────────────────────────────────────────
  async function saveIdea(text) {
    try {
      await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:        'save_idea',
          session_token: sessionToken,
          idea:          text,
        }),
      });
    } catch (e) { /* silent fail */ }
  }

  // ── ADD ACTION BUTTONS ────────────────────────────────────────────────────────
  function addActionButtons(buttonsConfig) {
    var wrap = document.createElement('div');
    wrap.className = 'dusty-action-btns';
    buttonsConfig.forEach(function(cfg) {
      var b = document.createElement('button');
      b.className = 'dusty-action-btn';
      b.textContent = cfg.label;
      b.addEventListener('click', function() {
        wrap.remove();
        cfg.fn();
      });
      wrap.appendChild(b);
    });
    messagesEl.appendChild(wrap);
    scrollMessages();
  }

  // ── ADD MESSAGE ───────────────────────────────────────────────────────────────
  function addMessage(role, text) {
    var msgEl = document.createElement('div');
    msgEl.className = 'dusty-msg ' + role;

    var now  = new Date();
    var time = now.getHours().toString().padStart(2, '0') + ':' +
               now.getMinutes().toString().padStart(2, '0');

    var bubble = document.createElement('div');
    bubble.className = 'dusty-msg-bubble';
    bubble.innerHTML = escapeHtml(text);

    var timestamp = document.createElement('div');
    timestamp.className = 'dusty-msg-time';
    timestamp.textContent = time;

    msgEl.appendChild(bubble);
    msgEl.appendChild(timestamp);
    messagesEl.appendChild(msgEl);
    scrollMessages();

    if (!panelOpen && role === 'assistant') {
      document.getElementById('dusty-badge').classList.add('show');
    }
  }

  function setTyping(on) {
    typingEl.classList.toggle('show', on);
    if (on) scrollMessages();
  }

  function scrollMessages() {
    requestAnimationFrame(function () {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');
  }

  // ── BOOT ─────────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

})();
