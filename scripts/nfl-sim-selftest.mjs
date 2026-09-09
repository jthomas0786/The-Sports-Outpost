#!/usr/bin/env node
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { simulateGame, jointProbabilityFromResult } from '../sports/nfl/sim/engine.js';

const config=JSON.parse(await fs.readFile(new URL('../sports/nfl/sim/config.json',import.meta.url),'utf8'));
const game={gameId:'TEST-NE-SEA',away:{abbr:'NE',name:'Patriots',score:0},home:{abbr:'SEA',name:'Seahawks',score:0},players:[]};
const mk=(team,name,position,rank,stats,atd=.25)=>({
  espnId:`${team}-${name}`,team,name,position,opponent:team==='NE'?'SEA':'NE',depth:{rank},
  currentSeason:null,previousSeason:{games:17,perGame:stats},last5:{avg:stats},snapTrend:{avgOffensePct:position==='QB'?98:position==='WR'?82:62},
  model:{atdProbability:atd,rzTargets:position==='WR'?8:2,rzCarries:position==='RB'?28:position==='QB'?8:0},matchup:null
});
const research={players:[
  mk('NE','Test QB','QB',1,{attempts:34,completions:22,passYds:245,passTds:1.6,carries:4,rushYds:20,rushTds:.18}),
  mk('NE','Test RB','RB',1,{carries:15,targets:4,receptions:3,rushYds:66,recYds:24,rushTds:.45,recTds:.08},.40),
  mk('NE','Test WR','WR',1,{targets:9,receptions:6,recYds:78,recTds:.42,carries:.2,rushYds:1},.38),
  mk('SEA','Sea QB','QB',1,{attempts:32,completions:21,passYds:232,passTds:1.5,carries:3,rushYds:14,rushTds:.10}),
  mk('SEA','Sea RB','RB',1,{carries:17,targets:3,receptions:2.3,rushYds:78,recYds:17,rushTds:.55,recTds:.05},.46),
  mk('SEA','Sea WR','WR',1,{targets:8,receptions:5.2,recYds:70,recTds:.38,carries:.2,rushYds:1},.35),
].map(p=>({...p,gameId:'TEST-NE-SEA'}))};
const odds={games:[{gameId:'TEST-NE-SEA',away:'NE',home:'SEA',gameLines:{spread:{line:-2.5},total:{line:44.5}},players:[
  {name:'Test QB',team:'NE',odds:{passYds:{line:239.5}}},{name:'Test WR',team:'NE',odds:{recYds:{line:72.5}}},{name:'Sea RB',team:'SEA',odds:{rushYds:{line:74.5}}}
]}]};
const result=simulateGame({game,research,odds,config,iterations:6000,seed:85,includeSamples:true});
assert.equal(result.iterations,6000);
assert.ok(result.outcomes.home.winProbability>0 && result.outcomes.home.winProbability<1);
assert.ok(result.outcomes.away.score.mean>5 && result.outcomes.home.score.mean>5);
const qb=result.players.find(p=>p.name==='Test QB');
assert.ok(qb.distributions.passYds.mean>100);
assert.ok(qb.sportsbook.over.passYds.probability>=0 && qb.sportsbook.over.passYds.probability<=1);
const wr=result.players.find(p=>p.name==='Test WR');
const leg1={playerId:qb.playerId,market:'passYds',side:'over',line:239.5};
const leg2={playerId:wr.playerId,market:'recYds',side:'over',line:72.5};
const joint=jointProbabilityFromResult(result,[leg1,leg2]);
assert.ok(joint>=0&&joint<=1);

const liveGame={status:'in',period:2,clockMin:0,awayScore:13,homeScore:10,playerStats:{byId:{
  'NE-Test QB':{id:'NE-Test QB',name:'Test QB',team:'NE',flat:{compAtt:'14/20',passYds:'156',passTds:'1',interceptions:'0'}},
  'NE-Test WR':{id:'NE-Test WR',name:'Test WR',team:'NE',flat:{targets:'6',receptions:'4',recYds:'69',recTds:'1'}},
}}};
const liveResult=simulateGame({game,research,odds,liveGame,config,iterations:3000,seed:86,includeSamples:false});
const liveQb=liveResult.players.find(p=>p.name==='Test QB');
assert.ok(liveResult.game.remainingFraction>=.49&&liveResult.game.remainingFraction<=.51);
assert.ok(liveQb.distributions.passYds.min>=156,'live result must never erase first-half pass yards');
console.log('✓ NFL simulation self-test passed');
console.log(`  pregame: ${result.outcomes.away.winProbability} NE / ${result.outcomes.home.winProbability} SEA`);
console.log(`  correlated Test QB over + Test WR over joint probability: ${(joint*100).toFixed(2)}%`);
console.log(`  halftime Test QB final pass-yards mean: ${liveQb.distributions.passYds.mean}`);
