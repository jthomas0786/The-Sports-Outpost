#!/usr/bin/env node
import assert from 'node:assert/strict';
import { halftimeBoardCurrent, isHalftimeWarmupState, isOfficialHalftimeState } from '../sports/nfl/halftime-validity.js';

const NOW=Date.parse('2026-09-14T20:00:00Z');
const freshBoard={
  gameId:'g1',
  ready:true,
  generatedAt:'2026-09-14T19:56:00Z',
  state:{status:'in',statusDetail:'2:00 - 2nd',period:2,clockMin:2,awayScore:10,homeScore:14},
  candidates:[{id:'a',oddsAgeSeconds:20},{id:'b',oddsAgeSeconds:30}],
};

// Official halftime is multi-signal: provider status metadata, provider detail,
// or the authoritative Q2 0:00 structure can establish halftime.
assert.equal(isOfficialHalftimeState({gameId:'g1',status:'in',statusName:'STATUS_HALFTIME',period:2,clockMin:null}),true);
assert.equal(isOfficialHalftimeState({gameId:'g1',status:'in',statusDetail:'Halftime',period:2,clockMin:null}),true);
assert.equal(isOfficialHalftimeState({gameId:'g1',status:'in',period:2,clockMin:0}),true);

// Late Q2 is only prewarm; it must never unlock READY before halftime.
assert.equal(isOfficialHalftimeState({gameId:'g1',status:'in',period:2,clockMin:1.25}),false);
assert.equal(isHalftimeWarmupState({gameId:'g1',status:'in',period:2,clockMin:1.25}),true);
assert.equal(isOfficialHalftimeState({gameId:'g1',status:'in',period:3,clockMin:15}),false);
assert.equal(isOfficialHalftimeState({gameId:'g1',status:'post',statusDetail:'Halftime',period:2,clockMin:0}),false);

const officialHalf={gameId:'g1',status:'in',statusName:'STATUS_HALFTIME',period:2,clockMin:0,awayScore:10,homeScore:14,lastFetchedAt:NOW-1000};

// A prewarmed 50K board can unlock immediately at halftime if the authoritative
// score still matches and its odds remain fresh.
assert.equal(halftimeBoardCurrent(freshBoard,officialHalf,NOW),true);

// State from another game, a score change before halftime, or a late-Q2 state
// cannot leak through and block/promote the wrong readiness state.
assert.equal(halftimeBoardCurrent(freshBoard,{...officialHalf,gameId:'g2'},NOW),false);
assert.equal(halftimeBoardCurrent(freshBoard,{...officialHalf,awayScore:13},NOW),false);
assert.equal(halftimeBoardCurrent(freshBoard,{...officialHalf,statusName:'',statusDetail:'1:00 - 2nd',clockMin:1},NOW),false);

// Freshness protections remain intact.
assert.equal(halftimeBoardCurrent({...freshBoard,generatedAt:'2026-09-14T18:00:00Z'},officialHalf,NOW),false);
assert.equal(halftimeBoardCurrent({...freshBoard,candidates:[{oddsAgeSeconds:2200},{oddsAgeSeconds:20}]},officialHalf,NOW),false);

console.log('✓ NFL halftime readiness regression passed');
console.log('  ✓ late-Q2 prewarm is separated from official halftime READY');
console.log('  ✓ provider status/detail + Q2 0:00 authoritative fallbacks are supported');
console.log('  ✓ previous-game and changed-score boards cannot pass the current-state gate');
console.log('  ✓ prewarmed matching boards unlock immediately at official halftime');
