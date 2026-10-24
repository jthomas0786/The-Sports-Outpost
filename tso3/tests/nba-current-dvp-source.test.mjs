import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const worker=readFileSync(new URL('../preview-worker.js',import.meta.url),'utf8');
const start=worker.indexOf('async function verifiedNbaCurrentDefense()'),end=worker.indexOf('\nfunction sanitizeNbaResearch(',start);
assert.ok(start>=0&&end>start,'NBA current-season verification source must be isolated');
const source=worker.slice(start,end);
const realDate=Date;
class Clock extends Date{
 constructor(...args){super(...(args.length?args:['2026-10-24T20:00:00Z']))}
 static now(){return realDate.parse('2026-10-24T20:00:00Z')}
}
const game={id:'401999999',date:'2026-10-22T23:00:00Z',status:{type:{completed:true}},
 competitions:[{status:{type:{completed:true}}}]};
const groups=['PG','SG','SF','PF','C','PG','SF','C'];
const teamBox=(id)=>({team:{id},statistics:[{labels:['MIN','PTS','REB','AST','3PT'],
 athletes:groups.map((p,i)=>({athlete:{id:String(Number(id)*1000+i),position:{abbreviation:p}},
   stats:['32','20','6','4','2-5']}))}]});
const summary={header:{season:{year:2027,type:{id:2}},competitions:[{
 status:{type:{completed:true}},competitors:[{team:{id:'20'}},{team:{id:'16'}}]
 }]},boxscore:{players:[teamBox('20'),teamBox('16')]}};
async function run(overrides={}){
 const fetch=async url=>{
  const u=new URL(url);
  if(u.pathname.endsWith('scoreboard')){
   const date=u.searchParams.get('dates');
   return {ok:true,json:async()=>({events:date==='20261022'?[game]:[]})};
  }
  if(u.pathname.endsWith('summary')){
   if(overrides.rejectSummary)return {ok:false,status:502};
   return {ok:true,json:async()=>overrides.summary||summary};
  }
  throw Error('Unexpected external endpoint '+url);
 };
 const sandbox={Date:Clock,Math,Number,String,Map,Set,Promise,AbortSignal,fetch};
 const fn=runInNewContext(source+';verifiedNbaCurrentDefense',sandbox);
 return fn();
}
test('NBA verified DvP rebuilt entirely from official completed 2027 season game box scores',async()=>{
 const result=await run();
 assert.equal(result.available,true);
 assert.equal(result.season,2027);
 assert.equal(result.gamesScanned,1);
 assert.equal(result.coverageComplete,true);
 assert.equal(result.groups.length,6);
 assert.equal(result.groups.find(g=>g.teamId==='20'&&g.position==='G').perGame.points,60);
 assert.equal(result.groups.find(g=>g.teamId==='16'&&g.position==='C').games,1);
 assert.match(result.disclosure,/not defense-to-individual/);
});
test('rejects mixed season in official ESPN completed boxscore',async()=>{
 await assert.rejects(()=>run({summary:{...summary,header:{...summary.header,season:{year:2026,type:{id:2}}}}}),/mismatch/);
});
test('rejects preseason or missing official boxscore rather than inventing group ranks',async()=>{
 await assert.rejects(()=>run({summary:{...summary,header:{...summary.header,season:{year:2027,type:{id:1}}}}}),/mismatch/);
 await assert.rejects(()=>run({rejectSummary:true}),/unavailable/);
});
test('server never uses earlier multi-season cached NBA team-defense aggregations',()=>{
 assert.doesNotMatch(source,/nba-research\.json|teamDefense|priorSeason|cache\.eventGames/);
 assert.match(source,/span>13/);
 assert.match(source,/played\.get\(t\)\.length<7/);
});
