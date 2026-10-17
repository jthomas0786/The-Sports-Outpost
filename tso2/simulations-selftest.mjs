#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx={window:{},document:{},console};
for(const file of ['simulations-event-engine.js','simulations-stats-ui.js','simulations.js']){
 vm.runInNewContext(fs.readFileSync(new URL('./'+file,import.meta.url),'utf8'),ctx,{filename:file});
}
const engine=ctx.window.TSO2SimEngine,view=ctx.window.TSO2Simulations,ui=ctx.window.TSO2StatsUI;
const game={gameId:'test-dal-gb',away:{abbr:'DAL'},home:{abbr:'GB'},availability:{rosterCheckedAt:'2026-10-16T21:50:00Z'},players:[
 {name:'Dak Prescott',position:'QB',team:'DAL',depthRank:1,passYds:255,usage:{games:4,carriesPerGame:1.5}},
 {name:'Sam Howell',position:'QB',team:'DAL',depthRank:2,passYds:0},
 {name:'Javonte Williams',position:'RB',team:'DAL',depthRank:1,usage:{games:4,carriesPerGame:15.5,targetsPerGame:4.25},rushYds:85},
 {name:'Tyler Goodson',position:'RB',team:'DAL',depthRank:2,usage:{games:4,carriesPerGame:2.25,targetsPerGame:.5}},
 {name:'Hunter Luepke',position:'FB',team:'DAL',depthRank:0,usage:{games:4,carriesPerGame:.5,targetsPerGame:.25}},
 {name:'CeeDee Lamb',position:'WR',team:'DAL',depthRank:1,usage:{games:4,carriesPerGame:.5,targetsPerGame:11.75}},
 {name:'George Pickens',position:'WR',team:'DAL',depthRank:2,usage:{games:4,targetsPerGame:7,carriesPerGame:0}},
 {name:'Jake Ferguson',position:'TE',team:'DAL',depthRank:1,usage:{games:4,targetsPerGame:5}},
 {name:'Jordan Love',position:'QB',team:'GB',depthRank:1,passYds:255,usage:{games:4,carriesPerGame:1}},
 {name:'MarShawn Lloyd',position:'RB',team:'GB',depthRank:1,usage:{games:4,carriesPerGame:15}},
 {name:'Christian Watson',position:'WR',team:'GB',depthRank:1,usage:{games:4,targetsPerGame:9}},
 {name:'Tucker Kraft',position:'TE',team:'GB',depthRank:1,usage:{games:4,targetsPerGame:5}}
]};
const plays=engine.build(game,null);
assert.ok(plays.length>55,'Four-quarter game requires realistic play volume');
assert.deepEqual([...new Set(plays.map(e=>e.quarter))],[1,2,3,4]);
assert.equal(JSON.stringify(plays),JSON.stringify(engine.build(game,null)),'Replay is deterministic');
assert.equal(view.buildPlays(game).length,plays.length,'Viewer uses event engine');
const final=engine.snapshot(game,plays,plays.length),partial=engine.snapshot(game,plays,9);
assert.ok(partial.count<final.count);
for(const team of ['DAL','GB']){
 const rows=plays.filter(p=>p.side===team),stat=final.teams[team];
 assert.equal(stat.passing,rows.filter(p=>p.kind==='PASS'&&p.complete).reduce((a,p)=>a+p.gain,0));
 assert.equal(stat.rushing,rows.filter(p=>p.kind==='RUSH').reduce((a,p)=>a+p.gain,0));
 assert.equal(stat.totalYds,stat.passing+stat.rushing);
 assert.equal(stat.points,rows.reduce((a,p)=>a+p.points,0));
 assert.equal(stat.passAtt,rows.filter(p=>p.kind==='PASS'&&!p.sack).length);
 assert.equal(stat.rushAtt,rows.filter(p=>p.kind==='RUSH').length);
 assert.ok(stat.passAtt>=stat.passComp);
}
const fb=final.players.DAL['Hunter Luepke'],starter=final.players.DAL['Javonte Williams'];
assert.ok(fb.carries<=1,'FB must not be treated as starter');
assert.ok(starter.carries>fb.carries,'Lead RB dominates carry usage');
assert.ok(!plays.some(p=>p.carrier==='Sam Howell'),'Backup QB excluded from designed rushing');
assert.ok(plays.filter(p=>p.kind==='PASS'||p.kind==='RUSH').every(p=>game.players.some(x=>x.name===p.player)&&game.players.some(x=>x.name===p.passer)),'Named players must be roster verified');
for(let i=1;i<plays.length;i++){
 if(plays[i].quarter===plays[i-1].quarter)assert.ok(plays[i].second<=plays[i-1].second,'Clock moves forward');
}
for(const side of ['DAL','GB']){
 const pass=plays.find(p=>p.side===side&&p.kind==='PASS'),rush=plays.find(p=>p.side===side&&p.kind==='RUSH');
 assert.ok(pass&&rush);
 assert.ok(pass.commentary.includes(pass.passer)&&pass.commentary.includes(pass.receiver));
 assert.ok(rush.commentary.includes(rush.carrier));
 const frame=view.sceneFrame(pass,.6,game);
 assert.equal(frame.direction,side==='DAL'?1:-1);
 assert.equal(frame.offense.length,11);
 assert.equal(frame.defense.length,11);
 assert.equal(frame.ballOwner,'PASS IN FLIGHT');
 assert.ok(frame.ball.x>=0&&frame.ball.x<=100);
}
const live=ui.live(game,final,'DAL'),box=ui.full(game,final,plays);
assert.ok(live.includes('LIVE SCENARIO')&&live.includes('Javonte Williams'));
assert.ok(box.includes('SCORING BY QUARTER')&&box.includes('PLAYER BOX SCORE'));
assert.ok(box.includes('Passing')&&box.includes('Rushing')&&box.includes('Receiving'));
assert.ok(engine.defensiveTendency(game,null,'DAL').kind.includes('not verified'));
console.log('PASS: 2026 NFL player-role limits, coherent play ledger, running stats, final box score and correct animations');
