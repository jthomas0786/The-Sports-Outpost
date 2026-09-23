import fs from 'node:fs';
import assert from 'node:assert/strict';
import {__PARLAYPING_EXTERNAL_HANDOFF_TEST__ as handoffTest} from '../sports/parlayping-external-handoff.js';

const handoff=fs.readFileSync('sports/parlayping-external-handoff.js','utf8');
const shim=fs.readFileSync('sports/gambly-web-fallback-v895.js','utf8');
const proxy=fs.readFileSync('supabase/functions/parlayping-share/index.ts','utf8');

assert.match(shim,/installParlayPingExternalHandoff/,'compatibility shim installs the external ParlayPing handoff');
assert.match(shim,/parlayping-external-handoff\.js\?v=2\.5/,'handoff module cache is busted for exact sportsbook link transport');
assert.doesNotMatch(shim,/installParlayPingBetslipV2|installParlayPingBetslipPolish/,'embedded ParlayPing UI is not installed in Sports Outpost');
assert.doesNotMatch(shim,/parlayping-betslip-v2\.js|parlayping-betslip-v2-polish\.js/,'embedded ParlayPing modules are not imported by the active handoff');
assert.doesNotMatch(shim,/gambly\.com|handoffToGambly|Generate on Gambly/i,'no Gambly handoff remains active');

assert.match(handoff,/MAX_LEGS=25/,'handoff supports up to 25 legs');
assert.match(handoff,/dw_betslip/,'Sports Outpost betslip remains the source of truth');
assert.match(handoff,/functions\/v1\/parlayping-share/,'browser calls only the Sports Outpost server-side share proxy');
assert.match(handoff,/sb\.auth\.getSession\(\)/,'browser requires the current Sports Outpost authenticated session');
assert.match(handoff,/location\.assign\(launchUrl\)/,'successful handoff navigates away from Sports Outpost to ParlayPing');
assert.match(handoff,/parlayping\\\.net\\\/build\\\/s1\\\./,'browser only accepts generated ParlayPing builder URLs');
assert.match(handoff,/payload\?\.share\?\.launchUrl/,'browser requires the explicit ParlayPing launch URL');
assert.match(handoff,/returnUrl/,'browser sends the exact Sports Outpost return location');
assert.match(handoff,/returnLabel:'The Sports Outpost'/,'browser identifies the return destination');
assert.match(handoff,/BOOK_ODDS_PREFIX='PP_BOOK_ODDS:'/,'book prices retain the bounded compatibility envelope');
assert.match(handoff,/sameExactSelection/,'per-book offers are checked against the exact selected leg');
assert.match(handoff,/exactOfferContainers/,'book offers are read only from explicit per-leg offer containers');
assert.match(handoff,/collectSlipBookLinks/,'full-parlay sportsbook links use a separate exact-slip transport');
assert.match(handoff,/bookOffers:collectBookOffers\(row\)/,'structured exact per-book leg offers are transported');
assert.match(handoff,/sportsbookLinks,/,'verified full-slip sportsbook links are transported');
assert.doesNotMatch(handoff,/function visit\(/,'book-price extraction does not recursively scan arbitrary nested markets');
assert.match(handoff,/commenceTime/,'handoff accepts commenceTime as a real game start-time source');
assert.match(handoff,/firstPitch/,'handoff accepts firstPitch as a real baseball start-time source');
assert.match(handoff,/LEGACY_GAMBLY_BUTTON_ID='bsBuild'/,'active handoff identifies the legacy Generate on Gambly action');
assert.match(handoff,/legacy\.remove\(\)/,'active handoff removes the legacy Generate on Gambly action from the DOM');
assert.match(handoff,/#bsBuild\{display:none!important\}/,'legacy Gambly action stays hidden across betslip rerenders');
assert.match(handoff,/Open this betslip on ParlayPing to share and track it/,'legacy Gambly note copy is replaced with ParlayPing copy');
assert.doesNotMatch(handoff,/generateGamblySlip|functions\/v1\/gambly-slip/,'active handoff contains no Gambly generation path');
assert.doesNotMatch(handoff,/ppSlipShell|Best Book for This Parlay|pps-wrap/,'Sports Outpost handoff contains no embedded ParlayPing experience');
assert.doesNotMatch(handoff,/pp_live_[0-9a-z_-]+/i,'browser source contains no ParlayPing private API key');

const exactHrRow={
  player:'Exact Slugger',market:'HR',side:'over',line:.5,event_id:'mlb-1',
  bookOdds:{
    DraftKings:470,
    FanDuel:{price:520,market:'batter_home_runs',player:'Exact Slugger',side:'over',line:.5,eventId:'mlb-1',deepLink:'https://sportsbook.example/selection/fd-exact'},
  },
  offers:[
    {book:'Caesars',price:135,market:'batter_hits',player:'Exact Slugger',side:'over',line:.5,eventId:'mlb-1',betslipUrl:'https://sportsbook.example/betslip/wrong-market'},
    {book:'theScore Bet',price:525,market:'batter_home_runs',player:'Exact Slugger',side:'over',line:.5,eventId:'mlb-1',betslipUrl:'https://sportsbook.example/betslip/score-exact'},
    {book:'bet365',price:600,market:'batter_home_runs',player:'Exact Slugger',side:'over',line:1.5,eventId:'mlb-1'},
  ],
  unrelatedMarket:{sportsbook:'Caesars',price:125,market:'batter_hits'},
};
assert.deepEqual(
  handoffTest.collectBookOdds(exactHrRow),
  {DraftKings:470,FanDuel:520,'theScore Bet':525},
  'only exact prices for the same player/market/side/line/event are transported',
);
const offers=handoffTest.collectBookOffers(exactHrRow);
assert.equal(offers.FanDuel.selectionLink,'https://sportsbook.example/selection/fd-exact','exact selection deep link is preserved as a selection link');
assert.equal(offers['theScore Bet'].betslipUrl,'https://sportsbook.example/betslip/score-exact','exact full-slip URL is preserved separately');
assert.equal(offers.Caesars,undefined,'unrelated-market full-slip URL is rejected');

const slipRows=[
  {player:'A',market:'points',side:'over',line:10,eventId:'g1',offersByBook:{DraftKings:{price:-110,player:'A',market:'points',side:'over',line:10,eventId:'g1',betslipUrl:'https://sportsbook.example/betslip/dk-parlay'}}},
  {player:'B',market:'assists',side:'over',line:5,eventId:'g2',offersByBook:{DraftKings:{price:+105,player:'B',market:'assists',side:'over',line:5,eventId:'g2',betslipUrl:'https://sportsbook.example/betslip/dk-parlay'}}},
];
assert.deepEqual(handoffTest.collectSlipBookLinks(slipRows),{DraftKings:'https://sportsbook.example/betslip/dk-parlay'},'whole-slip link is accepted only when every exact leg carries the same book betslip URL');
assert.deepEqual(
  handoffTest.collectSlipBookLinks([
    {player:'A',market:'points',side:'over',line:10,eventId:'g1',sportsbook:'DraftKings',deepLink:'https://sportsbook.example/selection/a'},
    {player:'B',market:'assists',side:'over',line:5,eventId:'g2',sportsbook:'DraftKings',deepLink:'https://sportsbook.example/selection/b'},
  ]),
  {},
  'individual selection deep links are never mislabeled as an exact full-parlay URL',
);
assert.deepEqual(
  handoffTest.collectSlipBookLinks([{sportsbookLinks:{FanDuel:'https://sportsbook.example/betslip/fd-explicit'}},{sportsbookLinks:{FanDuel:'https://sportsbook.example/betslip/fd-explicit'}}]),
  {FanDuel:'https://sportsbook.example/betslip/fd-explicit'},
  'explicit verified full-slip link maps pass through',
);

assert.match(proxy,/PARLAYPING_API_KEY = Deno\.env\.get\('PARLAYPING_API_KEY'\)/,'private ParlayPing API key is server-only');
assert.match(proxy,/\/api\/v1\/share/,'proxy creates generated ParlayPing slips through the commercial API');
assert.match(proxy,/admin\.auth\.getUser\(token\)/,'proxy verifies the Sports Outpost user server-side');
assert.match(proxy,/MAX_LEGS = 25/,'proxy enforces the 25-leg cap');
assert.match(proxy,/ALLOWED_ORIGINS/,'proxy restricts browser origins');
assert.match(proxy,/safeReturnUrl/,'return URL is validated server-side');
assert.match(proxy,/returnUrl,/,'validated return URL is sent into the ParlayPing share payload');
assert.match(proxy,/returnLabel:'The Sports Outpost'/,'ParlayPing receives the signed return label');
assert.match(proxy,/sanitizeSportsbookLinks/,'proxy validates full-slip sportsbook links server-side');
assert.match(proxy,/sanitizeBookOffers/,'proxy validates exact per-leg sportsbook offers server-side');
assert.match(proxy,/bookOffers: sanitizeBookOffers/,'proxy forwards structured exact book offers');
assert.match(proxy,/sportsbookLinks:sanitizeSportsbookLinks/,'proxy forwards verified full-slip sportsbook links');
assert.match(proxy,/raw\.commenceTime/,'proxy preserves commenceTime aliases when supplied');
assert.doesNotMatch(proxy,/searchParams\.set\(['"]return/i,'return target is not appended as an unsigned query parameter');
assert.match(proxy,/share\.launchUrl \?\? share\.url/,'proxy prefers the explicit builder launch URL');
assert.match(proxy,/\^\\\/build\\\/s1\\\./,'proxy only accepts signed builder paths');
assert.match(proxy,/launchUrl = launch\.toString\(\)/,'proxy forwards the canonical generated ParlayPing builder URL');
assert.doesNotMatch(proxy,/PARLAYPING_API_KEY\s*=\s*['"]pp_live_/i,'private API key is not committed');

console.log('ParlayPing external handoff selftest: PASS');
