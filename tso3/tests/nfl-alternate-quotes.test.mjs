/* TSO3 NFL exact alternate odds regression. No paid sportsbook calls.
   node --test tso3/tests/nfl-alternate-quotes.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const worker=readFileSync(new URL('../preview-worker.js',import.meta.url),'utf8');
const from=worker.indexOf('async function verifiedNflOdds(){');
const end=worker.indexOf('/* Four published TSO sportsbook feeds',from);
assert.ok(from>=0&&end>from);
const NOW=Date.parse('2026-10-24T02:25:00.000Z');
const at=new Date(NOW+36*3600000).toISOString();
const observed=new Date(NOW-12*60000).toISOString();
const odds=()=>({line:56.5,over:{best:{book:'FanDuel',price:-110,ts:NOW-12*60000}},
 under:{best:{book:'FanDuel',price:-110}},alternates:[
  {line:39.5,over:{best:{book:'DraftKings',price:-145,ts:NOW-15*60000}}},
  {line:79.5,over:{best:{book:'FanDuel',price:240,ts:NOW-12*60000}}},
  {line:56.5,over:{best:{book:'FanDuel',price:-110,ts:NOW-12*60000}}}
 ]});
const data=()=>({meta:{source:'parlayapi',sample:false,fetchedAt:new Date(NOW-10*60000).toISOString()},
 games:[{fixtureId:'101',away:'DAL',home:'PHI',startDateUTC:at,players:[
  {playerId:'1',name:'Test Receiver',team:'DAL',odds:{recYds:odds()}}]}]});
class FixedDate extends Date{static now(){return NOW}}
async function verify(doc){
 const official=[{league:'nfl',state:'pre',id:'401873009',startTime:at,
  home:{name:'Philadelphia Eagles'},away:{name:'Dallas Cowboys'}}];
 const env={Date:FixedDate,Number,Math,Object,String,Array,Set,Promise,
  NFL_ODDS_URL:'synthetic',ESPN_SCOREBOARDS:{nfl:'synthetic'},
  nflRaw:async()=>doc,officialGames:async()=>official,
  nflEventMatch:()=>true,nflTeamKey:v=>String(v||'').toUpperCase(),
  nflOddsAgeLimitMinutes:h=>h<=1.5?12:h<=3?25:h<=12?45:h<=48?75:150};
 return runInNewContext(worker.slice(from,end)+';verifiedNflOdds()',env);
}
test('real quoted primary and two alternate Over lines survive with independent exact lines',async()=>{
 const r=await verify(data());assert.equal(r.rows.length,3);
 assert.deepEqual([...r.rows.map(x=>x.line)].sort((a,b)=>a-b),[39.5,56.5,79.5]);
 assert.equal(r.rows.filter(x=>x.alternateLine).length,2);
});
test('the original sportsbook timestamp, not publication time, is saved',async()=>{
 const r=await verify(data());
 assert.equal(r.rows.find(x=>x.line===39.5).snapshotTime,new Date(NOW-15*60000).toISOString());
 assert.equal(r.rows.find(x=>x.line===39.5).timestampEvidence,'provider-time');
});
test('stale per-book alternate is excluded while primary quote remains current',async()=>{
 const d=data();d.games[0].players[0].odds.recYds.alternates[0].over.best.ts=NOW-150*60000;
 const r=await verify(d);assert.equal(r.rows.length,2);
});
test('unsupported under-only alternate cannot be mislabeled as Over',async()=>{
 const d=data();d.games[0].players[0].odds.recYds.alternates.push({
  line:10.5,under:{best:{book:'FanDuel',price:-120}}});
 const r=await verify(d);assert.equal(r.rows.length,3);
});
test('unchanged duplicate book+line never multiplies a selection',async()=>{
 const r=await verify(data());assert.equal(new Set(r.rows.map(x=>x.book+'|'+x.line)).size,r.rows.length);
});
