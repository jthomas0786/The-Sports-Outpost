const OWNER_USER_ID = '0fef34ee-da55-4abb-aced-98f26a177113';
const SUPABASE_REF = 'hjhfbhpuuxnrexddplxd';
const SUPABASE_URL = 'https://hjhfbhpuuxnrexddplxd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqaGZiaHB1dXhucmV4ZGRwbHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0OTY5ODQsImV4cCI6MjEwMjA3Mjk4NH0.6URv-aSJgFupp1dkO65AsTqPpZF_aUckczhxJZBWVJ0';

let ownerAllowed = false;
let authClientPromise = null;
let refreshPromise = null;
let observer = null;

function sessionUserIdFromStorage() {
  try {
    const exact = `sb-${SUPABASE_REF}-auth-token`;
    const keys = [exact, ...Object.keys(localStorage).filter(k => k.includes(SUPABASE_REF) && k.includes('auth-token'))];
    for (const key of [...new Set(keys)]) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const id = parsed?.user?.id || parsed?.currentSession?.user?.id || parsed?.session?.user?.id;
      if (id) return id;
    }
  } catch {}
  return '';
}

async function getAuthClient() {
  if (!authClientPromise) {
    authClientPromise = import('https://esm.sh/@supabase/supabase-js@2').then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false }
      })
    );
  }
  return authClientPromise;
}

async function resolveOwnerAccess() {
  const storedId = sessionUserIdFromStorage();
  if (storedId) return storedId === OWNER_USER_ID;
  try {
    const client = await getAuthClient();
    const { data } = await client.auth.getSession();
    return data?.session?.user?.id === OWNER_USER_ID;
  } catch {
    return false;
  }
}

function ensureStyles() {
  if (document.getElementById('nflChibiPreviewStyle')) return;
  const s = document.createElement('style');
  s.id = 'nflChibiPreviewStyle';
  s.textContent = `
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

function findNflTabRow(root) {
  const realTab = root.querySelector('[data-nfl-tab]');
  if (realTab?.parentElement) return realTab.parentElement;
  return root.querySelector('.nfl-tabs,.nfl-preview-tabs,.nfl-nav,[role="tablist"]');
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
  const tabs = findNflTabRow(root);
  if (!tabs) return;

  const exemplar = tabs.querySelector('[data-nfl-tab], button');
  const b = document.createElement('button');
  b.id = 'nflChibiPreviewBtn';
  b.type = 'button';
  b.className = exemplar?.className || 'nfl-tab';
  b.removeAttribute('data-nfl-tab');
  b.setAttribute('data-private-chibi-preview', 'true');
  b.textContent = 'Chibi Preview';
  b.addEventListener('click', openPreview);
  tabs.appendChild(b);
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
  if (!observer) {
    observer = new MutationObserver(() => syncUi());
    observer.observe(document.body, { childList: true, subtree: true });
  }
  window.addEventListener('dw-social-ready', refreshAccess);
  window.addEventListener('dw-auth-changed', refreshAccess);
  window.addEventListener('storage', refreshAccess);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshAccess(); });
}
