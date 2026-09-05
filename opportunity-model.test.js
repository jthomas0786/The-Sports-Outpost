// Unit tests for projectExpPA — the opportunity model replacing the old
// flat "4.3 PA for every single player" constant. Run with:
//   node --test tests/opportunity-model.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFunctions } from './extract-from-index.js';

// projectExpPA references MODEL.league.paPerGame — provide a minimal,
// real-shaped MODEL rather than the full config, since that's the only
// piece this function actually reads.
const MODEL_HELPER = `const MODEL = { league: { paPerGame: 4.30 } };`;
const { projectExpPA } = loadFunctions(['projectExpPA'], MODEL_HELPER);

test('a player with zero games played falls back to the league average exactly', () => {
  const result = projectExpPA({ g: 0, pa: 0 });
  assert.equal(result, 4.30);
});

test('a player with no g/pa fields at all (undefined) also falls back safely, no NaN', () => {
  const result = projectExpPA({});
  assert.equal(result, 4.30);
  assert.ok(!Number.isNaN(result));
});

test('a real leadoff-type hitter (high PA/G) projects ABOVE league average', () => {
  // 700 PA over 150 games = 4.67 PA/G, a real leadoff-caliber rate.
  const result = projectExpPA({ g: 150, pa: 700 });
  assert.ok(result > 4.30, `expected above league average, got ${result}`);
});

test('a real bottom-of-order hitter (low PA/G) projects BELOW league average', () => {
  // 550 PA over 150 games = 3.67 PA/G, a real bottom-of-order rate.
  const result = projectExpPA({ g: 150, pa: 550 });
  assert.ok(result < 4.30, `expected below league average, got ${result}`);
});

test('a large, established sample (150+ games) trusts the player\'s own rate heavily', () => {
  // With 150 games against a 20-game regression constant, the result
  // should sit very close to the player's own raw rate, not the league average.
  const g = 150, pa = 700;
  const rawRate = pa / g;
  const result = projectExpPA({ g, pa });
  assert.ok(Math.abs(result - rawRate) < 0.1, `expected close to raw rate ${rawRate}, got ${result}`);
});

test('a tiny sample (a few games) stays close to league average, not the noisy raw rate', () => {
  // 3 games, 20 PA -> a raw rate of 6.67 PA/G, an outlier driven by noise
  // (an extra-inning game, a doubleheader) rather than real signal.
  const result = projectExpPA({ g: 3, pa: 20 });
  const rawRate = 20 / 3;
  assert.ok(Math.abs(result - 4.30) < Math.abs(result - rawRate),
    `with only 3 games, result (${result}) should sit closer to league average (4.30) than to the noisy raw rate (${rawRate.toFixed(2)})`);
});

test('projection increases monotonically with games played toward the true rate, never overshoots past it', () => {
  // A player who is genuinely a 4.8 PA/G hitter — confidence in that
  // number should climb smoothly as games accumulate, and never produce
  // a projection outside the [league average, true rate] range.
  const trueRate = 4.8;
  let prev = 4.30;
  for(const g of [1, 5, 10, 20, 40, 80, 150]){
    const pa = Math.round(trueRate * g);
    const result = projectExpPA({ g, pa });
    assert.ok(result >= 4.30 - 1e-9 && result <= trueRate + 1e-9,
      `at g=${g}, result ${result} should stay within [4.30, ${trueRate}]`);
    assert.ok(result >= prev - 1e-9, `at g=${g}, result ${result} should not be lower than the previous, smaller sample's ${prev}`);
    prev = result;
  }
});

test('two players with identical career PA/G rates but different sample sizes get DIFFERENT projections', () => {
  // Same raw rate (4.5 PA/G), but one has 5 games, one has 120 — the
  // model should trust the larger sample more and project it closer to
  // 4.5, while the smaller sample gets pulled further toward league average.
  const small = projectExpPA({ g: 5, pa: 22.5 });
  const large = projectExpPA({ g: 120, pa: 540 });
  assert.ok(Math.abs(large - 4.5) < Math.abs(small - 4.5),
    `the 120-game sample (${large}) should land closer to the true 4.5 rate than the 5-game sample (${small})`);
});

test('a CONFIRMED lineup slot trusts the player\'s own rate MORE than an otherwise-identical unconfirmed player', () => {
  // Same games, same PA, same raw rate — the only difference is whether
  // tonight's lineup slot is confirmed. The confirmed player should land
  // closer to their own true rate, since real, tonight-specific role
  // information genuinely reduces uncertainty.
  const trueRate = 4.6;
  const g = 15, pa = Math.round(trueRate * g);
  const unconfirmed = projectExpPA({ g, pa });
  const confirmed = projectExpPA({ g, pa, battingOrder: 2 });
  assert.ok(Math.abs(confirmed - trueRate) < Math.abs(unconfirmed - trueRate),
    `confirmed (${confirmed}) should sit closer to the true rate ${trueRate} than unconfirmed (${unconfirmed})`);
});

test('two players with genuinely different confirmed lineup slots still each reflect their OWN real season rate, not some shared slot-based number', () => {
  // This function deliberately does not invent a "PA by slot" formula —
  // confirms it isn't secretly keying off the slot NUMBER itself, only
  // using confirmation as a trust signal on each player's own real rate.
  const leadoff = projectExpPA({ g: 20, pa: 92, battingOrder: 1 });   // 4.6 PA/G
  const eighth = projectExpPA({ g: 20, pa: 70, battingOrder: 8 });    // 3.5 PA/G
  assert.ok(leadoff > eighth, 'the leadoff hitter\'s own higher real rate should still produce a higher projection');
});
