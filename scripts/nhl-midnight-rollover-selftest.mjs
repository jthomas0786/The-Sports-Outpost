#!/usr/bin/env node
import assert from 'node:assert/strict';
import {nhlSlateDate,NHL_SLATE_TIME_ZONE,NHL_SLATE_ROLLOVER_MINUTE} from '../sports/nhl/slate-date.js';

assert.equal(NHL_SLATE_TIME_ZONE,'America/Chicago');
assert.equal(NHL_SLATE_ROLLOVER_MINUTE,7);

// September is CDT (UTC-5): keep yesterday through 12:06:59 AM Central,
// then flip to today's Central calendar date at 12:07 AM.
assert.equal(nhlSlateDate('2026-09-20T05:00:00Z'),'2026-09-19');
assert.equal(nhlSlateDate('2026-09-20T05:06:59Z'),'2026-09-19');
assert.equal(nhlSlateDate('2026-09-20T05:07:00Z'),'2026-09-20');
assert.equal(nhlSlateDate('2026-09-20T05:10:00Z'),'2026-09-20');

// December is CST (UTC-6): the same local 12:07 AM cutoff must still hold.
assert.equal(nhlSlateDate('2026-12-01T06:06:59Z'),'2026-11-30');
assert.equal(nhlSlateDate('2026-12-01T06:07:00Z'),'2026-12-01');

console.log('✓ NHL slate stays on yesterday through 12:06 AM Central');
console.log('✓ NHL slate rolls to the current Central day at 12:07 AM');
console.log('✓ rollover remains correct across CDT/CST');
