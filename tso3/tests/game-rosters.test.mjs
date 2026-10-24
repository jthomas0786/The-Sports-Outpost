/* Game-roster admission regression. No live ESPN requests or sportsbook quotes.
   Run: node --test tso3/tests/game-rosters.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const worker=readFileSync(new URL('../preview-worker.js',import.meta.url),'utf8');
const start=worker.indexOf('async function officialGameRosters(');
const end=worker.indexOf('async function verifiedPlayerRosterIdentity(',start);
assert.ok(start>=0&&end>start,'Verified matchup roster function must exist');
const fixture={league:'mlb',id:'401073007',state:'pre',
 away:{id:'11',name:'Tampa Bay Rays',abbr:'TB'},
 home:{id:'12',name:'Milwaukee Brewers',abbr:'MIL'}};
const rosters={
 '11':{athletes:[{items:[{id:'10101',displayName:'Away Player',position:{abbreviation:'CF'},status:{name:'Active'}}]}]},
 '12':{athletes:[{items:[{id:'20202',displayName:'Home Player',position:{abbreviation:'SP'},status:{name:'Active'}}]}]}
};
function check(games=[fixture],responses=rosters){
 const ctx={ATHLETE_PATHS:{mlb:'baseball/mlb'},ESPN_SCOREBOARDS:{mlb:'scoreboard'},
  officialGames:async()=>games,
  officialRosterAthletes:doc=>doc.athletes.flatMap(g=>g.items||[]).map(p=>({
   id:String(p.id),name:p.displayName,position:p.position?.abbreviation||'',status:p.status?.name||''
  })),
  fetch:async url=>{const team=url.match(/\/teams\/(\d+)\/roster/)?.[1],doc=responses[team];return {ok:Boolean(doc),status:doc?200:503,json:async()=>doc}},
  AbortSignal:{timeout:()=>null},Date,Promise,Number,String,Object};
 return runInNewContext(worker.slice(start,end)+';officialGameRosters',ctx);
}
test('official away and home rosters connect to a verified ESPN event with no odds',async()=>{
 const result=await check()('mlb','401073007');
 assert.equal(result.available,true);
 assert.equal(result.teams.length,2);
 assert.equal(result.teams[0].players[0].name,'Away Player');
 assert.equal(result.teams[1].players[0].id,'20202');
 assert.equal(result.teams[0].rosterType,'Team roster; starters not verified');
});
test('failed team roster is visibly unavailable, not an invented empty lineup',async()=>{
 const result=await check([fixture],{'11':rosters['11']})('mlb','401073007');
 assert.equal(result.available,true);
 assert.equal(result.teams[1].available,false);
 assert.match(result.teams[1].reason,/unavailable/);
});
test('completed game is not passed off as an upcoming roster research slate',async()=>{
 const result=await check([{...fixture,state:'post'}])('mlb','401073007');
 assert.equal(result.available,false);
 assert.equal(result.teams.length,0);
});
test('unverified ESPN game and arbitrary event IDs rejected',async()=>{
 const fn=check([]);
 const result=await fn('mlb','401073007');
 assert.equal(result.available,false);
 await assert.rejects(()=>fn('mlb','../../etc'),/Invalid roster lookup/);
});
test('each athlete is deduplicated by ESPN ID inside a team roster',async()=>{
 const both=structuredClone(rosters);
 both['11'].athletes[0].items.push(structuredClone(both['11'].athletes[0].items[0]));
 const r=await check([fixture],both)('mlb','401073007');
 assert.equal(r.teams[0].players.length,1);
});
