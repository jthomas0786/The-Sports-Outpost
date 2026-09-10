#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {__V892_TEST__ as t} from '../sports/nfl-alt-props-v892.js';

const router=fs.readFileSync('sports/router.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

const base={
  id:'Christian McCaffrey|RECEIVING YARDS|29.5',kind:'prop',sport:'nfl',prop_key:'recYds',side:'over',
  player:'Christian McCaffrey',player_name:'Christian McCaffrey',market:'RECEIVING YARDS',line:29.5,
  pct:38.9,grade:'C',game:'SF vs LA',game_pk:1,event_id:'abc',player_id:2,price:-215,book:'Bovada',slate_date:'2026-09-10'
};
const over=t.buildAltLeg(base,{side:'over',line:39.5,offer:{price:-115,book:'Bovada'}},'recYds','Christian McCaffrey',22.1);
assert.equal(over.id,'Christian McCaffrey|RECEIVING YARDS|39.5');
assert.equal(over.line,39.5);
assert.equal(over.side,'over');
assert.equal(over.price,-115);
assert.equal(over.book,'Bovada');
assert.equal(over.alternate_line,true);
assert.equal(over.line_source,'Sportsbook alternate');
assert.equal(over.pct,22.1);

const under=t.buildAltLeg(base,{side:'under',line:39.5,offer:{price:-105,book:'FanDuel'}},'recYds','Christian McCaffrey',77.9);
assert.equal(under.id,'Christian McCaffrey|RECEIVING YARDS|UNDER|39.5');
assert.equal(under.side,'under');
assert.equal(under.price,-105);
assert.equal(under.book,'FanDuel');
assert.equal(under.pct,77.9);

assert.match(router,/nfl-alt-props-v892\.js\?v=89\.2/);
assert.match(router,/mountNflAltPropsV892/);
assert.equal(pkg.scripts['nfl:v89.2:test'],'node scripts/nfl-v892-selftest.mjs');

console.log('✓ v89.2 alternate-line Add-to-Slip bridge self-test passed');
console.log('  ✓ selected Over alternate rewrites line, price, book and probability');
console.log('  ✓ selected Under alternate uses a distinct wager id and side');
console.log('  ✓ router mounts the v89.2 cache-busted module');
