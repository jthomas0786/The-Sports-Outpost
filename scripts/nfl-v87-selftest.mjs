#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildHalftimeBoard, impliedFromAmerican } from '../sports/nfl/sim/halftime.js';

assert.ok(Math.abs(impliedFromAmerican(-110)-0.5238095)<1e-6);
assert.ok(Math.abs(impliedFromAmerican(+150)-0.4)<1e-6);

const n=1000;
const mk=(arr)=>Float32Array.from(arr);
const recA={player:{},stats:{
  tds:mk(Array.from({length:n},(_,i)=>i<600?1:0)),
  recYds:mk(Array.from({length:n},(_,i)=>i<650?80:40)),
  rushYds:mk(new Array(n).fill(0)),passYds:mk(new Array(n).fill(0)),passTds:mk(new Array(n).fill(0)),
  completions:mk(new Array(n).fill(0)),receptions:mk(new Array(n).fill(0)),interceptions:mk(new Array(n).fill(0)),
}};
const recB={player:{},stats:{
  tds:mk(Array.from({length:n},(_,i)=>i<550?1:0)),
  recYds:mk(Array.from({length:n},(_,i)=>i<600?70:30)),
  rushYds:mk(new Array(n).fill(0)),passYds:mk(new Array(n).fill(0)),passTds:mk(new Array(n).fill(0)),
  completions:mk(new Array(n).fill(0)),receptions:mk(new Array(n).fill(0)),interceptions:mk(new Array(n).fill(0)),
}};
const result={
  generatedAt:new Date().toISOString(),iterations:n,
  game:{gameId:'1',away:{abbr:'NE'},home:{abbr:'SEA'},currentScore:{away:10,home:10}},
  players:[
    {playerId:'a',name:'Alpha Receiver',team:'NE',position:'WR',current:{tds:0},distributions:{}},
    {playerId:'b',name:'Beta Receiver',team:'SEA',position:'WR',current:{tds:0},distributions:{}},
  ],
  _samples:{iterations:n,players:new Map([['a',recA],['b',recB]])}
};
const offer=(price)=>({best:{book:'Book',price,ageSeconds:30}});
const yard=(line,over,under)=>({line,over:{best:{book:'Book',price:over,ageSeconds:30}},under:{best:{book:'Book',price:under,ageSeconds:30}}});
const liveOdds={meta:{fetchedAt:new Date().toISOString()},games:[{
  gameId:'1',away:'NE',home:'SEA',players:[
    {name:'Alpha Receiver',team:'NE',odds:{recYds:yard(60.5,+105,-115),atd:offer(+150)}},
    {name:'Beta Receiver',team:'SEA',odds:{recYds:yard(50.5,+110,-120),atd:offer(+170)}},
  ]
}]};
const board=buildHalftimeBoard({
  result,game:{gameId:'1',away:{abbr:'NE'},home:{abbr:'SEA'}},
  liveGame:{status:'in',statusDetail:'Halftime',period:2,clockMin:0,awayScore:10,homeScore:10},
  liveOdds,
  config:{halftime:{candidateMinProbability:.52,candidateMinEdge:.01,maxOddsAgeSeconds:600,correlationCandidateLimit:20}},
});
assert.equal(board.ready,true);
assert.ok(board.candidates.length>=2);
assert.ok(board.correlations.pairCount>0);

const simAuto=fs.readFileSync('scripts/nfl-sim-auto.mjs','utf8');
const auto=fs.readFileSync('sports/nfl/sim/auto.js','utf8');
const workflow=fs.readFileSync('.github/workflows/nfl-live.yml','utf8');
const index=fs.readFileSync('index.html','utf8');
const social=fs.readFileSync('social.js','utf8');

assert.match(simAuto,/includeSamples:needHalftimeSamples/);
assert.match(simAuto,/nfl-halftime\.json/);
assert.match(auto,/halftimeCandidateAttempts/);
assert.match(workflow,/nfl-halftime-window-refresh\.mjs/);
assert.match(workflow,/nfl-live-odds\.json/);
assert.match(index,/Generate on Gambly/);
assert.match(index,/Place Bet/);
assert.match(social,/generateGamblySlip/);

console.log('✓ v87 NFL halftime orchestration self-test passed');
console.log('  ✓ live halftime candidate board');
console.log('  ✓ same-world correlation matrix');
console.log('  ✓ candidate quality gates and rankings');
console.log('  ✓ halftime odds workflow integration');
console.log('  ✓ Gambly two-stage Generate -> Place Bet UI bridge');
