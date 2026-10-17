#!/usr/bin/env node
// Regression suite: all movement is illustrative and based on TSO output labels,
// never optical tracking or individual sampled Monte Carlo plays.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('./simulations.js',import.meta.url),'utf8');
const context={window:{},document:{},console};
vm.runInNewContext(source,context,{filename:'simulations.js'});
const sim=context.window.TSO2Simulations;
const sample={
 gameId:'401872996',away:{abbr:'HOU',name:'Houston Texans'},home:{abbr:'JAX',name:'Jacksonville Jaguars'},
 projected:{awayScore:20,homeScore:17},
 players:[
  {name:'C.J. Stroud',team:'HOU',position:'QB',passYds:230},
  {name:'Nico Collins',team:'HOU',position:'WR',recYds:88,targets:12},
  {name:'David Montgomery',team:'HOU',position:'RB',rushYds:65,carries:18},
  {name:'Trevor Lawrence',team:'JAX',position:'QB',passYds:235},
  {name:'Parker Washington',team:'JAX',position:'WR',recYds:72,targets:11},
  {name:'Bhayshul Tuten',team:'JAX',position:'RB',rushYds:66,carries:19}
 ]
};
const plays=sim.buildPlays(sample);
assert.ok(plays.length>=45,'Expected four quarters of illustration');
assert.deepEqual([...new Set(plays.map(p=>p.quarter))],[1,2,3,4]);
assert.equal(JSON.stringify(plays),JSON.stringify(sim.buildPlays(sample)),'Replay should be deterministic for game');
for(const side of ['HOU','JAX']){
 for(const kind of ['PASS','RUSH']){
  const e=plays.find(p=>p.side===side&&p.kind===kind);
  assert.ok(e,'Both teams must run and pass');
  assert.ok(e.commentary.includes(e.passer),'Play by play names actual QB');
  assert.ok(e.commentary.includes(e.player),'Play by play names target/carrier');
  assert.equal(e.commentary.includes('Illustrative play'),true,'Replay must be disclosed');
  const initial=sim.sceneFrame(e,0,sample),end=sim.sceneFrame(e,.95,sample);
  assert.equal(initial.direction,side==='HOU'?1:-1,'Teams must attack opposite directions');
  assert.equal(initial.offense.length,11);
  assert.equal(initial.defense.length,11);
  assert.ok(initial.ball.x>=0&&initial.ball.x<=100,'Ball visible in playing field');
  assert.ok(end.ball.x>=0&&end.ball.x<=100);
  assert.equal(end.offense[0].name,e.passer,'Quarterback identified visually');
  if(kind==='PASS'){
   assert.equal(end.offense[7+e.targetSlot].name,e.receiver,'Target marker has named receiver');
   assert.equal(sim.sceneFrame(e,.50,sample).ballOwner,'PASS IN FLIGHT','Ball must separate from quarterback');
   assert.ok(end.offense.some((p,i)=>i>=7&&p.u>initial.offense[i].u),'Receivers run routes');
   assert.ok(initial.defense[0].u>sim.sceneFrame(e,.80,sample).defense[0].u,'Rushers attack quarterback');
  }else{
   assert.equal(sim.sceneFrame(e,0,sample).ballOwner,e.passer);
   assert.equal(sim.sceneFrame(e,.7,sample).ballOwner,e.carrier,'RB holds ball after handoff');
   assert.equal(end.offense[1].name,e.carrier,'Rusher named on field');
  }
 }
}
assert.ok(source.includes('data-tsos-commentary'),'Separate commentary target must exist');
assert.ok(!source.includes('<b data-tsos-play>'),'Play selector must not overwrite narration');
assert.ok(source.includes('data-tsos-ball-holder'),'Persistent ball-holder ticker required');
assert.ok(source.includes('ctx.ellipse(0,0,12,6.5'),'Visible football should render on canvas');
console.log('TSO NFL visual simulation: named play-by-play, opposite direction, football tracking, 22 players, routes and controls PASS');
