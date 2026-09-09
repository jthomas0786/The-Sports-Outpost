#!/usr/bin/env node
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { decideAutomaticRun, nextAutomationState, activePregameCheckpoint, isHalftimeState } from '../sports/nfl/sim/auto.js';

const config=JSON.parse(await fs.readFile(new URL('../sports/nfl/sim/config.json',import.meta.url),'utf8'));
const kickoff='2026-09-09T20:20:00-04:00';
const game={gameId:'AUTO-NE-SEA',startTimeUTC:kickoff,status:'pre',away:{abbr:'NE'},home:{abbr:'SEA'},players:[{espnId:'1',name:'QB One',team:'NE',opponent:'SEA',position:'QB',props:{atd:{probability:.2}},stats:{snapShare:.99}}]};
const research={players:[{gameId:'AUTO-NE-SEA',espnId:'1',name:'QB One',team:'NE',opponent:'SEA',position:'QB',depth:{rank:1},previousSeason:{games:17,perGame:{attempts:32,completions:21,passYds:235,passTds:1.5}},last5:{avg:{attempts:34,completions:22,passYds:248,passTds:1.7}},model:{atdProbability:.2}}]};
const odds={games:[{gameId:'AUTO-NE-SEA',away:'NE',home:'SEA',gameLines:{spread:{line:-2.5},total:{line:44.5}},players:[{name:'QB One',team:'NE',odds:{passYds:{line:239.5}}}]}]};
const existing={game:{gameId:'AUTO-NE-SEA'}};

assert.equal(config.automatic.pregameIterations,50000);
assert.equal(config.automatic.halftimeIterations,50000);
assert.equal(activePregameCheckpoint(181,[180,90,15]),null);
assert.equal(activePregameCheckpoint(179,[180,90,15]),180);
assert.equal(activePregameCheckpoint(89,[180,90,15]),90);
assert.equal(activePregameCheckpoint(14,[180,90,15]),15);

let now=new Date('2026-09-09T15:20:00-04:00'); // 5h before kickoff
let d=decideAutomaticRun({game,research,odds,config,now,existingResult:null,previousState:null});
assert.equal(d.run,true);assert.equal(d.reason,'initial ready');assert.equal(d.iterations,50000);
let state=nextAutomationState({decision:d,result:{iterations:50000,generatedAt:now.toISOString(),game:{currentScore:{away:0,home:0}}},game,now});

now=new Date('2026-09-09T17:21:00-04:00'); // 2:59 before
let cp=decideAutomaticRun({game,research,odds,config,now,existingResult:existing,previousState:state});
assert.equal(cp.run,true);assert.equal(cp.checkpointMinutes,180);assert.equal(cp.iterations,50000);
state=nextAutomationState({previousState:state,decision:cp,result:{iterations:50000,generatedAt:now.toISOString(),game:{currentScore:{away:0,home:0}}},game,now});

now=new Date('2026-09-09T18:51:00-04:00'); // 89m before
cp=decideAutomaticRun({game,research,odds,config,now,existingResult:existing,previousState:state});
assert.equal(cp.run,true);assert.equal(cp.checkpointMinutes,90);assert.equal(cp.iterations,50000);
state=nextAutomationState({previousState:state,decision:cp,result:{iterations:50000,generatedAt:now.toISOString(),game:{currentScore:{away:0,home:0}}},game,now});

now=new Date('2026-09-09T20:06:00-04:00'); // 14m before
cp=decideAutomaticRun({game,research,odds,config,now,existingResult:existing,previousState:state});
assert.equal(cp.run,true);assert.equal(cp.checkpointMinutes,15);assert.equal(cp.iterations,50000);
state=nextAutomationState({previousState:state,decision:cp,result:{iterations:50000,generatedAt:now.toISOString(),game:{currentScore:{away:0,home:0}}},game,now});

const live={status:'in',period:2,clockMin:7.4,awayScore:10,homeScore:7,playerStats:{byId:{}}};
now=new Date('2026-09-09T21:35:00-04:00');
let ld=decideAutomaticRun({game,research,odds,liveGame:live,config,now,existingResult:existing,previousState:state});
assert.equal(ld.run,true);assert.equal(ld.phase,'live');assert.equal(ld.iterations,15000);
state=nextAutomationState({previousState:state,decision:ld,result:{iterations:15000,generatedAt:now.toISOString(),game:{currentScore:{away:10,home:7}}},game,now});

const halftime={...live,period:2,clockMin:0,statusDetail:'Halftime',awayScore:13,homeScore:10};
assert.equal(isHalftimeState(halftime),true);
now=new Date('2026-09-09T22:05:00-04:00');
let hd=decideAutomaticRun({game,research,odds,liveGame:halftime,config,now,existingResult:existing,previousState:state});
assert.equal(hd.run,true);assert.equal(hd.phase,'halftime');assert.equal(hd.iterations,50000);
// v87: an empty halftime candidate board must retry instead of permanently
// marking halftime complete after the first 50K simulation.
state=nextAutomationState({
  previousState:state,
  decision:hd,
  result:{
    iterations:50000,
    generatedAt:now.toISOString(),
    game:{currentScore:{away:13,home:10}},
    automation:{halftimeCandidatesReady:false},
  },
  game,now
});
hd=decideAutomaticRun({
  game,research,odds,liveGame:halftime,config,
  now:new Date(now.getTime()+5*60000),
  existingResult:existing,previousState:state
});
assert.equal(hd.run,true);
assert.match(hd.reason,/halftime candidate retry/);
assert.equal(hd.iterations,50000);

// Once the live sportsbook candidate board is ready, the same halftime state
// is complete and must NOT fire another 50K run.
const retryNow=new Date(now.getTime()+5*60000);
state=nextAutomationState({
  previousState:state,
  decision:hd,
  result:{
    iterations:50000,
    generatedAt:retryNow.toISOString(),
    game:{currentScore:{away:13,home:10}},
    automation:{halftimeCandidatesReady:true},
  },
  game,now:retryNow
});
hd=decideAutomaticRun({
  game,research,odds,liveGame:halftime,config,
  now:new Date(retryNow.getTime()+5*60000),
  existingResult:existing,previousState:state
});
assert.equal(hd.run,false);
assert.match(hd.reason,/already complete/);

const post={...halftime,status:'post',period:4,clockMin:0,statusDetail:'Final'};
const pd=decideAutomaticRun({game,research,odds,liveGame:post,config,now:new Date('2026-09-10T00:00:00-04:00'),existingResult:existing,previousState:state});
assert.equal(pd.run,false);assert.equal(pd.phase,'post');

console.log('✓ NFL automatic simulation scheduler self-test passed');
console.log('  pregame checkpoints: 180m / 90m / 15m = 50,000 each');
console.log('  halftime = 50,000 automatically; retries until candidate board is ready');
console.log('  regular live refresh = 15,000 when state changes');
