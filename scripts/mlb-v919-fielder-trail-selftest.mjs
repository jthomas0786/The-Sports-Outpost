import assert from 'node:assert/strict';
import fs from 'node:fs';
import { __MLB_PLAYSTAGE_V901_TEST__ as t } from '../sports/mlb/playstage-v901.js';

const hr={
  result:{eventType:'home_run',description:'Test batter homers on a fly ball to right field.'},
  hitData:{launchSpeed:101.6,launchAngle:40,totalDistance:357,coordinates:{coordX:190,coordY:90}}
};
const landing=t.hitTarget(hr,'home_run');
const fielder=t.defensiveHitTarget(hr,'home_run',landing);
assert.ok(landing[1] < 32,'home-run ball must still land deep/right beyond the wall');
assert.ok(fielder[0] >= 18 && fielder[0] <= 82,'outfielder must stay inside playable horizontal field bounds');
assert.ok(fielder[1] >= 36,'outfielder must stay on playable grass/warning-track depth, not jump into the stands');
assert.ok(Math.hypot(fielder[0]-50,fielder[1]-88.5) < Math.hypot(landing[0]-50,landing[1]-88.5),'fielder must stop before the ball landing point');

const core=fs.readFileSync(new URL('../sports/mlb/playstage-v901.js',import.meta.url),'utf8');
const concept=fs.readFileSync(new URL('../sports/mlb/playstage-concept-v917.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../sports/router.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

assert.ok(core.includes('class="ps-trajectory-head"'),'trajectory must include a moving glow head');
assert.ok(core.includes('function partialTrajectory(g,t)'),'trajectory must progressively build behind the ball');
assert.ok(core.includes('requestAnimationFrame(frame)'),'ball-following trail must animate frame-by-frame');
assert.ok(core.includes("b.style.left=`${point[0]}%`"),'baseball position must follow the same computed trajectory point');
assert.ok(core.includes("p?.setAttribute('d',seg.d)"),'solid trail path must end at the ball each frame');
assert.ok(!concept.includes('stroke-dasharray'),'trajectory must be a solid line, never a dotted/dashed line');
assert.ok(concept.includes('stroke:#2d7fff!important'),'trajectory must use Sports Outpost blue');
assert.ok(concept.includes('ps-trajectory-head'),'moving ball glow styling must exist');
assert.ok(router.includes("./mlb/playstage-v901.js?v=90.45"),'router must cache-bust v919 core');
assert.ok(router.includes("./mlb/playstage-concept-v917.js?v=91.72"),'router must cache-bust v919 trajectory styles');
assert.ok(index.includes('./sports/router.js?v=90.46'),'index must cache-bust v919 router');

console.log('MLB v919 regression: outfielder stays playable + solid glowing trail follows ball', {landing,fielder});
