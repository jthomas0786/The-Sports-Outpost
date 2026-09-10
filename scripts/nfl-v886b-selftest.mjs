import assert from 'node:assert/strict';
import { renderNflPlaystageV886BHTML } from '../sports/nfl/playstage-v886b.js';

const html = renderNflPlaystageV886BHTML({
  away: { abbr: 'NE', name: 'Patriots', record: '0-0' },
  home: { abbr: 'SEA', name: 'Seahawks', record: '0-0' },
  possession: 'NE',
  liveScore: { ballOn: 'SEA 42', downDistance: '1st & 10', winProbAway: 68 },
  currentPlay: { type: 'pass right', playerName: 'Drake Maye', playerPos: 'QB', playerNo: '10', description: 'Drake Maye drops back, looking right for Hunter Henry.' }
}, { halftime: { warming: true } });

assert.equal(html.includes('data-tso-v886b-gamecast'), true);
assert.equal(html.includes('Football Lives Here'), true);
assert.equal(html.includes('The Sports Outpost'), true);
assert.equal(html.includes('Patriots'), true);
assert.equal(html.includes('Seahawks'), true);
assert.equal(html.includes('Halftime Lab'), true);
console.log('v88.6b selftest passed');
