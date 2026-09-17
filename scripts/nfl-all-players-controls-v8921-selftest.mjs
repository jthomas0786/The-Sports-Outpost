import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const preview=read('sports/nfl-preview.js');
const v890=read('sports/nfl-preview-v890.js');
const v893=read('sports/nfl-preview-v893.js');
const router=read('sports/router.js');
const index=read('index.html');

for(const needle of [
  "allSearch: ''",
  "allTeam: 'ALL'",
  "allPosition: 'ALL'",
  'function allPlayerMatchesFilters(p)',
  'function applyAllPlayersFilters(root)',
  'id="nflAllTeam"',
  'id="nflAllPosition"',
  'id="nflSearch"',
  'id="nflAllClear"',
  "state.allSearch=search.value;applyAllPlayersFilters(root);",
  "state.allTeam=e.target.value||'ALL';applyAllPlayersFilters(root);",
  "state.allPosition=e.target.value||'ALL';applyAllPlayersFilters(root);",
  "card.style.display=visible?'':'none'",
  'applyAllPlayersFilters(root);'
]) assert.ok(preview.includes(needle),`missing All Players control wiring: ${needle}`);

assert.ok(!preview.includes("c.hidden=!c.textContent.toLowerCase().includes(q)"),'legacy textContent-only DOM search must be removed');
assert.ok(preview.includes("p?.name,p?.team,p?.pos,p?.opp"),'search must match player, team, position and opponent metadata');
assert.ok(preview.includes("p==='HB'||p==='FB'?'RB':p"),'HB/FB must group into RB for position filtering');
assert.ok(preview.includes("empty.hidden=shown!==0"),'empty state must track filtered results');
assert.ok(preview.includes("rank.textContent=String(shown)"),'visible ranks must renumber after filtering');

assert.ok(/\.\/nfl-preview\.js\?v=89\.\d+/.test(v890),'base preview cache bust missing');
assert.ok(/\.\/nfl-preview-v890\.js\?v=89\.\d+/.test(v893),'wrapper preview cache bust missing');
assert.ok(/\.\/nfl-preview-v893\.js\?v=89\.\d+/.test(router),'router NFL cache bust missing');
assert.ok(/\.\/sports\/router\.js\?v=\d+\.\d+/.test(index),'outer router cache bust missing');

console.log('NFL All Players controls v89.21 regression passed');
