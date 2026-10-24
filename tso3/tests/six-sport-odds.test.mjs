/* Verify TSO-published multi-sport sportsbook source admission rules.
   node --test tso3/tests/six-sport-odds.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const worker=readFileSync(new URL('../preview-worker.js',import.meta.url),'utf8');
const start=worker.indexOf('/* Four published TSO sportsbook feeds');
const end=worker.indexOf('async function safeNbaInjuries(){',start);
assert.ok(start>=0&&end>start,'Published odds validator must exist');
const NOW=Date.parse('2026-10-24T02:20:00.000Z');
const kickoff=new Date(NOW+24*3600000).toISOString();
const quoted=new Date(NOW-10*60000).toISOString();
const sourceAt=new Date(NOW-5*60000).toISOString();
const official={id:'401000012',league:'wnba',state:'pre',startTime:kickoff,
 home:{name:'Atlanta Dream'},away:{name:'Golden State Valkyries'}};
const quote=()=>({eventId:'p123',sport:'WNBA',commenceTime:kickoff,
 homeTeam:'Atlanta Dream',awayTeam:'Golden State Valkyries',
 player:'Allisha Gray',team:'ATL',market:'points',line:18.5,
 book:'Pinnacle',overPrice:106,snapshotTime:quoted,period:'FULL'});
const payload=()=>({meta:{source:'parlayapi',sample:false,fetchedAt:sourceAt},rows:[quote()]});
class FixedDate extends Date{static now(){return NOW}}
async function evaluate(doc,games=[official],league='wnba'){
 const context={
  Date:FixedDate,Number,Math,String,Array,Object,Promise,Set,
  AbortSignal:{timeout:()=>null},
  ESPN_SCOREBOARDS:{mlb:'mlb',nhl:'nhl',wnba:'wnba',cfb:'cfb'},
  fetch:async()=>({ok:true,json:async()=>doc}),
  officialGames:async()=>games,
  nflOddsAgeLimitMinutes:h=>h<=1.5?12:h<=3?25:h<=12?45:h<=48?75:150
 };
 const fn=runInNewContext(worker.slice(start,end)+';verifiedOtherOdds',context);
 return fn(league);
}
test('original source-fresh quote matches official WNBA event',async()=>{
 const r=await evaluate(payload());
 assert.equal(r.rows.length,1);
 assert.equal(r.rows[0].marketLabel,'Points');
 assert.equal(r.rows[0].model,null);
 assert.equal(r.rows[0].verifiedGameId,official.id);
});
test('stale bookmaker quote rejected even with a fresh published file',async()=>{
 const p=payload();p.rows[0].snapshotTime=new Date(NOW-120*60000).toISOString();
 assert.equal((await evaluate(p)).rows.length,0);
});
test('wrong matchup not merged with unrelated game',async()=>{
 const p=payload();p.rows[0].homeTeam='Los Angeles Sparks';
 assert.equal((await evaluate(p)).rows.length,0);
});
test('preserved but withdrawn sportsbook quote not treated as live',async()=>{
 const p=payload();p.rows[0].preserved=true;
 assert.equal((await evaluate(p)).rows.length,0);
});
test('unverified bookmaker price and unsupported market rejected',async()=>{
 const p=payload();p.rows[0].overPrice=0;
 assert.equal((await evaluate(p)).rows.length,0);
 const q=payload();q.rows[0].market='pseudoRating';
 assert.equal((await evaluate(q)).rows.length,0);
});
test('future-stamped bookmaker quote and source are rejected',async()=>{
 const p=payload();p.rows[0].snapshotTime=new Date(NOW+15*60000).toISOString();
 assert.equal((await evaluate(p)).rows.length,0);
 const q=payload();q.meta.fetchedAt=new Date(NOW+15*60000).toISOString();
 assert.equal((await evaluate(q)).rows.length,0);
});
test('milestone inclusive thresholds not quietly converted to Over',async()=>{
 const p=payload();p.rows[0].inclusive=true;
 assert.equal((await evaluate(p)).rows.length,0);
});
