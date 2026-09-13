import {num} from './data.js';

export function seasonPrior(doc,season,now=Date.now()){
 const categories=doc?.splits?.categories;if(!Array.isArray(categories))return null;
 const stats=Object.fromEntries(categories.flatMap(c=>c.stats||[]).map(s=>[s.name,num(s.value)]));
 const games=stats.games;if(!(games>0))return null;
 const rates={};
 for(const [key,source] of Object.entries({sog:'shotsTotal',goals:'goals',assists:'assists',blocks:'blockedShots',saves:'saves'}))if(stats[source]!=null&&stats[source]>=0)rates[key]=stats[source]/games;
 if(rates.goals!=null&&rates.assists!=null)rates.points=rates.goals+rates.assists;
 const shootingPct=stats.shotsTotal>0&&stats.goals>=0&&stats.goals<=stats.shotsTotal?(stats.goals+10)/(stats.shotsTotal+100):null;
 return {season,games,rates,shootingPct,source:'ESPN season statistics',fetchedAt:now};
}

const EVENT_RE=/\/events\/(\d+)/;
export function eventIdFromLogItem(item){
 const ref=item?.event?.$ref||item?.competition?.$ref||'';
 return String(ref).match(EVENT_RE)?.[1]||null;
}

const RECENT_KEYS={goals:'goals',assists:'assists',shotsTotal:'sog',blockedShots:'blocks',saves:'saves',shotsAgainst:'shotsAgainst',goalsAgainst:'goalsAgainst',timeOnIce:'toi'};
function playerBoxStats(summary,playerId){
 for(const group of summary?.boxscore?.players||[])for(const section of group.statistics||[])for(const row of section.athletes||[]){
  if(String(row?.athlete?.id)!==String(playerId))continue;
  const stats={};
  for(const [i,key] of (section.keys||[]).entries())if(RECENT_KEYS[key])stats[RECENT_KEYS[key]]=key==='timeOnIce'?String(row.stats?.[i]??''):num(row.stats?.[i]);
  if(stats.goals!=null&&stats.assists!=null)stats.points=stats.goals+stats.assists;
  return stats;
 }
 return null;
}
function competitorSide(summary,teamId){
 const comp=summary?.header?.competitions?.[0];
 const teams=comp?.competitors||[];
 const mine=teams.find(t=>String(t.id)===String(teamId)||String(t.team?.id)===String(teamId));
 const opp=teams.find(t=>t!==mine);
 return {comp,mine,opp};
}
export function recentGameFromSummary(summary,{playerId,teamId,season,eventId}={}){
 const stats=playerBoxStats(summary,playerId);if(!stats)return null;
 const {comp,mine,opp}=competitorSide(summary,teamId);if(!comp||!mine||!opp)return null;
 const date=comp.date||summary?.header?.competitions?.[0]?.date||summary?.header?.date||'';
 const scoreMine=num(mine.score),scoreOpp=num(opp.score);
 let result='';
 if(mine.winner===true)result='W';else if(mine.winner===false)result='L';else if(scoreMine!=null&&scoreOpp!=null&&scoreMine!==scoreOpp)result=scoreMine>scoreOpp?'W':'L';
 return {
  eventId:String(eventId||comp.id||summary?.header?.id||''),
  season:Number(season)||null,
  seasonType:num(summary?.header?.season?.type??comp?.type?.id??comp?.type?.type),
  date,
  team:mine.team?.abbreviation||mine.abbreviation||'',
  opponent:opp.team?.abbreviation||opp.abbreviation||'',
  homeAway:mine.homeAway||'',
  result,
  score:scoreMine!=null&&scoreOpp!=null?`${scoreMine}-${scoreOpp}`:'',
  stats,
  source:'ESPN event log + game summary box score'
 };
}

export function recentAverages(rows=[]){
 const out={};const keys=['goals','assists','points','sog','blocks','saves','shotsAgainst','goalsAgainst'];
 for(const key of keys){const vals=rows.map(r=>num(r?.stats?.[key])).filter(v=>v!=null);if(vals.length)out[key]=vals.reduce((a,b)=>a+b,0)/vals.length;}
 return out;
}

export function attachPriors(game,research){return game.players.map(p=>{const prior=research?.players?.[p.id];return {...p,prior:prior?.rates?.sog!=null&&prior.shootingPct!=null?{...prior.rates,shootingPct:prior.shootingPct}:null};});}
