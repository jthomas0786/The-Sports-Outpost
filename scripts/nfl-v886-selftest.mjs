import assert from 'node:assert/strict';
import { renderNflPlaystageV886HTML } from '../sports/nfl/playstage-v886.js';
const html=renderNflPlaystageV886HTML({
  away:{abbr:'NE',name:'Patriots',record:'0-0'},
  home:{abbr:'SEA',name:'Seahawks',record:'0-0'},
  liveScore:{ballOn:'SEA 42',downDistance:'1st & 10'},
  possession:'NE',
  currentPlay:{type:'pass right',playerName:'Drake Maye',playerPos:'QB',playerNo:'10',description:'Drake Maye drops back, looking right for Hunter Henry.'}
},{halftime:{warming:true}});
assert.equal(html.includes('tso-playstage-v886'), true);
assert.equal(html.includes('Halftime Lab'), true);
assert.equal(html.includes('Football Lives Here'), true);
assert.equal(html.includes('Current Play'), true);
console.log('v88.6 selftest passed');
