// Tests for carryDistance — checked against real published research
// reference points, not just internal consistency.
// Run with: node --test tests/carry-distance.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { carryDistance } = require(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'carry-distance.js'));

test('reasonably approximates the HITf/x-calibrated reference point (100mph/26° -> ~405ft), given the documented ratio is a midpoint compromise', () => {
  const result = carryDistance(100, 26);
  // Wide, honest tolerance (+/-15%) since CARRY_RATIO_BASE is explicitly
  // a compromise between two disagreeing real sources, not fitted to
  // exactly reproduce either one.
  assert.ok(Math.abs(result - 405) / 405 < 0.15, `expected roughly 405ft, got ${result.toFixed(1)}ft`);
});

test('reasonably approximates Nathan\'s own worked example (100mph/29°/2500rpm -> 397ft)', () => {
  const result = carryDistance(100, 29);
  assert.ok(Math.abs(result - 397) / 397 < 0.15, `expected roughly 397ft, got ${result.toFixed(1)}ft`);
});

test('distance increases with exit velocity, holding launch angle fixed', () => {
  const d95 = carryDistance(95, 27);
  const d100 = carryDistance(100, 27);
  const d105 = carryDistance(105, 27);
  assert.ok(d100 > d95);
  assert.ok(d105 > d100);
});

test('roughly matches the cited "~5ft of distance per mph of exit velocity" relationship near the HR-relevant range', () => {
  const d99 = carryDistance(99, 27);
  const d100 = carryDistance(100, 27);
  const perMph = d100 - d99;
  assert.ok(perMph > 2 && perMph < 9, `expected roughly ~5ft/mph, got ${perMph.toFixed(2)}ft for this one mph step`);
});

test('distance peaks somewhere in the real, documented 25-35° optimal range, not at a much lower or higher angle', () => {
  const distances = {};
  for(let angle = 10; angle <= 60; angle += 5){
    distances[angle] = carryDistance(100, angle);
  }
  const peakAngle = Object.keys(distances).reduce((best, a) => distances[a] > distances[best] ? a : best);
  assert.ok(peakAngle >= 25 && peakAngle <= 35, `peak distance should land in the documented 25-35° range, got ${peakAngle}°`);
});

test('a ground ball (near-zero launch angle) or a near-vertical popup both travel a short distance', () => {
  assert.ok(carryDistance(100, 2) < 100);
  assert.ok(carryDistance(100, 85) < 100);
});

test('higher elevation increases carry distance — the real, documented Coors Field effect', () => {
  const seaLevel = carryDistance(100, 27, 0, 70);
  const coorsField = carryDistance(100, 27, 5280, 70);   // Denver's actual elevation
  assert.ok(coorsField > seaLevel, 'higher elevation should genuinely increase carry, matching the real, well-known Coors Field effect');
});

test('warmer temperature increases carry distance', () => {
  const cold = carryDistance(100, 27, 0, 40);
  const hot = carryDistance(100, 27, 0, 95);
  assert.ok(hot > cold);
});

test('zero or negative exit velocity/launch angle returns 0, not NaN or a negative distance', () => {
  assert.equal(carryDistance(0, 27), 0);
  assert.equal(carryDistance(100, 0), 0);
  assert.equal(carryDistance(100, -5), 0);
});
