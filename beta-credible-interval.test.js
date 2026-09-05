// Unit tests for betaCredibleInterval — the real posterior interval behind
// p_lo/p_hi in the frozen prediction contract. Run with:
//   node --test tests/beta-credible-interval.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFunctions } from './extract-from-index.js';

// betaCredibleInterval doesn't call clamp() from anywhere outside itself
// in a way that needs extraction — but it's declared elsewhere in
// index.html, so provide a real, matching implementation as a helper
// dependency rather than assume its behavior.
const CLAMP_HELPER = `function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }`;
const { betaCredibleInterval } = loadFunctions(['betaCredibleInterval'], CLAMP_HELPER);

test('with zero real observations, the mean equals the league rate exactly (pure prior)', () => {
  const { mean } = betaCredibleInterval(0, 0, 0.03, 220);
  assert.ok(Math.abs(mean - 0.03) < 1e-9);
});

test('mean matches paRates()\'s own shrinkage formula exactly for a real sample', () => {
  // paRates(): w = pa/(pa+regressionPA); reg = rate*w + leagueRate*(1-w)
  const pa = 300, hits = 20, leagueRate = 0.03, regressionPA = 220;
  const rate = hits / pa;
  const w = pa / (pa + regressionPA);
  const expectedMean = rate * w + leagueRate * (1 - w);
  const { mean } = betaCredibleInterval(hits, pa, leagueRate, regressionPA);
  assert.ok(Math.abs(mean - expectedMean) < 1e-9, `expected ${expectedMean}, got ${mean}`);
});

test('the interval always contains the mean, and lo <= hi', () => {
  const cases = [[0, 0, 0.03, 220], [5, 50, 0.03, 220], [40, 600, 0.03, 220], [1, 5, 0.15, 220]];
  for(const [hits, pa, lg, reg] of cases){
    const { lo, hi, mean } = betaCredibleInterval(hits, pa, lg, reg);
    assert.ok(lo <= mean, `lo (${lo}) should be <= mean (${mean})`);
    assert.ok(hi >= mean, `hi (${hi}) should be >= mean (${mean})`);
    assert.ok(lo <= hi);
  }
});

test('bounds always stay within [0, 1] even for extreme inputs', () => {
  const cases = [[0, 1, 0.001, 220], [1000, 1000, 0.5, 220], [0, 0, 0.99, 220]];
  for(const [hits, pa, lg, reg] of cases){
    const { lo, hi } = betaCredibleInterval(hits, pa, lg, reg);
    assert.ok(lo >= 0 && lo <= 1, `lo out of bounds: ${lo}`);
    assert.ok(hi >= 0 && hi <= 1, `hi out of bounds: ${hi}`);
  }
});

test('more real at-bats at a consistent rate narrows the interval (more confidence)', () => {
  // Same observed rate (10%), increasing sample size — the interval
  // around it should genuinely tighten, not stay flat or widen.
  const small = betaCredibleInterval(10, 100, 0.03, 220);
  const large = betaCredibleInterval(100, 1000, 0.03, 220);
  const smallWidth = small.hi - small.lo;
  const largeWidth = large.hi - large.lo;
  assert.ok(largeWidth < smallWidth, `expected narrower interval with more data: ${largeWidth} should be < ${smallWidth}`);
});

test('a callup with a hot small sample sits between the prior and their raw rate, not at either extreme', () => {
  // 5 HR in 60 PA is a raw 8.3% rate, far above a ~3% league HR rate.
  // The regressed mean should land strictly between the two, and the
  // interval should be wide, reflecting real uncertainty about a
  // player with so little MLB track record.
  const { lo, hi, mean } = betaCredibleInterval(5, 60, 0.03, 220);
  assert.ok(mean > 0.03 && mean < 5/60, `mean ${mean} should sit strictly between league rate and raw rate`);
  assert.ok(hi - lo > 0.02, 'a 60-PA sample should still carry a meaningfully wide interval');
});
