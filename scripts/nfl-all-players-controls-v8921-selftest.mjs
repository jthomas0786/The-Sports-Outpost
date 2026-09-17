import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const preview=read('sports/nfl-preview.js');
const controller=read('sports/nfl/all-players-controls-v8921.js');
const v893=read('sports/nfl-preview-v893.js');
const router=read('sports/router.js');
const index=read('index.html');

assert.ok(preview.includes('id="nflAllSort"'),'base All Players sort control must remain');
assert.ok(preview.includes('id="nflSearch"'),'base All Players search input must remain');

for(const needle of [
  "const FILTER_STATE={search:'',team:'ALL',position:'ALL'}",
  "p==='HB'||p==='FB'?'RB':p",
  'id="nflAllTeam"',
  'id="nflAllPosition"',
  '#nflAllClear',
  "FILTER_STATE.search=e.target.value||''",
  "FILTER_STATE.team=e.target.value||'ALL'",
  "FILTER_STATE.position=e.target.value||'ALL'",
  "card.style.display=visible?'':'none'",
  '#nflAllList .nfl-mlb-prop-card[hidden]{display:none!important}',
  'rank.textContent=String(shown)',
  'No players match those filters.',
  'new MutationObserver(()=>schedule(root))',
  "queueMicrotask(()=>schedule(root))"
]) assert.ok(controller.includes(needle),`All Players controller missing ${needle}`);

assert.ok(controller.includes("card.dataset.tsoAllTeam=m.team"),'team metadata must be normalized per card');
assert.ok(controller.includes("card.dataset.tsoAllPosition=m.position"),'position metadata must be normalized per card');
assert.ok(controller.includes("const hay=[card.dataset.tsoAllName,card.dataset.tsoAllTeam,card.dataset.tsoAllPosition,card.textContent]"),'search must cover player/team/position plus rendered metadata');
assert.ok(controller.includes("root.addEventListener('input'"),'search must use persistent delegated input handling');
assert.ok(controller.includes("root.addEventListener('change'"),'filters/sort must use persistent delegated change handling');
assert.ok(controller.includes("observer.observe(root,{childList:true,subtree:true})"),'controller must survive NFL rerenders');

assert.ok(v893.includes("./nfl/all-players-controls-v8921.js?v=89.21"),'production wrapper must import the All Players controller');
assert.ok(v893.includes('installNflAllPlayersControlsV8921();'),'production wrapper must install the All Players controller');
assert.ok(/\.\/nfl-preview-v893\.js\?v=89\.\d+/.test(router),'router NFL cache bust missing');
assert.ok(/\.\/sports\/router\.js\?v=\d+\.\d+/.test(index),'outer router cache bust missing');

console.log('NFL All Players controls v89.21 regression passed');
