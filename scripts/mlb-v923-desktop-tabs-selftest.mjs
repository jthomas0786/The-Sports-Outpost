import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('sports/mlb/playstage-concept-v923-desktop-tabs.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const index=fs.readFileSync('index.html','utf8');

for(const marker of [
  "const MQ='(min-width:721px)'",
  'Gamecast</button><button type="button" data-v923-view="box">Box Score</button><button type="button" data-v923-view="plays">Play by Play',
  '.ps-right{display:none!important}',
  'grid-template-columns:minmax(0,1fr) 360px!important',
  'Live Play-by-Play',
  'grid-template-columns:repeat(3,minmax(0,1fr))!important',
  'grid-row:2!important;grid-column:1/-1!important',
  'width:50px!important;height:72px!important',
  'boxScoreHTML(feed)',
  'playByPlayHTML(feed)',
  'liveData?.boxscore?.teams',
  'liveData?.plays?.allPlays',
  "root.dataset.desktopLayout='v923'",
]) assert.ok(src.includes(marker),`v923 desktop layout missing ${marker}`);

assert.ok(!src.includes('@media(max-width:720px)'),'v923 must not override mobile');
assert.ok(router.includes("./mlb/playstage-concept-v922-desktop.js?v=92.20"),'v922 desktop polish must remain');
assert.ok(router.includes("./mlb/playstage-concept-v923-desktop-tabs.js?v=92.30"),'router must load v923 desktop tabs');
assert.ok(router.includes('installMlbPlaystageConceptV923DesktopTabs'),'router must install v923 desktop tabs');
assert.ok(router.includes("./mlb/playstage-concept-v920-mobile.js?v=92.00"),'v920 mobile must remain');
assert.ok(router.includes("./mlb/playstage-concept-v921-mobile.js?v=92.10"),'v921 mobile must remain');
assert.ok(index.includes('./sports/router.js?v=90.50'),'index must cache-bust v923 router');
assert.ok(router.includes("./nfl-preview-v893.js?v=89.37"),'NFL v900 must remain untouched');
assert.ok(router.includes("./nhl/view-v906.js?v=90.18"),'NHL must remain untouched');

console.log('MLB v923 desktop regression: 3-screen nav + no right rail + state/innings footer + live PBP + full box/PBP + normal batter scale');
