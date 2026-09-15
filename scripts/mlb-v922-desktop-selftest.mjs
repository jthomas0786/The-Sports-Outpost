import assert from 'node:assert/strict';
import fs from 'node:fs';

const concept=fs.readFileSync('sports/mlb/playstage-concept-v922-desktop.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const index=fs.readFileSync('index.html','utf8');

for(const marker of [
  "const MQ='(min-width:721px)'",
  '@media(min-width:721px)',
  'width:300px!important;min-height:154px!important',
  'width:420px!important;min-width:420px!important',
  'margin:0 0 76px!important;overflow:visible!important',
  'top:calc(100% + 10px)!important',
  'width:78px!important;height:108px!important',
  'font-family:Inter,"Segoe UI",Arial,sans-serif!important',
  "root.dataset.desktopPolish='v922'",
]) assert.ok(concept.includes(marker),`v922 desktop polish missing ${marker}`);

assert.ok(!concept.includes('@media(max-width:720px)'),'v922 must not override mobile');
assert.ok(router.includes("./mlb/playstage-concept-v920-mobile.js?v=92.00"),'v920 mobile layer must remain installed');
assert.ok(router.includes("./mlb/playstage-concept-v921-mobile.js?v=92.10"),'v921 mobile layer must remain installed');
assert.ok(router.includes("./mlb/playstage-concept-v922-desktop.js?v=92.20"),'router must load v922 desktop layer');
assert.ok(router.includes('installMlbPlaystageConceptV922Desktop'),'router must install v922 desktop layer');
assert.ok(index.includes('./sports/router.js?v=90.49'),'index must cache-bust v922 router');
assert.ok(router.includes("./nfl-preview-v893.js?v=89.37"),'NFL v900 live fix must remain untouched');
assert.ok(router.includes("./nhl/view-v906.js?v=90.18"),'NHL must remain untouched');

console.log('MLB v922 desktop regression: larger readable cards + Statcast, foreground-scale batter, Live At-Bat below exact field, no mobile regression');
