import assert from 'node:assert/strict';
import { renderNflPlaystageV886AHTML } from '../sports/nfl/playstage-v886a.js';
const html = renderNflPlaystageV886AHTML({
  away:{abbr:'NE',name:'Patriots',record:'0-0'},
  home:{abbr:'SEA',name:'Seahawks',record:'0-0'},
  liveScore:{ballOn:'SEA 42',downDistance:'1st & 10'},
  possession:'NE',
  currentPlay:{type:'pass right',playerName:'Drake Maye',playerPos:'QB',playerNo:'10',description:'Drake Maye drops back, looking right for Hunter Henry.',headshot:''}
},{halftime:{warming:true}});
assert.equal(html.includes('tso-ps886a'), true);
assert.equal(html.includes('Football Lives Here'), true);
assert.equal(html.includes('Patriots'), true);
assert.equal(html.includes('Seahawks'), true);
assert.equal(html.includes('Halftime Lab'), true);
assert.equal(html.includes('Win Probability'), true);
console.log('v88.6a selftest passed');
