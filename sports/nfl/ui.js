/**
 * sports/nfl/ui.js — Touchdown Watch view.
 *
 * Renders the NFL slate into #nflView: a week header, a football-field gamecast
 * per game, and an Anytime-TD pick list. This is a SELF-CONTAINED view that runs
 * beside the MLB app rather than through it — the MLB code path (slate.json ->
 * batters/pitchers/parks/weather) is deeply shaped around baseball, and forcing
 * football through it would risk every existing feature for no benefit. Every
 * class here is `nfl-` prefixed, so nothing collides with existing CSS/JS.
 *
 * Data contract: ./slates/nfl.json, written by sports/nfl/adapter.js.
 */
import { SPORTS, isPreview } from '../registry.js';
import { startLivePolling, stopLivePolling } from './live.js';
import { liveWinProb } from './winprob.js';

const CFG = SPORTS.nfl;
let slate = null;
let oddsDoc = null;
let activeGameId = null;
let posFilter = 'ALL';

// Nav state — mirrors MLB's #propTabs: top-level tabs + a Player Props view
// whose six markets render as a static, in-flow sub-tab row (not a dropdown).
// Not encoded in location.hash (router only routes #nfl); kept in-module.
let activeNflTab = 'slate';        // 'slate' | 'feed' | 'foryou' | 'props'
let activeNflProp = 'atd';         // 'atd' | 'firstTd' | 'rushYds' | 'recYds' | 'receptions' | 'passTds'
// ---------------------------------------------------------------------------
// team colors + grade ring — mirrors the MLB app's visual language
// (same ring math as its siteRingSVG()) but built independently here,
// since this module is deliberately isolated from the MLB code path.
// ---------------------------------------------------------------------------
/** Each team's real, sourced primary brand color. Where a team's true
 *  primary is black (Raiders, Jaguars) or collides visually with another
 *  team already in this list (Seahawks' navy vs. Patriots/Rams), the
 *  team's own real SECONDARY color is used instead for the ring
 *  specifically, since a barely-visible or duplicated ring color
 *  defeats the point of a quick, at-a-glance team identifier — the
 *  underlying color is still a genuine, sourced brand color for that
 *  team, just not always the very first one listed. */
const NFL_TEAM_COLORS = {
  ARI: '#97233F', ATL: '#A71930', BAL: '#241773', BUF: '#00338D',
  CAR: '#0085CA', CHI: '#0B162A', CIN: '#FB4F14', CLE: '#FF3C00',
  DAL: '#003594', DEN: '#FB4F14', DET: '#0076B6', GB: '#203731',
  HOU: '#03202F', IND: '#002C5F', JAX: '#006778', KC: '#E31837',
  LA: '#002244', LAC: '#0080C6', LV: '#A5ACAF', MIA: '#008E97',
  MIN: '#4F2683', NE: '#002244', NO: '#D3BC8D', NYG: '#0B2265',
  NYJ: '#125740', PHI: '#004C54', PIT: '#FFB612', SEA: '#69BE28',
  SF: '#AA0000', TB: '#D50A0A', TEN: '#0C2340', WAS: '#5A1414',
};
function nflTeamColor(abbr) { return NFL_TEAM_COLORS[abbr] || '#8b95a8'; }

/** Grade letter -> color, matching the MLB app's own scheme exactly. */
function nflGradeColor(g) {
  const u = (g || '').toUpperCase();
  return u.startsWith('A') ? '#22c55e' : u.startsWith('B') ? '#f4c430'
    : u.startsWith('C') ? '#ff9f43' : u.startsWith('D') ? '#8b95a8' : '#22c55e';
}

// Same circumference constant and stroke-dasharray approach as the MLB
// app's siteRingSVG() (r=52, C = 2*pi*52 ~= 326.7) — genuinely the same
// ring, not just a visually-similar approximation.
const NFL_RING_C = 326.7;
function nflRingSVG(pct) {
  const v = Math.max(0, Math.min(100, Number(pct) || 0));
  const off = (NFL_RING_C * (1 - v / 100)).toFixed(1);
  return `<svg viewBox="0 0 120 120" class="sgr-svg" aria-hidden="true"><circle class="sgr-rt" cx="60" cy="60" r="52"/><circle class="sgr-rf" cx="60" cy="60" r="52" transform="rotate(-90 60 60)" stroke-dasharray="${NFL_RING_C}" stroke-dashoffset="${off}"/></svg>`;
}
/** Full grade ring with percentage — mirrors gradePctRingHTML() exactly. */
function nflGradeRingHTML(probability, grade) {
  const pctVal = probability * 100;
  const disp = pctVal < 10 ? pctVal.toFixed(1) : Math.round(pctVal);
  return `<span class="sgr sgr-xl sgr-pct" style="color:${nflGradeColor(grade)}">${nflRingSVG(pctVal)}<span class="sgr-l"><b class="sgr-gd2">${esc(grade)}</b><span class="sgr-pv">${disp}%</span></span></span>`;
}

const NFL_PROPS = {
  atd:        { label: 'Anytime TD',      modeled: true },
  firstTd:    { label: 'First TD',        modeled: false },
  rushYds:    { label: 'Rush Yards',     modeled: false },
  recYds:     { label: 'Receiving Yards', modeled: false },
  receptions: { label: 'Receptions',   modeled: false },
  passTds:    { label: 'Passing TDs',   modeled: false },
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const pct = (p) => `${(p * 100).toFixed(1)}%`;

/** Kickoff time in the viewer's local zone. */
function kickoff(utc) {
  if (!utc) return '';
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function relTime(iso) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 'unknown';
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Red-zone defense descriptor: index <1 means the defense is stingy. */
function rzDefLabel(rz) {
  if (!rz || rz.rzDefIndex == null) return { text: 'No RZ data', tone: 'neu', detail: '' };
  const i = rz.rzDefIndex;
  const allowed = `${(rz.rzTdRateAllowed * 100).toFixed(1)}%`;
  const detail = `Allowed a touchdown on ${allowed} of red-zone plays faced` +
    (rz.rzPlaysFaced ? ` (${rz.rzPlaysFaced} plays, 2025)` : '');
  if (i <= 0.9) return { text: `Tough RZ D · ${allowed}`, tone: 'neg', detail };
  if (i >= 1.1) return { text: `Soft RZ D · ${allowed}`, tone: 'pos', detail };
  return { text: `Average RZ D · ${allowed}`, tone: 'neu', detail };
}

const AVAIL_LABEL = {
  active: 'Active', questionable: 'Questionable', doubtful: 'Doubtful',
  out: 'Out', unconfirmed: 'Unconfirmed',
};

const CONF_LABEL = {
  full: null,                                    // normal case, no badge
  rookie: { text: 'Rookie', title: 'No NFL production history — projection is prior-based, scaled by draft position' },
  'no-history': { text: 'No 2025 sample', title: 'On a 2026 roster but recorded no 2025 production — projection is prior-based and discounted' },
};

// ---------------------------------------------------------------------------
// player-prop odds (OpticOdds sample) — fail-soft, mirrors the MLB odds model
// ---------------------------------------------------------------------------
const ODDS_URL = './slates/nfl-odds.json';

/** American-odds display: +140 / -120. */
function priceFmt(p) {
  if (p == null || !Number.isFinite(p)) return '';
  return p > 0 ? `+${Math.round(p)}` : `${Math.round(p)}`;
}

/** Normalized name for join: lowercase, strip dots/suffixes, collapse spaces. */
function normName(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+(jr|sr|ii|iii|iv|v)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Attach odds (slates/nfl-odds.json) to slate players by matchup + name. Fail-soft. */
function mergeNflOdds(slate, odds) {
  if (!slate?.games?.length || !odds?.games?.length) return;
  const byKey = {};
  for (const g of odds.games) byKey[g.matchKey] = g;
  for (const game of slate.games) {
    const og = byKey[`${game.away?.abbr}-${game.home?.abbr}`];
    if (!og) continue;
    const byName = {};
    for (const p of og.players) byName[normName(p.name)] = p;
    for (const p of game.players) {
      const m = byName[normName(p.name)];
      if (m) p.odds = m.odds;
    }
  }
}

// (Week-1 odds preview card removed — real odds now live in the Player Props
//  sub-tabs. The slate tab no longer injects a preview card.)

// ---------------------------------------------------------------------------
// football field gamecast
// ---------------------------------------------------------------------------
/**
 * The signature visual: a 100-yard field drawn as SVG. The two end zones carry
 * the teams' colors and abbreviations, and the yard lines/numbers give it real
 * football geometry rather than a generic progress bar.
 *
 * `mode: 'compact'` is the card header; `mode: 'full'` is the expanded gamecast.
 */
function fieldSVG(game, mode = 'compact') {
  const h = mode === 'full' ? 132 : 92;
  const ez = 26;                    // end-zone depth in user units
  const W = 300;
  const fieldW = W - ez * 2;
  const lines = [];
  // yard lines every 10 yards (10 interior lines across 100 yards)
  for (let y = 10; y <= 90; y += 10) {
    const x = ez + (fieldW * y) / 100;
    lines.push(`<line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${h}" stroke="rgba(255,255,255,.22)" stroke-width="0.8"/>`);
  }
  // yard numbers (10..50..10)
  const nums = [];
  for (let y = 10; y <= 90; y += 10) {
    const label = y <= 50 ? y : 100 - y;
    const x = ez + (fieldW * y) / 100;
    nums.push(`<text x="${x.toFixed(1)}" y="${(h / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="9" fill="rgba(255,255,255,.34)" font-family="'JetBrains Mono',monospace">${label}</text>`);
  }
  // hash marks every 5 yards, top and bottom
  const hashes = [];
  for (let y = 5; y <= 95; y += 5) {
    if (y % 10 === 0) continue;
    const x = ez + (fieldW * y) / 100;
    hashes.push(`<line x1="${x.toFixed(1)}" y1="${h * 0.28}" x2="${x.toFixed(1)}" y2="${h * 0.34}" stroke="rgba(255,255,255,.16)" stroke-width="0.7"/>`);
    hashes.push(`<line x1="${x.toFixed(1)}" y1="${h * 0.66}" x2="${x.toFixed(1)}" y2="${h * 0.72}" stroke="rgba(255,255,255,.16)" stroke-width="0.7"/>`);
  }
  const uid = `f${game.gameId}${mode}`;
  return `
<svg class="nfl-field ${mode === 'full' ? 'is-full' : ''}" viewBox="0 0 ${W} ${h}" role="img"
     aria-label="${esc(game.away.abbr)} at ${esc(game.home.abbr)}" preserveAspectRatio="none">
  <defs>
    <linearGradient id="${uid}turf" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1c5233"/><stop offset="0.5" stop-color="#174a2c"/><stop offset="1" stop-color="#123d26"/>
    </linearGradient>
    <pattern id="${uid}mow" width="${(fieldW / 10).toFixed(2)}" height="${h}" patternUnits="userSpaceOnUse">
      <rect width="${(fieldW / 20).toFixed(2)}" height="${h}" fill="rgba(255,255,255,.028)"/>
    </pattern>
  </defs>
  <rect x="0" y="0" width="${W}" height="${h}" fill="url(#${uid}turf)"/>
  <rect x="${ez}" y="0" width="${fieldW}" height="${h}" fill="url(#${uid}mow)"/>
  <rect x="0" y="0" width="${ez}" height="${h}" fill="rgba(0,0,0,.34)"/>
  <rect x="${W - ez}" y="0" width="${ez}" height="${h}" fill="rgba(0,0,0,.34)"/>
  ${lines.join('')}${hashes.join('')}${nums.join('')}
  <line x1="${ez}" y1="0" x2="${ez}" y2="${h}" stroke="rgba(255,255,255,.5)" stroke-width="1.2"/>
  <line x1="${W - ez}" y1="0" x2="${W - ez}" y2="${h}" stroke="rgba(255,255,255,.5)" stroke-width="1.2"/>
  <text x="${ez / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="middle"
        transform="rotate(-90 ${ez / 2} ${h / 2})" font-size="11" font-weight="700"
        fill="rgba(255,255,255,.72)" font-family="'JetBrains Mono',monospace"
        letter-spacing="1.5">${esc(game.away.abbr)}</text>
  <text x="${W - ez / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="middle"
        transform="rotate(90 ${W - ez / 2} ${h / 2})" font-size="11" font-weight="700"
        fill="rgba(255,255,255,.72)" font-family="'JetBrains Mono',monospace"
        letter-spacing="1.5">${esc(game.home.abbr)}</text>
  <rect x="0" y="0" width="${W}" height="${h}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="1"/>
</svg>`;
}

// ---------------------------------------------------------------------------
// live win-probability strip (moneyline tiles)
// ---------------------------------------------------------------------------
/**
 * Modeled in-game win probability for the expanded gamecast — NOT a live
 * sportsbook moneyline. The team more likely to win turns green, the other red;
 * the O/U tile shows a projected final total (the NFL slate carries no total
 * line). A small LIVE label makes the modeled nature explicit.
 */
function oddsHTML(game) {
  const wp = liveWinProb(game);
  const aPct = Math.round(wp.awayPct * 100);
  const hPct = Math.round(wp.homePct * 100);
  const aWin = wp.awayPct >= wp.homePct;
  const awayCls = aWin ? 'wp-win' : 'wp-lose';
  const homeCls = aWin ? 'wp-lose' : 'wp-win';
  const ouVal = wp.projTotal != null ? `Proj ${wp.projTotal.toFixed(1)}` : '—';
  return `<div class="nfl-gc-live"><span class="nfl-gc-live-dot"></span>LIVE<span class="nfl-gc-live-sub"> · modeled win probability</span></div>
<div class="nfl-gc-odds">
  <div class="nfl-gc-ot"><div class="nfl-gc-ot-label">${esc(game.away.abbr)} ML</div><div class="nfl-gc-ot-val ${awayCls}">${aPct}%</div></div>
  <div class="nfl-gc-ot"><div class="nfl-gc-ot-label">${esc(game.home.abbr)} ML</div><div class="nfl-gc-ot-val ${homeCls}">${hPct}%</div></div>
  <div class="nfl-gc-ot"><div class="nfl-gc-ot-label">O/U</div><div class="nfl-gc-ot-val wp-proj">${ouVal}</div></div>
</div>`;
}

// ---------------------------------------------------------------------------
// game card
// ---------------------------------------------------------------------------
function gameCard(game) {
  const isFinal = game.status === 'post';
  const isLive = game.status === 'in';
  const awayRz = rzDefLabel(game.away.rzDefense);
  const homeRz = rzDefLabel(game.home.rzDefense);
  const rec = (t) => (t.records || []).find(r => r.type === 'total')?.summary || '';
  const natl = (game.broadcast || []).find(b => b.market === 'national');
  const tv = natl?.names?.[0] || (game.broadcast || [])[0]?.names?.[0] || '';
  // top TD candidate per side, for the "most likely to score" strip
  const top = (abbr) => game.players
    .filter(p => p.team === abbr && p.props.atd.availability.status !== 'out')
    .sort((a, b) => b.props.atd.probability - a.props.atd.probability)[0];
  const ta = top(game.away.abbr), th = top(game.home.abbr);
  const scorer = (p) => p
    ? `<span class="nfl-scorer"><b>${esc(p.name)}</b> <span class="nfl-scorer-pct">${pct(p.props.atd.probability)}</span></span>`
    : '<span class="nfl-scorer nfl-scorer-none">No candidate</span>';

  return `
<article class="nfl-game" data-game="${esc(game.gameId)}" data-status="${esc(game.status)}" tabindex="0" role="button"
         aria-expanded="${activeGameId === game.gameId}" aria-label="Open gamecast for ${esc(game.away.abbr)} at ${esc(game.home.abbr)}">
  <div class="nfl-game-field">
    ${fieldSVG(game, 'compact')}
    <div class="nfl-game-overlay">
      <div class="nfl-team nfl-team-away">
        <img class="nfl-logo" src="${esc(game.away.logo)}" alt="" loading="lazy"/>
        <div class="nfl-team-meta">
          <span class="nfl-team-abbr">${esc(game.away.abbr)}</span>
          <span class="nfl-team-rec">${esc(rec(game.away))}</span>
        </div>
      </div>
      <div class="nfl-game-center">
        ${isFinal || isLive
          ? `<div class="nfl-score" id="nflScore-${esc(game.gameId)}"><span>${esc(game.away.score)}</span><span class="nfl-score-dash">–</span><span>${esc(game.home.score)}</span></div>
             <div class="nfl-status ${isLive ? 'is-live' : ''}" id="nflStatus-${esc(game.gameId)}">${isLive ? 'LIVE' : 'FINAL'}</div>`
          : `<div class="nfl-kick">${esc(kickoff(game.startTimeUTC))}</div>
             <div class="nfl-at">@</div>`}
      </div>
      <div class="nfl-team nfl-team-home">
        <div class="nfl-team-meta nfl-ta-right">
          <span class="nfl-team-abbr">${esc(game.home.abbr)}</span>
          <span class="nfl-team-rec">${esc(rec(game.home))}</span>
        </div>
        <img class="nfl-logo" src="${esc(game.home.logo)}" alt="" loading="lazy"/>
      </div>
    </div>
  </div>
  <div class="nfl-game-body">
    <div class="nfl-game-info">
      <span>${esc(game.venue?.name || '')}</span>
      ${game.venue?.indoor ? '<span class="nfl-chip">Indoor</span>' : ''}
      ${tv ? `<span class="nfl-chip">${esc(tv)}</span>` : ''}
    </div>
    <div class="nfl-rz-row">
      <div class="nfl-rz nfl-rz-${awayRz.tone}" title="${esc(game.away.name)} defense — ${esc(awayRz.detail)}">
        <span class="nfl-rz-team">vs ${esc(game.away.abbr)} D</span>
        <span class="nfl-rz-text">${esc(awayRz.text)}</span>
      </div>
      <div class="nfl-rz nfl-rz-${homeRz.tone}" title="${esc(game.home.name)} defense — ${esc(homeRz.detail)}">
        <span class="nfl-rz-team">vs ${esc(game.home.abbr)} D</span>
        <span class="nfl-rz-text">${esc(homeRz.text)}</span>
      </div>
    </div>
    <div class="nfl-top-scorers">
      <div class="nfl-ts"><span class="nfl-ts-label">${esc(game.away.abbr)} top TD</span>${scorer(ta)}</div>
      <div class="nfl-ts"><span class="nfl-ts-label">${esc(game.home.abbr)} top TD</span>${scorer(th)}</div>
    </div>
  </div>
</article>`;
}

// ---------------------------------------------------------------------------
// player row
// ---------------------------------------------------------------------------
/**
 * The Top 20 Anytime TD card — mirrors the MLB app's Top 20 Home Run
 * card structure and information density (rank, team-colored headshot,
 * name/matchup row, a real badge row, contextual metrics, and a full
 * grade ring), built independently here since this module is
 * deliberately isolated from the MLB code path, but using the exact
 * same ring math/CSS classes (see nflGradeRingHTML above) so the two
 * genuinely look and read the same way.
 */
function pickCardHTML(p, opts = {}) {
  const a = p.props.atd;
  const conf = CONF_LABEL[a.dataConfidence];
  const isOut = a.availability.status === 'out';
  const g = teamToGameMap()[p.team];
  const rankCls = opts.rank === 2 ? 'r2' : opts.rank === 3 ? 'r3' : opts.rank >= 4 ? 'r5' : '';

  // Matchup line: real kickoff time pre-game, live score once underway —
  // the exact same status states the gamecast itself uses.
  let matchupTxt = `vs ${esc(p.opponent)}`;
  if (g) {
    if (g.status === 'pre') matchupTxt += ` · ${esc(kickoff(g.startTimeUTC))}`;
    else if (g.status === 'in') matchupTxt += ` · LIVE ${esc(g.away.score)}–${esc(g.home.score)}`;
    else if (g.status === 'post') matchupTxt += ` · FINAL ${esc(g.away.score)}–${esc(g.home.score)}`;
  }

  // Real badge row — the same underlying facts the old chip row showed,
  // restyled to match the MLB app's small-pill badge visual language
  // rather than the larger, differently-styled chips used elsewhere.
  const badges = [];
  if (p.depthRank != null) badges.push({ icon: '📋', text: `${esc(p.position)}${p.depthRank}`, title: `2026 depth-chart rank at ${esc(p.position)}` });
  if (p.teamChanged) badges.push({ icon: '🔁', text: `${esc(p.prevTeam)}→${esc(p.team)}`, title: `Changed teams for 2026 — 2025 production was with ${esc(p.prevTeam)}` });
  if (conf) badges.push({ icon: '⚠️', text: esc(conf.text), title: esc(conf.title) });
  if (!isOut && a.availability.status !== 'active' && a.availability.status !== 'unconfirmed') {
    badges.push({ icon: '🩹', text: esc(AVAIL_LABEL[a.availability.status] || a.availability.status), title: esc(a.availability.note || '') });
  }
  const badgeRow = badges.length
    ? `<div class="nfl-pick-badges">${badges.map(b => `<span class="nfl-pick-badge" title="${b.title}">${b.icon} ${b.text}</span>`).join('')}</div>`
    : '';

  // Real red-zone defense context for THIS matchup — already computed
  // elsewhere in this module (rzDefLabel), the closest NFL analog to the
  // MLB card's opponent-pitcher chip: what does the defense this player
  // faces tonight actually do in the red zone.
  const oppTeam = g ? (g.away.abbr === p.team ? g.home : g.away) : null;
  const rzChip = oppTeam ? rzDefLabel(oppTeam.rzDefense) : null;
  const rzChipHTML = rzChip
    ? `<span class="nfl-pick-chip" title="${esc(rzChip.detail)}">${esc(rzChip.text)}</span>`
    : '';

  const venueHTML = g?.venue
    ? `<div class="nfl-pick-env-item">${g.venue.indoor ? '🏟️ Indoor' : '☀️ Outdoor'}${g.venue.name ? ` · ${esc(g.venue.name.split(',')[0])}` : ''}</div>`
    : '';

  const atdOdds = p.odds?.atd?.best;
  const oddsRow = atdOdds
    ? `<div class="nfl-pick-odds"><a href="${esc(atdOdds.link)}" target="_blank" rel="noopener" class="nfl-pick-odds-link" title="${esc(atdOdds.book)} · Anytime TD — tap to bet">💰 Best price ${priceFmt(atdOdds.price)} · ${esc(atdOdds.book)}</a></div>`
    : '';

  return `
<div class="nfl-pick-card ${isOut ? 'is-out' : ''}" data-gsis="${esc(p.gsisId)}">
  <div class="nfl-pick-rank ${rankCls}">${opts.rank != null ? opts.rank : ''}</div>
  <img class="nfl-pick-headshot" style="border-color:${nflTeamColor(p.team)};" src="${esc(p.headshot || '')}" alt=""
       loading="lazy" onerror="this.style.visibility='hidden'"/>
  <div class="nfl-pick-body">
    <div class="nfl-pick-name-row">
      <span class="nfl-pick-name">${esc(p.name)}</span>
      <span class="nfl-pick-team">${esc(p.team)} · ${esc(p.position)}${p.jersey ? ` #${esc(p.jersey)}` : ''}</span>
      <span class="nfl-pick-matchup">${matchupTxt}</span>
    </div>
    ${badgeRow}
    <div class="nfl-pick-metrics">
      <div class="nfl-pick-chips">${rzChipHTML}</div>
      <div class="nfl-pick-env">${venueHTML}</div>
    </div>
    ${oddsRow}
  </div>
  <div class="nfl-pick-score">
    ${nflGradeRingHTML(a.probability, a.grade)}
    <div class="nfl-pick-score-label">ATD PROB</div>
  </div>
</div>`;
}

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------
function allPlayers() {
  return slate.games.flatMap(g => g.players);
}

/** Maps each team abbreviation (both sides of every game) to its real
 *  game object — a player only carries p.opponent (a string), not a
 *  direct game reference, so this is how the redesigned card looks up
 *  kickoff time, status, and venue for a given player's own game. */
function teamToGameMap() {
  const map = {};
  for (const g of slate.games) {
    if (g.away?.abbr) map[g.away.abbr] = g;
    if (g.home?.abbr) map[g.home.abbr] = g;
  }
  return map;
}

// ---------------------------------------------------------------------------
// sidebar / bottom-nav: tab + prop switching (mirrors MLB's #propTabs)
// ---------------------------------------------------------------------------
function selectNflTab(id) {
  activeNflTab = id;
  renderNflNav();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function selectNflProp(id) {
  activeNflProp = id;
  activeNflTab = 'props';
  renderNflNav();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
/** Static, in-flow sub-tab row for the six player-prop markets. Rendered at the
 *  top of the props view body — never a popover, so mobile can't fail to open it. */
function propSubtabsHTML() {
  return `<div class="nfl-subtabs" role="tablist" aria-label="Player prop market">` +
    Object.entries(NFL_PROPS).map(([id, p]) =>
      `<button type="button" class="nfl-subtab ${id === activeNflProp ? 'is-active' : ''}" data-nfl-prop="${id}" role="tab">${esc(p.label)}</button>`
    ).join('') + `</div>`;
}
/** Sync the nav's active states with current tab. Called from render(). */
function renderNflNav() {
  const nav = document.getElementById('nflSideNav');
  if (!nav) return;
  nav.querySelectorAll('.nfl-sn-tab[data-nfl-tab]').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.nflTab === activeNflTab);
  });
}
/** Wire the static nav buttons once (on mount). */
function wireNflNav() {
  const nav = document.getElementById('nflSideNav');
  if (!nav || nav.dataset.wired) return;
  nav.dataset.wired = '1';
  nav.querySelectorAll('.nfl-sn-tab[data-nfl-tab]').forEach(btn => {
    btn.addEventListener('click', () => selectNflTab(btn.dataset.nflTab));
  });
  // Chat is a floating panel action, not a tab — it opens the sport-scoped
  // room (chatRoom() in index.html reads data-sport). Mobile-only via CSS.
  document.getElementById('nflChatBtnMobile')?.addEventListener('click', () => {
    window.toggleChatPanel?.();
  });
}

/** Player-prop odds view for non-ATD props (Rush/Rec/Receptions/Pass TDs).
 *  Drawn from slates/nfl-odds.json — real best Over price + deep links where
 *  books have posted lines. Empty state explains when lines go up. */
function renderPropOdds(host, prop) {
  const games = oddsDoc?.games || [];
  const rows = [];
  for (const gm of games) {
    for (const p of gm.players || []) {
      const o = p.odds?.[prop];
      if (!o || !o.over?.best) continue;
      rows.push({
        name: p.name, team: p.team, line: o.line,
        price: o.over.best.price, book: o.over.best.book, link: o.over.best.link,
      });
    }
  }
  // Best price first: highest American number = best payout (+300 > +150 > -110 > -120).
  rows.sort((a, b) => b.price - a.price);
  if (!rows.length) {
    host.innerHTML = `<div class="nfl-empty">No ${esc(NFL_PROPS[prop].label)} lines posted yet — sportsbooks post player-prop odds 24–48 hours before kickoff. Check back closer to game time.</div>`;
    return;
  }
  const bookList = [...new Set(rows.map(r => r.book))].slice(0, 3).join(' / ');
  host.innerHTML =
    `<div class="nfl-prop-odds-note">Best Over price across ${esc(bookList)} · ${rows.length} player${rows.length > 1 ? 's' : ''} · tap to bet.</div>` +
    rows.map((r, i) => propOddsRow(r, i + 1, prop)).join('');
}

function propOddsRow(r, rank, prop) {
  const label = NFL_PROPS[prop].label;
  return `<a class="nfl-prop-row" href="${esc(r.link)}" target="_blank" rel="noopener" title="${esc(r.book)} · ${label} Over ${esc(r.line)} — tap to bet">
    <div class="nfl-prop-rank">${rank}</div>
    <div class="nfl-prop-name"><b>${esc(r.name)}</b>
      <span class="nfl-prop-meta">${esc(r.team)} · Over ${esc(r.line)} ${esc(label)}</span></div>
    <div class="nfl-prop-amt">${priceFmt(r.price)}</div>
  </a>`;
}

function renderPicks(host) {
  let list = activeGameId
    ? (slate.games.find(g => g.gameId === activeGameId)?.players || [])
    : allPlayers();
  if (posFilter !== 'ALL') list = list.filter(p => p.position === posFilter);
  list = [...list].sort((a, b) => b.props.atd.probability - a.props.atd.probability);
  const limit = activeGameId ? list.length : 20;
  const shown = list.slice(0, limit);
  host.innerHTML = shown.length
    ? shown.map((p, i) => pickCardHTML(p, { rank: i + 1 })).join('')
    : '<div class="nfl-empty">No players match this filter.</div>';
}

/** Wires a single game card's click/keyboard-open behavior. Shared by
 *  renderGames() (every card, on a full grid render) and
 *  updateLiveDisplay() (just the one card it structurally replaced) —
 *  extracted specifically because a card swapped in via outerHTML loses
 *  whatever listener was on the DOM node it replaced. */
function wireGameCard(el) {
  const open = () => {
    const id = el.dataset.game;
    activeGameId = activeGameId === id ? null : id;
    render();
  };
  el.addEventListener('click', open);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });
}

function renderGames(host) {
  host.innerHTML = slate.games.map(gameCard).join('');
  host.querySelectorAll('.nfl-game').forEach(wireGameCard);
}

/**
 * Targeted live-data update for the live-poll callback — the actual
 * performance fix. Unlike render(), this never rebuilds the header,
 * toolbar, banner, or footer, and skips the expensive SVG field
 * regeneration entirely whenever a game's status hasn't structurally
 * changed — the common case during an already-live game, where most
 * poll ticks are just a score or clock update.
 *
 * Deliberately does nothing at all when the user isn't on the Slate tab
 * — Feed, For You, and Props don't show anything this poll's data would
 * change, so there's nothing to update. The underlying `slate` object
 * is already mutated by live.js's tick() regardless of whether this
 * function touches the DOM, so switching back to Slate later picks up
 * the latest state naturally through the next real render() anyway.
 */
function updateLiveDisplay() {
  if (activeNflTab !== 'slate') return;
  const root = document.getElementById('nflView');
  if (!root) return;

  if (activeGameId) {
    // Gamecast view — just this one game's three live regions. The SVG
    // field, logos, and RZ-defense labels are untouched: none of them
    // depend on live score data at all.
    const g = slate.games.find(x => x.gameId === activeGameId);
    if (!g) return;
    const kickEl = root.querySelector('#nflGcKick');
    const detailEl = root.querySelector('#nflGcDetail');
    const oddsEl = root.querySelector('#nflGcOdds');
    if (kickEl) kickEl.textContent = g.status === 'pre' ? kickoff(g.startTimeUTC) : `${g.away.score}–${g.home.score}`;
    if (detailEl) detailEl.textContent = g.statusDetail || '';
    if (oddsEl) oddsEl.innerHTML = oddsHTML(g);   // small and cheap — no SVG involved
    return;
  }

  // Grid view — update each card's score/status in place. Only fully
  // replaces a card when its status has genuinely, structurally changed
  // (kickoff just happened, or the game just went final) — the one case
  // a text-only update can't handle safely, since the center column's
  // markup itself differs between pre-game and live/final.
  const gamesHost = root.querySelector('#nflGames');
  if (!gamesHost) return;
  for (const g of slate.games) {
    const cardEl = gamesHost.querySelector(`.nfl-game[data-game="${g.gameId}"]`);
    if (!cardEl) continue;
    if (cardEl.dataset.status !== g.status) {
      cardEl.outerHTML = gameCard(g);
      wireGameCard(gamesHost.querySelector(`.nfl-game[data-game="${g.gameId}"]`));
      continue;
    }
    const scoreEl = gamesHost.querySelector(`#nflScore-${g.gameId}`);
    const statusEl = gamesHost.querySelector(`#nflStatus-${g.gameId}`);
    if (scoreEl) scoreEl.innerHTML = `<span>${esc(g.away.score)}</span><span class="nfl-score-dash">–</span><span>${esc(g.home.score)}</span>`;
    if (statusEl) statusEl.textContent = g.status === 'in' ? 'LIVE' : 'FINAL';
  }
}

function gamecastHTML(g) {
  return `<section class="nfl-gamecast" data-game="${esc(g.gameId)}">
  <div class="nfl-gc-field">
    ${fieldSVG(g, 'full')}
    <div class="nfl-gc-overlay">
      <div class="nfl-gc-team">
        <img class="nfl-logo lg" src="${esc(g.away.logo)}" alt=""/>
        <div><div class="nfl-gc-abbr"><span class="nfl-gc-full">${esc(g.away.name)}</span><span class="nfl-gc-short">${esc(g.away.abbr)}</span></div>
        <div class="nfl-gc-rz">${esc(rzDefLabel(g.away.rzDefense).text)}</div></div>
      </div>
      <div class="nfl-gc-center">
        <div class="nfl-gc-kick" id="nflGcKick">${g.status === 'pre' ? esc(kickoff(g.startTimeUTC)) : `${esc(g.away.score)}–${esc(g.home.score)}`}</div>
        <div class="nfl-gc-detail" id="nflGcDetail">${esc(g.statusDetail || '')}</div>
      </div>
      <div class="nfl-gc-team nfl-gc-team-home">
        <div class="nfl-ta-right"><div class="nfl-gc-abbr"><span class="nfl-gc-full">${esc(g.home.name)}</span><span class="nfl-gc-short">${esc(g.home.abbr)}</span></div>
        <div class="nfl-gc-rz">${esc(rzDefLabel(g.home.rzDefense).text)}</div></div>
        <img class="nfl-logo lg" src="${esc(g.home.logo)}" alt=""/>
      </div>
    </div>
  </div>
  <div class="nfl-gc-info">
    <span>${esc(g.venue?.name || '')}${g.venue?.city ? ` · ${esc(g.venue.city)}` : ''}</span>
    ${(g.broadcast || []).map(b => `<span class="nfl-chip">${esc(b.names?.join('/') || '')}</span>`).join('')}
  </div>
  <div id="nflGcOdds">${oddsHTML(g)}</div>
</section>`;
}

export function render() {
  const root = document.getElementById('nflView');
  if (!root || !slate) return;
  renderNflNav();
  const g = activeGameId ? slate.games.find(x => x.gameId === activeGameId) : null;
  const conf = slate.rosters?.dataConfidence || {};
  const weekLabel = slate.seasonType === 'pre' ? `Preseason Week ${slate.week}`
    : slate.seasonType === 'post' ? `Postseason Week ${slate.week}`
    : `Week ${slate.week}`;
  const isAt = activeNflTab === 'props' && activeNflProp === 'atd';

  // ---- header title + sub by tab ----
  let title = 'Slate';
  let sub = `${weekLabel} · ${slate.gameCount} games · tap a game for the field view and red-zone readout.`;
  if (activeNflTab === 'foryou') {
    title = 'For You';
    sub = `The shared, multisport community feed — picks, takes, and trash talk from across DingerWatch. Same page as MLB.`;
  } else if (activeNflTab === 'feed') {
    title = 'TD Feed';
    sub = `Live touchdowns the moment they cross. The feed lights up with every scoring play — rush, pass, and return TDs — once games go live.`;
  } else if (activeNflTab === 'props') {
    title = isAt ? 'Top 20 · Anytime TD' : NFL_PROPS[activeNflProp].label;
    sub = isAt
      ? `${weekLabel} · ${slate.gameCount} games · ranked by modeled probability of scoring a rushing or receiving touchdown.`
      : `${weekLabel} · best Over price across books · player-prop lines post 24–48 hours before kickoff.`;
  }

  // Position filters only make sense for the modeled Anytime-TD list.
  const toolbar = isAt
    ? `<div class="nfl-toolbar"><div class="nfl-filters" role="group" aria-label="Position filter">
        ${['ALL', 'RB', 'WR', 'TE', 'QB'].map(k => `<button type="button" class="nfl-filter ${posFilter === k ? 'active' : ''}" data-pos="${k}">${k}</button>`).join('')}
      </div>${activeGameId ? `<button type="button" class="nfl-clear" id="nflClearGame">← All ${slate.gameCount} games</button>` : ''}</div>`
    : (activeNflTab === 'slate' && g ? `<div class="nfl-toolbar"><button type="button" class="nfl-clear" id="nflClearGame">← All ${slate.gameCount} games</button></div>` : '');

  // ---- body by tab ----
  let body;
  const propSubtabs = activeNflTab === 'props' ? propSubtabsHTML() : '';
  if (activeNflTab === 'foryou') {
    // Shared community feed (renderForYou writes its compose box + post list
    // straight into this host). Kept out of the live-poll re-render path below
    // so typing in the compose box isn't clobbered every poll tick.
    body = `<div class="nfl-foryou-host" id="nflForYouHost"></div>`;
  } else if (activeNflTab === 'feed') {
    body = `<section class="nfl-feed-empty" role="status">
      <div class="nfl-feed-icon" aria-hidden="true">🏈</div>
      <h3>Touchdown feed is quiet</h3>
      <p>No NFL games are live right now. The feed lights up with every scoring play — rush, pass, and return TDs — the moment games kick off.</p>
      <p class="nfl-feed-when">Regular season opens Sept 9.</p>
    </section>`;
  } else if (activeNflTab === 'props' && !isAt) {
    body = `${propSubtabs}<div class="nfl-picklist-head"><h3>${NFL_PROPS[activeNflProp].label} — best Over prices</h3></div>
    <div class="nfl-picklist" id="nflPickList"></div>`;
  } else {
    // Slate tab, OR Player Props → Anytime TD: field gamecast (or game grid) + ATD pick list.
    body = `${g ? gamecastHTML(g) : '<div class="nfl-games" id="nflGames"></div>'}${isAt ? `${propSubtabs}<div class="nfl-picklist-head"><h3>${g ? `${esc(g.away.abbr)} @ ${esc(g.home.abbr)} — every graded player` : 'Top 20 across the slate'}</h3></div><div class="nfl-picklist" id="nflPickList"></div>` : ''}`;
  }

  root.innerHTML = `
${isPreview('nfl') ? `<div class="nfl-preview-banner" role="status">
  <b>Preview build</b> — Touchdown Watch is not live yet. The model runs on 2025 production
  blended with 2026 rosters and depth charts; numbers are directional and unvalidated against results.
</div>` : ''}

<header class="nfl-head">
  <div class="nfl-head-left">
    <h2 class="nfl-title">${title}</h2>
    <p class="nfl-sub">${esc(sub)}</p>
  </div>
  <div class="nfl-head-meta">
    <div class="nfl-freshness">Built ${esc(relTime(slate.generatedAt))}</div>
    <div class="nfl-datamix">
      <span title="Players with real 2025 production">${conf.full || 0} with history</span>
      <span title="2026 rookies — prior-based projections">${conf.rookie || 0} rookies</span>
      <span title="On a 2026 roster but no 2025 production">${conf['no-history'] || 0} no sample</span>
    </div>
  </div>
</header>

${toolbar}

${slate.seasonType === 'pre' ? `<div class="nfl-preseason-banner" role="status">
  <span class="nfl-preseason-icon" aria-hidden="true">!</span>
  <p><b>Preseason mode.</b> Starters rarely play the full game — and many don't play at all —
  so ATD probabilities here are projections of the regular-season role, not live reps.
  Expect sizable misses; treat the numbers as a directional preview, not a prediction.</p>
</div>` : ''}

${body}

<footer class="nfl-foot">
  Model: ${esc(slate.sources?.model || '')}<br/>
  Rosters &amp; depth charts: ${esc(slate.rosters?.source || '')}${slate.rosters?.depthSnapshot ? ` (snapshot ${esc(slate.rosters.depthSnapshot)})` : ''}.
  Schedule and injuries: ESPN. Player data: nflverse (CC-BY 4.0).<br/>
  First season for Touchdown Watch: probabilities are built from 2025 production blended with 2026
  rosters and depth charts, and have not yet been validated against 2026 results.<br/>
  Modeled projections for entertainment only — not betting advice.
</footer>`;

  if (activeNflTab === 'foryou') window.renderForYou?.(root.querySelector('#nflForYouHost'));
  if (activeNflTab === 'slate' && !g) renderGames(root.querySelector('#nflGames'));
  if (isAt) renderPicks(root.querySelector('#nflPickList'));
  if (activeNflTab === 'props' && !isAt) renderPropOdds(root.querySelector('#nflPickList'), activeNflProp);
  root.querySelectorAll('.nfl-subtab[data-nfl-prop]').forEach(b => {
    b.addEventListener('click', () => selectNflProp(b.dataset.nflProp));
  });
  root.querySelectorAll('.nfl-filter').forEach(b => b.addEventListener('click', () => {
    posFilter = b.dataset.pos; render();
  }));
  const clear = root.querySelector('#nflClearGame');
  if (clear) clear.addEventListener('click', () => { activeGameId = null; render(); });
}

let loading = false;
export async function mount() {
  const root = document.getElementById('nflView');
  if (!root) return;
  wireNflNav();          // wire the sidebar/bottom-nav buttons once (idempotent)
  if (slate) { render(); return; }
  if (loading) return;
  loading = true;
  root.innerHTML = `<div class="nfl-loading">
    ${Array.from({ length: 4 }, () => '<div class="nfl-skel"></div>').join('')}
  </div>`;
  try {
    const r = await fetch(CFG.slateUrl, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    slate = await r.json();
    if (!slate.games?.length) throw new Error('slate contains no games');
    // Player-prop odds sample (OpticOdds). Fail-soft: a missing file or no name
    // matches just means no odds chips render — the view still works.
    try {
      const or = await fetch(ODDS_URL, { cache: 'no-cache' });
      if (or.ok) oddsDoc = await or.json();
      mergeNflOdds(slate, oddsDoc);
    } catch { oddsDoc = null; }
    render();
    // Live score polling (ESPN scoreboard, CORS-enabled) keeps score/period/
    // clock/possession current so the win-probability tiles stay live.
    // Calls the targeted updateLiveDisplay(), NOT the full render() — every
    // poll tick used to tear down and rebuild the entire view (including
    // every game's SVG football field and the full, re-sorted player pick
    // list) roughly every 15 seconds during live play, which is exactly
    // when someone is most likely actively watching. updateLiveDisplay()
    // only touches the specific score/status/win-probability DOM regions
    // that could plausibly have changed, and does nothing at all when the
    // user isn't even on the Slate tab to see it.
    startLivePolling(slate, () => { updateLiveDisplay(); });
  } catch (e) {
    root.innerHTML = `<div class="nfl-error">
      <div class="nfl-error-title">Couldn't load the NFL slate</div>
      <div>Expected <code>${esc(CFG.slateUrl)}</code>. ${esc(e.message)}</div>
      <div class="nfl-error-hint">Build it with <code>node build-slate.js --sport nfl</code>.</div>
    </div>`;
  } finally {
    loading = false;
  }
}

window.DW_NFL = { mount, render };

// ---------------------------------------------------------------------------
// test-only exports — used exclusively by tests/nfl-live-update.test.js to
// exercise the REAL functions above directly, rather than a hand-copied
// mirror of their logic in the test file. __setTestState lets a test put
// this module's private slate/activeNflTab/activeGameId into a known
// configuration without going through mount()'s full fetch()-based
// initialization. Never called from production code.
// ---------------------------------------------------------------------------
export function __setTestState(next) {
  if ('slate' in next) slate = next.slate;
  if ('activeNflTab' in next) activeNflTab = next.activeNflTab;
  if ('activeGameId' in next) activeGameId = next.activeGameId;
}
export { updateLiveDisplay, wireGameCard, gameCard, gamecastHTML, pickCardHTML, nflGradeRingHTML, nflTeamColor };
