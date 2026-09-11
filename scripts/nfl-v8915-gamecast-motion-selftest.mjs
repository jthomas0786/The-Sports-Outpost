import assert from 'node:assert/strict';
import { __V8912_TEST__ as T } from '../sports/nfl/gamecast-field-state-v8912.js';

assert.equal(T.fieldAbs('away', 40), 40);
assert.equal(T.fieldAbs('home', 40), 60);
assert.equal(T.skillIndex({position:'QB'}, 'right'), 0);
assert.equal(T.skillIndex({position:'RB'}, 'left'), 6);
assert.equal(T.skillIndex({position:'WR'}, 'left'), 8);
assert.equal(T.targetLateral('right'), .80);

function checkPlan(st, side, startOwn, endOwn) {
  const dir = side === 'home' ? -1 : 1;
  const los = T.fieldAbs(side, startOwn);
  const end = T.fieldAbs(side, endOwn);
  const coords = T.formationCoords(los, dir);
  const plan = T.buildPlayPlan(st, los, dir, end, coords);
  assert.equal(plan.offense.length, 11);
  assert.equal(plan.defense.length, 11);
  assert.ok(plan.offense.every(Array.isArray));
  assert.ok(plan.defense.every(Array.isArray));
  assert.ok(plan.ball.length >= 2);
  for (const path of [...plan.offense, ...plan.defense, plan.ball]) {
    let prev=-1;
    for (const p of T.normalizePath(path)) {
      assert.ok(p.abs >= 0 && p.abs <= 100);
      assert.ok(p.lat >= 0 && p.lat <= 1);
      assert.ok(p.offset >= prev);
      prev=p.offset;
    }
  }
  return {plan,los,end};
}

let r=checkPlan({
  kind:'pass',direction:'right',description:'Matthew Stafford pass complete to Puka Nacua for 18 yards',
  passer:{name:'Matthew Stafford',position:'QB'},target:{name:'Puka Nacua',position:'WR'}
}, 'home', 35, 53);
assert.equal(r.plan.gain,18);
assert.equal(r.plan.offense[10].at(-1).abs,r.end);
assert.notEqual(r.plan.offense[0].at(-1).abs,r.end);

r=checkPlan({
  kind:'rush',direction:'left',description:'Kyren Williams left tackle for 12 yards',
  runner:{name:'Kyren Williams',position:'RB'}
}, 'home', 42, 54);
assert.equal(r.plan.gain,12);
assert.equal(r.plan.runnerIdx,6);
assert.equal(r.plan.offense[6].at(-1).abs,r.end);
assert.equal(r.plan.ball.at(-1).abs,r.end);

r=checkPlan({
  kind:'sack',direction:'middle',description:'Matthew Stafford sacked for a loss of 8 yards',
  passer:{name:'Matthew Stafford',position:'QB'}
}, 'away', 50, 42);
assert.equal(r.plan.gain,-8);
assert.equal(r.plan.offense[0].at(-1).abs,r.end);

r=checkPlan({
  kind:'pass',direction:'left',description:'Pass incomplete intended for Cooper Kupp',
  target:{name:'Cooper Kupp',position:'WR'}
}, 'away', 30, 30);
assert.equal(r.plan.gain,0);
assert.notEqual(r.plan.targetEnd,r.end); // route still advances on an incompletion

console.log('v89.15 motion-plan tests passed');
