/* Forward-only research gate for isolated 2026 ATD shadow.
   No observed 2026 outcome is a valid held-out shadow forecast. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const moduleSource=readFileSync(new URL('../nfl-atd-shadow.js',import.meta.url),'utf8');
const shadowModule={exports:{}};
runInNewContext(moduleSource,{module:shadowModule});
const model=shadowModule.exports;
const now=Date.parse('2026-10-24T19:00:00Z');
const game={id:'official-sunday',startTime:'2026-10-25T17:00:00Z',away:{abbr:'SF'},home:{abbr:'ATL'}};
const logs=Array.from({length:5},(_,i)=>({season:2026,week:i+1,date:'2026-09-'+String(6+i*6).padStart(2,'0'),
  rushTds:i<3?1:0,recTds:0,carries:15,targets:4,passTds:0}));
const player={name:'Example',team:'SF',position:'RB',currentSeason:{games:5},
 previousSeason:{games:17,perGame:{carries:17,targets:5}},
 matchup:{season:2026,opponent:'ATL',positionGroup:'RB',currentSeasonAllowed:{games:5,perGame:{rushTds:0.75,recTds:0.25}}},
 logs};
const defensePlayers=Array.from({length:16},(_,i)=>({
 matchup:{season:2026,opponent:i===0?'ATL':'TEAM'+i,positionGroup:'RB',
 currentSeasonAllowed:{games:5,perGame:{rushTds:i===0?0.75:0.5,recTds:i===0?0.25:0.5}}}
}));
const source={season:2026,players:defensePlayers};
function forecast(mods={}){
 const p=mods.player||player,r=mods.reference||model.context(source);
 return model.project({baseProbability:mods.baseProbability??0.4,player:p,game:mods.game||game,
  report:mods.report,reference:r,generatedAt:mods.generatedAt||'2026-10-24T17:42:00Z'},now);
}
test('2026 TD hits shrink toward baseline and preserve separate original forecast',()=>{
 const out=forecast();assert.equal(out.available,true);
 assert.equal(out.observedGames,5);assert.equal(out.tdGames,3);
 assert.ok(Math.abs(out.posterior-(8*0.4+3)/(8+5))<1e-9);
 assert.ok(out.probability>=0&&out.probability<=0.8);
 assert.equal(player.logs.length,5);
 assert.match(out.caveat,/not backtested/);
});
test('reject missing, stale, post-kickoff, and unmatched current research',()=>{
 assert.equal(model.project({baseProbability:null,player,game,reference:model.context(source),
  generatedAt:'2026-10-24T17:42:00Z'},now).available,false);
 assert.equal(forecast({generatedAt:'2026-10-20T01:00:00Z'}).available,false);
 assert.equal(forecast({generatedAt:'2026-10-27T01:00:00Z'}).available,false);
 assert.equal(forecast({player:{...player,team:'DAL'}}).available,false);
 assert.equal(forecast({report:{status:'out'}}).available,false);
});
test('no 2025 or post-kickoff game logs leak into the 2026 shadow',()=>{
 const extra=[{season:2025,week:1,date:'2025-09-15',rushTds:8,recTds:4},
 {season:2026,week:7,date:'2026-10-26',rushTds:1,recTds:1},
 {season:2026,week:8,date:'2026-10-25',rushTds:1,recTds:1},
 {...logs[0]}];
 const out=forecast({player:{...player,logs:[...extra,...logs]}});
 assert.equal(out.observedGames,5);assert.equal(out.tdGames,3);
});
test('QB passing touchdowns are not anytime touchdowns',()=>{
 const p={...player,position:'QB',matchup:{...player.matchup,positionGroup:'QB'},
  logs:logs.map(g=>({...g,rushTds:0,recTds:0,passTds:5}))};
 const out=forecast({player:p});assert.equal(out.available,true);
 assert.equal(out.tdGames,0);
});
test('requires three played and dated 2026 games',()=>{
 assert.equal(forecast({player:{...player,logs:logs.slice(0,2)}}).available,false);
 assert.equal(forecast({player:{...player,logs:logs.map(g=>({...g,date:''}))}}).available,false);
});
test('defense records with source conflicts do not affect probabilities',()=>{
 const other={matchup:{...defensePlayers[0].matchup,currentSeasonAllowed:{
  games:5,perGame:{rushTds:3,recTds:3}}}};
 const ref=model.context({...source,players:[...defensePlayers,other]});
 assert.equal(ref.conflicts.has('RB|ATL'),true);
 const out=forecast({reference:ref});assert.equal(out.available,true);
 assert.equal(out.defenseFactor,1);
 assert.equal(out.defenseRate,null);
});
test('model requires original probability and cannot assign official A-F grades',()=>{
 assert.equal(Object.hasOwn(forecast(),'grade'),false);
 assert.equal(forecast({baseProbability:1.5}).available,false);
 assert.equal(forecast({baseProbability:-0.5}).available,false);
});
