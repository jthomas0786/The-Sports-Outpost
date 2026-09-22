import fs from 'node:fs';
import assert from 'node:assert/strict';

const handoff=fs.readFileSync('sports/parlayping-external-handoff.js','utf8');
const shim=fs.readFileSync('sports/gambly-web-fallback-v895.js','utf8');
const proxy=fs.readFileSync('supabase/functions/parlayping-share/index.ts','utf8');

assert.match(shim,/installParlayPingExternalHandoff/,'compatibility shim installs the external ParlayPing handoff');
assert.match(shim,/parlayping-external-handoff\.js\?v=2\.2/,'handoff module cache is busted for the concept-builder launch');
assert.doesNotMatch(shim,/installParlayPingBetslipV2|installParlayPingBetslipPolish/,'embedded ParlayPing UI is not installed in Sports Outpost');
assert.doesNotMatch(shim,/parlayping-betslip-v2\.js|parlayping-betslip-v2-polish\.js/,'embedded ParlayPing modules are not imported by the active handoff');
assert.doesNotMatch(shim,/gambly\.com|handoffToGambly|Generate on Gambly/i,'no Gambly handoff remains active');

assert.match(handoff,/MAX_LEGS=25/,'handoff supports up to 25 legs');
assert.match(handoff,/dw_betslip/,'Sports Outpost betslip remains the source of truth');
assert.match(handoff,/functions\/v1\/parlayping-share/,'browser calls only the Sports Outpost server-side share proxy');
assert.match(handoff,/sb\.auth\.getSession\(\)/,'browser requires the current Sports Outpost authenticated session');
assert.match(handoff,/location\.assign\(launchUrl\)/,'successful handoff navigates away from Sports Outpost to ParlayPing');
assert.match(handoff,/parlayping\\\.net\\\/build\\\/s1\\\./,'browser only accepts generated ParlayPing concept-builder URLs');
assert.match(handoff,/payload\?\.share\?\.launchUrl/,'browser requires the explicit ParlayPing launch URL');
assert.match(handoff,/returnUrl/,'browser sends the exact Sports Outpost return location');
assert.match(handoff,/returnLabel:'The Sports Outpost'/,'browser identifies the return destination');
assert.match(handoff,/LEGACY_GAMBLY_BUTTON_ID='bsBuild'/,'active handoff identifies the legacy Generate on Gambly action');
assert.match(handoff,/legacy\.remove\(\)/,'active handoff removes the legacy Generate on Gambly action from the DOM');
assert.match(handoff,/#bsBuild\{display:none!important\}/,'legacy Gambly action stays hidden across betslip rerenders');
assert.match(handoff,/Open this betslip on ParlayPing to share and track it/,'legacy Gambly note copy is replaced with ParlayPing copy');
assert.doesNotMatch(handoff,/generateGamblySlip|functions\/v1\/gambly-slip/,'active handoff contains no Gambly generation path');
assert.doesNotMatch(handoff,/ppSlipShell|Best Book for This Parlay|pps-wrap/,'Sports Outpost handoff contains no embedded ParlayPing experience');
assert.doesNotMatch(handoff,/pp_live_[0-9a-z_-]+/i,'browser source contains no ParlayPing private API key');

assert.match(proxy,/PARLAYPING_API_KEY = Deno\.env\.get\('PARLAYPING_API_KEY'\)/,'private ParlayPing API key is server-only');
assert.match(proxy,/\/api\/v1\/share/,'proxy creates generated ParlayPing slips through the commercial API');
assert.match(proxy,/admin\.auth\.getUser\(token\)/,'proxy verifies the Sports Outpost user server-side');
assert.match(proxy,/MAX_LEGS = 25/,'proxy enforces the 25-leg cap');
assert.match(proxy,/ALLOWED_ORIGINS/,'proxy restricts browser origins');
assert.match(proxy,/safeReturnUrl/,'return URL is validated server-side');
assert.match(proxy,/returnUrl,/,'validated return URL is sent into the ParlayPing share payload');
assert.match(proxy,/returnLabel:'The Sports Outpost'/,'ParlayPing receives the signed return label');
assert.doesNotMatch(proxy,/searchParams\.set\(['"]return/i,'return target is not appended as an unsigned query parameter');
assert.match(proxy,/share\.launchUrl \?\? share\.url/,'proxy prefers the explicit concept-builder launch URL');
assert.match(proxy,/\^\\\/build\\\/s1\\\./,'proxy only accepts signed concept-builder paths');
assert.match(proxy,/launchUrl = launch\.toString\(\)/,'proxy forwards the canonical generated ParlayPing builder URL');
assert.doesNotMatch(proxy,/PARLAYPING_API_KEY\s*=\s*['"]pp_live_/i,'private API key is not committed');

console.log('ParlayPing external handoff selftest: PASS');
