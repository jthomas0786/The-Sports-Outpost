// Unit tests for mapPARoll — the pure outcome mapper for a single plate
// appearance. Run with: node --test tests/outcome-mapper.test.js
//
// This tests the REAL function extracted live out of index.html (see
// extract-from-index.js), not a hand-copied duplicate — a test passing
// here means the actual production code behaves correctly, not a stand-in
// for it that could silently drift out of sync.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFunctions } from './extract-from-index.js';

const { mapPARoll } = loadFunctions(['mapPARoll']);

// A representative, realistic set of thresholds — cumulative, matching
// what paRates() actually produces for a real player.
const T = { cHR: 0.05, cDbl: 0.10, cTrp: 0.11, cSgl: 0.32, cBB: 0.40, cK: 0.62 };

test('a roll below cHR is a home run', () => {
  const r = mapPARoll(0.0, T);
  assert.equal(r.type, 'HR');
  assert.deepEqual(r, { type:'HR', hr:1, h:1, tb:4, dbl:0, trp:0, sgl:0 });
});

test('a roll at exactly cHR is NOT a home run (thresholds are exclusive upper bounds)', () => {
  // roll < cHR is the actual production check — roll === cHR must fall
  // into the next bucket, not double-count the boundary.
  const r = mapPARoll(T.cHR, T);
  assert.notEqual(r.type, 'HR');
  assert.equal(r.type, '2B');
});

test('a roll between cHR and cDbl is a double', () => {
  const r = mapPARoll((T.cHR + T.cDbl) / 2, T);
  assert.deepEqual(r, { type:'2B', hr:0, h:1, tb:2, dbl:1, trp:0, sgl:0 });
});

test('a roll between cDbl and cTrp is a triple', () => {
  const r = mapPARoll((T.cDbl + T.cTrp) / 2, T);
  assert.deepEqual(r, { type:'3B', hr:0, h:1, tb:3, dbl:0, trp:1, sgl:0 });
});

test('a roll between cTrp and cSgl is a single', () => {
  const r = mapPARoll((T.cTrp + T.cSgl) / 2, T);
  assert.deepEqual(r, { type:'1B', hr:0, h:1, tb:1, dbl:0, trp:0, sgl:1 });
});

test('a roll between cSgl and cBB is a walk — no hit, no total base', () => {
  const r = mapPARoll((T.cSgl + T.cBB) / 2, T);
  assert.deepEqual(r, { type:'BB', hr:0, h:0, tb:0, dbl:0, trp:0, sgl:0 });
});

test('a roll between cBB and cK is a strikeout', () => {
  const r = mapPARoll((T.cBB + T.cK) / 2, T);
  assert.deepEqual(r, { type:'K', hr:0, h:0, tb:0, dbl:0, trp:0, sgl:0 });
});

test('a roll at or above cK is a non-strikeout out', () => {
  assert.equal(mapPARoll(T.cK, T).type, 'OUT');
  assert.equal(mapPARoll(0.999999, T).type, 'OUT');
});

test('every outcome carries the correct total-base count (HR=4, 3B=3, 2B=2, 1B=1, everything else=0)', () => {
  assert.equal(mapPARoll(0, T).tb, 4);
  assert.equal(mapPARoll((T.cDbl + T.cTrp) / 2, T).tb, 3);
  assert.equal(mapPARoll((T.cHR + T.cDbl) / 2, T).tb, 2);
  assert.equal(mapPARoll((T.cTrp + T.cSgl) / 2, T).tb, 1);
  assert.equal(mapPARoll((T.cSgl + T.cBB) / 2, T).tb, 0);
  assert.equal(mapPARoll((T.cBB + T.cK) / 2, T).tb, 0);
  assert.equal(mapPARoll(1, T).tb, 0);
});

test('exactly one of HR/2B/3B/1B/BB/K/OUT fires per call — outcomes never overlap', () => {
  // Sweep finely across the full [0,1) range and confirm every single
  // point maps to exactly one recognized type, with no gaps and no
  // unexpected values — a genuine partition of the probability space.
  const validTypes = new Set(['HR','2B','3B','1B','BB','K','OUT']);
  for(let i = 0; i < 1000; i++){
    const roll = i / 1000;
    const r = mapPARoll(roll, T);
    assert.ok(validTypes.has(r.type), `roll=${roll} produced an unrecognized type: ${r.type}`);
  }
});

test('degenerate thresholds (a rate of exactly 0) never fire that outcome', () => {
  // If a player's triple rate rounds to zero, cTrp === cDbl exactly — the
  // triple "band" has zero width and must never be reachable.
  const zeroTrp = { cHR: 0.05, cDbl: 0.10, cTrp: 0.10, cSgl: 0.30, cBB: 0.38, cK: 0.60 };
  for(let i = 0; i < 1000; i++){
    assert.notEqual(mapPARoll(i / 1000, zeroTrp).type, '3B');
  }
});

test('realistic HR-rate roll distribution matches the intended probability within sampling tolerance', () => {
  // Not testing Math.random() here — mapPARoll itself takes no randomness.
  // This confirms that if inputs were uniform on [0,1), the HR bucket's
  // width (cHR) is what actually determines the HR frequency, end to end
  // through the real function — a sanity check on the mapping, not RNG quality.
  const trials = 100000;
  let hrCount = 0;
  for(let i = 0; i < trials; i++){
    if(mapPARoll(Math.random(), T).type === 'HR') hrCount++;
  }
  const observed = hrCount / trials;
  assert.ok(Math.abs(observed - T.cHR) < 0.01, `observed HR rate ${observed} should be close to threshold ${T.cHR}`);
});
