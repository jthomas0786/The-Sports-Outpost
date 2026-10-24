/* TSO NHL v4 recorded player history + defense matchup safety checks.
   npm-independent: node --test tso3/tests/nhl-research-depth.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const worker=readFileSync(new URL('../preview-worker.js',import.meta.url),'utf8');
const a=worker.indexOf('const TSO_NHL_RESEARCH_URL=');
const b=worker.indexOf('async function verifiedNhlGoalModel(){',a);
assert.ok(a>=0&&b>a,'NHL research integration missing');
const season=new Date().getUTCMonth()>=6?new Date().getUTCFullYear()+1:new Date().getUTCFullYear();
const now=Date.now(),date=n=>new Date(now-n*86400000).toISOString();
const data=()=>({version:4,currentSeason:season,season:season-1,generatedAt:new Date(now-60000).toISOString(),
 players:{'2273':{rates:{sog:2.3},recentGames:[
  {date:date(1),eventId:'123456789',season,seasonType:2,opponent:'NYI',stats:{goals:1,sog:4,assists:0,points:1}},
  {date:date(2),eventId:'123456788',season,seasonType:2,opponent:'NYR',stats:{goals:0,sog:2,assists:1,points:1}},
  {date:date(-2),eventId:'123456798',season,seasonType:2,stats:{sog:7}},
  {date:date(3),eventId:'123456787',season,seasonType:1,stats:{sog:12}}
 ]}},
 teamDefense:{teams:{FLA:{games:30,currentSeasonGames:10,goalsAllowedPerGame:3.1,
  shotsAllowedPerGame:28.5,position:{LW:{games:30,goalAllowedRank:11,
  rankedTeams:32,goalsPerGame:.8,shotsPerGame:5.1}}}}}
});
function run(doc=data(),teams=[{id:'1',abbr:'LA',available:true,players:[{id:'2273',name:'Sample Skater',position:'LW'}]},{id:'2',abbr:'FLA',available:true,players:[]}]){
 const c={fetch:async()=>({ok:true,json:async()=>doc}),officialGameRosters:async()=>({
  available:true,home:'FLA',away:'LA',teams}),AbortSignal:{timeout:()=>null},Date,
  Number,String,Object,Promise};
 return runInNewContext(worker.slice(a,b)+';verifiedNhlMatchupHistory',c);
}
test('observed NHL events link to ESPN rostered player and opponent defense',async()=>{
 const x=await run()('401912345','2273');
 assert.equal(x.available,true);
 assert.equal(x.games.length,2);
 assert.equal(x.games[0].stats.sog,4);
 assert.equal(x.defense.position.goalAllowedRank,11);
 assert.equal(x.priorSeason,season-1);
});
test('current season and regular season games are preserved, no future entries',async()=>{
 const x=await run()('401912345','2273');
 assert.ok(x.games.every(g=>g.season===season&&new Date(g.date).getTime()<=Date.now()));
});
test('wrong player or ambiguous roster prevents history from wrong athlete',async()=>{
 const result=await run()('401912345','98765');
 assert.equal(result.available,false);
 const teams=[{id:'1',abbr:'LA',available:true,players:[{id:'2273',name:'A',position:'LW'}]},
  {id:'2',abbr:'FLA',available:true,players:[{id:'2273',name:'A',position:'D'}]}];
 assert.equal((await run(data(),teams)('401912345','2273')).available,false);
});
test('old and future-generated research is rejected',async()=>{
 const old=data();old.generatedAt=new Date(now-45*3600000).toISOString();
 await assert.rejects(()=>run(old)('401912345','2273'),/missing or too old/);
 const future=data();future.generatedAt=new Date(now+3600000).toISOString();
 await assert.rejects(()=>run(future)('401912345','2273'),/missing or too old/);
});
