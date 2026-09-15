import assert from 'node:assert/strict';
import fs from 'node:fs';
import {__NFL_LIVE_SWITCHER_V894_TEST__ as T} from '../sports/nfl/live-game-switcher-v894.js';

const now=Date.now();
const old={id:'tb-cin',status:'in',start:new Date(now-26*60*60*1000).toISOString()};
const recent={id:'den-kc',status:'in',start:new Date(now-2*60*60*1000).toISOString()};
assert.equal(T.isFreshLiveCandidate(old,now),false,'previous-day stale in-progress game must expire');
assert.equal(T.isFreshLiveCandidate(recent,now),true,'current live game must remain eligible');
assert.equal(T.LIVE_STALE_MS,8*60*60*1000,'live stale window must remain eight hours');

const base=fs.readFileSync('sports/nfl-preview.js','utf8');
const switcher=fs.readFileSync('sports/nfl/live-game-switcher-v894.js','utf8');
const v890=fs.readFileSync('sports/nfl-preview-v890.js','utf8');
const wrapper=fs.readFileSync('sports/nfl-preview-v893.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const index=fs.readFileSync('index.html','utf8');

assert.ok(base.includes('isFreshNflLiveGame(g)'),'NFL Live landing must filter stale in-progress games');
assert.ok(base.includes('NFL_LIVE_STALE_MS=8*60*60*1000'),'base Live page must have stale-live TTL');
assert.ok(switcher.includes("auth==='in'||isFreshLiveCandidate(g)"),'authoritative live status must override age guard');
assert.ok(switcher.includes("return {...g,status:'post'}"),'stale unverified live selector entry must be removed from active games');
assert.ok(v890.includes("import('./nfl-preview.js?v=89.37')"),'fresh base preview must be cache-busted');
assert.ok(wrapper.includes("./nfl-preview-v890.js?v=89.37"),'NFL wrapper base import must be cache-busted');
assert.ok(wrapper.includes("./nfl/live-game-switcher-v894.js?v=89.37"),'NFL live switcher must be cache-busted');
assert.ok(router.includes("./nfl-preview-v893.js?v=89.37"),'router must load stale-live fix');
assert.ok(index.includes('./sports/router.js?v=90.48'),'index must cache-bust router');
assert.ok(router.includes("./nhl/view-v906.js?v=90.18"),'NHL must remain untouched');
assert.ok(router.includes('./mlb/playstage-concept-v921-mobile.js?v=92.10'),'MLB v921 must remain installed');

console.log('NFL v900 stale-live regression: previous-day stale status expires; fresh authoritative/current live games remain eligible');
