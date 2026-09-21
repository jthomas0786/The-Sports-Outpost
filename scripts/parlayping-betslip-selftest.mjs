import fs from 'node:fs';
import assert from 'node:assert/strict';

const ui=fs.readFileSync('sports/parlayping-betslip-v1.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const edge=fs.readFileSync('supabase/functions/parlayping-build/index.ts','utf8');

assert.match(router,/installParlayPingBetslipV1/,'router installs ParlayPing betslip');
assert.doesNotMatch(router,/installGamblyWebFallbackV895/,'router no longer installs Gambly fallback');
assert.match(ui,/Build with ParlayPing/,'betslip CTA is branded ParlayPing');
assert.match(ui,/dw_betslip/,'existing TSO betslip storage is preserved');
assert.match(ui,/sb\.functions\.invoke\('parlayping-build'/,'browser calls the TSO backend proxy');
assert.doesNotMatch(ui,/pp_live_[0-9a-f]{48}/i,'browser source contains no ParlayPing private API key');
assert.match(edge,/\/auth\/v1\/user/,'proxy validates the signed-in TSO user');
assert.match(edge,/Deno\.env\.get\('PARLAYPING_API_KEY'\)/,'proxy reads ParlayPing key from server-side secrets');
assert.match(edge,/\/api\/v1\/build/,'proxy calls the commercial ParlayPing build API');
assert.match(edge,/Maximum 20|up to 20/i,'proxy caps request size');
assert.doesNotMatch(edge,/pp_live_[0-9a-f]{48}/i,'proxy source contains no raw ParlayPing API key');
assert.ok(edge.indexOf('authenticatedUser(req)')<edge.indexOf("Deno.env.get('PARLAYPING_API_KEY')"),'user authentication happens before private API-key use');

console.log('ParlayPing betslip integration selftest: PASS');
