/* TSO3 capture-freshness regression. Run: node --test tso3/tests/nfl-feed-freshness.test.mjs
   Synthetic examples only; no ParlayAPI calls or historical forecast backfill. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../preview-worker.js',import.meta.url),'utf8');
const from=source.indexOf('async function verifiedNflOdds(){');
const until=source.indexOf('\nasync function safeNbaInjuries(){',from);
assert.ok(from>=0&&until>from,'Cannot locate verified NFL sportsbook function');
const functionBody=source.slice(from,until);
async function verifyQuote(ageMinutes,hoursUntilKickoff=36){
 const clock=Date.now();
 const at=new Date(clock+hoursUntilKickoff*3600000).toISOString();
 const fixture={
  meta:{source:'parlayapi',sample:false,fetchedAt:new Date(clock-ageMinutes*60000).toISOString()},
  games:[{away:'NE',home:'CHI',startDateUTC:at,fixtureId:'12345',
   players:[{name:'Test Receiver',playerId:'999',team:'NE',
    odds:{atd:{best:{price:150,book:'FanDuel'}}}}]}]
 };
 const official=[{id:'401873002',league:'nfl',state:'pre',startTime:at,
  away:{abbr:'NE',name:'Away'},home:{abbr:'CHI',name:'Home'}}];
 const context={
  Date,Number,Object,Math,Set,Array,String,Promise,
  NFL_ODDS_URL:'synthetic',ESPN_SCOREBOARDS:{nfl:'synthetic'},
  nflRaw:async()=>fixture,officialGames:async()=>official,
  nflEventMatch:()=>true,nflTeamKey: x=>String(x||'').toUpperCase()
 };
 return runInNewContext(functionBody+';verifiedNflOdds()',context);
}
test('eligible sportsbook quote is retained at 35 minutes and 36 hours to kickoff',async()=>{
 const x=await verifyQuote(35);
 assert.equal(x.available,true);assert.equal(x.rows.length,1);
 assert.equal(x.rejectedForAge,0);assert.equal(x.verifiedGames,1);
});
test('90-minute quote fails stricter under-48-hour age cap',async()=>{
 const x=await verifyQuote(90);
 assert.equal(x.available,false);assert.equal(x.rejectedForAge,1);
 assert.match(x.reason,/kickoff-specific freshness/);
});
test('140-minute quote remains eligible at 60 hours until kickoff',async()=>{
 const x=await verifyQuote(140,60);
 assert.equal(x.available,true);assert.equal(x.rows.length,1);
});
test('140-minute quote fails the stricter 36-hour kickoff-specific freshness cap',async()=>{
 const x=await verifyQuote(140);
 assert.equal(x.available,false);assert.equal(x.rejectedForAge,1);
});
test('250-minute source fails the hard 240-minute maximum',async()=>{
 const x=await verifyQuote(250);
 assert.equal(x.available,false);assert.equal(x.rejectedForAge,0);
 assert.match(x.reason,/240-minute global/);
});
