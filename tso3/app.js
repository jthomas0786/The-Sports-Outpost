/* THE SPORTS OUTPOST 3.0 — original six-sport research shell.
   Uses only connected TSO data. No scraped/redistributed PropFinder records.
   A dash means not verified, never zero or a made-up model projection. */
(()=>{
'use strict';
const SPORTS={
 nfl:{label:'NFL',icon:'football',name:'National Football League',markets:['Player Passing Yards','Player Passing Touchdowns','Player Passing Attempts','Player Completions','Player Rushing Yards','Player Rushing Attempts','Player Receiving Yards','Player Receptions','Player Touchdowns','Player Longest Reception','Player Longest Rush','Player Targets'],tools:[['Defense vs Position','2026 defense against QB, RB, WR and TE'], ['Coverage Matchups','2026 receiver form vs opposing position groups'],['Touchdown Opportunities','Red zone, goal line and target share'],['Rushing Matchups','Carry volume and run defense'],['Receiving Matchups','Targets, routes and coverage'],['Quarterback Research','Attempts, depth and pressure'],['Red-Zone Usage','Inside-20 opportunities and conversion'],['Offensive Line Matchups','Run and pass protection'],['Power Ratings','Team strength and quarterback adjustments'],['Weather Impact','Wind, precipitation and playing surface'],['Game Projections','Spread, moneyline and totals'],['Model Validation','Archived accuracy and held-out First TD results']]},
 nba:{label:'NBA',icon:'basketball',name:'National Basketball Association',markets:['Points','Rebounds','Assists','3-Pointers Made','PRA','Points + Rebounds','Points + Assists','Rebounds + Assists','Steals','Blocks','First Basket'],tools:[['Player Form','Points, rebounds and assists trends'],['Matchup vs Position','Opponent production by player role'],['First Basket','Opening tip and first field-goal history'],['Pace & Possessions','Pace and expected opportunities'],['Minutes & Rotation','On-court availability and substitution patterns'],['Usage & Touches','Shot, assist and possession share'],['Team Stats','Offensive and defensive splits'],['Injury Impact','Available and missing rotation players'],['Game Projections','Model score and team totals']]},
 mlb:{label:'MLB',icon:'baseball',name:'Major League Baseball',markets:['Home Runs','Hits','Total Bases','RBIs','Runs','Hits + Runs + RBIs','Stolen Bases','Pitcher Strikeouts','Walks','Singles','Doubles'],tools:[['Home Run Matchups','Power, contact quality and pitcher tendencies'],['Exit Velocity','Batted-ball speed and launch profile'],['Pitch Mix','Pitch-type usage and batter splits'],['Pitcher vs Lineup','Projected opposing lineup profile'],['Strikeout Matchups','Pitcher K rates and batter swing tendencies'],['Stolen Bases','Attempt rate and catcher control'],['Bullpen Usage','Recent relief workloads'],['Pitcher Summary','Starter repertoire and workload'],['Weather & Park','Ballpark and conditions'],['Team vs Pitch Mix','Pitch-specific lineup strengths']]},
 nhl:{label:'NHL',icon:'hockey',name:'National Hockey League',markets:['Anytime Goal','First Goal','Shots on Goal','Points','Assists','Goalie Saves','Power Play Points'],tools:[['Goal Scorer Matchups','Shot quality and scoring opportunities'],['Skater Statistics','Usage, ice time and recent form'],['Team Statistics','Shots, possession and special teams'],['Shots on Goal','Volume and opponent allowances'],['Goalie Matchups','Expected starts and save environment'],['Power Play Analysis','Man-advantage unit usage'],['First Goal','First-goal history and opportunity'],['Game Projections','Moneyline, puckline and total']]},
 wnba:{label:'WNBA',icon:'basketball',name:"Women's National Basketball Association",markets:['Points','Rebounds','Assists','3-Pointers Made','PRA','Steals','Blocks'],tools:[['Player Trends','Last 5, 10, 20 and season'],['Matchup vs Position','Opponent positional allowances'],['Minutes & Usage','Rotations and offensive involvement'],['Pace & Possessions','Tempo-adjusted opportunity'],['Team Statistics','Recent offensive and defensive production'],['Injury Impact','Lineup availability'],['Game Projections','Game lines and totals']]},
 cfb:{label:'CFB',icon:'school',name:'College Football',markets:['Player Passing Yards','Player Passing Touchdowns','Player Rushing Yards','Player Rushing Attempts','Player Receiving Yards','Player Receptions','Player Touchdowns','Spread','Moneyline','Total Points'],tools:[['Player Trends','Recent passing, rushing and receiving results'],['Team Matchups','Offense against defensive scheme'],['Touchdown Matchups','Scoring opportunities and opponent yield'],['Power Ratings','FBS offense and defense strength'],['Game Projections','Model spread, total and win outcome'],['Quarterback Rankings','Passing and rushing quarterback trends'],['Conference Filters','Conference-specific analysis'],['Weather & Situational','Rest and game-day conditions']]}
};
const PAGES=[['overview','Overview','layout-dashboard'],['games','Games','calendar-days'],['props','Player Props','chart-no-axes-combined'],['trends','Trends','trending-up'],['cheatsheets','Cheatsheets','notebook-tabs'],['ratings','Power Ratings','gauge'],['projections','Projections','activity'],['injuries','Injuries','heart-pulse'],['data','Data Sources','database'],['saved','Saved Research','bookmark']];
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

const state={sport:'nfl',page:'overview',tool:null,game:null,search:'',market:'all',book:'all',matchupIds:[],matchupOpen:false,window:'l10',sort:'signal',maxRows:40,live:null,props:null,liveError:'',propsError:'',pending:false,updated:0,selected:null,saved:new Map(),displayedRows:new Map(),firstBasketCache:new Map(),openSport:null,nbaResearch:null,nbaModels:null,nbaInjuries:null,nbaOddsSnapshot:null,nflResearch:null,nflTD:null,nflOdds:null,nflSim:null,nflInjuries:null,nflWeather:null,nflWeatherError:'',nflWeatherFetched:0,nflWeatherPending:false,nflValidation:null,nflValidationError:'',nflValidationFetched:0,nflValidationPending:false,nflArchive:null,nflArchiveFetched:0,nflArchivePending:false,nflError:'',nbaError:'',nbaPending:true};
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
 let list=all.filter(r=>(state.market==='all'||canon(marketOf(r))===state.market)
  &&(state.book==='all'||canon(bookOf(r))===state.book)
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
  return '<a class="menu-link '+(selected?'selected':'')+'" href="#/'+sport+'/'+id+'" data-menu-nav="'+sport+'" data-menu-page="'+id+'"><span class="menu-link-icon">'+page[2]+'</span><span>'+text(page[1])+'</span>'+(selected?'<span class="menu-current">CURRENT</span>':'')+'</a>';
 }).join('');
 const toolLinks=data.tools.map(([name,description])=>{
  const slug=menuToolSlug(name),selected=sport===state.sport&&state.page==='cheatsheets'&&state.tool===slug;
  return '<a class="menu-tool-link '+(selected?'selected':'')+'" href="#/'+sport+'/cheatsheets/'+slug+'" data-menu-nav="'+sport+'" data-menu-tool="'+slug+'"><b>'+text(name)+'</b><small>'+text(description)+'</small></a>';
 }).join('');
 root.innerHTML='<div class="sport-menu-head"><span class="sport-menu-heading"><span class="menu-sport-icon">'+data.icon+'</span><span><strong>'+text(data.name)+'</strong><small>Choose a section or jump straight into a research tool</small></span></span><button type="button" data-close-sport-menu aria-label="Close '+data.label+' menu">✕</button></div>'
  +'<div class="sport-menu-grid"><section class="sport-menu-column"><h3>RESEARCH</h3>'+navLinks(['overview','games','props','trends','cheatsheets'])+'</section>'
  +'<section class="sport-menu-column"><h3>ANALYTICS</h3>'+navLinks(['ratings','projections','injuries','saved'])+'</section>'
  +'<section class="sport-menu-column sport-menu-specialty"><h3>'+data.label+' SPECIALTY TOOLS <span>'+data.tools.length+'</span></h3><div class="menu-tools">'+toolLinks+'</div></section></div>';
 root.hidden=false;
}
function closeSportMenu(){
 if(state.openSport!==null){state.openSport=null;renderSportNav();renderSportMenu()}
}
function renderSportNav(){
 el('sportNav').innerHTML=Object.entries(SPORTS).map(([k,v])=>{
  const open=state.openSport===k,active=state.sport===k;
  return '<button type="button" class="sport-button '+(active?'active ':'')+(open?'open':'')+'" data-sport-toggle="'+k+'" aria-expanded="'+open+'" aria-controls="sportMenu" aria-haspopup="true"><span class="sport-emoji" aria-hidden="true">'+v.icon+'</span><span>'+v.label+'</span><span class="sport-chevron" aria-hidden="true">⌄</span></button>';
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
 const currentMarket=mk.some(x=>canon(x)===state.market)?state.market:'all';
 const currentBook=books.some(x=>canon(x)===state.book)?state.book:'all';
 state.market=currentMarket;state.book=currentBook;
 el('market').innerHTML='<option value="all">All markets</option>'+mk.map(x=>'<option value="'+text(canon(x))+'" '+(canon(x)===currentMarket?'selected':'')+'>'+text(x)+'</option>').join('');
 el('book').innerHTML='<option value="all">All sportsbooks</option>'+books.map(x=>'<option value="'+text(canon(x))+'" '+(canon(x)===currentBook?'selected':'')+'>'+text(x)+'</option>').join('');
 el('window').value=state.window;el('sort').value=state.sort;el('search').value=state.search;
 el('globalMatchups').innerHTML=globalMatchupMarkup();
 el('toolbar').hidden=['games','cheatsheets','ratings','projections','injuries'].includes(state.page)&&!state.tool&&!state.game;
}
function section(title,subtitle){return '<div class="section-heading"><h2>'+text(title)+'</h2><small>'+text(subtitle||'')+'</small></div>'}
function empty(title,body){return '<div class="empty"><span class="empty-symbol">◇</span><h3>'+text(title)+'</h3><p>'+text(body)+'</p></div>'}
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
 return '<button class="tool-card" type="button" data-tool="'+text(code)+'"><div class="tool-top"><span class="tool-icon">'+['◈','⌁','▤','◇','▦','◉'][i%6]+'</span><div><h3>'+text(pair[0])+'</h3><p>'+text(pair[1])+'</p></div></div><footer><span class="tool-tag '+(ready?'':'pending')+'">'+(ready?'DATA VIEW AVAILABLE':'DATA INTEGRATION REQUIRED')+'</span><span class="arrow">↗</span></footer></button>';
}
function toolReady(name){
 if(state.sport==='nfl'&&name==='Model Validation')return Boolean(window.TSO3NflValidation);
 if(state.sport==='nfl'&&SPORTS.nfl.tools.some(x=>x[0]===name))return Boolean(state.nflResearch?.players||state.nflTD?.games||state.live?.games);
 if(state.sport==='nba'&&/^(Player Form|Matchup vs Position|Pace & Possessions|Minutes & Rotation|Usage & Touches|Team Stats|Injury Impact|Game Projections)$/.test(name))return name==='Injury Impact'?Boolean(state.nbaInjuries?.entries):Boolean(state.nbaResearch?.players);
 if(/First Basket/i.test(name))return state.sport==='nba'&&Boolean(state.live);
 if(/Player Form|Player Trends|Skater Statistics|Player Trends|Home Run Matchups|Shots on Goal|Receiving Matchups|Touchdown Opportunities/i.test(name))return Boolean(state.props);
 if(/Team Statistics|Team Stats|Game Projections|Team Matchups|Game Projections/i.test(name))return Boolean(state.live);
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
   +section('Player selections for this game','Exact matches only')+tableMarkup(rows);
 }
 return section('Game slate','Select any matchup; all sports share one interaction pattern')+gamesMarkup();
}
function toolDetail(){
 const found=SPORTS[state.sport].tools.find(x=>String(x[0]).toLowerCase().replace(/[^a-z0-9]+/g,'-')===state.tool);
 if(!found){state.tool=null;return pageTools()}
 const ready=toolReady(found[0]);
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
 return section('Saved research','Stored locally in this browser · not a sportsbook betslip')+'<div class="table-shell"><div class="table-scroller"><table class="data-table"><thead><tr><th>PLAYER</th><th>PROP</th><th>LINE</th><th>BOOK</th><th>QUOTE AT SAVE</th><th>REMOVE</th></tr></thead><tbody>'+rows.map((r,i)=>'<tr><td><strong>'+text(r.name)+'</strong></td><td>'+text(r.market)+'</td><td>'+text(r.side||'Over')+' '+text(r.line??'—')+'</td><td>'+text(r.book||'—')+'</td><td>'+text(signed(r.price))+'</td><td><button class="save-row active" data-unsave="'+text(r.key)+'">★</button></td></tr>').join('')+'</tbody></table></div></div>';
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
 el('hero').hidden=focusLab;
 el('quickStatus').hidden=focusLab;
 el('toolbar').hidden=focusLab||el('toolbar').hidden;
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
 else if(state.page==='props')body=section('Player prop explorer','Over / Yes markets only, no fabricated selections')+tableMarkup(filteredRows());
 else if(state.page==='trends')body=pageTrends();
 else if(state.page==='cheatsheets')body=pageTools();
 else if(state.page==='ratings')body=pageRatings();
 else if(state.page==='projections')body=pageModels();
 else if(state.page==='injuries')body=pageInjuries();
 else if(state.page==='saved')body=pageSaved();
 el('content').innerHTML=body;
 if(state.sport==='nfl'&&state.page==='cheatsheets'&&state.tool==='weather-impact'&&state.live?.games?.length)
  void hydrateNflWeather();
 if(state.sport==='nfl'&&state.page==='cheatsheets'&&state.tool==='model-validation'){
  void hydrateNflValidation();void hydrateNflArchive();
 }
 if(state.page==='games'&&state.game){
  const game=getGames().find(g=>gameKey(g)===state.game);
  if(game){
   void window.TSO3LiveBoxscore?.render?.(game,state.sport);
   if(state.sport==='nba')void hydrateFirstBasket(game);
  }
 }
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
 html+='<h3>What to validate</h3><div class="detail-tags"><span class="tag '+(model===null?'pending':'verified')+'">Exact line '+(model===null?'not modeled':'matched')+'</span><span class="tag '+(logs?'verified':'pending')+'">Observed game logs '+(logs?'verified':'pending')+'</span><span class="tag pending">Opponent positional split required</span><span class="tag pending">Confirmed lineup required</span></div>'
  +'<div class="drawer-actions"><button class="btn" id="drawerSave" type="button">'+(state.saved.has(rowKey(r))?'★ Remove from saved':'☆ Save selection')+'</button><button class="btn subtle" id="drawerClose2">Close</button></div></div>';
 el('drawerBody').innerHTML=html;el('drawer').hidden=false;el('scrim').hidden=false;el('closeDrawer').focus();
}
function closeDrawer(){el('drawer').hidden=true;el('scrim').hidden=true;state.selected=null}
function save(r){
 if(!r)return;const key=rowKey(r);
 if(state.saved.has(key))state.saved.delete(key);
 else state.saved.set(key,{key,sport:leagueOf(r),name:nameOf(r),market:marketOf(r),side:r.side,line:lineOf(r),price:r.price,book:bookOf(r),at:new Date().toISOString()});
 remember();render();if(!el('drawer').hidden&&state.selected)openDrawer(state.selected);
}
function route(sport,page,tool=null){
 if(!SPORTS[sport])sport='nfl';
 if(!PAGES.some(x=>x[0]===page))page='overview';
 const matched=page==='cheatsheets'&&SPORTS[sport].tools.some(t=>menuToolSlug(t[0])===tool)?tool:null;
 if(state.sport!==sport)state.matchupIds=[];
 state.matchupOpen=false;
 state.sport=sport;state.page=page;state.tool=matched;state.openSport=null;state.game=null;state.market='all';state.book='all';state.search='';state.maxRows=40;
 closeDrawer();render();el('main').scrollIntoView({block:'start'});
}
function onHash(){
 const [sport,page,tool]=location.hash.replace(/^#\/?/,'').split('/');
 if(!SPORTS[sport]||!PAGES.some(x=>x[0]===page)){location.hash='#/nfl/overview';return}
 const matched=page==='cheatsheets'&&SPORTS[sport].tools.some(t=>menuToolSlug(t[0])===tool)?tool:null;
 if(state.sport!==sport||state.page!==page||state.tool!==matched||state.openSport!==null)route(sport,page,matched);
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
  fetch('/api/nfl-injuries',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('NFL injuries HTTP '+r.status);return r.json()})
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
 state.nflInjuries=pairs[11].status==='fulfilled'&&Array.isArray(pairs[11].value?.entries)?pairs[11].value:null;
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
 const game=e.target.closest('[data-game]');if(game){state.page='games';state.game=game.dataset.game;state.tool=null;state.search='';history.replaceState(null,'','#/'+state.sport+'/games');render();return}
 const tool=e.target.closest('[data-tool]');if(tool){const slug=tool.dataset.tool;location.hash='#/'+state.sport+'/cheatsheets/'+slug;onHash();return}
 const back=e.target.closest('[data-back]');if(back){if(back.dataset.back==='game'){state.game=null;render()}else{location.hash='#/'+state.sport+'/cheatsheets';onHash()}return}
 const more=e.target.closest('[data-more]');if(more){state.maxRows+=60;render();return}
 const targetRow=e.target.closest('[data-row-key]');
 if(targetRow){const r=state.displayedRows.get(targetRow.dataset.rowKey);if(e.target.closest('[data-save]'))save(r);else openDrawer(r);return}
 const remove=e.target.closest('[data-unsave]');if(remove){state.saved.delete(remove.dataset.unsave);remember();render();return}
 if(e.target.closest('#drawerSave'))save(state.selected);
 if(e.target.closest('#drawerClose2'))closeDrawer();
});
document.addEventListener('change',e=>{
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
for(const id of ['market','book','window','sort'])el(id).addEventListener('change',e=>{state[id]=e.target.value;state.maxRows=40;render()});
window.addEventListener('hashchange',onHash);
document.addEventListener('toggle',e=>{
 if(e.target.matches?.('[data-global-matchup-picker]'))state.matchupOpen=Boolean(e.target.open);
},true);
document.addEventListener('click',e=>{
 if(state.matchupOpen&&!e.target.closest?.('[data-global-matchup-picker]')){
  const picker=el('globalMatchups').querySelector('[data-global-matchup-picker]');
  if(picker){picker.open=false;state.matchupOpen=false}
 }
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(state.openSport!==null){closeSportMenu();el('sportNav').querySelector('[data-sport-toggle="'+state.sport+'"]')?.focus()}else closeDrawer()}});
const hash=location.hash.replace(/^#\/?/,'').split('/');
if(SPORTS[hash[0]]&&PAGES.some(x=>x[0]===hash[1])){state.sport=hash[0];state.page=hash[1];state.tool=hash[1]==='cheatsheets'&&SPORTS[hash[0]].tools.some(t=>menuToolSlug(t[0])===hash[2])?hash[2]:null}else location.hash='#/nfl/overview';
render();load(true);
setInterval(()=>{if(!document.hidden)load(false)},60000);
window.TSO3={state,SPORTS,PAGES,render,load,exactModel,recent,matchupTime,matchRowGame};
})();