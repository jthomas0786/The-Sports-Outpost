// Unit tests for randNormal and getGameEffects — the shared per-path
// correlation mechanism. Run with:
//   node --test tests/game-effects.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFunctions } from './extract-from-index.js';

const { randNormal, getGameEffects, GAME_EFFECT_SD } = loadFunctions(['randNormal', 'getGameEffects', 'GAME_EFFECT_SD']);

test('randNormal produces a distribution with mean close to 0 over many draws', () => {
  const n = 50000;
  let sum = 0;
  for(let i = 0; i < n; i++) sum += randNormal();
  const mean = sum / n;
  assert.ok(Math.abs(mean) < 0.03, `mean ${mean} should be close to 0 over ${n} draws`);
});

test('randNormal produces a distribution with standard deviation close to 1', () => {
  const n = 50000;
  const draws = Array.from({ length: n }, () => randNormal());
  const mean = draws.reduce((a, b) => a + b, 0) / n;
  const variance = draws.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  assert.ok(Math.abs(sd - 1) < 0.03, `SD ${sd} should be close to 1 over ${n} draws`);
});

test('randNormal is not just returning a fixed value or NaN', () => {
  const draws = Array.from({ length: 100 }, () => randNormal());
  assert.ok(draws.every(d => !Number.isNaN(d)), 'no draw should be NaN');
  assert.ok(new Set(draws).size > 90, 'draws should genuinely vary, not repeat the same value');
});

test('getGameEffects returns an array of exactly simRuns length, all positive', () => {
  const game = {};
  const effects = getGameEffects(game, 1000);
  assert.equal(effects.length, 1000);
  assert.ok(Array.from(effects).every(v => v > 0), 'every effect must be strictly positive (log-normal, never negative)');
});

test('CRITICAL: calling getGameEffects twice on the SAME game object returns the SAME array — this is what makes correlation actually work', () => {
  const game = {};
  const first = getGameEffects(game, 1000);
  const second = getGameEffects(game, 1000);
  assert.equal(first, second, 'must be the identical array reference, not just equal values — this is the actual sharing mechanism teammates rely on');
  assert.deepEqual(Array.from(first), Array.from(second));
});

test('CRITICAL: two DIFFERENT game objects get DIFFERENT, independently-drawn effect arrays', () => {
  const gameA = {};
  const gameB = {};
  const effectsA = getGameEffects(gameA, 1000);
  const effectsB = getGameEffects(gameB, 1000);
  assert.notEqual(effectsA, effectsB);
  // Genuinely different random draws — vanishingly unlikely to be identical by chance.
  assert.notDeepEqual(Array.from(effectsA), Array.from(effectsB));
});

test('the effects array is centered near 1.0 (a neutral multiplier) on average', () => {
  // exp(N(0, sigma)) has a mean slightly above 1 (log-normal's known
  // upward bias), but should stay close to neutral, not drift the
  // average HR rate up or down by design.
  const game = {};
  const effects = getGameEffects(game, 50000);
  const mean = Array.from(effects).reduce((a, b) => a + b, 0) / effects.length;
  assert.ok(Math.abs(mean - 1) < 0.05, `mean effect ${mean} should stay close to a neutral 1.0`);
});

test('a null game returns null rather than throwing', () => {
  assert.equal(getGameEffects(null, 1000), null);
});
