import assert from 'node:assert/strict';
import fs from 'node:fs';

const mobile=fs.readFileSync(new URL('../sports/mlb/playstage-concept-v920-mobile.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../sports/router.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

assert.ok(mobile.includes("grid-template-columns:repeat(3,minmax(0,1fr))"),'mobile footer must use a 3-column state row');
assert.ok(mobile.includes('.ps-linescore + .ps-bottom-box + .ps-bottom-box + .ps-bottom-box{grid-column:1'),'OUTS must be first mobile state cell');
assert.ok(mobile.includes('button[data-ps-tab="plays"]'),'mobile layout must hide Plays tab');
assert.ok(mobile.includes('button[data-ps-tab="field"]'),'mobile layout must hide Field tab');
assert.ok(mobile.includes("active!=='live'&&active!=='box'"),'mobile layout must constrain tabs to Live/Box');
assert.ok(mobile.includes("bottom.parentElement!==center"),'mobile scoreboard must move under field');
assert.ok(mobile.includes("right.parentElement!==center"),'mobile Live/Box panel must move under scoreboard');
assert.ok(mobile.includes("match=raw.match(/^(Top|Bot|Bottom|Middle|End)"),'mobile score header must reduce inning text');
assert.ok(mobile.includes('.ps-weather{display:block!important;width:52px'),'mobile weather must be compact');
assert.ok(mobile.includes('.ps914-field{inset:0!important;width:100%!important;height:100%!important;object-fit:contain'),'approved field must fit its mobile stage without crop');
assert.ok(router.includes("./mlb/playstage-concept-v920-mobile.js?v=92.00"),'router must load v920 mobile layer');
assert.ok(router.includes('installMlbPlaystageConceptV920Mobile'),'router must install v920 mobile layer');
assert.ok(index.includes('./sports/router.js?v=90.47'),'index must cache-bust v920 router');
assert.ok(router.includes("./nfl-preview-v893.js?v=89.36"),'NFL import must remain unchanged');
assert.ok(router.includes("./nhl/view-v906.js?v=90.18"),'NHL import must remain unchanged');
console.log('MLB v920 mobile regression: full-width field + OUTS/COUNT/BASES + innings + Live/Box OK');
