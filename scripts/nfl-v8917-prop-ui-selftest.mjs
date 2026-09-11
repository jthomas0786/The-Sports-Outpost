import assert from 'node:assert/strict';
import fs from 'node:fs';
import { __V8917_UI_TEST__ as U } from '../sports/nfl/prop-model-edge-v8917.js';

assert.equal(U.priceNumber('DraftKings +110'),110);
assert.equal(U.priceNumber('FanDuel -125'),-125);
assert.equal(U.iterText(50000),'50K sims');
assert.equal(U.iterText(15000),'15K sims');

const doc={generatedAt:'2026-09-11T12:00:00Z',engineVersion:'v86.2.0',games:[
  {iterations:50000,game:{gameId:'401'},players:[{espnId:'123',playerId:'LA|puka nacua',name:'Puka Nacua',team:'LA'}]}
]};
const idx=U.buildIndex(doc);assert.equal(idx.byId.get('123').iterations,50000);assert.equal(idx.byId.get('LA|puka nacua').gameId,'401');

const fakeCard={querySelector(sel){if(sel==='.nfl-mlb-prop-market strong')return{textContent:'Receiving Yards'};if(sel==='.nfl-mlb-prop-odds strong')return{textContent:'Over 74.5'};return null;}};
assert.equal(U.marketFromCard(fakeCard),'recYds');assert.deepEqual(U.sideLineFromCard(fakeCard,'recYds'),{side:'over',line:74.5});

const src=fs.readFileSync(new URL('../sports/nfl/prop-model-edge-v8917.js',import.meta.url),'utf8');
for(const needle of ['slates/nfl-sim.json','.nfl-mlb-prop-card','data-nfl-player','MutationObserver','buildTsoPropView','50K sims','tso-nfl-prop-model-v8917'])assert.ok(src.includes(needle),`missing ${needle}`);
console.log('v89.17 prop model UI tests passed');
