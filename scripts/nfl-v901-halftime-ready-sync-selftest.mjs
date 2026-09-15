import assert from 'node:assert/strict';
import fs from 'node:fs';
import {halftimeBoardCurrent} from '../sports/nfl/halftime-validity.js';

const now=Date.now();
const live={
  id:'ready-den-kc',gameId:'ready-den-kc',status:'in',statusDetail:'Halftime',period:2,clockMin:0,
  away:{abbr:'DEN',score:7},home:{abbr:'KC',score:14},
  liveScore:{status:'in',statusDetail:'Halftime',period:2,clockMin:0,awayScore:7,homeScore:14,lastFetchedAt:now}
};
const board={
  gameId:'ready-den-kc',ready:true,generatedAt:new Date(now-5000).toISOString(),iterations:50000,
  state:{status:'in',statusDetail:'Halftime',period:2,clockMin:0,awayScore:7,homeScore:14},
  candidates:[
    {id:'a',oddsAgeSeconds:10},{id:'b',oddsAgeSeconds:12}
  ]
};
assert.equal(halftimeBoardCurrent(board,live,now),true,'fresh matching 50K halftime board must be current');

const ui=fs.readFileSync('sports/nfl/halftime-ui-v884.js','utf8');
const preview=fs.readFileSync('sports/nfl-preview.js','utf8');
const v890=fs.readFileSync('sports/nfl-preview-v890.js','utf8');
const wrapper=fs.readFileSync('sports/nfl-preview-v893.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const index=fs.readFileSync('index.html','utf8');

for(const marker of [
  'function publishedLiveGames(doc)',
  'async function fetchPublishedLiveGames()',
  "fetch(`./slates/nfl-live.json?t=${Date.now()}`",
  'const [r,published]=await Promise.all([',
  'if(published.length)syncLiveGames(published);',
]) assert.ok(ui.includes(marker),`halftime Ready sync missing ${marker}`);

assert.ok(preview.includes("./nfl/halftime-ui-v884.js?v=89.38"),'preview must load fresh halftime UI');
assert.ok(ui.includes("./halftime-validity.js?v=89.38"),'halftime validity must be cache-busted');
assert.ok(v890.includes("import('./nfl-preview.js?v=89.38')"),'base preview cache bust missing');
assert.ok(wrapper.includes("./nfl-preview-v890.js?v=89.38"),'wrapper cache bust missing');
assert.ok(router.includes("./nfl-preview-v893.js?v=89.38"),'router NFL cache bust missing');
assert.ok(router.includes("./nfl/live-game-switcher-v894.js?v=89.37")||wrapper.includes("./nfl/live-game-switcher-v894.js?v=89.37"),'stale-live protection must remain');
assert.ok(router.includes("./nhl/view-v906.js?v=90.18"),'NHL must remain untouched');
assert.ok(router.includes('./mlb/playstage-concept-v924-desktop-fit.js'),'MLB desktop work must remain installed');
const outer=index.match(/\.\/sports\/router\.js\?v=(\d+)\.(\d+)/);
assert.ok(outer,'outer router cache marker missing');
assert.ok(Number(outer[1])>90||(Number(outer[1])===90&&Number(outer[2])>=54),'outer router cache must be 90.54 or newer');

console.log('NFL v901 halftime Ready sync regression passed: published live snapshot independently unlocks a fresh matching READY board');
