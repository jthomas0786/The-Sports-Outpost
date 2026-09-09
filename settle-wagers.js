/**
 * settle-wagers.js — settles supported TSO point-wager legs.
 * v81 supports:
 *   - MLB Home Run (existing behavior)
 *   - NFL Anytime TD
 *
 * Settlement remains idempotent: every leg/wager state transition uses a
 * conditional PATCH from status=pending before any points can be credited.
 */

const RAW_SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_URL = RAW_SUPABASE_URL ? RAW_SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '') : RAW_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if(!SUPABASE_URL || !SERVICE_KEY){
  console.error('[settle] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function sb(path, options = {}){
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if(!res.ok){
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase ${options.method || 'GET'} ${path} -> ${res.status}: ${body}`);
  }
  if(res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const mlbGameStateCache = new Map();
async function fetchMlbGameState(gamePk){
  if(mlbGameStateCache.has(gamePk)) return mlbGameStateCache.get(gamePk);
  const promise = (async () => {
    try{
      const res = await fetch(`https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`);
      if(!res.ok) return null;
      return await res.json();
    }catch(e){
      console.warn(`[settle] couldn't fetch MLB game ${gamePk}:`, e.message);
      return null;
    }
  })();
  mlbGameStateCache.set(gamePk, promise);
  return promise;
}

let nflBoardPromise = null;
async function fetchNflBoard(){
  if(nflBoardPromise) return nflBoardPromise;
  nflBoardPromise = (async () => {
    try{
      const res = await fetch(`${SUPABASE_URL}/functions/v1/nfl-live`, {headers:{accept:'application/json'}});
      if(!res.ok) return null;
      return await res.json();
    }catch(e){
      console.warn('[settle] couldn\'t fetch NFL live board:', e.message);
      return null;
    }
  })();
  return nflBoardPromise;
}

function mlbPlayerResult(data, playerId){
  const status = data?.gameData?.status;
  const abstractState = status?.abstractGameState || null;
  const detailedState = status?.detailedState || null;
  const teams = data?.liveData?.boxscore?.teams;
  const sides = [teams?.away, teams?.home].filter(Boolean);
  let hr = 0, appeared = false, found = false;
  for(const side of sides){
    const p = side?.players?.['ID' + playerId];
    const batting = p?.stats?.batting;
    if(p){
      found = true;
      if(batting?.atBats != null){
        appeared = true;
        hr = Math.max(hr, Number(batting.homeRuns ?? 0) || 0);
      }
    }
  }
  return { abstractState, detailedState, hr, appeared, playerFound: found };
}

function decideMlbHr(leg, feedData){
  if(!feedData) return null;
  const r = mlbPlayerResult(feedData, leg.player_id);
  if(r.hr >= 1) return { status:'won', reason:`hit ${r.hr} HR` };
  if(/postponed|cancelled/i.test(r.detailedState || '')) return { status:'void', reason:`game ${String(r.detailedState).toLowerCase()}` };
  if(r.abstractState === 'Final'){
    if(!r.playerFound || !r.appeared) return { status:'void', reason:'player did not appear in the box score' };
    return { status:'lost', reason:'no HR, game final' };
  }
  return null;
}

const normName = s => String(s || '').toLowerCase().replace(/\./g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const statNum = v => {
  if(v == null || v === '') return 0;
  const n = Number(String(v).split('-')[0]);
  return Number.isFinite(n) ? n : 0;
};
function nflPlayerTdCount(game, playerId){
  const row = game?.playerStats?.byId?.[String(playerId)] || null;
  const flat = row?.flat || {};
  return { row, tds: statNum(flat.rushTds) + statNum(flat.recTds) };
}
function scoringTextShowsPlayer(game, playerName){
  const needle = normName(playerName);
  if(!needle || needle.length < 4) return false;
  return (game?.scoringPlays || []).some(p => /touchdown|\btd\b/i.test(String(p?.text || p?.type || '')) && normName(p?.text).includes(needle));
}
function decideNflAtd(leg, game){
  if(!game) return null;
  const detail = String(game.statusDetail || '');
  if(/postponed|cancelled/i.test(detail)) return { status:'void', reason:`game ${detail.toLowerCase()}` };

  const stat = nflPlayerTdCount(game, leg.player_id);
  if(stat.tds >= 1 || scoringTextShowsPlayer(game, leg.player_name)){
    return { status:'won', reason:'scored a touchdown' };
  }

  if(game.status === 'post'){
    // If ESPN never listed the player in any stat category, we cannot prove he
    // participated. Void instead of grading a potentially inactive player as a loss.
    if(!stat.row) return { status:'void', reason:'player did not appear in ESPN player stats' };
    return { status:'lost', reason:'no touchdown, game final' };
  }
  return null;
}

function legKind(leg){
  const sport = String(leg?.sport || 'mlb').toLowerCase();
  const market = String(leg?.market || (sport === 'nfl' ? 'ATD' : 'HR')).toUpperCase();
  if(sport === 'nfl' && /^(ATD|ANYTIME TD|ANYTIME TOUCHDOWN|ATD_0\.5\+)$/.test(market)) return 'nfl_atd';
  if(sport === 'mlb' && /^(HR|HOME RUN|HR_0\.5\+)$/.test(market)) return 'mlb_hr';
  return 'unsupported';
}

async function creditPoints(userId, amount, wagerId, type, note){
  const [existing] = await sb(`/point_balances?user_id=eq.${userId}&select=balance`) || [];
  if(existing){
    await sb(`/point_balances?user_id=eq.${userId}`, {
      method:'PATCH',
      body:JSON.stringify({ balance: existing.balance + amount, updated_at:new Date().toISOString() }),
    });
  }else{
    await sb('/point_balances', {
      method:'POST',
      body:JSON.stringify({ user_id:userId, balance:amount, updated_at:new Date().toISOString() }),
    });
  }
  await sb('/point_transactions', {
    method:'POST',
    body:JSON.stringify({ user_id:userId, type, amount, wager_id:wagerId, note }),
  });
}

async function trySettleWager(wagerId){
  const legs = await sb(`/wager_legs?wager_id=eq.${wagerId}&select=status`);
  if(!legs.length || legs.some(l => l.status === 'pending')) return;

  const anyVoid = legs.some(l => l.status === 'void');
  const allWon = legs.every(l => l.status === 'won');
  const finalStatus = anyVoid ? 'void' : allWon ? 'won' : 'lost';

  const updated = await sb(`/wagers?id=eq.${wagerId}&status=eq.pending`, {
    method:'PATCH',
    headers:{ Prefer:'return=representation' },
    body:JSON.stringify({ status:finalStatus, settled_at:new Date().toISOString() }),
  });
  const wager = updated?.[0];
  if(!wager) return;

  if(finalStatus === 'won'){
    await creditPoints(wager.user_id, wager.potential_payout, wager.id, 'wager_won', 'wager settled — won');
    console.log(`[settle] wager ${wagerId} WON — credited ${wager.potential_payout} pts`);
  }else if(finalStatus === 'void'){
    await creditPoints(wager.user_id, wager.stake, wager.id, 'wager_refunded', 'wager voided — stake refunded');
    console.log(`[settle] wager ${wagerId} VOID — refunded ${wager.stake} pts`);
  }else{
    console.log(`[settle] wager ${wagerId} LOST — no payout`);
  }
}

async function main(){
  const pendingLegs = await sb('/wager_legs?status=eq.pending&select=*');
  if(!pendingLegs.length){
    console.log('[settle] no pending legs — nothing to do');
    return;
  }
  console.log(`[settle] ${pendingLegs.length} pending leg(s)`);

  const needNfl = pendingLegs.some(l => legKind(l) === 'nfl_atd');
  const nflBoard = needNfl ? await fetchNflBoard() : null;
  if(needNfl && !nflBoard) console.warn('[settle] NFL board unavailable; NFL legs will remain pending this run');

  const affectedWagerIds = new Set();
  for(const leg of pendingLegs){
    const kind = legKind(leg);
    let decision = null;
    if(kind === 'mlb_hr'){
      const feedData = await fetchMlbGameState(leg.game_pk);
      decision = decideMlbHr(leg, feedData);
    }else if(kind === 'nfl_atd'){
      decision = decideNflAtd(leg, nflBoard?.games?.[String(leg.game_pk)] || null);
    }else{
      console.warn(`[settle] unsupported pending leg ${leg.id}: ${leg.sport || 'mlb'} ${leg.market}`);
      continue;
    }
    if(!decision) continue;

    const updated = await sb(`/wager_legs?id=eq.${leg.id}&status=eq.pending`, {
      method:'PATCH',
      headers:{ Prefer:'return=representation' },
      body:JSON.stringify({ status:decision.status, resolved_reason:decision.reason, settled_at:new Date().toISOString() }),
    });
    if(updated?.[0]){
      console.log(`[settle] leg ${leg.id} (${leg.player_name}) -> ${decision.status}: ${decision.reason}`);
      affectedWagerIds.add(leg.wager_id);
    }
  }

  for(const wagerId of affectedWagerIds) await trySettleWager(wagerId);
  console.log(`[settle] done — ${affectedWagerIds.size} wager(s) touched this run`);
}

main().catch(e => {
  console.error('[settle] run failed:', e);
  process.exit(1);
});
