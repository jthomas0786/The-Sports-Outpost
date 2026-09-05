// Tests for getParkDimensions — the real fix for a live production bug
// (Sept 5, 2026: Rate Field / Daikin Park name mismatches silently
// disabled the physics model for those two games, letting their
// players' HR probabilities go artificially unadjusted and dominate
// the entire Top 20 ranking). Run with:
//   node --test tests/park-dimensions-lookup.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFunctions } from './extract-from-index.js';

const { getParkDimensions, PARK_DIMENSIONS, PARK_NAME_ALIASES } =
  loadFunctions(['getParkDimensions', 'PARK_DIMENSIONS', 'PARK_NAME_ALIASES']);

test('a canonical, current venue name resolves directly', () => {
  const result = getParkDimensions('Fenway Park');
  assert.ok(result);
  assert.equal(result.lf, 310);
});

test('REGRESSION: the exact two names that broke production on Sept 5, 2026 now resolve correctly', () => {
  const rateField = getParkDimensions('Rate Field');
  assert.ok(rateField, '"Rate Field" (the White Sox\' current name) must resolve');
  assert.equal(rateField.lf, 330);

  const daikinPark = getParkDimensions('Daikin Park');
  assert.ok(daikinPark, '"Daikin Park" (the Astros\' current name) must resolve');
  assert.equal(daikinPark.lf, 315);
});

test('the old, pre-rename names still resolve too, via the alias table', () => {
  const oldWhiteSox = getParkDimensions('Guaranteed Rate Field');
  const newWhiteSox = getParkDimensions('Rate Field');
  assert.deepEqual(oldWhiteSox, newWhiteSox, 'old and new names must resolve to the identical dimension data');

  const oldAstros = getParkDimensions('Minute Maid Park');
  const newAstros = getParkDimensions('Daikin Park');
  assert.deepEqual(oldAstros, newAstros);
});

test('the newer field-level Dodger Stadium sponsor name also resolves', () => {
  const result = getParkDimensions('Uniqlo Field');
  assert.ok(result);
  assert.deepEqual(result, getParkDimensions('Dodger Stadium'));
});

test('CRITICAL: every single park name in the alias table actually points to a real, existing canonical entry — an alias to a typo would silently reintroduce the exact same class of bug', () => {
  for(const [alias, canonical] of Object.entries(PARK_NAME_ALIASES)){
    assert.ok(PARK_DIMENSIONS[canonical], `alias "${alias}" points to "${canonical}", which does not exist in PARK_DIMENSIONS`);
  }
});

test('a genuinely unknown venue name returns null, not a crash — the safe, graceful degradation this whole fix is about', () => {
  assert.equal(getParkDimensions('Some Future Renamed Park Nobody Has Heard Of Yet'), null);
});

test('null, undefined, or empty venue name all safely return null', () => {
  assert.equal(getParkDimensions(null), null);
  assert.equal(getParkDimensions(undefined), null);
  assert.equal(getParkDimensions(''), null);
});
