import assert from 'node:assert/strict';
import { nflWatchlistEventDelta } from './lib/nfl-watchlist-events.mjs';

const now=1_800_000_000_000;
const state=new Map();
const doc=(flat,{status='in',age=1000}={})=>({lastFetchedAt:now-age,games:{G1:{status,lastFetchedAt:now-age,awayAbbr:'DET',homeAbbr:'BUF',awayScore:7,homeScore:10,period:2,clock:'08:31',playerStats:{byId:{'123':{id:'123',name:'Test Player',team:'DET',flat}}}}}});

assert.deepEqual(nflWatchlistEventDelta(doc({rushYds:10,carries:2}),state,now),[],'first observation must establish a baseline');
let events=nflWatchlistEventDelta(doc({rushYds:22,carries:3}),state,now+25000);
assert.equal(events.length,1);assert.match(events[0].text,/\+12 rushing yards/);assert.equal(events[0].playerId,'123');

events=nflWatchlistEventDelta(doc({rushYds:22,carries:3,recYds:18,receptions:2}),state,now+50000);
assert.equal(events.length,1);assert.match(events[0].text,/\+18 receiving yards/);

// A scorer's rushing/receiving TD is handled by the league-wide TD notification;
// the simultaneous yardage delta must not create a duplicate watchlist buzz.
events=nflWatchlistEventDelta(doc({rushYds:35,carries:4,recYds:18,receptions:2,rushTds:1}),state,now+75000);
assert.equal(events.length,0);

// A watched quarterback still receives a passing-TD watch event because the
// league-wide scorer notification goes to the receiver, not the passer.
const qbState=new Map();
assert.deepEqual(nflWatchlistEventDelta(doc({passYds:100,passTds:0}),qbState,now),[]);
events=nflWatchlistEventDelta(doc({passYds:131,passTds:1}),qbState,now+25000);
assert.equal(events.length,1);assert.match(events[0].text,/passing TD/);assert.match(events[0].text,/\+31 passing yards/);

// Feed corrections cannot re-alert when totals fall and later return to a prior high.
assert.deepEqual(nflWatchlistEventDelta(doc({passYds:120,passTds:1}),qbState,now+50000),[]);
assert.deepEqual(nflWatchlistEventDelta(doc({passYds:131,passTds:1}),qbState,now+75000),[]);

// Stale snapshots are ignored completely.
assert.deepEqual(nflWatchlistEventDelta(doc({rushYds:50},{age:180000}),new Map(),now),[]);
console.log('✓ NFL watchlist live-event delta regression passed');
