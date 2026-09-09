#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { activeNflWeekWindow, weeklyPaidRefreshMs } from './nfl-week-window.mjs';

// Wed Sep 9, 2026 11:10 AM CDT -> active week began Tue Sep 8 at 3 AM CDT.
const w=activeNflWeekWindow(Date.parse('2026-09-09T16:10:00Z'));
assert.equal(w.startIso,'2026-09-08T08:00:00.000Z');
assert.equal(w.endIso,'2026-09-15T08:00:00.000Z');

// Before Tuesday 3 AM Central, the prior NFL week is still active.
const early=activeNflWeekWindow(Date.parse('2026-09-08T07:30:00Z'));
assert.equal(early.startIso,'2026-09-01T08:00:00.000Z');
assert.equal(early.endIso,'2026-09-08T08:00:00.000Z');

assert.equal(weeklyPaidRefreshMs(30),4*3600000);
assert.equal(weeklyPaidRefreshMs(8),60*60000);
assert.equal(weeklyPaidRefreshMs(2),30*60000);
assert.equal(weeklyPaidRefreshMs(1),20*60000);

const odds=fs.readFileSync('scripts/nfl-odds-refresh.mjs','utf8');
const workflow=fs.readFileSync('.github/workflows/nfl-odds.yml','utf8');
const preview=fs.readFileSync('sports/nfl-preview.js','utf8');

assert.match(odds,/activeNflWeekWindow/);
assert.match(odds,/windowMode:'nfl-week-tue-mon'/);
assert.match(odds,/bookmakers:SPORTSBOOK_QUERY/);
assert.match(odds,/commenceTimeFrom:from,commenceTimeTo:to/);
assert.doesNotMatch(odds,/NOW \+ 24\*HOUR/);
assert.match(workflow,/cron: '7,27,47 \* \* \* \*'/);
assert.match(preview,/Sportsbook pending/);

console.log('✓ v88.1 NFL weekly odds self-test passed');
console.log('  ✓ Tuesday 3 AM Central weekly boundary');
console.log('  ✓ full Tuesday→Monday event window');
console.log('  ✓ hourly paid refresh inside 12h of kickoff');
console.log('  ✓ 30m inside 3h / 20m inside 90m');
console.log('  ✓ sportsbook-only prop request');
console.log('  ✓ Props UI uses accurate sportsbook-pending wording');
