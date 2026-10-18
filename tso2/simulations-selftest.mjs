#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {representativeWorldFromArrays} from '../sports/nfl/sim/representative-world.js';
const context={window:{},document:{},console};
for(const file of ['simulations-event-engine.js','simulations-representative-replay.js','simulations-stats-ui.js','simulations.js'])
 vm.runInNewContext(fs.readFileSync(new URL('./'+file,import.meta.url),'utf8'),context,{filename:file});
const {window:ui}=context,model=ui.TSO2RepresentativeReplay,stats=ui.TSO2SimEngine;
const players=[
 {name:'Dak Prescott',team:'DAL',position:'QB',depthRank:1,passYds:247,usage:{games:4,carriesPerGame:2}},
 {name:'Sam Howell',team:'DAL',position:'QB',depthRank:2},
 {name:'Javonte Williams',team:'DAL',position:'RB',depthRank:1,usage:{games:4,carriesPerGame:15.5}},
 {name:'Tyler Goodson',team:'DAL',position:'RB',depthRank:2,usage:{games:4,carriesPerGame:2.25}},
 {name:'Hunter Luepke',team:'DAL',position:'FB',depthRank:0,usage:{games:4,carriesPerGame:.5,targetsPerGame:.25}},
 {name:'CeeDee Lamb',team:'DAL',position:'WR',depthRank:1,usage:{games:4,targetsPerGame:11.75}},
 {name:'George Pickens',team:'DAL',position:'WR',depthRank:2,usage:{games:4,targetsPerGame:7}},
 {name:'Jake Ferguson',team:'DAL',position:'TE',depthRank:1,usage:{games:4,targetsPerGame:5}},
 {name:'Fixture Dallas WR3',team:'DAL',position:'WR',depthRank:3,usage:{games:4,targetsPerGame:5}},
 {name:'Fixture Dallas TE2',team:'DAL',position:'TE',depthRank:2,usage:{games:4,targetsPerGame:3}},
 {name:'Jordan Love',team:'GB',position:'QB',depthRank:1,passYds:250},
 {name:'Christian Watson',team:'GB',position:'WR',depthRank:1,usage:{games:4,targetsPerGame:9}},
 {name:'MarShawn Lloyd',team:'GB',position:'RB',depthRank:1,usage:{games:4,carriesPerGame:16}},
 {name:'Tucker Kraft',team:'GB',position:'TE',depthRank:1,usage:{games:4,targetsPerGame:5}},
 {name:'Fixture Green Bay RB2',team:'GB',position:'RB',depthRank:2,usage:{games:4,carriesPerGame:7}},
 {name:'Fixture Green Bay WR2',team:'GB',position:'WR',depthRank:2,usage:{games:4,targetsPerGame:7}},
 {name:'Fixture Green Bay WR3',team:'GB',position:'WR',depthRank:3,usage:{games:4,targetsPerGame:5}},
 {name:'Fixture Green Bay TE2',team:'GB',position:'TE',depthRank:2,usage:{games:4,targetsPerGame:3}}
];
const iterations=50000,away=new Float32Array(iterations),home=new Float32Array(iterations),carries=new Float32Array(iterations),targets=new Float32Array(iterations);
for(let i=0;i<iterations;i++){away[i]=i%29===0?6:17+i%16;home[i]=18+i%16;carries[i]=12+i%10;targets[i]=4+i%10}
const arrays=new Map([
 ['RB',{player:{key:'rb',name:'Javonte Williams',team:'DAL',position:'RB'},stats:{carries,targets}}],
 ['WR',{player:{key:'wr',name:'CeeDee Lamb',team:'DAL',position:'WR'},stats:{carries:new Float32Array(iterations),targets}}],
]);
const pick=representativeWorldFromArrays({awayScores:away,homeScores:home,arrays,iterations});
assert.ok(pick);
assert.equal(pick.iterations,50000);
assert.equal(pick.awayScore,away[pick.sampledIndex]);
assert.equal(pick.homeScore,home[pick.sampledIndex]);
assert.ok(pick.awayScore>12,'Do not select 6-point outlier to represent a 24-point offense');
assert.ok(Math.abs(pick.awayScore-pick.meanAway)<7,'Sampled score must be reasonably central');
// The selection-index test above uses tiny sample arrays. The replay fixture
// needs full realistic snap quotas because the animation now enforces them.
const replayPlayers=players.filter(p=>p.depthRank!==2||p.position!=='QB').map(p=>{
 const pos=p.position,rank=p.depthRank;
 const carries=pos==='RB'?(rank===1?19:7):pos==='QB'?3:pos==='FB'?0:0;
 const targets=pos==='WR'?(rank===1?10:rank===2?7:5):pos==='TE'?(rank===1?6:3):pos==='RB'?3:0;
 return {team:p.team,name:p.name,position:pos,stats:{
  attempts:pos==='QB'?33:0,completions:pos==='QB'?24:0,passYds:pos==='QB'?245:0,
  carries,targets,rushYds:carries*4.4,recYds:targets*7,
  rushTds:pos==='RB'&&rank===1?1:0,
  recTds:(pos==='WR'&&rank<=2||pos==='TE'&&rank===1)?1:0
 }};
});
const game={gameId:'401873007',away:{abbr:'DAL'},home:{abbr:'GB'},players,
 specialists:{DAL:{kicker:'Fixture DAL Kicker',punter:'Fixture DAL Punter'},GB:{kicker:'Fixture GB Kicker',punter:'Fixture GB Punter'}},
 representativeWorld:{...pick,players:replayPlayers,awayScore:24,homeScore:25,sampledIndex:pick.sampledIndex}};
const events=model.build(game,null);
assert.ok(events.length>=75,'Reconstructed drives require plausible play count');
// Kickoff/field goal/punt actors must be verified specialists, never a QB.
const specialEvents=events.filter(p=>['KICKOFF','PUNT','FIELD GOAL'].includes(p.kind));
assert.ok(specialEvents.some(p=>p.kind==='KICKOFF'));
assert.ok(specialEvents.some(p=>p.kind==='PUNT'));
assert.ok(specialEvents.some(p=>p.kind==='FIELD GOAL'));
for(const e of specialEvents){
 const expected=game.specialists[e.side][e.kind==='PUNT'?'punter':'kicker'];
 assert.equal(e.player,expected,'Special team role should name the roster specialist');
 assert.ok(e.commentary.includes(expected),'Special team play-by-play should name the actual actor');
 const field=ui.TSO2Simulations.sceneFrame(e,.15,game);
 assert.equal(field.offense[0].role,'SPECIALIST');
 assert.equal(field.offense[0].name,expected);
 assert.equal(field.ballOwner,expected);
}
// If the verified active roster is missing a specialist, do NOT invent a name.
const unknownGame={...game,specialists:{DAL:{},GB:{}}};
const unknownEvents=model.build(unknownGame,null).filter(p=>['KICKOFF','PUNT','FIELD GOAL'].includes(p.kind));
assert.ok(unknownEvents.every(e=>e.player===(e.kind==='PUNT'?'Punter':'Kicker')));
const box=stats.snapshot(game,events,events.length);
assert.equal(box.away.points,24);
assert.equal(box.home.points,25);
assert.equal(JSON.stringify(events),JSON.stringify(model.build(game,null)));
assert.deepEqual([...new Set(events.map(x=>x.quarter))],[1,2,3,4]);
assert.ok(!events.some(x=>x.carrier==='Sam Howell'),'Backup QB must not become a featured runner');
assert.ok(box.players.DAL['Hunter Luepke'].carries<=1,'Low usage fullback is not a feature back');
assert.ok(box.players.DAL['Javonte Williams'].carries>box.players.DAL['Hunter Luepke'].carries);
for(const side of ['DAL','GB']){
 const rows=events.filter(p=>p.side===side),sum=box.teams[side];
 assert.equal(sum.points,rows.reduce((a,b)=>a+b.points,0));
 assert.equal(sum.passing,rows.filter(p=>p.kind==='PASS'&&p.complete).reduce((a,b)=>a+b.gain,0));
 assert.equal(sum.rushing,rows.filter(p=>p.kind==='RUSH').reduce((a,b)=>a+b.gain,0));
 assert.equal(sum.totalYds,sum.passing+sum.rushing);
 assert.ok(rows.every(p=>p.commentary.includes('illustrated')));
}
const final=ui.TSO2StatsUI.full(game,box,events);
assert.ok(final.includes('PLAYER BOX SCORE')&&final.includes('SCORING BY QUARTER'));
assert.equal(ui.TSO2Simulations.buildPlays(game).length,events.length);
assert.ok(ui.TSO2Simulations.buildPlays({...game,representativeWorld:null}).length===0,'Never fabricate an independent replay without representative sample');
console.log('PASS: representative sampled-world replay, reconciled stats, verified kicker/punter actors for kickoff/punt/field-goal, generic fallback without inventing names.');
