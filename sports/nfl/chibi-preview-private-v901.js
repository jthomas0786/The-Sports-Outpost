const OWNER_USERNAME = 'justcallme_jt';

let ownerAllowed = false;
let refreshPromise = null;
let observer = null;
let slateCache = null;
let slateCacheAt = 0;
let modalRefreshTimer = null;

function normalizeUsername(value) {
  return String(value || '').trim().replace(/^@/, '').toLowerCase();
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/['’]/g, '')
    .replace(/\s+(jr|sr|ii|iii|iv|v)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slugName(value) {
  return normalizeName(value).replace(/\s+/g, '-');
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
    #sbSportAccordion .nfl-chibi-preview-trigger{color:#fbbf24!important}
    #sbSportAccordion .nfl-chibi-preview-trigger::after{content:'PRIVATE';margin-left:auto;font:800 7px 'JetBrains Mono',monospace;letter-spacing:.08em;color:#6edcff;border:1px solid rgba(110,220,255,.28);border-radius:999px;padding:2px 5px}
    .nfl-chibi-private-backdrop{position:fixed;inset:0;z-index:100000;background:rgba(2,7,18,.88);backdrop-filter:blur(8px);display:flex;align-items:flex-start;justify-content:center;padding:58px 18px 30px;overflow:auto}
    .nfl-chibi-private{width:min(1120px,100%);background:var(--night,#080C18);border:1px solid var(--line,rgba(45,127,255,.22));border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.55);padding:20px;position:relative}
    .nfl-chibi-private h2{font:800 26px 'Cabinet Grotesk',sans-serif;margin:4px 0 5px}
    .nfl-chibi-private .sub{color:var(--mute,#8b95a8);font-size:12px;margin-bottom:18px}
    .nfl-chibi-close{position:absolute;right:14px;top:14px;border:1px solid var(--line,rgba(45,127,255,.22));background:var(--panel,#081A40);color:var(--white,#e2e8f0);border-radius:9px;padding:7px 11px;cursor:pointer;font-weight:800}
    .chibi-admin-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
    .chibi-admin-card{background:var(--panel,#081A40);border:1px solid var(--line,rgba(45,127,255,.22));border-radius:14px;padding:15px}
    .chibi-admin-k{font:700 9px 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--mute,#8b95a8)}
    .chibi-admin-v{font-weight:800;font-size:20px;margin-top:5px;text-transform:capitalize}
    .chibi-progress{height:7px;background:var(--night2,#0C1428);border-radius:99px;overflow:hidden;margin-top:10px}
    .chibi-progress i{display:block;height:100%;background:var(--accent,#2d7fff);width:0}
    .chibi-note{margin-top:16px;padding:13px 14px;border:1px dashed var(--line,rgba(45,127,255,.22));border-radius:12px;color:var(--mute,#8b95a8);font-size:12px;line-height:1.55}
    .chibi-owner{color:var(--accent-bright,#6EDCFF);font:700 10px 'JetBrains Mono',monospace;letter-spacing:.08em}
    .chibi-gallery-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:22px 0 10px;padding-top:18px;border-top:1px solid var(--line,rgba(45,127,255,.22))}
    .chibi-gallery-head h3{font:800 18px 'Cabinet Grotesk',sans-serif;margin:0}.chibi-gallery-head span{font:700 9px 'JetBrains Mono',monospace;color:var(--mute,#8b95a8);letter-spacing:.05em;text-transform:uppercase}
    .chibi-player-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:12px}
    .chibi-player-card{overflow:hidden;background:linear-gradient(180deg,var(--panel,#081A40),rgba(7,20,46,.96));border:1px solid var(--line,rgba(45,127,255,.22));border-radius:14px;min-height:286px}
    .chibi-player-visual{height:142px;display:grid;place-items:center;position:relative;background:radial-gradient(circle at 50% 20%,rgba(45,127,255,.22),transparent 58%),#06142d;overflow:hidden}
    .chibi-player-visual img{width:100%;height:100%;object-fit:contain;object-position:center bottom;filter:saturate(.96) contrast(1.02)}
    .chibi-player-fallback{width:76px;height:76px;border-radius:50%;display:grid;place-items:center;background:rgba(45,127,255,.14);border:1px solid rgba(110,220,255,.35);font:900 21px 'JetBrains Mono',monospace;color:#dbeafe}
    .chibi-ref-badge{position:absolute;left:9px;top:9px;border:1px solid rgba(110,220,255,.36);background:rgba(3,16,35,.88);color:#6edcff;border-radius:999px;padding:4px 7px;font:800 7px 'JetBrains Mono',monospace;letter-spacing:.08em}
    .chibi-player-copy{padding:12px}.chibi-player-copy h4{font:800 14px 'Satoshi',sans-serif;margin:0;color:#fff}.chibi-player-meta{margin-top:3px;color:#9fb3cf;font:700 9px 'JetBrains Mono',monospace}
    .chibi-player-status{display:flex;align-items:center;justify-content:space-between;gap:7px;margin-top:11px;padding-top:10px;border-top:1px solid rgba(45,127,255,.14);font:700 8px 'JetBrains Mono',monospace;color:#8b95a8}.chibi-player-status b{color:#fbbf24}
    .chibi-player-actions{margin-top:8px;color:#8b95a8;font-size:10.5px;line-height:1.4}
    .chibi-source{display:inline-block;margin-top:9px;color:#6edcff;text-decoration:none;font:800 8px 'JetBrains Mono',monospace}.chibi-source:hover{text-decoration:underline}
    .chibi-empty{grid-column:1/-1;padding:24px;border:1px dashed var(--line,rgba(45,127,255,.22));border-radius:14px;color:var(--mute,#8b95a8);text-align:center}
    @media(max-width:620px){.nfl-chibi-private-backdrop{padding:12px 8px 20px}.nfl-chibi-private{padding:16px 12px}.chibi-player-grid{grid-template-columns:1fr 1fr}.chibi-player-visual{height:124px}.chibi-player-card{min-height:260px}}
    @media(max-width:430px){.chibi-player-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(s);
}

function removePrivateUi() {
  document.getElementById('nflChibiPreviewBtn')?.remove();
  document.getElementById('nflChibiPreviewModal')?.remove();
}

function installButton() {
  if (!ownerAllowed) {
    removePrivateUi();
    return;
  }
  const host = document.getElementById('sbSportAccordion');
  const props = host?.querySelector('[data-nfl-preview-tab="props"]');
  if (!host || !props) return;

  const existing = document.getElementById('nflChibiPreviewBtn');
  if (existing) {
    if (existing.previousElementSibling !== props) props.insertAdjacentElement('afterend', existing);
    return;
  }

  const b = document.createElement('button');
  b.id = 'nflChibiPreviewBtn';
  b.type = 'button';
  b.className = 'sb-sub-item nfl-chibi-preview-trigger';
  b.setAttribute('data-private-chibi-preview', 'true');
  b.textContent = 'Chibi Preview';
  b.addEventListener('click', openPreview);
  props.insertAdjacentElement('afterend', b);
}

function initials(name) {
  return String(name || '').split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]).join('').toUpperCase();
}

function findSlatePlayer(slate, name, team) {
  const wanted = normalizeName(name);
  const wantedTeam = String(team || '').toUpperCase();
  for (const game of slate?.games || []) {
    const player = (game.players || []).find(p => normalizeName(p.name) === wanted && (!wantedTeam || String(p.team || '').toUpperCase() === wantedTeam));
    if (player) return { game, player };
  }
  return null;
}

async function loadFreshNflSlate(force = false) {
  if (!force && slateCache && Date.now() - slateCacheAt < 10000) return slateCache;
  try {
    const r = await fetch(`./slates/nfl.json?ts=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return slateCache;
    slateCache = await r.json();
    slateCacheAt = Date.now();
  } catch {}
  return slateCache;
}

async function refreshOpenPlayerModal(force = false) {
  const modal = document.querySelector('#nflView .ms-modal');
  if (!modal) return;
  const name = modal.querySelector('.ms-modal-name h2')?.textContent?.trim();
  const meta = modal.querySelector('header > div:nth-child(2) > p');
  if (!name || !meta) return;

  const bits = meta.textContent.split('·').map(x => x.trim()).filter(Boolean);
  const team = (bits[0] || '').toUpperCase();
  const slate = await loadFreshNflSlate(force);
  const found = findSlatePlayer(slate, name, team);
  if (!found) return;

  const { game, player } = found;
  const playerTeam = String(player.team || team).toUpperCase();
  const away = String(game.away?.abbr || '').toUpperCase();
  const home = String(game.home?.abbr || '').toUpperCase();
  const opponent = playerTeam === away ? home : playerTeam === home ? away : String(player.opponent || '').toUpperCase();
  if (!opponent) return;

  const position = player.position || (bits[1] || '').replace(/^vs\s+/i, '') || '';
  meta.textContent = `${playerTeam} · ${position} · vs ${opponent}`;

  if (player.headshot) {
    const img = modal.querySelector('header .ms-avatar.big img');
    if (img && img.src !== player.headshot) img.src = player.headshot;
  }

  const matchupDefense = modal.querySelector('.ms-matchup-head .right b');
  if (matchupDefense) matchupDefense.textContent = opponent;
  const matchupSmall = modal.querySelector('.ms-matchup-head .right small');
  const defense = playerTeam === away ? game.home : game.away;
  const rz = Number(defense?.rzDefense?.rzTdRateAllowed);
  if (matchupSmall && Number.isFinite(rz)) matchupSmall.textContent = `${(rz * 100).toFixed(1)}% RZ TD allowed`;

  modal.dataset.currentSlateId = String(slate?.slateId || '');
  modal.dataset.currentGameId = String(game.gameId || game.id || '');
  modal.dataset.currentOpponent = opponent;
}

function galleryHTML(roster, references, slate, current) {
  const rosterBySlug = new Map((roster?.players || []).map(p => [p.slug || slugName(p.name), p]));
  const refs = references?.players || [];
  if (!refs.length) return '<div class="chibi-empty">No appearance references have been locked yet.</div>';

  return refs.map(ref => {
    const slug = ref.slug || slugName(ref.name);
    const player = rosterBySlug.get(slug) || {};
    const slatePlayer = findSlatePlayer(slate, ref.name, 'DAL')?.player;
    const headshot = slatePlayer?.headshot || '';
    const actions = Array.isArray(player.actions) ? player.actions : [];
    const signature = player.signature ? Object.keys(player.signature).filter(k => k !== 'note') : [];
    const phase = current?.currentPhase || 'appearance-reference';
    const rendered = phase === 'base-chibi' || phase === 'action-poses' || phase === 'signature-sequences' || phase === 'gamecast-integration' || phase === 'qa';
    const source = ref.officialHeadshotPage || '';
    return `<article class="chibi-player-card" data-chibi-player="${esc(slug)}">
      <div class="chibi-player-visual">
        ${headshot ? `<img src="${esc(headshot)}" alt="${esc(ref.name)} current player reference">` : `<div class="chibi-player-fallback">${esc(initials(ref.name))}</div>`}
        <span class="chibi-ref-badge">${headshot ? 'CURRENT REFERENCE' : 'REFERENCE LOCKED'}</span>
      </div>
      <div class="chibi-player-copy">
        <h4>${esc(ref.name)}</h4>
        <div class="chibi-player-meta">#${esc(ref.number || player.number || '—')} · ${esc(ref.position || player.position || 'NFL')}</div>
        <div class="chibi-player-status"><span>APPEARANCE</span><b>${esc(String(ref.appearanceStatus || 'locked').replaceAll('-', ' '))}</b></div>
        <div class="chibi-player-status"><span>BASE CHIBI</span><b>${rendered ? 'Production phase' : 'Not rendered yet'}</b></div>
        <div class="chibi-player-actions">${actions.length} planned Gamecast action${actions.length === 1 ? '' : 's'}${signature.length ? ` · ${signature.length} signature sequence${signature.length === 1 ? '' : 's'}` : ''}</div>
        ${source ? `<a class="chibi-source" href="${esc(source)}" target="_blank" rel="noopener noreferrer">Official appearance source ↗</a>` : ''}
      </div>
    </article>`;
  }).join('');
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
      <div class="sub">NFL Gamecast production asset QA · real project/reference data only</div>
      <div class="chibi-admin-grid">
        <div class="chibi-admin-card"><div class="chibi-admin-k">Current team</div><div class="chibi-admin-v" id="cpTeam">Dallas Cowboys</div></div>
        <div class="chibi-admin-card"><div class="chibi-admin-k">Current phase</div><div class="chibi-admin-v" id="cpPhase">Loading…</div></div>
        <div class="chibi-admin-card"><div class="chibi-admin-k">References locked</div><div class="chibi-admin-v" id="cpProgress">—</div><div class="chibi-progress"><i id="cpBar"></i></div></div>
      </div>
      <div class="chibi-note" id="cpNote">Loading the Dallas production library…</div>
      <div class="chibi-gallery-head"><div><span>Player QA gallery</span><h3>Dallas appearance references</h3></div><span id="cpGalleryCount">Loading…</span></div>
      <div class="chibi-player-grid" id="cpGallery"><div class="chibi-empty">Loading player references…</div></div>
    </section>`;

  const close = () => backdrop.remove();
  backdrop.querySelector('.nfl-chibi-close')?.addEventListener('click', close);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', function escClose(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escClose); }
  });
  document.body.appendChild(backdrop);

  try {
    const [project, roster, references, slate] = await Promise.all([
      fetch(`./sports/nfl/assets/chibis/project.json?ts=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`./sports/nfl/assets/chibis/DAL/roster.json?ts=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`./sports/nfl/assets/chibis/DAL/appearance-reference.json?ts=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()),
      loadFreshNflSlate(true),
    ]);
    const current = project.teams?.find(t => t.abbr === 'DAL') || project.teams?.find(t => t.status !== 'complete');
    const a = Number(current?.progress?.appearanceReferencesLocked || references?.players?.length || 0);
    const e = Number(current?.progress?.appearanceReferencesExpected || current?.playersExpected || 53);
    document.getElementById('cpTeam').textContent = current?.name || roster?.teamName || 'Dallas Cowboys';
    document.getElementById('cpPhase').textContent = String(current?.currentPhase || 'Production').replaceAll('-', ' ');
    document.getElementById('cpProgress').textContent = `${a} / ${e}`;
    document.getElementById('cpBar').style.width = `${e ? Math.min(100, a / e * 100) : 0}%`;
    document.getElementById('cpGallery').innerHTML = galleryHTML(roster, references, slate, current);
    document.getElementById('cpGalleryCount').textContent = `${references?.players?.length || 0} referenced players`;
    const phase = current?.currentPhase || '';
    document.getElementById('cpNote').innerHTML = phase === 'appearance-reference'
      ? `<b>Visual QA is now available.</b> These cards show the real locked appearance references and current roster headshots where the live NFL slate supplies them. Dallas is still in the appearance-reference phase, so base/action chibi render files are not published yet; the gallery will surface those assets once that phase begins.`
      : `<b>Production gallery is live.</b> Player cards are sourced from the current Dallas roster/reference library and will expose rendered assets as they are published.`;
  } catch (err) {
    document.getElementById('cpPhase').textContent = 'Production status unavailable';
    document.getElementById('cpGallery').innerHTML = '<div class="chibi-empty">Could not load the current Chibi library. Close and reopen to retry.</div>';
    document.getElementById('cpNote').textContent = 'The preview never substitutes fake player assets when production data is unavailable.';
  }
}

function syncUi() {
  ensureStyles();
  installButton();
  refreshOpenPlayerModal();
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
    let queued = false;
    observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        syncUi();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (!modalRefreshTimer) modalRefreshTimer = setInterval(() => {
    if (document.querySelector('#nflView .ms-modal')) refreshOpenPlayerModal(true);
  }, 12000);

  window.addEventListener('dw-social-ready', refreshAccess);
  window.addEventListener('dw-auth-changed', refreshAccess);
  window.addEventListener('storage', refreshAccess);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      refreshAccess();
      refreshOpenPlayerModal(true);
    }
  });
}
