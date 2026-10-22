/* TSO 3.0 isolated development preview.
 * Serves original frontend files from tso-3.0 branch.
 * Proxy only preapproved TSO 2.0 preview source feeds, never production.
 * No credentials or signup proxy. */
const RAW='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/tso-3.0/tso3/';
const UPSTREAM='https://tso2-preview.jthomas0786-tso.workers.dev';
const TYPES={'/':'text/html; charset=utf-8','/index.html':'text/html; charset=utf-8','/app.js':'application/javascript; charset=utf-8','/styles.css':'text/css; charset=utf-8','/nba-lab.js':'application/javascript; charset=utf-8','/nba-depth.js':'application/javascript; charset=utf-8'};
const headers={'access-control-allow-origin':'*','x-tso-version':'3.0-preview','x-robots-tag':'noindex, nofollow'};
const COLLEGE_FEED='https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard';
const WOMEN_FEED='https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard';
const FIRST_BASKET_SOURCE='https://tso2-nba-first-basket.jthomas0786-tso.workers.dev/';

const NBA_MODEL_SOURCE='https://tso2-nba-model.jthomas0786-tso.workers.dev/';
const NBA_RESEARCH_SOURCE='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/main/slates/nba-research.json';
const NBA_ODDS_SOURCE='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/main/slates/nba-odds.json';
const NBA_INJURIES_SOURCE='https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries';
function sanitizeNbaResearch(doc){
 if(!doc||typeof doc!=='object'||!doc.players||!doc.teams)throw Error('Invalid verified research schema');
 const stats=['points','rebounds','assists','threes','pra','minutes','steals','blocks'];
 const outPlayers={};
 for(const [id,p] of Object.entries(doc.players)){
  if(!p?.name||!p?.teamId)continue;
  const played=Array.isArray(p.recentGames)?p.recentGames:[];
  const games=played.filter(g=>g?.date&&g?.stats&&Number.isFinite(Date.parse(g.date))&&Number(g.seasonType)!==1)
   .sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,45)
   .map(g=>({date:g.date,opponent:g.opponent||null,homeAway:g.homeAway||null,season:g.season||null,seasonType:g.seasonType||null,
     minutes:Number.isFinite(Number(g.minutes))?Number(g.minutes):null,stats:Object.fromEntries(stats.filter(k=>g.stats?.[k]!==null&&g.stats?.[k]!==undefined&&Number.isFinite(Number(g.stats[k]))).map(k=>[k,Number(g.stats[k])]))}));
  outPlayers[id]={id:String(p.id||id),name:String(p.name),position:p.position||null,team:p.team||null,teamId:String(p.teamId),
    headshot:p.headshot||null,injury:p.injury||null,recentGames:games};
 }
 return {source:'TSO public NBA research / ESPN-derived history',generatedAt:doc.generatedAt||null,currentSeason:doc.currentSeason||null,
  players:outPlayers,teams:doc.teams,teamIndex:doc.teamIndex||{},teamDefense:doc.teamDefense||{},league:doc.league||{},teamProfiles:doc.teamProfiles||{}};
}
async function safeNbaInjuries(){
 const r=await fetch(NBA_INJURIES_SOURCE,{headers:{accept:'application/json'},cf:{cacheEverything:true,cacheTtl:120},signal:AbortSignal.timeout(14000)});
 if(!r.ok)throw Error('ESPN injury feed '+r.status);
 const d=await r.json();
 if(!Array.isArray(d?.injuries))throw Error('Invalid injury schema');
 const entries=[],seen=new Set();
 for(const team of d.injuries){
  for(const i of Array.isArray(team.injuries)?team.injuries:[]){
   const athlete=i.athlete||{},officialCard=athlete.links?.find(l=>typeof l.href==='string'&&/\/player\/_\/id\/\d+/.test(l.href))?.href||'',id=String(athlete.id||officialCard.match(/\/player\/_\/id\/(\d+)/)?.[1]||'');
   const teamId=String(athlete.team?.id||team.id||'');
   if(!id||!athlete.displayName||!teamId)continue;
   const key=teamId+'|'+id;
   if(seen.has(key))continue;seen.add(key);
   const status=String(i.status||i.details?.fantasyStatus?.description||'Unknown');
   const date=i.date||null;
   entries.push({athleteId:id,player:String(athlete.displayName),teamId,
    team:athlete.team?.abbreviation||team.displayName||null,status,
    updatedAt:date,detail:i.details?.type||null,
    returnDate:i.details?.returnDate||null,
    report:i.shortComment?String(i.shortComment).slice(0,500):null});
  }
 }
 return {source:'ESPN NBA injuries',fetchedAt:new Date().toISOString(),providerTimestamp:d.timestamp||null,entries,
  notice:'Injury feed status is not a verified starting lineup or personal medical diagnosis. Reports can change.'};
}
async function safeNbaOdds(){
 const r=await fetch(NBA_ODDS_SOURCE,{headers:{accept:'application/json'},cf:{cacheEverything:true,cacheTtl:60},signal:AbortSignal.timeout(16000)});
 if(!r.ok)throw Error('Odds source HTTP '+r.status);
 const data=await r.json();
 const fetchedAt=data?.meta?.fetchedAt;
 const time=Date.parse(fetchedAt||'');
 if(!Array.isArray(data?.rows)||!Number.isFinite(time))throw Error('Invalid NBA odds source metadata');
 const age=Date.now()-time;
 // Old snapshots must never be presented as current sportsbook selections.
 if(age>12*3600000||age< -3600000)return {source:'TSO NBA odds snapshot',fetchedAt,available:false,stale:true,rows:[]};
 const now=Date.now();
 const rows=data.rows.filter(q=>{
  const start=Date.parse(q?.commenceTime||'');
  return q?.player&&q?.book&&['points','rebounds','assists','threes','pra'].includes(String(q.market||''))&&Number.isFinite(Number(q.line))&&Number.isFinite(Number(q.overPrice))&&Number(q.overPrice)!==0&&Number.isFinite(start)&&start>now-15*60000;
 }).slice(0,6500).map(q=>({
  sport:'nba',player:String(q.player).replace(/\s*\([A-Za-z]{2,5}\)\s*$/,'').trim(),market:String(q.market),side:'over',line:Number(q.line),
  price:Number(q.overPrice),book:String(q.book),eventId:String(q.eventId||''),
  commenceTime:q.commenceTime,homeTeam:q.homeTeam||null,awayTeam:q.awayTeam||null,
  snapshotTime:fetchedAt,source:'TSO NBA odds snapshot'
 }));
 return {source:'TSO NBA odds snapshot',fetchedAt,available:true,stale:false,rows};
}

async function safeNbaDocument(url,kind,env){
 const r=kind==='models'&&env?.NBA_MODEL_SERVICE?.fetch
  ?await env.NBA_MODEL_SERVICE.fetch(new Request(NBA_MODEL_SOURCE,{headers:{accept:'application/json'}}))
  :await fetch(url,{headers:{accept:'application/json'},cf:{cacheEverything:true,cacheTtl:kind==='research'?300:90},signal:AbortSignal.timeout(16000)});
 if(!r.ok)throw Error('NBA source '+r.status);
 const data=await r.json();
 if(kind==='research')return sanitizeNbaResearch(data);
 if(!Array.isArray(data?.models))throw Error('Invalid NBA model schema');
 return {source:data.source||'TSO NBA regression',generatedAt:data.generatedAt||null,researchGeneratedAt:data.researchGeneratedAt||null,
  models:data.models.filter(x=>x?.available!==false&&Number.isFinite(Date.parse(x.commenceTime||''))&&Date.parse(x.commenceTime)>Date.now()-15*60000).map(m=>({key:m.key,eventId:m.eventId,commenceTime:m.commenceTime,player:m.player,playerId:m.playerId,
    team:m.team,teamId:m.teamId,position:m.position,headshot:m.headshot,market:m.market,line:m.line,
    opponent:m.opponent,opponentId:m.opponentId,venue:m.venue,projection:m.projection,overProbability:m.overProbability,
    sampleGames:m.sampleGames,last5:m.last5,last10:m.last10,seasonBaseline:m.seasonBaseline,
    averageMinutes:m.averageMinutes,recentMinutes:m.recentMinutes,usageProxy:m.usageProxy,recentUsageProxy:m.recentUsageProxy,
    opponentAllowance:m.opponentAllowance,leaguePositionAllowance:m.leaguePositionAllowance,expectedPace:m.expectedPace,
    leaguePace:m.leaguePace,grade:m.grade,injury:m.injury,recentGames:Array.isArray(m.recentGames)?m.recentGames.slice(0,10):[],
    researchGeneratedAt:m.researchGeneratedAt,oddsGeneratedAt:m.oddsGeneratedAt}))};
}

const isoDay=date=>date.toISOString().slice(0,10).replace(/-/g,'');
async function officialGames(url,league){
 const from=new Date(),until=new Date(Date.now()+8*86400000);
 const endpoint=url+'?dates='+isoDay(from)+'-'+isoDay(until)+'&limit=350';
 const res=await fetch(endpoint,{headers:{accept:'application/json'},cf:{cacheEverything:true,cacheTtl:300},signal:AbortSignal.timeout(10000)});
 if(!res.ok)throw Error('Verified ESPN scoreboard unavailable: '+league);
 const json=await res.json();
 if(!Array.isArray(json?.events))throw Error('Invalid '+league+' scoreboard schema');
 const games=[];
 for(const e of json.events){
  const comp=e.competitions?.[0];if(!comp)continue;
  const home=comp.competitors?.find(x=>x.homeAway==='home'),away=comp.competitors?.find(x=>x.homeAway==='away');
  if(!home?.team?.id||!away?.team?.id||!e.id)continue;
  const team=c=>({id:String(c.team.id),name:String(c.team.displayName||c.team.name||''),abbr:String(c.team.abbreviation||''),
   logo:String(c.team.logo||c.team.logos?.[0]?.href||''),score:c.score??null,
   record:String(c.records?.find(r=>r.type==='total')?.summary||c.records?.[0]?.summary||'')});
  const status=comp.status?.type||e.status?.type||{};
  const state=status.completed===true?'post':status.state==='in'?'in':'pre';
  const startTime=e.date||comp.date;
  if(!Number.isFinite(Date.parse(startTime||'')))continue;
  games.push({id:String(e.id),league,state,startTime,away:team(away),home:team(home),
    venue:String(comp.venue?.fullName||''),period:comp.status?.period||null,clock:comp.status?.displayClock||null,
    source:'ESPN official scoreboard'});
 }
 return games;
}
async function sixLeagueLive(){
 const result=await Promise.allSettled([
  fetch(UPSTREAM+'/api/live?league=all',{headers:{accept:'application/json'},signal:AbortSignal.timeout(12000)}).then(async r=>{if(!r.ok)throw Error('TSO staging scoreboard '+r.status);const d=await r.json();if(!Array.isArray(d?.games))throw Error('Invalid TSO game schema');return d}),
  officialGames(COLLEGE_FEED,'cfb'),
  officialGames(WOMEN_FEED,'wnba')
 ]);
 const base=result[0].status==='fulfilled'?result[0].value:{games:[]};
 const college=result[1].status==='fulfilled'?result[1].value:[];
 const women=result[2].status==='fulfilled'?result[2].value:[];
 const merged=new Map();
 for(const game of [...base.games,...college,...women]){
  if(!game?.id||!game?.league)continue;
  merged.set(game.league+':'+game.id,game);
 }
 if(result.every(r=>r.status==='rejected'))throw Error('All verified scoreboard feeds unavailable');
 return {...base,games:[...merged.values()],tso3:{sources:{
  tso2:result[0].status==='fulfilled'?'verified':'unavailable',
  cfb:result[1].status==='fulfilled'?'ESPN':'unavailable',
  wnba:result[2].status==='fulfilled'?'ESPN':'unavailable'
 },generatedAt:new Date().toISOString()}};
}

export default {async fetch(req,env){
 if(req.method==='OPTIONS')return new Response(null,{headers:{...headers,'access-control-allow-methods':'GET, HEAD, OPTIONS'}});
 if(!['GET','HEAD'].includes(req.method))return new Response('Method not allowed',{status:405,headers});
 const u=new URL(req.url);
 if(u.pathname==='/health')return Response.json({ok:true,service:'tso3-preview',version:'3.0',source:'tso-3.0/tso3',environment:'development'},{headers});
 if(u.pathname==='/api/nba-injuries'){
  try{
   return Response.json(await safeNbaInjuries(),{headers:{...headers,'cache-control':'no-store','x-tso-source':'ESPN NBA injuries'}});
  }catch(_){return Response.json({available:false,entries:[],error:'Official NBA injury feed unavailable'},{status:503,headers})}
 }
 if(u.pathname==='/api/nba-odds'){
  try{
   const doc=await safeNbaOdds();
   return Response.json(doc,{headers:{...headers,'cache-control':'no-store','x-tso-source':'TSO NBA odds snapshot'}});
  }catch(_){return Response.json({available:false,rows:[],error:'Current NBA odds snapshot unavailable'},{status:503,headers})}
 }
 if(u.pathname==='/api/nba-models'||u.pathname==='/api/nba-research'){
  const kind=u.pathname.endsWith('research')?'research':'models';
  try{
   const data=await safeNbaDocument(kind==='research'?NBA_RESEARCH_SOURCE:NBA_MODEL_SOURCE,kind,env);
   return Response.json(data,{headers:{...headers,'cache-control':'no-store','x-tso-source':'TSO-owned NBA research/model'}});
  }catch(_){
   return Response.json({available:false,error:'Verified NBA '+kind+' source is not accessible'},{status:503,headers:{...headers,'cache-control':'no-store'}});
  }
 }
 if(u.pathname==='/api/first-basket'){
  const home=String(u.searchParams.get('home')||'').toUpperCase();
  const away=String(u.searchParams.get('away')||'').toUpperCase();
  if(!/^[A-Z]{2,4}$/.test(home)||!/^[A-Z]{2,4}$/.test(away)||home===away)
   return Response.json({available:false,error:'Invalid matchup teams'},{status:400,headers});
  const p=new URLSearchParams({home,away});
  const before=String(u.searchParams.get('before')||'');
  if(Number.isFinite(Date.parse(before)))p.set('before',before);
  try{
   const r=await fetch(FIRST_BASKET_SOURCE+'?'+p.toString(),{headers:{accept:'application/json'},signal:AbortSignal.timeout(20000)});
   if(!r.ok)return Response.json({available:false,error:'Opening-event data unavailable'},{status:503,headers});
   return new Response(r.body,{headers:{...headers,'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-tso-source':'tso2-nba-first-basket'}});
  }catch(_){return Response.json({available:false,error:'Opening-event data unavailable'},{status:503,headers})}
 }
 if(['/api/live','/api/props'].includes(u.pathname)){
  if(u.pathname==='/api/live'){
   try{
    const combined=await sixLeagueLive();
    const only=String(u.searchParams.get('league')||'all').toLowerCase();
    if(only!=='all'&&['nfl','nba','mlb','nhl','wnba','cfb'].includes(only))
     combined.games=combined.games.filter(g=>g.league===only);
    return Response.json(combined,{headers:{...headers,'cache-control':'no-store','x-tso-source':'tso2-and-espn'}});
   }catch(error){return Response.json({available:false,error:'Verified scoreboard unavailable',games:[]},{status:503,headers});}
  }
  const params=new URLSearchParams(u.search);
  // Restrict the proxy's query surface to declared source-feed parameters.
  const safe=new URLSearchParams();
  if(['all','nfl','nba','mlb','nhl','wnba','cfb'].includes(params.get('league')))safe.set('league',params.get('league'));
  else safe.set('league','all');
  if(/^\d{4}-\d{2}-\d{2}$/.test(params.get('date')||''))safe.set('date',params.get('date'));
  try{
   const response=await fetch(UPSTREAM+u.pathname+'?'+safe,{headers:{accept:'application/json'},cf:{cacheEverything:false,cacheTtl:0},signal:AbortSignal.timeout(13000)});
   if(!response.ok)return Response.json({available:false,error:'Source '+response.status},{status:503,headers:{...headers,'cache-control':'no-store'}});
   return new Response(response.body,{status:response.status,headers:{...headers,'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-tso-source':'tso2-staging-preview'}});
  }catch(e){return Response.json({available:false,error:'TSO source unavailable'},{status:503,headers})}
 }
 const filepath=u.pathname==='/'?'index.html':u.pathname.replace(/^\//,'');
 if(!/^(index\.html|app\.js|nba-lab\.js|nba-depth\.js|styles\.css)$/.test(filepath))return new Response('Not found',{status:404,headers});
 // Immutable deployment bundle takes precedence; raw branch source is fallback for local development.
 const bundled=typeof TSO3_BUNDLED_ASSETS!=='undefined'?TSO3_BUNDLED_ASSETS[filepath]:undefined;
 if(typeof bundled==='string')return new Response(req.method==='HEAD'?null:bundled,{status:200,headers:{...headers,'content-type':TYPES[u.pathname]||TYPES['/'+filepath],'cache-control':'no-store','x-tso-build':'bundled-branch-assets'}});
 try{
  const response=await fetch(RAW+filepath+'?tso3='+Math.floor(Date.now()/30000),{headers:{accept:'text/plain,*/*'},cf:{cacheTtl:20,cacheEverything:true}});
  if(!response.ok)return new Response('Preview file unavailable',{status:502,headers});
  return new Response(req.method==='HEAD'?null:response.body,{status:200,headers:{...headers,'content-type':TYPES[u.pathname]||TYPES['/'+filepath],'cache-control':'no-store'}});
 }catch(_){return new Response('Preview source unavailable',{status:503,headers})}
}};
