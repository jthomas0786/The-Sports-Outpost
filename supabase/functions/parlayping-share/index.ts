// Authenticated The Sports Outpost -> ParlayPing shared-betslip proxy.
// The browser never receives the private ParlayPing API key.
//
// Required secret:
//   PARLAYPING_API_KEY=pp_live_...
// Optional:
//   PARLAYPING_API_BASE_URL=https://parlayping.net
//   PARLAYPING_ALLOWED_ORIGINS=https://thesportsoutpost.com,https://www.thesportsoutpost.com

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const PARLAYPING_API_KEY = Deno.env.get('PARLAYPING_API_KEY') ?? '';
const PARLAYPING_API_BASE_URL = (Deno.env.get('PARLAYPING_API_BASE_URL') ?? 'https://parlayping.net').replace(/\/+$/, '');
const ALLOWED_ORIGINS = new Set(
  (Deno.env.get('PARLAYPING_ALLOWED_ORIGINS') ?? 'https://thesportsoutpost.com,https://www.thesportsoutpost.com')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);

const MAX_LEGS = 25;
const MAX_BODY_BYTES = 128 * 1024;
const UPSTREAM_TIMEOUT_MS = 15_000;

function cors(origin: string | null) {
  const allowed = !origin || ALLOWED_ORIGINS.has(origin);
  return {
    allowed,
    headers: {
      ...(origin && allowed ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  };
}

function json(body: unknown, status: number, origin: string | null, extraHeaders: Record<string, string> = {}) {
  const policy = cors(origin);
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...policy.headers,
      ...extraHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

const cleanString = (value: unknown, max = 160) => {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, max) : undefined;
};
const cleanNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};
const cleanProbability = (value: unknown) => {
  const n = cleanNumber(value);
  if (n === undefined) return undefined;
  const normalized = n > 1 && n <= 100 ? n / 100 : n;
  return normalized >= 0 && normalized <= 1 ? normalized : undefined;
};
const cleanUrl = (value: unknown) => {
  const text = cleanString(value, 1200);
  if (!text) return undefined;
  try {
    const url = new URL(text);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};

function sanitizeLeg(raw: Record<string, unknown>, index: number) {
  const player = cleanString(raw.player ?? raw.player_name ?? raw.name, 120);
  const market = cleanString(raw.market ?? raw.prop_key ?? raw.prop, 100);
  if (!player || !market) throw new Error(`Leg ${index + 1} is missing player or market.`);

  const leg: Record<string, unknown> = {
    id: cleanString(raw.id, 120) ?? `leg-${index + 1}`,
    sport: (cleanString(raw.sport, 40) ?? 'NFL').toUpperCase(),
    player,
    market,
    side: (cleanString(raw.side, 20) ?? 'over').toLowerCase(),
    status: 'PENDING',
  };

  const strings: Array<[string, unknown, number]> = [
    ['playerId', raw.playerId ?? raw.player_id ?? raw.espnId, 120],
    ['team', raw.team, 40],
    ['gameId', raw.gameId ?? raw.event_id ?? raw.eventId ?? raw.game_pk ?? raw.gamePk, 160],
    ['matchup', raw.matchup ?? raw.game, 180],
    ['displayMarket', raw.displayMarket, 180],
    ['sportsbook', raw.sportsbook ?? raw.book, 80],
    ['startTimeUTC', raw.startTimeUTC ?? raw.kickoff, 80],
  ];
  for (const [key, value, max] of strings) {
    const clean = cleanString(value, max);
    if (clean) leg[key] = clean;
  }

  const line = cleanNumber(raw.line);
  if (line !== undefined) leg.line = line;
  const odds = cleanNumber(raw.oddsAmerican ?? raw.price ?? raw.odds);
  if (odds !== undefined) leg.oddsAmerican = odds;
  const pregame = cleanProbability(raw.pregameProbability ?? raw.probability ?? raw.pct);
  if (pregame !== undefined) leg.pregameProbability = pregame;
  if (raw.inclusive === true) leg.inclusive = true;

  const playerImageUrl = cleanUrl(raw.playerImageUrl ?? raw.headshotUrl ?? raw.headshot_url ?? raw.headshot ?? raw.photoUrl ?? raw.imageUrl);
  if (playerImageUrl) leg.playerImageUrl = playerImageUrl;
  const teamLogoUrl = cleanUrl(raw.teamLogoUrl ?? raw.team_logo_url ?? raw.teamLogo);
  if (teamLogoUrl) leg.teamLogoUrl = teamLogoUrl;
  const sportsbookLink = cleanUrl(raw.sportsbookLink ?? raw.link ?? raw.deepLink ?? raw.deeplink);
  if (sportsbookLink) leg.sportsbookLink = sportsbookLink;

  return leg;
}

function sanitizePayload(raw: Record<string, unknown>) {
  const source = raw.slip && typeof raw.slip === 'object' && !Array.isArray(raw.slip)
    ? raw.slip as Record<string, unknown>
    : raw;
  const rawLegs = Array.isArray(source.legs) ? source.legs : [];
  if (!rawLegs.length) throw new Error('legs[] is required.');
  if (rawLegs.length > MAX_LEGS) throw new Error(`Maximum ${MAX_LEGS} legs per shared betslip.`);

  const slip: Record<string, unknown> = {
    source: 'The Sports Outpost',
    legs: rawLegs.map((item, index) => sanitizeLeg((item && typeof item === 'object' ? item : {}) as Record<string, unknown>, index)),
  };

  const sportsbook = cleanString(source.sportsbook, 80);
  if (sportsbook) slip.sportsbook = sportsbook;
  const combinedOdds = cleanNumber(source.combinedOddsAmerican);
  if (combinedOdds !== undefined && source.combinedOddsVerified === true) {
    slip.combinedOddsAmerican = combinedOdds;
    slip.combinedOddsVerified = true;
  }
  const sourceReference = cleanString(source.sourceReference, 180);
  if (sourceReference) slip.sourceReference = sourceReference;

  return { slip };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const policy = cors(origin);

  if (req.method === 'OPTIONS') {
    if (!policy.allowed) return new Response(null, { status: 403 });
    return new Response('ok', { headers: policy.headers });
  }
  if (!policy.allowed) return json({ ok: false, error: 'Origin not allowed.' }, 403, origin);
  if (req.method !== 'POST') return json({ ok: false, error: 'Use POST.' }, 405, origin);
  if (!SUPABASE_URL || !SERVICE_ROLE || !PARLAYPING_API_KEY) {
    return json({ ok: false, error: 'ParlayPing sharing is not configured.' }, 503, origin);
  }

  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ ok: false, error: 'Request body too large.' }, 413, origin);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ ok: false, error: 'Sign in to create a ParlayPing share card.' }, 401, origin);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    return json({ ok: false, error: 'Sign in to create a ParlayPing share card.' }, 401, origin);
  }

  let raw: Record<string, unknown>;
  try {
    const text = await req.text();
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
      return json({ ok: false, error: 'Request body too large.' }, 413, origin);
    }
    raw = text ? JSON.parse(text) : {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid JSON body.');
  } catch {
    return json({ ok: false, error: 'Invalid JSON body.' }, 400, origin);
  }

  let payload: Record<string, unknown>;
  try {
    payload = sanitizePayload(raw);
  } catch (error) {
    return json({ ok: false, error: (error as Error).message }, 400, origin);
  }

  const incomingRequestId = (req.headers.get('x-request-id') ?? '').trim();
  const requestId = (incomingRequestId || `tso-share-${crypto.randomUUID()}`).slice(0, 120);

  let upstream: Response;
  try {
    upstream = await fetch(`${PARLAYPING_API_BASE_URL}/api/v1/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': PARLAYPING_API_KEY,
        'X-Request-Id': requestId,
        'X-ParlayPing-Client': 'the-sports-outpost',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    const timeout = error instanceof DOMException && error.name === 'TimeoutError';
    return json(
      { ok: false, error: timeout ? 'ParlayPing timed out.' : 'ParlayPing is temporarily unavailable.', requestId },
      timeout ? 504 : 502,
      origin,
      { 'X-ParlayPing-Request-Id': requestId },
    );
  }

  const text = await upstream.text();
  let body: unknown = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { ok: false, error: upstream.ok ? 'Invalid ParlayPing response.' : 'ParlayPing request failed.' };
  }

  const upstreamRequestId = upstream.headers.get('x-request-id') || requestId;
  return json(body, upstream.status, origin, { 'X-ParlayPing-Request-Id': upstreamRequestId });
});
