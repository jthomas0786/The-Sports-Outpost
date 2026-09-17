import assert from 'node:assert/strict';
import fs from 'node:fs';
import {__MLB_PLAYER_MODAL_BVP_V902_TEST__ as T} from '../sports/mlb/player-modal-bvp-v902.js';

const source=fs.readFileSync('sports/mlb/player-modal-bvp-v902.js','utf8');
const adapter=fs.readFileSync('sports/mlb/adapter.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const index=fs.readFileSync('index.html','utf8');

const fake={games:[{
  away:{lineup:[{id:1,name:'Bryan Reynolds',vsPitcher:null}],pitcher:{id:9,name:'Away Arm'}},
  home:{lineup:[{id:2,name:'Home Hitter',vsPitcher:{pa:13,ab:12,h:5,hr:2,so:3,avg:.417,slg:.917}}],pitcher:{id:7,name:'Kyle Harrison'}}
}]};
const reynolds=T.findBvpMatchup(fake,'Bryan Reynolds');
assert.equal(reynolds.pitcherName,'Kyle Harrison');
assert.equal(T.hasBvpHistory(reynolds.history),false,'null BvP must not render');
const home=T.findBvpMatchup(fake,'Home Hitter');
assert.equal(home.pitcherName,'Away Arm');
assert.equal(T.hasBvpHistory(home.history),true,'real BvP sample must render');
assert.equal(T.hasBvpHistory({pa:0,ab:0,h:0}),false,'zero-sample history must stay hidden');
assert.equal(T.formatRate(.417),'.417');
const markup=T.historyMarkup(home);
for(const marker of ['Batter vs Pitcher','Head-to-head','PA','H','HR','AVG','SLG','K'])
  assert.ok(markup.includes(marker),`BvP markup missing ${marker}`);
assert.ok(!/no history|no matchup/i.test(markup),'BvP UI must never render an empty-state placeholder');

for(const marker of [
  "findSection(card,'SWING FACTORS')",
  "findSection(card,'CONTACT QUALITY')",
  'if(!matchup||!hasBvpHistory(matchup.history))',
  'old?.remove()',
  'contact.before(section)',
  "fetch('./slate.json?ts='+Date.now()",
  "document.documentElement.getAttribute('data-sport')!=='mlb'",
  'grid-template-columns:repeat(3,minmax(0,1fr))'
]) assert.ok(source.includes(marker),`BvP runtime missing ${marker}`);

for(const marker of [
  'stats=vsPlayerTotal',
  'stats=vsPlayer&opposingPlayerId=${pitcherId}',
  'season=${SEASON}&sportId=1',
  'const candidates = blocks',
  ".sort((x, y) => y.pa - x.pa)",
  "scope: /total/i.test(typeText) ? 'career' : 'season'"
]) assert.ok(adapter.includes(marker),`MLB BvP pipeline missing ${marker}`);

assert.ok(router.includes("./mlb/player-modal-bvp-v902.js?v=90.3"),'router must load MLB BvP v90.2');
assert.ok(router.includes('playerBvp.installMlbPlayerModalBvpV902?.();'),'router must install MLB BvP modal enhancer');
assert.ok(/\.\/sports\/router\.js\?v=\d+\.\d+/.test(index),'outer page must cache-bust sports router');

console.log('MLB BvP v90.2 regression passed: real batter-vs-starter history renders between Swing Factors and Contact Quality; no sample renders nothing.');
