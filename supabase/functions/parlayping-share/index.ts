// Sports Outpost -> ParlayPing generated betslip handoff.
// The browser never receives the private ParlayPing API key.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const PARLAYPING_API_KEY = Deno.env.get('PARLAYPING_API_KEY') ?? '';
const PARLAYPING_API_BASE_URL = (Deno.env.get('PARLAYPING_API_BASE_URL') ?? 'https://parlayping.net').replace(/\/+$/, '');
const ALLOWED_ORIGINS = new Set(
  (Deno.env.get('PARLAYPING_ALLOWED_ORIGINS') ?? 'https://thesportsoutpost.com,https://www.thesportsoutpost.com')
    .split(',').map(v => v.trim().replace(/\/$/, '')).filter(Boolean),
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

function json(body: unknown, status: number, origin: string | null, extra: Record<string,string> = {}) {
  const policy = cors(origin);
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...policy.headers, ...extra, 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' },
  });
}

function text(value: unknown, max = 240) {
  const out = String(value ?? '').replace(/\s+/g,' ').trim();
  return out ? out.slice(0,max) : undefined;
}

function finite(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function probability(value: unknown) {
  const n = finite(value);
  if (n === undefined) return undefined;
  const p = n > 1 && n <= 100 ? n / 100 : n;
  return p >= 0 && p <= 1 ? p : undefined;
}

function safeHttps(value: unknown) {
  const raw = text(value,1200);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString() : undefined;
  } catch { return undefined; }
}

function safeReturnUrl(value: unknown) {
  const raw = text(value,1600);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || !ALLOWED_ORIGINS.has(url.origin)) return undefined;
    url.username=''; url.password='';
    return url.toString();
  } catch { return undefined; }
}

function sanitizeLeg(raw: Record<string,unknown>, index: number) {
  const player = text(raw.player ?? raw.player_name ?? raw.name,120);
  const market = text(raw.market ?? raw.prop_key ?? raw.prop,120);
  if (!player || !market) throw new Error(`Leg ${index + 1} is missing player or market.`);
  return {
    id: text(raw.id,80) ?? `tso-leg-${index + 1}`,
    sport: text(raw.sport,32) ?? 'NFL',
    player,
    playerId: text(raw.playerId ?? raw.player_id ?? raw.espnId,100),
    playerImageUrl: safeHttps(raw.playerImageUrl ?? raw.headshotUrl ?? raw.headshot ?? raw.photo),
    team: text(raw.team,32),
    teamLogoUrl: safeHttps(raw.teamLogoUrl ?? raw.team_logo_url ?? raw.logoUrl),
    gameId: text(raw.gameId ?? raw.eventId ?? raw.event_id ?? raw.game_pk,120),
    matchup: text(raw.matchup ?? raw.game,120),
    market,
    displayMarket: text(raw.displayMarket ?? raw.selectionText,180),
    side: text(raw.side ?? raw.selection,24),
    line: finite(raw.line),
    inclusive: raw.inclusive === true,
    oddsAmerican: finite(raw.oddsAmerican ?? raw.odds ?? raw.price),
    sportsbook: text(raw.sportsbook ?? raw.book ?? raw.bookName,80),
    sportsbookLink: safeHttps(raw.sportsbookLink ?? raw.link ?? raw.deepLink),
    status: text(raw.status ?? raw.state,24) ?? 'PENDING',
    pregameProbability: probability(raw.pregameProbability ?? raw.probability ?? raw.pct ?? raw.modelProbability),
    startTimeUTC: text(raw.startTimeUTC ?? raw.kickoff,80),
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const policy = cors(origin);
  if (req.method === 'OPTIONS') return policy.allowed ? new Response('ok',{headers:policy.headers}) : new Response(null,{status:403});
  if (!policy.allowed) return json({ok:false,error:'Origin not allowed.'},403,origin);
  if (req.method !== 'POST') return json({ok:false,error:'Use POST.'},405,origin);
  if (!SUPABASE_URL || !SERVICE_ROLE || !PARLAYPING_API_KEY) return json({ok:false,error:'ParlayPing handoff is not configured.'},503,origin);

  const length = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) return json({ok:false,error:'Request body too large.'},413,origin);

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i,'').trim();
  if (!token) return json({ok:false,error:'Sign in to open this betslip in ParlayPing.'},401,origin);

  const admin = createClient(SUPABASE_URL,SERVICE_ROLE,{auth:{persistSession:false,autoRefreshToken:false}});
  const { data:userData, error:userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) return json({ok:false,error:'Sign in to open this betslip in ParlayPing.'},401,origin);

  let body: Record<string,unknown>;
  try {
    const rawText = await req.text();
    if (new TextEncoder().encode(rawText).byteLength > MAX_BODY_BYTES) return json({ok:false,error:'Request body too large.'},413,origin);
    body = rawText ? JSON.parse(rawText) : {};
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid body');
  } catch {
    return json({ok:false,error:'Invalid JSON body.'},400,origin);
  }

  const rows = Array.isArray(body.legs) ? body.legs : [];
  if (!rows.length) return json({ok:false,error:'Add at least one pick first.'},400,origin);
  if (rows.length > MAX_LEGS) return json({ok:false,error:`ParlayPing supports up to ${MAX_LEGS} legs.`},400,origin);

  let legs: Record<string,unknown>[];
  try { legs = rows.map((row,index)=>sanitizeLeg((row ?? {}) as Record<string,unknown>,index)); }
  catch (error) { return json({ok:false,error:(error as Error).message},400,origin); }

  const returnUrl = safeReturnUrl(body.returnUrl) ?? (origin && ALLOWED_ORIGINS.has(origin) ? `${origin}/` : undefined);
  if (!returnUrl) return json({ok:false,error:'Invalid Sports Outpost return URL.'},400,origin);

  const requestId = (req.headers.get('x-request-id') || `tso-share-${crypto.randomUUID()}`).slice(0,120);
  const payload = {
    source:'The Sports Outpost',
    sourceReference:text(body.sourceReference,180),
    returnUrl,
    returnLabel:'The Sports Outpost',
    legs,
  };

  let upstream: Response;
  try {
    upstream = await fetch(`${PARLAYPING_API_BASE_URL}/api/v1/share`,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'X-API-Key':PARLAYPING_API_KEY,
        'X-Request-Id':requestId,
        'X-ParlayPing-Client':'the-sports-outpost',
      },
      body:JSON.stringify(payload),
      signal:AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    const timeout = error instanceof DOMException && error.name === 'TimeoutError';
    return json({ok:false,error:timeout?'ParlayPing timed out.':'ParlayPing is temporarily unavailable.',requestId},timeout?504:502,origin);
  }

  const raw = await upstream.text();
  let result: Record<string,unknown> = {};
  try { result = raw ? JSON.parse(raw) : {}; }
  catch { result = {ok:false,error:'Invalid ParlayPing response.'}; }
  if (!upstream.ok) return json(result,upstream.status,origin,{'X-ParlayPing-Request-Id':requestId});

  const share = (result.share && typeof result.share === 'object' ? result.share : {}) as Record<string,unknown>;
  const shareUrl = text(share.url,2200);
  if (!shareUrl) return json({ok:false,error:'ParlayPing did not return a betslip URL.',requestId},502,origin);

  let launchUrl: string;
  try {
    const launch = new URL(shareUrl);
    if (launch.protocol !== 'https:' || launch.hostname.toLowerCase() !== 'parlayping.net' || !launch.pathname.startsWith('/slip/')) {
      throw new Error('Unexpected ParlayPing URL.');
    }
    launchUrl = launch.toString();
  } catch {
    return json({ok:false,error:'ParlayPing returned an invalid betslip URL.',requestId},502,origin);
  }

  return json({ok:true,requestId,share:{...share,launchUrl}},201,origin,{'X-ParlayPing-Request-Id':requestId});
});
