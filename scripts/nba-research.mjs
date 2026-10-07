#!/usr/bin/env node
// Build slates/nba-research.json for TSO NBA 2.0.
// Uses ESPN teams, rosters, injuries, player event logs and completed game summaries.
// Completed historical events are compacted into a separate cache for reuse.
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const ODDS_FILE=path.join(ROOT,'slates','nba-odds.json');
const OUT=path.join(ROOT,'slates','nba-research.json');
const CACHE_FILE=path.join(ROOT,'slates','nba-research-cache.json');
const VERSION=1;
const UA='TheSportsOutpost/1.0 (+https://thesportsoutpost.com)';
const now=new Date();
const CURRENT_SEASON=now.getUTCMonth()>=6?now.getUTCFullYear()+1:now.getUTCFullYear();
const PRIOR_SEASON=CURRENT_SEASON-1;
const MAX_GAMES=30;
const health={};

const n=v=>Number.isFinite(Number(v))?Number(v):0;
const finite=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const round=(v,d=2)=>Number.isFinite(Number(v))?+Number(v).toFixed(d):null;
const avg=xs=>{const a=xs.map(finite).filter(v=>v!=null);return a.length?a.reduce((x,y)=>x+y,0)/a.length:null;};
const stdev=xs=>{const a=xs.map(finite).filter(v=>v!=null);if(a.length<2)return null;const m=avg(a);return Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/(a.length-1));};

async function readJson(file,fallback=null){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch{return fallback;}}
async function writeJson(file,value){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(value,null,2)+'\n');}

function espnCandidates(url){
  const out=[url];
  if(url.includes('://site.api.espn.com/'))out.push(url.replace('://site.api.espn.com/','://site.web.api.espn.com/'));
  else if(url.includes('://site.web.api.espn.com/'))out.push(url.replace('://site.web.api.espn.com/','://site.api.espn.com/'));
  return [...new Set(out)];
}
async function getJson(url,key=null,required=false){
  const attempts=[];
  for(const candidate of espnCandidates(url)){
    try{
      const r=await fetch(candidate,{headers:{
        'user-agent':UA,'accept':'application/json','accept-language':'en-US,en;q=0.9',
        'referer':'https://www.espn.com/','origin':'https://www.espn.com'
      },signal:AbortSignal.timeout(30000)});
      if(!r.ok){attempts.push(`${new URL(candidate).host}:${r.status}`);continue;}
      const j=await r.json();
      if(key)health[key]={ok:true,host:new URL(candidate).host};
      return j;
    }catch(e){attempts.push(String(e?.message||e));}
  }
  if(key)health[key]={ok:false,error:attempts.join(' | ')};
  if(required)throw new Error(`${key||url}: ${attempts.join(' | ')}`);
  return null;
}
async function parallelMap(items,limit,fn){
  let index=0;const out=new Array(items.length);
  await Promise.all(Array.from({length:Math.min(limit,Math.max(1,items.length))},async()=>{
    while(index<items.length){const i=index++;out[i]=await fn(items[i],i);}
  }));
  return out;
}

function flattenTeams(doc){
  const arr=doc?.sports?.flatMap(s=>s?.leagues||[]).flatMap(l=>l?.teams||[])||doc?.teams||[];
  return arr.map(x=>x?.team||x).filter(Boolean).map(t=>({
    id:String(t.id||''),name:t.displayName||[t.location,t.name].filter(Boolean).join(' ')||t.name||'',
    shortName:t.shortDisplayName||t.name||'',abbr:t.abbreviation||'',logo:t.logos?.[0]?.href||t.logo||null
  })).filter(t=>t.id&&t.name);
}
function rosterItems(doc){
  const out=[];
  const walk=node=>{
    if(!node)return;
    if(Array.isArray(node)){node.forEach(walk);return;}
    if(typeof node!=='object')return;
    if((node.id||node.athlete?.id)&&(node.fullName||node.displayName||node.athlete?.fullName||node.athlete?.displayName)){
      const p=node.athlete||node;out.push(p);
    }
    if(Array.isArray(node.items))walk(node.items);
    if(Array.isArray(node.athletes))walk(node.athletes);
  };
  walk(doc?.athletes||doc?.items||doc?.team?.athletes||[]);
  const seen=new Set();
  return out.filter(p=>{const id=String(p?.id||'');if(!id||seen.has(id))return false;seen.add(id);return true;});
}
function injuryMap(doc){
  const out={byId:new Map(),byName:new Map()};
  const walk=(node,teamName='')=>{
    if(!node)return;
    if(Array.isArray(node)){node.forEach(x=>walk(x,teamName));return;}
    if(typeof node!=='object')return;
    const nextTeam=node?.team?.displayName||node?.team?.name||teamName;
    if(node.athlete&&(node.status||node.type||node.details||node.description)){
      const a=node.athlete,status=clean(node.status?.type||node.status?.name||node.status||node.type?.description||node.type?.name||'')||null;
      const record={status,detail:clean(node.details?.detail||node.details?.type||node.description||'')||null,date:node.date||null,team:nextTeam||null};
      if(a.id)out.byId.set(String(a.id),record);
      if(a.fullName||a.displayName)out.byName.set(norm(a.fullName||a.displayName),record);
    }
    for(const [k,v] of Object.entries(node)){
      if(['athlete','team'].includes(k))continue;
      if(v&&typeof v==='object')walk(v,nextTeam);
    }
  };
  walk(doc);
  return out;
}
function eventIdFromLogItem(item){
  for(const value of [item?.event?.$ref,item?.event?.ref,item?.event?.href,item?.event,item?.id,item?.eventId]){
    const s=String(value||''),m=s.match(/events\/(\d+)/)||s.match(/^(\d{6,})$/);
    if(m)return m[1];
  }
  return null;
}
function sampleLogItems(doc){
  const items=doc?.events?.items||doc?.items||[];
  const played=items.filter(x=>x?.played!==false&&eventIdFromLogItem(x));
  const picks=[...played.slice(0,18),...played.slice(-18)];
  const seen=new Set();return picks.filter(x=>{const id=eventIdFromLogItem(x);if(!id||seen.has(id))return false;seen.add(id);return true;});
}
function parseMadeAttempt(value){
  const s=String(value||''),m=s.match(/(\d+)\s*-\s*(\d+)/);
  return m?{made:Number(m[1]),attempts:Number(m[2])}:{made:finite(value)||0,attempts:0};
}
function minutesValue(v){
  const s=String(v??'').trim();
  if(!s)return 0;
  if(/^\d+(?:\.\d+)?$/.test(s))return Number(s);
  const m=s.match(/^(\d+):(\d+)$/);return m?Number(m[1])+Number(m[2])/60:0;
}
function statMap(labels,stats){
  const out={};(labels||[]).forEach((label,i)=>out[String(label||'').toUpperCase()]=stats?.[i]??'');return out;
}
function statusCompleted(summary){
  const h=summary?.header?.competitions?.[0]?.status?.type;
  return h?.completed===true||h?.state==='post';
}
function compactSummary(summary,eventId){
  if(!summary||!statusCompleted(summary))return null;
  const comp=summary?.header?.competitions?.[0]||{},competitors=comp.competitors||[],teams={};
  for(const c of competitors){
    const t=c?.team||{};
    teams[String(t.id||c.id||'')]={id:String(t.id||c.id||''),name:t.displayName||t.name||'',abbr:t.abbreviation||'',homeAway:c.homeAway||''};
  }
  const rows=[];
  for(const block of summary?.boxscore?.players||[]){
    const team=block?.team||{},teamId=String(team.id||'');
    const stats=(block.statistics||[]).find(x=>Array.isArray(x?.athletes)&&x.athletes.length)||(block.statistics||[])[0];
    if(!stats)continue;
    const labels=stats.labels||stats.names||[];
    for(const item of stats.athletes||[]){
      if(item?.didNotPlay)continue;
      const a=item?.athlete||{},m=statMap(labels,item?.stats||[]);
      const fg=parseMadeAttempt(m.FG??m['FGM-A']),three=parseMadeAttempt(m['3PT']??m['3PM-A']),ft=parseMadeAttempt(m.FT??m['FTM-A']);
      const points=n(m.PTS??m.POINTS),rebounds=n(m.REB??m.REBOUNDS),assists=n(m.AST??m.ASSISTS);
      const turnovers=n(m.TO??m.TURNOVERS),oreb=n(m.OREB??m['OFF REB']),minutes=minutesValue(m.MIN??m.MINUTES);
      if(!a.id||minutes<=0)continue;
      rows.push({
        id:String(a.id),name:a.displayName||a.fullName||'',teamId,position:a.position?.abbreviation||item?.position?.abbreviation||'',
        minutes:round(minutes,2),points,rebounds,assists,threes:three.made,pra:points+rebounds+assists,
        fga:fg.attempts,fta:ft.attempts,turnovers,oreb,usageProxy:round(fg.attempts+.44*ft.attempts+turnovers,2)
      });
    }
  }
  if(!rows.length)return null;
  const teamPoss={};
  for(const id of Object.keys(teams)){
    const ps=rows.filter(p=>p.teamId===id);
    teamPoss[id]=ps.reduce((s,p)=>s+p.fga+.44*p.fta-p.oreb+p.turnovers,0);
  }
  const pace=round(avg(Object.values(teamPoss)),2);
  const season=Number(summary?.header?.season?.year||summary?.header?.season?.calendarYear||0)||null;
  const seasonType=Number(summary?.header?.season?.type?.id||summary?.header?.season?.type||comp?.type?.id||0)||null;
  return {eventId:String(eventId),date:comp.date||summary?.header?.date||null,season,seasonType,teams,pace,players:rows};
}
function positionGroup(pos){
  const p=String(pos||'').toUpperCase();
  if(['PG','SG','G'].includes(p))return 'G';
  if(['SF','PF','F'].includes(p))return 'F';
  if(['C','FC','F-C','C-F'].includes(p))return 'C';
  return p||'ALL';
}
function opponentForGame(game,teamId){return Object.values(game?.teams||{}).find(t=>String(t.id)!==String(teamId))||null;}
function playerGame(game,playerId,teamId){
  if(!game)return null;
  const p=(game.players||[]).find(x=>String(x.id)===String(playerId));if(!p)return null;
  const own=game.teams?.[String(teamId)]||game.teams?.[String(p.teamId)]||null,opp=opponentForGame(game,p.teamId);
  return {
    eventId:game.eventId,date:game.date,season:game.season,seasonType:game.seasonType,
    teamId:p.teamId,opponentTeamId:opp?.id||null,opponent:opp?.name||opp?.abbr||null,
    homeAway:own?.homeAway||null,pace:game.pace,minutes:p.minutes,usageProxy:p.usageProxy,
    stats:{points:p.points,rebounds:p.rebounds,assists:p.assists,threes:p.threes,pra:p.pra}
  };
}
function buildProfiles(eventGames,teams){
  const metrics=['points','rebounds','assists','threes','pra'],teamPace=new Map(),defGames=new Map();
  const leagueVals={G:{},F:{},C:{}},marketVals={};for(const m of metrics)marketVals[m]=[];
  for(const pos of ['G','F','C'])for(const m of metrics)leagueVals[pos][m]=[];
  for(const game of Object.values(eventGames)){
    if(!game?.players?.length)continue;
    for(const tid of Object.keys(game.teams||{})){if(!teamPace.has(tid))teamPace.set(tid,[]);if(game.pace!=null)teamPace.get(tid).push(game.pace);}
    for(const p of game.players){
      const pos=positionGroup(p.position);if(!leagueVals[pos])continue;
      for(const m of metrics){const v=finite(p[m]);if(v!=null){leagueVals[pos][m].push(v);marketVals[m].push(v);}}
    }
    for(const defenseId of Object.keys(game.teams||{})){
      const offense=(game.players||[]).filter(p=>String(p.teamId)!==String(defenseId));
      for(const pos of ['G','F','C']){
        const ps=offense.filter(p=>positionGroup(p.position)===pos);if(!ps.length)continue;
        const key=`${defenseId}|${pos}`;if(!defGames.has(key))defGames.set(key,{games:0,sums:Object.fromEntries(metrics.map(m=>[m,0]))});
        const a=defGames.get(key);a.games++;for(const m of metrics)a.sums[m]+=ps.reduce((s,p)=>s+n(p[m]),0);
      }
    }
  }
  const teamProfiles={},teamDefense={};
  for(const t of teams){
    teamProfiles[t.id]={pace:round(avg(teamPace.get(t.id)||[]),2),games:(teamPace.get(t.id)||[]).length};
    teamDefense[t.id]={byPosition:{}};
    for(const pos of ['G','F','C']){
      const a=defGames.get(`${t.id}|${pos}`);if(!a?.games)continue;
      teamDefense[t.id].byPosition[pos]=Object.fromEntries(metrics.map(m=>[m,round(a.sums[m]/a.games,2)]));
    }
  }
  const allowByPosition={},playerByPosition={};
  for(const pos of ['G','F','C']){
    allowByPosition[pos]={};playerByPosition[pos]={};
    for(const m of metrics){
      allowByPosition[pos][m]=round(avg(teams.map(t=>teamDefense[t.id]?.byPosition?.[pos]?.[m]).filter(v=>v!=null)),2);
      playerByPosition[pos][m]=round(avg(leagueVals[pos][m]),2);
    }
  }
  return {teamProfiles,teamDefense,league:{
    pace:round(avg([...teamPace.values()].flat()),2),allowByPosition,playerByPosition,
    marketSd:Object.fromEntries(metrics.map(m=>[m,round(stdev(marketVals[m]),2)]))
  }};
}

async function main(){
  const odds=await readJson(ODDS_FILE);
  if(!odds?.rows?.length)throw new Error('slates/nba-odds.json has no sportsbook rows.');
  const cache=await readJson(CACHE_FILE,{version:VERSION,eventGames:{},eventlogChecked:{}});
  cache.version=VERSION;cache.eventGames??={};cache.eventlogChecked??={};

  const [teamDoc,injDoc]=await Promise.all([
    getJson('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams?limit=50','espnTeams',true),
    getJson('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries','espnInjuries',false)
  ]);
  const teams=flattenTeams(teamDoc),injuries=injuryMap(injDoc||{});
  health.espnTeams={...(health.espnTeams||{}),rows:teams.length};

  const rosterPayloads=await parallelMap(teams,8,async t=>{
    const doc=await getJson(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${t.id}/roster`,`roster:${t.abbr}`,false);
    return {team:t,players:rosterItems(doc||{})};
  });
  const rosterByName=new Map();
  for(const block of rosterPayloads){
    for(const p of block.players){
      const rec={id:String(p.id),name:p.displayName||p.fullName||'',teamId:block.team.id,team:block.team.name,abbr:block.team.abbr,position:p.position?.abbreviation||'',headshot:p.headshot?.href||p.headshot||null};
      if(rec.name)rosterByName.set(norm(rec.name),rec);
    }
  }

  const targetNames=[...new Set((odds.rows||[]).map(r=>clean(r.player)).filter(Boolean))];
  const targets=targetNames.map(name=>rosterByName.get(norm(name))).filter(Boolean);
  const missingTargets=targetNames.filter(name=>!rosterByName.has(norm(name)));
  health.targetPlayers={requested:targetNames.length,resolved:targets.length,missing:missingTargets};

  const refsByPlayer=new Map();
  await parallelMap(targets,6,async player=>{
    const refs=[],seen=new Set();
    for(const season of [CURRENT_SEASON,PRIOR_SEASON]){
      const key=`${player.id}:${season}`;
      const doc=await getJson(`https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/${season}/athletes/${player.id}/eventlog?limit=50`,`eventlog:${key}`,false);
      for(const item of sampleLogItems(doc||{})){
        const eventId=eventIdFromLogItem(item);if(!eventId||seen.has(eventId))continue;seen.add(eventId);refs.push({eventId,season});
      }
      cache.eventlogChecked[key]=Date.now();
    }
    refsByPlayer.set(player.id,refs);
  });

  const eventIds=[...new Set([...refsByPlayer.values()].flat().map(x=>x.eventId))],missingEvents=eventIds.filter(id=>!cache.eventGames[id]);
  await parallelMap(missingEvents,8,async eventId=>{
    const summary=await getJson(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${eventId}`,`summary:${eventId}`,false);
    const compact=compactSummary(summary,eventId);if(compact)cache.eventGames[eventId]=compact;
  });
  health.eventCache={referenced:eventIds.length,fetched:missingEvents.length,cached:Object.keys(cache.eventGames).length};

  const players={};
  for(const target of targets){
    const refs=refsByPlayer.get(target.id)||[];
    const games=refs.map(ref=>playerGame(cache.eventGames[ref.eventId],target.id,target.teamId)).filter(Boolean)
      .sort((a,b)=>Date.parse(b.date||0)-Date.parse(a.date||0)).slice(0,MAX_GAMES);
    const injury=injuries.byId.get(target.id)||injuries.byName.get(norm(target.name))||null;
    players[target.id]={...target,injury,recentGames:games,gameCount:games.length,fetchedAt:new Date().toISOString()};
  }

  const profiles=buildProfiles(cache.eventGames,teams),teamIndex={},nameIndex={};
  for(const t of teams)for(const alias of [t.name,t.shortName,t.abbr])if(alias)teamIndex[norm(alias)]=t.id;
  for(const p of Object.values(players))nameIndex[norm(p.name)]=p.id;

  const output={
    version:VERSION,modelDataVersion:'nba-history-v1',generatedAt:new Date().toISOString(),
    currentSeason:CURRENT_SEASON,priorSeason:PRIOR_SEASON,
    source:'ESPN teams, rosters, injuries, player event logs and game-summary box scores',
    note:'Player projections are built only from verified completed ESPN game box scores. Pace is a possession estimate from attempts, free throws, offensive rebounds and turnovers.',
    health,teams:Object.fromEntries(teams.map(t=>[t.id,t])),teamIndex,players,nameIndex,
    teamProfiles:profiles.teamProfiles,teamDefense:profiles.teamDefense,league:profiles.league
  };
  cache.generatedAt=output.generatedAt;cache.currentSeason=CURRENT_SEASON;cache.priorSeason=PRIOR_SEASON;
  await writeJson(OUT,output);await writeJson(CACHE_FILE,cache);
  console.log(`NBA research v${VERSION}: ${targets.length}/${targetNames.length} sportsbook players resolved; ${Object.keys(players).length} player histories; ${eventIds.length} referenced events; ${missingEvents.length} new summaries requested; ${missingTargets.length} unresolved names.`);
}
main().catch(e=>{console.error(e?.stack||e);process.exit(1);});
