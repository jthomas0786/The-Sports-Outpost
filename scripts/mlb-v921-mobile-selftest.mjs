import assert from 'node:assert/strict';
import fs from 'node:fs';

const concept=fs.readFileSync('sports/mlb/playstage-concept-v921-mobile.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const index=fs.readFileSync('index.html','utf8');

assert.ok(concept.includes("top:calc(100% + 6px)!important"),'live-at-bat banner must be below field');
assert.ok(concept.includes("center.insertBefore(tabs,bottom)"),'Live/Box tabs must move above mobile state rows');
assert.ok(concept.includes("grid-template-columns:max-content max-content minmax(34px,1fr) max-content max-content!important"),'scores must stay paired with team labels');
assert.ok(concept.includes("width:34px!important;max-width:34px!important;min-width:34px!important"),'weather must be compact');
assert.ok(concept.includes("transform:none!important;transform-origin:center!important"),'bases board must not inherit scaled/clipped geometry');
assert.ok(router.includes("./mlb/playstage-concept-v921-mobile.js?v=92.10"),'router must load v921 mobile polish');
assert.ok(router.includes('installMlbPlaystageConceptV921Mobile'),'router must install v921 mobile polish');
assert.ok(index.includes('./sports/router.js?v=90.47'),'index must cache-bust v921 router');
assert.ok(router.includes("./nfl-preview-v893.js?v=89.36"),'NFL import must remain unchanged');
assert.ok(router.includes("./nhl/view-v906.js?v=90.18"),'NHL import must remain unchanged');

console.log('MLB v921 mobile regression: field status below image + visible Live/Box + centered bases + tight scores/weather');
