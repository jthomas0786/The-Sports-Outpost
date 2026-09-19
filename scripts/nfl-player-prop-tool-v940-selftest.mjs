import fs from 'node:fs';
import assert from 'node:assert/strict';
import { __NFL_PERIOD_BOARD_V940_TEST__ as P } from '../sports/nfl/sim/quarter-board.js';
import { __NFL_PLAYER_PROP_TOOL_BUILD_PERIOD_V940_TEST__ as U } from '../sports/nfl/player-prop-tool-build-period-v940.js';

const read=p=>fs.readFileSync(p,'utf8');
const ui=read('sports/nfl/player-prop-tool-build-period-v940.js');
const css=read('sports/nfl/player-prop-tool-build-period-v940.css');
const preview=read('sports/nfl-preview-v893.js');
const auto=read('scripts/nfl-sim-auto.mjs');
const board=read('sports/nfl/sim/quarter-board.js');
const router=read('sports/router.js');

assert.deepEqual(U.BUILD_STYLES.map(x=>x[1]),['TSO Pick','Safest','Best Edge','Balanced','Aggressive','Correlated','Longshot']);
assert.deepEqual(U.PERIODS.map(x=>x[1]),['Full','1H','2H','Q1','Q2','Q3','Q4']);
assert.deepEqual(P.HALF_MAP,{'1h':['q1','q2'],'2h':['q3','q4']});
const a=new Uint16Array([1,2,3,4]),b=new Uint16Array([4,3,2,1]);
assert.deepEqual([...P.summedArray(a,b,4)],[5,5,5,5]);

for(const token of [
  'nflPptBuildStyle','nfl-ppt-periodbar-v940','TSO Pick','Safest','Best Edge','Balanced','Aggressive','Correlated','Longshot',
  "['full','Full']","['1h','1H']","['2h','2H']","['q1','Q1']","['q4','Q4']",'propPeriods','projectedPeriod','worldMaskIterations'
])assert.ok(ui.includes(token),`v94 UI missing ${token}`);
assert.ok(!ui.includes('setInterval('),'v94 Player Prop controls must not introduce polling');
assert.ok(!ui.includes('MutationObserver'),'v94 Player Prop controls must not introduce MutationObserver rerenders');

for(const token of ['max-width:100%','overflow-x:auto','scrollbar-width:none','min-width:39px','height:28px'])assert.ok(css.includes(token),`v94 compact/mobile CSS missing ${token}`);
for(const token of ['HALF_MAP','HALF_THRESHOLDS','summarizeTyped','projectedPeriod','worldMaskB64','worldMaskIterations'])assert.ok(board.includes(token),`period board missing ${token}`);
for(const token of ["raw.propPeriodVersion='v94.0'",'raw.propPeriods=publicPropPeriods(quarterBoard)','worldMaskB64','propPeriodsReady','propPeriodVersion'])assert.ok(auto.includes(token),`sim auto missing ${token}`);
assert.ok(auto.includes('const {worldMaskB64,...rest}=candidate'),'public nfl-sim propPeriods must strip large same-world masks');
assert.ok(preview.includes("player-prop-tool-build-period-v940.js?v=94.0"),'NFL wrapper must import v94 build/period controls');
assert.ok(preview.includes('installNflPlayerPropToolBuildPeriodV940();'),'NFL wrapper must install v94 build/period controls');
assert.ok(router.includes("import('./nfl-preview-v893.js?v=94.0')"),'router must cache-bust NFL wrapper to v94.0');

console.log('✓ NFL Player Prop Tool v94.0 build-style + period regression passed');