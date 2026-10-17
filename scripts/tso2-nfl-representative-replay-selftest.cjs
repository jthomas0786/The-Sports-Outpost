/* Regression test for the sampled-world TSO 2.0 NFL replay.
 * Run: node scripts/tso2-nfl-representative-replay-selftest.cjs
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const host={};
const context=vm.createContext({window:host});
for(const src of ['tso2/simulations-event-engine.js','tso2/simulations-representative-replay.js']){
 vm.runInContext(fs.readFileSync(path.join(root,src),'utf8'),context,{filename:src,timeout:5000});
}
const engine=host.TSO2SimEngine,replay=host.TSO2RepresentativeReplay;
assert.ok(engine?.snapshot&&replay?.build,'Simulation modules available');
function makeTeam(code){
 const defs=[
 ['QB','QB',1,0,34,0,0],['RB1','RB',1,18,1,code==='DAL'?2:1,0],
 ['RB2','RB',2,8,4,0,0],['WR1','WR',1,0,10,0,1],
 ['WR2','WR',2,0,7,0,code==='GB'?1:0],['WR3','WR',3,0,5,0,0],
 ['TE1','TE',1,0,6,0,0],['TE2','TE',2,0,3,0,0]
 ];
 return {
  players:defs.map(([name,position,depthRank,carries,targets])=>({
   name:code+name,team:code,position,depthRank,
   usage:{games:6,carriesPerGame:carries,targetsPerGame:targets}
  })),
  world:defs.map(([name,position,depthRank,carries,targets,rushTds,recTds])=>({
   name:code+name,team:code,position,
   stats:{carries,targets,rushTds,recTds,attempts:position==='QB'?34:0,
    passYds:position==='QB'?240:0,completions:position==='QB'?24:0,
    rushYds:carries*4.2}
  }))
 };
}
const away=makeTeam('DAL'),home=makeTeam('GB');
const game={
 gameId:'qa-2026-dal-gb',away:{abbr:'DAL'},home:{abbr:'GB'},
 players:[...away.players,...home.players],
 representativeWorld:{
  selection:'central-correlated-sampled-world',sampledIndex:23886,iterations:50000,
  awayScore:24,homeScore:27,players:[...away.world,...home.world]
 }
};
assert.equal(replay.scorePlan(24).reduce((sum,x)=>sum+x.points,0),24);
const events=replay.build(game,null);
assert.ok(events.length>=80,'Full four-quarter play ledger must exist');
const snapshot=engine.snapshot(game,events,events.length);
assert.equal(snapshot.away.points,24,'Away sample score preserved');
assert.equal(snapshot.home.points,27,'Home sample score preserved');
assert.ok(snapshot.away.totalYds>0&&snapshot.home.totalYds>0);
assert.ok(events.some(x=>x.td&&x.kind==='RUSH'),'Rushing TDs are represented');
assert.ok(events.some(x=>x.td&&x.kind==='PASS'),'Receiving TDs are represented');
for(const event of events){
 assert.ok(event.gain>=0&&event.yard>=1&&event.yard<=100,'Valid field positions');
 assert.ok(event.side==='DAL'||event.side==='GB');
}
for(const entry of game.representativeWorld.players){
 const actual=snapshot.players[entry.team][entry.name];
 assert.ok(actual.rushTd<=entry.stats.rushTds,'Rushing TD quota: '+entry.name);
 assert.ok(actual.recTd<=entry.stats.recTds,'Receiving TD quota: '+entry.name);
}
const missing={...game,representativeWorld:null};
assert.equal(replay.build(missing,null).length,0,'Never invent a score without sampled world');
console.log('TSO 2.0 representative NFL replay PASS',events.length+' plays',snapshot.away.points+'-'+snapshot.home.points);
