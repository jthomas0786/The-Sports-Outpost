const OWNER_USERNAME = 'justcallme_jt';

let ownerAllowed = false;
let refreshPromise = null;
let observer = null;

function normalizeUsername(value) {
  return String(value || '').trim().replace(/^@/, '').toLowerCase();
}

async function resolveOwnerAccess() {
  const username = window.DW_getCurrentSocialUsername?.();
  return normalizeUsername(username) === OWNER_USERNAME;
}

function ensureStyles() {
  if (document.getElementById('nflChibiPreviewStyle')) return;
  const s = document.createElement('style');
  s.id = 'nflChibiPreviewStyle';
  s.textContent = `
    .nfl-chibi-preview-trigger{display:inline-flex;align-items:center;justify-content:center;width:auto!important;min-width:max-content;height:auto!important;min-height:34px;padding:8px 11px!important;border:1px solid var(--line,rgba(45,127,255,.26))!important;border-radius:9px!important;background:var(--panel,#081A40)!important;color:var(--white,#e2e8f0)!important;font:800 10px 'JetBrains Mono',monospace!important;letter-spacing:.04em;line-height:1!important;cursor:pointer;white-space:nowrap;opacity:1!important}
    .nfl-chibi-preview-trigger:hover{border-color:var(--accent,#2d7fff)!important;box-shadow:0 0 0 1px rgba(45,127,255,.18)}
    .nfl-chibi-private-backdrop{position:fixed;inset:0;z-index:100000;background:rgba(2,7,18,.86);backdrop-filter:blur(8px);display:flex;align-items:flex-start;justify-content:center;padding:72px 18px 30px;overflow:auto}
    .nfl-chibi-private{width:min(980px,100%);background:var(--night,#080C18);border:1px solid var(--line,rgba(45,127,255,.22));border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.55);padding:20px;position:relative}
    .nfl-chibi-private h2{font:800 24px 'Cabinet Grotesk',sans-serif;margin:4px 0 5px}
    .nfl-chibi-private .sub{color:var(--mute,#8b95a8);font-size:12px;margin-bottom:18px}
    .nfl-chibi-close{position:absolute;right:14px;top:14px;border:1px solid var(--line,rgba(45,127,255,.22));background:var(--panel,#081A40);color:var(--white,#e2e8f0);border-radius:9px;padding:7px 11px;cursor:pointer;font-weight:800}
    .chibi-admin-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}
    .chibi-admin-card{background:var(--panel,#081A40);border:1px solid var(--line,rgba(45,127,255,.22));border-radius:14px;padding:15px}
    .chibi-admin-k{font:700 9px 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--mute,#8b95a8)}
    .chibi-admin-v{font-weight:800;font-size:20px;margin-top:5px;text-transform:capitalize}
    .chibi-progress{height:7px;background:var(--night2,#0C1428);border-radius:99px;overflow:hidden;margin-top:10px}
    .chibi-progress i{display:block;height:100%;background:var(--accent,#2d7fff);width:0}
    .chibi-note{margin-top:16px;padding:14px;border:1px dashed var(--line,rgba(45,127,255,.22));border-radius:12px;color:var(--mute,#8b95a8);font-size:12px;line-height:1.55}
    .chibi-owner{color:var(--accent-bright,#6EDCFF);font:700 10px 'JetBrains Mono',monospace;letter-spacing:.08em}
  `;
  document.head.appendChild(s);
}

function findNflActionHost(root) {
  // Prefer the main NFL header so the private control stays visible on Props,
  // Slate, Live, Players, and Gamecast. Fall back to the Gamecast/legacy tab
  // strips for older shells.
  const headerActions = root.querySelector('.ms-head-actions');
  if (headerActions) return headerActions;
  const realTab = root.querySelector('[data-nfl-tab], .nxg-tab');
  if (realTab?.parentElement) return realTab.parentElement;
  return root.querySelector('.nxg-tabs,.nfl-tabs,.nfl-preview-tabs,.nfl-nav,[role="tablist"]');
}

function removePrivateUi() {
  document.getElementById('nflChibiPreviewBtn')?.remove();
  document.getElementById('nflChibiPreviewModal')?.remove();
}

function installButton(root) {
  if (!ownerAllowed) {
    removePrivateUi();
    return;
  }
  if (document.getElementById('nflChibiPreviewBtn')) return;
  const host = findNflActionHost(root);
  if (!host) return;

  const b = document.createElement('button');
  b.id = 'nflChibiPreviewBtn';
  b.type = 'button';
  b.className = 'nfl-chibi-preview-trigger';
  b.setAttribute('data-private-chibi-preview', 'true');
  b.textContent = 'Chibi Preview';
  b.addEventListener('click', openPreview);
  host.appendChild(b);
}

async function openPreview() {
  ownerAllowed = await resolveOwnerAccess();
  if (!ownerAllowed) {
    removePrivateUi();
    return;
  }

  ensureStyles();
  document.getElementById('nflChibiPreviewModal')?.remove();
  const backdrop = document.createElement('div');
  backdrop.id = 'nflChibiPreviewModal';
  backdrop.className = 'nfl-chibi-private-backdrop';
  backdrop.innerHTML = `
    <section class="nfl-chibi-private" role="dialog" aria-modal="true" aria-labelledby="nflChibiPreviewTitle">
      <button type="button" class="nfl-chibi-close" aria-label="Close Chibi Preview">Close</button>
      <div class="chibi-owner">PRIVATE · @justcallme_jt ONLY</div>
      <h2 id="nflChibiPreviewTitle">Chibi Preview</h2>
      <div class="sub">NFL Gamecast production asset QA</div>
      <div class="chibi-admin-grid">
        <div class="chibi-admin-card"><div class="chibi-admin-k">Current team</div><div class="chibi-admin-v" id="cpTeam">Dallas Cowboys</div></div>
        <div class="chibi-admin-card"><div class="chibi-admin-k">Current phase</div><div class="chibi-admin-v" id="cpPhase">Loading…</div></div>
        <div class="chibi-admin-card"><div class="chibi-admin-k">References locked</div><div class="chibi-admin-v" id="cpProgress">—</div><div class="chibi-progress"><i id="cpBar"></i></div></div>
      </div>
      <div class="chibi-note" id="cpNote">This private preview tracks the production library as it is built. Rendered base/action assets will be displayed here when those production phases begin.</div>
    </section>`;

  const close = () => backdrop.remove();
  backdrop.querySelector('.nfl-chibi-close')?.addEventListener('click', close);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', function escClose(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escClose); }
  });
  document.body.appendChild(backdrop);

  try {
    const p = await fetch(`sports/nfl/assets/chibis/project.json?ts=${Date.now()}`, { cache: 'no-store' }).then(r => r.json());
    const current = p.teams?.find(t => t.status !== 'complete') || p.teams?.find(t => t.abbr === 'DAL');
    if (current) {
      const a = Number(current.progress?.appearanceReferencesLocked || 0);
      const e = Number(current.progress?.appearanceReferencesExpected || 53);
      const teamName = current.name || current.team || (current.abbr === 'DAL' ? 'Dallas Cowboys' : current.abbr);
      document.getElementById('cpTeam').textContent = teamName || current.abbr || 'NFL';
      document.getElementById('cpPhase').textContent = String(current.currentPhase || current.phase || 'Production').replaceAll('-', ' ');
      document.getElementById('cpProgress').textContent = `${a} / ${e}`;
      document.getElementById('cpBar').style.width = `${e ? Math.min(100, a / e * 100) : 0}%`;
    }
  } catch {
    document.getElementById('cpPhase').textContent = 'Production status unavailable';
  }
}

function syncUi() {
  const root = document.getElementById('nflView');
  if (!root) return;
  ensureStyles();
  installButton(root);
}

async function refreshAccess() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    ownerAllowed = await resolveOwnerAccess();
    syncUi();
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

export function installNflChibiPreviewPrivateV901() {
  refreshAccess();
  let authRetries = 0;
  const authRetryTimer = setInterval(() => {
    if (ownerAllowed || ++authRetries >= 15) {
      clearInterval(authRetryTimer);
      return;
    }
    refreshAccess();
  }, 1000);
  if (!observer) {
    observer = new MutationObserver(() => syncUi());
    observer.observe(document.body, { childList: true, subtree: true });
  }
  window.addEventListener('dw-social-ready', refreshAccess);
  window.addEventListener('dw-auth-changed', refreshAccess);
  window.addEventListener('storage', refreshAccess);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshAccess(); });
}
