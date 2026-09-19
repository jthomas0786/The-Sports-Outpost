import fs from 'node:fs';
import assert from 'node:assert/strict';
import {__NFL_PLAYER_PROP_TOOL_REFERENCE_V941_TEST__ as R} from '../sports/nfl/player-prop-tool-reference-v941.js';

const read=p=>fs.readFileSync(p,'utf8');
const ref=read('sports/nfl/player-prop-tool-reference-v941.js');
const preview=read('sports/nfl-preview-v893.js');

assert.deepEqual(R.HEADERS,['PLAYER','CONSENSUS','PICK','PROJ','L10 AVG','COV PROB','EDGE','DEF VS PROP','MATCHUP','SIM DEF','L5','L10','H2H']);
assert.deepEqual(R.GROUPS,['','PROJECTIONS + VALUE','TSO INSIGHTS + DATA','HIT RATES']);
assert.deepEqual(R.rate(.831,5),{hits:4,total:5,p:.831});
assert.deepEqual(R.rate(.831,10),{hits:8,total:10,p:.831});
assert.ok(Math.abs(R.offenseScore({side:'under',prob:.83})-.17)<1e-9);
assert.deepEqual(R.matchupTone(27),['POOR','bad']);

for(const token of [
  '50,000 simulated worlds','SIM vs Prop','SIM VS IMPLIED','SIM VS 50%',
  'L5/L10/H2H labels on this table are simulation equivalents',
  "event.target.closest?.('#nflPlayerPropToolBtn')",'triggerV940()',
  'nflPptReferenceV941','nflPptReferenceLayout'
])assert.ok(ref.includes(token),`v94.1 reference layer missing ${token}`);
assert.ok(!ref.includes('fetch('),'reference stat layer must reuse the frozen 50K snapshot and must not add data fetches');
assert.ok(!ref.includes('MutationObserver'),'reference stat layer must not observe/rebuild the table');
assert.ok(!ref.includes('setInterval('),'reference stat layer must not add polling');
assert.ok(!ref.includes('recentAverage('),'reference layer must not use historical L10 averages');
assert.ok(!ref.includes('hitRate('),'reference layer must not use historical hit rates');
assert.ok(!ref.includes('h2hRate('),'reference layer must not use historical H2H samples');
assert.ok(!ref.includes('defenseRankMap'),'reference layer must not use historical defense ranks');
assert.ok(preview.includes("player-prop-tool-reference-v941.js?v=94.1"),'NFL wrapper must import the v94.1 reference layer');
assert.ok(preview.includes('installNflPlayerPropToolReferenceV941();'),'NFL wrapper must install the v94.1 reference layer');
assert.ok(preview.indexOf('installNflPlayerPropToolBuildPeriodV940();')<preview.indexOf('installNflPlayerPropToolReferenceV941();'),'reference stat layout must run after v94 period controls');

console.log('✓ NFL Player Prop Tool v94.1 reference-column regression passed: screenshot categories are preserved while every model stat is derived from the frozen 50K simulation output.');
