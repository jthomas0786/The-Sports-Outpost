// v83 — validates MLB Home Run and NFL Anytime TD point wagers at placement time.
// Preserves the wager preview's correlation_adjustment when forwarding to place_wager().
// Fail closed: if a leg's live state cannot be verified right now, no wager is placed.
// Uses Deno.serve so deployment has no remote stdlib dependency.

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normMarket(x: unknown) {
  const s = String(x ?? '').trim().toUpperCase();
  if (['HR','HOME RUN','HR_0.5+'].includes(s)) return 'HR';
  if (['ATD','ANYTIME TD','ANYTIME TOUCHDOWN','ATD_0.5+'].includes(s)) return 'ATD';
  return s;
}
function legSport(leg: any) {
  const explicit = String(leg?.sport ?? '').trim().toLowerCase();
  if (explicit) return explicit;
  return normMarket(leg?.market) === 'ATD' ? 'nfl' : 'mlb';
}

function mlbPlayerResult(data: any, playerId: number) {
  const status = data?.gameData?.status;
  const abstractState: string | null = status?.abstractGameState || null;
  const detailedState: string | null = status?.detailedState || null;
  const teams = data?.liveData?.boxscore?.teams;
  const sides = [teams?.away, teams?.home].filter(Boolean);
  let hr = 0;
  let appeared = false;
  let found = false;
  for (const side of sides) {
    const p = side?.players?.['ID' + playerId];
    const batting = p?.stats?.batting;
    if (p) {
      found = true;
      if (batting?.atBats != null) {
        appeared = true;
        hr = Math.max(hr, Number(batting.homeRuns ?? 0) || 0);
      }
    }
  }
  return { abstractState, detailedState, hr, appeared, found };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'POST only' }, 405);

  let body: { stake?: number; legs?: any[]; correlation_adjustment?: number };
  try { body = await req.json(); }
  catch { return jsonResponse({ error: 'invalid request body' }, 400); }

  const { stake, legs, correlation_adjustment = 1 } = body;
  if (!Array.isArray(legs) || !legs.length) return jsonResponse({ error: 'at least one leg is required' }, 400);
  if (!Number.isFinite(Number(stake)) || Number(stake) <= 0) return jsonResponse({ error: 'stake must be positive' }, 400);

  const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') || '').replace(/\/+$/, '');
  const ANON = Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (!SUPABASE_URL || !ANON) return jsonResponse({ error: 'wager service is not configured' }, 503);

  const mlbCache = new Map<number, Promise<any>>();
  const fetchMlb = (gamePk: number) => {
    if (!mlbCache.has(gamePk)) {
      mlbCache.set(gamePk, fetch(`https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`, {
        headers: { accept: 'application/json' },
      }).then(r => r.ok ? r.json() : null).catch(() => null));
    }
    return mlbCache.get(gamePk)!;
  };

  let nflBoardPromise: Promise<any> | null = null;
  const fetchNflBoard = () => {
    if (!nflBoardPromise) {
      nflBoardPromise = fetch(`${SUPABASE_URL}/functions/v1/nfl-live`, {
        headers: { accept: 'application/json' },
      }).then(r => r.ok ? r.json() : null).catch(() => null);
    }
    return nflBoardPromise;
  };

  for (const leg of legs) {
    const sport = legSport(leg);
    const market = normMarket(leg?.market || leg?.prop_key);
    const gamePk = Number(leg?.game_pk);
    const playerId = Number(leg?.player_id);
    const playerName = String(leg?.player_name || leg?.player || 'That player');

    if (!gamePk || !playerId) return jsonResponse({ error: 'each leg needs a real game and player' }, 400);

    if (sport === 'mlb' && market === 'HR') {
      const feed = await fetchMlb(gamePk);
      if (!feed) return jsonResponse({ error: `Couldn't verify ${playerName}'s current game state — try again in a moment.` }, 503);
      const r = mlbPlayerResult(feed, playerId);
      if (r.hr >= 1) return jsonResponse({ error: `${playerName} has already homered — this pick is no longer wagerable.` }, 409);
      if (/postponed|cancelled/i.test(r.detailedState || '')) return jsonResponse({ error: `${playerName}'s game is ${String(r.detailedState).toLowerCase()} — this pick is not wagerable.` }, 409);
      if (r.abstractState === 'Final') return jsonResponse({ error: `${playerName}'s game is already over — this pick is no longer wagerable.` }, 409);
      continue;
    }

    if (sport === 'nfl' && market === 'ATD') {
      const board = await fetchNflBoard();
      const g = board?.games?.[String(gamePk)];
      if (!g) return jsonResponse({ error: `Couldn't verify ${playerName}'s NFL game state — try again in a moment.` }, 503);
      const detail = String(g.statusDetail || '');
      if (/postponed|cancelled/i.test(detail)) return jsonResponse({ error: `${playerName}'s game is ${detail.toLowerCase()} — this pick is not wagerable.` }, 409);
      // ATD point wagers close at kickoff. This is intentionally stricter than
      // waiting for a TD to occur and eliminates the post-score wager window.
      if (g.status !== 'pre') return jsonResponse({ error: `${playerName}'s game has already started — ATD wagering is closed.` }, 409);
      continue;
    }

    return jsonResponse({ error: `Unsupported wager market: ${sport.toUpperCase()} ${market || 'unknown'}` }, 400);
  }

  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader) return jsonResponse({ error: 'not signed in' }, 401);

  const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/place_wager`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ stake_amount: Number(stake), legs_json: legs, correlation_adjustment }),
  });
  const text = await rpc.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!rpc.ok) {
    const msg = data?.message || data?.error || (typeof data === 'string' ? data : `HTTP ${rpc.status}`);
    return jsonResponse({ error: msg }, 400);
  }

  return jsonResponse({ wager_id: data });
});
