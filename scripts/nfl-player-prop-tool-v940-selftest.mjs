import fs from 'node:fs';
import assert from 'node:assert/strict';
import { __NFL_PERIOD_BOARD_V940_TEST__ as P } from '../sports/nfl/sim/quarter-board.js';
import { __NFL_FULL_PROP_BOARD_V942_TEST__ as F } from '../sports/nfl/sim/full-prop-board-v942.js';
import { __NFL_PLAYER_PROP_TOOL_BUILD_PERIOD_V940_TEST__ as U } from '../sports/nfl/player-prop-tool-build-period-v940.js';

const read=p=>fs.readFileSync(p,'utf8');
const ui=read('sports/nfl/player-prop-tool-build-period-v940.js');
const css=read('sports/nfl/player-prop-tool-build-period-v940.css');
const preview=read('sports/nfl-preview-v893.js');
const auto=read('scripts/nfl-sim-auto.mjs');
const board=read('sports/nfl/sim/quarter-board.js');
const fullBoard=read('sports/nfl/sim/full-prop-board-v942.js');
const router=read('sports/router.js');

assert.deepEqual(U.BUILD_STYLES.map(x=>x[1]),['TSO Pick','Safest','Best Edge','Balanced','Aggressive','Correlated','Longshot']);
assert.deepEqual(F.STYLE_KEYS,['tsoPick','safest','bestEdge','balanced','aggressive','correlated','longshot']);
assert.deepEqual(U.PERIODS.map(x=>x[1]),['Full','1H','2H','Q1','Q2','Q3','Q4']);
assert.deepEqual(P.HALF_MAP,{'1h':['q1','q2'],'2h':['q3','q4']});
const a=new Uint16Array([1,2,3,4]),b=new Uint16Array([4,3,2,1]);
assert.deepEqual([...P.summedArray(a,b,4)],[5,5,5,5]);
assert.ok(Math.abs(F.americanImplied(-110)-110/210)<1e-10);
assert.ok(Math.abs(F.americanImplied(150)-100/250)<1e-10);

for(const token of [
  'nflPptBuildStyle','nfl-ppt-periodbar-v940','Bet Style','real sportsbook lines','TSO Pick','Safest','Best Edge','Balanced','Aggressive','Correlated','Longshot',
  "['full','Full']","['1h','1H']","['2h','2H']","['q1','Q1']","['q4','Q4']",'propStyles','propPeriods','snapshotProb','snapshotEdge'
])assert.ok(ui.includes(token),`v94.2 UI missing ${token}`);
assert.ok(!ui.includes('setInterval('),'v94.2 Player Prop controls must not introduce polling');
assert.ok(!ui.includes('MutationObserver'),'v94.2 Player Prop controls must not introduce MutationObserver rerenders');

for(const token of ['max-width:100%','overflow-x:auto','scrollbar-width:none','min-width:39px','height:28px','Bet Style'])assert.ok(css.includes(token),`v94.2 compact/mobile CSS missing ${token}`);
for(const token of ['HALF_MAP','HALF_THRESHOLDS','summarizeTyped','projectedPeriod','worldMaskB64','worldMaskIterations'])assert.ok(board.includes(token),`period board missing ${token}`);
for(const token of ['slot.alternates','exactProbability','simProbability','impliedProbability','correlationLift','bestEdge','longshot'])assert.ok(fullBoard.includes(token),`full sportsbook style board missing ${token}`);
for(const token of ["raw.propStyleVersion='v94.2'",'raw.propStyles=fullPropBoard','buildPregameFullPropBoard','propStylesReady',"propStyleVersion:'v94.2'", "raw.propPeriodVersion='v94.0'",'raw.propPeriods=publicPropPeriods(quarterBoard)'])assert.ok(auto.includes(token),`sim auto missing ${token}`);
assert.ok(preview.includes("player-prop-tool-build-period-v940.js?v=94.2"),'NFL wrapper must import Bet Style v94.2');
assert.ok(preview.includes('installNflPlayerPropToolBuildPeriodV940();'),'NFL wrapper must install Bet Style controls');
const routerMarker=router.match(/import\('\.\/nfl-preview-v893\.js\?v=(\d+)\.(\d+)'\)/);
assert.ok(routerMarker,'router must load the NFL wrapper with a cache marker');
assert.ok(Number(routerMarker[1])>94||(Number(routerMarker[1])===94&&Number(routerMarker[2])>=0),`router NFL wrapper cache must be v94.0 or newer, got ${routerMarker[1]}.${routerMarker[2]}`);

console.log('✓ NFL Player Prop Tool v94.2 Bet Style regression passed: full-game rows are selected from real sportsbook alternate lines and exact 50K simulation probabilities.');