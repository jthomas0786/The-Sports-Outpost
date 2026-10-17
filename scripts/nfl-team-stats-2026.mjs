#!/usr/bin/env node
// ESPN 2026 regular-season NFL teams. Generate verified TSO data, fail closed.
import {writeFile,mkdir} from 'node:fs/promises';
const teams={ARI:22,ATL:1,BAL:33,BUF:2,CAR:29,CHI:3,CIN:4,CLE:5,DAL:6,DEN:7,DET:8,GB:9,HOU:34,IND:11,JAX:30,KC:12,LA:14,LAC:24,LV:13,MIA:15,MIN:16,NE:17,NO:18,NYG:19,NYJ:20,PHI:21,PIT:23,SEA:26,SF:25,TB:27,TEN:10,WAS:28};
async function fetchJson(url,optional=false){
 let last;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const r=await fetch(url,{signal:AbortSignal.timeout(24000),headers:{accept:'application/json'}});
   if(r.ok)return await r.json();
   last=new Error(r.status+' '+url);
   if(![429,500,502,503,504].includes(r.status))break;
  }catch(e){last=e}
  if(attempt<2)await new Promise(resolve=>setTimeout(resolve,700*(attempt+1)));
 }
 if(optional)return null;
 throw last;
}
const number=v=>v===undefined||v===null||v===''?null:Number.isFinite(Number(v))?Number(v):null;
async function readTeam([team,id]){
 const base='https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/types/2/teams/'+id+'/statistics';
 const doc=await fetchJson(base);
 if(!String(doc?.season?.$ref||'').includes('/seasons/2026')||!Array.isArray(doc?.splits?.categories))throw Error(team+' 2026 ESPN source validation failed');
 const cats=doc.splits.categories;
 const value=(group,key)=>number(cats.find(x=>x.name===group)?.stats?.find(x=>x.name===key)?.value);
 const games=value('general','gamesPlayed');
 if(!Number.isInteger(games)||games<1||games>23)throw Error(team+' invalid 2026 game sample '+games);
 const stats={
  pointsPerGame:value('scoring','totalPointsPerGame'),
  yardsPerGame:value('passing','netYardsPerGame'),
  passYardsPerGame:value('passing','netPassingYardsPerGame'),
  rushYardsPerGame:value('rushing','rushingYardsPerGame'),
  thirdDownPct:value('miscellaneous','thirdDownConvPct'),
  turnoverDifferential:value('miscellaneous','turnOverDifferential'),
  defPointsAllowed:null,defYardsAllowed:null
 };
 const required=['pointsPerGame','yardsPerGame','passYardsPerGame','rushYardsPerGame','thirdDownPct','turnoverDifferential'];
 if(required.some(k=>!Number.isFinite(stats[k])))throw Error(team+' incomplete 2026 ESPN statistics');
 // Defensive POINTS allowed require each completed ESPN game to agree with
 // the current 2026 season count; never use ESPN's 0 'pointsAllowed' placeholder.
 const schedule=await fetchJson('https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/'+id+'/schedule?season=2026&seasontype=2',true);
 if(Array.isArray(schedule?.events)){
  const allowed=[];
  for(const e of schedule.events){
   if(e?.status?.type?.completed!==true)continue;
   const competitors=e?.competitions?.[0]?.competitors;
   if(!Array.isArray(competitors)||competitors.length!==2||!competitors.some(c=>Number(c.id||c.team?.id)===id))continue;
   const opponent=competitors.find(c=>Number(c.id||c.team?.id)!==id);
   const score=number(opponent?.score?.value??opponent?.score?.displayValue??opponent?.score);
   if(score!==null)allowed.push(score);
  }
  if(allowed.length===games)stats.defPointsAllowed=Number((allowed.reduce((sum,x)=>sum+x,0)/games).toFixed(1));
 }
 return [team,{team,season:2026,games,stats}];
}
const entries=Object.entries(teams);
const results=[];
for(let i=0;i<entries.length;i+=4){
 const chunk=await Promise.all(entries.slice(i,i+4).map(readTeam));
 results.push(...chunk);
 console.log('2026 verified teams:',Math.min(entries.length,i+4),'/',entries.length);
}
if(results.length!==32)throw Error('Incomplete 32-team current-season audit');
const data={schemaVersion:1,season:2026,source:'ESPN 2026 NFL regular-season team statistics, verified team ID and 2026 season; optional complete game schedule for defensive points allowed',generatedAt:new Date().toISOString(),teams:Object.fromEntries(results)};
await mkdir('tso2/data',{recursive:true});
await writeFile('tso2/data/nfl-team-stats-2026.json',JSON.stringify(data,null,2)+'\n','utf8');
console.log('NFL_TEAM_STATS_2026_PASS',JSON.stringify({teams:results.length,games:results.map(([,r])=>r.games),defPointsAvailable:results.filter(([,r])=>r.stats.defPointsAllowed!==null).length}));

// Do not publish partial or cross-season snapshots.
