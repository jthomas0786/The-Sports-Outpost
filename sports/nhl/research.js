import {num} from './data.js';

export function seasonPrior(doc,season,now=Date.now()){
 const categories=doc?.splits?.categories;if(!Array.isArray(categories))return null;
 const stats=Object.fromEntries(categories.flatMap(c=>c.stats||[]).map(s=>[s.name,num(s.value)]));
 const games=stats.games;if(!(games>0))return null;
 const rates={};
 for(const [key,source] of Object.entries({sog:'shotsTotal',goals:'goals',assists:'assists',blocks:'blockedShots',saves:'saves',goalsAgainst:'goalsAgainst',shotsAgainst:'shotsAgainst',ppGoals:'powerPlayGoals'}))if(stats[source]!=null&&stats[source]>=0)rates[key]=stats[source]/games;
 if(rates.goals!=null&&rates.assists!=null)rates.points=rates.goals+rates.assists;
 const shootingPct=stats.shotsTotal>0&&stats.goals>=0&&stats.goals<=stats.shotsTotal?(stats.goals+10)/(stats.shotsTotal+100):null;
 const savePct=stats.saves>=0&&stats.goalsAgainst>=0&&stats.saves+stats.goalsAgainst>0?stats.saves/(stats.saves+stats.goalsAgainst):null;
 return {season,games,rates,shootingPct,savePct,source:'ESPN season statistics',fetchedAt:now};
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
function clockSeconds(clock){const m=String(clock||'').match(/^(\d+):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):null;}
function firstGoalScorerId(summary){
 const goals=(summary?.plays||[]).filter(p=>p?.scoringPlay&&p?.type?.text==='Goal'&&!/shootout/i.test(`${p?.period?.displayValue||''} ${p?.text||''}`));
 goals.sort((a,b)=>{
  const pa=Number(a?.period?.number||99),pb=Number(b?.period?.number||99);if(pa!==pb)return pa-pb;
  const ca=clockSeconds(a?.clock?.displayValue),cb=clockSeconds(b?.clock?.displayValue);return (cb??-1)-(ca??-1);
 });
 const first=goals[0];if(!first)return null;
 const scorer=first?.participants?.find(x=>x?.type==='scorer')?.athlete||first?.participants?.[0]?.athlete;
 return scorer?.id!=null?String(scorer.id):null;
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
 const scoreMine=num(mine.score),scoreOpp=num(opp.score),fg=firstGoalScorerId(summary);
 const playerGoals=(summary?.plays||[]).filter(p=>p?.scoringPlay&&p?.type?.text==='Goal'&&!/shootout/i.test(`${p?.period?.displayValue||''} ${p?.text||''}`)).filter(p=>String(p?.participants?.find(x=>x?.type==='scorer')?.athlete?.id||p?.participants?.[0]?.athlete?.id||'')===String(playerId));
 stats.ppGoals=playerGoals.filter(p=>/power\s*play|\bPP\b/i.test(`${p?.strength?.text||''} ${p?.text||''}`)).length;
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
  firstGoal:fg!=null?fg===String(playerId):false,
  firstGoalScorerId:fg,
  stats,
  source:'ESPN event log + game summary box score'
 };
}

export function recentAverages(rows=[]){
 const out={};const keys=['goals','assists','points','sog','blocks','saves','shotsAgainst','goalsAgainst','ppGoals'];
 for(const key of keys){const vals=rows.map(r=>num(r?.stats?.[key])).filter(v=>v!=null);if(vals.length)out[key]=vals.reduce((a,b)=>a+b,0)/vals.length;}
 return out;
}


export function nhlPositionGroup(value){
 const p=String(value||'').toUpperCase().replace(/\s+/g,'');
 if(p==='C'||p==='CENTER')return 'C';
 if(p==='LW'||p==='LEFTWING')return 'LW';
 if(p==='RW'||p==='RIGHTWING')return 'RW';
 if(p==='W'||p==='F'||p==='WING'||p==='FORWARD')return 'W';
 if(p==='D'||p==='DEFENSE'||p==='DEFENSEMAN')return 'D';
 return p==='G'?'G':'UNK';
}
function summaryPlayerPositions(summary){
 const out=new Map();
 for(const group of summary?.boxscore?.players||[])for(const section of group?.statistics||[])for(const row of section?.athletes||[]){
  const id=row?.athlete?.id;if(id==null)continue;
  out.set(String(id),nhlPositionGroup(row?.athlete?.position?.abbreviation||row?.athlete?.position?.name||''));
 }
 return out;
}
function summaryTeamMap(summary){
 const comp=summary?.header?.competitions?.[0],teams=comp?.competitors||[],out=new Map();
 for(const t of teams){
  const id=String(t?.team?.id??t?.id??''),abbr=String(t?.team?.abbreviation||t?.abbreviation||'').toUpperCase();
  if(id&&abbr)out.set(id,abbr);
 }
 return {comp,teams,out};
}
function regularGoalPlays(summary){
 return (summary?.plays||[]).filter(p=>p?.scoringPlay&&p?.type?.text==='Goal'&&!/shootout/i.test(\`${p?.period?.displayValue||''} ${p?.text||''}\`));
}
function firstGoalPlay(goals=[]){
 return goals.slice().sort((a,b)=>{
  const pa=Number(a?.period?.number||99),pb=Number(b?.period?.number||99);if(pa!==pb)return pa-pb;
  const ca=clockSeconds(a?.clock?.displayValue),cb=clockSeconds(b?.clock?.displayValue);return (cb??-1)-(ca??-1);
 })[0]||null;
}
function blankPositionMap(){return {C:0,LW:0,RW:0,W:0,D:0,UNK:0};}
export function defenseGameFromSummary(summary,{eventId='',season=null}={}){
 const {comp,teams,out:teamMap}=summaryTeamMap(summary);if(!comp||teams.length<2)return null;
 const positions=summaryPlayerPositions(summary),goals=regularGoalPlays(summary),first=firstGoalPlay(goals);
 const sides=teams.map(t=>({id:String(t?.team?.id??t?.id??''),abbr:String(t?.team?.abbreviation||t?.abbreviation||'').toUpperCase(),score:num(t?.score)})).filter(t=>t.id&&t.abbr);
 if(sides.length<2)return null;
 const rows=new Map(sides.map(t=>[t.abbr,{team:t.abbr,opponent:sides.find(x=>x!==t)?.abbr||'',goalsAllowed:0,ppGoalsAllowed:0,positionGoalsAllowed:blankPositionMap(),positionShotsAllowed:blankPositionMap(),firstGoalPositionAllowed:blankPositionMap(),positionTracked:Array.isArray(summary?.plays)&&positions.size>0}]));
 for(const group of summary?.boxscore?.players||[]){
  const offense=String(group?.team?.abbreviation||teamMap.get(String(group?.team?.id||''))||'').toUpperCase(),defense=sides.find(t=>t.abbr!==offense)?.abbr;
  if(!offense||!defense||!rows.has(defense))continue;
  for(const section of group?.statistics||[]){
   const shotIndex=(section?.keys||[]).findIndex(k=>k==='shotsTotal'||k==='shotsOnGoal'||k==='shots');
   if(shotIndex<0)continue;
   for(const row of section?.athletes||[]){
    const pos=nhlPositionGroup(row?.athlete?.position?.abbreviation||row?.athlete?.position?.name||''),shots=num(row?.stats?.[shotIndex]);
    if(shots!=null&&shots>=0)rows.get(defense).positionShotsAllowed[pos]=(rows.get(defense).positionShotsAllowed[pos]||0)+shots;
   }
  }
 }
 for(const goal of goals){
  const scoring=String(teamMap.get(String(goal?.team?.id||''))||goal?.team?.abbreviation||'').toUpperCase(),defense=sides.find(t=>t.abbr!==scoring)?.abbr;if(!scoring||!defense||!rows.has(defense))continue;
  const scorer=goal?.participants?.find(x=>x?.type==='scorer')?.athlete||goal?.participants?.[0]?.athlete;
  const pos=nhlPositionGroup(scorer?.position?.abbreviation||positions.get(String(scorer?.id||''))||'');
  const row=rows.get(defense);row.goalsAllowed++;row.positionGoalsAllowed[pos]=(row.positionGoalsAllowed[pos]||0)+1;
  if(/power\s*play|\bPP\b/i.test(\`${goal?.strength?.text||''} ${goal?.text||''}\`))row.ppGoalsAllowed++;
  if(goal===first)row.firstGoalPositionAllowed[pos]=(row.firstGoalPositionAllowed[pos]||0)+1;
 }
 for(const t of sides){
  const row=rows.get(t.abbr);
  if(goals.length===0&&t.score!=null)row.goalsAllowed=Math.max(0,t.score);
 }
 return {eventId:String(eventId||comp.id||summary?.header?.id||''),season:Number(season??summary?.header?.season?.year??summary?.header?.season?.type)||null,seasonType:num(summary?.header?.season?.type??comp?.type?.id??comp?.type?.type),date:comp?.date||summary?.header?.date||'',teams:[...rows.values()],source:'ESPN game summary scoring + box score'};
}
function ratioIndex(value,baseline,games,capLow=.68,capHigh=1.42){
 if(!(value>=0)||!(baseline>0))return 1;
 const raw=clampLocal(value/baseline,capLow,capHigh),w=clampLocal(Number(games||0)/(Number(games||0)+8),0,.82);
 return 1+(raw-1)*w;
}
const clampLocal=(v,a,b)=>Math.max(a,Math.min(b,v));
export function summarizeTeamDefense(defenseGames=[],currentSeason=null){
 const events=(Array.isArray(defenseGames)?defenseGames:Object.values(defenseGames||{})).filter(Boolean),byTeam=new Map();
 for(const event of events){
  if(Number(event?.seasonType)!==2)continue;
  for(const row of event?.teams||[]){
   if(!row?.team)continue;
   if(!byTeam.has(row.team))byTeam.set(row.team,[]);
   byTeam.get(row.team).push({...row,eventId:event.eventId,date:event.date,season:event.season});
  }
 }
 const selected=new Map();
 for(const [team,rows] of byTeam)selected.set(team,rows.slice().sort((a,b)=>Date.parse(b.date||0)-Date.parse(a.date||0)).slice(0,30));
 const tracked=[...selected.values()].flat().filter(r=>r.positionTracked),games=Math.max(1,tracked.length);
 const posKeys=['C','LW','RW','W','D','UNK'],league={games,goals:0,ppGoals:0,position:{}};
 for(const p of posKeys)league.position[p]={goals:0,shots:0,firstGoals:0};
 for(const r of tracked){
  league.goals+=Number(r.goalsAllowed||0);league.ppGoals+=Number(r.ppGoalsAllowed||0);
  for(const p of posKeys){league.position[p].goals+=Number(r.positionGoalsAllowed?.[p]||0);league.position[p].shots+=Number(r.positionShotsAllowed?.[p]||0);league.position[p].firstGoals+=Number(r.firstGoalPositionAllowed?.[p]||0);}
 }
 league.goalsPerGame=league.goals/games;league.ppGoalsPerGame=league.ppGoals/games;
 for(const p of posKeys){league.position[p].goalsPerGame=league.position[p].goals/games;league.position[p].shotsPerGame=league.position[p].shots/games;league.position[p].firstGoalRate=league.position[p].firstGoals/games;}
 const teams={};
 for(const [team,rows] of selected){
  const posRows=rows.filter(r=>r.positionTracked),n=Math.max(1,posRows.length),recent10=posRows.slice(0,10),current=posRows.filter(r=>currentSeason==null||Number(r.season)===Number(currentSeason));
  const sum=(arr,key)=>arr.reduce((s,r)=>s+Number(r?.[key]||0),0);
  const profile={team,games:posRows.length,currentSeasonGames:current.length,goalsAllowedPerGame:sum(posRows,'goalsAllowed')/n,recent10GoalsAllowedPerGame:recent10.length?sum(recent10,'goalsAllowed')/recent10.length:null,ppGoalsAllowedPerGame:sum(posRows,'ppGoalsAllowed')/n,position:{},source:'ESPN last 30 regular-season game summaries'};
  profile.overallIndex=ratioIndex(profile.goalsAllowedPerGame,league.goalsPerGame,posRows.length,.72,1.34);
  profile.ppIndex=ratioIndex(profile.ppGoalsAllowedPerGame,league.ppGoalsPerGame,posRows.length,.68,1.42);
  for(const p of posKeys){
   const goals=posRows.reduce((s,r)=>s+Number(r.positionGoalsAllowed?.[p]||0),0),shots=posRows.reduce((s,r)=>s+Number(r.positionShotsAllowed?.[p]||0),0),fg=posRows.reduce((s,r)=>s+Number(r.firstGoalPositionAllowed?.[p]||0),0);
   const goalsPerGame=goals/n,shotsPerGame=shots/n,firstGoalRate=fg/n;
   profile.position[p]={goalsAllowed:goals,goalsPerGame,shotsPerGame,firstGoalRate,goalIndex:ratioIndex(goalsPerGame,league.position[p].goalsPerGame,posRows.length),shotIndex:ratioIndex(shotsPerGame,league.position[p].shotsPerGame,posRows.length),firstGoalIndex:ratioIndex(firstGoalRate,league.position[p].firstGoalRate,posRows.length,.65,1.5),games:posRows.length};
  }
  teams[team]=profile;
 }
 for(const p of posKeys){
  const ranked=Object.values(teams).filter(t=>t.position?.[p]?.games>0).sort((a,b)=>b.position[p].goalsPerGame-a.position[p].goalsPerGame);
  ranked.forEach((t,i)=>{t.position[p].goalAllowedRank=i+1;t.position[p].rankedTeams=ranked.length;});
 }
 return {generatedAt:new Date().toISOString(),currentSeason:Number(currentSeason)||null,league,teams};
}

export function attachPriors(game,research){return game.players.map(p=>{const prior=research?.players?.[p.id];return {...p,prior:prior?.rates?.sog!=null&&prior.shootingPct!=null?{...prior.rates,shootingPct:prior.shootingPct}:null};});}
