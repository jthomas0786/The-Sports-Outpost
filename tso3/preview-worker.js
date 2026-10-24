/* TSO 3.0 isolated development preview.
 * Serves original frontend files from tso-3.0 branch.
 * Proxy only preapproved TSO 2.0 preview source feeds, never production.
 * No credentials or signup proxy. */
const RAW='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/tso-3.0/tso3/';
const UPSTREAM='https://tso2-preview.jthomas0786-tso.workers.dev';
const TYPES={'/':'text/html; charset=utf-8','/index.html':'text/html; charset=utf-8','/app.js':'application/javascript; charset=utf-8','/styles.css':'text/css; charset=utf-8','/nba-lab.js':'application/javascript; charset=utf-8','/nba-depth.js':'application/javascript; charset=utf-8','/live-boxscore.js':'application/javascript; charset=utf-8','/nfl-lab.js':'application/javascript; charset=utf-8','/nfl-props.js':'application/javascript; charset=utf-8','/nfl-validation.js':'application/javascript; charset=utf-8' ,'/manifest.webmanifest':'application/manifest+json; charset=utf-8','/assets/tso-mark.svg':'image/svg+xml; charset=utf-8','/assets/tso-app-icon.svg':'image/svg+xml; charset=utf-8','/assets/tso-research-hero.svg':'image/svg+xml; charset=utf-8'};
const headers={'access-control-allow-origin':'*','x-tso-version':'3.0-preview','x-robots-tag':'noindex, nofollow'};
function decodeVenueName(name){
 return String(name||'').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"')
  .replace(/&#39;|&#x27;|&apos;/gi,"'");
}
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
    .map(p=>{
     const exactOver={};
     for(const [market,record] of Object.entries(p.sportsbook?.over||{})){
      if(!['passYds','passTds','completions','rushYds','recYds','receptions'].includes(market))continue;
      const line=valid(record?.line),estimate=prob(record?.probability);
      if(line!==null&&estimate!==null)exactOver[market]={line,probability:estimate};
     }
     return {id:String(p.espnId||p.playerId||''),name:String(p.name),team:nflTeamKey(p.team),
      position:String(p.position||''),atd:prob(p.probabilities?.atd),
      twoPlusTd:prob(p.probabilities?.twoPlusTd),exactOver};
    })
  });
 }
 return {source:'TSO existing NFL Monte Carlo simulation; validated current pregame outcomes only',
  generatedAt:data.generatedAt||null,engineVersion:data.engineVersion||null,games,
  note:'Simulated point means and win probabilities from TSO worlds; model estimates, not observed scores or guaranteed outcomes.'};
}

/* Immutable scheduled NFL pregame archiving. Separate outcome settlements; no backfills. */
const ARCHIVE_MARKETS=new Set(['passYds','passTds','completions','rushYds','recYds','receptions']);
function archiveSafeNumber(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}
const archiveName=x=>String(x||'').trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
function archiveTime(x,now,maxAge){
 const t=Date.parse(String(x||''));
 return Number.isFinite(t)&&t<=now&&now-t>=0&&now-t<=maxAge?t:null;
}
async function archiveHash(input){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input));
 return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
/* This is a pregame CAPTURE readiness check, never a betting signal.
   It checks only already-archived upcoming games; not a full official slate.
   A single fresh quoted game does NOT imply the slate is fresh. */
function nflOddsAgeLimitMinutes(hours){
 return hours<=1.5?12:hours<=3?25:hours<=12?45:hours<=48?75:150;
}
function nflCaptureReadiness(latest,archivedGames,now=Date.now()){
 const sourceTime=Date.parse(latest?.source_snapshot_at||'');
 const checkedTime=Date.parse(latest?.checked_at||'');
 const scheduledCheckRecent=Number.isFinite(checkedTime)&&checkedTime<=now&&now-checkedTime<=45*60000;
 const sourceValid=Number.isFinite(sourceTime)&&sourceTime<=now&&now-sourceTime<=240*60000;
 const rows=(archivedGames||[]).filter(g=>Date.parse(g.kickoff)>now+15*60000);
 const results=rows.map(g=>{
  const kickoff=Date.parse(g.kickoff),hours=(kickoff-now)/3600000;
  const allowed=nflOddsAgeLimitMinutes(hours);
  const quote=Date.parse(g.quote_at||''),model=Date.parse(g.model_at||'');
  const sameSource=Number.isFinite(quote)&&Number.isFinite(sourceTime)&&quote===sourceTime;
  const quoteAge=Number.isFinite(quote)?(now-quote)/60000:null;
  const modelAge=Number.isFinite(model)?(now-model)/60000:null;
  const quoteWithinLimit=sameSource&&quoteAge!==null&&quoteAge>=0&&quoteAge<=Math.min(allowed,240);
  const familyQuoteMatches=Number(g.atd||0)>0&&Number(g.exact||0)>0
   &&g.atd_quote_at===latest?.source_snapshot_at&&g.exact_quote_at===latest?.source_snapshot_at;
  const atdModelAge=(now-Date.parse(g.atd_model_at||''))/60000;
  const exactModelAge=(now-Date.parse(g.exact_model_at||''))/60000;
  const modelFresh=Number.isFinite(atdModelAge)&&atdModelAge>=0&&atdModelAge<=48*60
   &&Number.isFinite(exactModelAge)&&exactModelAge>=0&&exactModelAge<=48*60;
  const eligible=quoteWithinLimit&&familyQuoteMatches&&modelFresh;
  return {gameId:String(g.game_id),kickoff:g.kickoff,
   sourceAt:g.quote_at||null,quotesAgeMinutes:quoteAge===null?null:Math.round(quoteAge),
   modelAgeMinutes:modelAge===null?null:Math.round(modelAge),
   maxAgeMinutes:allowed,markets:Number(g.markets||0),sportsbooks:Number(g.books||0),
   atdModelObserved:Number(g.atd||0)>0,exactOverModelObserved:Number(g.exact||0)>0,
   bothModelsAtCurrentSource:familyQuoteMatches,
   sourceMatchesCurrent:sameSource,eligible,
   reason:!sameSource?'No matching archived model selection at latest published odds time':
    !quoteWithinLimit?'Sportsbook quote exceeds kickoff-specific freshness cap':
    !familyQuoteMatches?'Both model families do not match the latest sportsbook source time':
    !modelFresh?'At least one archived model family result is older than 48 hours':
    'At least one archived exact-model quote from each family is source-fresh'};
 });
 const covered=results.filter(g=>g.eligible).length;
 const snapshotMatched=results.filter(g=>g.sourceMatchesCurrent).length;
 let status='NO_UPCOMING_ARCHIVED_GAMES';
 if(results.length){
  if(!scheduledCheckRecent)status='CHECK_DELAYED';
  else if(!sourceValid||latest?.status==='unavailable'||latest?.status==='invalid')status='SOURCE_UNAVAILABLE';
  else if(covered===results.length)status='READY_FOR_CAPTURE';
  else status='PARTIAL_COVERAGE';
 }
 return {status,expectedGames:results.length,readyGames:covered,
  sourceMatchedGames:snapshotMatched,latestSourceCheck:latest?.checked_at||null,
  sourceSnapshotAt:latest?.source_snapshot_at||null,
  note:'Capture QA only. Expected count refers to upcoming games previously archived, NOT a certified full NFL slate; per-game coverage means evidence from both model families at the latest source timestamp, not every market/player, a sportsbook settlement, or profitable picks.',
  games:results};
}
async function nflArchiveStatus(env){
 if(!env?.NFL_ARCHIVE)return{available:false,configured:false,reason:'Isolated D1 archive is not attached'};
 try{
  const q=await env.NFL_ARCHIVE.batch([
   env.NFL_ARCHIVE.prepare('SELECT COUNT(*) snapshots, COUNT(DISTINCT game_id) games, MIN(captured_at) first_capture, MAX(captured_at) last_capture FROM prediction_snapshots'),
   env.NFL_ARCHIVE.prepare('SELECT started_at,completed_at,status,forecast_games,eligible_predictions,inserted_predictions,reason,error FROM capture_runs ORDER BY started_at DESC LIMIT 1'),
   env.NFL_ARCHIVE.prepare('SELECT model_kind,COUNT(*) observations,COUNT(DISTINCT game_id) games FROM prediction_snapshots GROUP BY model_kind'),
   env.NFL_ARCHIVE.prepare('SELECT COUNT(*) outcomes FROM settled_outcomes'),
   env.NFL_ARCHIVE.prepare('SELECT started_at,completed_at,status,checked_games,final_games,eligible_predictions,inserted_outcomes,unresolved_predictions,error,reason FROM settlement_runs ORDER BY started_at DESC LIMIT 1'),
   env.NFL_ARCHIVE.prepare("WITH first_quote AS (SELECT p.*,ROW_NUMBER() OVER (PARTITION BY game_id,team,player_name,market,side,line,model_kind ORDER BY captured_at ASC,id ASC) rank FROM prediction_snapshots p),latest AS (SELECT o.*,ROW_NUMBER() OVER (PARTITION BY snapshot_id ORDER BY observed_at DESC,observation_id DESC) rn FROM outcome_observations o),action AS (SELECT a.*,ROW_NUMBER() OVER (PARTITION BY snapshot_id ORDER BY observed_at DESC,observation_id DESC) rn FROM sportsbook_action_observations a) SELECT p.model_kind,p.market,COUNT(*) observations,COUNT(DISTINCT p.game_id) games,SUM(CASE WHEN s.outcome='win' THEN 1 ELSE 0 END) wins,ROUND(AVG(p.probability),5) mean_probability,ROUND(AVG(CASE WHEN s.outcome='win' THEN 1.0 ELSE 0.0 END),5) hit_rate,ROUND(AVG((p.probability-(CASE WHEN s.outcome='win' THEN 1.0 ELSE 0.0 END))*(p.probability-(CASE WHEN s.outcome='win' THEN 1.0 ELSE 0.0 END))),6) brier FROM first_quote p JOIN settled_outcomes s ON s.snapshot_id=p.id JOIN latest v ON v.snapshot_id=p.id AND v.rn=1 JOIN action a ON a.snapshot_id=p.id AND a.rn=1 WHERE p.rank=1 AND a.action_state='action_confirmed' AND s.outcome IN ('win','loss') AND (p.market<>'atd' OR v.reason IN ('scoring_plays_verified_td','zero_from_complete_scoring_log')) AND v.observed_outcome=s.outcome AND v.realized_stat=s.realized_stat GROUP BY p.model_kind,p.market ORDER BY observations DESC"),
   env.NFL_ARCHIVE.prepare('SELECT started_at,completed_at,status,checked_games,final_games,examined_predictions,new_observations,conflicts,unresolved,error,reason FROM reconciliation_runs ORDER BY started_at DESC LIMIT 1'),
   env.NFL_ARCHIVE.prepare("WITH latest AS (SELECT o.*,ROW_NUMBER() OVER (PARTITION BY snapshot_id ORDER BY observed_at DESC,observation_id DESC) rn FROM outcome_observations o) SELECT COUNT(*) reviewed,COUNT(DISTINCT v.game_id) games,SUM(CASE WHEN v.observed_outcome='unknown' THEN 1 ELSE 0 END) unresolved,SUM(CASE WHEN s.snapshot_id IS NOT NULL AND (v.observed_outcome='unknown' OR v.observed_outcome<>s.outcome OR v.realized_stat<>s.realized_stat) THEN 1 ELSE 0 END) conflicts,SUM(CASE WHEN s.snapshot_id IS NOT NULL AND v.observed_outcome=s.outcome AND v.realized_stat=s.realized_stat THEN 1 ELSE 0 END) aligned FROM latest v LEFT JOIN settled_outcomes s ON s.snapshot_id=v.snapshot_id WHERE v.rn=1"),
   env.NFL_ARCHIVE.prepare("WITH latest AS (SELECT o.*,ROW_NUMBER() OVER (PARTITION BY snapshot_id ORDER BY observed_at DESC,observation_id DESC) rn FROM outcome_observations o) SELECT reason,COUNT(*) observations FROM latest WHERE rn=1 GROUP BY reason ORDER BY observations DESC LIMIT 12"),
   env.NFL_ARCHIVE.prepare("WITH first_quote AS (SELECT p.*,ROW_NUMBER() OVER (PARTITION BY game_id,team,player_name,market,side,line,model_kind ORDER BY captured_at ASC,id ASC) rank FROM prediction_snapshots p),latest AS (SELECT o.*,ROW_NUMBER() OVER (PARTITION BY snapshot_id ORDER BY observed_at DESC,observation_id DESC) rn FROM outcome_observations o) SELECT COUNT(*) total,COALESCE(SUM(CASE WHEN v.reason='scoring_plays_verified_td' AND v.observed_outcome='win' THEN 1 ELSE 0 END),0) wins,COALESCE(SUM(CASE WHEN v.reason='zero_from_complete_scoring_log' AND v.observed_outcome='loss' THEN 1 ELSE 0 END),0) losses,COALESCE(COUNT(DISTINCT CASE WHEN v.reason IN ('scoring_plays_verified_td','zero_from_complete_scoring_log') THEN p.game_id ELSE NULL END),0) verified_games FROM first_quote p LEFT JOIN latest v ON v.snapshot_id=p.id AND v.rn=1 WHERE p.rank=1 AND p.market='atd'"),
   env.NFL_ARCHIVE.prepare("WITH latest AS (SELECT a.*,ROW_NUMBER() OVER (PARTITION BY snapshot_id ORDER BY observed_at DESC,observation_id DESC) rn FROM sportsbook_action_observations a) SELECT action_state,COUNT(*) AS observations,COUNT(DISTINCT game_id) AS games FROM latest WHERE rn=1 GROUP BY action_state ORDER BY observations DESC"),
   env.NFL_ARCHIVE.prepare("WITH latest AS (SELECT a.*,ROW_NUMBER() OVER (PARTITION BY snapshot_id ORDER BY observed_at DESC,observation_id DESC) rn FROM sportsbook_action_observations a) SELECT sportsbook,action_state,COUNT(*) AS observations FROM latest WHERE rn=1 GROUP BY sportsbook,action_state ORDER BY sportsbook,action_state"),
   env.NFL_ARCHIVE.prepare('SELECT checked_at,status,source_snapshot_at,source_age_minutes,eligible_quote_rows,verified_games,games_rejected_for_age,earliest_kickoff_at,reason FROM nfl_feed_checks ORDER BY checked_at DESC LIMIT 1'),
   env.NFL_ARCHIVE.prepare('SELECT status,COUNT(*) checks FROM (SELECT status FROM nfl_feed_checks ORDER BY checked_at DESC LIMIT 12) GROUP BY status'),
   env.NFL_ARCHIVE.prepare('SELECT checked_at,status,source_age_minutes,eligible_quote_rows,verified_games,games_rejected_for_age,reason FROM nfl_feed_checks ORDER BY checked_at DESC LIMIT 8'),
   env.NFL_ARCHIVE.prepare('SELECT game_id,MIN(kickoff_at) kickoff,MAX(odds_snapshot_at) quote_at,MAX(model_generated_at) model_at,COUNT(DISTINCT market) markets,COUNT(DISTINCT sportsbook) books,SUM(CASE WHEN model_kind=\'50k_atd\' THEN 1 ELSE 0 END) atd,SUM(CASE WHEN model_kind=\'50k_exact_over\' THEN 1 ELSE 0 END) exact,MAX(CASE WHEN model_kind=\'50k_atd\' THEN odds_snapshot_at END) atd_quote_at,MAX(CASE WHEN model_kind=\'50k_exact_over\' THEN odds_snapshot_at END) exact_quote_at,MAX(CASE WHEN model_kind=\'50k_atd\' THEN model_generated_at END) atd_model_at,MAX(CASE WHEN model_kind=\'50k_exact_over\' THEN model_generated_at END) exact_model_at FROM prediction_snapshots WHERE kickoff_at>? GROUP BY game_id ORDER BY kickoff ASC LIMIT 25').bind(new Date().toISOString())
  ]);
  return{available:true,configured:true,source:'TSO3 independent append-only NFL D1 archive',
   snapshotCount:Number(q[0].results?.[0]?.snapshots||0),
   gameCount:Number(q[0].results?.[0]?.games||0),
   firstCapture:q[0].results?.[0]?.first_capture||null,
   latestCapture:q[0].results?.[0]?.last_capture||null,lastRun:q[1].results?.[0]||null,
   byModel:q[2].results||[],outcomeCount:Number(q[3].results?.[0]?.outcomes||0),
   settlement:{lastRun:q[4].results?.[0]||null,byMarket:q[5].results||[],atdCoverage:q[9].results?.[0]||null,
    independentlyCounted:(q[5].results||[]).reduce((n,r)=>n+Number(r.observations||0),0),
    caveat:'First archived pregame quote per player/game/market/line/model with agreeing subsequent ESPN recheck, once across sportsbooks. ATD is graded as a loss ONLY for a played athlete when every official scoring touchdown is type/player/score matched and all player TD counters reconcile; otherwise zero stays unresolved. Incomplete games and DNPs can bias results. Same-game selections are correlated; pushes and unresolved bets excluded.'},
   reconciliation:{lastRun:q[6].results?.[0]||null,
    coverage:q[7].results?.[0]||null,unresolvedReasons:q[8].results||[],
    note:'Initial settlement grades remain immutable. Distinct ESPN final-game observations are checked for drift. Conflicting, absent or ambiguous stats are quarantined from calibrated metrics; this is a same-provider recheck, NOT a separate independent official data provider.'},
   sportsbookAction:{byState:q[10].results||[],byBook:q[11].results||[],
    note:'ESPN final-game participation evidence, not sportsbook-paid bet confirmations. FanDuel and DraftKings one-play/snap rules mapped; other sportsbooks require jurisdiction/market rule review. Absent players are not presumed void.'},
   slateReadiness:nflCaptureReadiness(q[12].results?.[0]||null,q[15].results||[]),
   feedHealth:{latest:q[12].results?.[0]||null,recentStates:q[13].results||[],history:q[14].results||[],
    note:'ParlayAPI source is published by the existing TSO main NFL odds workflow. No stale quotes are promoted to current; capture skips quotes older than the time-to-kickoff policy. The scheduled Worker cannot force a paid upstream provider refresh.'},
   modelValidationStatus:'INSUFFICIENT',
   note:'Postgame grading starts only after ESPN confirms final player boxscores. Brier and observed hit rate are descriptive and cannot establish ROI or model calibration without multiweek evidence.'};
 }catch(_){return{available:false,configured:true,reason:'D1 archive query unavailable'}}
}
async function runNflArchive(env,trigger='cron'){
 if(!env?.NFL_ARCHIVE)throw Error('Missing isolated TSO3 NFL D1 archive binding');
 const now=Date.now(),started=new Date(now).toISOString();
 const runId=await archiveHash('nflarchive|'+trigger+'|'+started);
 const diag={games:0,eligible:0,inserted:0,status:'saved',reason:'',error:''};
 const feed={status:'unavailable',sourceAt:null,ageMinutes:null,quoteRows:0,verifiedGames:0,rejectedForAge:0,earliestKickoff:null,reason:'Source has not returned yet'};
 try{
  const incoming=await Promise.allSettled([verifiedNflOdds(),verifiedNflSimulations(),verifiedNflSlate()]);
  const odds=incoming[0].status==='fulfilled'?incoming[0].value:null;
  if(incoming[0].status==='rejected'){
   const issue=String(incoming[0].reason?.message||'unknown').slice(0,140);
   feed.status=/^Invalid NFL sportsbook snapshot/.test(issue)?'invalid':'unavailable';
   feed.reason='NFL odds source verification failed: '+issue;
  }else{
   feed.sourceAt=odds?.fetchedAt||null;
   feed.ageMinutes=Number.isFinite(odds?.ageMinutes)?odds.ageMinutes:null;
   feed.quoteRows=odds?.rows?.length||0;
   feed.verifiedGames=Number(odds?.verifiedGames||0);
   feed.rejectedForAge=Number(odds?.rejectedForAge||0);
   feed.earliestKickoff=odds?.earliestKickoff||null;
   feed.status=odds?.available?'fresh':(Number(odds?.rejectedForAge)>0||/240-minute global maximum/.test(String(odds?.reason||'')))?'stale':'no_matching_games';
   feed.reason=String(odds?.reason||'No valid NFL sportsbook quotes').slice(0,180);
  }
  const simulations=incoming[1].status==='fulfilled'?incoming[1].value:null;
  const atd=incoming[2].status==='fulfilled'?incoming[2].value:null;
  if(!odds?.available||!Array.isArray(odds.rows)||!odds.rows.length){
   diag.status='no_fresh_sources';diag.reason=feed.reason;
  }else if(archiveTime(odds.fetchedAt,now,4*3600000)===null){
   diag.status='no_fresh_sources';feed.status='stale';diag.reason='Sportsbook source timestamp failed freshness requirements';feed.reason=diag.reason;
  }else{
   const simMap=new Map((simulations?.games||[]).filter(g=>g.phase==='pregame').map(g=>[String(g.id),g]));
   const atdMap=new Map((atd?.modelFresh&&archiveTime(atd.generatedAt,now,48*3600000)!==null?atd.games:[]).map(g=>[String(g.id),g]));
   const rows=[],seen=new Set(),gameIDs=new Set();
   for(const q of odds.rows){
    const gameId=String(q.verifiedGameId||''),team=nflTeamKey(q.team||''),
     name=archiveName(q.player),line=archiveSafeNumber(q.line),
     price=archiveSafeNumber(q.price),quoteTime=archiveTime(q.snapshotTime,now,4*3600000),
     kickoff=Date.parse(q.commenceTime||''),market=String(q.market||'');
    if(!/^\d{6,14}$/.test(gameId)||!team||!name||!q.book||quoteTime===null
     ||line===null||!Number.isInteger(price)||price===0||!Number.isFinite(kickoff)
     ||kickoff<=now+15*60000||kickoff>now+14*86400000
     ||!(market==='atd'||ARCHIVE_MARKETS.has(market))
     ||String(q.side||'').toLowerCase()!==(market==='atd'?'yes':'over'))continue;
    const dedup=[gameId,team,name,market,line,q.book,q.side].join('|');
    if(seen.has(dedup))continue;seen.add(dedup);gameIDs.add(gameId);
    const sim=simMap.get(gameId),td=atdMap.get(gameId),candidates=[];
    if(sim&&Date.parse(sim.startTime)===kickoff
     &&archiveTime(sim.runAt,now,48*3600000)!==null&&Number(sim.iterations)>=10000){
     const player=(sim.players||[]).find(p=>nflTeamKey(p.team||'')===team&&archiveName(p.name)===name);
     if(player&&market==='atd'&&line===0.5){
      const p=archiveSafeNumber(player.atd);
      if(p!==null&&p>=0&&p<=1)candidates.push({kind:'50k_atd',p,time:sim.runAt,iterations:sim.iterations,
       version:simulations.engineVersion||'source-unversioned'});
     }else if(player&&ARCHIVE_MARKETS.has(market)){
      const m=player.exactOver?.[market],p=archiveSafeNumber(m?.probability);
      if(p!==null&&p>=0&&p<=1&&archiveSafeNumber(m?.line)===line)
       candidates.push({kind:'50k_exact_over',p,time:sim.runAt,iterations:sim.iterations,
        version:simulations.engineVersion||'source-unversioned'});
     }
    }
    if(td&&market==='atd'&&line===0.5&&Date.parse(td.startTime)===kickoff){
     const player=(td.players||[]).find(p=>nflTeamKey(p.team||'')===team&&archiveName(p.name)===name);
     const p=archiveSafeNumber(player?.modelProbability);
     if(p!==null&&p>=0&&p<=1)candidates.push({kind:'tso_regressed_atd',p,time:atd.generatedAt,iterations:null,
      version:'source-unversioned-2025-baseline'});
    }
    for(const c of candidates){
     const t=archiveTime(c.time,now,48*3600000);
     if(t===null||t>=kickoff||quoteTime>=kickoff)continue;
     const row={gameId,team,name,playerId:q.playerId||null,market,side:market==='atd'?'yes':'over',
      line,book:String(q.book).slice(0,60),price,p:c.p,kind:c.kind,modelTime:new Date(t).toISOString(),
      modelVersion:(String(c.version).slice(0,48)+'|source-sha256:'+(await archiveHash([gameId,team,name,c.kind,c.time,market,line,c.p].join('|'))).slice(0,18)),quoteTime:new Date(quoteTime).toISOString(),
      kickoff:new Date(kickoff).toISOString(),iterations:c.iterations};
     row.id=await archiveHash([row.gameId,row.team,row.name,row.market,row.side,row.line,row.book,row.price,
      row.kind,row.p,row.modelTime,row.modelVersion,row.quoteTime].join('|'));
     rows.push(row);
    }
   }
   diag.games=gameIDs.size;diag.eligible=rows.length;
   for(let i=0;i<Math.min(rows.length,2500);i+=60){
    const statements=rows.slice(i,i+60).map(r=>env.NFL_ARCHIVE.prepare(
     'INSERT OR IGNORE INTO prediction_snapshots (id,captured_at,game_id,kickoff_at,player_id,player_name,team,market,side,line,sportsbook,book_price,probability,model_kind,model_generated_at,model_version,odds_snapshot_at,model_iterations,verified_game_source,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    ).bind(r.id,started,r.gameId,r.kickoff,r.playerId,r.name,r.team,r.market,r.side,r.line,
     r.book,r.price,r.p,r.kind,r.modelTime,r.modelVersion,r.quoteTime,r.iterations,
     'ESPN','tso3-preview-'+trigger));
    const batch=await env.NFL_ARCHIVE.batch(statements);
    diag.inserted+=batch.reduce((sum,r)=>sum+Number(r.meta?.changes||0),0);
   }
   if(!rows.length){diag.status='no_fresh_sources';feed.status='no_model_matches';
    diag.reason='Verified sportsbook quotes available, but no source-fresh exact game/player/market/line model matches';feed.reason=diag.reason;
   }else if(rows.length>2500){diag.reason='Per-run capture capped at 2500 records';
   }else{diag.reason='All rows verified pregame, append-only and idempotent by original source timestamps'}
  }
 }catch(e){diag.status='failed';diag.error=String(e?.message||e).slice(0,180)}
 await env.NFL_ARCHIVE.prepare(
  'INSERT INTO capture_runs (run_id,started_at,completed_at,status,forecast_games,eligible_predictions,inserted_predictions,error,reason) VALUES (?,?,?,?,?,?,?,?,?)'
 ).bind(runId,started,new Date().toISOString(),diag.status,diag.games,diag.eligible,
  diag.inserted,diag.error||null,diag.reason||null).run();
 // Preserve separate source diagnostics; never mutate an archived forecast.
 try{
  await env.NFL_ARCHIVE.prepare(
   'INSERT OR IGNORE INTO nfl_feed_checks (run_id,checked_at,source,status,source_snapshot_at,source_age_minutes,eligible_quote_rows,verified_games,games_rejected_for_age,earliest_kickoff_at,reason,observed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(runId,started,'published-parlayapi-nfl-odds',
   feed.status,feed.sourceAt,feed.ageMinutes,feed.quoteRows,feed.verifiedGames,
   feed.rejectedForAge,feed.earliestKickoff,feed.reason,new Date().toISOString()).run();
 }catch(e){console.warn('TSO3 source diagnostic failed',String(e?.message||e).slice(0,100))}
 if(diag.status==='failed')throw Error('NFL prediction archiving failed: '+diag.error);
 return diag;
}

/* Independent, append-only grading of ESPN-verified completed NFL game boxscores.
   Unmatched/inactive players and incomplete stats stay unresolved; NEVER count them as losses. */
const SETTLEMENT_SOURCE='ESPN site v2 NFL completed-game summary';
const SETTLEMENT_MARKETS=new Set(['passYds','passTds','completions','rushYds','recYds','receptions','atd']);
const settleValue=x=>{
 if(typeof x==='number')return Number.isFinite(x)?x:null;
 const v=String(x??'').replace(/,/g,'').trim();
 return /^-?\d+(?:\.\d+)?$/.test(v)?Number(v):null;
};
/* ATD full-game scorer proof: require EVERY scoring play, final scoreboard parity,
   typed TD, unambiguous scoring athlete, and TD totals cross-check.
   Missing type/name/team/clock/status => entire game cannot certify ATD losses. */
function verifyNflAtdScoringLog(summary,competition,teams,players){
 const fail=reason=>({complete:false,reason,scorers:new Map(),touchdowns:0});
 const all=summary?.scoringPlays;
 if(!Array.isArray(all))return fail('missing_scoring_plays');
 const compTeams=competition.competitors||[];
 const home=compTeams.find(x=>x.homeAway==='home');
 const away=compTeams.find(x=>x.homeAway==='away');
 if(!home||!away)return fail('unknown_home_away');
 const homeScore=settleValue(home.score),awayScore=settleValue(away.score);
 if(!Number.isInteger(homeScore)||!Number.isInteger(awayScore)
  ||homeScore<0||awayScore<0)return fail('missing_final_score');
 const scorerCounts=new Map(),kindsByScorer=new Map(),usedPlayIds=new Set();
 let h=0,a=0,touchdowns=0;
 const norm=v=>archiveName(v);
 for(const play of all){
  const key=String(play?.id||'');
  if(!key||usedPlayIds.has(key))return fail('duplicate_or_missing_play_id');
  usedPlayIds.add(key);
  const ph=settleValue(play.homeScore),pa=settleValue(play.awayScore);
  if(!Number.isInteger(ph)||!Number.isInteger(pa)||ph<h||pa<a
   ||ph>homeScore||pa>awayScore)return fail('invalid_scoring_sequence');
  const points=(ph-h)+(pa-a);
  if(points<1||points>8||((ph-h)>0&&(pa-a)>0))return fail('invalid_score_delta');
  h=ph;a=pa;
  const descriptor=String(play.type?.text||play.scoringType?.text||'').toLowerCase();
  const text=String(play.text||'');
  const tdType=/touchdown/.test(descriptor);
  if(!tdType){
   if(points>3 || !/(field goal|safety|extra point|conversion|pat)/.test(descriptor))
    return fail('unclassified_scoring_play');
   continue;
  }
  if(points<6)return fail('inconsistent_touchdown_points');
  let kind=null;
  if(/pass/.test(descriptor))kind='receiving';
  else if(/rush|run/.test(descriptor))kind='rushing';
  else if(/kick/.test(descriptor)&&/return/.test(descriptor))kind='kickreturns';
  else if(/punt/.test(descriptor)&&/return/.test(descriptor))kind='puntreturns';
  else if(/interception/.test(descriptor))kind='interceptions';
  else if(/fumble/.test(descriptor))kind='fumbles';
  if(!kind)return fail('unknown_touchdown_type');
  const team=nflTeamKey(teams.get(String(play.team?.id||''))||play.team?.abbreviation||'');
  if(!team||![...teams.values()].includes(team))return fail('touchdown_team_unverified');
  // Explicit scoring-type specific TD counters; a QB appearing as the passer
  // must never be confused for the receiving touchdown scorer.
  const matches=[...players.values()].filter(p=>p.team===team
   &&p.ids.size===1&&!p.ambiguous&&Number(p.tdByKind?.[kind])>0
   &&norm(text).includes(p.name));
  if(matches.length!==1)return fail('touchdown_scorer_ambiguous_or_missing');
  const keyPlayer=team+'|'+matches[0].name;
  scorerCounts.set(keyPlayer,(scorerCounts.get(keyPlayer)||0)+1);
  const byKind=kindsByScorer.get(keyPlayer)||{};
  byKind[kind]=(byKind[kind]||0)+1;kindsByScorer.set(keyPlayer,byKind);
  touchdowns++;
 }
 if(h!==homeScore||a!==awayScore)return fail('scoring_plays_do_not_match_final_score');
 for(const athlete of players.values()){
  // Validate actual scorer counts against every known nonpassing TD statistic.
  const actual=kindsByScorer.get(athlete.team+'|'+athlete.name)||{};
  for(const [kind,count] of Object.entries(athlete.tdByKind||{})){
   if(Number(count)!==(actual[kind]||0))return fail('scoring_log_boxscore_td_disagreement');
  }
 }
 return {complete:true,reason:'all_td_plays_and_final_score_verified',
  scorers:scorerCounts,scorerTypes:kindsByScorer,touchdowns};
}

function nflFinalBoxscore(summary,gameId,kickoff){
 const comp=summary?.header?.competitions?.[0],type=comp?.status?.type||{};
 if(String(summary?.header?.id||comp?.id||'')!==String(gameId)
  ||type.completed!==true||type.state!=='post')return null;
 const date=Date.parse(comp?.date||'');
 if(!Number.isFinite(date)||Math.abs(date-Date.parse(kickoff))>90*60000)return null;
 const teams=new Map((comp.competitors||[]).filter(t=>t?.team?.id)
  .map(t=>[String(t.team.id),nflTeamKey(t.team.abbreviation)]));
 if(teams.size!==2||!Array.isArray(summary.boxscore?.players)||summary.boxscore.players.length!==2)return null;
 const players=new Map(),coverage=new Map(),nonparticipants=new Map();
 for(const bt of summary.boxscore.players){
  const team=nflTeamKey(bt.team?.abbreviation||teams.get(String(bt.team?.id||'')));
  if(!team||![...teams.values()].includes(team)||coverage.has(team))return null;
  const teamCovered=new Set();coverage.set(team,teamCovered);
  for(const group of bt.statistics||[]){
   const kind=String(group.name||group.type||group.displayName||'').toLowerCase().replace(/[^a-z]/g,'');
   const labels=(group.labels||[]).map(v=>String(v).toUpperCase().replace(/\s/g,''));
   if(kind==='passing'){
    if(labels.includes('YDS'))teamCovered.add('passYds');
    if(labels.includes('TD'))teamCovered.add('passTds');
    if(labels.includes('CMP')||labels.includes('C/ATT')||labels.includes('CMP/ATT')||labels.includes('COMP/ATT'))teamCovered.add('completions');
   }else if(kind==='rushing'&&labels.includes('YDS'))teamCovered.add('rushYds');
   else if(kind==='receiving'){
    if(labels.includes('YDS'))teamCovered.add('recYds');
    if(labels.includes('REC'))teamCovered.add('receptions');
   }
   for(const row of group.athletes||[]){
    const athlete=row.athlete||{},name=archiveName(athlete.displayName||'');
    if(!name)continue;
    const key=team+'|'+name;
    const explicitlyDnp=row.didNotPlay===true||athlete.didNotPlay===true;
    const explicitlyInactive=(row.active===false||athlete.active===false)
     &&/\b(inactive|did not play|dnp)\b/i.test(String(row.reason||athlete.reason||''));
    if(explicitlyDnp||explicitlyInactive){
     const prev=nonparticipants.get(key)||{team,name,ids:new Set(),reasons:new Set()};
     if(athlete.id)prev.ids.add(String(athlete.id));
     prev.reasons.add(explicitlyDnp?'explicit_did_not_play':'explicit_inactive');
     nonparticipants.set(key,prev);
     continue;
    }
    if(!Array.isArray(row.stats))continue;
    let entry=players.get(key);
    if(!entry){entry={team,name,ids:new Set(),hasNumeric:false,market:{},td:0,tdKnown:false,tdByKind:{},presentKinds:new Set(),participationEvidence:false};players.set(key,entry)}
    entry.presentKinds.add(kind);
    if(athlete.id)entry.ids.add(String(athlete.id));
    if(row.didNotPlay===false||athlete.didNotPlay===false)entry.participationEvidence=true;
    const rawStats=row.stats||[];
    if(rawStats.some(x=>{const n=settleValue(x);return n!==null&&n!==0})
     ||rawStats.some(x=>/^\s*\d+\s*\/\s*[1-9]\d*\s*$/.test(String(x))))
     entry.participationEvidence=true;
    if(entry.ids.size>1)entry.ambiguous=true;
    const get=(label)=>{
     const i=labels.indexOf(label);
     return i<0?null:settleValue(row.stats[i]);
    };
    const numbers=row.stats.map(settleValue);
    if(numbers.some(v=>v!==null))entry.hasNumeric=true;
    if(kind==='passing'){
     const pa=get('YDS'),pt=get('TD'),c=get('CMP'),attempt=get('C/ATT');
     if(pa!==null)entry.market.passYds=pa;
     if(pt!==null)entry.market.passTds=pt;
     if(c!==null)entry.market.completions=c;
     else if(attempt!==null)entry.market.completions=attempt;
     else {
      const n=labels.findIndex(x=>/^(C\/ATT|CMP\/ATT|COMP\/ATT)$/.test(x));
      const text=n>=0?String(row.stats[n]||''):'';
      const m=text.match(/^(\d+)\s*\/\s*\d+$/);
      if(m)entry.market.completions=Number(m[1]);
     }
    }
    if(kind==='rushing'){
     const y=get('YDS');if(y!==null)entry.market.rushYds=y;
    }
    if(kind==='receiving'){
     const y=get('YDS'),rec=get('REC');
     if(y!==null)entry.market.recYds=y;
     if(rec!==null)entry.market.receptions=rec;
    }
    if(['rushing','receiving','kickreturns','puntreturns','interceptions','defensive','fumbles'].includes(kind)){
     const td=get('TD');
     if(td!==null){entry.tdKnown=true;entry.tdByKind[kind]=td;entry.td=Object.values(entry.tdByKind).reduce((n,x)=>n+x,0)}
    }
   }
  }
 }
 const atdEvidence=verifyNflAtdScoringLog(summary,comp,teams,players);
 return {players,teams:[...teams.values()],coverage,atdEvidence,nonparticipants};
}
/* Narrow house-rule implementation. `void_evidence` means the ESPN
   postgame record explicitly says DNP/inactive AND a supported book requires
   one play; it is NOT a verified sportsbook ledger settlement.
   Unsupported books remain review-required on DNP; no inferred voids. */
function nflSportsbookAction(s,final){
 const book=String(s.sportsbook||'').trim().toLowerCase();
 const supported=book==='fanduel'||book==='draftkings';
 const policyCode=book==='fanduel'?'FD_US_NFL_ONE_SNAP_2026':
  book==='draftkings'?'DK_US_NFL_ONE_PLAY_2026':'BOOK_RULE_NOT_VERIFIED';
 const team=nflTeamKey(s.team),name=archiveName(s.player_name);
 const person=final.players.get(team+'|'+name);
 const inactive=final.nonparticipants?.get(team+'|'+name);
 const expected=String(s.player_id||'');
 const matchesId=e=>!expected||!/^\d+$/.test(expected)
  ||e?.ids?.size===1&&e.ids.has(expected);
 const info=(action_state,evidence_code)=>({action_state,evidence_code,policy_code:policyCode});
 if(!final.teams.includes(team))return info('review_required','event_team_mismatch');
 if(inactive&&person)return info('review_required','conflicting_participation_records');
 if(inactive){
  if(!matchesId(inactive))return info('review_required','dnp_player_id_mismatch');
  return supported?info('void_evidence',[...inactive.reasons].sort().join('_')):
   info('review_required','explicit_dnp_book_rule_unverified');
 }
 if(!person)return info('review_required','player_not_found_in_final_boxscore');
 if(person.ambiguous||!matchesId(person))return info('review_required','player_identity_unverified');
 const scored=final.atdEvidence?.complete
  &&Number(final.atdEvidence.scorers.get(team+'|'+name)||0)>0;
 if(person.participationEvidence||scored)return info('action_confirmed','confirmed_game_participation');
 return info('review_required','no_qualifying_snap_evidence');
}

function auditNflSnapshot(s,final){
 const name=archiveName(s.player_name),team=nflTeamKey(s.team),market=s.market;
 const fail=reason=>({grade:null,reason});
 const eligibility=nflSportsbookAction(s,final);
 if(eligibility.action_state!=='action_confirmed')
  return fail('participation_'+eligibility.evidence_code);
 if(!SETTLEMENT_MARKETS.has(market)||!final.teams.includes(team))return fail('unsupported_market_or_team');
 const athlete=final.players.get(team+'|'+name);
 // Absent/inactive athletes have NO trusted zero stat. Incomplete boxscore = unresolved.
 if(!athlete)return fail('missing_player_in_final_boxscore');
 if(athlete.ambiguous||!athlete.hasNumeric)return fail('ambiguous_or_incomplete_player');
 const expectedId=String(s.player_id||'');
 if(expectedId&&/^\d+$/.test(expectedId)
  &&(athlete.ids.size!==1||!athlete.ids.has(expectedId)))return fail('player_id_mismatch');
 if(market==='atd'){
  const verified=final.atdEvidence;
  if(verified?.complete){
   const types=verified.scorerTypes?.get(team+'|'+name)||{};
   const nondefensive=Object.entries(types).filter(([k])=>!['interceptions','fumbles','defensive'].includes(k))
    .reduce((n,[,v])=>n+Number(v||0),0);
   const defensive=Object.entries(types).filter(([k])=>['interceptions','fumbles','defensive'].includes(k))
    .reduce((n,[,v])=>n+Number(v||0),0);
   const book=String(s.sportsbook||'').toLowerCase();
   // FanDuel's standard individual ATD excludes defensive unit scores.
   // Other books' handling is not inferred when a defensive player scores.
   if(defensive&&book!=='fanduel')return fail('book_specific_defensive_td_rules_unverified');
   const touchdowns=nondefensive;
   return {grade:{outcome:touchdowns?'win':'loss',realizedStat:touchdowns},
    reason:touchdowns?'scoring_plays_verified_td':'zero_from_complete_scoring_log'};
  }
  // An individual positive TD boxscore still proves an Anytime TD winner.
  // It does NOT prove the game has complete TD scoring evidence for any loser.
  if(athlete.td>0){
   if(Object.keys(athlete.tdByKind||{}).some(k=>['interceptions','fumbles','defensive'].includes(k)
    &&athlete.tdByKind[k]>0))return fail('defensive_td_requires_complete_play_verification');
   return {grade:{outcome:'win',realizedStat:athlete.td},
    reason:'confirmed_touchdown_in_incomplete_log'};
  }
  return fail('atd_zero_not_comprehensively_verified');
 }
 let value=athlete.market[market],reason='confirmed_player_stat';
 if(value===undefined){
  const category=({passYds:'passing',passTds:'passing',completions:'passing',
   rushYds:'rushing',recYds:'receiving',receptions:'receiving'})[market];
  if(athlete.presentKinds.has(category)||!final.coverage.get(team)?.has(market))
   return fail('market_stat_missing_or_incomplete');
  // Athlete was confirmed in a different category; the team boxscore
  // explicitly contains complete labels for this stat category.
  value=0;reason='zero_from_complete_team_category';
 }
 if(!Number.isFinite(value)||!Number.isFinite(Number(s.line)))return fail('invalid_stat_or_line');
 const line=Number(s.line);
 return {grade:{outcome:value>line?'win':value===line?'push':'loss',realizedStat:value},reason};
}
function gradeNflSnapshot(s,final){return auditNflSnapshot(s,final).grade}
async function runNflSettlement(env,trigger='cron'){
 if(!env?.NFL_ARCHIVE)throw Error('TSO3 NFL settlement requires independent archive D1');
 const started=new Date().toISOString(),now=Date.now();
 const runId=await archiveHash('nflsettlement|'+trigger+'|'+started);
 const diag={status:'nothing_final',checked:0,final:0,eligible:0,inserted:0,
  unresolved:0,errors:[],reason:'No completed archive games ready for verified grading'};
 try{
  // No grades until at least 4 hours after kickoff; status must STILL be verified final.
  const eligibleBefore=new Date(now-4*3600000).toISOString();
  const eligibleFrom=new Date(now-14*86400000).toISOString();
  const games=await env.NFL_ARCHIVE.prepare(
   'SELECT p.game_id,MIN(p.kickoff_at) kickoff,MAX(a.last_audit) last_audit FROM prediction_snapshots p '
   +'LEFT JOIN (SELECT game_id,MAX(observed_at) last_audit FROM outcome_observations GROUP BY game_id) a ON a.game_id=p.game_id '
   +'WHERE p.kickoff_at BETWEEN ? AND ? AND EXISTS '
   +'(SELECT 1 FROM prediction_snapshots q LEFT JOIN settled_outcomes s ON s.snapshot_id=q.id '
   +'WHERE q.game_id=p.game_id AND s.snapshot_id IS NULL) '
   +'GROUP BY p.game_id ORDER BY kickoff DESC LIMIT 20'
  ).bind(eligibleFrom,eligibleBefore).all();
  const eligibleGames=(games.results||[]).filter(g=>now-Date.parse(g.kickoff)<=72*3600000
   ||!g.last_audit||now-Date.parse(g.last_audit)>=24*3600000);
  for(let i=0;i<eligibleGames.length;i+=3){
   const batch=eligibleGames.slice(i,i+3);
   const outputs=await Promise.allSettled(batch.map(async g=>{
    const id=String(g.game_id||'');
    if(!/^\d{6,14}$/.test(id))throw Error('invalid event ID');
    const u=ESPN_SCOREBOARDS.nfl.replace(/\/scoreboard$/,'/summary')+'?event='+id;
    const res=await fetch(u,{headers:{accept:'application/json'},
     cf:{cacheEverything:true,cacheTtl:120},signal:AbortSignal.timeout(15000)});
    if(!res.ok)throw Error('ESPN summary HTTP '+res.status);
    const doc=await res.json();
    return {id,kickoff:g.kickoff,final:nflFinalBoxscore(doc,id,g.kickoff)};
   }));
   for(let j=0;j<batch.length;j++){
    diag.checked++;
    const response=outputs[j];
    if(response.status==='rejected'){
     diag.errors.push(batch[j].game_id+': '+String(response.reason?.message||'source error').slice(0,75));
     continue;
    }
    const {id,final}=response.value;
    if(!final)continue;
    diag.final++;
    const pending=await env.NFL_ARCHIVE.prepare(
     'SELECT p.id,p.player_id,p.player_name,p.team,p.market,p.side,p.line,p.sportsbook '
     +'FROM prediction_snapshots p LEFT JOIN settled_outcomes s ON s.snapshot_id=p.id '
     +'WHERE p.game_id=? AND s.snapshot_id IS NULL LIMIT 3500'
    ).bind(id).all();
    const writes=[];
    for(const p of pending.results||[]){
     diag.eligible++;
     const grade=gradeNflSnapshot(p,final);
     if(!grade){diag.unresolved++;continue}
     writes.push(env.NFL_ARCHIVE.prepare(
      'INSERT OR IGNORE INTO settled_outcomes '
      +'(snapshot_id,outcome,realized_stat,final_game_state,source,source_snapshot_at,settled_at) '
      +'VALUES (?,?,?,?,?,?,?)'
     ).bind(p.id,grade.outcome,grade.realizedStat,'post',SETTLEMENT_SOURCE,
      new Date().toISOString(),new Date().toISOString()));
    }
    for(let k=0;k<writes.length;k+=50){
     const saved=await env.NFL_ARCHIVE.batch(writes.slice(k,k+50));
     diag.inserted+=saved.reduce((n,r)=>n+Number(r.meta?.changes||0),0);
    }
   }
  }
  if(diag.inserted)diag.status=diag.errors.length||diag.unresolved?'partial':'settled';
  else if(diag.errors.length)diag.status='partial';
  else if(diag.final&&diag.unresolved)diag.status='partial';
  diag.reason=diag.status==='nothing_final'?'No completed, verified event/player boxscore ready':
   diag.status==='settled'?'Verified completed-game outcomes stored once':
   'Some outcomes are unresolved or sources unavailable; no guessed losses';
 }catch(e){
  diag.status='failed';diag.errors.push(String(e?.message||e).slice(0,140));
  diag.reason='Settlement processing failed; no unverified outcomes written';
 }
 await env.NFL_ARCHIVE.prepare(
  'INSERT INTO settlement_runs (run_id,started_at,completed_at,status,checked_games,final_games,'
  +'eligible_predictions,inserted_outcomes,unresolved_predictions,error,reason) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
 ).bind(runId,started,new Date().toISOString(),diag.status,diag.checked,diag.final,
  diag.eligible,diag.inserted,diag.unresolved,diag.errors.slice(0,5).join('; ')||null,diag.reason).run();
 if(diag.status==='failed')throw Error('NFL postgame settlement failed: '+diag.errors[0]);
 return diag;
}

/* Reconciliation never rewrites the first grade or any original pregame forecast.
   Retains one immutable observation per distinct official outcome/coverage state.
   Corrected or missing verified stats are quarantined from headline metrics. */
async function runNflReconciliation(env,trigger='cron'){
 if(!env?.NFL_ARCHIVE)throw Error('Missing isolated TSO3 archive for NFL reconciliation');
 const started=new Date().toISOString(),now=Date.now();
 const id=await archiveHash('nflreconciliation|'+trigger+'|'+started);
 const diag={status:'nothing_eligible',checked:0,final:0,examined:0,added:0,
  conflicts:0,unresolved:0,errors:[]};
 try{
  const from=new Date(now-14*86400000).toISOString();
  const until=new Date(now-4*3600000).toISOString();
  const g=await env.NFL_ARCHIVE.prepare(
   'SELECT p.game_id,MIN(p.kickoff_at) kickoff,MAX(o.observed_at) last_observation '
   +'FROM prediction_snapshots p LEFT JOIN '
   +'(SELECT game_id,MAX(observed_at) observed_at FROM outcome_observations GROUP BY game_id) o '
   +'ON o.game_id=p.game_id WHERE p.kickoff_at BETWEEN ? AND ? '
   +'GROUP BY p.game_id ORDER BY kickoff DESC LIMIT 24'
  ).bind(from,until).all();
  const games=(g.results||[]).filter(game=>{
   const age=now-Date.parse(game.kickoff);
   return age<=72*3600000||!game.last_observation
    ||now-Date.parse(game.last_observation)>=24*3600000;
  });
  for(let i=0;i<games.length;i+=3){
   const batch=games.slice(i,i+3);
   const checked=await Promise.allSettled(batch.map(async game=>{
    const gid=String(game.game_id||'');
    if(!/^\d{6,14}$/.test(gid))throw Error('Bad archived game ID');
    const link=ESPN_SCOREBOARDS.nfl.replace(/\/scoreboard$/,'/summary')+'?event='+gid;
    const response=await fetch(link,{headers:{accept:'application/json'},
     cf:{cacheEverything:false,cacheTtl:0},signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('Official final source HTTP '+response.status);
    const doc=await response.json();
    return {gid,final:nflFinalBoxscore(doc,gid,game.kickoff)};
   }));
   for(let j=0;j<batch.length;j++){
    diag.checked++;
    if(checked[j].status!=='fulfilled'){
     diag.errors.push(String(batch[j].game_id)+': '+String(checked[j].reason?.message||'source error').slice(0,90));
     continue;
    }
    const {gid,final}=checked[j].value;
    if(!final)continue;diag.final++;
    const rows=await env.NFL_ARCHIVE.prepare(
     'SELECT p.id,p.player_id,p.player_name,p.team,p.market,p.side,p.line,p.sportsbook,'
     +'s.outcome settled_outcome,s.realized_stat settled_stat '
     +'FROM prediction_snapshots p LEFT JOIN settled_outcomes s ON s.snapshot_id=p.id '
     +'WHERE p.game_id=? ORDER BY p.id LIMIT 3500'
    ).bind(gid).all();
    const statements=[],actionStatements=[];
    for(const s of rows.results||[]){
     diag.examined++;
     const action=nflSportsbookAction(s,final);
     const evidenceFingerprint=await archiveHash([action.action_state,action.evidence_code,
      action.policy_code].join('|'));
     const actionId=await archiveHash(s.id+'|action|'+evidenceFingerprint);
     actionStatements.push(env.NFL_ARCHIVE.prepare(
      'INSERT OR IGNORE INTO sportsbook_action_observations '
      +'(observation_id,snapshot_id,game_id,sportsbook,action_state,evidence_code,'
      +'policy_code,observed_at,source,evidence_fingerprint) VALUES (?,?,?,?,?,?,?,?,?,?)'
     ).bind(actionId,s.id,gid,String(s.sportsbook),action.action_state,action.evidence_code,
      action.policy_code,started,SETTLEMENT_SOURCE,evidenceFingerprint));
     const result=auditNflSnapshot(s,final);
     const grade=result.grade,actual=grade?.outcome||'unknown';
     const realized=grade?.realizedStat??null;
     if(!grade)diag.unresolved++;
     if(s.settled_outcome!==null&&s.settled_outcome!==undefined
      &&(!grade||s.settled_outcome!==actual||s.settled_stat!==realized))diag.conflicts++;
     const fp=await archiveHash([actual,realized??'',result.reason].join('|'));
     const observationId=await archiveHash(s.id+'|'+fp);
     statements.push(env.NFL_ARCHIVE.prepare(
      'INSERT OR IGNORE INTO outcome_observations '
      +'(observation_id,snapshot_id,game_id,observed_at,source,source_fingerprint,'
      +'observed_outcome,realized_stat,reason) VALUES (?,?,?,?,?,?,?,?,?)'
     ).bind(observationId,s.id,gid,started,SETTLEMENT_SOURCE,fp,actual,realized,result.reason));
    }
    for(let k=0;k<actionStatements.length;k+=40){
     await env.NFL_ARCHIVE.batch(actionStatements.slice(k,k+40));
    }
    for(let k=0;k<statements.length;k+=40){
     const out=await env.NFL_ARCHIVE.batch(statements.slice(k,k+40));
     diag.added+=out.reduce((n,x)=>n+Number(x.meta?.changes||0),0);
    }
   }
  }
  diag.status=diag.errors.length?'partial':diag.final?'checked':'nothing_eligible';
 }catch(e){diag.status='failed';diag.errors.push(String(e?.message||e).slice(0,160))}
 const reason=diag.status==='nothing_eligible'?'No recently finalized archive games eligible for recheck':
  diag.conflicts?'Postgame differences detected; original grades preserved and suspect observations excluded from headline metrics':
  diag.errors.length?'Some ESPN final rechecks failed; previous results preserved':
  'Official finalized boxscores rechecked; distinct observations archived without overwrites';
 await env.NFL_ARCHIVE.prepare(
  'INSERT INTO reconciliation_runs (run_id,started_at,completed_at,status,checked_games,'
  +'final_games,examined_predictions,new_observations,conflicts,unresolved,error,reason) '
  +'VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
 ).bind(id,started,new Date().toISOString(),diag.status,diag.checked,diag.final,
  diag.examined,diag.added,diag.conflicts,diag.unresolved,diag.errors.slice(0,5).join('; ')||null,reason).run();
 if(diag.status==='failed')throw Error('NFL reconciliation failed: '+diag.errors[0]);
 return diag;
}

/* Read-only, historically scored NFL validation artifacts. Importantly,
 this endpoint NEVER backfits today's probabilities into past final scores. */
const NFL_VALIDATION_REPLAY='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/main/docs/nfl-accuracy-validation.json';
const NFL_VALIDATION_FIRST='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/main/tso2/data/nfl-first-td-backtest.json';
async function verifiedNflValidation(){
 const [replay,first]=await Promise.all([nflRaw(NFL_VALIDATION_REPLAY,600),nflRaw(NFL_VALIDATION_FIRST,600)]);
 if(!Number.isInteger(replay.scoredGames)||replay.scoredGames<1||!Array.isArray(replay.sources)
  ||!replay.byPhase?.pregame?.projections||!Array.isArray(replay.limitations)
  ||!Number.isInteger(first.schemaVersion)||first.schemaVersion!==1||first.calibration?.eligibleForLive!==false
  ||first.publishCalibratedFirstTd!==false||!Number.isInteger(first.heldOut?.rawHeuristic?.games))
  throw Error('Historical validation artifacts failed integrity checks');
 const metrics=['passYds','rushYds','recYds','receptions'];
 const safeCount=n=>Number.isInteger(n)&&n>=0?n:0;
 const safeMetric=n=>typeof n==='number'&&Number.isFinite(n)?n:null;
 const phase=(name)=>Object.fromEntries(metrics.map(key=>{
  const p=replay.byPhase?.[name]?.projections?.[key];
  return [key,p?{observations:safeCount(p.observations),mae:safeMetric(p.mae),
    rmse:safeMetric(p.rmse),bias:safeMetric(p.bias),interval80Coverage:safeMetric(p.interval80Coverage),
    intervalObservations:safeCount(p.intervalObservations)}:null];
 }));
 const pre=replay.byPhase.pregame;
 const firstMetrics=first.heldOut,baseline=firstMetrics.baselineHistoricalScoring,raw=firstMetrics.rawHeuristic;
 const replayAtd=pre.probabilities?.atd;
 const dateFirst=first.generatedAt;
 const note='These scores are separate historical experiments, not universal 2026 calibration of live TSO ATD, first TD, or player Over predictions.';
 return {schemaVersion:1,source:'Existing TSO audited NFL historical validation artifacts; read only',
  retrievedAt:new Date().toISOString(),available:true,
  firstTouchdown:{model:'Historical first-scoring-player heuristic (NOT current anytime TD model)',
   publishedAt:dateFirst,source:first.source||null,
   method:first.method||null,heldOutGames:safeCount(raw.games),
   seasons:[2025,2026],heldOut2025Games:safeCount(firstMetrics.year2025),
   heldOut2026Games:safeCount(firstMetrics.year2026),
   raw:{multiclassBrier:safeMetric(raw.multiclassBrier),logLoss:safeMetric(raw.logLoss),
    capturedScorer:safeCount(raw.scoringPlayerInModel),otherOutcomes:safeCount(raw.otherOutcomes)},
   baseline:{multiclassBrier:safeMetric(baseline?.multiclassBrier),logLoss:safeMetric(baseline?.logLoss)},
   selectedScale:safeMetric(first.calibration.selectedScale),
   eligibleForLive:false,holdoutPartitions:firstMetrics.partitions||[],
   caveats:first.calibration.caveats||[],interpretation:first.interpretation},
  fiftyKReplay:{model:'Existing TSO historical simulation replay (retrospective)',
   scoredGames:safeCount(replay.scoredGames),forecastFrames:safeCount(replay.forecastFrames),
   gameId:String(replay.gameId||''),selection:String(replay.selection||''),
   pregame:{forecasts:safeCount(pre.forecastCount),games:safeCount(pre.gameCount),
    metrics:phase('pregame'),winner:pre.winner?{
     observations:safeCount(pre.winner.observations),multiclassBrier:safeMetric(pre.winner.multiclassBrier)}:null,
    atd:replayAtd?{observations:safeCount(replayAtd.observations),
     brier:safeMetric(replayAtd.brier)}:null},
   liveQ3:replay.byPhase['live:Q3']?{forecasts:safeCount(replay.byPhase['live:Q3'].forecastCount),
    metrics:phase('live:Q3')}:null,
   limitations:replay.limitations.slice(0,10),sourceReports:replay.sources.map(r=>({
    file:r.file,sha256:r.sha256||null})),historicalPeriod:'2026-09',
   heldOut:false},
  currentModelGates:{
   currentAtd:{status:'UNVALIDATED',reason:'The one-game replay does not establish calibration of the current live regressed 2025-baseline Anytime TD model.'},
   current50k:{status:'INSUFFICIENT',reason:'One completed historical game with correlated player predictions is insufficient to infer robust pregame calibration.'},
   currentExactOver:{status:'UNVALIDATED',reason:'No independently archived multi-game, before-kickoff exact-line probability versus final result dataset is published here.'},
   firstTd:{status:'EXPERIMENTAL',reason:'Held-out 126-game first-scorer result is for a historical heuristic, not the live ATD model. Calibration scale was not approved for live.'}
  },
  note};
}

async function verifiedNflResearch(){
 const [doc,official]=await Promise.all([nflRaw(NFL_RESEARCH_URL,300),officialGames(ESPN_SCOREBOARDS.nfl,'nfl')]);
 if(!Array.isArray(doc?.players)||!Number.isFinite(Date.parse(doc?.generatedAt||'')))throw Error('Invalid NFL research source');
 const baselineGroups=new Map(),observed=new Set();
 for(const p of doc.players){
  const matchup=p?.matchup,opp=nflTeamKey(matchup?.opponent||'');
  const pos=String(matchup?.positionGroup||p?.position||'').toUpperCase();
  const n=Number(matchup?.currentSeasonAllowed?.games),yds=matchup?.currentSeasonAllowed?.perGame?.yards;
  const key=opp+'|'+pos;
  if(!opp||!['QB','RB','WR','TE'].includes(pos)||observed.has(key)
   ||!Number.isFinite(n)||n<3||yds===null||yds===undefined||!Number.isFinite(Number(yds))
   ||Number(matchup.season)!==Number(doc.season))continue;
  observed.add(key);
  if(!baselineGroups.has(pos))baselineGroups.set(pos,[]);
  baselineGroups.get(pos).push(Number(yds));
 }
 const positionalBenchmarks=Object.fromEntries([...baselineGroups.entries()].map(([pos,values])=>
  [pos,{yardsPerGame:values.length>=16?values.reduce((a,b)=>a+b,0)/values.length:null,
   defenses:values.length,minGames:3,season:doc.season}]));
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
  positionalBenchmarks,playerCount:list.length,players:list,
  note:'Current-season production and previous-season history are separate. No simulated games are counted as observed.'};
}

/* Official U.S. NWS kickoff forecast; stadium coordinates are third-party
   venue facts, never inferred from a home team's city. No international
   forecast is invented and no third-party free commercial weather API used. */
const STADIUM_GEO_SOURCE='https://raw.githubusercontent.com/greerreNFL/stadiums/main/data/stadiums.csv';
const NWS_HEADERS={'Accept':'application/geo+json',
 'User-Agent':'TheSportsOutpost/3.0 (https://thesportsoutpost.com)'};
const weatherCache={venues:null,at:0,forecasts:new Map()};
const venueKey=x=>decodeVenueName(x).toLowerCase().normalize('NFKD')
 .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
function stadiumCsvRows(text){
 const rows=[];let row=[],cell='',quote=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quote&&text[i+1]==='"'){cell+='"';i++}else quote=!quote}
  else if(c===','&&!quote){row.push(cell);cell=''}
  else if((c==='\r'||c==='\n')&&!quote){
   if(c==='\r'&&text[i+1]==='\n')i++;
   row.push(cell);cell='';if(row.length>1)rows.push(row);row=[];
  }else cell+=c;
 }
 row.push(cell);if(row.length>1)rows.push(row);
 return rows;
}
async function stadiumPositions(){
 if(weatherCache.venues&&Date.now()-weatherCache.at<12*3600000)return weatherCache.venues;
 const res=await fetch(STADIUM_GEO_SOURCE,{headers:{accept:'text/plain'},
  cf:{cacheEverything:true,cacheTtl:3600*12},signal:AbortSignal.timeout(12000)});
 if(!res.ok)throw Error('Stadium coordinates source unavailable');
 const data=await res.text();
 if(data.length<1000||data.length>600000)throw Error('Stadium position data invalid');
 const rows=stadiumCsvRows(data);const fields=rows.shift()||[];
 const index=Object.fromEntries(fields.map((k,i)=>[k,i]));
 for(const field of ['stadium_name','lat','lon','country'])if(!Number.isInteger(index[field]))
  throw Error('Unrecognized venue coordinate schema');
 const mapped=new Map();
 for(const row of rows){
  const name=row[index.stadium_name],lat=Number(row[index.lat]),lon=Number(row[index.lon]);
  if(!name||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue;
  mapped.set(venueKey(name),{lat,lon,sourceName:name,country:row[index.country]||''});
 }
 if(mapped.size<28)throw Error('Not enough verified venues to match');
 weatherCache.venues=mapped;weatherCache.at=Date.now();
 return mapped;
}
async function nwsGameForecast(geo,kickoff){
 const key=geo.lat.toFixed(4)+','+geo.lon.toFixed(4);
 const cached=weatherCache.forecasts.get(key);
 if(cached&&Date.now()-cached.at<15*60000)return cached.forecast;
 const pointUrl='https://api.weather.gov/points/'+key;
 const point=await fetch(pointUrl,{headers:NWS_HEADERS,cf:{cacheEverything:true,cacheTtl:86400},
  signal:AbortSignal.timeout(13000)});
 if(!point.ok)throw Error('NOAA point lookup HTTP '+point.status);
 const loc=await point.json();
 const hourlyUrl=String(loc.properties?.forecastHourly||'');
 if(!/^https:\/\/api\.weather\.gov\/gridpoints\/[A-Za-z]{3,4}\/\d+,\d+\/forecast\/hourly$/.test(hourlyUrl))
  throw Error('NWS hourly forecast not provided for this stadium');
 const hourly=await fetch(hourlyUrl,{headers:NWS_HEADERS,cf:{cacheEverything:true,cacheTtl:900},
  signal:AbortSignal.timeout(15000)});
 if(!hourly.ok)throw Error('NWS forecast HTTP '+hourly.status);
 const data=await hourly.json(),periods=data.properties?.periods;
 if(!Array.isArray(periods)||!periods.length)throw Error('NWS hourly periods absent');
 const update=data.properties?.updateTime||data.properties?.generatedAt||null;
 const forecast={periods:periods.map(p=>({
  startTime:p.startTime,endTime:p.endTime,temperature:p.temperature,
  temperatureUnit:p.temperatureUnit,windSpeed:p.windSpeed,
  windGust:p.windGust||null,windDirection:p.windDirection||null,
  precipChance:p.probabilityOfPrecipitation?.value??null,
  shortForecast:p.shortForecast||null})),issuedAt:update};
 weatherCache.forecasts.set(key,{at:Date.now(),forecast});
 return forecast;
}
function selectKickoffHour(doc,kickoff){
 const date=Date.parse(kickoff||'');if(!Number.isFinite(date))return null;
 const covering=doc.periods.find(p=>Date.parse(p.startTime)<=date&&Date.parse(p.endTime)>date);
 if(covering)return covering;
 const close=doc.periods.map(p=>({p,diff:Math.abs(Date.parse(p.startTime)-date)}))
  .sort((a,b)=>a.diff-b.diff)[0];
 return close&&close.diff<=90*60000?close.p:null;
}
async function verifiedNflWeather(){
 const official=await officialGames(ESPN_SCOREBOARDS.nfl,'nfl');
 const now=Date.now(),games=official.filter(g=>g.state==='pre'&&Date.parse(g.startTime)>now
  &&Date.parse(g.startTime)<now+6*86400000);
 let stadiums=null,geoFailure=null;
 try{stadiums=await stadiumPositions()}catch(error){geoFailure=String(error?.message||'Venue geolocation failed').slice(0,120)}
 const entries=[];
 const tasks=games.map(game=>async()=>{
  const v=game.venueMeta||{};
  const meta={id:game.id,matchup:(game.away?.abbr||'')+' @ '+(game.home?.abbr||''),
   kickoff:game.startTime,venue:v.name||game.venue||'',city:v.city||'',
   indoor:v.indoor,source:'Official ESPN matchup and venue',forecastSource:null,
   fetchedAt:null,issuedAt:null,weather:null,status:'unavailable',reason:null};
  if(v.indoor===true){
   meta.status='indoor';meta.reason='ESPN lists this venue as indoors; outdoor wind/rain not applied';
   return meta;
  }
  if(v.indoor!==false){
   meta.reason='Official venue roof/indoor designation not confirmed';
   return meta;
  }
  if(!['USA','US','United States','United States of America'].includes(v.country)){
   meta.status='international';meta.reason='NOAA/NWS does not forecast this country';
   return meta;
  }
  if(geoFailure){meta.reason=geoFailure;return meta}
  const geo=stadiums?.get(venueKey(meta.venue));
  if(!geo||!/united states/i.test(geo.country)){
   meta.reason='No exact stadium-coordinate match to verified venue';return meta;
  }
  try{
   const forecast=await nwsGameForecast(geo,game.startTime),hour=selectKickoffHour(forecast,game.startTime);
   if(!hour){meta.reason='Kickoff is beyond the issued hourly forecast window';return meta}
   const temp=Number(hour.temperature),pop=Number(hour.precipChance);
   meta.weather={temperature:Number.isFinite(temp)?temp:null,
    temperatureUnit:String(hour.temperatureUnit||'F'),windSpeed:hour.windSpeed||null,
    windGust:hour.windGust||null,windDirection:hour.windDirection||null,
    precipitationProbability:hour.precipChance===null?null:Number.isFinite(pop)?pop:null,
    condition:String(hour.shortForecast||''),validFrom:hour.startTime,validTo:hour.endTime,
    locationType:'Stadium coordinates'};
   meta.status='forecast';meta.source='ESPN verified stadium / third-party geolocation';
   meta.forecastSource='NOAA National Weather Service hourly forecast';
   meta.fetchedAt=new Date().toISOString();meta.issuedAt=forecast.issuedAt;
   return meta;
  }catch(error){meta.reason=String(error?.message||'NWS forecast temporarily unavailable').slice(0,100);return meta}
 });
 // Bound request fan-out and respect NWS public API request limits.
 for(let i=0;i<tasks.length;i+=4){
  const results=await Promise.allSettled(tasks.slice(i,i+4).map(task=>task()));
  entries.push(...results.map((result,j)=>result.status==='fulfilled'?result.value:{
   id:games[i+j]?.id,status:'unavailable',reason:'Official forecast temporarily unavailable'}));
 }
 const coverage={forecast:entries.filter(x=>x.status==='forecast').length,
  indoor:entries.filter(x=>x.status==='indoor').length,
  unavailable:entries.filter(x=>x.status==='unavailable').length,
  international:entries.filter(x=>x.status==='international').length};
 return {source:'ESPN official venues + NOAA NWS U.S. hourly forecast',
  geolocation:'Verified venue-name match against greerreNFL stadium coordinates',
  fetchedAt:new Date().toISOString(),games:entries,coverage,
  note:'Kickoff forecasts, not observed game conditions. NOAA is U.S. only; an unavailable source is never treated as calm or dry. Venue coordinates are matched by exact stadium name.'};
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
 if(age< -5||age>240)return {available:false,fetchedAt:doc.meta.fetchedAt,ageMinutes:Math.round(age),stale:true,games:[],rows:[],reason:'Odds snapshot exceeds 240-minute global maximum',verifiedGames:0,rejectedForAge:0,earliestKickoff:null};
 const marketSet=new Set(['atd','firstTd','passYds','rushYds','recYds','receptions','targets','carries','passTds','passAttempts','completions']);
 const rows=[];
 let unmatched=0,rejectedForAge=0,verifiedGames=0,earliestKickoff=null;
 for(const g of doc.games){
  const officialGame=official.find(x=>nflEventMatch(g.away,g.home,g.startDateUTC,x));
  if(!officialGame||officialGame.state!=='pre'||Date.parse(officialGame.startTime)<Date.now()-15*60000){unmatched++;continue}
  const hours=(Date.parse(officialGame.startTime)-Date.now())/3600000;
  const cap=nflOddsAgeLimitMinutes(hours);
  if(age>cap){rejectedForAge++;continue}
  verifiedGames++;
  if(!earliestKickoff||Date.parse(officialGame.startTime)<Date.parse(earliestKickoff))earliestKickoff=officialGame.startTime;
  for(const p of g.players||[]){
   if(!p?.name||!p.odds||typeof p.odds!=='object')continue;
   for(const [key,odds] of Object.entries(p.odds)){
    if(!marketSet.has(key))continue;
    // Published primary AND alternate Over prices, never infer an alternate
    // from an unrelated line. Preserve the quote's underlying timestamp when
    // present; source-file fetchedAt is an upper bound, not freshness proof.
    const binary=key==='atd'||key==='firstTd';
    const offers=binary?[{line:0.5,best:odds.best,alternate:false}]
     :[{line:odds.line,best:odds.over?.best,alternate:false},
       ...(Array.isArray(odds.alternates)?odds.alternates.map(a=>({
        line:a.line,best:a.over?.best,alternate:Number(a.line)!==Number(odds.line)})):[])];
    const distinct=new Set();
    for(const offer of offers){
     const best=offer.best;
     if(!best)continue;
     const price=Number(best.price??best.odds??best.american??best.value),
      line=Number(offer.line),book=best.book||best.bookmaker||best.sportsbook;
     if(!Number.isInteger(price)||price===0||!Number.isFinite(line)||!book)continue;
     const id=[String(book).toLowerCase(),line].join('|');
     if(distinct.has(id))continue;distinct.add(id);
     const ts=Number(best.ts);
     const original=Number.isFinite(ts)&&ts>1e12?ts:Number.isFinite(ts)&&ts>1e9?ts*1000:null;
     const ageSeconds=Number(best.ageSeconds);
     const byAge=Number.isFinite(ageSeconds)&&ageSeconds>=0?date-ageSeconds*1000:null;
     const observed=Math.min(date,original??date,byAge??date);
     const measuredAge=(Date.now()-observed)/60000;
     if(!Number.isFinite(measuredAge)||measuredAge<0||measuredAge>Math.min(240,cap)
      ||observed>=Date.parse(officialGame.startTime))continue;
     rows.push({sport:'nfl',eventId:String(g.fixtureId||''),verifiedGameId:String(officialGame.id),
      player:String(p.name),playerId:p.playerId||null,team:nflTeamKey(p.team),market:key,
      line,side:binary?'yes':'over',price,book:String(book),snapshotTime:new Date(observed).toISOString(),
      timestampEvidence:original!==null?'provider-time':byAge!==null?'provider-age':'published-snapshot',
      alternateLine:Boolean(offer.alternate),
      homeTeam:officialGame.home.name,awayTeam:officialGame.away.name,commenceTime:officialGame.startTime});
    }
   }
  }
 }
 return {source:'ParlayAPI NFL sportsbook snapshot, official ESPN game identity',fetchedAt:doc.meta.fetchedAt,
  ageMinutes:Math.round(age),available:rows.length>0,stale:rows.length===0,rows,unmatchedGames:unmatched,
  verifiedGames,rejectedForAge,earliestKickoff,reason:rows.length?'Verified pregame sportsbook quotes':rejectedForAge?'Odds source older than kickoff-specific freshness caps':'No official-game verified player quotes',
  note:'Snapshot prices are not continuously streaming. Only valid pregame books matched to official kickoff are shown.'};
}

/* Four published TSO sportsbook feeds, verified against official ESPN fixtures.
   Timestamp is each original bookmaker quote, NEVER the fetch timestamp. */
const OTHER_ODDS_SOURCES={mlb:'mlb-odds.json',nhl:'nhl-odds.json',wnba:'wnba-odds.json',cfb:'ncaaf-odds.json'};
const OTHER_MARKETS={
 mlb:{homeRun:'Home Runs',hits:'Hits',totalBases:'Total Bases',rbi:'RBIs',runs:'Runs',hrr:'Hits + Runs + RBIs',stolenBases:'Stolen Bases',pitcherStrikeouts:'Pitcher Strikeouts',walks:'Walks',earnedRuns:'Earned Runs',hitsAllowed:'Hits Allowed',pitchingOuts:'Pitching Outs'},
 nhl:{anytimeGoal:'Anytime Goal',firstGoal:'First Goal',sog:'Shots on Goal',goals:'Anytime Goal',assists:'Assists',points:'Points',saves:'Goalie Saves',goalieSaves:'Goalie Saves',powerPlayPoints:'Power Play Points'},
 wnba:{points:'Points',rebounds:'Rebounds',assists:'Assists',threes:'3-Pointers Made',pra:'PRA',steals:'Steals',blocks:'Blocks'},
 cfb:{passYds:'Player Passing Yards',passTds:'Player Passing Touchdowns',completions:'Player Completions',rushYds:'Player Rushing Yards',recYds:'Player Receiving Yards',receptions:'Player Receptions',atd:'Player Touchdowns'}
};
function otherOddsMatch(row,game,league){
 const clean=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const id=String(row.gameId||row.verifiedGameId||'');
 const start=Date.parse(row.commenceTime||''),official=Date.parse(game.startTime||'');
 const sameTeams=clean(row.awayTeam)===clean(game.away?.name)&&clean(row.homeTeam)===clean(game.home?.name);
 return game.league===league&&game.state==='pre'&&Number.isFinite(start)&&Number.isFinite(official)
  &&Math.abs(start-official)<=90*60000&&(id===String(game.id)&&id||sameTeams);
}
async function verifiedOtherOdds(league){
 if(!Object.hasOwn(OTHER_ODDS_SOURCES,league))throw Error('Invalid sports feed');
 const url='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/main/slates/'+OTHER_ODDS_SOURCES[league];
 const response=await fetch(url,{headers:{accept:'application/json'},cf:{cacheEverything:true,cacheTtl:60},signal:AbortSignal.timeout(19000)});
 if(!response.ok)throw Error('Published sports feed HTTP '+response.status);
 const doc=await response.json(),meta=doc?.meta||{},now=Date.now();
 const fetched=Date.parse(meta.fetchedAt||'');
 if(meta.source!=='parlayapi'||meta.sample!==false||!Number.isFinite(fetched))
  throw Error('Invalid published sportsbook source metadata');
 if(fetched>now+5*60000||now-fetched>240*60000)
  return {available:false,league,source:'TSO published ParlayAPI',fetchedAt:meta.fetchedAt,rows:[],reason:'Published source stale or future-dated'};
 const values=league==='nhl'?doc.quotes:doc.rows;
 if(!Array.isArray(values))throw Error('Invalid published sportsbook rows');
 const official=await officialGames(ESPN_SCOREBOARDS[league],league),rows=[],rejected={event:0,quote:0,price:0,market:0};
 for(const q of values.slice(0,25000)){
  if(q?.preserved===true){rejected.quote++;continue}
  if(!q?.player||!q?.book||!Object.hasOwn(OTHER_MARKETS[league],String(q.market))||q.inclusive===true
   ||q.period&&q.period!=='FULL'){rejected.market++;continue}
  const start=Date.parse(q.commenceTime||''),stamp=Date.parse(q.snapshotTime||'');
  const stampN=Number.isFinite(stamp)?stamp:league==='nhl'?Number(q.ts):NaN;
  if(!Number.isFinite(start)||start<=now+15*60000||start>now+9*86400000){rejected.event++;continue}
  const game=official.find(g=>otherOddsMatch(q,g,league));
  if(!game){rejected.event++;continue}
  const sourceAge=(now-stampN)/60000;
  if(!Number.isFinite(sourceAge)||sourceAge<0||sourceAge>Math.min(240,nflOddsAgeLimitMinutes((start-now)/3600000))
   ||stampN>=start){rejected.quote++;continue}
  const price=Number(q.overPrice??q.over),line=Number(q.line);
  if(!Number.isInteger(price)||price===0||Math.abs(price)<100||!Number.isFinite(line)){rejected.price++;continue}
  const binary=['anytimeGoal','firstGoal','homeRun','atd'].includes(String(q.market));
  rows.push({sport:league,verifiedGameId:String(game.id),eventId:String(q.eventId||q.gameId||''),
   player:String(q.player),playerId:q.playerId||null,team:q.team||null,market:String(q.market),
   marketLabel:OTHER_MARKETS[league][q.market],line,side:binary?'yes':'over',
   price,book:String(q.book),snapshotTime:new Date(stampN).toISOString(),commenceTime:game.startTime,
   awayTeam:game.away.name,homeTeam:game.home.name,model:null,
   source:'TSO ParlayAPI published bookmaker quote · ESPN verified fixture'});
 }
 return {available:rows.length>0,league,source:'TSO ParlayAPI published sportsbook snapshot · ESPN verified event',
  fetchedAt:meta.fetchedAt,rawRows:values.length,rejected,rows,
  reason:rows.length?'Verified current Over/Yes sportsbook quotes':'No current verified bookmaker selections'};
}
/* Original TSO NHL goal model. Disclose only pregame probabilities with
   unchanged ESPN game ID and current model version; no implied scores. */
/* Full-depth TSO NHL research already published from ESPN athlete eventlogs,
   actual game summaries and opponent defensive splits. Match player membership
   to the *official current matchup roster* before exposing positional metrics.
   This does not derive or invent sportsbook probabilities. */
const TSO_NHL_RESEARCH_URL='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/main/slates/nhl-research.json';
let tsoNhlResearchMemo=null;
async function tsoNhlResearchData(){
 const now=Date.now();
 if(tsoNhlResearchMemo&&now-tsoNhlResearchMemo.at<8*60000)
  return tsoNhlResearchMemo.promise;
 const promise=(async()=>{
  const result=await fetch(TSO_NHL_RESEARCH_URL,{headers:{accept:'application/json'},
   cf:{cacheEverything:true,cacheTtl:480},signal:AbortSignal.timeout(23000)});
  if(!result.ok)throw Error('Published NHL research unavailable');
  const doc=await result.json(),age=(Date.now()-Date.parse(doc.generatedAt||''))/3600000;
  const expectedSeason=new Date().getUTCMonth()>=6?new Date().getUTCFullYear()+1:new Date().getUTCFullYear();
  if(Number(doc.version)<4||Number(doc.currentSeason)!==expectedSeason
   ||!doc.players||!doc.teamDefense?.teams||!Number.isFinite(age)||age< -0.1||age>36)
   throw Error('Published NHL player history is missing or too old');
  return doc;
 })();
 tsoNhlResearchMemo={at:now,promise};
 try{return await promise}catch(e){tsoNhlResearchMemo=null;throw e}
}
async function verifiedNhlMatchupHistory(gameId,athleteId){
 const roster=await officialGameRosters('nhl',gameId);
 if(!roster.available)return {available:false,reason:roster.reason||'Official NHL matchup missing'};
 const matches=roster.teams.flatMap(t=>t.available?(t.players||[])
  .filter(p=>String(p.id)===athleteId).map(p=>({team:t,athlete:p})):[]);
 if(matches.length!==1||roster.teams.some(t=>!t.available))
  return {available:false,reason:'Current player is not uniquely verified on both official team rosters'};
 const {team,athlete}=matches[0],opponent=roster.teams.find(t=>t.id!==team.id);
 if(!opponent)return {available:false,reason:'Official opponent identity is missing'};
 const doc=await tsoNhlResearchData(),player=doc.players[athleteId];
 if(!player)return {available:false,reason:'No recorded NHL season history for this rostered player'};
 const now=Date.now(),history=(Array.isArray(player.recentGames)?player.recentGames:[])
  .filter(g=>Number.isFinite(Date.parse(g.date||''))&&Date.parse(g.date)<=now
   &&g?.stats&&typeof g.stats==='object'&&Number(g.seasonType)===2)
  .sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,30)
  .map(g=>({date:g.date,eventId:String(g.eventId||''),season:g.season,
   opponent:g.opponent||null,homeAway:g.homeAway||null,firstGoal:g.firstGoal===true,
   stats:Object.fromEntries(['goals','assists','sog','points','blocks','saves','ppGoals','goalsAgainst','shotsAgainst']
    .map(k=>[k,Number(g.stats?.[k])]).filter(([k,v])=>g.stats?.[k]!==null&&g.stats?.[k]!==undefined&&Number.isFinite(v)))}));
 const teamDefense=doc.teamDefense.teams[opponent.abbr]||null,
  positionKey=String(athlete.position||'').toUpperCase(),
  pos=teamDefense?.position?.[positionKey]||null;
 const limitedDefense=teamDefense?{
  source:teamDefense.source||'TSO ESPN game summaries',
  games:teamDefense.games||null,currentSeasonGames:teamDefense.currentSeasonGames||null,
  goalsAllowedPerGame:teamDefense.goalsAllowedPerGame??null,
  shotsAllowedPerGame:teamDefense.shotsAllowedPerGame??null,
  recent10GoalsAllowedPerGame:teamDefense.recent10GoalsAllowedPerGame??null,
  recent10ShotsAllowedPerGame:teamDefense.recent10ShotsAllowedPerGame??null,
  defenseAtVenue:(roster.home===opponent.abbr?teamDefense.homeDefense:teamDefense.awayDefense)||null,
  position:pos?{position:positionKey,games:pos.games,
   goalAllowedRank:pos.goalAllowedRank,rankedTeams:pos.rankedTeams,
   goalsPerGame:pos.goalsPerGame,shotsPerGame:pos.shotsPerGame,
   firstGoalRate:pos.firstGoalRate}:null
 }:null;
 return{available:history.length>0||Boolean(player.rates),source:'TSO NHL research v4 · ESPN original athlete events + final game summaries',
  generatedAt:doc.generatedAt,gameId,athleteId,athleteName:athlete.name,
  position:positionKey,team:team.abbr,opponent:opponent.abbr,
  games:history,priorSeason:Number(doc.season),currentSeason:Number(doc.currentSeason),
  priorSeasonRates:player.rates||null,defense:limitedDefense,
  caveat:'Observed stats and opponent opportunity splits; not calibrated player prop probabilities. Team roster does not certify an active starter.'};
}
async function verifiedNhlGoalModel(){
 const source='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/main/slates/nhl-first-goal.json';
 const [r,official]=await Promise.all([
  fetch(source,{headers:{accept:'application/json'},cf:{cacheEverything:true,cacheTtl:90},signal:AbortSignal.timeout(19000)}),
  officialGames(ESPN_SCOREBOARDS.nhl,'nhl')
 ]);
 if(!r.ok)throw Error('NHL goal source HTTP '+r.status);
 const doc=await r.json(),now=Date.now(),generated=Date.parse(doc?.generatedAt||'');
 if(doc?.source!=='TSO NHL first-goal model'||!Array.isArray(doc.games)||!Number.isFinite(generated)
  ||generated>now||now-generated>48*3600000)
  return {available:false,source:'TSO NHL First Goal model',rows:[],reason:'No current verified pregame NHL goal simulation'};
 const games=[];
 for(const g of doc.games){
  const matched=official.find(o=>o.league==='nhl'&&o.state==='pre'&&String(o.id)===String(g.gameId)
   &&Math.abs(Date.parse(o.startTime)-Date.parse(g.startTime))<90*60000
   &&Date.parse(o.startTime)>now+15*60000);
  if(!matched||generated>=Date.parse(matched.startTime))continue;
  const players=[];
  for(const side of [g.home,g.away]){
   for(const p of side?.players||[]){
    if(!p?.name||!p.id||!p.team)continue;
    const first=Number(p.probability),anytime=Number(p.anytimeProbability);
    players.push({playerId:String(p.id),name:String(p.name),team:nflTeamKey(p.team),
     position:p.position||null,
     firstGoalProbability:Number.isFinite(first)&&first>=0&&first<=1?first:null,
     anytimeGoalProbability:Number.isFinite(anytime)&&anytime>=0&&anytime<=1?anytime:null,
     opponent:p.matchup?.opponent||null,
     defenseRank:Number.isFinite(Number(p.matchup?.goalAllowedRank))?Number(p.matchup.goalAllowedRank):null,
     allowedPerGame:Number.isFinite(Number(p.matchup?.goalsAllowedPerGame))?Number(p.matchup.goalsAllowedPerGame):null,
     shootingPct:Number.isFinite(Number(p.shootingPct))?Number(p.shootingPct):null,
     recentGoals:Number.isFinite(Number(p.recentGoals))?Number(p.recentGoals):null,
     recentGames:Number.isFinite(Number(p.recentGames))?Number(p.recentGames):null,
     goalieVerified:p.matchup?.goalie?.verified===true});
   }
  }
  if(players.length)games.push({gameId:String(matched.id),startTime:matched.startTime,players});
 }
 return {available:games.length>0,source:'TSO NHL FGS-Hazard Ensemble v3 / own published model',
  modelName:doc.model,generatedAt:doc.generatedAt,season:doc.season||null,games,
  note:'Pregame-only player scoring estimates matched to official ESPN game IDs. TSO model probabilities are NOT sportsbook prices. Unknown goalie starts remain unverified.'};
}
/* Original ESPN player-depth layer. Unlike sportsbook projections, these are
   recorded season statistics and actual completed game logs. The ESPN athlete
   ID must be explicit; no same-name player guessing. */
const ATHLETE_PATHS=Object.freeze({
 nfl:'football/nfl',nba:'basketball/nba',mlb:'baseball/mlb',
 nhl:'hockey/nhl',wnba:'basketball/wnba',cfb:'football/college-football'
});
function athleteStatFields(names,labels,values){
 if(!Array.isArray(values))return [];
 const n=Array.isArray(names)?names:[],l=Array.isArray(labels)?labels:[];
 const size=values.length;
 if(!size||size>80)return [];
 return values.map((value,i)=>{
  const off=n.length===size?i:n.length>size?n.length-size+i:-1;
  const name=off>=0?String(n[off]||''):String(l[i]||'');
  const label=l.length===size?l[i]:off>=0?l[off]:null;
  const number=Number(value);
  return {name:name.slice(0,70),label:String(label||name||'STAT').slice(0,36),
   value:String(value??'').slice(0,60),
   numeric:value!==null&&value!==''&&Number.isFinite(number)?number:null};
 }).filter(x=>x.name);
}
function athleteGamelogEntries(doc,now){
 // ESPN gamelogs store opponent/date in root events, numeric values in
 // seasonTypes[].categories[].events[]. These cannot be read independently.
 const raw=doc?.events;
 const meta=Array.isArray(raw)?raw:raw&&typeof raw==='object'?Object.values(raw):[];
 const byId=new Map(meta.filter(x=>x&&/^\d{6,14}$/.test(String(x.id||''))).map(x=>[String(x.id),x]));
 const assembled=new Map();
 const put=(record,id,category,fields,period)=>{
  const base=byId.get(id)||record;
  const t=Date.parse(base?.gameDate||base?.date||record?.date||'');
  if(!Number.isFinite(t)||t>now)return;
  const old=assembled.get(id)||{
   eventId:id,date:new Date(t).toISOString(),
   opponent:String(base?.opponent?.abbreviation||base?.opponent?.displayName||'').slice(0,65),
   opponentId:base?.opponent?.id?String(base.opponent.id):null,
   result:String(base?.gameResult||'').slice(0,20),
   seasonType:period,stats:[]
  };
  for(const value of fields){
   const name=(category?category+':':'')+value.name;
   if(!old.stats.some(x=>x.name===name))
    old.stats.push({...value,name:name.slice(0,85)});
  }
  assembled.set(id,old);
 };
 const period=(doc?.seasonTypes||[]).filter(x=>x&&Array.isArray(x.categories));
 for(const season of period){
  const tag=String(season.displayName||season.name||'Season').slice(0,55);
  for(const category of season.categories){
   const cat=String(category?.displayName||category?.name||'').slice(0,40);
   for(const e of category?.events||[]){
    const id=String(e?.eventId||e?.id||'');
    if(!/^\d{6,14}$/.test(id)||!Array.isArray(e?.stats))continue;
    const names=Array.isArray(category?.names)&&category.names.length===e.stats.length?
     category.names:doc?.names;
    const labels=Array.isArray(category?.labels)&&category.labels.length===e.stats.length?
     category.labels:doc?.labels;
    const fields=athleteStatFields(names,labels,e.stats);
    if(fields.length)put(e,id,cat,fields,tag);
   }
  }
 }
 // Some endpoints also include full standalone game rows with their own
 // stats arrays. Never backfill an absent stat with a guessed zero.
 for(const e of meta){
  const id=String(e?.id||'');
  if(assembled.has(id)||!/^\d{6,14}$/.test(id)||!Array.isArray(e?.stats))continue;
  const fields=athleteStatFields(doc?.names,doc?.labels,e.stats);
  if(fields.length)put(e,id,'',fields,'Unknown');
 }
 return [...assembled.values()].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,42);
}
function athleteSeasonStats(doc){
 const categories=Array.isArray(doc?.categories)?doc.categories:[];
 return categories.slice(0,12).map(c=>({
  category:String(c.displayName||c.name||'').slice(0,60),
  values:athleteStatFields(c.names,c.labels,c.totals||c.values)
 })).filter(c=>c.category&&c.values.length);
}
async function verifiedAthleteDepth(sport,id,season){
 if(!Object.hasOwn(ATHLETE_PATHS,sport)||!/^\d{3,12}$/.test(id)
  ||!Number.isInteger(season)||season<2024||season>2027)
  throw Error('Unsupported athlete, league or season');
 const api='https://site.web.api.espn.com/apis/common/v3/sports/'+ATHLETE_PATHS[sport]+'/athletes/'+id;
 const load=async(type)=>{
  const r=await fetch(api+'/'+type+'?season='+season+'&seasontype=2',{
   headers:{accept:'application/json'},cf:{cacheEverything:true,cacheTtl:300},
   signal:AbortSignal.timeout(12500)});
  if(!r.ok)return null;
  const data=await r.json();
  return data&&typeof data==='object'?data:null;
 };
 const [gameDoc,seasonDoc]=await Promise.all([load('gamelog').catch(()=>null),load('stats').catch(()=>null)]);
 const now=Date.now(),events=gameDoc?athleteGamelogEntries(gameDoc,now):[];
 const stats=seasonDoc?athleteSeasonStats(seasonDoc):[];
 if(!events.length&&!stats.length)return {available:false,sport,athleteId:id,season,
  events:[],seasonStats:[],reason:'Official ESPN season game log/statistics unavailable'};
 const foundId=String(gameDoc?.athlete?.id||seasonDoc?.athlete?.id||'');
 if(foundId&&foundId!==id)throw Error('ESPN athlete ID mismatch');
 const person=String(gameDoc?.athlete?.displayName||seasonDoc?.athlete?.displayName||'').slice(0,90);
 return {available:true,sport,athleteId:id,season,athleteName:person||null,
  fetchedAt:new Date(now).toISOString(),
  source:'ESPN official athlete season stats/game log; original records',
  sourceIdentification:foundId?'ESPN athlete ID confirmed':'ESPN requested athlete ID, name not independently confirmed',
  events,seasonStats:stats,gameLogAvailable:events.length>0,
  note:'Observed league season stats, not a betting probability. Incomplete/missing ESPN games remain unavailable; do not interpret a missing game as 0.'};
}
/* Strict official-roster player identity resolution for sportsbook records
   without ESPN numeric player IDs. Candidate teams come from verified ESPN
   event ID, not ambiguous provider team aliases. */
function officialRosterAthletes(doc){
 const raw=Array.isArray(doc?.athletes)?doc.athletes:[];
 const flat=raw.flatMap(g=>Array.isArray(g?.items)?g.items:[g]);
 return flat.filter(x=>/^\d{3,12}$/.test(String(x?.id||x?.athlete?.id||'')))
  .map(x=>{const p=x.athlete||x;return {
   id:String(p.id),name:String(p.displayName||p.fullName||''),
   position:String(p.position?.abbreviation||''),
   status:String(p.status?.name||p.status?.type||'')
  }}).filter(p=>p.name);
}
/* All six leagues: attach official players to the verified game even if
   the upstream sportsbook publisher has no current quotes. This is roster
   research, NOT confirmed starters/lineups or an implicit bettable market. */
async function officialVerifiedGameById(league,gameId){
 const schedule=await officialGames(ESPN_SCOREBOARDS[league],league).catch(()=>[]);
 const onBoard=schedule.find(g=>g.league===league&&String(g.id)===gameId);
 if(onBoard)return {...onBoard,verification:'ESPN official scoreboard exact ID'};
 // Some official dated scoreboards omit recently starting/postponed games.
 // Recover ONLY by the exact event ID from the same league's ESPN summary.
 const summaryUrl=ESPN_SCOREBOARDS[league].replace(/\/scoreboard$/,'/summary')+'?event='+gameId;
 const response=await fetch(summaryUrl,{headers:{accept:'application/json'},
  cf:{cacheEverything:true,cacheTtl:70},signal:AbortSignal.timeout(13500)});
 if(!response.ok)return null;
 const doc=await response.json(),header=doc?.header,comp=header?.competitions?.[0];
 if(String(header?.id||'')!==gameId||!comp)return null;
 const home=comp.competitors?.find(c=>c.homeAway==='home'),
  away=comp.competitors?.find(c=>c.homeAway==='away');
 const stamp=Date.parse(comp.date||header.date||'');
 if(!home?.team?.id||!away?.team?.id||!Number.isFinite(stamp)
  ||stamp<Date.now()-18*3600000||stamp>Date.now()+9*86400000)return null;
 const team=c=>({id:String(c.team.id),name:String(c.team.displayName||c.team.name||''),
  abbr:String(c.team.abbreviation||''),score:c.score??null});
 const status=comp.status?.type||header.status?.type||{};
 const state=status.completed===true?'post':status.state==='in'?'in':'pre';
 return {id:gameId,league,state,startTime:new Date(stamp).toISOString(),
  home:team(home),away:team(away),verification:'ESPN official game summary exact ID'};
}
async function officialGameRosters(league,gameId){
 if(!Object.hasOwn(ATHLETE_PATHS,league)||!Object.hasOwn(ESPN_SCOREBOARDS,league)
  ||!/^\d{6,14}$/.test(gameId))throw Error('Invalid roster lookup');
 const game=await officialVerifiedGameById(league,gameId);
 if(!game)return {available:false,gameId,league,teams:[],reason:'No recently verified ESPN event with this exact ID'};
 const teams=[game.away,game.home];
 const loaded=await Promise.allSettled(teams.map(async team=>{
  const endpoint='https://site.api.espn.com/apis/site/v2/sports/'+ATHLETE_PATHS[league]+'/teams/'+team.id+'/roster';
  const result=await fetch(endpoint,{headers:{accept:'application/json'},
   cf:{cacheEverything:true,cacheTtl:480},signal:AbortSignal.timeout(13000)});
  if(!result.ok)throw Error('ESPN roster endpoint HTTP '+result.status);
  const data=await result.json();
  if(!Array.isArray(data?.athletes))throw Error('Official roster missing athlete groups');
  const seen=new Map();
  for(const p of officialRosterAthletes(data)){
   if(!seen.has(p.id))seen.set(p.id,p);
  }
  if(!seen.size)throw Error('Official roster empty');
  return {id:String(team.id),name:team.name,abbr:team.abbr,players:[...seen.values()].slice(0,90)};
 }));
 return {available:loaded.some(x=>x.status==='fulfilled'),league,gameId,
  gameState:game.state,home:game.home.abbr,away:game.away.abbr,
  gameVerification:game.verification||'ESPN official fixture',
  teams:loaded.map((result,i)=>result.status==='fulfilled'
   ?{...result.value,available:true,rosterType:'Team roster; starters not verified'}
   :{id:String(teams[i].id),name:teams[i].name,abbr:teams[i].abbr,
    available:false,players:[],reason:'Official roster feed unavailable'}),
  checkedAt:new Date().toISOString(),
  source:'ESPN official team rosters matched to ESPN official game schedule',
  note:'Team roster membership is not a verified game-day starter or availability designation. Injuries and actual lineups require separate current evidence.'};
}
async function verifiedPlayerRosterIdentity(league,gameId,player){
 if(!Object.hasOwn(ESPN_SCOREBOARDS,league)||!Object.hasOwn(ATHLETE_PATHS,league)
  ||!/^\d{6,14}$/.test(String(gameId))||!/^[\p{L}\p{N} .'\-]{2,80}$/u.test(player))
  throw Error('Invalid official roster lookup');
 const official=await officialGames(ESPN_SCOREBOARDS[league],league);
 const game=official.find(g=>String(g.id)===String(gameId)&&g.league===league&&g.state==='pre');
 if(!game||!game.away?.id||!game.home?.id)return {available:false,reason:'No verified upcoming ESPN matchup'};
 const key=x=>String(x||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 const wanted=key(player);
 const teams=[game.away,game.home],results=await Promise.allSettled(teams.map(async team=>{
  const endpoint='https://site.api.espn.com/apis/site/v2/sports/'+ATHLETE_PATHS[league]+'/teams/'+team.id+'/roster';
  const response=await fetch(endpoint,{headers:{accept:'application/json'},
   cf:{cacheEverything:true,cacheTtl:900},signal:AbortSignal.timeout(13500)});
  if(!response.ok)throw Error('Official roster unavailable');
  const doc=await response.json();
  if(!Array.isArray(doc?.athletes))throw Error('ESPN roster schema unavailable');
  return officialRosterAthletes(doc).filter(a=>key(a.name)===wanted)
   .map(a=>({...a,teamId:String(team.id),teamAbbr:team.abbr,teamName:team.name}));
 }));
 // Both official team rosters must load; a failed team could hide a second
 // player with the same name. In that case the match is not verifiable.
 if(results.some(r=>r.status!=='fulfilled'))return {available:false,reason:'One or both official team rosters unavailable'};
 const unique=new Map(results.flatMap(r=>r.value).map(p=>[p.id,p]));
 if(unique.size!==1)return {available:false,reason:unique.size?'Ambiguous player identity across official teams':'No exact official roster match'};
 const athlete=[...unique.values()][0];
 return {available:true,league,gameId:String(game.id),athleteId:athlete.id,
  athleteName:athlete.name,teamId:athlete.teamId,teamAbbr:athlete.teamAbbr,
  position:athlete.position,rosterStatus:athlete.status,
  source:'ESPN official team roster; exact unique player match',
  verifiedAt:new Date().toISOString()};
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
function verifiedNbaMarket(value){
 // Known sportsbook/stat markets only. No implied lines, no generated numbers.
 const key=String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 return ['points','rebounds','assists','threes','pra','pr','pa','ra','steals','blocks',
  'pointsrebounds','pointsassists','reboundsassists','playerpointsrebounds',
  'playerpointsassists','playerreboundsassists','playersteals','playerblocks'].includes(key);
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
  if(!q?.player||!q?.book||!verifiedNbaMarket(q.market)
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
    ||q.preserved===true||!q.player||!q.book||!verifiedNbaMarket(q.market)
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
const officialGameCache=new Map();
async function officialGames(url,league){
 // Multiple TSO research endpoints request the same source concurrently.
 // Single-flight the verified schedule, with at most 45 seconds of age.
 const key=league+'|'+url,existing=officialGameCache.get(key);
 if(existing&&(existing.promise||Date.now()-existing.checkedAt<45000))
  return existing.promise||existing.data;
 const pending=officialGamesUncached(url,league);
 officialGameCache.set(key,{promise:pending,checkedAt:0,data:null});
 try{
  const data=await pending;
  officialGameCache.set(key,{promise:null,checkedAt:Date.now(),data});
  return data;
 }catch(error){
  officialGameCache.delete(key);
  throw error;
 }
}
async function officialGamesUncached(url,league){
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
   venue:decodeVenueName(comp.venue?.fullName),
   venueMeta:comp.venue?.id?{
    id:String(comp.venue.id),name:decodeVenueName(comp.venue.fullName),
    city:String(comp.venue.address?.city||''),state:String(comp.venue.address?.state||''),
    country:String(comp.venue.address?.country||''),
    indoor:typeof comp.venue.indoor==='boolean'?comp.venue.indoor:null
   }:null,
   period:comp.status?.period||null,clock:comp.status?.displayClock||null,
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

export default {async scheduled(event,env,ctx){ctx.waitUntil(Promise.all([runNflArchive(env,'cron'),(async()=>{await runNflSettlement(env,'cron');await runNflReconciliation(env,'cron')})()]))},async fetch(req,env){
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
 if(['/api/nfl-touchdowns','/api/nfl-research','/api/nfl-odds','/api/nfl-projections','/api/nfl-injuries','/api/nfl-weather','/api/nfl-validation'].includes(u.pathname)){
  try{
   const doc=u.pathname==='/api/nfl-touchdowns'?await verifiedNflSlate()
    :u.pathname==='/api/nfl-research'?await verifiedNflResearch()
    :u.pathname==='/api/nfl-projections'?await verifiedNflSimulations()
    :u.pathname==='/api/nfl-injuries'?await verifiedNflInjuries()
    :u.pathname==='/api/nfl-weather'?await verifiedNflWeather()
    :u.pathname==='/api/nfl-validation'?await verifiedNflValidation():await verifiedNflOdds();
   return Response.json(doc,{headers:{...headers,'cache-control':'no-store','x-tso-source':'verified TSO NFL model/nflverse/ParlayAPI'}});
  }catch(error){
   return Response.json({available:false,error:'Verified NFL data unavailable',detail:String(error?.message||'').slice(0,160)},
    {status:503,headers:{...headers,'cache-control':'no-store'}});
  }
 }
 if(u.pathname==='/api/nfl-archive-status')return Response.json(await nflArchiveStatus(env),{headers:{...headers,'cache-control':'no-store'}});
 if(u.pathname==='/api/game-roster'){
  const league=String(u.searchParams.get('league')||'').toLowerCase(),
   gameId=String(u.searchParams.get('gameId')||'');
  if(!Object.hasOwn(ATHLETE_PATHS,league)||!/^[0-9]{6,14}$/.test(gameId))
   return Response.json({available:false,error:'Invalid league/game identifier'},{status:400,headers});
  try{
   return Response.json(await officialGameRosters(league,gameId),{
    headers:{...headers,'cache-control':'public, max-age=180','x-tso-source':'ESPN official team roster'}});
  }catch(_){
   return Response.json({available:false,league,gameId,teams:[],reason:'Verified team roster source unavailable'},
    {status:503,headers:{...headers,'cache-control':'no-store'}});
  }
 }
 if(u.pathname==='/api/athlete-identity'){
  const league=String(u.searchParams.get('league')||'').toLowerCase(),
   gameId=String(u.searchParams.get('gameId')||''),name=String(u.searchParams.get('player')||'');
  if(!Object.hasOwn(ATHLETE_PATHS,league)||!/^[0-9]{6,14}$/.test(gameId)
   ||!/^[\\p{L}\\p{N} .'\\-]{2,80}$/u.test(name))
   return Response.json({available:false,error:'Invalid athlete identity lookup'},{status:400,headers});
  try{return Response.json(await verifiedPlayerRosterIdentity(league,gameId,name),{
   headers:{...headers,'cache-control':'private, max-age=240','x-tso-source':'ESPN official matchup/rosters'}})}
  catch(_){return Response.json({available:false,reason:'Current official player roster unavailable'},
   {status:503,headers:{...headers,'cache-control':'no-store'}})}
 }
 if(u.pathname==='/api/athlete-depth'){
  const league=String(u.searchParams.get('league')||'').toLowerCase();
  const playerId=String(u.searchParams.get('playerId')||'');
  const season=Number(u.searchParams.get('season')||({nba:2027,nhl:2027,mlb:2026,nfl:2026,wnba:2026,cfb:2026}[league]||2026));
  if(!Object.hasOwn(ATHLETE_PATHS,league)||!/^[0-9]{3,12}$/.test(playerId)
    ||!Number.isInteger(season)||season<2024||season>2027)
   return Response.json({available:false,error:'Invalid athlete or league'},{status:400,headers});
  try{return Response.json(await verifiedAthleteDepth(league,playerId,season),{
   headers:{...headers,'cache-control':'public, max-age=240','x-tso-source':'ESPN verified athlete statistics'}})}
  catch(_){return Response.json({available:false,error:'ESPN athlete statistics unavailable',
   events:[],seasonStats:[]},{status:503,headers:{...headers,'cache-control':'no-store'}})}
 }
 if(u.pathname==='/api/nhl-player-research'){
  const event=String(u.searchParams.get('gameId')||''),
   player=String(u.searchParams.get('playerId')||'');
  if(!/^[0-9]{6,14}$/.test(event)||!/^[0-9]{3,12}$/.test(player))
   return Response.json({available:false,error:'Invalid game or player ID'},{status:400,headers});
  try{return Response.json(await verifiedNhlMatchupHistory(event,player),{
   headers:{...headers,'cache-control':'public, max-age=300','x-tso-source':'TSO ESPN NHL verified history'}})}
  catch(_){return Response.json({available:false,reason:'NHL research feed currently unavailable'},
   {status:503,headers:{...headers,'cache-control':'no-store'}})}
 }
 if(u.pathname==='/api/nhl-goal-model'){
  try{return Response.json(await verifiedNhlGoalModel(),{headers:{...headers,'cache-control':'no-store','x-tso-source':'TSO NHL historical hazard model'}})}
  catch(e){return Response.json({available:false,source:'TSO NHL model',games:[],reason:String(e?.message||'').slice(0,150)},{status:503,headers})}
 }
 if(u.pathname==='/api/sport-odds'){
  const league=String(u.searchParams.get('league')||'').toLowerCase();
  if(!Object.hasOwn(OTHER_ODDS_SOURCES,league))
   return Response.json({available:false,error:'Unsupported sport'},{status:400,headers});
  try{return Response.json(await verifiedOtherOdds(league),{headers:{...headers,'cache-control':'no-store','x-tso-source':'TSO sportsbook odds / verified ESPN fixture'}})}
  catch(e){return Response.json({available:false,league,rows:[],error:'Verified sportsbook source unavailable',reason:String(e?.message||'').slice(0,120)},{status:503,headers})}
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
 if(!/^(index\.html|app\.js|nba-lab\.js|nba-depth\.js|live-boxscore\.js|nfl-lab\.js|nfl-props\.js|nfl-validation\.js|styles\.css|manifest\.webmanifest|assets\/tso-mark\.svg|assets\/tso-app-icon\.svg|assets\/tso-research-hero\.svg)$/.test(filepath))return new Response('Not found',{status:404,headers});
 // Immutable deployment bundle takes precedence; raw branch source is fallback for local development.
 const bundled=typeof TSO3_BUNDLED_ASSETS!=='undefined'?TSO3_BUNDLED_ASSETS[filepath]:undefined;
 if(typeof bundled==='string')return new Response(req.method==='HEAD'?null:bundled,{status:200,headers:{...headers,'content-type':TYPES[u.pathname]||TYPES['/'+filepath],'cache-control':'no-store','x-tso-build':'bundled-branch-assets'}});
 try{
  const response=await fetch(RAW+filepath+'?tso3='+Math.floor(Date.now()/30000),{headers:{accept:'text/plain,*/*'},cf:{cacheTtl:20,cacheEverything:true}});
  if(!response.ok)return new Response('Preview file unavailable',{status:502,headers});
  return new Response(req.method==='HEAD'?null:response.body,{status:200,headers:{...headers,'content-type':TYPES[u.pathname]||TYPES['/'+filepath],'cache-control':'no-store'}});
 }catch(_){return new Response('Preview source unavailable',{status:503,headers})}
}};
