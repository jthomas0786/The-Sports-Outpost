import fs from 'node:fs';
import assert from 'node:assert/strict';

const handoff=fs.readFileSync('sports/parlayping-external-handoff.js','utf8');
const shim=fs.readFileSync('sports/gambly-web-fallback-v895.js','utf8');
const proxy=fs.readFileSync('supabase/functions/parlayping-share/index.ts','utf8');

assert.match(shim,/installParlayPingExternalHandoff/,'compatibility shim installs the external ParlayPing handoff');
assert.doesNotMatch(shim,/installParlayPingBetslipV2|installParlayPingBetslipPolish/,'embedded ParlayPing UI is not installed in Sports Outpost');
assert.doesNotMatch(shim,/parlayping-betslip-v2\.js|parlayping-betslip-v2-polish\.js/,'embedded ParlayPing modules are not imported by the active handoff');
assert.doesNotMatch(shim,/gambly\.com|handoffToGambly|Generate on Gambly/i,'no Gambly handoff remains active');

assert.match(handoff,/MAX_LEGS=25/,'handoff supports up to 25 legs');
assert.match(handoff,/dw_betslip/,'Sports Outpost betslip remains the source of truth');
assert.match(handoff,/functions\/v1\/parlayping-share/,'browser calls only the Sports Outpost server-side share proxy');
assert.match(handoff,/sb\.auth\.getSession\(\)/,'browser requires the current Sports Outpost authenticated session');
assert.match(handoff,/location\.assign\(launchUrl\)/,'successful handoff navigates away from Sports Outpost to ParlayPing');
assert.match(handoff,/parlayping\\\.net\\\/slip/,'browser only accepts generated ParlayPing slip URLs');
assert.match(handoff,/returnUrl/,'browser sends the exact Sports Outpost return location');
assert.doesNotMatch(handoff,/ppSlipShell|Best Book for This Parlay|pps-wrap/,'Sports Outpost handoff contains no embedded ParlayPing experience');
assert.doesNotMatch(handoff,/pp_live_[0-9a-z_-]+/i,'browser source contains no ParlayPing private API key');

assert.match(proxy,/PARLAYPING_API_KEY = Deno\.env\.get\('PARLAYPING_API_KEY'\)/,'private ParlayPing API key is server-only');
assert.match(proxy,/\/api\/v1\/share/,'proxy creates generated ParlayPing slips through the commercial API');
assert.match(proxy,/admin\.auth\.getUser\(token\)/,'proxy verifies the Sports Outpost user server-side');
assert.match(proxy,/MAX_LEGS = 25/,'proxy enforces the 25-leg cap');
assert.match(proxy,/ALLOWED_ORIGINS/,'proxy restricts browser origins');
assert.match(proxy,/safeReturnUrl/,'return URL is validated server-side');
assert.match(proxy,/launch\.searchParams\.set\('return',returnUrl\)/,'generated ParlayPing URL carries the validated Sports Outpost return location');
assert.doesNotMatch(proxy,/PARLAYPING_API_KEY\s*=\s*['"]pp_live_/i,'private API key is not committed');

console.log('ParlayPing external handoff selftest: PASS');
