/* Isolated NFL ATD shadow immutable forward-capture regression.
   No real D1 writes, no sportsbook quotes, no historical backfill. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const worker=readFileSync(new URL('../preview-worker.js',import.meta.url),'utf8');
const shadowSource=readFileSync(new URL('../nfl-atd-shadow.js',import.meta.url),'utf8');
const shadowExport={exports:{}};
runInNewContext(shadowSource,{module:shadowExport});
const shadow=shadowExport.exports;
const from=worker.indexOf('async function archive2026AtdShadow(');
const until=worker.indexOf('\nasync function runNflArchive(',from);
assert.ok(from>0&&until>from,'Shadow Worker capture source must exist');
const excerpt=worker.slice(from,until);
const now=Date.parse('2026-10-24T19:00:00Z');
const stamp='2026-10-24T18:45:00Z';
const game={id:'401873017',startTime:'2026-10-25T17:00:00Z',
 away:{abbr:'SF'},home:{abbr:'ATL'},players:[{id:'3117251',name:'Example',team:'SF',
 position:'RB',modelProbability:0.4,injuryStatus:'Active'}]};
const logs=Array.from({length:5},(_,i)=>({season:2026,week:i+1,
 date:'2026-09-'+String(6+i*6).padStart(2,'0'),rushTds:i<3?1:0,recTds:0,carries:15,targets:4}));
const player={id:'3117251',gsisId:'00-0033280',name:'Example',team:'SF',position:'RB',previousSeason:{
 games:17,perGame:{carries:17,targets:5}},matchup:{opponent:'ATL',season:2026,
 positionGroup:'RB',currentSeasonAllowed:{games:5,perGame:{rushTds:0.5,recTds:0.5}}},logs};
const refs=Array.from({length:16},(_,i)=>({matchup:{opponent:i===0?'ATL':'TEAM'+i,
 season:2026,positionGroup:'RB',currentSeasonAllowed:{games:5,
 perGame:{rushTds:0.5,recTds:0.5}}}}));
const research={season:2026,generatedAt:stamp,players:[player,...refs]};
const redzone={available:true,season:2026,generatedAt:stamp,
 lastObservedGameDate:'2026-10-22',gamesScanned:94,players:{'00-0033280':{
 team:'SF',current:{gamesWithOpportunities:5,redZoneOpps:15,goalLineOpps:8,
 redZoneSharePct:30,goalLineSharePct:25},
 previous:{gamesWithOpportunities:17,redZoneOpps:40,goalLineOpps:13,
 redZoneSharePct:20,goalLineSharePct:20}}}};
function harness(overrides={}){
 const saved=new Set(),inserted=[];
 const db={prepare(sql){return {sql,
   async all(){return {results:[]}},
   async run(){return {meta:{changes:0}}},
   bind(...args){return {sql,args}}}},
   async batch(batch){
    return batch.map(x=>{const id=x.args[0],n=saved.has(id)?0:1;
     saved.add(id);if(n)inserted.push(x);return {meta:{changes:n}}});
   }};
 const ctx={Date,Math,Number,String,Promise,Array,Map,Set,
  TSO3AtdShadow:overrides.shadow===false?null:shadow,
  archiveTime(x,at,max){const d=Date.parse(x),age=at-d;return Number.isFinite(d)&&age>=0&&age<=max?d:null},
  verifiedNflResearch:async()=>overrides.research||research,
  verifiedNflRedZone:async()=>overrides.redzone||redzone,
  console:{warn(){}},
  archiveHash:async x=>'digest:'+x,
  archiveSafeNumber:x=>typeof x==='number'&&Number.isFinite(x)?x:null,
  archiveName:x=>String(x||'').toLowerCase().replace(/[^a-z0-9]/g,''),
  nflTeamKey:x=>String(x||'').toUpperCase()
 };
 const fn=runInNewContext(excerpt+';archive2026AtdShadow',ctx);
 return {run:(td={modelFresh:true,generatedAt:stamp,games:[game]})=>
  fn({NFL_ARCHIVE:db},td,new Date(now).toISOString(),now),inserted,saved};
}
test('captures only a genuine future-game 2026 shadow prediction without odds',async()=>{
 const h=harness(),r=await h.run();assert.equal(r.status,'saved');
 assert.equal(r.inserted,1);assert.equal(r.eligible,1);assert.equal(h.inserted.length,1);
 assert.match(h.inserted[0].sql,/INSERT OR IGNORE INTO atd_shadow_forecasts/);
 assert.match(h.inserted[0].sql,/redzone_factor,redzone_source_at/);
 assert.equal(h.inserted[0].args[2],'401873017');
 assert.ok(h.inserted[0].args[13]>1);
 assert.equal(h.inserted[0].args[14],stamp);
 assert.equal(h.inserted[0].args[15],shadow.VERSION);
 assert.equal(h.inserted[0].args[16],stamp);
});
test('identical 30-minute cron observations are idempotent',async()=>{
 const h=harness();
 const first=await h.run(),again=await h.run();
 assert.equal(first.inserted,1);assert.equal(again.inserted,0);
});
test('rejects stale model, unavailable shared module, and expired research',async()=>{
 assert.equal((await harness().run({modelFresh:false,generatedAt:stamp,games:[game]})).inserted,0);
 assert.equal((await harness({shadow:false}).run()).inserted,0);
 const stale={...research,generatedAt:'2026-10-19T12:00:00Z'};
 const h=harness({research:stale});assert.equal((await h.run()).inserted,0);
});
test('no historical/postgame or unverified player is archived',async()=>{
 const h=harness();const past={...game,startTime:'2026-10-22T17:00:00Z'};
 assert.equal((await h.run({modelFresh:true,generatedAt:stamp,games:[past]})).inserted,0);
 const invalid={...game,players:[{...game.players[0],id:'wrong-identity'}]};
 assert.equal((await h.run({modelFresh:true,generatedAt:stamp,games:[invalid]})).inserted,0);
});
test('shadow predictions are independent of original grade and sportsbook archive',()=>{
 assert.doesNotMatch(excerpt,/INSERT OR (?:REPLACE|UPDATE) INTO prediction_snapshots/);
 assert.doesNotMatch(excerpt,/settled_outcomes/);
 assert.match(excerpt,/kickoff<=now\+15\*60000/);
});
