import fs from 'node:fs/promises';
import {API,getJSON} from '../sports/nhl/data.js';
import {seasonPrior,eventIdFromLogItem,recentGameFromSummary,recentAverages} from '../sports/nhl/research.js';

const slate=JSON.parse(await fs.readFile('slates/nhl.json','utf8'));
// ESPN identifies the last completed NHL season by its ending year. A 2026-27 slate therefore uses 2026 as the verified completed-season baseline and 2027 as the active season code.
const priorSeason=Number(slate.season.slice(0,4));if(!Number.isInteger(priorSeason)||priorSeason<2020)throw new Error('Unknown NHL season');
const currentSeason=priorSeason+1,now=Date.now(),DAY=86400000,HOUR=3600000;
let cache={players:{},checked:{},recentChecked:{}};try{cache=JSON.parse(await fs.readFile('slates/nhl-research.json','utf8'));}catch{}
if(cache.season!==priorSeason)cache={players:{},checked:{},recentChecked:{}};
cache.players??={};cache.checked??={};cache.recentChecked??={};
const ids=[...new Set(slate.games.flatMap(g=>g.players.map(p=>String(p.id))))];
let index=0,failures=0;

// Previous-season rates are stable. Refresh at most once per day and retain the last good value on temporary errors.
await Promise.all(Array.from({length:6},async()=>{while(index<ids.length){const id=ids[index++];if(now-(cache.checked[id]||0)<DAY)continue;
 try{
  const doc=await getJSON(`https://sports.core.api.espn.com/v2/sports/hockey/leagues/nhl/seasons/${priorSeason}/types/2/athletes/${id}/statistics`);
  const p=seasonPrior(doc,priorSeason,now);if(p)cache.players[id]={...(cache.players[id]||{}),...p};cache.checked[id]=now;
 }catch(e){if(/404/.test(e.message))cache.checked[id]=now;else failures++;}
}}));

// Recent completed games power the MLB/NFL-style modal charts. Keep 30 verified games so L5/L10/L15/L30 and season/H2H filters are real.
const includeCurrent=(slate.games||[]).some(g=>Number(g.seasonType)===2)||new Date(now).getUTCMonth()>=9;
const recentIds=ids.filter(id=>now-(cache.recentChecked[id]||0)>=3*HOUR||(cache.players[id]?.recentGames?.length||0)<30);
const refsByPlayer=new Map();let recentIndex=0,recentFailures=0;
const eventlogURL=(season,id)=>`https://sports.core.api.espn.com/v2/sports/hockey/leagues/nhl/seasons/${season}/athletes/${id}/eventlog?limit=100`;

await Promise.all(Array.from({length:8},async()=>{while(recentIndex<recentIds.length){const id=recentIds[recentIndex++],refs=[],seen=new Set();let anyLog=false,tempFailure=false;
 for(const season of (includeCurrent?[currentSeason,priorSeason]:[priorSeason])){
  try{
   const doc=await getJSON(eventlogURL(season,id));anyLog=true;
   const played=(doc?.events?.items||[]).filter(x=>x?.played!==false&&eventIdFromLogItem(x));
   // ESPN ordering can vary by sport. Sample enough from both ends to safely recover the latest 30 after summary dates are sorted.
   for(const item of [...played.slice(0,36),...played.slice(-36)]){
    const eventId=eventIdFromLogItem(item);if(!eventId||seen.has(eventId))continue;seen.add(eventId);refs.push({eventId,teamId:String(item.teamId||''),season});
   }
  }catch(e){if(!/404/.test(e.message)){tempFailure=true;recentFailures++;}}
 }
 if(anyLog)refsByPlayer.set(id,refs);
 if(anyLog&&!tempFailure)cache.recentChecked[id]=now;
}}));

const eventIds=[...new Set([...refsByPlayer.values()].flat().map(x=>x.eventId))];
const summaries=new Map();let eventIndex=0;
await Promise.all(Array.from({length:8},async()=>{while(eventIndex<eventIds.length){const eventId=eventIds[eventIndex++];
 try{summaries.set(eventId,await getJSON(`${API}/summary?event=${eventId}`));}
 catch{recentFailures++;}
}}));

for(const [id,refs] of refsByPlayer){
 const rows=refs.map(ref=>recentGameFromSummary(summaries.get(ref.eventId),{playerId:id,teamId:ref.teamId,season:ref.season,eventId:ref.eventId})).filter(Boolean).sort((a,b)=>Date.parse(b.date||0)-Date.parse(a.date||0)).slice(0,30);
 if(rows.length){
  const base=cache.players[id]||{season:priorSeason,games:0,rates:{},source:'ESPN recent game summaries',fetchedAt:now};
  cache.players[id]={...base,recentGames:rows,recentAverages:recentAverages(rows.slice(0,5)),recentSource:'ESPN event log + game summary box score',recentFetchedAt:now};
 }
}

cache.season=priorSeason;cache.currentSeason=currentSeason;cache.generatedAt=new Date(now).toISOString();
await fs.writeFile('slates/nhl-research.json',JSON.stringify(cache,null,2)+'\n');
console.log(`NHL season ${priorSeason}: ${Object.keys(cache.players).length} verified player histories; ${refsByPlayer.size} recent logs refreshed; ${failures+recentFailures} temporary fetch failures`);
