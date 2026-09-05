// Tests for parkPullAdjustment — the simpler, lower-risk park-geometry
// adjustment that replaced the disabled full physics model (see
// MODEL.md's "Contact/flight model" incident writeup).
// Run with: node --test tests/park-pull-adjustment.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFunctions } from './extract-from-index.js';

const helperSource = `function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }`;
const { parkPullAdjustment } = loadFunctions(['parkPullAdjustment'], helperSource);

test('a perfectly symmetric park produces exactly neutral (1.0) for either handedness', () => {
  const symmetric = { lf: 330, cf: 400, rf: 330 };
  assert.equal(parkPullAdjustment(symmetric, 'R'), 1);
  assert.equal(parkPullAdjustment(symmetric, 'L'), 1);
});

test('REAL PARK: Comerica Park\'s known deep pull side for righties (LF 345 vs RF 330) produces a real penalty', () => {
  const comerica = { lf: 345, cf: 412, rf: 330 };
  const result = parkPullAdjustment(comerica, 'R');
  assert.ok(result < 1, `righty pulling to the deeper 345ft LF should be penalized, got ${result}`);
});

test('REAL PARK: the SAME park boosts lefties, who pull to the shorter RF instead', () => {
  const comerica = { lf: 345, cf: 412, rf: 330 };
  const result = parkPullAdjustment(comerica, 'L');
  assert.ok(result > 1, `lefty pulling to the shorter 330ft RF should be boosted, got ${result}`);
});

test('switch hitters always get exactly neutral (1.0), regardless of park asymmetry', () => {
  const veryAsymmetric = { lf: 250, cf: 500, rf: 450 };   // deliberately extreme, to make sure this isn't accidentally triggering an adjustment
  assert.equal(parkPullAdjustment(veryAsymmetric, 'S'), 1);
});

test('an unknown or missing handedness gets neutral treatment, not a crash', () => {
  const dims = { lf: 310, cf: 420, rf: 302 };
  assert.equal(parkPullAdjustment(dims, '?'), 1);
  assert.equal(parkPullAdjustment(dims, null), 1);
  assert.equal(parkPullAdjustment(dims, undefined), 1);
});

test('a null park (unmatched venue, physics model not applicable) returns neutral, not a crash', () => {
  assert.equal(parkPullAdjustment(null, 'R'), 1);
  assert.equal(parkPullAdjustment(undefined, 'L'), 1);
});

test('CRITICAL: the adjustment is always bounded to [0.85, 1.20], even for an absurdly extreme, unrealistic park', () => {
  const extreme = { lf: 200, cf: 500, rf: 500 };   // an unrealistic, extreme asymmetry on purpose
  const result = parkPullAdjustment(extreme, 'R');
  assert.ok(result >= 0.85 && result <= 1.20, `must stay bounded even for extreme input, got ${result}`);
});

test('the adjustment scales in the right direction — a bigger real asymmetry produces a bigger (but still bounded) adjustment than a smaller one', () => {
  const slightAsymmetry = { lf: 335, cf: 400, rf: 325 };
  const bigAsymmetry = { lf: 360, cf: 400, rf: 310 };
  const slight = parkPullAdjustment(slightAsymmetry, 'R');
  const big = parkPullAdjustment(bigAsymmetry, 'R');
  assert.ok(big < slight, `a park with more real asymmetry should produce a stronger penalty for the disadvantaged side than a park with less`);
});
