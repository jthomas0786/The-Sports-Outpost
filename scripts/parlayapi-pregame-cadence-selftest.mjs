#!/usr/bin/env node
import assert from 'node:assert/strict';
import { HOUR, pregameRefreshMs, nextFutureStartMs, refreshState } from './parlayapi-pregame-cadence.mjs';

assert.equal(pregameRefreshMs(300),12*HOUR);
assert.equal(pregameRefreshMs(100),4*HOUR);
assert.equal(pregameRefreshMs(24),HOUR);
assert.equal(pregameRefreshMs(8),30*60_000);
assert.equal(pregameRefreshMs(2),15*60_000);
assert.equal(pregameRefreshMs(1),5*60_000);

const now=Date.parse('2026-09-28T16:00:00Z');
assert.equal(nextFutureStartMs(['2026-09-28T15:00:00Z','2026-09-28T20:00:00Z','2026-09-29T02:00:00Z'],now),Date.parse('2026-09-28T20:00:00Z'));
assert.equal(refreshState({lastFetchedAt:'2026-09-28T15:40:00Z',nextStartMs:Date.parse('2026-09-28T18:00:00Z'),nowMs:now}).due,true);
assert.equal(refreshState({lastFetchedAt:'2026-09-28T15:50:00Z',nextStartMs:Date.parse('2026-09-28T18:00:00Z'),nowMs:now}).due,false);
assert.equal(refreshState({lastFetchedAt:null,nextStartMs:null,nowMs:now}).due,false);
assert.equal(refreshState({lastFetchedAt:'2026-09-28T15:59:00Z',nextStartMs:Date.parse('2026-10-20T00:00:00Z'),nowMs:now,force:true}).due,true);

console.log('✓ shared ParlayAPI pregame cadence self-test passed');
console.log('  ✓ >7d 12h / <=7d 4h / <=48h 1h');
console.log('  ✓ <=12h 30m / <=3h 15m / <=90m 5m');
