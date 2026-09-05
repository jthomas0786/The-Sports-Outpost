// Tests for extractLineupSlots — extracts real MLB lineup slots from the
// live boxscore feed, unfiltered by whether a player has batted yet.
// Run with: node --test tests/lineup-slots.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFunctions } from './extract-from-index.js';

const { extractLineupSlots } = loadFunctions(['extractLineupSlots']);

function mockSide(players){
  return { players };
}

test('extracts a real, already-established lineup correctly — slot is the first digit of the 3-digit MLB battingOrder string', () => {
  const side = mockSide({
    ID543807: { person: { id: 543807, fullName: 'George Springer' }, battingOrder: '100' },
    ID665489: { person: { id: 665489, fullName: 'Vladimir Guerrero Jr.' }, battingOrder: '300' },
    ID624415: { person: { id: 624415, fullName: 'Cavan Biggio' }, battingOrder: '900' },
  });
  const result = extractLineupSlots(side);
  assert.equal(result.get(543807), 1);
  assert.equal(result.get(665489), 3);
  assert.equal(result.get(624415), 9);
});

test('a substitute (battingOrder not ending in 00) still resolves to the correct real slot', () => {
  // "501" = a substitute who entered in the 5-hole later in the game —
  // still genuinely slot 5, matching real MLB battingOrder semantics.
  const side = mockSide({
    ID111111: { person: { id: 111111, fullName: 'Some Substitute' }, battingOrder: '501' },
  });
  const result = extractLineupSlots(side);
  assert.equal(result.get(111111), 5);
});

test('CRITICAL: a player with no battingOrder at all (lineup not posted yet) is correctly excluded, not defaulted to some slot', () => {
  const side = mockSide({
    ID543807: { person: { id: 543807, fullName: 'George Springer' } },   // no battingOrder field
  });
  const result = extractLineupSlots(side);
  assert.equal(result.has(543807), false);
  assert.equal(result.size, 0);
});

test('a pitcher or bench player with no batting order present is not included, but real hitters still are', () => {
  const side = mockSide({
    ID543807: { person: { id: 543807, fullName: 'George Springer' }, battingOrder: '100' },
    ID999999: { person: { id: 999999, fullName: 'Some Reliever' } },   // pitcher, no battingOrder
  });
  const result = extractLineupSlots(side);
  assert.equal(result.get(543807), 1);
  assert.equal(result.has(999999), false);
  assert.equal(result.size, 1);
});

test('a null or missing side returns an empty map rather than throwing', () => {
  assert.equal(extractLineupSlots(null).size, 0);
  assert.equal(extractLineupSlots(undefined).size, 0);
  assert.equal(extractLineupSlots({}).size, 0);
});

test('a malformed player entry (no person object) is safely skipped, not a crash', () => {
  const side = mockSide({
    ID1: { battingOrder: '100' },   // missing person entirely
    ID543807: { person: { id: 543807, fullName: 'George Springer' }, battingOrder: '200' },
  });
  const result = extractLineupSlots(side);
  assert.equal(result.get(543807), 2);
  assert.equal(result.size, 1);
});
