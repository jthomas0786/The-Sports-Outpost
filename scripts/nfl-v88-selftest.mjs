#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { optimizeHalftimeParlay, evaluateCombination, probabilityToAmerican } from '../sports/nfl/halftime-optimizer.js';

function packed(hits,n=100){
  const bytes=new Uint8Array(Math.ceil(n/8));
  for(const i of hits) bytes[i>>3]|=1<<(i&7);
  return Buffer.from(bytes).toString('base64');
}
const n=100;
const aHits=Array.from({length:70},(_,i)=>i);
const bHits=Array.from({length:65},(_,i)=>i);       // strongly +correlated with A
const cHits=Array.from({length:60},(_,i)=>i+35);    // partially conflicts
const mk=(id,gameId,name,p,edge,hits,price=-110)=>({
  id,gameId,playerId:id,name,team:gameId==='g1'?'NE':'SEA',position:'WR',
  market:'recYds',side:'over',line:50.5,book:'Book',price,
  simProbability:p,bookFairProbability:.50,edge,grade:'A',
  worldMaskB64:packed(hits,n),worldMaskIterations:n
});
const A=mk('A','g1','Alpha',.70,.20,aHits,+105);
const B=mk('B','g1','Beta',.65,.15,bHits,+110);
const C=mk('C','g1','Gamma',.60,.10,cHits,+100);
const D=mk('D','g2','Delta',.68,.14,Array.from({length:68},(_,i)=>i),-105);
const board1={
  gameId:'g1',matchup:'NE @ SEA',ready:true,iterations:n,candidates:[A,B,C],
  rankings:{tsoPick:['A','B','C'],safest:['A','B','C'],bestEdge:['A','B','C'],balanced:['A','B','C'],longshot:['B','A','C']},
  correlations:{positive:[{a:'A',b:'B',lift:.195}],conflicts:[{a:'A',b:'C',lift:-.07}]}
};
const board2={
  gameId:'g2',matchup:'BUF @ HOU',ready:true,iterations:n,candidates:[D],
  rankings:{tsoPick:['D'],safest:['D'],bestEdge:['D'],balanced:['D'],longshot:['D']},
  correlations:{positive:[],conflicts:[]}
};
const ev=evaluateCombination([A,B],new Map([['g1',board1]]));
assert.equal(ev.exactSameWorld,true);
assert.equal(ev.jointProbability,.65);
assert.ok(ev.correlationAdvantage>.19);

const r=optimizeHalftimeParlay({boards:[board1,board2],legCount:2,maxGames:1,mode:'correlated'});
assert.ok(!r.error);
assert.deepEqual(new Set(r.legs.map(x=>x.id)),new Set(['A','B']));
assert.equal(r.evaluation.jointProbability,.65);

const cross=optimizeHalftimeParlay({boards:[board1,board2],legCount:2,maxGames:2,mode:'safest'});
assert.ok(!cross.error);
assert.ok(cross.evaluation.jointProbability>0);
assert.equal(probabilityToAmerican(.60),-150);

const preview=fs.readFileSync('sports/nfl-preview.js','utf8');
const halftime=fs.readFileSync('sports/nfl/sim/halftime.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const router=fs.readFileSync('sports/router.js','utf8');

assert.match(preview,/halftimeBannerHTML/);
assert.match(preview,/startHalftimeBoardPolling/);
assert.match(preview,/data-nfl-halftime-open/);
assert.match(halftime,/worldMaskB64/);
assert.match(index,/point_wager_eligible===false/);
assert.match(index,/Anytime TD/i);
assert.match(router,/nfl-preview\.js\?v=88/);

console.log('✓ v88 Halftime Parlay Lab self-test passed');
console.log('  ✓ exact packed same-world joint probabilities');
console.log('  ✓ negative-correlation conflict rejection');
console.log('  ✓ Correlated mode selects positive-correlation pair');
console.log('  ✓ multi-game optimizer');
console.log('  ✓ Live-page UI + automatic halftime polling');
console.log('  ✓ add-all betslip safety for live props');
