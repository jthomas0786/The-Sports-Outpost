/* THE SPORTS OUTPOST 3.0 — original six-sport research shell.
   Uses only connected TSO data. No scraped/redistributed PropFinder records.
   A dash means not verified, never zero or a made-up model projection. */
(()=>{
'use strict';
const SPORTS={
 nfl:{label:'NFL',icon:'football',name:'National Football League',markets:['Player Passing Yards','Player Passing Touchdowns','Player Passing Attempts','Player Completions','Player Rushing Yards','Player Rushing Attempts','Player Receiving Yards','Player Receptions','Player Touchdowns','Player Longest Reception','Player Longest Rush','Player Targets'],tools:[['Defense vs Position','2026 defense against QB, RB, WR and TE'], ['Coverage Matchups','2026 receiver form vs opposing position groups'],['Touchdown Opportunities','Red zone, goal line and target share'],['Rushing Matchups','Carry volume and run defense'],['Receiving Matchups','Targets, routes and coverage'],['Quarterback Research','Attempts, depth and pressure'],['Red-Zone Usage','Inside-20 opportunities and conversion'],['Offensive Line Matchups','Run and pass protection'],['Power Ratings','Team strength and quarterback adjustments'],['Weather Impact','Wind, precipitation and playing surface'],['Game Projections','Spread, moneyline and totals'],['Model Validation','Archived accuracy and held-out First TD results'],['Alignment Matchups','Receiver alignment, slot and wide coverage'],['Market Grades','Market grading supported by current verified outcomes'],['Home Field Advantage','Venue and travel adjustments'],['Win Totals','Season outcome scenarios and futures']]},
 nba:{label:'NBA',icon:'basketball',name:'National Basketball Association',markets:['Points','Rebounds','Assists','3-Pointers Made','PRA','Points + Rebounds','Points + Assists','Rebounds + Assists','Steals','Blocks','First Basket'],tools:[['Player Form','Points, rebounds and assists trends'],['Matchup vs Position','Opponent production by player role'],['First Basket','Opening tip and first field-goal history'],['Pace & Possessions','Pace and expected opportunities'],['Minutes & Rotation','On-court availability and substitution patterns'],['Usage & Touches','Shot, assist and possession share'],['Team Stats','Offensive and defensive splits'],['Injury Impact','Available and missing rotation players'],['Game Projections','Model score and team totals']]},
 mlb:{label:'MLB',icon:'baseball',name:'Major League Baseball',markets:['Home Runs','Hits','Total Bases','RBIs','Runs','Hits + Runs + RBIs','Stolen Bases','Pitcher Strikeouts','Walks','Singles','Doubles'],tools:[['Home Run Matchups','Power, contact quality and pitcher tendencies'],['Exit Velocity','Batted-ball speed and launch profile'],['Pitch Mix','Pitch-type usage and batter splits'],['Pitcher vs Lineup','Projected opposing lineup profile'],['Strikeout Matchups','Pitcher K rates and batter swing tendencies'],['Stolen Bases','Attempt rate and catcher control'],['Bullpen Usage','Recent relief workloads'],['Pitcher Summary','Starter repertoire and workload'],['Weather & Park','Ballpark and conditions'],['Team vs Pitch Mix','Pitch-specific lineup strengths'],['Team vs Pitcher','Historical contact, handedness and starter matchups'],['Enhanced Home Run Matchups','Power, launch and pitcher exposure'],['Park Factors','Ballpark run and home run environment']]},
 nhl:{label:'NHL',icon:'hockey',name:'National Hockey League',markets:['Anytime Goal','First Goal','Shots on Goal','Points','Assists','Goalie Saves','Power Play Points'],tools:[['Goal Scorer Matchups','Shot quality and scoring opportunities'],['Skater Statistics','Usage, ice time and recent form'],['Team Statistics','Shots, possession and special teams'],['Defense Vs Position','Opponent chances allowed by C, LW, RW and D'],['Shots on Goal','Volume and opponent allowances'],['Goalie Matchups','Expected starts and save environment'],['Power Play Analysis','Man-advantage unit usage'],['First Goal','First-goal history and opportunity'],['Game Projections','Moneyline, puckline and total'],['Scoring Chances','High-danger opportunities and shot locations'],['Special Teams Matchups','Power-play and penalty-kill effectiveness']]},
 wnba:{label:'WNBA',icon:'basketball',name:"Women's National Basketball Association",markets:['Points','Rebounds','Assists','3-Pointers Made','PRA','Steals','Blocks'],tools:[['Player Trends','Last 5, 10, 20 and season'],['Matchup vs Position','Opponent positional allowances'],['Minutes & Usage','Rotations and offensive involvement'],['Pace & Possessions','Tempo-adjusted opportunity'],['Team Statistics','Recent offensive and defensive production'],['Injury Impact','Lineup availability'],['Game Projections','Game lines and totals']]},
 cfb:{label:'CFB',icon:'school',name:'College Football',markets:['Player Passing Yards','Player Passing Touchdowns','Player Rushing Yards','Player Rushing Attempts','Player Receiving Yards','Player Receptions','Player Touchdowns','Spread','Moneyline','Total Points'],tools:[['Player Trends','Recent passing, rushing and receiving results'],['Team Matchups','Offense against defensive scheme'],['Touchdown Matchups','Scoring opportunities and opponent yield'],['Power Ratings','FBS offense and defense strength'],['Game Projections','Model spread, total and win outcome'],['Quarterback Rankings','Passing and rushing quarterback trends'],['Conference Filters','Conference-specific analysis'],['Weather & Situational','Rest and game-day conditions'],['Market Grades','Opponent and line-specific grades'],['Rushing Matchups','Backfield usage and front-seven defense'],['Receiving Matchups','Coverage and target volume']]}
};
/* Publicly visible NFL cheatsheet taxonomy (19 research categories).
   Category parity is navigation only until an independently sourced TSO module
   is implemented. PropFinder proprietary grades, values and data are NOT copied. */
const NFL_CHEATSHEET_CATALOG=[
 ['TD Matchups','Touchdown opportunities against opponent positional and alignment defense'],
 ['First TD','Who initiates scoring and team opening possessions'],
 ['Role Matchups','WR1/WR2, RB1/RB2 and TE roles versus defense'],
 ['Market Grades','Source-backed market strength and recent opponent evidence'],
 ['Coverage Matchups','Receiver targets against coverage scheme'],
 ['Alignment Matchups','Slot, wide and tight end deployment'],
 ['WR vs CB Matchups','Receiver and cornerback coverage assignments'],
 ['Rushing Matchups','Carry share, attempts, yards and defensive front'],
 ['Redzone Matchups','Inside-20 targets, carries and scoring opportunities'],
 ['Line Matchups','Offensive versus defensive line performance'],
 ['Hit Rate Matrix','Exact-line hit frequency by market and rolling window'],
 ['Team Share %','Team touches, targets and carries by role'],
 ['Team Defensive Stats','Opponent production allowed by position'],
 ['Coverage Matrix','Defense coverage types and observed pass outcomes'],
 ['Team Tendencies','Game script, pass rate and play selection'],
 ['Coverage Players','Player-specific route and coverage role'],
 ['Odds Discrepancies','Verified multi-book price differences for the exact selection'],
 ['Receiving Value','Reception and receiving-yard opportunity versus price'],
 ['Explosive Plays','Big plays, longest reception and rushing breakaway usage']
];
SPORTS.nfl.tools=[
 ...NFL_CHEATSHEET_CATALOG,
 ...SPORTS.nfl.tools.filter(([name])=>!NFL_CHEATSHEET_CATALOG.some(([title])=>title===name))
];
/* Verified multi-book price and actual alternate-threshold research for every
   league. Tools return unavailable when quotes cannot independently be read. */
for(const sport of Object.values(SPORTS)){
 if(!sport.tools.some(([title])=>title==='Odds Comparison'))
  sport.tools.push(['Odds Comparison','Verify prices from multiple sportsbooks at the exact same player prop']);
 if(!sport.tools.some(([title])=>title==='Alternate Lines'))
  sport.tools.push(['Alternate Lines','Only actually published alternate thresholds and price quotes']);
}
const PAGES=[['overview','Overview','layout-dashboard'],['games','Games','calendar-days'],['props','Player Props','chart-no-axes-combined'],['trends','Trends','trending-up'],['player','Player Dashboard','activity'],['cheatsheets','Cheatsheets','notebook-tabs'],['ratings','Power Ratings','gauge'],['projections','Projections','activity'],['injuries','Injuries','heart-pulse'],['data','Data Sources','database'],['saved','Saved Research','bookmark']];
/* Original inline SVG icons (Lucide-inspired line geometry), no emoji or remote icon kit.
   Built locally and reused across the six-sport navigation and research cards. */
const ICONS={
 football:'<path d="M5 19c-4-5-2-10 2-14s9-6 14-2c2 7-1 12-5 16S9 21 5 19Z"/><path d="M8 16 16 8M8 10l6 6m-3-9 6 6"/>',
 basketball:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M5 5c7 4 9 10 14 14M19 5c-7 4-9 10-14 14"/>',
 baseball:'<circle cx="12" cy="12" r="9"/><path d="M7 4c3 5 3 11 0 16m10-16c-3 5-3 11 0 16M7 8l3 2m-4 2 4 2m7-6-3 2m4 2-4 2"/>',
 hockey:'<path d="m16 3 3 2-8 12c-1 2-3 3-6 3H3v-3h3c1 0 2-.3 3-2l7-12ZM17 17h4v3h-4z"/>',
 school:'<path d="m3 10 9-6 9 6v10H3V10Z"/><path d="M9 20v-7h6v7M3 10h18M8 7h8"/>',
 'layout-dashboard':'<rect x="3" y="3" width="7" height="8" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="15" width="7" height="6" rx="1"/>',
 'calendar-days':'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18M7 14h3m4 0h3"/>',
 'chart-no-axes-combined':'<path d="M3 20h18M5 16l5-6 4 3 6-9"/><path d="M5 8v6M10 6v3M15 8v2"/>',
 'trending-up':'<path d="m3 17 7-7 4 4 7-7M15 7h6v6"/>',
 'notebook-tabs':'<rect x="5" y="3" width="16" height="18" rx="2"/><path d="M9 3v18M13 8h5M13 12h5M13 16h3"/>',
 gauge:'<path d="M4 17a9 9 0 1 1 16 0"/><path d="m12 14 4-5"/><circle cx="12" cy="14" r="1"/>',
 activity:'<path d="M2 12h5l3-7 4 14 3-7h5"/>',
 'heart-pulse':'<path d="M20 5c-2-2-5-1-8 2-3-3-6-4-8-2-3 3-2 7 8 15 10-8 11-12 8-15Z"/><path d="M3 12h5l2-3 3 6 2-3h6"/>',
 database:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0"/>',
 bookmark:'<path d="M5 4c0-1 1-2 2-2h10c1 0 2 1 2 2v18l-7-5-7 5V4Z"/>',
 star:'<path d="m12 3 2.8 6 6.5.7-4.8 4.7 1.3 6.5L12 18l-5.8 2.9 1.3-6.5-4.8-4.7 6.5-.7L12 3Z"/>',
 close:'<path d="M5 5 19 19M19 5 5 19"/>',
 refresh:'<path d="M21 12a9 9 0 0 0-16-5L3 9M3 3v6h6M3 12a9 9 0 0 0 16 5l2-2m0 6v-6h-6"/>',
 search:'<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
 chevron:'<path d="m6 9 6 6 6-6"/>',
 spark:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
 arrow:'<path d="M6 18 18 6M9 6h9v9"/>',
 check:'<path d="m4 12 5 5L20 6"/>'
};
function iconSvg(name,cls=''){
 const path=ICONS[name]||ICONS.spark;
 return '<svg class="tso-icon '+cls+'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+path+'</svg>';
}
const el=id=>document.getElementById(id);
const text=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const num=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const canon=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const clock=t=>{const d=new Date(t||'');return Number.isFinite(d.getTime())?d.toLocaleString('en-US',{timeZone:'America/Chicago',weekday:'short',hour:'numeric',minute:'2-digit'})+' CT':'Time pending'};
const pct=v=>num(v)===null?'—':Math.round(Number(v))+'%';
const signed=v=>num(v)===null?'—':(Number(v)>0?'+':'')+String(v);
const nameOf=r=>String(r.player||r.playerName||r.name||'Unnamed player');
const leagueOf=r=>String(r.sport||r.league||'').toLowerCase();
const marketOf=r=>String(r.marketLabel||r.market||r.prop||'').trim();
const lineOf=r=>num(r.line??r.point);
const bookOf=r=>String(r.book||r.sportsbook||r.bookName||'');
const gameKey=g=>String(g.id||g.gameId||'');
const rowKey=r=>[leagueOf(r),r.playerId||nameOf(r),r.team,marketOf(r),String(r.side||''),r.line,r.price,r.book].join('|');
const escapeSelector=v=>String(v||'').replace(/[^a-zA-Z0-9_-]/g,'');

function matchupTime(raw){
 const d=new Date(raw||'');
 if(!Number.isFinite(d.getTime()))return 'Time TBA';
 const weekday=new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:'America/Chicago'}).format(d);
 const day={Mon:'Mon',Tue:'Tues',Wed:'Wed',Thu:'Thurs',Fri:'Fri',Sat:'Sat',Sun:'Sun'}[weekday]||weekday;
 const when=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',hour12:true,timeZone:'America/Chicago'}).format(d).replace(/\s/g,'').toLowerCase();
 return day+' '+when;
}
function matchRowGame(row,g){
 if(!row||!g)return false;
 if(String(row.verifiedGameId||'')===gameKey(g)||String(row.gameId||row.eventId||'')===gameKey(g))return true;
 const ab=(v,t)=>Boolean(canon(v))&&[t.abbr,t.name].some(x=>Boolean(canon(x))&&canon(v)===canon(x));
 const teams=ab(row.homeTeam,g.home||{})&&ab(row.awayTeam,g.away||{});
 const start=Date.parse(row.commenceTime||''),gameTime=Date.parse(g.startTime||'');
 return teams&&(!Number.isFinite(start)||!Number.isFinite(gameTime)||Math.abs(start-gameTime)<=20*3600000);
}

const state={sport:'nfl',page:'overview',tool:null,game:null,playerId:null,playerProfile:null,playerUI:{tab:'overview',metric:null,split:'all',opponent:'',window:'l10',phase:null,lineKey:''},search:'',market:'all',book:'all',marketSelections:[],bookSelections:[],marketOpen:false,bookOpen:false,matchupIds:[],matchupOpen:false,window:'l10',sort:'signal',maxRows:40,live:null,props:null,liveError:'',propsError:'',pending:false,updated:0,selected:null,saved:new Map(),displayedRows:new Map(),firstBasketCache:new Map(),openSport:null,nbaResearch:null,nbaModels:null,nbaInjuries:null,nbaOddsSnapshot:null,nflResearch:null,nflTD:null,nflOdds:null,nflSim:null,nflInjuries:null,nflWeather:null,nflWeatherError:'',nflWeatherFetched:0,nflWeatherPending:false,nflValidation:null,nflValidationError:'',nflValidationFetched:0,nflValidationPending:false,otherOdds:{},nhlModel:null,nhlDefense:null,nhlDefenseFetched:0,nhlDefensePosition:'C',nflArchive:null,nflArchiveFetched:0,nflArchivePending:false,nflError:'',nbaError:'',nbaPending:true};
try{const saved=JSON.parse(localStorage.getItem('tso3-saved')||'[]');if(Array.isArray(saved))saved.forEach(r=>{if(r?.key)state.saved.set(r.key,r)})}catch(_){}
function remember(){try{localStorage.setItem('tso3-saved',JSON.stringify([...state.saved.values()].slice(-200)))}catch(_){}}
function getGames(){
 const now=Date.now(),maxFuture=now+9*86400000,minRecent=now-18*3600000;
 return (Array.isArray(state.live?.games)?state.live.games:[])
  .filter(g=>g.league===state.sport&&Number.isFinite(Date.parse(g.startTime||''))
   &&Date.parse(g.startTime)>=minRecent&&Date.parse(g.startTime)<=maxFuture)
  .sort((a,b)=>Date.parse(a.startTime)-Date.parse(b.startTime));
}
function getRows(){
 const now=Date.now(),startMin=now-15*60000,max=now+9*86400000;
 return (Array.isArray(state.props?.rows)?state.props.rows:[])
  .filter(r=>{
   if(leagueOf(r)!==state.sport||r.available===false||r.active===false||r.suspended===true)return false;
   if(state.sport==='nba'&&!r.verifiedGameId)return false;
   const start=Date.parse(r.commenceTime||r.startTime||r.eventStartTime||'');
   if(!Number.isFinite(start)||start<startMin||start>max)return false;
   const at=Date.parse(r.snapshotTime||r.fetchedAt||r.updatedAt||'');
   if(Number.isFinite(at)&&now-at>4*3600000)return false;
   return true;
  });
}
function exactModel(r){
 const m=r.model||{};
 if(m.exactMatch===false||m.lineMatch===false||/market.only|category.only|line.mismatch/i.test(String(m.matchType||'')))return null;
 if(!/^(over|yes|true)$/i.test(String(r.side||'')))return null;
 const p=num(m.probabilityPct);
 return p!==null&&p>=0&&p<=100&&(lineOf(r)!==null||/goal|touchdown|home run|first basket/i.test(marketOf(r)))?p:null;
}
function signalOf(r){const maybe=num(r.tsoPropSignal?.score??r.tsoSignal?.score??r.signalScore??r.signal?.score);return maybe!==null&&maybe>=0&&maybe<=100?maybe:null}
function verifiedGames(r){return Array.isArray(r.gameLog)?r.gameLog:Array.isArray(r.recentGames)?r.recentGames:[]}
function logValue(entry,r){
 const stat=entry?.stats||entry?.statistics||entry;
 if(!stat||typeof stat!=='object')return null;
 const m=canon(r.market||r.marketLabel);
 const fields={
 POINTS:['points','pts'],REBOUNDS:['rebounds','reb','totalRebounds'],ASSISTS:['assists','ast'],
 THREES:['threes','threePointersMade','threePointFieldGoalsMade'],THREEPOINTERSMADE:['threes','threePointersMade','threePointFieldGoalsMade'],
 PRA:['pra'],PASSINGYARDS:['passingYards','passYards','passing_yds'],RECEIVINGYARDS:['receivingYards','recYards'],RECEPTIONS:['receptions','rec'],
 RUSHINGYARDS:['rushingYards','rushYards'],RUSHINGATTEMPTS:['rushingAttempts','carries'],SHOTSONGOAL:['shotsOnGoal','sog'],
 HITS:['hits'],HOMERUNS:['homeRuns','hr'],TOTALBASES:['totalBases','tb'],RBI:['rbi','RBIs'],RUNS:['runs'],PITCHERSTRIKEOUTS:['strikeouts','pitcherStrikeouts'],STOLENBASES:['stolenBases','sb']
 };
 const matches=Object.keys(fields).find(k=>m.includes(k));
 if(!matches)return null;
 for(const key of fields[matches])if(num(stat[key])!==null)return num(stat[key]);
 return null;
}
function recent(r,n){
 const threshold=lineOf(r),logs=verifiedGames(r).slice(0,n);
 if(threshold===null||logs.length===0)return null;
 const values=logs.map(x=>logValue(x,r)).filter(x=>x!==null);
 if(values.length===0)return null;
 const over=values.filter(v=>v>threshold).length;
 return {n:values.length,hits:over,rate:100*over/values.length,mean:values.reduce((a,b)=>a+b,0)/values.length,values};
}
function windowRate(r){return recent(r,state.window==='season'?1000:Number(state.window.slice(1))||10)}
function eligible(r){
 const side=String(r.side||r.selection||'').toLowerCase();
 return ['over','yes','true'].includes(side)||(!side&&/(anytime goal|first goal|home run|touchdown)/i.test(marketOf(r)));
}
function filteredRows(){
 const all=getRows().filter(eligible);
 const q=state.search.trim().toLowerCase();
 let list=all.filter(r=>(!state.marketSelections.length||state.marketSelections.includes(canon(marketOf(r))))
  &&(!state.bookSelections.length||state.bookSelections.includes(canon(bookOf(r))))
  &&(!q||[nameOf(r),r.team,marketOf(r),r.homeTeam,r.awayTeam].join(' ').toLowerCase().includes(q)));
 if(state.matchupIds.length){
  const selected=new Set(state.matchupIds),games=getGames().filter(g=>selected.has(gameKey(g)));
  list=list.filter(r=>games.some(g=>matchRowGame(r,g)));
 }
 if(state.game){const g=getGames().find(x=>gameKey(x)===state.game);if(g)list=list.filter(r=>String(r.verifiedGameId||'')===gameKey(g)||String(r.gameId||r.eventId||'')===gameKey(g)
  ||(canon(r.homeTeam)===canon(g.home?.abbr)&&canon(r.awayTeam)===canon(g.away?.abbr))
  ||([g.home?.abbr,g.away?.abbr].map(canon).includes(canon(r.team))&&(!r.commenceTime||Math.abs(Date.parse(r.commenceTime)-Date.parse(g.startTime))<6*3600000))); }
 list.sort((a,b)=>{
  if(state.sort==='name')return nameOf(a).localeCompare(nameOf(b));
  if(state.sort==='price')return (num(b.price)??-999999)-(num(a.price)??-999999);
  if(state.sort==='hitRate')return (windowRate(b)?.rate??-1)-(windowRate(a)?.rate??-1);
  return (signalOf(b)??exactModel(b)??-1)-(signalOf(a)??exactModel(a)??-1);
 });
 return list;
}
function menuToolSlug(label){return String(label).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function renderSportMenu(){
 const root=el('sportMenu'),sport=state.openSport;
 if(!sport||!SPORTS[sport]){root.hidden=true;root.innerHTML='';return}
 const data=SPORTS[sport];
 const navLinks=(pages)=>pages.map(id=>{
  const page=PAGES.find(p=>p[0]===id);
  if(!page)return '';
  const selected=sport===state.sport&&state.page===id&&!state.tool;
  return '<a class="menu-link '+(selected?'selected':'')+'" href="#/'+sport+'/'+id+'" data-menu-nav="'+sport+'" data-menu-page="'+id+'"><span class="menu-link-icon">'+iconSvg(page[2])+'</span><span>'+text(page[1])+'</span>'+(selected?'<span class="menu-current">CURRENT</span>':'')+'</a>';
 }).join('');
 const toolLinks=data.tools.map(([name,description])=>{
  const slug=menuToolSlug(name),selected=sport===state.sport&&state.page==='cheatsheets'&&state.tool===slug;
  return '<a class="menu-tool-link '+(selected?'selected':'')+'" href="#/'+sport+'/cheatsheets/'+slug+'" data-menu-nav="'+sport+'" data-menu-tool="'+slug+'"><b>'+text(name)+'</b><small>'+text(description)+'</small></a>';
 }).join('');
 root.innerHTML='<div class="sport-menu-head"><span class="sport-menu-heading"><span class="menu-sport-icon">'+iconSvg(data.icon)+'</span><span><strong>'+text(data.name)+'</strong><small>Choose a section or jump straight into a research tool</small></span></span><button type="button" data-close-sport-menu aria-label="Close '+data.label+' menu">'+iconSvg('close')+'</button></div>'
  +'<div class="sport-menu-grid"><section class="sport-menu-column"><h3>RESEARCH</h3>'+navLinks(['overview','games','props','trends','player','cheatsheets'])+'</section>'
  +'<section class="sport-menu-column"><h3>ANALYTICS</h3>'+navLinks(['ratings','projections','injuries','data','saved'])+'</section>'
  +'<section class="sport-menu-column sport-menu-specialty"><h3>'+data.label+' SPECIALTY TOOLS <span>'+data.tools.length+'</span></h3><div class="menu-tools">'+toolLinks+'</div></section></div>';
 root.hidden=false;
}
function closeSportMenu(){
 if(state.openSport!==null){state.openSport=null;renderSportNav();renderSportMenu()}
}
function renderSportNav(){
 el('sportNav').innerHTML=Object.entries(SPORTS).map(([k,v])=>{
  const open=state.openSport===k,active=state.sport===k;
  return '<button type="button" class="sport-button '+(active?'active ':'')+(open?'open':'')+'" data-sport-toggle="'+k+'" aria-expanded="'+open+'" aria-controls="sportMenu" aria-haspopup="true"><span class="sport-emoji" aria-hidden="true">'+iconSvg(v.icon)+'</span><span>'+v.label+'</span><span class="sport-chevron" aria-hidden="true">'+iconSvg('chevron')+'</span></button>';
 }).join('');
}
function renderNav(){
 renderSportNav();renderSportMenu();
 el('crumbSport').textContent=state.sport.toUpperCase();
 el('crumbPage').textContent=PAGES.find(x=>x[0]===state.page)?.[1]||'Overview';
 el('heroKicker').textContent='TSO INTELLIGENCE · '+SPORTS[state.sport].name.toUpperCase();
 el('heroTitle').textContent=state.page==='overview'?'Know the matchup. Own the decision.':(PAGES.find(x=>x[0]===state.page)?.[1]||'Research')+' / '+state.sport.toUpperCase();
 el('heroDescription').textContent=state.page==='overview'?'One research workspace. Lines, matchups, player trends and verified evidence without the tab overload.':SPORTS[state.sport].name+' research with consistent filters, matchup context and transparent data availability.';
 el('heroWatermark').textContent=state.sport.toUpperCase();
 const source=state.live?.tso3?.sources?.[state.sport]||'';
 const when=Date.parse(state.live?.tso3?.scoreboardFetchedAt||state.live?.nbaScoreboard?.fetchedAt||'');
 const fresh=Number.isFinite(when)&&Date.now()-when<=10*60000;
 const ready=(source==='ESPN verified scoreboard'||(state.sport==='nba'&&state.live?.nbaScoreboard?.status==='verified'))&&fresh;
 const asOf=Number.isFinite(when)?new Date(when).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'}):'unknown';
 el('heroState').textContent=ready?'● OFFICIAL '+state.sport.toUpperCase()+' SCOREBOARD · '+asOf+' CT':'◦ '+state.sport.toUpperCase()+' SCHEDULE NOT VERIFIED';
 el('heroState').classList.toggle('ok',ready);
 el('sourceLight').classList.toggle('ok',ready);
 el('feedStatus').textContent=ready?'ESPN checked '+asOf+' CT':'Scoreboard unavailable or out of date';
 el('savedCount').textContent=state.saved.size;
 el('todayLabel').textContent=new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'});
}
function renderMetrics(){
 const games=getGames(),rows=getRows().filter(eligible),exact=rows.filter(r=>exactModel(r)!==null).length,priced=rows.filter(r=>num(r.price)!==null).length;
 const fromESPN=state.live?.tso3?.sources?.[state.sport]==='ESPN verified scoreboard'||(state.sport==='nba'&&state.live?.nbaScoreboard?.status==='verified');
 const stats=[['Current games',fromESPN?games.length:'—',fromESPN?'Official ESPN slate':'No verified current schedule'],
 ['Pregame Over / Yes',rows.length,'Only active, dated selections'],
 ['Exact model matches',exact,'Same player, market, side, and line'],
 ['Verified book prices',priced,state.sport==='nba'?(state.nbaOddsSnapshot?'Quote snapshot '+new Date(state.nbaOddsSnapshot).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'})+' CT':'No fresh cross-verified quotes'):'Quotes requiring timestamp check']];
 el('quickStatus').innerHTML=stats.map(x=>'<div class="metric-card"><span>'+text(x[0])+'</span><strong>'+text(x[1])+'</strong><em>'+text(x[2])+'</em></div>').join('');
}
function globalMatchupMarkup(){
 const games=getGames().filter(g=>g?.id&&g?.home&&g?.away).sort((a,b)=>Date.parse(a.startTime||0)-Date.parse(b.startTime||0));
 const ids=new Set(games.map(g=>gameKey(g)));
 state.matchupIds=state.matchupIds.filter(id=>ids.has(id));
 return '<div class="matchup-filter global-picker"><span class="matchup-label">MATCHUPS</span>'
  +'<details class="matchup-picker" data-global-matchup-picker '+(state.matchupOpen?'open':'')+'>'
  +'<summary class="matchup-trigger"><span class="matchup-trigger-text">'+(state.matchupIds.length?'Selected games ('+state.matchupIds.length+')':'All Matchups')+'</span><span class="matchup-chevron">⌄</span></summary>'
  +'<div class="matchup-options" role="group" aria-label="Filter by one or more games">'
  +'<label class="matchup-option all"><input type="checkbox" data-global-matchup-check="all" '+(!state.matchupIds.length?'checked':'')+'><span>All Matchups</span></label>'
  +(games.length?games.map(g=>'<label class="matchup-option"><input type="checkbox" data-global-matchup-check="'+text(gameKey(g))+'" '+(state.matchupIds.includes(gameKey(g))?'checked':'')+'><span class="matchup-name">'+text(g.away?.abbr||'AWAY')+' @ '+text(g.home?.abbr||'HOME')+'</span><span class="matchup-time">'+text(matchupTime(g.startTime))+'</span></label>').join(''):'<p class="matchup-empty">No games in current slate</p>')
  +'</div></details></div>';
}
function renderFilters(){
 const rows=getRows().filter(eligible);
 const unique=(vals)=>[...new Set(vals.filter(Boolean))].sort((a,b)=>a.localeCompare(b));
 const mk=unique(rows.map(r=>marketOf(r)));const books=unique(rows.map(bookOf));
 const marketIds=new Set(mk.map(canon)),bookIds=new Set(books.map(canon));
 state.marketSelections=state.marketSelections.filter(k=>marketIds.has(k));
 state.bookSelections=state.bookSelections.filter(k=>bookIds.has(k));
 const buildMulti=(label,choices,selected,kind,open)=>{
  const selectedCount=selected.length,caption=selectedCount?selectedCount+' selected':'All '+label;
  return '<details class="matchup-picker tso-option-picker" '+(open?'open':'')+' data-tso-picker="'+kind+'">'
   +'<summary class="matchup-trigger"><span>'+text(caption)+'</span><span class="matchup-chevron">'+iconSvg('chevron')+'</span></summary>'
   +'<div class="matchup-options" role="group" aria-label="Select multiple '+label+'">'
   +'<label class="matchup-option all"><input type="checkbox" data-tso-check="'+kind+'" value="all" '+(!selectedCount?'checked':'')+'><span>All '+label+'</span></label>'
   +(choices.length?choices.map(x=>'<label class="matchup-option"><input type="checkbox" data-tso-check="'+kind+'" value="'+text(canon(x))+'" '+(selected.includes(canon(x))?'checked':'')+'><span>'+text(x)+'</span></label>').join(''):'<p class="matchup-empty">No current verified '+label+'</p>')
   +'</div></details>';
 };
 el('marketPicker').innerHTML=buildMulti('Markets',mk,state.marketSelections,'markets',state.marketOpen);
 el('bookPicker').innerHTML=buildMulti('Sportsbooks',books,state.bookSelections,'books',state.bookOpen);
 el('window').value=state.window;el('sort').value=state.sort;el('search').value=state.search;
 el('globalMatchups').innerHTML=globalMatchupMarkup();
 // render() owns visibility so navigation never inherits a hidden filter.
}
function section(title,subtitle){return '<div class="section-heading"><h2>'+text(title)+'</h2><small>'+text(subtitle||'')+'</small></div>'}
function empty(title,body){return '<div class="empty"><span class="empty-symbol">'+iconSvg('database')+'</span><h3>'+text(title)+'</h3><p>'+text(body)+'</p></div>'}
function gamesMarkup(limit){
 const games=getGames();
 if(!state.live)return empty('Games feed not connected',state.liveError||'TSO scoreboard is not accessible from this preview.');
 if(!games.length)return empty('No current games in this feed','No verified games for the current '+state.sport.toUpperCase()+' slate were returned. Historical fixtures are excluded.');
 return '<div class="card-grid">'+games.slice(0,limit||99).map(g=>{
  const away=g.away||{},home=g.home||{},logo=t=>/^https:\/\//i.test(t.logo||'')?'<img src="'+text(t.logo)+'" alt="" loading="lazy">':'<b>'+text(t.abbr||'—')+'</b>';
  return '<button class="game-card" type="button" data-game="'+text(gameKey(g))+'"><div class="game-meta"><span>'+text(state.sport.toUpperCase())+' · '+text(g.state==='post'?'FINAL':g.state==='in'?'LIVE':'UPCOMING')+'</span><span>'+text(clock(g.startTime))+'</span></div>'
   +'<div class="game-matchup"><div class="game-side">'+logo(away)+'<b>'+text(away.abbr||'—')+'</b><small>AWAY</small></div><span>AT</span><div class="game-side">'+logo(home)+'<b>'+text(home.abbr||'—')+'</b><small>HOME</small></div></div>'
   +'<div class="game-bottom"><span>'+text(g.state==='post'||g.state==='in'?[g.away?.score,g.home?.score].filter(x=>x!==null&&x!==undefined).join(' – ')||g.venue||'MATCHUP DETAILS':g.venue||'MATCHUP DETAILS')+'</span><span>EXPLORE ↗</span></div></button>'
 }).join('')+'</div>';
}
function rowMarkup(r,i){
 const sr=signalOf(r),wr=windowRate(r),m=exactModel(r);
 const saved=state.saved.has(rowKey(r));
 return '<tr data-row-key="'+text(rowKey(r))+'"><td><strong>'+text(nameOf(r))+'</strong><small>'+text(r.team||'—')+' · '+text(r.position||state.sport.toUpperCase())+'</small></td>'
  +'<td><strong>'+text(marketOf(r)||'—')+'</strong><small>'+text((r.side||'Over').toUpperCase())+' '+text(lineOf(r)===null?'':lineOf(r))+'</small></td>'
  +'<td><span class="signal"><span class="signal-track"><i style="width:'+(sr===null?0:sr)+'%"></i></span><span>'+(sr===null?'—':Math.round(sr))+'</span></span></td>'
  +'<td><span class="rate-chip '+(wr?'':'pending')+'">'+(wr?Math.round(wr.rate)+'%':'—')+'</span><small>'+(wr?wr.hits+'/'+wr.n+' OBSERVED':'NO VERIFIED LOG')+'</small></td>'
  +'<td class="orange">'+pct(m)+'</td>'
  +'<td><strong>'+text(signed(r.price))+'</strong><small>'+text(bookOf(r)||'BOOK NOT LISTED')+'</small></td>'
  +'<td><button class="save-row '+(saved?'active':'')+'" type="button" aria-label="'+(saved?'Remove saved prop':'Save prop')+'" data-save="'+i+'">'+iconSvg('star',saved?'filled':'')+'</button></td></tr>';
}
function tableMarkup(list,limit=state.maxRows){
 const visible=list.slice(0,limit);
 visible.forEach(r=>state.displayedRows.set(rowKey(r),r));
 if(!state.props)return empty('Props feed not connected',state.propsError||'No accessible verified prop source yet.');
 if(!list.length)return empty('No matching verified props','Change the sport, market or player filter. We do not manufacture missing selections.');
 return '<div class="table-shell"><div class="table-scroller"><table class="data-table"><thead><tr><th>PLAYER / TEAM</th><th>MARKET & EXACT LINE</th><th>TSO SIGNAL</th><th>'+text(state.window.toUpperCase())+' HIT RATE</th><th>MODEL %</th><th>BEST OBSERVED QUOTE</th><th>SAVE</th></tr></thead>'
  +'<tbody>'+visible.map((r,i)=>rowMarkup(r,i)).join('')+'</tbody></table></div><div class="table-footer"><span>'+visible.length+' / '+list.length+' current qualifying selections · Over / Yes only · dash = not verified</span>'
  +(list.length>limit?'<button data-more="rows" type="button">Show more →</button>':'')+'</div></div>';
}
function toolCard(pair,i){
 const code=String(pair[0]).toLowerCase().replace(/[^a-z0-9]+/g,'-');
 const ready=toolReady(pair[0]);
 return '<button class="tool-card" type="button" data-tool="'+text(code)+'"><div class="tool-top"><span class="tool-icon">'+iconSvg(['spark','trending-up','notebook-tabs','gauge','database','activity'][i%6])+'</span><div><h3>'+text(pair[0])+'</h3><p>'+text(pair[1])+'</p></div></div><footer><span class="tool-tag '+(ready?'':'pending')+'">'+(ready?'DATA VIEW AVAILABLE':'DATA INTEGRATION REQUIRED')+'</span><span class="arrow">↗</span></footer></button>';
}
function toolReady(name){
 const rows=getRows().filter(eligible);
 if(name==='Odds Comparison'||name==='Odds Discrepancies'){
  const seen=new Map();
  for(const r of rows){
   if(lineOf(r)===null||num(r.price)===null)continue;
   const k=[r.verifiedGameId||r.gameId||r.eventId,canon(nameOf(r)),canon(r.market),lineOf(r),canon(r.side)].join('|');
   const books=seen.get(k)||new Set();if(bookOf(r))books.add(bookOf(r));seen.set(k,books);
  }
  return [...seen.values()].some(set=>set.size>=2);
 }
 if(name==='Alternate Lines'){
  const seen=new Map();
  for(const r of rows){
   const k=[r.verifiedGameId||r.gameId||r.eventId,canon(nameOf(r)),canon(r.market)].join('|');
   const lines=seen.get(k)||new Set();if(lineOf(r)!==null)lines.add(lineOf(r));seen.set(k,lines);
  }
  return [...seen.values()].some(set=>set.size>=2);
 }
 if(state.sport==='nfl'){
  if(name==='Model Validation')return Boolean(state.nflArchive?.available);
  if(name==='Touchdown Opportunities')return Boolean(state.nflTD?.games?.length);
  if(name==='Game Projections'||name==='Power Ratings')return Boolean(state.nflSim?.games?.length);
  if(window.TSO3NflLab?.tools?.includes(menuToolSlug(name)))return Boolean(state.nflResearch?.players?.length);
  if(name==='Hit Rate Matrix')return rows.some(r=>verifiedGames(r).length>=5);
 }
 if(state.sport==='nba'){
  if(name==='Injury Impact')return Boolean(state.nbaInjuries?.entries?.length);
  if(name==='First Basket')return Boolean(getGames().length);
  if(['Player Form','Matchup vs Position','Pace & Possessions','Minutes & Rotation',
   'Usage & Touches','Team Stats'].includes(name))return Boolean(state.nbaResearch?.players?.length);
  if(name==='Game Projections')return Boolean(state.nbaModels?.models?.length);
 }
 if(state.sport==='nhl'){
  if(['Team Statistics','Defense Vs Position','Shots on Goal','Goal Scorer Matchups'].includes(name))return Boolean(state.nhlDefense?.available);
  if(name==='First Goal'||name==='Goal Scorer Matchups')return Boolean(state.nhlModel?.games?.length);
  if(name==='Shots on Goal')return rows.some(r=>canon(r.market)==='SOG');
 }
 if(name==='Player Trends'||name==='Player Form'||name==='Skater Statistics')
  return rows.some(r=>verifiedGames(r).length>=5);
 // Odds alone do not certify a proprietary DvP, park, coverage, projection,
 // ratings, play-by-play, usage or injury analysis.
 return false;
}

function overview(){
 const t=SPORTS[state.sport];
 return section('Explore '+t.label+' intelligence','Research modules grouped by the question they answer')
  +'<div class="card-grid">'+t.tools.slice(0,6).map(toolCard).join('')+'</div>'
  +section('Upcoming games','Click once to open matchup research')
  +gamesMarkup(3)
  +section('Current player props','Verified lines, not hypothetical picks')
  +tableMarkup(filteredRows(),8);
}
/* Official matchup rosters make player research available without bookmaker
   prices. Cached by matchup, but never treated as verified starters/lineups. */
const gameRostersCache=new Map();
const gameRostersPlayers=new Map();
async function hydrateGameRosters(game){
 const elSlot=el('gameRosterSlot'),league=state.sport,key=league+':'+String(game.id);
 if(!elSlot)return;
 let saved=gameRostersCache.get(key);
 if(!saved||Date.now()-saved.checkedAt>5*60000){
  try{
   const response=await fetch('/api/game-roster?'+new URLSearchParams({league,gameId:String(game.id)}),{cache:'default'});
   const doc=await response.json();
   saved={checkedAt:Date.now(),doc:response.ok?doc:{available:false,reason:doc?.reason||'Official rosters unavailable'}};
  }catch(_){saved={checkedAt:Date.now(),doc:{available:false,reason:'ESPN official team roster could not be loaded'}}}
  gameRostersCache.set(key,saved);
 }
 if(state.page!=='games'||state.sport!==league||state.game!==gameKey(game)||!el('gameRosterSlot'))return;
 const doc=saved.doc;
 if(!doc?.available){
  el('gameRosterSlot').innerHTML='<p class="page-note">'+text(doc?.reason||'Official rosters unavailable')+'</p>';return;
 }
 const cards=(doc.teams||[]).map((team,i)=>{
  if(!team.available)return '<section class="tso-roster-team"><h4>'+text(team.name||team.abbr||'Team')+'</h4><p class="page-note">'+text(team.reason||'Official team roster unavailable')+'</p></section>';
  const players=(team.players||[]).slice().sort((a,b)=>String(a.position||'').localeCompare(String(b.position||''))||a.name.localeCompare(b.name));
  const entries=players.map((p,i)=>{
   const ref=key+':'+String(p.id);
   gameRostersPlayers.set(ref,{...p,sport:league,team:team.abbr,verifiedGameId:String(game.id),espnRosterVerified:true});
   return '<button type="button" class="tso-roster-player" data-roster-player="'+text(ref)+'" aria-label="View official game history for '+text(p.name)+'">'
    +'<span>'+text(p.name)+'</span><small>'+text(p.position||'—')+'</small></button>';
  });
  return '<section class="tso-roster-team"><h4>'+text(team.name||team.abbr||'Team')+' <small>'+players.length+' listed</small></h4>'
   +'<div class="tso-roster-players">'+entries.slice(0,12).join('')+'</div>'
   +(entries.length>12?'<details class="tso-roster-more"><summary>Show '+(entries.length-12)+' additional team players</summary>'
    +'<div class="tso-roster-players">'+entries.slice(12).join('')+'</div></details>':'')+'</section>';
 }).join('');
 el('gameRosterSlot').innerHTML='<div class="tso-game-rosters">'+cards+'</div>'
  +'<p class="nba-footnote">ESPN official current team rosters; membership does not confirm starting lineups or player availability. Select a player for independently recorded ESPN game logs even if no sportsbook price is listed.</p>';
}
function openOfficialRosterPlayer(player){
 const row={sport:state.sport,playerId:String(player.id),player:player.name,name:player.name,
  team:player.team,verifiedGameId:player.verifiedGameId};
 state.selected=row;
 el('drawerBody').innerHTML='<div class="drawer-contents"><span class="eyebrow">ESPN · OFFICIAL ROSTER RESEARCH</span>'
  +'<h2>'+text(player.name)+'</h2><p class="subtitle">'+text(player.team||'')+' · '+text(player.position||'Player')+'</p>'
  +'<p class="page-note">This player profile uses actual game logs and season totals. There is no implied sportsbook price, projected hit probability, or confirmed starting role.</p>'
  +'<h3>TSO NHL game and opponent research</h3>'+(state.sport==='nhl'?'<div id="nhlResearchSlot" class="tso-depth">Loading verified NHL matchups…</div>':'')+'<h3>Recorded player statistics</h3><div id="athleteDepthSlot" class="tso-depth"><p class="page-note">Retrieving official ESPN player history…</p></div></div>';
 el('drawer').hidden=false;el('scrim').hidden=false;
 el('closeDrawer').focus();
 void hydrateAthleteDepth(row);
 if(state.sport==='nhl')void hydrateNhlPlayerResearch(row);
}
/* Full-size research destination across all six sports.
   A shareable ESPN player ID is required; name-only sportsbook rows must pass
   the existing verified two-team roster identity lookup before navigation. */
const playerDirectory=new Map();
let playerResearchNonce=0;
function playerDashboardKey(sport,id){return sport+':'+String(id)}
function captureDashboardPlayer(row){
 const id=String(row?.verifiedAthleteId||row?.playerId||row?.id||'');
 if(!/^\d{3,12}$/.test(id))return null;
 const key=playerDashboardKey(state.sport,id);
 const person={...row,playerId:id,verifiedAthleteId:id,
  name:row.name||row.player||null,team:row.team||null};
 playerDirectory.set(key,person);
 return person;
}
async function openFullPlayerDashboard(row){
 if(!row)return;
 // Numeric IDs supplied by a sportsbook are not assumed to be ESPN IDs.
 // Only a proven official roster selection or an already verified ESPN player
 // identity can bypass the exact two-team roster matcher.
 let profile=row.espnRosterVerified===true||/^\d{3,12}$/.test(String(row.verifiedAthleteId||''))
  ?captureDashboardPlayer(row):null;
 if(!profile){
  const event=String(row.verifiedGameId||''),player=nameOf(row);
  if(!/^\d{6,14}$/.test(event)||!player){
   if(!el('drawer').hidden){
    const place=el('drawerBody');place.insertAdjacentHTML('beforeend','<p class="page-note">A verified ESPN player identity is required for the full dashboard. Open an official matchup roster to identify this athlete.</p>');
   }
   return;
  }
  const league=state.sport;
  try{
   const r=await fetch('/api/athlete-identity?'+new URLSearchParams({league,gameId:event,player}),{cache:'default'});
   const doc=await r.json();
   if(!r.ok||!doc.available||!/^\d{3,12}$/.test(String(doc.athleteId||'')))throw Error('Official roster identity not verified');
   profile=captureDashboardPlayer({...row,playerId:doc.athleteId,verifiedAthleteId:doc.athleteId,
    name:doc.athleteName||player,team:doc.teamAbbr||row.team,position:doc.position||row.position});
  }catch(_){
   if(!el('drawer').hidden)el('drawerBody').insertAdjacentHTML('beforeend',
    '<p class="page-note">No unique official ESPN player match was returned. The full dashboard cannot safely attach unverified player history.</p>');
   return;
  }
 }
 const destination='#/'+state.sport+'/player/'+profile.playerId;
 state.playerProfile=profile;
 if(location.hash===destination)route(state.sport,'player',null,profile.playerId);
 else{location.hash=destination;onHash();}
}
function dashboardSelectedPlayer(){
 if(!state.playerId)return null;
 const k=playerDashboardKey(state.sport,state.playerId);
 return playerDirectory.get(k)||state.playerProfile&&String(state.playerProfile.playerId)===String(state.playerId)?playerDirectory.get(k)||state.playerProfile:null;
}
function pageFullPlayerDashboard(){
 const player=dashboardSelectedPlayer();
 if(!state.playerId){
  const found=new Map();
  for(const r of getRows().filter(eligible)){
   if(r.espnRosterVerified!==true&&!/^\d{3,12}$/.test(String(r.verifiedAthleteId||'')))continue;
   const p=captureDashboardPlayer(r);if(p)found.set(p.playerId,p);
  }
  for(const p of gameRostersPlayers.values())if(p.sport===state.sport){
   const added=captureDashboardPlayer({...p,player:p.name});if(added)found.set(added.playerId,added);
  }
  return section('Full Player Dashboards','Verified official athlete identity, game logs, splits, matchup context, current sportsbook prices and TSO model provenance')
   +(found.size?'<div class="tso-pd-directory">'+[...found.values()].slice(0,150).map(p=>
    '<button type="button" data-pd-open-id="'+text(p.playerId)+'"><strong>'+text(p.name||p.player||'ESPN player #'+p.playerId)+'</strong>'
    +'<small>'+text(p.team||'Team pending')+' · ESPN #'+text(p.playerId)+'</small></button>').join('')+'</div>':
    '<div class="tso-pd-pending">No athlete IDs are verified in this sports current published props. Open <a href="#/'+state.sport+'/games">Games</a>, select a verified matchup, and choose a player from the official roster.</div>');
 }
 return '<div id="fullPlayerDashboardSlot" data-athlete-id="'+text(state.playerId)+'">'
  +'<div class="tso-pd-loading"><span class="eyebrow">'+text(state.sport.toUpperCase())+' · FULL PLAYER DASHBOARD</span>'
  +'<h2>'+text(player?.name||player?.player||'ESPN Athlete #'+state.playerId)+'</h2>'
  +'<p>Connecting verified season game logs, opponent and venue splits, matchup evidence, and current sportsbook lines…</p></div></div>';
}
async function hydrateFullPlayerDashboard(){
 if(state.page!=='player'||!state.playerId)return;
 const id=String(state.playerId),sport=state.sport,nonce=++playerResearchNonce;
 const container=el('fullPlayerDashboardSlot'),renderer=window.TSO3PlayerDashboard;
 if(!container)return;
 if(!renderer){container.innerHTML='<p class="page-note">Player dashboard module unavailable. Refresh the preview.</p>';return}
 const season=ATHLETE_SEASON[sport]||2026,key=sport+':'+id+':'+season,player=dashboardSelectedPlayer()||{playerId:id};
 let doc=athleteDepthCache.get(key);
 if(!doc){
  try{
   const r=await fetch('/api/athlete-depth?'+new URLSearchParams({league:sport,playerId:id,season:String(season)}),{cache:'default'});
   doc=await r.json();
   if(!r.ok||!doc?.available)doc={available:false,athleteId:id,season,reason:doc?.reason||'Official ESPN player game logs and season statistics unavailable'};
  }catch(_){doc={available:false,athleteId:id,season,reason:'Official ESPN athlete feed unavailable'}}
  athleteDepthCache.set(key,doc);
 }
 if(nonce!==playerResearchNonce||state.page!=='player'||state.playerId!==id||state.sport!==sport||!el('fullPlayerDashboardSlot'))return;
 if(doc.athleteName&&player.name&&canon(doc.athleteName)!==canon(player.name)){
  el('fullPlayerDashboardSlot').innerHTML='<p class="page-note">Official ESPN identity mismatch; no different player game logs were attached. Check the player roster.</p>';return;
 }
 // Retain the originating exact market when opening a dashboard from a
 // verified sportsbook prop; do not default to unrelated alphabetic stat.
 if(!state.playerUI.metric&&player.market&&doc?.available){
  const statNames=renderer.statList(doc);
  const matched=statNames.find(x=>renderer.marketStatMatches(player.market,x.key));
  if(matched)state.playerUI.metric=matched.key;
 }
 const quotes=getRows().filter(q=>{
  const sameId=String(q.playerId||'')===id;
  const verifiedName=player.name&&canon(nameOf(q))===canon(player.name);
  const sameGame=!player.verifiedGameId||String(q.verifiedGameId||'')===String(player.verifiedGameId);
  return (sameId||verifiedName&&sameGame)&&(!player.team||!q.team||canon(q.team)===canon(player.team));
 });
 const game=getGames().find(g=>player.verifiedGameId&&String(g.id)===String(player.verifiedGameId))||null;
 if(!state.playerUI.lineKey&&player.market&&player.line!==undefined&&player.line!==null){
  const selected=quotes.find(q=>renderer.marketStatMatches(q.market,state.playerUI.metric)
    &&Number(q.line)===Number(player.line));
  if(selected)state.playerUI.lineKey=String(selected.market||'').toUpperCase()
    .replace(/[^A-Z0-9]/g,'')+':'+Number(selected.line);
 }
 let nhlMatchup=null;
 if(sport==='nhl'&&game&&/^\d{6,14}$/.test(String(game.id))){
  const sourceKey=String(game.id)+':'+id,saved=nhlDetailedCache.get(sourceKey);
  if(saved&&Date.now()-saved.at<10*60000)nhlMatchup=saved.doc;
  else{
   try{
    const res=await fetch('/api/nhl-player-research?'+new URLSearchParams({
     gameId:String(game.id),playerId:id}),{cache:'default'});
    const body=await res.json();
    nhlMatchup=res.ok&&body?.available&&body?.gameId===String(game.id)
      &&body?.athleteId===id?body:null;
   }catch(_){nhlMatchup=null}
   nhlDetailedCache.set(sourceKey,{at:Date.now(),doc:nhlMatchup});
  }
 }
 if(nonce!==playerResearchNonce||state.page!=='player'||state.playerId!==id||state.sport!==sport
   ||!el('fullPlayerDashboardSlot'))return;
 el('fullPlayerDashboardSlot').innerHTML=renderer.render({
  sport,doc,player,game,odds:quotes,nhlMatchup,ui:state.playerUI});
}
function refreshFullPlayerDashboard(){
 if(state.page==='player'&&state.playerId)void hydrateFullPlayerDashboard();
}
function pageGames(){
 if(state.game){
  const g=getGames().find(g=>gameKey(g)===state.game);
  if(!g){state.game=null;return gamesMarkup()}
  const rows=filteredRows();
  return '<button class="btn subtle" data-back="game" type="button">← ALL GAMES</button>'
   +section(text(g.away?.abbr||'AWAY')+' @ '+text(g.home?.abbr||'HOME'),clock(g.startTime))
   +'<div class="tool-panel"><h3>Matchup Intelligence</h3><p>Verified TSO game context, available sportsbook selections and player research for this exact matchup.</p>'
   +'<div class="data-preview"><div><span>GAME STATE</span><b>'+text(g.state||'—')+'</b></div><div><span>AWAY</span><b>'+text(g.away?.record||'—')+'</b></div><div><span>HOME</span><b>'+text(g.home?.record||'—')+'</b></div><div><span>MATCHED PROPS</span><b>'+rows.length+'</b></div></div>'
   +'<p class="explain">Game projections, defense-vs-position and verified advanced matchup grades will appear when the corresponding TSO source is connected. No opposing team stats are mirrored or inferred.</p></div>'
   +'<section class="tool-panel"><h3>Official Game Box Score</h3><p>Live ESPN game totals and player statistics, refreshed while the page is open.</p><div id="liveGameStats" data-game="'+text(state.sport+':'+gameKey(g))+'">Retrieving current game stats…</div></section>'
   +(state.sport==='nba'?'<section class="tool-panel fb-inline"><h3>First Basket / Opening Tip</h3><p>Verified recent tip wins, first made field goals and current-roster player participation. Observed history, not a calibrated betting probability.</p><div id="fbDetail">Retrieving verified NBA opening-event history…</div></section>':'')
   +'<section class="tool-panel"><h3>Official team rosters & player game logs</h3>'
   +'<p>Team players and independently recorded season stats remain accessible even if sportsbook data is stale or missing. This is not a verified starting lineup.</p>'
   +'<div id="gameRosterSlot">Retrieving ESPN official team rosters…</div></section>'
   +section('Player selections for this game','Exact matches only')+tableMarkup(rows);
 }
 return section('Game slate','Select any matchup; all sports share one interaction pattern')+gamesMarkup();
}
function toolDetail(){
 const found=SPORTS[state.sport].tools.find(x=>String(x[0]).toLowerCase().replace(/[^a-z0-9]+/g,'-')===state.tool);
 if(!found){state.tool=null;return pageTools()}
 const ready=toolReady(found[0]);
 if(state.sport==='nhl'&&['Team Statistics','Defense Vs Position','Shots on Goal','Goal Scorer Matchups'].includes(found[0])){
  return '<button type="button" class="btn subtle" data-back="tool">Back to NHL cheatsheets</button>'
   +section(found[0],'ESPN-derived actual shots and goals allowed; position and venue splits with verified game samples')
   +'<div id="nhlDefenseSlot" class="tool-panel">Loading TSO official NHL opponent-defense data…</div>';
 }
 if(found[0]==='Alternate Lines')return alternateLinesResearch();
 if(found[0]==='Odds Comparison'||found[0]==='Odds Discrepancies')return oddsDiscrepancyResearch();
 if(found[0]==='Hit Rate Matrix')return pageTrends();
 if(state.sport==='nfl'&&window.TSO3NflLab?.tools?.includes(state.tool))return nflResearch(state.tool);
 if(state.sport==='nba'&&['Player Form','Matchup vs Position'].includes(found[0])){
  const lab=window.TSO3NbaLab;
  const ctx={sport:state.sport,tool:state.tool,games:state.live?.games||[],props:state.props,models:state.nbaModels,research:state.nbaResearch,oddsSnapshot:state.nbaOddsSnapshot,error:state.nbaPending?'Retrieving verified player data…':state.nbaError};
  return lab?'<div id="nbaLabSlot">'+lab.render(ctx,state.tool)+'</div>':empty('NBA research module unavailable','The NBA analytics script did not load. Refresh the preview.');
 }
 if(state.sport==='nba'&&window.TSO3NbaDepth?.tools?.includes(state.tool)){
  const depth=window.TSO3NbaDepth;
  const ctx={sport:'nba',games:state.live?.games||[],research:state.nbaResearch,injuries:state.nbaInjuries,models:state.nbaModels,props:state.props};
  return '<div id="nbaDepthSlot">'+depth.render(ctx,state.tool)+'</div>';
 }
 if(state.sport==='nba'&&found[0]==='First Basket')return '<button type="button" class="btn subtle" data-back="tool">← ALL CHEATSHEETS</button>'+section('First Basket / Opening Tip','Select an NBA matchup for official play-by-play research')+gamesMarkup();
 return '<button type="button" class="btn subtle" data-back="tool">← ALL CHEATSHEETS</button>'
  +section(found[0],found[1])
  +'<section class="tool-panel"><h3>Research Source Status</h3>'
  +'<p>'+ (ready?'This module can currently show relevant records from existing TSO feeds. Advanced statistical depth will only appear as sources are verified.':'The dedicated data required for this tool is not currently connected. The screen is preserved as a documented research requirement, rather than filling it with made-up rankings.')+'</p>'
  +'<div class="detail-tags"><span class="tag '+(ready?'verified':'pending')+'">'+(ready?'CONNECTED BASE FEED':'SPECIALIZED FEED PENDING')+'</span><span class="tag">NFL · NBA · MLB · NHL · WNBA · CFB platform</span><span class="tag">SOURCE REQUIRED FOR ALL ADVANCED STATS</span></div></section>'
  +(ready?section('Relevant current selections','Only verified feeds')+tableMarkup(filteredRows()):empty('Data connection still needed','See the build audit for the precise data source and validation requirements. This is not a completed analytics report.'));
}
function pageTools(){return state.tool?toolDetail():section('Research cheatsheets','Sport-specific analysis with a consistent workflow')+'<div class="card-grid">'+SPORTS[state.sport].tools.map(toolCard).join('')+'</div>'}
function pageTrends(){
 const rows=filteredRows();
 const verified=rows.filter(x=>windowRate(x)!==null);
 return '<div class="page-note">L5 / L10 / L20 / season rates are calculated from individual observed game logs at the <strong>current exact line</strong>, where those game logs are available. A missing observation stays blank.</div>'
  +section('Player trends','Ordered by sample-backed observed frequency')
  +(verified.length?tableMarkup(verified.sort((a,b)=>(windowRate(b)?.rate||0)-(windowRate(a)?.rate||0))):empty('Trend history not yet verified','The live sportsbook feed does not provide sufficient game-by-game observations here. Historical hit percentages must be sourced separately.'));
}
/* Transparent research inventory: publicly documented categories are visible
   even when TSO has not independently verified the underlying statistics. */
const SOURCE_LINEAGE={
 nfl:[['Current matchups','ESPN NFL official schedule','live'],['2026 player opportunity, team defense','TSO NFL research / nflverse-derived','nflResearch'],['Real sportsbook lines','ParlayAPI published odds / 4h max plus kickoff age','nflOdds'],['50,000-run projections','TSO pregame Monte Carlo, exact matching','nflSim'],['Injuries','ESPN official NFL injuries','nflInjuries'],['Calibration','Immutable 2026 archive and checked postgame outcomes','nflArchive']],
 nba:[['Current matchups','ESPN NBA scoreboard','live'],['Player L5/L10/L20 game logs','TSO NBA research / ESPN history','nbaResearch'],['Sportsbook prop prices','TSO published NBA odds snapshot','nbaOdds'],['Injuries','ESPN NBA injury report','nbaInjuries'],['Projected outcomes','TSO NBA model; MARKET ONLY without exact model','nbaModels']],
 mlb:[['Current matchups','ESPN MLB scoreboard','live'],['Published player props','TSO ParlayAPI sportsbook snapshots / ESPN event verified','props'],['Pitch mix, contact and park factors','Specialized verified feeds pending','pending']],
 nhl:[['Current matchups','ESPN NHL scoreboard','live'],['Published player props','TSO ParlayAPI sportsbook snapshots / ESPN event verified','props'],['Goal / First Goal projections','TSO own matchup-adjusted goal hazard model','nhlModel'],['Player history & defense by position','TSO ESPN NHL season event logs and 30-game position profiles','nhlDefense'],['High-danger chances, goalie starts','Specialized verified feeds pending','pending']],
 wnba:[['Current matchups','ESPN WNBA scoreboard','live'],['Published player props','TSO ParlayAPI sportsbook snapshots / ESPN event verified','props'],['Verified player histories, usage and DvP','Specialized verified feeds pending','pending']],
 cfb:[['Current matchups','ESPN college football scoreboard','live'],['Published player props','TSO ParlayAPI sportsbook snapshots / ESPN event verified','props'],['FBS power ratings and game projections','Specialized source and method verification pending','pending']]
};
function sourceState(kind){
 if(kind==='live')return Boolean(state.live?.tso3?.sources?.[state.sport]==='ESPN verified scoreboard'||(state.sport==='nba'&&state.live?.nbaScoreboard?.status==='verified'));
 if(kind==='props')return getRows().some(eligible);
 if(kind==='nhlDefense')return Boolean(state.nhlDefense?.available&&state.nhlDefense.teams?.length);
 if(kind==='nhlModel')return Boolean(state.nhlModel?.available&&state.nhlModel.games?.length);
 if(kind==='nflResearch')return Boolean(state.nflResearch?.players);
 if(kind==='nflOdds')return Boolean(state.nflOdds?.available);
 if(kind==='nflSim')return Boolean(state.nflSim?.games?.length);
 if(kind==='nflInjuries')return Boolean(state.nflInjuries?.entries);
 if(kind==='nflArchive')return Boolean(state.nflArchive?.available);
 if(kind==='nbaResearch')return Boolean(state.nbaResearch?.players);
 if(kind==='nbaOdds')return Boolean(state.nbaOddsSnapshot);
 if(kind==='nbaInjuries')return Boolean(state.nbaInjuries?.entries);
 if(kind==='nbaModels')return Boolean(state.nbaModels?.models?.length);
 return false;
}
function pageData(){
 const sport=SPORTS[state.sport];
 const active=getRows().filter(eligible),byMarket=new Map();
 for(const item of active){
  const key=canon(marketOf(item));
  if(key)byMarket.set(key,(byMarket.get(key)||0)+1);
 }
 const sourceList=SOURCE_LINEAGE[state.sport]||[];
 const categories=sport.markets.map(m=>{
  const n=byMarket.get(canon(m))||0;
  return '<div class="tso-source-row"><div><strong>'+text(m)+'</strong><small>'+text(sport.label)+' market category</small></div>'
   +'<span class="tso-source-state '+(n?'active':'')+'">'+(n?n+' CURRENT OVER/YES QUOTES':'QUOTE NOT VERIFIED')+'</span></div>';
 }).join('');
 const technical=sourceList.map(([name,provider,key])=>{
  const ok=sourceState(key);
  return '<div class="tso-source-row"><div><strong>'+text(name)+'</strong><small>'+text(provider)+'</small></div>'
   +'<span class="tso-source-state '+(ok?'active':'')+'">'+(ok?'SOURCE AVAILABLE':'NOT VERIFIED')+'</span></div>';
 }).join('');
 return section(sport.label+' Data Sources & Market Coverage','Audit where every visible market, ranking and game detail comes from')
  +'<p class="page-note">This is TSO-owned research. Market category listing does not mean live odds, licensed proprietary data or a calibrated projection exists. A blank or unverified category remains pending. We do not scrape or redistribute PropFinder data.</p>'
  +'<div class="tso-lineage-grid"><section class="tool-panel"><h3>Live source inventory</h3><p>Independently identified sources and current availability, not marketing labels.</p>'+technical+'</section>'
  +'<section class="tool-panel"><h3>All '+text(sport.label)+' market categories</h3><p>'+sport.markets.length+' named categories, live coverage indicated only by returned verified bets.</p>'+categories+'</section></div>'
  +'<div class="tool-panel"><h3>How TSO calculations work</h3><p><b>Observed rates:</b> counts of actual recorded game outcomes above a specific listed line, using available L5/L10/L20/season logs. <b>TSO model:</b> only a source-backed simulation that matches player, market, side and exact line. <b>TSO Prop Signal:</b> never inferred from a sportsbook price. <b>Missing stats:</b> displayed as unavailable, not zero.</p></div>';
}
function pageModels(){
 const rows=filteredRows().filter(r=>exactModel(r)!==null);
 return '<div class="page-note">Only strict player + market + Over/Yes + exact line model matches qualify. The market implied probability is not relabeled as a TSO model output.</div>'
  +section('Exact-line model predictions',rows.length+' available matched selections')
  +tableMarkup(rows);
}
function pageRatings(){
 return section('Team strength and matchups','Rating models must have independent calibrated inputs')
  +'<div class="tool-panel"><h3>Ratings feed required</h3><p>Power ratings, opponent ranks, coverage grades and positional matchup ratings cannot be reconstructed from sportsbook prices or current scoreboard results. TSO 3.0 will display them only after source lineage and team identities are verified.</p><div class="detail-tags"><span class="tag pending">PROVIDER / MODEL PENDING</span><span class="tag">SEASON-IDENTIFIED</span><span class="tag">TEAM-IDENTITY VALIDATED</span></div></div>'
  +pageTools();
}
function pageInjuries(){
 return section('Injuries & lineup status','Do not assume the historical starter is playing tonight')
 +empty('Verified injury feed not connected','No active roster availability provider is attached to TSO 3.0 yet. Check official injury reports before making a decision.');
}
function firstBasketView(g,doc){
 if(!doc?.available)return empty('Opening-event history unavailable','The NBA play-by-play feed has not returned verified data for this matchup.');
 const home=doc.home,away=doc.away;
 if(canon(home?.abbr)!==canon(g.home?.abbr)||canon(away?.abbr)!==canon(g.away?.abbr))
  return empty('Team identity mismatch','The opening-tip data does not match this selected game.');
 const record=value=>num(value?.n)>0?'<span><b>'+text(value.pct)+'%</b><small>'+text(value.won)+'/'+text(value.n)+' games</small></span>':'<span><b>—</b><small>NO SAMPLE</small></span>';
 const lines=[['LAST 5','last5'],['LAST 10','last10'],['SEASON','season']];
 const stats=(field,label)=>'<div class="fb-section"><h4>'+text(label)+'</h4><div class="fb-three">'+lines.map(([title,k])=>'<div class="fb-three-cell"><strong>'+title+'</strong><div>'+record(home?.[field]?.[k])+record(away?.[field]?.[k])+'</div></div>').join('')+'</div></div>';
 const candidates=(info,side)=>'<div class="fb-candidates"><h4>'+text((side==='home'?g.home:g.away)?.abbr)+' · '+side.toUpperCase()+'</h4>'
  +(info?.players?.length?info.players.slice(0,5).map((p,i)=>'<div class="fb-candidate"><span>'+text((i+1)+'. '+p.name)+'</span><b>'+text(p.firstBaskets)+'/'+text(p.games)+' FIRST FGS</b></div>').join(''):
   '<p>Verified current-roster candidate sample unavailable.</p>')+'</div>';
 return '<div class="fb-identities"><b>'+text(g.home?.abbr)+' · HOME</b><b>'+text(g.away?.abbr)+' · AWAY</b></div>'
  +stats('tip','OPENING TIP WINS')+stats('basket','TEAM SCORED FIRST FIELD GOAL')
  +'<div class="fb-candidate-grid">'+candidates(home,'home')+candidates(away,'away')+'</div>'
  +'<p class="explain">ESPN completed regular-season play-by-play · '+text(doc.seasonLabel||'season pending')+'. L5/L10 may span seasons; season history is capped by the provider. Current-roster verification is required for ranked players. This is historical frequency, not a model probability or betting recommendation.</p>';
}
async function hydrateFirstBasket(g){
 const holder=el('fbDetail');if(!holder)return;
 const key=[gameKey(g),g.home?.abbr,g.away?.abbr,g.startTime].join('|');
 const old=state.firstBasketCache.get(key);
 if(old&&Date.now()-old.time<900000){holder.innerHTML=firstBasketView(g,old.doc);return}
 const q=new URLSearchParams({home:canon(g.home?.abbr),away:canon(g.away?.abbr)});
 if(g.startTime&&Number.isFinite(Date.parse(g.startTime)))q.set('before',g.startTime);
 try{
  const response=await fetch('/api/first-basket?'+q.toString(),{cache:'no-store'});
  const doc=await response.json();
  if(!response.ok||doc?.available!==true)throw Error('Opening-event history unavailable');
  state.firstBasketCache.set(key,{doc,time:Date.now()});
  if(state.page==='games'&&state.game===gameKey(g)&&el('fbDetail'))el('fbDetail').innerHTML=firstBasketView(g,doc);
 }catch(_){
  if(state.page==='games'&&state.game===gameKey(g)&&el('fbDetail'))
    el('fbDetail').innerHTML=empty('First-basket data unavailable','An authoritative opening-event record was not returned. No substitute estimates are displayed.');
 }
}

function pageSaved(){
 const rows=[...state.saved.values()].filter(x=>x.sport===state.sport);
 if(!rows.length)return section('Saved research','Personal research shortlist')+empty('Your shortlist is empty','Use the star beside a verified selection to save it locally in this browser.');
 return section('Saved research','Stored locally in this browser · not a sportsbook betslip')+'<div class="table-shell"><div class="table-scroller"><table class="data-table"><thead><tr><th>PLAYER</th><th>PROP</th><th>LINE</th><th>BOOK</th><th>QUOTE AT SAVE</th><th>REMOVE</th></tr></thead><tbody>'+rows.map((r,i)=>'<tr><td><strong>'+text(r.name)+'</strong></td><td>'+text(r.market)+'</td><td>'+text(r.side||'Over')+' '+text(r.line??'—')+'</td><td>'+text(r.book||'—')+'</td><td>'+text(signed(r.price))+'</td><td><button class="save-row active" data-unsave="'+text(r.key)+'">'+iconSvg('star','filled')+'</button></td></tr>').join('')+'</tbody></table></div></div>';
}
function nbaFullContext(tool){
 return {sport:'nba',tool,games:state.live?.games||[],props:state.props,
  models:state.nbaModels,research:state.nbaResearch,injuries:state.nbaInjuries,oddsSnapshot:state.nbaOddsSnapshot,
  error:state.nbaPending?'Fetching source data…':state.nbaError};
}
function nflPropsResearch(view='props'){
 const module=window.TSO3NflProps;
 const ctx={games:state.live?.games||[],research:state.nflResearch,td:state.nflTD,odds:state.nflOdds,sim:state.nflSim,injuries:state.nflInjuries};
 return module?'<div id="nflPropsSlot">'+module.render(ctx,view)+'</div>'
  :empty('NFL prop research module unavailable','Refresh this development preview.');
}
async function hydrateNflWeather(){
 if(state.nflWeatherPending||Date.now()-state.nflWeatherFetched<15*60000)return;
 state.nflWeatherPending=true;state.nflWeatherFetched=Date.now();state.nflWeatherError='';
 try{
  const r=await fetch('/api/nfl-weather',{cache:'no-store'});
  if(!r.ok)throw Error('NOAA game weather endpoint HTTP '+r.status);
  const data=await r.json();
  if(!Array.isArray(data?.games))throw Error('Weather feed schema unavailable');
  state.nflWeather=data;state.nflWeatherError='';
 }catch(error){
  state.nflWeather=null;state.nflWeatherError=String(error?.message||'Verified NOAA forecast unavailable').slice(0,140);
 }finally{
  state.nflWeatherPending=false;
  if(state.sport==='nfl'&&state.page==='cheatsheets'&&state.tool==='weather-impact')render();
 }
}

async function hydrateNflValidation(){
 if(state.nflValidationPending||Date.now()-state.nflValidationFetched<20*60000)return;
 state.nflValidationPending=true;state.nflValidationFetched=Date.now();state.nflValidationError='';
 try{
  const response=await fetch('/api/nfl-validation',{cache:'no-store'});
  if(!response.ok)throw Error('NFL historical validation HTTP '+response.status);
  const result=await response.json();
  if(!result.available||!result.firstTouchdown||!result.fiftyKReplay)
   throw Error('Historical validation report is unavailable or invalid');
  state.nflValidation=result;
 }catch(error){
  state.nflValidation=null;state.nflValidationError=String(error?.message||'Historical NFL audit unavailable').slice(0,140);
 }finally{
  state.nflValidationPending=false;
  if(state.sport==='nfl'&&state.page==='cheatsheets'&&state.tool==='model-validation')render();
 }
}
async function hydrateNflArchive(){
 if(state.nflArchivePending||Date.now()-state.nflArchiveFetched<5*60000)return;
 state.nflArchivePending=true;state.nflArchiveFetched=Date.now();
 try{
  const r=await fetch('/api/nfl-archive-status',{cache:'no-store'});
  if(!r.ok)throw Error('Archive status HTTP '+r.status);
  const d=await r.json();
  if(!d.configured)throw Error('Archive not yet configured');
  state.nflArchive=d;
 }catch(e){state.nflArchive={available:false,reason:String(e?.message||'Archive status unavailable').slice(0,110)};}
 finally{
  state.nflArchivePending=false;
  if(state.sport==='nfl'&&state.page==='cheatsheets'&&state.tool==='model-validation')render();
 }
}
function nflValidationResearch(){
 const module=window.TSO3NflValidation;
 return module?'<div id="nflValidationSlot">'+module.render(state.nflValidation,state.nflValidationError,
  state.nflValidationPending||!state.nflValidationFetched,state.nflArchive)+'</div>'
  :empty('NFL validation module unavailable','The archived audit module did not load.');
}
function nflResearch(tool='touchdown-opportunities'){
 const lab=window.TSO3NflLab;
 const context={sport:'nfl',games:state.live?.games||[],td:state.nflTD,research:state.nflResearch,
  odds:state.nflOdds,sim:state.nflSim,injuries:state.nflInjuries,weather:state.nflWeather,weatherError:state.nflWeatherError,error:state.nflError};
 return lab?'<div id="nflLabSlot">'+lab.render(context,tool)+'</div>'
  :empty('NFL research unavailable','The dedicated NFL research module did not load.');
}
function nbaPlayerResearch(tool='player-form'){
 const lab=window.TSO3NbaLab;
 return lab?'<div id="nbaLabSlot">'+lab.render(nbaFullContext(tool),tool)+'</div>'
  :empty('NBA research unavailable','The dedicated player research script could not load.');
}
function nbaDepthResearch(tool){
 const depth=window.TSO3NbaDepth;
 return depth?'<div id="nbaDepthSlot">'+depth.render(nbaFullContext(tool),tool)+'</div>'
  :empty('NBA research unavailable','The dedicated NBA module could not load.');
}
function render(){
 state.displayedRows.clear();
 renderNav();renderMetrics();renderFilters();
 const nflFocused=state.sport==='nfl'&&((state.page==='cheatsheets'&&(state.tool==='model-validation'||window.TSO3NflLab?.tools?.includes(state.tool)))||['props','trends','ratings','projections','injuries'].includes(state.page));
 const focusLab=nflFocused||state.sport==='nba'&&((state.page==='cheatsheets'&&(['player-form','matchup-vs-position'].includes(state.tool)||window.TSO3NbaDepth?.tools?.includes(state.tool)))||['props','trends','ratings','projections','injuries'].includes(state.page));
 // A research-first layout across all six leagues: large artwork belongs to
 // the overview only. Recompute filter visibility from route every time;
 // never OR with an old DOM hidden state from a previous page.
 el('hero').hidden=state.page!=='overview';
 el('quickStatus').hidden=state.page!=='overview';
 const filtersAllowed=['overview','props','trends'].includes(state.page)
  ||state.page==='games'&&Boolean(state.game)
  ||state.page==='projections'&&state.sport!=='nfl'&&state.sport!=='nba';
 el('toolbar').hidden=focusLab||!filtersAllowed;
 let body='';
 if(state.sport==='nfl'&&state.page==='cheatsheets'&&state.tool==='model-validation')body=nflValidationResearch();
 else if(state.sport==='nfl'&&state.page==='props')body=nflPropsResearch('props');
 else if(state.sport==='nfl'&&state.page==='trends')body=nflResearch('receiving-matchups');
 else if(state.sport==='nfl'&&state.page==='ratings')body=nflResearch('power-ratings');
 else if(state.sport==='nfl'&&state.page==='projections')body=nflResearch('game-projections');
 else if(state.sport==='nfl'&&state.page==='injuries')body=nflPropsResearch('injuries');
 else if(state.sport==='nba'&&state.page==='props')body=nbaPlayerResearch();
 else if(state.sport==='nba'&&state.page==='trends')body=nbaPlayerResearch();
 else if(state.sport==='nba'&&state.page==='ratings')body=nbaDepthResearch('team-stats');
 else if(state.sport==='nba'&&state.page==='projections')body=nbaDepthResearch('game-projections');
 else if(state.sport==='nba'&&state.page==='injuries')body=nbaDepthResearch('injury-impact');
 else if(state.page==='overview')body=overview();
 else if(state.page==='games')body=pageGames();
 else if(state.page==='player')body=pageFullPlayerDashboard();
 else if(state.page==='props')body=section('Player prop explorer','Over / Yes markets only, no fabricated selections')+tableMarkup(filteredRows());
 else if(state.page==='trends')body=pageTrends();
 else if(state.page==='cheatsheets')body=pageTools();
 else if(state.page==='ratings')body=pageRatings();
 else if(state.page==='projections')body=pageModels();
 else if(state.page==='injuries')body=pageInjuries();
 else if(state.page==='data')body=pageData();
 else if(state.page==='saved')body=pageSaved();
 el('content').innerHTML=body;
 if(state.sport==='nhl'&&state.page==='cheatsheets'&&['team-statistics','defense-vs-position','shots-on-goal','goal-scorer-matchups'].includes(state.tool))void hydrateNhlDefenseMatrix();
 if(state.sport==='nfl'&&state.page==='cheatsheets'&&state.tool==='weather-impact'&&state.live?.games?.length)
  void hydrateNflWeather();
 if(state.sport==='nfl'&&state.page==='cheatsheets'&&state.tool==='model-validation'){
  void hydrateNflValidation();void hydrateNflArchive();
 }
 if(state.page==='player'&&state.playerId)void hydrateFullPlayerDashboard();
 if(state.page==='games'&&state.game){
  const game=getGames().find(g=>gameKey(g)===state.game);
  if(game){
   void window.TSO3LiveBoxscore?.render?.(game,state.sport);
   void hydrateGameRosters(game);
   if(state.sport==='nba')void hydrateFirstBasket(game);
  }
 }
}
/* Price comparison is only sourced from published sportsbook selections. */
function sameSelectionRows(p){
 const e=String(p.verifiedGameId||p.eventId||p.gameId||'');
 return getRows().filter(q=>eligible(q)&&canon(nameOf(q))===canon(nameOf(p))
  &&canon(q.market||q.marketLabel)===canon(p.market||p.marketLabel)
  &&(!e||String(q.verifiedGameId||q.eventId||q.gameId)===e));
}
function quotedLines(player){
 const lines=new Map();
 for(const p of sameSelectionRows(player)){
  const v=lineOf(p);if(v===null||num(p.price)===null)continue;
  const group=lines.get(v)||[];
  group.push(p);lines.set(v,group);
 }
 return [...lines].map(([line,all])=>({line,all,best:all.slice().sort((a,b)=>Number(b.price)-Number(a.price))[0]}))
  .sort((a,b)=>a.line-b.line);
}
function quoteComparisonMarkup(r){
 const quotes=quotedLines(r);
 if(!quotes.length)return '<p class="page-note">No additional source-verified odds are available for this player and market.</p>';
 return '<div class="table-scroller"><table class="data-table"><thead><tr><th>EXACT LINE</th><th>BEST BOOK</th><th>BEST QUOTE</th><th>BOOKS</th><th>OBSERVED</th></tr></thead><tbody>'
  +quotes.slice(0,20).map(q=>'<tr><td>'+text(q.line)+'</td><td>'+text(bookOf(q.best))+'</td><td>'+text(signed(q.best.price))+'</td>'
   +'<td>'+new Set(q.all.map(bookOf)).size+'</td><td>'+text(q.best.snapshotTime?clock(q.best.snapshotTime):'Unknown')+'</td></tr>').join('')
  +'</tbody></table></div><p class="nba-footnote">Only published bookmaker prices are shown. Other thresholds and model percentages are never invented.</p>';
}
function alternateLinesResearch(){
 const map=new Map();
 for(const q of getRows().filter(eligible)){
  if(lineOf(q)===null||num(q.price)===null)continue;
  const key=[q.verifiedGameId||q.gameId||q.eventId,canon(nameOf(q)),canon(q.market)].join('|');
  const v=map.get(key)||[];v.push(q);map.set(key,v);
 }
 const profiles=[...map.values()].filter(g=>new Set(g.map(lineOf)).size>=2)
  .sort((a,b)=>nameOf(a[0]).localeCompare(nameOf(b[0])));
 const rows=profiles.flatMap(group=>{
  const byLine=new Map();
  for(const q of group){
   const old=byLine.get(lineOf(q));
   if(!old||Number(q.price)>Number(old.price))byLine.set(lineOf(q),q);
  }
  return [...byLine.values()].sort((a,b)=>lineOf(a)-lineOf(b));
 }).slice(0,180);
 return section('Published alternative prop lines','Compare real sportsbook Over/Yes thresholds, never a shifted or estimated line')
  +(rows.length?'<div class="table-scroller"><table class="data-table"><thead><tr><th>PLAYER</th><th>MARKET</th><th>EXACT LINE</th><th>BEST BOOK</th><th>PRICE</th><th>ORIGINAL QUOTE TIME</th></tr></thead><tbody>'
   +rows.map(q=>'<tr><td>'+text(nameOf(q))+'</td><td>'+text(marketOf(q))+'</td><td>'+text(lineOf(q))+'</td>'
    +'<td>'+text(bookOf(q))+'</td><td>'+text(signed(q.price))+'</td>'
    +'<td>'+text(q.snapshotTime?clock(q.snapshotTime):'Unavailable')+'</td></tr>').join('')
   +'</tbody></table></div>':empty('No verified alternate thresholds','The current sportsbook source has not published two distinct lines for the same player and market.'))
  +'<p class="nba-footnote">Multiple actual thresholds are required. Inclusive milestones, inferred sportsbook odds and withdrawn historical quotes are never represented as currently bettable Overs.</p>';
}
function oddsDiscrepancyResearch(){
 const map=new Map();
 for(const r of getRows().filter(eligible)){
  const price=num(r.price),line=lineOf(r);
  if(price===null||line===null)continue;
  const k=[r.verifiedGameId||r.eventId||r.gameId,canon(nameOf(r)),canon(r.market),line,canon(r.side)].join('|');
  const list=map.get(k)||[];list.push(r);map.set(k,list);
 }
 const rows=[...map.values()].filter(a=>new Set(a.map(bookOf)).size>=2).map(a=>{
  const values=a.slice().sort((x,y)=>Number(y.price)-Number(x.price));
  return {best:values[0],worst:values[values.length-1],count:new Set(a.map(bookOf)).size,
   spread:Number(values[0].price)-Number(values[values.length-1].price)};
 }).sort((a,b)=>b.spread-a.spread);
 return section('Exact-line sportsbook differences','Identical player, game, market, side and threshold — genuine published quotes')
  +(rows.length?'<div class="table-scroller"><table class="data-table"><thead><tr><th>PLAYER</th><th>MARKET / EXACT LINE</th><th>BEST BOOK</th><th>OTHER BOOK</th><th>PRICE DIFFERENCE</th></tr></thead><tbody>'
   +rows.slice(0,100).map(a=>'<tr><td>'+text(nameOf(a.best))+'</td><td>'+text(marketOf(a.best))+' '+text(lineOf(a.best))+'</td>'
   +'<td>'+text(bookOf(a.best))+' '+text(signed(a.best.price))+'</td>'
   +'<td>'+text(bookOf(a.worst))+' '+text(signed(a.worst.price))+'</td><td>'+text(a.spread)+'</td></tr>').join('')
   +'</tbody></table></div>':empty('No verified sportsbook discrepancies','Two actual current bookmakers at exactly the same selection are required.'))
  +'<p class="nba-footnote">Price differences alone do not establish positive expected value, arbitrage, or a profitable wager.</p>';
}
/* On-demand official player histories: no default-zero games, no guessed ID. */
const ATHLETE_SEASON={nfl:2026,nba:2027,mlb:2026,nhl:2027,wnba:2026,cfb:2026};
const athleteDepthCache=new Map();
const rosterIdentityCache=new Map();
let athleteDepthNonce=0;
function athleteDepthMetrics(data){
 const bag=new Map();
 for(const e of data.events||[]){
  for(const v of e.stats||[]){
   if(v.numeric===null||!v.name||/^(date|opponent|gameResult)$/i.test(v.name))continue;
   const entry=bag.get(v.name)||{key:v.name,label:v.label||v.name,n:0};
   entry.n++;bag.set(v.name,entry);
  }
 }
 return [...bag.values()].filter(v=>v.n>0)
  .sort((a,b)=>b.n-a.n||a.label.localeCompare(b.label));
}
function athleteCurrentMarketMetric(r,available){
 const market=canon(r.market||marketOf(r));
 const statAliases={
  ATD:['TOTALTOUCHDOWNS'],
  RECYDS:['RECEIVINGYARDS','RECYDS'],RUSHYDS:['RUSHINGYARDS','RUSHYDS'],
  PASSYDS:['PASSINGYARDS','PASSYDS'],PASSATTEMPTS:['PASSINGATTEMPTS'],
  RECEPTIONS:['RECEPTIONS'],COMPLETIONS:['COMPLETIONS'],
  HITS:['HITS'],HOMERUN:['HOMERUNS'],TOTALBASES:['TOTALBASES'],
  SOG:['SHOTS','SHOTSONGOAL','SHOTSTOTAL'],ANYTIMEGOAL:['GOALS'],FIRSTGOAL:[],
  THREES:['THREEPOINTERSMADE'],PRA:['PRA'],POINTS:['POINTS'],REBOUNDS:['REBOUNDS'],
  ASSISTS:['ASSISTS'],RBIS:['RBI'],RBI:['RBI']
 };
 const prefixes=[market,market.replace(/^(PLAYER|TOTAL)/,'')];
 const candidates=new Set(prefixes.flatMap(x=>Object.hasOwn(statAliases,x)?statAliases[x]:[x]));
 return available.find(v=>candidates.has(canon(v.key.split(':').at(-1))))?.key||null;
}
function renderAthleteDepth(doc,row,chosen=null){
 if(!doc?.available)return '<div class="page-note">Verified player depth unavailable. '+text(doc?.reason||'The official ESPN feed returned no data for this athlete and season.')+'</div>';
 const all=athleteDepthMetrics(doc),selected=all.find(v=>v.key===chosen)?.key
  ||athleteCurrentMarketMetric(row,all)||all[0]?.key||null;
 const samples=(doc.events||[]).map(e=>({date:e.date,opponent:e.opponent,
  numeric:e.stats?.find(v=>v.name===selected)?.numeric,value:e.stats?.find(v=>v.name===selected)?.value,
  eventId:e.eventId,seasonType:e.seasonType})).filter(x=>x.numeric!==null&&x.numeric!==undefined);
 const rate=n=>{
  const values=samples.slice(0,n),total=values.length;
  if(!total)return {mean:null,hits:null,n:0};
  const exact=selected===athleteCurrentMarketMetric(row,all)&&lineOf(row)!==null;
  return {n:total,mean:values.reduce((a,b)=>a+b.numeric,0)/total,
   hits:exact?values.filter(x=>x.numeric>lineOf(row)).length:null};
 };
 const numbers=[5,10,20].map(n=>({n,...rate(n)})),evidence=samples.slice(0,20);
 const bars=evidence.length?('<div class="tso-depth-bars" aria-label="Observed game log stat chart">'+
  evidence.slice().reverse().map(x=>{
   const top=Math.max(1,...evidence.map(q=>q.numeric));
   return '<div class="tso-depth-bar"><span style="height:'+Math.round(100*Math.max(0,x.numeric)/top)+'%" title="'+text(x.value)+'"></span><small>'+text(x.value)+'</small></div>';
  }).join('')+'</div>'):'<p>No verified per-game observations for this stat.</p>';
 const cards='<div class="data-preview">'+numbers.map(x=>'<div><span>L'+x.n+' VERIFIED AVG</span><b>'+(x.mean===null?'—':x.mean.toFixed(1))+'</b>'
  +'<small>'+x.n+' observed games'+(x.hits===null?'':' · '+x.hits+'/'+x.n+' above '+text(lineOf(row)))+'</small></div>').join('')+'</div>';
 const table=evidence.length?'<div class="table-scroller"><table class="data-table"><thead><tr><th>DATE</th><th>OPPONENT</th><th>RESULT</th><th>'+text(all.find(v=>v.key===selected)?.label||'STAT')+'</th></tr></thead><tbody>'
  +evidence.map(x=>'<tr><td>'+text(new Date(x.date).toLocaleDateString('en-US',{month:'short',day:'numeric'}))+'</td>'
   +'<td>'+text(x.opponent||'—')+'</td><td>'+text(x.seasonType||'Season')+'</td><td>'+text(x.value)+'</td></tr>').join('')
  +'</tbody></table></div>':'';
 const season=(doc.seasonStats||[]).slice(0,10).map(c=>
  '<details class="tso-season-details"><summary>'+text(c.category)+'</summary>'
  +'<div class="tso-season-stats">'+c.values.slice(0,32).map(v=>
    '<div><small>'+text(v.label||v.name)+'</small><b>'+text(v.value)+'</b></div>').join('')+'</div></details>').join('');
 return '<div class="tso-athlete-source"><strong>ESPN season '+text(doc.season)+' · Official recorded data</strong>'
  +'<small>'+text(doc.sourceIdentification||'Source ID requested')+'</small></div>'
  +(all.length?'<label class="tso-depth-select">Game-log statistic <select id="athleteDepthMetric">'+all.map(v=>
   '<option value="'+text(v.key)+'" '+(v.key===selected?'selected':'')+'>'+text(v.label)+' · '+v.n+' games</option>').join('')+'</select></label>'+cards+bars+table:
   '<p class="page-note">ESPN has not returned an individually verifiable game log for this player/season.</p>')
  +'<h4>Official season statistics</h4>'+ (season||'<p class="page-note">Season totals not supplied by the official provider.</p>')
  +'<p class="nba-footnote">Observed games only. A missing game never counts as zero. L5/L10/L20 are descriptive, not independent model probabilities. First-goal and combined touchdown markets cannot be inferred from ordinary goal or partial rushing/receiving logs.</p>';
}
async function hydrateAthleteDepth(row){
 const container=el('athleteDepthSlot');
 if(!container)return;
 const sport=state.sport,season=ATHLETE_SEASON[sport],nonce=++athleteDepthNonce;
 let id=String(row.playerId||''),identity=null;
 if(!/^\d{3,12}$/.test(id)){
  const eventId=String(row.verifiedGameId||'');
  if(!/^\d{6,14}$/.test(eventId)){
   container.innerHTML='<p class="page-note">The selection has no verified ESPN game/player identifier. Player histories cannot be joined safely by name alone.</p>';
   return;
  }
  const req=sport+'|'+eventId+'|'+canon(nameOf(row));
  const remembered=rosterIdentityCache.get(req);
  if(remembered&&Date.now()-remembered.time<15*60000)identity=remembered.doc;
  else{
   try{
    const response=await fetch('/api/athlete-identity?'+new URLSearchParams({
     league:sport,gameId:eventId,player:nameOf(row)}),{cache:'default'});
    identity=await response.json();
    if(!response.ok)identity={available:false,reason:'Official roster lookup unavailable'};
   }catch(_){identity={available:false,reason:'Official roster lookup unavailable'}}
   rosterIdentityCache.set(req,{time:Date.now(),doc:identity});
  }
  if(nonce!==athleteDepthNonce||el('drawer').hidden||state.selected!==row)return;
  if(!identity?.available||!/^\d{3,12}$/.test(String(identity.athleteId||''))){
   container.innerHTML='<p class="page-note">Official player identity not confirmed. '+text(identity?.reason||'An exact unique match on the two game rosters is required.')+'</p>';
   return;
  }
  id=String(identity.athleteId);
  container.innerHTML='<p class="page-note">ESPN roster match verified. Loading recorded season stats…</p>';
 }
 row.verifiedAthleteId=id;
 if(sport==='nhl')void hydrateNhlPlayerResearch(row);
 const key=sport+':'+id+':'+season;
 let doc=athleteDepthCache.get(key);
 if(!doc){
  try{
   const r=await fetch('/api/athlete-depth?'+new URLSearchParams({league:sport,playerId:id,season:String(season)}),{cache:'default'});
   doc=await r.json();
   if(!r.ok||!doc?.available)doc={available:false,reason:doc?.reason||'ESPN did not return a verified season record'};
  }catch(_){doc={available:false,reason:'Player statistics request unavailable'}}
  athleteDepthCache.set(key,doc);
 }
 if(nonce!==athleteDepthNonce||el('drawer').hidden||state.selected!==row)return;
 // Name mismatch is a potential provider-ID crossover, not evidence.
 if(doc.athleteName&&canon(doc.athleteName)!==canon(nameOf(row))){
  container.innerHTML='<p class="page-note">ESPN returned a different player identity. No history was attached to this sportsbook prop.</p>';
  return;
 }
 container.innerHTML=(identity?.available?
  '<div class="tso-athlete-source"><strong>Unique official roster match: '+text(identity.athleteName)+'</strong>'
  +'<small>'+text(identity.teamAbbr||'')+' · '+text(identity.position||'position pending')
  +' · roster status '+text(identity.rosterStatus||'unavailable')+'</small></div>':'')
  +renderAthleteDepth(doc,row);
}
/* TSO defense vs position is a TEAM/POSITION observation, not an invented
   player grade. Live feed is independently sourced, 32 official teams. */
function renderNhlDefenseMatrix(doc,position='C',type='goals'){
 if(!doc?.available)return '<p class="page-note">'+text(doc?.reason||'Verified TSO NHL defense history is unavailable')+'</p>';
 const teams=doc.teams||[],ranked=teams.filter(t=>t.position?.[position]?.games>0)
  .slice().sort((a,b)=>{
   const aVal=num(a.position?.[position]?.[type==='shots'?'shotsPerGame':'goalsPerGame']),
    bVal=num(b.position?.[position]?.[type==='shots'?'shotsPerGame':'goalsPerGame']);
   return (bVal??-1)-(aVal??-1);
  });
 const fmt=v=>num(v)===null?'—':Number(v).toFixed(2);
 const select='<label class="tso-depth-select">Opponent position filter <select id="nhlDefensePosition">'
  +[['C','Centers'],['LW','Left Wings'],['RW','Right Wings'],['D','Defensemen']].map(([v,label])=>
   '<option value="'+v+'" '+(v===position?'selected':'')+'>'+label+'</option>').join('')+'</select></label>';
 const rows=ranked.map((t,i)=>{
  const p=t.position[position]||{};
  return '<tr><td>'+text(i+1)+'</td><td><b>'+text(t.abbr)+'</b></td>'
   +'<td>'+fmt(p.goalsPerGame)+'</td><td>'+fmt(p.shotsPerGame)+'</td>'
   +'<td>'+text(p.goalAllowedRank??'—')+' / '+text(p.rankedTeams??'—')+'</td>'
   +'<td>'+text(p.games)+'</td><td>'+fmt(t.goalsAllowedPerGame)+'</td>'
   +'<td>'+fmt(t.recent10GoalsAllowedPerGame)+'</td>'
   +'<td>'+fmt(t.shotsAllowedPerGame)+'</td></tr>';
 }).join('');
 return '<div class="tso-athlete-source"><strong>'+text(teams.length)+' teams · '+text(doc.playerCount??0)+' researched players</strong>'
  +'<small>Source updated '+text(doc.generatedAt?clock(doc.generatedAt):'Not verified')+'</small></div>'
  +'<p class="page-note">Sorted by observed '+(type==='shots'?'shots':'goals')+' conceded per game to the selected position (highest first). This is defense versus <strong>position</strong>, not player-specific market grading.</p>'
  +select+'<div class="table-scroller"><table class="data-table"><thead><tr>'
  +'<th>SORT</th><th>DEFENSE</th><th>GOALS / POS / GAME</th><th>SHOTS / POS / GAME</th>'
  +'<th>GOAL ALLOWANCE RANK</th><th>DEFENSE GAMES</th><th>TEAM GA / GAME</th><th>TEAM L10 GA</th><th>TEAM SHOTS ALLOWED</th>'
  +'</tr></thead><tbody>'+rows+'</tbody></table></div>'
  +'<p class="nba-footnote">Position sample is tied to '+text(doc.samplePolicy||'ESPN historical games')+'. Latest source season '+text(doc.currentSeason||'—')+'. These are observed averages, not guaranteed outcomes or no-vig sportsbook probabilities.</p>';
}
async function hydrateNhlDefenseMatrix(){
 const slot=el('nhlDefenseSlot');
 if(!slot||state.sport!=='nhl')return;
 const now=Date.now();let data=state.nhlDefense;
 if(!data||now-state.nhlDefenseFetched>10*60000){
  try{
   const resp=await fetch('/api/nhl-defense',{cache:'default'});
   data=await resp.json();
   if(!resp.ok)data={available:false,reason:data?.reason||'Live TSO NHL defense data unavailable'};
  }catch(_){data={available:false,reason:'NHL defensive position statistics not reachable'}}
  state.nhlDefense=data;state.nhlDefenseFetched=Date.now();
 }
 if(!el('nhlDefenseSlot')||state.sport!=='nhl'||state.page!=='cheatsheets')return;
 const type=state.tool==='shots-on-goal'?'shots':'goals';
 el('nhlDefenseSlot').innerHTML=renderNhlDefenseMatrix(data,state.nhlDefensePosition,type);
}
/* NHL evidence: TSO's current ESPN game-summary research dataset (30 games)
   and opponent team/position defense, independently from betting odds. */
const nhlDetailedCache=new Map();
function renderNhlPlayerResearch(data,metric=''){
 if(!data?.available)return '<div class="page-note">'+text(data?.reason||'TSO NHL verified player history is unavailable')+'</div>';
 const games=data.games||[],isGoalie=data.position==='G';
 const choices=[
  ['sog','Shots on Goal'],['goals','Goals'],['assists','Assists'],
  ['points','Points'],['blocks','Blocked Shots'],['ppGoals','Power-Play Goals'],
  ['saves','Goalie Saves'],['firstGoal','First Goal']
 ].filter(([key])=>games.some(g=>key==='firstGoal'?typeof g.firstGoal==='boolean':num(g.stats?.[key])!==null));
 const selected=choices.some(x=>x[0]===metric)?metric:
  (isGoalie&&choices.some(x=>x[0]==='saves')?'saves':choices[0]?.[0]);
 const values=games.map(g=>({...g,value:selected==='firstGoal'?Number(g.firstGoal):num(g.stats?.[selected])}))
  .filter(g=>g.value!==null&&Number.isFinite(g.value));
 const avg=n=>{const sample=values.slice(0,n);return {games:sample.length,mean:sample.length?
  sample.reduce((sum,g)=>sum+g.value,0)/sample.length:null}};
 const summary=[5,10,20].map(n=>({window:n,...avg(n)}));
 const d=data.defense||null,p=d?.position||null,fmt=n=>num(n)===null?'—':Number(n).toFixed(2);
 const cards='<div class="data-preview">'+summary.map(x=>'<div><span>RECORDED L'+x.window+' '+text(choices.find(t=>t[0]===selected)?.[1]||'STAT')+'</span><b>'+fmt(x.mean)+'</b><small>'+x.games+' actual games</small></div>').join('')+'</div>';
 const table=values.length?'<div class="table-scroller"><table class="data-table"><thead><tr><th>GAME DATE</th><th>OPPONENT</th><th>SEASON</th><th>HOME / AWAY</th><th>ACTUAL STAT</th></tr></thead><tbody>'
  +values.slice(0,30).map(g=>'<tr><td>'+text(g.date?.slice(0,10)||'—')+'</td><td>'+text(g.opponent||'—')+'</td>'
   +'<td>'+text(g.season||'—')+'</td><td>'+text(g.homeAway||'—')+'</td><td>'+text(g.value)+'</td></tr>').join('')
  +'</tbody></table></div>':'<p class="page-note">No complete recorded events for the selected statistic.</p>';
 const versus='<div class="data-preview">'
  +'<div><span>OPPONENT GOALS ALLOWED/GAME</span><b>'+fmt(d?.goalsAllowedPerGame)+'</b><small>'+text(d?.games??0)+' total games</small></div>'
  +'<div><span>RECENT 10 GOALS ALLOWED/GAME</span><b>'+fmt(d?.recent10GoalsAllowedPerGame)+'</b></div>'
  +'<div><span>OPPONENT SHOTS ALLOWED/GAME</span><b>'+fmt(d?.shotsAllowedPerGame)+'</b></div>'
  +'<div><span>'+text(data.position||'PLAYER')+' GOAL ALLOWANCE RANK</span><b>'+text(p?.goalAllowedRank??'—')+'</b>'
  +'<small>'+text(p?.rankedTeams||'—')+' ranked teams</small></div>'
  +'<div><span>'+text(data.position||'PLAYER')+' GOALS ALLOWED/GAME</span><b>'+fmt(p?.goalsPerGame)+'</b></div>'
  +'<div><span>'+text(data.position||'PLAYER')+' SHOTS ALLOWED/GAME</span><b>'+fmt(p?.shotsPerGame)+'</b></div></div>';
 return '<div class="tso-athlete-source"><strong>TSO NHL verified research · '+text(data.team||'')+' vs '+text(data.opponent||'')+'</strong>'
  +'<small>ESPN-derived update '+text(data.generatedAt?clock(data.generatedAt):'unknown')+'</small></div>'
  +'<p class="nba-footnote">Current-season games and prior-season history retain their original season identifiers. No invented results or inferred starters.</p>'
  +(choices.length?'<label class="tso-depth-select">Recorded NHL statistic<select id="nhlHistoryMetric">'+choices.map(v=>'<option value="'+text(v[0])+'" '+(v[0]===selected?'selected':'')+'>'+text(v[1])+'</option>').join('')+'</select></label>'+cards+table:
   '<p class="page-note">ESPN has not returned full game logs for this exact player.</p>')
  +'<h4>Opponent team and position defense</h4>'+versus
  +'<p class="nba-footnote">Defense sample: '+text(d?.games??0)+' verified games ('+text(d?.currentSeasonGames??0)+' current season). Observed opponent production, not a player model probability. Source: '+text(d?.source||'TSO ESPN summaries')+'.</p>';
}
async function hydrateNhlPlayerResearch(row){
 if(state.sport!=='nhl'||!el('nhlResearchSlot'))return;
 const gameId=String(row.verifiedGameId||''),athleteId=String(row.verifiedAthleteId||row.playerId||'');
 if(!/^\d{6,14}$/.test(gameId)||!/^\d{3,12}$/.test(athleteId)){
  el('nhlResearchSlot').innerHTML='<p class="page-note">Official NHL matchup/player IDs have not both been verified.</p>';return;
 }
 const key=gameId+':'+athleteId,saved=nhlDetailedCache.get(key);
 let doc=saved?.doc;
 if(!saved||Date.now()-saved.at>10*60000){
  try{
   const res=await fetch('/api/nhl-player-research?'+new URLSearchParams({gameId,playerId:athleteId}),{cache:'default'});
   doc=await res.json();
   if(!res.ok)doc={available:false,reason:doc?.reason||'Published NHL research is unavailable'};
  }catch(_){doc={available:false,reason:'Recorded NHL player research could not be retrieved'}}
  nhlDetailedCache.set(key,{at:Date.now(),doc});
 }
 if(state.selected!==row||el('drawer').hidden||!el('nhlResearchSlot'))return;
 el('nhlResearchSlot').innerHTML=renderNhlPlayerResearch(doc);
}
function openDrawer(r){
 if(!r)return;
 state.selected=r;
 const logs=recent(r,20);
 const model=exactModel(r),signal=signalOf(r);
 const samples=[['LAST 5',recent(r,5)],['LAST 10',recent(r,10)],['LAST 20',recent(r,20)],['SEASON',recent(r,1000)]];
 let html='<div class="drawer-contents"><span class="eyebrow">PLAYER · '+text((r.team||state.sport).toUpperCase())+'</span><h2>'+text(nameOf(r))+'</h2>'
  +'<p class="subtitle">'+text(marketOf(r))+' · '+text((r.side||'Over').toUpperCase())+' '+text(lineOf(r)??'—')+' · '+text(bookOf(r)||'BOOK PENDING')+'</p>'
  +'<div class="data-preview"><div><span>TSO SIGNAL</span><b>'+(signal===null?'—':Math.round(signal))+'</b></div>'
  +'<div><span>EXACT-LINE MODEL</span><b>'+pct(model)+'</b></div><div><span>QUOTE</span><b>'+text(signed(r.price))+'</b></div>'
  +'<div><span>HISTORICAL GAMES</span><b>'+text(logs?.n??'—')+'</b></div></div>'
  +'<div class="explain-box">The exact model value is shown only if a verified same-line result exists. Observed hit rates are descriptive—not projected probabilities. Compare line movement, opponent context, usage and starting status before acting.</div><h3>Recent performance</h3>'
  +'<div class="data-preview">'+samples.map(([label,x])=>'<div><span>'+label+'</span><b>'+ (x?Math.round(x.rate)+'%':'—')+'</b><small>'+text(x?x.hits+'/'+x.n+' hits':'Not available')+'</small></div>').join('')+'</div>';
 if(logs?.values.length){
  const max=Math.max(1,...logs.values,lineOf(r)||0);
  html+='<h3>Verified game results (most recent first)</h3><div class="stat-bars" aria-label="Recent player game results">'
  +logs.values.slice(0,20).reverse().map((v,i)=>'<span><i style="height:'+Math.max(2,Math.round(v/max*115))+'px" title="'+text(v)+'"></i><small>'+text(v)+'</small></span>').join('')+'</div>';
 }else html+='<div class="page-note">A verified game-by-game chart is not available for this exact player and market. No values have been inferred.</div>';
 if(r.matchupEvidence){
  const q=r.matchupEvidence;
  html+='<h3>TSO verified goal matchup evidence</h3><div class="data-preview">'
   +'<div><span>OPPONENT RANK BY POSITION</span><b>'+text(q.defenseRank??'—')+'</b></div>'
   +'<div><span>GOALS ALLOWED / GAME</span><b>'+text(q.goalsAllowedPerGame==null?'—':Number(q.goalsAllowedPerGame).toFixed(2))+'</b></div>'
   +'<div><span>PLAYER RECENT GOALS</span><b>'+text(q.recentGoals??'—')+'</b></div>'
   +'<div><span>RECENT GAMES</span><b>'+text(q.recentGames??'—')+'</b></div></div>'
   +'<p class="nba-footnote">Opponent '+text(q.opponent||'not verified')+' · '+text(q.position||'position unknown')
   +' · starting goalie '+(q.goalieVerified?'verified':'not independently verified')
   +'. These are TSO-sourced matchup observations, not proprietary third-party rankings.</p>';
 }
 html+='<h3>TSO NHL matchup research</h3>'+(state.sport==='nhl'?'<div id="nhlResearchSlot" class="tso-depth">Loading TSO official NHL history…</div>':'')+'<h3>Official player statistics & game log</h3><div id="athleteDepthSlot" class="tso-depth"><p class="page-note">Checking current ESPN season game history…</p></div>';
 html+='<h3>Verified sportsbook lines</h3>'+quoteComparisonMarkup(r)
  +'<h3>Original source & model details</h3><div class="data-preview">'
  +'<div><span>PRICE OBSERVED</span><b>'+text(r.snapshotTime?clock(r.snapshotTime):'Not verified')+'</b></div>'
  +'<div><span>MODEL SOURCE</span><b>'+text(r.model?.source||'No exact model')+'</b></div>'
  +'<div><span>RUN ITERATIONS</span><b>'+text(r.model?.iterations??'Unavailable')+'</b></div>'
  +'<div><span>MODEL GENERATED</span><b>'+text(r.model?.generatedAt?clock(r.model.generatedAt):'Unavailable')+'</b></div></div>'
  +'<h3>What to validate</h3><div class="detail-tags"><span class="tag '+(model===null?'pending':'verified')+'">Exact line '+(model===null?'not modeled':'matched')+'</span><span class="tag '+(logs?'verified':'pending')+'">Observed game logs '+(logs?'verified':'pending')+'</span><span class="tag pending">Opponent positional split required</span><span class="tag pending">Confirmed lineup required</span></div>'
  +'<div class="drawer-actions"><button class="btn" type="button" data-open-full-dashboard>Full Player Dashboard</button><button class="btn" id="drawerSave" type="button">'+(state.saved.has(rowKey(r))?'Remove from saved':'Save selection')+'</button><button class="btn subtle" id="drawerClose2">Close</button></div></div>';
 el('drawerBody').innerHTML=html;el('drawer').hidden=false;el('scrim').hidden=false;el('closeDrawer').focus();
 void hydrateAthleteDepth(r);
 if(state.sport==='nhl')void hydrateNhlPlayerResearch(r);
}
function closeDrawer(){el('drawer').hidden=true;el('scrim').hidden=true;state.selected=null}
function save(r){
 if(!r)return;const key=rowKey(r);
 if(state.saved.has(key))state.saved.delete(key);
 else state.saved.set(key,{key,sport:leagueOf(r),name:nameOf(r),market:marketOf(r),side:r.side,line:lineOf(r),price:r.price,book:bookOf(r),at:new Date().toISOString()});
 remember();render();if(!el('drawer').hidden&&state.selected)openDrawer(state.selected);
}
function route(sport,page,tool=null,athleteId=null){
 if(!SPORTS[sport])sport='nfl';
 if(!PAGES.some(x=>x[0]===page))page='overview';
 const matched=page==='cheatsheets'&&SPORTS[sport].tools.some(t=>menuToolSlug(t[0])===tool)?tool:null;
 if(state.sport!==sport)state.matchupIds=[];
 state.matchupOpen=false;
 const safeId=page==='player'&&/^\d{3,12}$/.test(String(athleteId||''))?String(athleteId):null;
 const samePerson=state.sport===sport&&state.playerId===safeId;
 if(!samePerson)state.playerUI={tab:'overview',metric:null,split:'all',opponent:'',window:'l10',phase:null,lineKey:''};
 state.playerId=safeId;
 state.sport=sport;state.page=page;state.tool=matched;state.openSport=null;state.game=null;state.market='all';state.book='all';state.marketSelections=[];state.bookSelections=[];state.marketOpen=false;state.bookOpen=false;state.search='';state.maxRows=40;
 closeDrawer();render();el('main').scrollIntoView({block:'start'});
}
function onHash(){
 const [sport,page,tool]=location.hash.replace(/^#\/?/,'').split('/');
 const athleteId=page==='player'&&/^\d{3,12}$/.test(tool||'')?tool:null;
 if(!SPORTS[sport]||!PAGES.some(x=>x[0]===page)){location.hash='#/nfl/overview';return}
 const matched=page==='cheatsheets'&&SPORTS[sport].tools.some(t=>menuToolSlug(t[0])===tool)?tool:null;
 if(state.sport!==sport||state.page!==page||state.tool!==matched||state.openSport!==null
  ||page==='player'&&state.playerId!==athleteId)route(sport,page,matched,athleteId);
}
/* Resilient NBA slate sourced directly from ESPN's published scoreboard.
   ESPN's scoreboard supports browser CORS. No made-up schedules or team IDs. */
function normalizeNbaScoreboard(doc){
 if(!Array.isArray(doc?.events))return [];
 return doc.events.map(e=>{
  const c=e.competitions?.[0];
  const home=c?.competitors?.find(x=>x.homeAway==='home'),away=c?.competitors?.find(x=>x.homeAway==='away');
  if(!e.id||!home?.team?.id||!away?.team?.id||!Number.isFinite(Date.parse(e.date||'')))return null;
  const team=x=>({id:String(x.team.id),name:x.team.displayName||x.team.name||null,
   abbr:x.team.abbreviation||null,logo:x.team.logo||x.team.logos?.[0]?.href||null,
   score:x.score??null,record:x.records?.find(v=>v.type==='total')?.summary||null});
  const status=c.status?.type||e.status?.type||{};
  return {id:String(e.id),league:'nba',home:team(home),away:team(away),
   startTime:e.date,state:status.completed===true?'post':status.state==='in'?'in':'pre',
   venue:c.venue?.fullName||null,source:'ESPN NBA scoreboard'};
 }).filter(Boolean);
}
async function officialNbaSlate(){
 const dates=[0,1,2].map(offset=>{
  const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('');
 });
 const rs=await Promise.allSettled(dates.map(async date=>{
  const response=await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates='+date+'&limit=200',{cache:'no-store'});
  if(!response.ok)throw Error('ESPN NBA scoreboard '+response.status);
  return normalizeNbaScoreboard(await response.json());
 }));
 const games=[...new Map(rs.filter(r=>r.status==='fulfilled').flatMap(r=>r.value).map(g=>[g.id,g])).values()];
 if(!games.length)throw Error('NBA scoreboard dates unavailable');
 return games;
}

async function load(force=false){
 if(state.pending)return;
 if(!force&&Date.now()-state.updated<30000)return;
 state.pending=true;el('refreshBtn').disabled=true;
 const pairs=await Promise.allSettled([
  fetch('/api/live?league=all',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Scoreboard HTTP '+r.status);return r.json()}),
  fetch('/api/props?league=all',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Props HTTP '+r.status);return r.json()}),
  fetch('/api/nba-research',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('NBA history HTTP '+r.status);return r.json()}),
  fetch('/api/nba-models',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('NBA model HTTP '+r.status);return r.json()}),
  officialNbaSlate(),
  fetch('/api/nba-odds',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('NBA odds HTTP '+r.status);return r.json()}),
  fetch('/api/nba-injuries',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('NBA injuries HTTP '+r.status);return r.json()}),
  fetch('/api/nfl-touchdowns',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('NFL TD model HTTP '+r.status);return r.json()}),
  fetch('/api/nfl-research',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('NFL research HTTP '+r.status);return r.json()}),
  fetch('/api/nfl-odds',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('NFL odds HTTP '+r.status);return r.json()}),
  fetch('/api/nfl-projections',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('NFL simulation HTTP '+r.status);return r.json()}),
  fetch('/api/nfl-injuries',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('NFL injuries HTTP '+r.status);return r.json()}),
  ...['mlb','nhl','wnba','cfb'].map(league=>fetch('/api/sport-odds?league='+league,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error(league.toUpperCase()+' odds HTTP '+r.status);return r.json()})),
  fetch('/api/nhl-goal-model',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('NHL goal model HTTP '+r.status);return r.json()})
 ]);
 if(pairs[0].status==='fulfilled'&&Array.isArray(pairs[0].value.games)){state.live=pairs[0].value;state.liveError=''}
 else{state.liveError=String(pairs[0].reason?.message||'Scoreboard feed missing');state.live={games:[],tso3:{sources:{}}}}
 if(pairs[1].status==='fulfilled'&&Array.isArray(pairs[1].value.rows)){state.props=pairs[1].value;state.propsError=''}
 else{state.propsError=String(pairs[1].reason?.message||'Props feed missing');state.props={rows:[]}}
 if(pairs[2].status==='fulfilled'&&pairs[2].value?.players){state.nbaResearch=pairs[2].value;state.nbaError=''}
 else {state.nbaError=String(pairs[2].reason?.message||'NBA history source missing');state.nbaResearch=null}
 state.nbaModels=pairs[3].status==='fulfilled'&&Array.isArray(pairs[3].value?.models)?pairs[3].value:null;
 if(pairs[4].status==='fulfilled'&&pairs[4].value.length&&state.live?.tso3?.sources?.nba!=='ESPN verified scoreboard'){
  const oldGames=Array.isArray(state.live?.games)?state.live.games:[];
  const combined=new Map(oldGames.filter(g=>g.league!=='nba').map(g=>[g.league+':'+g.id,g]));
  for(const g of pairs[4].value)combined.set('nba:'+g.id,g);
  state.live={...(state.live||{}),games:[...combined.values()],nbaScoreboard:{source:'ESPN NBA scoreboard',status:'verified',fetchedAt:new Date().toISOString()}};
 }
 state.nbaOddsSnapshot=null;
 if(pairs[5].status==='fulfilled'&&pairs[5].value?.available===true&&Array.isArray(pairs[5].value.rows)){
  const current=Array.isArray(state.props?.rows)?state.props.rows:[];
  const merged=new Map();
  for(const row of current.concat(pairs[5].value.rows)){
   const key=[row.sport||row.league,row.eventId||row.gameId,row.player,row.market,row.line,row.side,row.book].join('|').toLowerCase();
   merged.set(key,row);
  }
  state.props={...(state.props||{}),rows:[...merged.values()],nbaOdds:{source:pairs[5].value.source,fetchedAt:pairs[5].value.fetchedAt}};
  state.nbaOddsSnapshot=pairs[5].value.fetchedAt;
 }
 state.nbaInjuries=pairs[6].status==='fulfilled'&&Array.isArray(pairs[6].value?.entries)?pairs[6].value:null;
 state.nflTD=pairs[7].status==='fulfilled'&&Array.isArray(pairs[7].value?.games)?pairs[7].value:null;
 state.nflResearch=pairs[8].status==='fulfilled'&&Array.isArray(pairs[8].value?.players)?pairs[8].value:null;
 state.nflOdds=pairs[9].status==='fulfilled'&&Array.isArray(pairs[9].value?.rows)?pairs[9].value:null;
 state.nflSim=pairs[10].status==='fulfilled'&&Array.isArray(pairs[10].value?.games)?pairs[10].value:null;
 // Put current verified ParlayAPI sportsbook Over/Yes selections into the
 // shared six-sport explorer. The dedicated NFL module already read these;
 // omission here previously caused a misleading "zero NFL props" table.
 if(state.nflOdds?.available&&Array.isArray(state.nflOdds.rows)&&state.nflOdds.rows.length){
  const current=Array.isArray(state.props?.rows)?state.props.rows:[];
  const merged=new Map();
  const now=Date.now(),sims=new Map((state.nflSim?.games||[])
   .filter(g=>g.phase==='pregame'&&Number(g.iterations)>=10000&&Date.parse(g.runAt)<=now
    &&now-Date.parse(g.runAt)<=48*3600000)
   .map(g=>[String(g.id),g]));
  const label={atd:'Player Touchdowns',firstTd:'First Touchdown',
   passYds:'Player Passing Yards',passTds:'Player Passing Touchdowns',
   passAttempts:'Player Passing Attempts',completions:'Player Completions',
   rushYds:'Player Rushing Yards',rushAttempts:'Player Rushing Attempts',
   recYds:'Player Receiving Yards',receptions:'Player Receptions',
   targets:'Player Targets',carries:'Player Rushing Attempts'};
  const teamKey=v=>({LAR:'LA',RAMS:'LA',JAX:'JAC',AZ:'ARI',WSH:'WAS'}[canon(v)]||canon(v));
  for(const row of current.concat(state.nflOdds.rows.map(q=>{
   const m=sims.get(String(q.verifiedGameId||'')),start=Date.parse(q.commenceTime||'');
   const player=(m?.players||[]).find(p=>teamKey(p.team)===teamKey(q.team)
    &&canon(p.name)===canon(q.player));
   let probability=null;
   const fresh=m&&Date.parse(m.startTime)===start&&Date.parse(q.snapshotTime)<=now
    &&Date.parse(q.snapshotTime)<start&&Date.parse(m.runAt)<start;
   if(fresh&&player&&q.market==='atd'&&Number(q.line)===0.5)
    probability=num(player.atd);
   else if(fresh&&player&&String(q.side)==='over'){
    const exact=player.exactOver?.[q.market];
    if(exact&&Number(exact.line)===Number(q.line))probability=num(exact.probability);
   }
   if(probability!==null&&(probability<0||probability>1))probability=null;
   return {...q,marketLabel:label[q.market]||q.market,
    model:probability===null?null:{probabilityPct:probability*100,
     exactMatch:true,lineMatch:true,matchType:'exact-line',source:'TSO pregame 50K Monte Carlo',
     generatedAt:m.runAt,iterations:m.iterations}};
  }))){
   const key=[row.sport||row.league,row.verifiedGameId||row.eventId||row.gameId,
    row.playerId||row.player,canon(row.market),row.line,canon(row.side),canon(row.book)].join('|').toLowerCase();
   merged.set(key,row);
  }
  state.props={...(state.props||{}),rows:[...merged.values()],
   nflOdds:{source:state.nflOdds.source,fetchedAt:state.nflOdds.fetchedAt}};
 }
 state.nflInjuries=pairs[11].status==='fulfilled'&&Array.isArray(pairs[11].value?.entries)?pairs[11].value:null;
 // Other published TSO sportsbook sources are separate from proprietary models.
 // Only ESPN-matched pregame quotes with their ORIGINAL sportsbook timestamp
 // survive the dedicated Worker verifier. No implied prices, no stale fallbacks.
 state.otherOdds={};
 const booksMerged=new Map((state.props?.rows||[]).map(row=>[
  [row.sport||row.league,row.verifiedGameId||row.eventId||row.gameId,row.playerId||row.player,
   canon(row.market),row.line,canon(row.side),canon(row.book)].join('|').toLowerCase(),row]));
 for(const [i,league] of ['mlb','nhl','wnba','cfb'].entries()){
  const result=pairs[12+i];
  const doc=result?.status==='fulfilled'?result.value:null;
  state.otherOdds[league]=doc?.available?doc:{available:false,reason:doc?.reason||result?.reason?.message||'Verified source unavailable'};
  if(doc?.available&&Array.isArray(doc.rows)){
   for(const row of doc.rows){
    const key=[league,row.verifiedGameId||row.eventId,row.playerId||row.player,
     canon(row.market),row.line,canon(row.side),canon(row.book)].join('|').toLowerCase();
    booksMerged.set(key,row);
   }
  }
 }
 // The TSO NHL published hazard ensemble is not a raw sportsbook implied rate.
 state.nhlModel=pairs[16]?.status==='fulfilled'&&pairs[16].value?.available?pairs[16].value:null;
 if(state.nhlModel?.games?.length){
  const now=Date.now(),generated=Date.parse(state.nhlModel.generatedAt||'');
  if(Number.isFinite(generated)&&generated<=now&&now-generated<=48*3600000){
   const games=new Map(state.nhlModel.games.map(g=>[String(g.gameId),g]));
   for(const [key,r] of booksMerged){
    if(r.sport!=='nhl'||Number(r.line)!==0.5
     ||!['firstGoal','anytimeGoal','goals'].includes(r.market))continue;
    const game=games.get(String(r.verifiedGameId||''));
    if(!game||Date.parse(game.startTime)!==Date.parse(r.commenceTime))continue;
    const athlete=game.players.find(p=>canon(p.name)===canon(r.player)
     &&(!r.playerId||String(p.playerId)===String(r.playerId))
     &&(!r.team||canon(p.team)===canon(r.team)));
    if(!athlete)continue;
    const p=r.market==='firstGoal'?num(athlete.firstGoalProbability):num(athlete.anytimeGoalProbability);
    if(p===null||p<0||p>1)continue;
    booksMerged.set(key,{...r,model:{probabilityPct:100*p,source:'TSO NHL FGS hazard ensemble',
     generatedAt:state.nhlModel.generatedAt,exactMatch:true,lineMatch:true,matchType:'game-player-market-0.5'},
     matchupEvidence:{position:athlete.position,opponent:athlete.opponent,defenseRank:athlete.defenseRank,
      goalsAllowedPerGame:athlete.allowedPerGame,recentGoals:athlete.recentGoals,
      recentGames:athlete.recentGames,goalieVerified:athlete.goalieVerified}});
   }
  }
 }
 state.props={...(state.props||{}),rows:[...booksMerged.values()]};
 state.nflError=[pairs[7],pairs[8],pairs[9]].filter(x=>x.status==='rejected').map(x=>String(x.reason?.message||'NFL feed')).join(' · ');
 state.nbaPending=false;
 state.pending=false;state.updated=Date.now();el('refreshBtn').disabled=false;render();
}
document.addEventListener('click',e=>{
 if(window.TSO3NflValidation?.click?.(e))return;
 if(window.TSO3NflProps?.click?.(e))return;
 if(window.TSO3NflLab?.click?.(e))return;
 if(window.TSO3NbaDepth?.click?.(e))return;
 if(window.TSO3NbaLab?.click?.(e))return;
 const toggle=e.target.closest('[data-sport-toggle]');
 if(toggle){const sport=toggle.dataset.sportToggle;state.openSport=state.openSport===sport?null:sport;renderSportNav();renderSportMenu();return}
 if(e.target.closest('[data-close-sport-menu]')){closeSportMenu();return}
 const nav=e.target.closest('[data-menu-nav]');
 if(nav){const sport=nav.dataset.menuNav,slug=nav.dataset.menuTool;const page=slug?'cheatsheets':nav.dataset.menuPage;
  const target='#/'+sport+'/'+page+(slug?'/'+slug:'');
  if(location.hash===target)route(sport,page,slug||null);
  else{location.hash=target;onHash()}
  return
 }
 if(state.openSport&&!e.target.closest('#sportMenu')&&!e.target.closest('#sportNav'))closeSportMenu();
 const pg=e.target.closest('[data-page]');if(pg){location.hash='#/'+state.sport+'/'+pg.dataset.page;onHash();return}
 const rosterPlayer=e.target.closest('[data-roster-player]');
 if(rosterPlayer){
  const athlete=gameRostersPlayers.get(rosterPlayer.dataset.rosterPlayer);
  if(athlete)void openFullPlayerDashboard(athlete);
  return;
 }
 const game=e.target.closest('[data-game]');if(game){state.page='games';state.game=game.dataset.game;state.tool=null;state.search='';history.replaceState(null,'','#/'+state.sport+'/games');render();return}
 const tool=e.target.closest('[data-tool]');if(tool){const slug=tool.dataset.tool;location.hash='#/'+state.sport+'/cheatsheets/'+slug;onHash();return}
 const back=e.target.closest('[data-back]');if(back){if(back.dataset.back==='game'){state.game=null;render()}else{location.hash='#/'+state.sport+'/cheatsheets';onHash()}return}
 const more=e.target.closest('[data-more]');if(more){state.maxRows+=60;render();return}
 const full=e.target.closest('[data-open-full-dashboard]');
 if(full){
  const row=state.selected;
  if(row)void openFullPlayerDashboard(row);
  return;
 }
 const direct=e.target.closest('[data-pd-open-id]');
 if(direct){
  const p=playerDirectory.get(playerDashboardKey(state.sport,direct.dataset.pdOpenId));
  if(p)void openFullPlayerDashboard(p);
  return;
 }
 const pdTab=e.target.closest('[data-pd-tab]');
 if(pdTab&&state.page==='player'){
  state.playerUI.tab=pdTab.dataset.pdTab;
  void refreshFullPlayerDashboard();
  return;
 }
 const targetRow=e.target.closest('[data-row-key]');
 if(targetRow){const r=state.displayedRows.get(targetRow.dataset.rowKey);if(e.target.closest('[data-save]'))save(r);else openDrawer(r);return}
 const remove=e.target.closest('[data-unsave]');if(remove){state.saved.delete(remove.dataset.unsave);remember();render();return}
 if(e.target.closest('#drawerSave'))save(state.selected);
 if(e.target.closest('#drawerClose2'))closeDrawer();
});
document.addEventListener('change',e=>{
 const playerOption=e.target.closest?.('[data-pd-setting]');
 if(playerOption&&state.page==='player'){
  const kind=playerOption.dataset.pdSetting;
  if(['metric','window','split','opponent','lineKey','phase'].includes(kind)){
   state.playerUI[kind]=playerOption.value;
   if(kind==='metric')state.playerUI.lineKey='';
   if(kind==='split'&&state.playerUI.split!=='opponent')state.playerUI.opponent='';
   refreshFullPlayerDashboard();
  }
  return;
 }
 if(e.target.id==='nhlDefensePosition'&&state.nhlDefense){
  state.nhlDefensePosition=e.target.value;
  const type=state.tool==='shots-on-goal'?'shots':'goals',slot=el('nhlDefenseSlot');
  if(slot)slot.innerHTML=renderNhlDefenseMatrix(state.nhlDefense,state.nhlDefensePosition,type);
  return;
 }
 if(e.target.id==='nhlHistoryMetric'&&state.selected){
  const key=String(state.selected.verifiedGameId||'')+':'+String(state.selected.verifiedAthleteId||state.selected.playerId||'');
  const doc=nhlDetailedCache.get(key)?.doc,slot=el('nhlResearchSlot');
  if(doc&&slot)slot.innerHTML=renderNhlPlayerResearch(doc,e.target.value);
  return;
 }
 if(e.target.id==='athleteDepthMetric'&&state.selected){
  const key=state.sport+':'+String(state.selected.verifiedAthleteId||state.selected.playerId||'')+':'+ATHLETE_SEASON[state.sport];
  const doc=athleteDepthCache.get(key),root=el('athleteDepthSlot');
  if(doc&&root)root.innerHTML=renderAthleteDepth(doc,state.selected,e.target.value);
  return;
 }
 const check=e.target.closest?.('[data-tso-check]');
 if(check){
  const kind=check.dataset.tsoCheck,field=kind==='markets'?'marketSelections':'bookSelections';
  const opened=kind==='markets'?'marketOpen':'bookOpen';
  if(!['markets','books'].includes(kind))return;
  if(check.value==='all')state[field]=[];
  else{
   const next=new Set(state[field]);
   if(check.checked)next.add(check.value);else next.delete(check.value);
   state[field]=[...next];
  }
  state[opened]=true;state.maxRows=40;render();
  return;
 }
 const match=e.target.closest?.('[data-global-matchup-check]');
 if(match){
  const val=match.dataset.globalMatchupCheck;
  if(val==='all')state.matchupIds=[];
  else{
   const selected=new Set(state.matchupIds);
   if(match.checked)selected.add(val);else selected.delete(val);
   state.matchupIds=[...selected];
  }
  state.matchupOpen=true;state.maxRows=40;
  render();
  el('globalMatchups').querySelector('[data-global-matchup-check="'+val+'"]')?.focus?.({preventScroll:true});
  return;
 }
 if(window.TSO3NflProps?.change?.(e))return;
 if(window.TSO3NflLab?.change?.(e))return;
 if(window.TSO3NbaDepth?.choose?.(e))return;
 window.TSO3NbaLab?.change?.(e);
});
document.addEventListener('input',e=>{if(window.TSO3NflProps?.input?.(e))return;if(window.TSO3NflLab?.input?.(e))return;if(window.TSO3NbaDepth?.input?.(e))return;window.TSO3NbaLab?.input?.(e)});
el('closeDrawer').addEventListener('click',closeDrawer);
el('scrim').addEventListener('click',closeDrawer);
el('savedBtn').addEventListener('click',()=>{location.hash='#/'+state.sport+'/saved'});
el('refreshBtn').addEventListener('click',()=>load(true));
el('search').addEventListener('input',e=>{state.search=e.target.value;state.maxRows=40;el('content').innerHTML=(state.page==='trends'?pageTrends():state.page==='games'&&state.game?pageGames():state.page==='overview'?overview():state.page==='cheatsheets'&&state.tool?toolDetail():section('Current selections','Filtered results')+tableMarkup(filteredRows()))});
for(const id of ['window','sort'])el(id).addEventListener('change',e=>{state[id]=e.target.value;state.maxRows=40;render()});
window.addEventListener('hashchange',onHash);
document.addEventListener('toggle',e=>{
 if(e.target.matches?.('[data-global-matchup-picker]'))state.matchupOpen=Boolean(e.target.open);
 if(e.target.matches?.('[data-tso-picker]'))state[e.target.dataset.tsoPicker==='markets'?'marketOpen':'bookOpen']=Boolean(e.target.open);
},true);
document.addEventListener('click',e=>{
 for(const [name,openField] of [['marketPicker','marketOpen'],['bookPicker','bookOpen']]){
  if(state[openField]&&!e.target.closest?.('#'+name)){
   const picker=el(name).querySelector('[data-tso-picker]');
   if(picker){picker.open=false;state[openField]=false}
  }
 }
 if(state.matchupOpen&&!e.target.closest?.('[data-global-matchup-picker]')){
  const picker=el('globalMatchups').querySelector('[data-global-matchup-picker]');
  if(picker){picker.open=false;state.matchupOpen=false}
 }
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(state.openSport!==null){closeSportMenu();el('sportNav').querySelector('[data-sport-toggle="'+state.sport+'"]')?.focus()}else closeDrawer()}});
const hash=location.hash.replace(/^#\/?/,'').split('/');
if(SPORTS[hash[0]]&&PAGES.some(x=>x[0]===hash[1])){state.sport=hash[0];state.page=hash[1];
 state.playerId=hash[1]==='player'&&/^\d{3,12}$/.test(hash[2]||'')?hash[2]:null;
 state.tool=hash[1]==='cheatsheets'&&SPORTS[hash[0]].tools.some(t=>menuToolSlug(t[0])===hash[2])?hash[2]:null}else location.hash='#/nfl/overview';
render();load(true);
setInterval(()=>{if(!document.hidden)load(false)},60000);
window.TSO3={state,SPORTS,PAGES,render,load,exactModel,recent,matchupTime,matchRowGame};
})();