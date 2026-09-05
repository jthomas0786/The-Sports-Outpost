// Unit tests for jointHRProbability — the correlation-aware replacement
// for naively multiplying independent leg probabilities. Run with:
//   node --test tests/joint-probability.test.js
//
// Uses mock players with a pre-populated p._sim (simulatePlayer returns
// its cache immediately if p._sim is already set), so these tests
// exercise the real jointHRProbability logic without needing to stand up
// the full simulation dependency chain.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFunctions } from './extract-from-index.js';

// simulatePlayer is needed because jointHRProbability calls it directly —
// but with p._sim already set, it returns immediately without touching
// any of its own heavy dependencies (paRates, contextFor, etc.).
const { jointHRProbability, simulatePlayer } = loadFunctions(['jointHRProbability', 'simulatePlayer']);

function mockPlayer(id, gamePk, hrHitPath, hrExactPct){
  return {
    id,
    game: { gamePk },
    _sim: { hr: { exact: hrExactPct }, hrHitPath },
  };
}

test('a single player returns exactly their own probability, no correlation math involved', () => {
  const p = mockPlayer(1, 100, new Uint8Array([1,0,1,0]), 25);
  const result = jointHRProbability([p]);
  assert.equal(result, 0.25);
});

test('an empty list returns 1 (a neutral multiplier, not 0)', () => {
  assert.equal(jointHRProbability([]), 1);
  assert.equal(jointHRProbability(null), 1);
});

test('two players in DIFFERENT games multiply independently, exactly matching the old naive formula', () => {
  const pathsA = new Uint8Array([1,1,0,0,0,0,0,0,0,0]);   // hits 2/10 paths
  const pathsB = new Uint8Array([0,0,1,1,0,0,0,0,0,0]);   // hits 2/10 paths, no overlap with A
  const a = mockPlayer(1, 100, pathsA, 20);
  const b = mockPlayer(2, 200, pathsB, 20);   // DIFFERENT game
  const result = jointHRProbability([a, b]);
  // Different games -> independent -> exactly p(a) * p(b), same as before.
  assert.ok(Math.abs(result - (0.20 * 0.20)) < 1e-9);
});

test('CRITICAL: two players in the SAME game use their real shared-path overlap, not the naive product', () => {
  // Both hit on paths 0 and 1 together (genuine overlap/correlation) —
  // the true joint rate here is 2/10 = 0.20, NOT the naive 0.2*0.2=0.04
  // an independent-assumption calculation would produce.
  const pathsA = new Uint8Array([1,1,0,0,1,0,0,0,1,0]);   // hits 4/10
  const pathsB = new Uint8Array([1,1,0,0,0,0,0,0,0,0]);   // hits 2/10, both overlap with A's hits
  const a = mockPlayer(1, 100, pathsA, 40);
  const b = mockPlayer(2, 100, pathsB, 20);   // SAME game as a
  const result = jointHRProbability([a, b]);
  const trueJoint = 2 / 10;          // paths 0 and 1: both hit
  const naiveProduct = 0.40 * 0.20;  // what the old, wrong pricing would compute
  assert.ok(Math.abs(result - trueJoint) < 1e-9, `expected the true overlap ${trueJoint}, got ${result}`);
  assert.notEqual(result, naiveProduct);
});

test('three players in the same game requires ALL THREE to hit on the same path', () => {
  const pathsA = new Uint8Array([1,1,1,0,0]);
  const pathsB = new Uint8Array([1,1,0,0,0]);
  const pathsC = new Uint8Array([1,0,1,0,0]);
  // Only path 0 has all three hitting.
  const a = mockPlayer(1, 100, pathsA, 60);
  const b = mockPlayer(2, 100, pathsB, 40);
  const c = mockPlayer(3, 100, pathsC, 40);
  const result = jointHRProbability([a, b, c]);
  assert.ok(Math.abs(result - (1/5)) < 1e-9);
});

test('a mix of correlated (same game) and independent (different game) groups combines correctly', () => {
  // a+b share game 100 (correlated), c is alone in game 200 (independent).
  const pathsA = new Uint8Array([1,1,0,0]);
  const pathsB = new Uint8Array([1,0,1,0]);
  // a+b joint = 1/4 (only path 0 has both)
  const a = mockPlayer(1, 100, pathsA, 50);
  const b = mockPlayer(2, 100, pathsB, 50);
  const c = mockPlayer(3, 200, new Uint8Array([1,0,0,0]), 25);
  const result = jointHRProbability([a, b, c]);
  const expected = (1/4) * 0.25;   // correlated group's real joint * independent player's own prob
  assert.ok(Math.abs(result - expected) < 1e-9);
});

test('perfectly correlated teammates (identical hit paths) show joint prob equal to either one alone, not the naive tiny product', () => {
  // If two "teammates" always hit or miss together (an extreme, illustrative
  // case), their true joint probability is just that shared rate — very
  // different from what an independence assumption would predict.
  const sharedPaths = new Uint8Array([1,1,0,1,0,0,1,0,0,0]);   // 4/10
  const a = mockPlayer(1, 100, sharedPaths, 40);
  const b = mockPlayer(2, 100, sharedPaths, 40);
  const result = jointHRProbability([a, b]);
  assert.ok(Math.abs(result - 0.40) < 1e-9, `perfectly correlated legs should show joint prob = the shared rate (0.40), got ${result}`);
  assert.ok(result > 0.40 * 0.40 * 2, 'should be dramatically higher than the naive independent product would suggest');
});
