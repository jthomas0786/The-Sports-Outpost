const INFO_BUTTON_ID = 'infoBtnTb';
const INFO_MODAL_ID = 'sportsOutpostInfoModal';
const INFO_STYLE_ID = 'sportsOutpostInfoStylesV957';
const INFO_BUTTON_CLASS = 'dw-info-btn-v957';

let lastFocused = null;
let observer = null;

function installStyles() {
  if (document.getElementById(INFO_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = INFO_STYLE_ID;
  style.textContent = `
    #${INFO_BUTTON_ID}.${INFO_BUTTON_CLASS} {
      appearance: none;
      width: 38px;
      height: 38px;
      min-width: 38px;
      display: inline-grid !important;
      place-items: center;
      flex: 0 0 38px;
      padding: 0;
      margin: 0 0 0 8px;
      border-radius: 999px;
      border: 1px solid rgba(45,127,255,.55);
      background: rgba(8,20,40,.84);
      color: #dcecff;
      font: 800 19px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.025), 0 0 18px rgba(45,127,255,.12);
      cursor: pointer;
      vertical-align: middle;
      -webkit-tap-highlight-color: transparent;
      transition: transform .14s ease, border-color .14s ease, background .14s ease, box-shadow .14s ease;
      z-index: 3;
    }
    #${INFO_BUTTON_ID}.${INFO_BUTTON_CLASS}:hover,
    #${INFO_BUTTON_ID}.${INFO_BUTTON_CLASS}:focus-visible {
      transform: translateY(-1px);
      border-color: rgb(45,127,255);
      background: rgba(45,127,255,.18);
      box-shadow: 0 0 0 3px rgba(45,127,255,.15), 0 0 22px rgba(45,127,255,.22);
      outline: none;
    }
    #${INFO_BUTTON_ID} .dw-info-glyph-v956 {
      display: block;
      transform: translateY(-.5px);
      font-family: Georgia,"Times New Roman",serif;
      font-style: italic;
      font-weight: 700;
    }
    #${INFO_MODAL_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483000;
      display: grid;
      place-items: center;
      padding: 18px;
      background: rgba(2,7,15,.74);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    #${INFO_MODAL_ID}[hidden] { display: none !important; }
    #${INFO_MODAL_ID} .dw-info-dialog-v956 {
      position: relative;
      width: min(560px, 100%);
      max-height: min(78vh, 720px);
      overflow: auto;
      border: 1px solid rgba(45,127,255,.42);
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(12,26,49,.99), rgba(5,14,29,.99));
      color: #eaf3ff;
      box-shadow: 0 24px 80px rgba(0,0,0,.58), 0 0 34px rgba(45,127,255,.13);
      padding: 24px 24px 22px;
    }
    #${INFO_MODAL_ID} .dw-info-kicker-v956 {
      margin: 0 42px 7px 0;
      color: rgb(106,167,255);
      font: 800 11px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      letter-spacing: .15em;
      text-transform: uppercase;
    }
    #${INFO_MODAL_ID} h2 {
      margin: 0 42px 12px 0;
      font: 800 clamp(22px,5vw,30px)/1.15 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      letter-spacing: -.02em;
    }
    #${INFO_MODAL_ID} p {
      margin: 0 0 14px;
      color: #bcd0e8;
      font: 500 14px/1.55 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    }
    #${INFO_MODAL_ID} .dw-info-grid-v956 {
      display: grid;
      grid-template-columns: repeat(2,minmax(0,1fr));
      gap: 10px;
      margin-top: 18px;
    }
    #${INFO_MODAL_ID} .dw-info-card-v956 {
      padding: 12px 13px;
      border-radius: 12px;
      border: 1px solid rgba(113,154,205,.18);
      background: rgba(255,255,255,.035);
    }
    #${INFO_MODAL_ID} .dw-info-card-v956 strong {
      display: block;
      margin-bottom: 4px;
      color: #f4f8ff;
      font: 750 13px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    }
    #${INFO_MODAL_ID} .dw-info-card-v956 span {
      color: #9fb6d2;
      font: 500 12px/1.42 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    }
    #${INFO_MODAL_ID} .dw-info-close-v956 {
      position: absolute;
      top: 14px;
      right: 14px;
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      padding: 0;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 999px;
      background: rgba(255,255,255,.04);
      color: #dcecff;
      font: 600 22px/1 system-ui,sans-serif;
      cursor: pointer;
    }
    #${INFO_MODAL_ID} .dw-info-close-v956:hover,
    #${INFO_MODAL_ID} .dw-info-close-v956:focus-visible {
      border-color: rgba(45,127,255,.7);
      background: rgba(45,127,255,.14);
      outline: none;
    }
    @media (max-width: 760px) {
      #${INFO_BUTTON_ID}.${INFO_BUTTON_CLASS} {
        width: 30px !important;
        height: 30px !important;
        min-width: 30px !important;
        flex: 0 0 30px !important;
        margin-left: 0 !important;
      }
    }
    @media (max-width: 620px) {
      #${INFO_MODAL_ID} { padding: 12px; }
      #${INFO_MODAL_ID} .dw-info-dialog-v956 { padding: 21px 18px 19px; border-radius: 16px; }
      #${INFO_MODAL_ID} .dw-info-grid-v956 { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(style);
}

function buildModal() {
  let modal = document.getElementById(INFO_MODAL_ID);
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = INFO_MODAL_ID;
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'sportsOutpostInfoTitle');
  modal.innerHTML = `
    <div class="dw-info-dialog-v956" role="document">
      <button type="button" class="dw-info-close-v956" aria-label="Close information">×</button>
      <div class="dw-info-kicker-v956">The Sports Outpost</div>
      <h2 id="sportsOutpostInfoTitle">About The Sports Outpost</h2>
      <p>Your live sports command center for game tracking, player props, matchup research, watchlists and sport-specific tools.</p>
      <p>Use the sport navigation to move between available leagues. Live data and grades update from the data sources shown inside each tool; simulation-based fields are labeled separately where they are used.</p>
      <div class="dw-info-grid-v956">
        <div class="dw-info-card-v956"><strong>Live</strong><span>Game state, scoring and in-game player tracking.</span></div>
        <div class="dw-info-card-v956"><strong>Props</strong><span>Player markets, matchup context and research views.</span></div>
        <div class="dw-info-card-v956"><strong>Watchlists</strong><span>Keep the players and movement you care about close.</span></div>
        <div class="dw-info-card-v956"><strong>Research</strong><span>Historical and defensive context to support your own decisions.</span></div>
      </div>
    </div>`;

  modal.querySelector('.dw-info-close-v956')?.addEventListener('click', closeInfoModal);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeInfoModal();
  });
  document.body.appendChild(modal);
  return modal;
}

function openInfoModal() {
  installStyles();
  const modal = buildModal();
  lastFocused = document.activeElement;
  modal.hidden = false;
  document.documentElement.style.overflow = 'hidden';
  modal.querySelector('.dw-info-close-v956')?.focus();
}

function closeInfoModal() {
  const modal = document.getElementById(INFO_MODAL_ID);
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.documentElement.style.removeProperty('overflow');
  if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  lastFocused = null;
}

function findActionHost(switcher) {
  const selector = '.topbar .topbar-right, header .topbar-right, .header-actions, .topbar-actions, .toolbar-actions, .actions';
  const direct = document.querySelector(selector);
  if (direct) return { host: direct, mode: 'append' };

  const header = switcher?.closest('header, .topbar, .header, [role="banner"]')
    || document.querySelector('header, .topbar, .header, [role="banner"]');
  const headerActions = header?.querySelector('.topbar-right, .header-actions, .topbar-actions, .toolbar-actions, .actions');
  if (headerActions) return { host: headerActions, mode: 'append' };

  if (switcher?.parentElement) return { host: switcher.parentElement, mode: 'after-switcher' };
  return { host: header || document.body, mode: 'append' };
}

function normalizeButton(button) {
  button.type = 'button';
  button.classList.add('dw-info-btn-v956', INFO_BUTTON_CLASS);
  button.setAttribute('aria-label', 'About The Sports Outpost');
  button.setAttribute('title', 'Info');
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-controls', INFO_MODAL_ID);

  // v56 intentionally hid the old Info action on <=760px. Force only this
  // control back on; the separate Refresh control remains hidden on mobile.
  button.style.setProperty('display', 'inline-grid', 'important');

  if (button.dataset.dwInfoBoundV957 !== '1') {
    button.removeAttribute('onclick');
    button.addEventListener('click', openInfoModal);
    button.dataset.dwInfoBoundV957 = '1';
  }
}

function mountButton() {
  if (!document.body) return;
  installStyles();
  buildModal();

  const switcher = document.getElementById('sportSwitch');
  let button = document.getElementById(INFO_BUTTON_ID);

  if (!button) {
    button = document.createElement('button');
    button.id = INFO_BUTTON_ID;
    button.innerHTML = '<span class="dw-info-glyph-v956" aria-hidden="true">i</span>';

    const { host, mode } = findActionHost(switcher);
    if (mode === 'after-switcher' && switcher?.parentElement === host) {
      switcher.insertAdjacentElement('afterend', button);
    } else {
      host.appendChild(button);
    }
  }

  normalizeButton(button);
}

function observeShell() {
  if (observer || !document.body) return;
  observer = new MutationObserver(() => {
    const button = document.getElementById(INFO_BUTTON_ID);
    if (!button || !button.classList.contains(INFO_BUTTON_CLASS) || button.dataset.dwInfoBoundV957 !== '1') {
      mountButton();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

export function installGlobalInfoButtonV956() {
  window.openInfoModal = openInfoModal;
  window.closeInfoModal = closeInfoModal;

  const start = () => {
    mountButton();
    observeShell();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeInfoModal();
  });
}
