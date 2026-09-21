import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('supabase/functions/parlayping-build/index.ts','utf8');

assert.match(source,/MAX_CANDIDATES\s*=\s*25/,'proxy caps candidate pool at 25');
assert.match(source,/desiredLegs[^\n]*> 25/,'proxy rejects builds above 25 legs');
assert.match(source,/admin\.auth\.getUser\(token\)/,'proxy verifies the signed-in Sports Outpost user');
assert.match(source,/PARLAYPING_API_KEY\s*=\s*Deno\.env\.get\('PARLAYPING_API_KEY'\)/,'ParlayPing key is read only from server environment');
assert.match(source,/'X-API-Key': PARLAYPING_API_KEY/,'proxy authenticates upstream server-side');
assert.match(source,/\/api\/v1\/build/,'proxy forwards only to the ParlayPing build endpoint');
assert.doesNotMatch(source,/pp_live_[0-9a-f]{48}/i,'no literal ParlayPing private key is committed');
assert.match(source,/ALLOWED_ORIGINS/,'browser origins are allowlisted');
assert.match(source,/UPSTREAM_TIMEOUT_MS\s*=\s*15_000/,'proxy has an upstream timeout');
assert.match(source,/MAX_BODY_BYTES\s*=\s*128 \* 1024/,'proxy limits request size');
assert.match(source,/allowSameGame === true/,'same-game mode is explicit opt-in only');
assert.match(source,/minProbability[^\n]*< 0[^\n]*> 1/,'minimum probability is range checked');
assert.match(source,/X-ParlayPing-Request-Id/,'upstream request IDs are surfaced for support');
assert.doesNotMatch(source,/Deno\.env\.toObject|console\.log\([^)]*PARLAYPING_API_KEY/,'proxy never dumps environment/secrets');

console.log('ParlayPing API proxy selftest: PASS');
