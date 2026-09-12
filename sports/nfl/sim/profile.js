import { clamp, finite, normName, normTeam, round } from './utils.js';

const SKILL = new Set(['QB','RB','HB','FB','WR','TE']);
const posGroup = p => {
  p = String(p || '').toUpperCase();
  if (p === 'HB' || p === 'FB') return 'RB';
  return p;
};
const stat = (obj, key) => finite(obj?.[key], null);

function weighted(values) {
  let num = 0, den = 0;
  for (const {v,w} of values) {
    if (!Number.isFinite(v) || w <= 0) continue;
    num += v * w; den += w;
  }
  return den > 0 ? num / den : null;
}

function depthFactor(player, config) {
  const p = posGroup(player.position);
  const ladder = config.depthRole?.[p] || [1];
  const rank = Math.max(1, Math.round(finite(player.depth?.rank, finite(player.depthRank, 1))));
  return finite(ladder[Math.min(rank, ladder.length) - 1], ladder.at(-1) || 1);
}

function injuryFactor(player) {
  const s = String(player.injury?.status || player.rosterStatus || player.model?.availability?.status || '').toLowerCase();
  if (/out|injured reserve|\bir\b|suspend|inactive/.test(s)) return 0;
  if (/doubtful/.test(s)) return 0.25;
  if (/questionable/.test(s)) return 0.85;
  return 1;
}

function fallbackStat(player, key, config) {
  const p = posGroup(player.position);
  const base = config.fallback?.[p] || {};
  const role = depthFactor(player, config);
  const raw = finite(base[key], 0) * role;
  return raw;
}

function blendPlayerStat(player, key, config) {
  const b = config.blend || {};
  const curr = stat(player.currentSeason?.perGame, key);
  const last = stat(player.last5?.avg, key);
  const prev = stat(player.previousSeason?.perGame, key);
  let value;
  if (Number.isFinite(curr)) {
    value = weighted([
      {v:curr,w:b.currentSeason ?? .5},
      {v:last,w:b.last5 ?? .3},
      {v:prev,w:b.previousSeason ?? .2},
    ]);
  } else {
    value = weighted([
      {v:last,w:b.noCurrentLast5 ?? .45},
      {v:prev,w:b.noCurrentPrevious ?? .55},
    ]);
  }
  if (!Number.isFinite(value) || value <= 0) value = fallbackStat(player, key, config);

  // Snap trend nudges usage stats only. 100% snaps should not double a WR's target mean;
  // this is deliberately a small calibration layer rather than the projection itself.
  if (['attempts','completions','carries','targets','receptions','passYds','rushYds','recYds'].includes(key)) {
    const snap = finite(player.snapTrend?.avgOffensePct, null);
    if (Number.isFinite(snap) && snap > 0) {
      const p = posGroup(player.position);
      const expected = {QB:92,RB:56,WR:70,TE:68}[p] || 60;
      const rawFactor = 1 + ((snap - expected) / 100) * (config.blend?.snapTrendWeight ?? .18) * 2;
      value *= clamp(rawFactor, config.clamps.snapFactorMin, config.clamps.snapFactorMax);
    }
  }
  return Math.max(0, value || 0);
}

function matchupFactor(player, key, config) {
  const allowed = player.matchup?.previousSeasonAllowed?.perGame || {};
  let actual = null, baseline = null;
  const p = posGroup(player.position);
  if (key === 'passYds' && p === 'QB') { actual = finite(allowed.passYds); baseline = 230; }
  else if (key === 'rushYds' && p === 'RB') { actual = finite(allowed.rushYds); baseline = 95; }
  else if (key === 'recYds' && (p === 'WR' || p === 'TE' || p === 'RB')) {
    actual = finite(allowed.recYds);
    baseline = p === 'WR' ? 155 : p === 'TE' ? 55 : 45;
  }
  if (!Number.isFinite(actual) || !Number.isFinite(baseline) || baseline <= 0) return 1;
  const raw = actual / baseline;
  const w = config.blend?.matchupWeight ?? .20;
  return clamp(1 + (raw - 1) * w, config.clamps.matchupFactorMin, config.clamps.matchupFactorMax);
}

function buildPlayer(player, config) {
  const position = posGroup(player.position);
  const base = {};
  for (const key of ['attempts','completions','passYds','passTds','carries','rushYds','rushTds','targets','receptions','recYds','recTds']) {
    base[key] = blendPlayerStat(player, key, config) * matchupFactor(player, key, config);
  }
  const attempts = Math.max(0.1, base.attempts || 0.1);
  const targets = Math.max(0.1, base.targets || 0.1);
  const carries = Math.max(0.1, base.carries || 0.1);
  const completions = Math.min(attempts, base.completions || attempts * .64);
  const receptions = Math.min(targets, base.receptions || targets * .64);
  return {
    key: String(player.gsisId || player.espnId || `${normTeam(player.team)}:${normName(player.name)}`),
    espnId: player.espnId ? String(player.espnId) : null,
    gsisId: player.gsisId ? String(player.gsisId) : null,
    name: player.name,
    team: normTeam(player.team),
    opponent: normTeam(player.opponent),
    position,
    depthRank: finite(player.depth?.rank, finite(player.depthRank, null)),
    availabilityFactor: injuryFactor(player),
    atdProbability: finite(player.model?.atdProbability, finite(player.props?.atd?.probability, null)),
    rzTargets: finite(player.model?.rzTargets, finite(player.stats?.rzTargets, 0)),
    rzCarries: finite(player.model?.rzCarries, finite(player.stats?.rzCarries, 0)),
    base: {
      ...base,
      completionRate: clamp(completions / attempts, config.clamps.completionRateMin, config.clamps.completionRateMax),
      catchRate: clamp(receptions / targets, config.clamps.catchRateMin, config.clamps.catchRateMax),
      yardsPerAttempt: clamp((base.passYds || 0) / attempts || 7.0, config.clamps.yardsPerAttemptMin, config.clamps.yardsPerAttemptMax),
      yardsPerCarry: clamp((base.rushYds || 0) / carries || 4.2, config.clamps.yardsPerCarryMin, config.clamps.yardsPerCarryMax),
      yardsPerReception: Math.max(4, (base.recYds || 0) / Math.max(.5, receptions) || 10),
    },
    source: player,
  };
}

function indexResearch(research) {
  const byGame = new Map(), byTeam = new Map();
  for (const p of research?.players || []) {
    if (!SKILL.has(String(p.position || '').toUpperCase())) continue;
    if (p.gameId) {
      const k = String(p.gameId); if (!byGame.has(k)) byGame.set(k, []); byGame.get(k).push(p);
    }
    const t = normTeam(p.team); if (!byTeam.has(t)) byTeam.set(t, []); byTeam.get(t).push(p);
  }
  return {byGame, byTeam};
}

export function buildOddsIndex(odds) {
  const byGame = new Map(), byPair = new Map();
  for (const g of odds?.games || []) {
    if (g.gameId) byGame.set(String(g.gameId), g);
    const a = normTeam(g.away), h = normTeam(g.home);
    if (a && h) byPair.set([a,h].sort().join('|'), g);
  }
  return {byGame, byPair};
}

function findOddsGame(game, idx) {
  if (!idx) return null;
  const direct = idx.byGame.get(String(game.gameId || game.id));
  if (direct) return direct;
  return idx.byPair.get([normTeam(game.away?.abbr), normTeam(game.home?.abbr)].sort().join('|')) || null;
}

function marketAnchor(game, oddsGame, config) {
  const total = finite(oddsGame?.gameLines?.total?.line, config.league.defaultTotal);
  const homeSpread = finite(oddsGame?.gameLines?.spread?.line, null);
  let margin = Number.isFinite(homeSpread) ? -homeSpread : config.league.homeFieldPoints;
  if (!Number.isFinite(margin)) margin = config.league.homeFieldPoints;
  return {
    total,
    homeSpread,
    homeExpected: Math.max(3, (total + margin) / 2),
    awayExpected: Math.max(3, (total - margin) / 2),
  };
}

function livePlayerIndex(liveGame) {
  const byId = new Map(), byName = new Map();
  const p = liveGame?.playerStats || {};
  for (const [id, row] of Object.entries(p.byId || {})) byId.set(String(id), row);
  for (const row of Object.values(p.byId || {})) if (row?.name) byName.set(`${normTeam(row.team)}|${normName(row.name)}`, row);
  for (const [k, row] of Object.entries(p.byName || {})) {
    const split = k.indexOf('|');
    const team = split >= 0 ? normTeam(k.slice(0, split)) : normTeam(row?.team);
    const name = split >= 0 ? normName(k.slice(split + 1)) : normName(row?.name);
    if (name) byName.set(`${team}|${name}`, row);
  }
  return {byId, byName};
}

function parseCompAtt(v) {
  const m = String(v ?? '').match(/(\d+)\s*\/\s*(\d+)/);
  return m ? {completions:Number(m[1]), attempts:Number(m[2])} : {};
}

function currentStatsFor(player, idx) {
  const row = (player.espnId && idx.byId.get(String(player.espnId))) || idx.byName.get(`${player.team}|${normName(player.name)}`) || null;
  const flat = row?.flat || {};
  const ca = parseCompAtt(flat.compAtt);
  const n = (v) => finite(String(v ?? '').replace(/,/g,''), 0);
  return {
    passYds:n(flat.passYds), completions:n(ca.completions), attempts:n(ca.attempts), passTds:n(flat.passTds), interceptions:n(flat.interceptions),
    rushYds:n(flat.rushYds), carries:n(flat.carries), rushTds:n(flat.rushTds),
    recYds:n(flat.recYds), receptions:n(flat.receptions), targets:n(flat.targets), recTds:n(flat.recTds),
  };
}

export function remainingFraction(liveGame) {
  if (!liveGame || liveGame.status === 'pre') return 1;
  if (liveGame.status === 'post') return 0;
  const period = Math.max(1, Math.round(finite(liveGame.period, 1)));
  const clock = clamp(finite(liveGame.clockMin, 15), 0, 15);
  if (period <= 4) {
    const elapsed = (period - 1) * 15 + (15 - clock);
    return clamp((60 - elapsed) / 60, 0, 1);
  }
  // Overtime is intentionally treated as a short residual state. NFL OT format can
  // change independently of the core prop engine; this prevents negative fractions.
  return liveGame.status === 'in' ? 0.08 : 0;
}

function teamProfile(abbr, players, anchorPoints, config) {
  const teamPlayers = players.filter(p => p.team === abbr && p.availabilityFactor > 0);
  const qbs = teamPlayers.filter(p => p.position === 'QB').sort((a,b)=>(a.depthRank??99)-(b.depthRank??99) || b.base.attempts-a.base.attempts);
  const qb = qbs[0] || null;
  const rushers = teamPlayers.filter(p => ['RB','QB','WR','TE'].includes(p.position));
  const receivers = teamPlayers.filter(p => ['WR','TE','RB'].includes(p.position));
  const passAttempts = qb?.base.attempts || 33;
  const rushAttempts = rushers.reduce((s,p)=>s+p.base.carries*p.availabilityFactor,0) || 27;
  const passRate = clamp(passAttempts / Math.max(1, passAttempts + rushAttempts), config.clamps.passRateMin, config.clamps.passRateMax);
  const passTd = Math.max(.1, qb?.base.passTds || receivers.reduce((s,p)=>s+p.base.recTds,0));
  const rushTd = Math.max(.1, rushers.reduce((s,p)=>s+p.base.rushTds,0));
  return {
    abbr, players:teamPlayers, qb, qbs, rushers, receivers,
    basePassRate:passRate,
    passTdShare:clamp(passTd/(passTd+rushTd), .35, .78),
    expectedPoints:anchorPoints,
    playsPerGame:finite(config.league?.playsPerTeamByTeam?.[abbr], config.league.playsPerTeam),
  };
}

export function buildGameProfile({game, research, odds, liveGame = null, config}) {
  const researchIdx = indexResearch(research);
  let rawPlayers = researchIdx.byGame.get(String(game.gameId || game.id)) || [];
  if (!rawPlayers.length) {
    rawPlayers = [
      ...(researchIdx.byTeam.get(normTeam(game.away?.abbr)) || []),
      ...(researchIdx.byTeam.get(normTeam(game.home?.abbr)) || []),
    ];
  }
  // Fall back to slate players if the research builder has not run yet.
  if (!rawPlayers.length) rawPlayers = game.players || [];
  const players = rawPlayers.filter(p=>SKILL.has(String(p.position||'').toUpperCase())).map(p=>buildPlayer(p, config));
  const oddsIdx = buildOddsIndex(odds);
  const oddsGame = findOddsGame(game, oddsIdx);
  const anchor = marketAnchor(game, oddsGame, config);
  const awayAbbr = normTeam(game.away?.abbr), homeAbbr = normTeam(game.home?.abbr);
  const liveIdx = livePlayerIndex(liveGame);
  for (const p of players) p.current = currentStatsFor(p, liveIdx);
  const rem = remainingFraction(liveGame);
  return {
    gameId:String(game.gameId || game.id),
    startTimeUTC:game.startTimeUTC || null,
    away:{abbr:awayAbbr,name:game.away?.name||awayAbbr},
    home:{abbr:homeAbbr,name:game.home?.name||homeAbbr},
    players,
    oddsGame,
    anchor,
    live:liveGame,
    remainingFraction:rem,
    currentScore:{away:finite(liveGame?.awayScore, finite(game.away?.score,0))||0,home:finite(liveGame?.homeScore,finite(game.home?.score,0))||0},
    awayTeam:teamProfile(awayAbbr, players, anchor.awayExpected, config),
    homeTeam:teamProfile(homeAbbr, players, anchor.homeExpected, config),
    diagnostics:{playerCount:players.length,researchPlayers:rawPlayers.length,oddsAvailable:!!oddsGame,liveState:liveGame?.status||'pre'},
  };
}

export function playerMarketLines(profile) {
  const out = new Map();
  for (const p of profile.oddsGame?.players || []) {
    const key = `${normTeam(p.team)}|${normName(p.name)}`;
    out.set(key, p.odds || {});
  }
  return out;
}

export function profileSummary(profile) {
  return {
    gameId:profile.gameId,away:profile.away,home:profile.home,
    anchor:profile.anchor,currentScore:profile.currentScore,remainingFraction:round(profile.remainingFraction,4),
    liveStatus:profile.live?.status||'pre',diagnostics:profile.diagnostics,
  };
}
