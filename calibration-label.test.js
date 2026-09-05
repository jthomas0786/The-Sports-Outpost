// Tests for calibrationLabel — the spec's "ship rule": don't show a bare
// percentage as if it were simply true without checking real calibration.
// Run with: node --test tests/calibration-label.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFunctions } from './extract-from-index.js';

const { calibrationLabel } = loadFunctions(['calibrationLabel']);

test('a null bucket (no calibration data available) returns null, not a crash', () => {
  assert.equal(calibrationLabel(null), null);
  assert.equal(calibrationLabel(undefined), null);
});

test('a tiny sample size never gets labeled, even with a huge apparent gap', () => {
  // n=5 with hitRate 0.05 vs meanProb 0.30 is a massive apparent gap,
  // but with only 5 observations this is almost certainly noise —
  // must NOT confidently label something this thin.
  const result = calibrationLabel({ n: 5, hitRate: 0.05, meanProb: 0.30 });
  assert.equal(result, null);
});

test('a well-sampled bucket with a genuine gap is correctly labeled overconfident', () => {
  // meanProb higher than hitRate = the model claims more than actually happens.
  const result = calibrationLabel({ n: 200, hitRate: 0.15, meanProb: 0.22 });
  assert.equal(result, 'overconfident');
});

test('a well-sampled bucket with the opposite gap is correctly labeled underconfident', () => {
  // meanProb lower than hitRate = the model claims less than actually happens.
  const result = calibrationLabel({ n: 200, hitRate: 0.25, meanProb: 0.19 });
  assert.equal(result, 'underconfident');
});

test('a well-sampled bucket that is genuinely close gets no label at all', () => {
  const result = calibrationLabel({ n: 200, hitRate: 0.20, meanProb: 0.205 });
  assert.equal(result, null);
});

test('the 3-point gap threshold is a real boundary, not approximate', () => {
  const justUnder = calibrationLabel({ n: 200, hitRate: 0.20, meanProb: 0.229 });
  const justOver = calibrationLabel({ n: 200, hitRate: 0.20, meanProb: 0.231 });
  assert.equal(justUnder, null);
  assert.equal(justOver, 'overconfident');
});

test('REAL DATA: the actual current A+ grade calibration data is correctly labeled overconfident', () => {
  // Pulled directly from the real model-logs/calibration-history.json:
  // A+ grade shows n=142, hitRate ~16.9%, meanProb ~24.5% — a genuine,
  // well-sampled, real gap that exists in production data right now.
  const realAPlusBucket = { n: 142, hits: 24, hitRate: 0.16901408450704225, meanProb: 0.24547323943661975 };
  const result = calibrationLabel(realAPlusBucket);
  assert.equal(result, 'overconfident', 'the real, current A+ grade data should surface as overconfident, not be silently hidden');
});
