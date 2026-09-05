// Unit tests for computeCombinedOdds — the client-side parlay pricing
// preview that MUST exactly match what place_wager() computes server-side.
// Run with: node --test tests/combined-odds.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFunctions } from './extract-from-index.js';

function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

const helperSource = `
function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
`;

const { computeCombinedOdds, previewOdds, resolvePlayerForLeg, jointHRProbability, simulatePlayer } =
  loadFunctions(['computeCombinedOdds', 'previewOdds', 'resolvePlayerForLeg', 'jointHRProbability', 'simulatePlayer'], helperSource);

/** Reimplements place_wager()'s REAL SQL formula in JS, independently,
 *  for comparison — deliberately NOT calling any of the extracted client
 *  functions, so this is a genuine independent check rather than testing
 *  the client's formula against a copy of itself. Mirrors
 *  wagering-schema.sql exactly: shade each leg separately, multiply,
 *  divide by the (already-clamped) correlation adjustment, cap at max. */
function serverFormula(legs, houseEdge, maxMult, correlationAdjustment){
  const clampedCorrelation = Math.min(2.0, Math.max(0.5, correlationAdjustment ?? 1));
  const naiveCombined = legs.reduce((acc, l) => {
    const shaded = Math.min(0.90, (l.pct / 100) * (1 + houseEdge));
    return acc * (shaded > 0 ? 1 / shaded : 0);
  }, 1);
  return Math.min(naiveCombined / clampedCorrelation, maxMult);
}

function mockPlayer(id, gamePk, hrHitPath, hrExactPct){
  return { id, game: { gamePk }, _sim: { hr: { exact: hrExactPct }, hrHitPath } };
}

test('a single leg produces the same result as the plain previewOdds formula (no correlation possible with one leg)', () => {
  const legs = [{ pct: 25, player_id: 1, game_pk: 100 }];
  global.allBatters = [];   // no resolvable player -> falls back to naive, which is correct for 1 leg anyway
  const { multiplier } = computeCombinedOdds(legs, 0.07, 20);
  const expected = Math.min(previewOdds(25, 0.07), 20);
  assert.ok(Math.abs(multiplier - expected) < 1e-9);
});

test('two legs from DIFFERENT games (no correlation) match the server formula with correlationAdjustment=1', () => {
  const pathsA = new Uint8Array(1000);
  const pathsB = new Uint8Array(1000);
  global.allBatters = [
    mockPlayer(1, 100, pathsA, 20),
    mockPlayer(2, 200, pathsB, 20),   // different game
  ];
  const legs = [
    { pct: 20, player_id: 1, game_pk: 100 },
    { pct: 20, player_id: 2, game_pk: 200 },
  ];
  const { multiplier, correlationAdjustment } = computeCombinedOdds(legs, 0.07, 20);
  assert.ok(Math.abs(correlationAdjustment - 1) < 1e-9, 'different games should have no correlation adjustment');
  const serverResult = serverFormula(legs, 0.07, 20, correlationAdjustment);
  assert.ok(Math.abs(multiplier - serverResult) < 1e-9, `client ${multiplier} must exactly match server ${serverResult}`);
});

test('CRITICAL: two correlated teammates — client preview EXACTLY matches the independently-reimplemented server formula', () => {
  // Real overlap: both hit together on paths 0 and 1, out of 10.
  const pathsA = new Uint8Array([1,1,0,0,1,0,0,0,1,0]);
  const pathsB = new Uint8Array([1,1,0,0,0,0,0,0,0,0]);
  global.allBatters = [
    mockPlayer(1, 100, pathsA, 40),
    mockPlayer(2, 100, pathsB, 20),   // SAME game — real correlation
  ];
  const legs = [
    { pct: 40, player_id: 1, game_pk: 100 },
    { pct: 20, player_id: 2, game_pk: 100 },
  ];
  const { multiplier, correlationAdjustment } = computeCombinedOdds(legs, 0.07, 20);
  assert.notEqual(correlationAdjustment, 1, 'same-game legs must show a real, non-trivial correlation adjustment');

  const serverResult = serverFormula(legs, 0.07, 20, correlationAdjustment);
  assert.ok(Math.abs(multiplier - serverResult) < 1e-9,
    `THIS IS THE MOST IMPORTANT ASSERTION IN THIS FILE: client (${multiplier}) must exactly match what the server will actually pay out (${serverResult}) — any mismatch here means showing the user one number and paying a different one`);
});

test('an unresolvable player falls back to the naive formula with correlationAdjustment=1, not a crash or wrong number', () => {
  global.allBatters = [];   // nobody resolvable
  const legs = [
    { pct: 20, player_id: 999, game_pk: 100 },
    { pct: 20, player_id: 998, game_pk: 100 },
  ];
  const { multiplier, correlationAdjustment } = computeCombinedOdds(legs, 0.07, 20);
  assert.equal(correlationAdjustment, 1);
  const expected = Math.min(previewOdds(20, 0.07) * previewOdds(20, 0.07), 20);
  assert.ok(Math.abs(multiplier - expected) < 1e-9);
});

test('the max multiplier cap is still respected even with a favorable correlation adjustment', () => {
  const pathsA = new Uint8Array(100).fill(1);   // always hits
  const pathsB = new Uint8Array(100).fill(1);   // always hits, perfectly correlated
  global.allBatters = [
    mockPlayer(1, 100, pathsA, 5),
    mockPlayer(2, 100, pathsB, 5),
  ];
  const legs = [
    { pct: 5, player_id: 1, game_pk: 100 },
    { pct: 5, player_id: 2, game_pk: 100 },
  ];
  const maxMult = 20;
  const { multiplier } = computeCombinedOdds(legs, 0.07, maxMult);
  assert.ok(multiplier <= maxMult, `multiplier ${multiplier} must never exceed the configured cap of ${maxMult}`);
});
