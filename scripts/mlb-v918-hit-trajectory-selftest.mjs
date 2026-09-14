import assert from 'node:assert/strict';
import fs from 'node:fs';
import { __MLB_PLAYSTAGE_V901_TEST__ as t } from '../sports/mlb/playstage-v901.js';

const rightHr={
  result:{eventType:'home_run',description:'Test batter homers on a fly ball to right field.'},
  hitData:{launchSpeed:101.6,launchAngle:40,totalDistance:357,coordinates:{coordX:190,coordY:90}}
};
const right=t.hitTarget(rightHr,'home_run');
const rightWall=t.defensiveHitTarget(rightHr,'home_run',right);
assert.ok(right[0]>55,'right-field homer must land on right side');
assert.ok(right[1]<32,'357-foot homer must project deep, not shallow right field');
assert.ok(right[1]<rightWall[1],'home-run landing must be beyond fielder wall-tracking target');
assert.ok(Math.hypot(right[0]-50,right[1]-88.5)>Math.hypot(rightWall[0]-50,rightWall[1]-88.5),'ball must travel farther than defender on a home run');

const leftHr={
  result:{eventType:'home_run',description:'Test batter homers to left field.'},
  hitData:{launchAngle:31,totalDistance:390,coordinates:{coordX:70,coordY:70}}
};
const left=t.hitTarget(leftHr,'home_run');
assert.ok(left[0]<45,'left-field homer must land on left side');
assert.ok(left[1]<30,'390-foot homer must project beyond the outfield');

const centerHr={
  result:{eventType:'home_run',description:'Test batter homers to center field.'},
  hitData:{launchAngle:28,totalDistance:410,coordinates:{coordX:126,coordY:50}}
};
const center=t.hitTarget(centerHr,'home_run');
assert.ok(Math.abs(center[0]-50)<5,'center-field homer should stay near center line');
assert.ok(center[1]<20,'410-foot center-field homer should reach/beyond center wall');

const geometry=t.trajectoryGeometry(rightHr,'home_run',right);
assert.match(geometry.d,/^M 50 86 Q /,'trajectory must originate at contact near home plate');
assert.deepEqual(geometry.to,right,'trajectory must terminate at projected landing point');
assert.ok(geometry.control[1]<right[1],'airborne trajectory must arc above landing point');

const core=fs.readFileSync(new URL('../sports/mlb/playstage-v901.js',import.meta.url),'utf8');
const concept=fs.readFileSync(new URL('../sports/mlb/playstage-concept-v917.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../sports/router.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.ok(core.includes('class="ps-trajectory"'),'stage must include trajectory SVG');
assert.ok(core.includes('animateHitBall(root,[50,86],target,play,kind'),'batted-ball animation must draw trajectory');
assert.ok(core.includes('fieldTarget=defensiveHitTarget(play,kind,target)'),'fielder target must be independent of landing target');
assert.ok(concept.includes('stroke:#2d7fff!important'),'trajectory must use Sports Outpost blue');
assert.ok(core.includes('requestAnimationFrame(frame)'),'trajectory must animate in lockstep with the moving ball');
assert.ok(router.includes("./mlb/playstage-v901.js?v=90.45"),'router must cache-bust v918 core');
assert.ok(router.includes("./mlb/playstage-concept-v917.js?v=91.72"),'router must cache-bust trajectory styles');
assert.ok(index.includes('./sports/router.js?v=90.45'),'index must cache-bust router');
console.log('MLB v918 regression: actual-distance landing projection + blue trajectory line OK', {right,rightWall,left,center});
