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
 {name:'Jordan Love',team:'GB',position:'QB',depthRank:1,passYds:250},
 {name:'Christian Watson',team:'GB',position:'WR',depthRank:1,usage:{games:4,targetsPerGame:9}},
 {name:'MarShawn Lloyd',team:'GB',position:'RB',depthRank:1,usage:{games:4,carriesPerGame:16}},
 {name:'Tucker Kraft',team:'GB',position:'TE',depthRank:1,usage:{games:4,targetsPerGame:5}}
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
const game={gameId:'401873007',away:{abbr:'DAL'},home:{abbr:'GB'},players,
 representativeWorld:{...pick,awayScore:24,homeScore:25,sampledIndex:pick.sampledIndex}};
const events=model.build(game,null);
assert.ok(events.length>=75,'Reconstructed drives require plausible play count');
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
console.log('PASS: representative actual 50K index, score-conditioned replay, accurate final score, Luepke usage limit, reconciled live and final stats.');
