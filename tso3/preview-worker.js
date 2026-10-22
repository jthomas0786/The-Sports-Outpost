/* TSO 3.0 isolated development preview.
 * Serves original frontend files from tso-3.0 branch.
 * Proxy only preapproved TSO 2.0 preview source feeds, never production.
 * No credentials or signup proxy. */
const RAW='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/tso-3.0/tso3/';
const UPSTREAM='https://tso2-preview.jthomas0786-tso.workers.dev';
const TYPES={'/':'text/html; charset=utf-8','/index.html':'text/html; charset=utf-8','/app.js':'application/javascript; charset=utf-8','/styles.css':'text/css; charset=utf-8','/nba-lab.js':'application/javascript; charset=utf-8','/nba-depth.js':'application/javascript; charset=utf-8','/live-boxscore.js':'application/javascript; charset=utf-8','/nfl-lab.js':'application/javascript; charset=utf-8','/nfl-props.js':'application/javascript; charset=utf-8'};
const headers={'access-control-allow-origin':'*','x-tso-version':'3.0-preview','x-robots-tag':'noindex, nofollow'};
const ESPN_SCOREBOARDS=Object.freeze({
 nfl:'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
 nba:'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
 mlb:'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
 nhl:'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
 wnba:'https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard',
 cfb:'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard'
});
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
 const lastObserved=[...Object.values(outPlayers)].flatMap(p=>p.recentGames.slice(0,1).map(g=>g.date))
  .map(v=>Date.parse(v)).filter(Number.isFinite).sort((x,y)=>y-x)[0]||null;
 return {source:'TSO public NBA research / ESPN-derived history',generatedAt:doc.generatedAt||null,
  latestObservedGame:lastObserved?new Date(lastObserved).toISOString():null,
  researchAgeHours:Number.isFinite(Date.parse(doc.generatedAt||''))?Math.max(0,Math.round((Date.now()-Date.parse(doc.generatedAt))/3600000)):null,
  currentSeason:doc.currentSeason||null,
  players:outPlayers,teams:doc.teams,teamIndex:doc.teamIndex||{},teamDefense:doc.teamDefense||{},league:doc.league||{},teamProfiles:doc.teamProfiles||{}};
}

/* NFL data sourced from TSO's published 2026 slate, nflverse/ESPN-derived
   research and ParlayAPI sportsbook snapshots. Dates, event identity and
   freshness are verified before a market or projection is shown. */
const NFL_SLATE_URL='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/main/slates/nfl.json';
const NFL_RESEARCH_URL='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/main/slates/nfl-research.json';
const NFL_ODDS_URL='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/main/slates/nfl-odds.json';
function nflTeamKey(v){
 const x=String(v||'').toUpperCase().replace(/[^A-Z]/g,'');
 return ({LAR:'LA',RAMS:'LA',JAX:'JAC',JAGUARS:'JAC',WSH:'WAS',WASHINGTON:'WAS',AZ:'ARI',GB:'GB',
  GNB:'GB',NO:'NO',NOR:'NO',SF:'SF',SFO:'SF',TB:'TB',TAM:'TB',LV:'LV',LVR:'LV',KC:'KC'}[x]||x);
}
function nflEventMatch(a,b,startTime,official){
 const delta=Math.abs(Date.parse(startTime||'')-Date.parse(official.startTime||''));
 return official.league==='nfl'&&nflTeamKey(a)===nflTeamKey(official.away?.abbr)
  &&nflTeamKey(b)===nflTeamKey(official.home?.abbr)
  &&Number.isFinite(delta)&&delta<=90*60000;
}
async function nflRaw(url,ttl=120){
 const r=await fetch(url,{headers:{accept:'application/json'},
  cf:{cacheEverything:true,cacheTtl:ttl},signal:AbortSignal.timeout(18000)});
 if(!r.ok)throw Error('Published NFL feed HTTP '+r.status);
 return r.json();
}
async function verifiedNflSlate(){
 const [slate,official]=await Promise.all([nflRaw(NFL_SLATE_URL,120),officialGames(ESPN_SCOREBOARDS.nfl,'nfl')]);
 if(!Array.isArray(slate?.games)||!Number.isFinite(Date.parse(slate?.generatedAt||'')))throw Error('Invalid NFL model data');
 const ageHours=(Date.now()-Date.parse(slate.generatedAt))/3600000;
 const modelFresh=ageHours>=-1&&ageHours<=72;
 const games=slate.games.flatMap(g=>{
  const away=nflTeamKey(g.away?.abbr),home=nflTeamKey(g.home?.abbr);
  const match=official.find(x=>nflEventMatch(away,home,g.startTimeUTC,x));
  if(!match||match.state==='post'||Date.parse(match.startTime)<Date.now()-15*60000)return [];
  const players=(g.players||[]).filter(p=>p?.name&&p?.team&&['RB','WR','TE','QB'].includes(String(p.position||'').toUpperCase())
   &&[away,home].includes(nflTeamKey(p.team))).map(p=>{
    const prob=Number(p.props?.atd?.probability),availability=p.props?.atd?.availability||{},inputs=p.props?.atd?.inputs||{};
    const allowed=modelFresh&&Number.isFinite(prob)&&prob>=0&&prob<=1
      &&!['out','ir','suspended','inactive'].includes(String(availability.status||'').toLowerCase());
    return {
     id:String(p.espnId||p.gsisId||''),gsisId:p.gsisId||null,name:String(p.name),team:nflTeamKey(p.team),
     position:String(p.position||''),headshot:p.headshot||null,depthRank:p.depthRank??null,
     opponent:nflTeamKey(p.opponent||''),historicalSeason:p.stats?.statsSeason||2025,
     snapShare:Number.isFinite(Number(p.stats?.snapShare))?Number(p.stats.snapShare):null,
     gamesPlayed:Number.isFinite(Number(p.stats?.gamesPlayed))?Number(p.stats.gamesPlayed):null,
     rzTargets:Number.isFinite(Number(p.stats?.rzTargets))?Number(p.stats.rzTargets):null,
     rzCarries:Number.isFinite(Number(p.stats?.rzCarries))?Number(p.stats.rzCarries):null,
     tds:Number.isFinite(Number(p.stats?.tds))?Number(p.stats.tds):null,
     modelProbability:allowed?prob:null,
     modelGrade:allowed?String(p.props.atd.grade||''):null,confidence:String(p.props?.atd?.dataConfidence||'unavailable'),
     injuryStatus:String(availability.status||'unconfirmed'),injuryNote:availability.note||null,
     opponentRzTdRate:Number.isFinite(Number(inputs.oppRzTdRateAllowed))?Number(inputs.oppRzTdRateAllowed):null,
     opportunityRate:Number.isFinite(Number(inputs.rzPerGame))?Number(inputs.rzPerGame):null,
     modelSampleYear:Number(inputs.sampleYear)||2025,modelRosterYear:Number(inputs.rosterYear)||2026
    };
   });
  return [{id:String(match.id),away:match.away,home:match.home,startTime:match.startTime,
   sourceGameId:String(g.gameId||''),venue:g.venue?.name||match.venue||null,
   indoor:typeof g.venue?.indoor==='boolean'?g.venue.indoor:null,players}];
 });
 return {source:'TSO existing NFL anytime-TD model; 2025 production baseline, 2026 rosters/injury context',
  generatedAt:slate.generatedAt,ageHours:Math.round(ageHours*10)/10,modelFresh,modelAvailable:modelFresh,
  games,playerCount:games.reduce((n,g)=>n+g.players.length,0),
  modelNotice:'This is TSO estimated anytime rushing/receiving TD probability, not a guaranteed outcome or 2026-only model. QB passing TDs are excluded.'};
}
async function verifiedNflSimulations(){
 const [data,official]=await Promise.all([
  nflRaw('https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/main/slates/nfl-sim.json',150),
  officialGames(ESPN_SCOREBOARDS.nfl,'nfl')
 ]);
 if(!Array.isArray(data?.games))throw Error('NFL 50K simulation snapshot unavailable');
 const now=Date.now();
 const games=[];
 for(const sim of data.games){
  const g=official.find(g=>String(g.id)===String(sim.gameId||sim.game?.gameId||sim.id));
  if(!g||g.state!=='pre'||Date.parse(g.startTime)<=now-15*60000)continue;
  const rowTimestamp=sim.meta?.runAt||sim.runAt||sim.generatedAt||data.generatedAt;
  const ageHours=(now-Date.parse(rowTimestamp||''))/3600000;
  const iterations=Number(sim.iterations);
  const away=sim.outcomes?.away,home=sim.outcomes?.home;
  if(!Number.isFinite(ageHours)||ageHours< -1||ageHours>48||!Number.isInteger(iterations)||iterations<10000
   ||!Number.isFinite(Number(away?.score?.mean))||!Number.isFinite(Number(home?.score?.mean)))continue;
  if(nflTeamKey(g.away.abbr)!==nflTeamKey(away.abbr)||nflTeamKey(g.home.abbr)!==nflTeamKey(home.abbr))continue;
  const valid=v=>Number.isFinite(Number(v))?Number(v):null;
  const prob=v=>{const x=valid(v);return x!==null&&x>=0&&x<=1?x:null};
  games.push({id:String(g.id),away:g.away.abbr,home:g.home.abbr,startTime:g.startTime,
   phase:String(sim.phase||'pregame').toLowerCase(),iterations,runAt:rowTimestamp,
   homeWin:prob(home.winProbability),awayWin:prob(away.winProbability),
   awayPoints:valid(away.score.mean),homePoints:valid(home.score.mean),
   spread:sim.outcomes?.spread?{homeLine:valid(sim.outcomes.spread.homeLine),
    homeCover:prob(sim.outcomes.spread.homeCover),awayCover:prob(sim.outcomes.spread.awayCover)}:null,
   total:sim.outcomes?.total?{line:valid(sim.outcomes.total.line),over:prob(sim.outcomes.total.over),under:prob(sim.outcomes.total.under)}:null,
   players:(Array.isArray(sim.players)?sim.players:[]).filter(p=>p?.name&&p?.team)
    .map(p=>({id:String(p.espnId||p.playerId||''),name:String(p.name),team:nflTeamKey(p.team),
      position:String(p.position||''),atd:prob(p.probabilities?.atd),twoPlusTd:prob(p.probabilities?.twoPlusTd)}))
  });
 }
 return {source:'TSO existing NFL Monte Carlo simulation; validated current pregame outcomes only',
  generatedAt:data.generatedAt||null,engineVersion:data.engineVersion||null,games,
  note:'Simulated point means and win probabilities from TSO worlds; model estimates, not observed scores or guaranteed outcomes.'};
}
async function verifiedNflResearch(){
 const [doc,official]=await Promise.all([nflRaw(NFL_RESEARCH_URL,300),officialGames(ESPN_SCOREBOARDS.nfl,'nfl')]);
 if(!Array.isArray(doc?.players)||!Number.isFinite(Date.parse(doc?.generatedAt||'')))throw Error('Invalid NFL research source');
 const activeTeams=new Set(official.filter(g=>g.state!=='post').flatMap(g=>[nflTeamKey(g.home.abbr),nflTeamKey(g.away.abbr)]));
 const list=doc.players.filter(p=>p?.name&&activeTeams.has(nflTeamKey(p.team))).map(p=>({
  id:String(p.espnId||p.gsisId||''),gsisId:p.gsisId||null,name:String(p.name),team:nflTeamKey(p.team),
  position:p.position||null,headshot:p.headshot||null,depthRank:p.depth?.rank??null,
  status:p.injury?.status||p.rosterStatus||'Unconfirmed',injury:p.injury||null,
  currentSeason:p.currentSeason||null,previousSeason:p.previousSeason||null,last5:p.last5||null,
  model:p.model||null,matchup:p.matchup||null,snapTrend:p.snapTrend||null,
  logs:(Array.isArray(p.gameLog)?p.gameLog:[]).filter(g=>g.season===doc.season||g.season===doc.previousSeason)
    .sort((a,b)=>Number(b.season)-Number(a.season)||Number(b.week)-Number(a.week)).slice(0,22)
    .map(g=>({date:g.date||null,season:g.season,week:g.week,opponent:nflTeamKey(g.opponent),
      homeAway:g.homeAway||null,carries:g.carries,targets:g.targets,receptions:g.receptions,
      completions:g.completions,attempts:g.attempts,rushYds:g.rushYds,recYds:g.recYds,
      passYds:g.passYds,passTds:g.passTds,rushTds:g.rushTds,recTds:g.recTds,tds:g.tds}))
 }));
 return {source:'ESPN 2026 NFL rosters, depth/injuries + nflverse CC BY 4.0 player history',
  generatedAt:doc.generatedAt,season:doc.season,previousSeason:doc.previousSeason,
  ageHours:Math.round((Date.now()-Date.parse(doc.generatedAt))/360000)/10,
  playerCount:list.length,players:list,
  note:'Current-season production and previous-season history are separate. No simulated games are counted as observed.'};
}
async function verifiedNflInjuries(){
 const url='https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries';
 const response=await fetch(url,{headers:{accept:'application/json'},
  cf:{cacheEverything:true,cacheTtl:120},signal:AbortSignal.timeout(14000)});
 if(!response.ok)throw Error('NFL injury provider HTTP '+response.status);
 const doc=await response.json();
 if(!Array.isArray(doc?.injuries))throw Error('Invalid NFL injury provider response');
 const entries=[],seen=new Set();
 for(const group of doc.injuries){
  for(const report of Array.isArray(group.injuries)?group.injuries:[]){
   const athlete=report.athlete||{},
    card=(athlete.links||[]).find(x=>typeof x.href==='string'&&/\/player\/_\/id\/\d+/.test(x.href))?.href||'',
    id=String(athlete.id||card.match(/\/player\/_\/id\/(\d+)/)?.[1]||''),
    teamId=String(athlete.team?.id||group.id||'');
   if(!id||!teamId||!athlete.displayName)continue;
   const key=teamId+'|'+id;if(seen.has(key))continue;seen.add(key);
   entries.push({athleteId:id,name:String(athlete.displayName),teamId,
    team:athlete.team?.abbreviation||group.abbreviation||group.displayName||null,
    status:String(report.status||report.type?.description||report.details?.fantasyStatus?.description||'Unknown'),
    practiceStatus:report.details?.status||null,position:athlete.position?.abbreviation||null,
    issue:report.details?.type||null,
    updatedAt:report.date||null,
    shortReport:String(report.shortComment||'').slice(0,380),
    provider:'ESPN NFL injuries'});
  }
 }
 return {source:'ESPN current NFL injuries',fetchedAt:new Date().toISOString(),
  providerTimestamp:doc.timestamp||null,entries,
  notice:'Practice participation and generic ESPN injury status are not verified final game-day inactive lists.'};
}

async function verifiedNflOdds(){
 const [doc,official]=await Promise.all([nflRaw(NFL_ODDS_URL,65),officialGames(ESPN_SCOREBOARDS.nfl,'nfl')]);
 const date=Date.parse(doc?.meta?.fetchedAt||'');
 if(!Array.isArray(doc?.games)||!Number.isFinite(date)||doc.meta?.source!=='parlayapi'||doc.meta?.sample!==false)
  throw Error('Invalid NFL sportsbook snapshot');
 const age=(Date.now()-date)/60000;
 if(age< -5||age>240)return {available:false,fetchedAt:doc.meta.fetchedAt,stale:true,games:[],rows:[],reason:'Odds snapshot refresh overdue'};
 const marketSet=new Set(['atd','firstTd','passYds','rushYds','recYds','receptions','targets','carries','passTds','passAttempts','completions']);
 const rows=[];
 let unmatched=0;
 for(const g of doc.games){
  const officialGame=official.find(x=>nflEventMatch(g.away,g.home,g.startDateUTC,x));
  if(!officialGame||officialGame.state!=='pre'||Date.parse(officialGame.startTime)<Date.now()-15*60000){unmatched++;continue}
  const hours=(Date.parse(officialGame.startTime)-Date.now())/3600000;
  const cap=hours<=1.5?12:hours<=3?25:hours<=12?45:hours<=48?75:150;
  if(age>cap)continue;
  for(const p of g.players||[]){
   if(!p?.name||!p.odds||typeof p.odds!=='object')continue;
   for(const [key,odds] of Object.entries(p.odds)){
    if(!marketSet.has(key))continue;
    const best=key==='atd'||key==='firstTd'?odds.best:odds.over?.best;
    if(!best)continue;
    const price=Number(best.price??best.odds??best.american??best.value);
    const line=key==='atd'||key==='firstTd'?0.5:Number(odds.line);
    const book=best.book||best.bookmaker||best.sportsbook;
    if(!Number.isFinite(price)||price===0||!Number.isFinite(line)||!book)continue;
    rows.push({sport:'nfl',eventId:String(g.fixtureId||''),verifiedGameId:String(officialGame.id),
     player:String(p.name),playerId:p.playerId||null,team:nflTeamKey(p.team),market:key,
     line,side:key==='atd'||key==='firstTd'?'yes':'over',price,book:String(book),snapshotTime:doc.meta.fetchedAt,
     homeTeam:officialGame.home.name,awayTeam:officialGame.away.name,commenceTime:officialGame.startTime});
   }
  }
 }
 return {source:'ParlayAPI NFL sportsbook snapshot, official ESPN game identity',fetchedAt:doc.meta.fetchedAt,
  ageMinutes:Math.round(age),available:rows.length>0,stale:rows.length===0,rows,unmatchedGames:unmatched,
  note:'Snapshot prices are not continuously streaming. Only valid pregame books matched to official kickoff are shown.'};
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
const clubKey=value=>String(value||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
 .replace(/[^a-z0-9]/g,'').replace(/^losangeles/,'la');
function verifiedOddsMatch(q,g){
 if(!g?.home?.name||!g?.away?.name||g.league!=='nba')return false;
 const start=Date.parse(q.commenceTime||''),official=Date.parse(g.startTime||'');
 return Number.isFinite(start)&&Number.isFinite(official)&&Math.abs(start-official)<=3*3600000
  &&clubKey(q.homeTeam)===clubKey(g.home.name)
  &&clubKey(q.awayTeam)===clubKey(g.away.name);
}
async function safeNbaOddsSnapshot(){
 const r=await fetch(NBA_ODDS_SOURCE,{headers:{accept:'application/json'},cf:{cacheEverything:true,cacheTtl:60},signal:AbortSignal.timeout(16000)});
 if(!r.ok)throw Error('Odds source HTTP '+r.status);
 const data=await r.json();
 const fetchedAt=data?.meta?.fetchedAt;
 const time=Date.parse(fetchedAt||'');
 if(!Array.isArray(data?.rows)||!Number.isFinite(time))throw Error('Invalid NBA odds source metadata');
 const now=Date.now(),age=now-time;
 // The underlying basketball snapshot job has an adaptive 5/15/30/60-minute cadence.
 // A quote may only appear if its age is appropriate for the time until tip-off.
 if(age>4*3600000||age< -5*60000)
  return {source:'TSO NBA odds snapshot',fetchedAt,available:false,stale:true,rows:[],reason:'Odds snapshot too old to show'};
 const maxAgeForTip=start=>{
  const until=start-now;
  return until<=3*3600000?25*60000:until<=12*3600000?45*60000:until<=48*3600000?90*60000:4*3600000;
 };
 const official=await officialGames(ESPN_SCOREBOARDS.nba,'nba');
 if(!Array.isArray(official)||!official.length)
  return {source:'TSO NBA odds snapshot',fetchedAt,available:false,stale:true,rows:[],
   reason:'Official NBA schedule unavailable for event verification'};
 let rejectedUnmatched=0;
 const rows=data.rows.flatMap(q=>{
  const start=Date.parse(q?.commenceTime||'');
  if(!q?.player||!q?.book||!['points','rebounds','assists','threes','pra'].includes(String(q.market||''))
   ||!Number.isFinite(Number(q.line))||!Number.isFinite(Number(q.overPrice))||Number(q.overPrice)===0
   ||!Number.isFinite(start)||start<=now-15*60000||start>now+9*86400000||age>maxAgeForTip(start))
   return [];
  const game=official.find(g=>verifiedOddsMatch(q,g));
  if(!game){rejectedUnmatched++;return []}
  return [{
   sport:'nba',player:String(q.player).replace(/\s*\([A-Za-z]{2,5}\)\s*$/,'').trim(),market:String(q.market),
   side:'over',line:Number(q.line),price:Number(q.overPrice),book:String(q.book),
   eventId:String(q.eventId||''),verifiedGameId:String(game.id),commenceTime:game.startTime,
   homeTeam:game.home.name,awayTeam:game.away.name,snapshotTime:fetchedAt,
   source:'TSO NBA odds verified against official ESPN matchup'
  }];
 }).slice(0,6500);
 return {source:'TSO NBA odds cross-checked with ESPN',fetchedAt,available:rows.length>0,stale:rows.length===0,rows,
  ageMinutes:Math.max(0,Math.round(age/60000)),rejectedUnmatched,
  policy:'Only quotes with matching official NBA teams and tip time; timestamped pregame snapshots, not streaming prices'};
}

async function safeNbaOdds(){
 const url='https://staging.thesportsoutpost.com/api/props?league=nba';
 try{
  const [res,official]=await Promise.all([
   fetch(url,{headers:{accept:'application/json'},cf:{cacheEverything:true,cacheTtl:35},signal:AbortSignal.timeout(15000)}),
   officialGames(ESPN_SCOREBOARDS.nba,'nba')
  ]);
  if(!res.ok)throw Error('TSO staging verified NBA odds '+res.status);
  const data=await res.json();
  if(data?.source!=='tso-verified-odds'||!Array.isArray(data?.rows)||!official.length)
   throw Error('Invalid or unavailable staging NBA source');
  const now=Date.now();
  const maxAgeForTip=start=>{
   const hours=(start-now)/3600000;
   return hours<=1.5?12*60000:hours<=3?25*60000:hours<=12?45*60000:hours<=48?90*60000:4*3600000;
  };
  const records=[],seen=new Set();let mismatches=0,expired=0;
  for(const q of data.rows){
   if(q?.sport!=='nba'||String(q.side||'').toLowerCase()!=='over'
    ||q.preserved===true||!q.player||!q.book||!['points','rebounds','assists','threes','pra'].includes(String(q.market||''))
    ||!Number.isFinite(Number(q.price))||Number(q.price)===0||!Number.isFinite(Number(q.line)))
    continue;
   const start=Date.parse(q.commenceTime||''),updated=Date.parse(q.snapshotTime||'');
   if(!Number.isFinite(start)||!Number.isFinite(updated)||start<=now-15*60000||start>now+9*86400000
    ||updated>now+5*60000||now-updated>maxAgeForTip(start)){expired++;continue}
   const game=official.find(g=>verifiedOddsMatch(q,g)&&g.state==='pre');
   if(!game){mismatches++;continue}
   const suffix=String(q.player).match(/\(([A-Za-z]{2,5})\)\s*$/)?.[1]?.toUpperCase()||null;
   const validTeams=new Set([String(game.home.abbr).toUpperCase(),String(game.away.abbr).toUpperCase()]);
   const aliases={NY:'NYK',GS:'GS',GSW:'GS',PHO:'PHX',UTAH:'UTAH',SA:'SA',SAS:'SA',NO:'NO',NOP:'NO',
    BRK:'BKN',BKN:'BKN',PHI:'PHI',CLE:'CLE'};
   const resolved=suffix?(aliases[suffix]||suffix):null;
   if(suffix&&!validTeams.has(resolved)){mismatches++;continue}
   const name=String(q.player).replace(/\s*\([A-Za-z]{2,5}\)\s*$/,'').trim();
   const key=[game.id,normNameForKey(name),q.market,q.line,q.book].join('|');
   if(seen.has(key))continue;
   seen.add(key);
   records.push({sport:'nba',player:name,market:q.market,side:'over',line:Number(q.line),
    price:Number(q.price),book:String(q.book),eventId:String(q.eventId||''),verifiedGameId:String(game.id),
    commenceTime:game.startTime,homeTeam:game.home.name,awayTeam:game.away.name,
    snapshotTime:q.snapshotTime,source:'TSO verified staging NBA sportsbook quote'});
  }
  if(records.length){
   const oldest=Math.min(...records.map(r=>Date.parse(r.snapshotTime)));
   return {source:'TSO staging verified NBA sportsbook selections cross-checked with ESPN',fetchedAt:new Date(oldest).toISOString(),
    available:true,stale:false,rows:records,mismatches,expired,
    notice:'Read-only current sportsbook snapshots; never live streaming market prices'};
  }
  // No officially verified staging quotes: fall back to dated and independently
  // validated public TSO snapshots; never substitute unmatched games.
  const fallback=await safeNbaOddsSnapshot();
  return {...fallback,stagingAttempted:true,stagingMismatches:mismatches,stagingExpired:expired};
 }catch(_){
  return safeNbaOddsSnapshot();
 }
}
function normNameForKey(n){
 return String(n||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g,'');
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
 // ESPN site v2 date RANGES have returned HTTP 400 since Sep 2026.
 // Request individual calendar dates and merge by stable event ID.
 const now=Date.now(),days=[-1,0,1,2,3,4];
 const responses=await Promise.allSettled(days.map(async offset=>{
  const endpoint=url+'?dates='+isoDay(new Date(now+offset*86400000))+'&limit=400';
  const res=await fetch(endpoint,{headers:{accept:'application/json'},
   cf:{cacheEverything:true,cacheTtl:65},signal:AbortSignal.timeout(11000)});
  if(!res.ok)throw Error('ESPN '+league+' scoreboard HTTP '+res.status);
  const data=await res.json();
  if(!Array.isArray(data?.events))throw Error('Invalid '+league+' scoreboard response');
  return data.events;
 }));
 const good=responses.filter(x=>x.status==='fulfilled');
 if(!good.length)throw Error('All dated '+league+' schedule requests failed: '+
  String(responses.find(x=>x.status==='rejected')?.reason?.message||'upstream'));
 const eventMap=new Map();
 for(const event of good.flatMap(x=>x.value||[]))if(event?.id)eventMap.set(String(event.id),event);
 const games=[];
 for(const e of eventMap.values()){
  const comp=e.competitions?.[0];if(!comp)continue;
  const home=comp.competitors?.find(x=>x.homeAway==='home'),away=comp.competitors?.find(x=>x.homeAway==='away');
  if(!home?.team?.id||!away?.team?.id||!e.id)continue;
  const team=c=>({id:String(c.team.id),name:String(c.team.displayName||c.team.name||''),
   abbr:String(c.team.abbreviation||''),logo:String(c.team.logo||c.team.logos?.[0]?.href||''),
   score:c.score??null,record:String(c.records?.find(r=>r.type==='total')?.summary||c.records?.[0]?.summary||'')});
  const status=comp.status?.type||e.status?.type||{};
  const state=status.completed===true?'post':status.state==='in'?'in':'pre';
  const startTime=e.date||comp.date,t=Date.parse(startTime||'');
  if(!Number.isFinite(t)||t<Date.now()-18*3600000||t>Date.now()+5*86400000)continue;
  games.push({id:String(e.id),league,state,startTime,away:team(away),home:team(home),
   venue:String(comp.venue?.fullName||''),period:comp.status?.period||null,clock:comp.status?.displayClock||null,
   source:'ESPN official scoreboard'});
 }
 games.coverageDays=good.length;
 games.requestedDays=days.length;
 return games;
}

async function sixLeagueLive(){
 const sports=Object.entries(ESPN_SCOREBOARDS);
 const responses=await Promise.allSettled(sports.map(([sport,url])=>officialGames(url,sport)));
 const games=[],sources={};
 for(let i=0;i<sports.length;i++){
  const league=sports[i][0],response=responses[i];
  if(response.status==='fulfilled'){
   sources[league]=response.value.coverageDays===response.value.requestedDays?'ESPN verified scoreboard':'ESPN partial scoreboard ('+response.value.coverageDays+'/'+response.value.requestedDays+' days)';
   games.push(...response.value);
  }else{
   sources[league]='unavailable';
  }
 }
 if(responses.every(r=>r.status==='rejected'))throw Error('All six official schedule sources unavailable: '+responses.map((r,i)=>sports[i][0]+'='+String(r.reason?.message||'failed')).join('; ').slice(0,500));
 const unique=[...new Map(games.map(g=>[g.league+':'+g.id,g])).values()]
  .sort((a,b)=>Date.parse(a.startTime)-Date.parse(b.startTime));
 return {games:unique,tso3:{sources,scoreboardFetchedAt:new Date().toISOString(),
  source:'ESPN official sport-specific schedules',freshnessMinutes:1,
  warning:Object.values(sources).includes('unavailable')?'Some league schedules could not be verified':null}};
}


async function liveGameSummary(sport,eventId){
 const url=ESPN_SCOREBOARDS[sport].replace(/\/scoreboard$/,'/summary')+'?event='+eventId;
 const res=await fetch(url,{headers:{accept:'application/json'},cf:{cacheEverything:true,cacheTtl:25},signal:AbortSignal.timeout(12500)});
 if(!res.ok)throw Error('ESPN game summary HTTP '+res.status);
 const d=await res.json(),competition=d.header?.competitions?.[0],headerId=String(d.header?.id||'');
 if(headerId&&headerId!==eventId)throw Error('Event identity mismatch');
 const ids=(competition?.competitors||[]).filter(c=>c?.team?.id);
 const team=(c)=>({id:String(c.team.id),abbr:String(c.team.abbreviation||''),
  name:String(c.team.displayName||c.team.name||''),homeAway:c.homeAway==='home'?'home':'away',
  score:c.score??null,record:c.record||null});
 const teams=ids.map(team);
 const teamStats=(d.boxscore?.teams||[]).map(v=>({
  teamId:String(v.team?.id||''),
  stats:(v.statistics||[]).slice(0,20).map(st=>({name:String(st.label||st.displayName||st.name||''),
   value:String(st.displayValue??st.value??'')})).filter(st=>st.name&&st.value)
 }));
 const players=(d.boxscore?.players||[]).map(t=>({
  teamId:String(t.team?.id||''),
  groups:(t.statistics||[]).slice(0,7).map(g=>({
   name:String(g.name||g.displayName||'Box Score'),
   labels:(g.labels||[]).slice(0,17).map(String),
   athletes:(g.athletes||[]).slice(0,40).filter(a=>a.athlete?.displayName&&Array.isArray(a.stats)).map(a=>({
    id:String(a.athlete.id||''),name:String(a.athlete.displayName),starter:Boolean(a.starter),
    stats:a.stats.slice(0,17).map(v=>String(v??'—'))
   }))
  })).filter(g=>g.athletes.length)
 }));
 const kind=competition?.status?.type||d.header?.status?.type||{};
 return {source:'ESPN current game box score',fetchedAt:new Date().toISOString(),eventId,sport,
  state:kind.completed?'post':kind.state==='in'?'in':'pre',
  teams,teamStats,players,
  note:'Player statistics are official game records as last returned by ESPN, not historical averages or projections'};
}

export default {async fetch(req,env){
 if(req.method==='OPTIONS')return new Response(null,{headers:{...headers,'access-control-allow-methods':'GET, HEAD, OPTIONS'}});
 if(!['GET','HEAD'].includes(req.method))return new Response('Method not allowed',{status:405,headers});
 const u=new URL(req.url);
 if(u.pathname==='/health')return Response.json({ok:true,service:'tso3-preview',version:'3.0',source:'tso-3.0/tso3',environment:'development'},{headers});
 if(u.pathname==='/api/game-summary'){
  const sport=String(u.searchParams.get('sport')||'').toLowerCase(),event=String(u.searchParams.get('event')||'');
  if(!Object.hasOwn(ESPN_SCOREBOARDS,sport)||!/^\d{6,14}$/.test(event))
   return Response.json({available:false,error:'Invalid league or game ID'},{status:400,headers});
  try{
   const out=await liveGameSummary(sport,event);
   return Response.json(out,{headers:{...headers,'cache-control':'no-store','x-tso-source':'ESPN current game summary'}});
  }catch(_){
   return Response.json({available:false,error:'Verified game box score unavailable'},{status:503,headers});
  }
 }
 if(u.pathname==='/api/nba-injuries'){
  try{
   return Response.json(await safeNbaInjuries(),{headers:{...headers,'cache-control':'no-store','x-tso-source':'ESPN NBA injuries'}});
  }catch(_){return Response.json({available:false,entries:[],error:'Official NBA injury feed unavailable'},{status:503,headers})}
 }
 if(['/api/nfl-touchdowns','/api/nfl-research','/api/nfl-odds','/api/nfl-projections','/api/nfl-injuries'].includes(u.pathname)){
  try{
   const doc=u.pathname==='/api/nfl-touchdowns'?await verifiedNflSlate()
    :u.pathname==='/api/nfl-research'?await verifiedNflResearch()
    :u.pathname==='/api/nfl-projections'?await verifiedNflSimulations()
    :u.pathname==='/api/nfl-injuries'?await verifiedNflInjuries():await verifiedNflOdds();
   return Response.json(doc,{headers:{...headers,'cache-control':'no-store','x-tso-source':'verified TSO NFL model/nflverse/ParlayAPI'}});
  }catch(error){
   return Response.json({available:false,error:'Verified NFL data unavailable',detail:String(error?.message||'').slice(0,160)},
    {status:503,headers:{...headers,'cache-control':'no-store'}});
  }
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
   }catch(error){return Response.json({available:false,error:'Verified scoreboard unavailable',detail:String(error?.message||'').slice(0,520),games:[]},{status:503,headers});}
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
 if(!/^(index\.html|app\.js|nba-lab\.js|nba-depth\.js|live-boxscore\.js|nfl-lab\.js|nfl-props\.js|styles\.css)$/.test(filepath))return new Response('Not found',{status:404,headers});
 // Immutable deployment bundle takes precedence; raw branch source is fallback for local development.
 const bundled=typeof TSO3_BUNDLED_ASSETS!=='undefined'?TSO3_BUNDLED_ASSETS[filepath]:undefined;
 if(typeof bundled==='string')return new Response(req.method==='HEAD'?null:bundled,{status:200,headers:{...headers,'content-type':TYPES[u.pathname]||TYPES['/'+filepath],'cache-control':'no-store','x-tso-build':'bundled-branch-assets'}});
 try{
  const response=await fetch(RAW+filepath+'?tso3='+Math.floor(Date.now()/30000),{headers:{accept:'text/plain,*/*'},cf:{cacheTtl:20,cacheEverything:true}});
  if(!response.ok)return new Response('Preview file unavailable',{status:502,headers});
  return new Response(req.method==='HEAD'?null:response.body,{status:200,headers:{...headers,'content-type':TYPES[u.pathname]||TYPES['/'+filepath],'cache-control':'no-store'}});
 }catch(_){return new Response('Preview source unavailable',{status:503,headers})}
}};
