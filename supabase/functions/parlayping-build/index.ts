// supabase/functions/parlayping-build/index.ts
//
// Authenticated Sports Outpost -> ParlayPing commercial API proxy.
// The browser NEVER receives the ParlayPing API key. A signed-in Sports Outpost
// user calls this Edge Function with their normal Supabase access token; this
// function verifies that user and forwards only the supported /api/v1/build
// payload to ParlayPing using the private PARLAYPING_API_KEY secret.
//
// Required Supabase secret:
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

const MAX_CANDIDATES = 25;
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

function cleanSports(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const sports = value
    .map((item) => String(item ?? '').trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
  return sports.length ? [...new Set(sports)] : undefined;
}

function sanitizePayload(raw: Record<string, unknown>) {
  const candidates = Array.isArray(raw.candidates) ? raw.candidates : [];
  if (candidates.length < 1) throw new Error('candidates[] is required.');
  if (candidates.length > MAX_CANDIDATES) throw new Error(`Maximum ${MAX_CANDIDATES} candidate legs per build request.`);

  const payload: Record<string, unknown> = { candidates };

  if (raw.desiredLegs !== undefined) {
    const desiredLegs = Number(raw.desiredLegs);
    if (!Number.isInteger(desiredLegs) || desiredLegs < 1 || desiredLegs > 25) {
      throw new Error('desiredLegs must be an integer from 1 to 25.');
    }
    payload.desiredLegs = desiredLegs;
  }

  if (raw.allowSameGame === true) payload.allowSameGame = true;

  if (raw.minProbability !== undefined) {
    const minProbability = Number(raw.minProbability);
    if (!Number.isFinite(minProbability) || minProbability < 0 || minProbability > 1) {
      throw new Error('minProbability must be between 0 and 1.');
    }
    payload.minProbability = minProbability;
  }

  const sports = cleanSports(raw.sports);
  if (sports) payload.sports = sports;

  if (typeof raw.referenceTime === 'string' && raw.referenceTime.trim()) {
    payload.referenceTime = raw.referenceTime.trim().slice(0, 80);
  }

  return payload;
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
    return json({ ok: false, error: 'ParlayPing proxy is not configured.' }, 503, origin);
  }

  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ ok: false, error: 'Request body too large.' }, 413, origin);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ ok: false, error: 'Not signed in.' }, 401, origin);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    return json({ ok: false, error: 'Not signed in.' }, 401, origin);
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
  const requestId = (incomingRequestId || `tso-${crypto.randomUUID()}`).slice(0, 120);

  let upstream: Response;
  try {
    upstream = await fetch(`${PARLAYPING_API_BASE_URL}/api/v1/build`, {
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
  return json(body, upstream.status, origin, {
    'X-ParlayPing-Request-Id': upstreamRequestId,
  });
});
