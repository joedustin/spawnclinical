/**
 * SPAWN Clinical — Lead Capture Pop-up
 * Self-contained: injects its own HTML and CSS.
 * Triggers: scroll depth (40%) + exit intent (mouse leaves viewport top).
 * Shows once per browser session (sessionStorage gated).
 * Uses existing HubSpot portal/form IDs.
 */
(function () {
  'use strict';

  const PORTAL_ID = '45354923';
  const FORM_ID   = 'de612bd4-aa9d-4704-87ce-d21b284f4eb3';
  const SESSION_KEY = 'spawn_popup_v1';
  const SCROLL_THRESHOLD = 40; // percent

  // Don't show if already seen this session
  if (sessionStorage.getItem(SESSION_KEY)) return;

  // ── CSS ──────────────────────────────────────────────────────────────────────
  const css = `
#spawn-popup-overlay{
  position:fixed;inset:0;z-index:9000;
  background:rgba(5,5,14,0.82);backdrop-filter:blur(18px);
  display:flex;align-items:center;justify-content:center;padding:1.5rem;
  opacity:0;pointer-events:none;transition:opacity 0.4s ease;
}
#spawn-popup-overlay.show{opacity:1;pointer-events:all}
.spawn-popup-card{
  background:linear-gradient(135deg,rgba(124,58,237,0.1),rgba(6,182,212,0.06));
  border:1px solid rgba(124,58,237,0.35);border-radius:24px;
  padding:2.75rem 2.5rem;max-width:520px;width:100%;position:relative;
  transform:scale(0.92) translateY(24px);
  transition:transform 0.45s cubic-bezier(0.16,1,0.3,1);
}
#spawn-popup-overlay.show .spawn-popup-card{transform:scale(1) translateY(0)}
.spawn-popup-close{
  position:absolute;top:1.25rem;right:1.25rem;
  background:none;border:none;color:rgba(148,163,184,0.6);
  font-size:1.4rem;line-height:1;cursor:pointer;transition:color 0.2s;padding:0.25rem;
}
.spawn-popup-close:hover{color:#F1F5F9}
.spawn-popup-eyebrow{
  font-size:0.65rem;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;
  color:#22C55E;margin-bottom:0.75rem;
}
.spawn-popup-card h2{
  font-family:'Orbitron',monospace;font-weight:900;
  font-size:clamp(1.25rem,3vw,1.75rem);line-height:1.2;margin-bottom:0.9rem;
  background:linear-gradient(135deg,#fff 0%,#67E8F9 45%,#A78BFA 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.spawn-popup-card p{
  font-size:0.88rem;color:#94A3B8;line-height:1.75;margin-bottom:1.75rem;
}
.spawn-popup-card p strong{color:#F1F5F9}
.spawn-popup-form-wrap{width:100%}
/* Override HubSpot form inside popup to match site style */
.spawn-popup-form-wrap .hs-form fieldset{border:none;padding:0;margin:0;max-width:100% !important}
.spawn-popup-form-wrap .hs-form .form-columns-2{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem}
.spawn-popup-form-wrap .hs-form .form-columns-2 .hs-form-field,
.spawn-popup-form-wrap .hs-form .form-columns-1 .hs-form-field{width:100% !important;margin-bottom:1rem}
.spawn-popup-form-wrap .hs-form label:not(.hs-error-msg){
  display:block;font-size:0.72rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;
  color:#94A3B8;margin-bottom:0.4rem;font-family:'Inter',sans-serif;
}
.spawn-popup-form-wrap .hs-form input.hs-input,
.spawn-popup-form-wrap .hs-form select.hs-input{
  width:100% !important;background:rgba(255,255,255,0.04) !important;
  border:1px solid rgba(255,255,255,0.08) !important;border-radius:10px !important;
  padding:0.7rem 1rem !important;color:#F1F5F9 !important;
  font-size:0.88rem !important;font-family:'Inter',sans-serif !important;
  box-sizing:border-box !important;outline:none !important;
}
.spawn-popup-form-wrap .hs-form input.hs-input::placeholder{color:rgba(148,163,184,0.45) !important}
.spawn-popup-form-wrap .hs-form input.hs-input:focus{
  border-color:rgba(124,58,237,0.5) !important;
  box-shadow:0 0 0 3px rgba(124,58,237,0.1) !important;
}
.spawn-popup-form-wrap .hs-form .hs-button,
.spawn-popup-form-wrap .hs-form input[type="submit"]{
  width:100% !important;font-family:'Orbitron',monospace !important;font-weight:700 !important;
  font-size:0.82rem !important;letter-spacing:0.08em !important;text-transform:uppercase !important;
  padding:0.85rem 2rem !important;border-radius:999px !important;
  background:linear-gradient(135deg,#7C3AED,#06B6D4) !important;
  color:#fff !important;border:none !important;cursor:pointer !important;
  margin-top:0.5rem !important;transition:all 0.25s !important;display:block !important;
}
.spawn-popup-form-wrap .hs-form .hs-button:hover{
  transform:translateY(-2px) !important;
  box-shadow:0 8px 28px rgba(124,58,237,0.45) !important;opacity:1 !important;
}
.spawn-popup-form-wrap .hs-form .hs-error-msgs{list-style:none;margin:0.25rem 0 0;padding:0}
.spawn-popup-form-wrap .hs-form .hs-error-msg,
.spawn-popup-form-wrap .hs-form .hs-error-msgs label{
  color:#FCA5A5 !important;font-size:0.72rem !important;font-weight:400 !important;
  text-transform:none !important;letter-spacing:0 !important;
}
.spawn-popup-form-wrap .hs-form .submitted-message{
  text-align:center;padding:2rem;border-radius:14px;
  background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.2);
}
.spawn-popup-form-wrap .hs-form .submitted-message p{
  font-family:'Orbitron',monospace;font-weight:700;font-size:0.95rem;
  color:#22C55E;line-height:1.6;
}
.spawn-popup-form-wrap .hs-form .hs-richtext,
.spawn-popup-form-wrap .hs-form .legal-consent-container,
.spawn-popup-form-wrap .hs-form .hs-recaptcha{display:none !important}
@media(max-width:520px){
  .spawn-popup-card{padding:2rem 1.5rem}
  .spawn-popup-form-wrap .hs-form .form-columns-2{grid-template-columns:1fr}
}
`;

  // ── HTML ─────────────────────────────────────────────────────────────────────
  const html = `
<div id="spawn-popup-overlay">
  <div class="spawn-popup-card">
    <button class="spawn-popup-close" aria-label="Close">×</button>
    <div class="spawn-popup-eyebrow">Stay Ahead of the Curve</div>
    <h2>Join the Clinical AI Revolution</h2>
    <p>
      Get <strong>exclusive updates</strong> on SPAWN AI releases, eClinical intelligence breakthroughs,
      and regulatory tech innovations delivered before anyone else sees them.
      Zero fluff. Maximum signal.
    </p>
    <div class="spawn-popup-form-wrap">
      <div id="hs-popup-form"></div>
    </div>
  </div>
</div>
`;

  // ── INJECT ────────────────────────────────────────────────────────────────────
  function inject() {
    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper.firstElementChild);

    // Close handlers
    const overlay = document.getElementById('spawn-popup-overlay');
    const closeBtn = overlay.querySelector('.spawn-popup-close');
    closeBtn.addEventListener('click', hidePopup);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) hidePopup();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hidePopup();
    });
  }

  // ── SHOW / HIDE ───────────────────────────────────────────────────────────────
  let shown = false;

  function showPopup() {
    if (shown) return;
    shown = true;
    sessionStorage.setItem(SESSION_KEY, '1');

    const overlay = document.getElementById('spawn-popup-overlay');
    if (!overlay) return;
    overlay.classList.add('show');

    // Render HubSpot form inside popup
    loadHubSpotForm();
  }

  function hidePopup() {
    const overlay = document.getElementById('spawn-popup-overlay');
    if (overlay) overlay.classList.remove('show');
  }

  function loadHubSpotForm() {
    function createForm() {
      if (document.querySelector('#hs-popup-form iframe')) return; // already rendered
      if (window.hbspt) {
        window.hbspt.forms.create({
          region:   'na1',
          portalId: PORTAL_ID,
          formId:   FORM_ID,
          target:   '#hs-popup-form',
        });
      }
    }

    if (window.hbspt) {
      createForm();
    } else {
      // Dynamically load HubSpot script if not present
      if (!document.querySelector('script[src*="hsforms.net"]')) {
        const s = document.createElement('script');
        s.charset = 'utf-8';
        s.src = '//js.hsforms.net/forms/embed/v2.js';
        s.onload = createForm;
        document.head.appendChild(s);
      } else {
        // Script tag exists but not ready yet — poll
        const poll = setInterval(function () {
          if (window.hbspt) { clearInterval(poll); createForm(); }
        }, 150);
      }
    }
  }

  // ── TRIGGERS ──────────────────────────────────────────────────────────────────
  // Trigger 1: Scroll depth
  function onScroll() {
    const scrolled = window.scrollY;
    const total    = document.body.scrollHeight - window.innerHeight;
    if (total <= 0) return;
    const pct = (scrolled / total) * 100;
    if (pct >= SCROLL_THRESHOLD) {
      window.removeEventListener('scroll', onScroll);
      setTimeout(showPopup, 600); // brief delay feels less jarring
    }
  }

  // Trigger 2: Exit intent (mouse leaves toward top of viewport)
  let exitReady = false;
  setTimeout(function () { exitReady = true; }, 3000); // don't fire immediately on load

  function onMouseLeave(e) {
    if (!exitReady) return;
    if (e.clientY < 8) {
      document.removeEventListener('mouseleave', onMouseLeave);
      showPopup();
    }
  }

  // ── INIT ──────────────────────────────────────────────────────────────────────
  function init() {
    inject();
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
