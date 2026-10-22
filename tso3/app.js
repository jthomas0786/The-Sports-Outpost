/* THE SPORTS OUTPOST 3.0 — original six-sport research shell.
   Uses only connected TSO data. No scraped/redistributed PropFinder records.
   A dash means not verified, never zero or a made-up model projection. */
(()=>{
'use strict';
const SPORTS={
 nfl:{label:'NFL',icon:'🏈',name:'National Football League',markets:['Player Passing Yards','Player Passing Touchdowns','Player Passing Attempts','Player Completions','Player Rushing Yards','Player Rushing Attempts','Player Receiving Yards','Player Receptions','Player Touchdowns','Player Longest Reception','Player Longest Rush','Player Targets'],tools:[['Coverage Matchups','Coverage, alignment, defensive assignments'],['Touchdown Opportunities','Red zone, goal line and target share'],['Rushing Matchups','Carry volume and run defense'],['Receiving Matchups','Targets, routes and coverage'],['Quarterback Research','Attempts, depth and pressure'],['Red-Zone Usage','Inside-20 opportunities and conversion'],['Offensive Line Matchups','Run and pass protection'],['Power Ratings','Team strength and quarterback adjustments'],['Weather Impact','Wind, precipitation and playing surface'],['Game Projections','Spread, moneyline and totals']]},
 nba:{label:'NBA',icon:'🏀',name:'National Basketball Association',markets:['Points','Rebounds','Assists','3-Pointers Made','PRA','Points + Rebounds','Points + Assists','Rebounds + Assists','Steals','Blocks','First Basket'],tools:[['Player Form','Points, rebounds and assists trends'],['Matchup vs Position','Opponent production by player role'],['First Basket','Opening tip and first field-goal history'],['Pace & Possessions','Pace and expected opportunities'],['Minutes & Rotation','On-court availability and substitution patterns'],['Usage & Touches','Shot, assist and possession share'],['Team Stats','Offensive and defensive splits'],['Injury Impact','Available and missing rotation players'],['Game Projections','Model score and team totals']]},
 mlb:{label:'MLB',icon:'⚾',name:'Major League Baseball',markets:['Home Runs','Hits','Total Bases','RBIs','Runs','Hits + Runs + RBIs','Stolen Bases','Pitcher Strikeouts','Walks','Singles','Doubles'],tools:[['Home Run Matchups','Power, contact quality and pitcher tendencies'],['Exit Velocity','Batted-ball speed and launch profile'],['Pitch Mix','Pitch-type usage and batter splits'],['Pitcher vs Lineup','Projected opposing lineup profile'],['Strikeout Matchups','Pitcher K rates and batter swing tendencies'],['Stolen Bases','Attempt rate and catcher control'],['Bullpen Usage','Recent relief workloads'],['Pitcher Summary','Starter repertoire and workload'],['Weather & Park','Ballpark and conditions'],['Team vs Pitch Mix','Pitch-specific lineup strengths']]},
 nhl:{label:'NHL',icon:'🏒',name:'National Hockey League',markets:['Anytime Goal','First Goal','Shots on Goal','Points','Assists','Goalie Saves','Power Play Points'],tools:[['Goal Scorer Matchups','Shot quality and scoring opportunities'],['Skater Statistics','Usage, ice time and recent form'],['Team Statistics','Shots, possession and special teams'],['Shots on Goal','Volume and opponent allowances'],['Goalie Matchups','Expected starts and save environment'],['Power Play Analysis','Man-advantage unit usage'],['First Goal','First-goal history and opportunity'],['Game Projections','Moneyline, puckline and total']]},
 wnba:{label:'WNBA',icon:'🏀',name:"Women's National Basketball Association",markets:['Points','Rebounds','Assists','3-Pointers Made','PRA','Steals','Blocks'],tools:[['Player Trends','Last 5, 10, 20 and season'],['Matchup vs Position','Opponent positional allowances'],['Minutes & Usage','Rotations and offensive involvement'],['Pace & Possessions','Tempo-adjusted opportunity'],['Team Statistics','Recent offensive and defensive production'],['Injury Impact','Lineup availability'],['Game Projections','Game lines and totals']]},
 cfb:{label:'CFB',icon:'🏟️',name:'College Football',markets:['Player Passing Yards','Player Passing Touchdowns','Player Rushing Yards','Player Rushing Attempts','Player Receiving Yards','Player Receptions','Player Touchdowns','Spread','Moneyline','Total Points'],tools:[['Player Trends','Recent passing, rushing and receiving results'],['Team Matchups','Offense against defensive scheme'],['Touchdown Matchups','Scoring opportunities and opponent yield'],['Power Ratings','FBS offense and defense strength'],['Game Projections','Model spread, total and win outcome'],['Quarterback Rankings','Passing and rushing quarterback trends'],['Conference Filters','Conference-specific analysis'],['Weather & Situational','Rest and game-day conditions']]}
};
const PAGES=[['overview','Overview','▦'],['games','Games','◉'],['props','Player Props','▤'],['trends','Trends','⌁'],['cheatsheets','Cheatsheets','▧'],['ratings','Power Ratings','◇'],['projections','Projections','◈'],['injuries','Injuries','✚'],['saved','Saved Research','☆']];
const el=id=>document.getElementById(id);
const text=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const num=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const canon=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const clock=t=>{const d=new Date(t||'');return Number.isFinite(d.getTime())?d.toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'}):'Time pending'};
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
const state={sport:'nfl',page:'overview',tool:null,game:null,search:'',market:'all',book:'all',window:'l10',sort:'signal',maxRows:40,live:null,props:null,liveError:'',propsError:'',pending:false,updated:0,selected:null,saved:new Map(),displayedRows:new Map(),firstBasketCache:new Map(),openSport:null,nbaResearch:null,nbaModels:null,nbaError:'',nbaPending:true};
try{const saved=JSON.parse(localStorage.getItem('tso3-saved')||'[]');if(Array.isArray(saved))saved.forEach(r=>{if(r?.key)state.saved.set(r.key,r)})}catch(_){}
function remember(){try{localStorage.setItem('tso3-saved',JSON.stringify([...state.saved.values()].slice(-200)))}catch(_){}}
function getGames(){return (Array.isArray(state.live?.games)?state.live.games:[]).filter(g=>g.league===state.sport)}
function getRows(){return (Array.isArray(state.props?.rows)?state.props.rows:[]).filter(r=>leagueOf(r)===state.sport)}
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
 if(state.game){const g=getGames().find(x=>gameKey(x)===state.game);if(g)list=list.filter(r=>String(r.gameId||r.eventId||'')===gameKey(g)
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
 const ready=Boolean(state.live||state.props);
 el('heroState').textContent=ready?'● VERIFIED SOURCE CONNECTED':'◦ FEEDS UNAVAILABLE';
 el('heroState').classList.toggle('ok',ready);
 el('sourceLight').classList.toggle('ok',ready);
 el('feedStatus').textContent=ready?'Real data available':'Feed pending / offline';
 el('savedCount').textContent=state.saved.size;
 el('todayLabel').textContent=new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'});
}
function renderMetrics(){
 const games=getGames(),rows=getRows().filter(eligible),exact=rows.filter(r=>exactModel(r)!==null).length,priced=rows.filter(r=>num(r.price)!==null).length;
 const stats=[['Games on feed',state.live?games.length:'—',state.live?'Observed scoreboard':'Scoreboard not connected'],['Over / Yes selections',state.props?rows.length:'—',state.props?'Current TSO lines':'Props feed unavailable'],['Exact model matches',state.props?exact:'—','Strict player / market / line'],['Book quotes',state.props?priced:'—','Available selected quotes']];
 el('quickStatus').innerHTML=stats.map(x=>'<div class="metric-card"><span>'+text(x[0])+'</span><strong>'+text(x[1])+'</strong><em>'+text(x[2])+'</em></div>').join('');
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
 el('toolbar').hidden=['games','cheatsheets','ratings','projections','injuries'].includes(state.page)&&!state.tool&&!state.game;
}
function section(title,subtitle){return '<div class="section-heading"><h2>'+text(title)+'</h2><small>'+text(subtitle||'')+'</small></div>'}
function empty(title,body){return '<div class="empty"><span class="empty-symbol">◇</span><h3>'+text(title)+'</h3><p>'+text(body)+'</p></div>'}
function gamesMarkup(limit){
 const games=getGames().filter(g=>g.state!=='post');
 if(!state.live)return empty('Games feed not connected',state.liveError||'TSO scoreboard is not accessible from this preview.');
 if(!games.length)return empty('No upcoming games in this feed','The current scoreboard contains no scheduled '+state.sport.toUpperCase()+' games. Historical games are not invented.');
 return '<div class="card-grid">'+games.slice(0,limit||99).map(g=>{
  const away=g.away||{},home=g.home||{},logo=t=>/^https:\/\//i.test(t.logo||'')?'<img src="'+text(t.logo)+'" alt="" loading="lazy">':'<b>'+text(t.abbr||'—')+'</b>';
  return '<button class="game-card" type="button" data-game="'+text(gameKey(g))+'"><div class="game-meta"><span>'+text(state.sport.toUpperCase())+' · '+text(g.state==='in'?'LIVE':'UPCOMING')+'</span><span>'+text(clock(g.startTime))+'</span></div>'
   +'<div class="game-matchup"><div class="game-side">'+logo(away)+'<b>'+text(away.abbr||'—')+'</b><small>AWAY</small></div><span>AT</span><div class="game-side">'+logo(home)+'<b>'+text(home.abbr||'—')+'</b><small>HOME</small></div></div>'
   +'<div class="game-bottom"><span>'+text(g.venue||'MATCHUP DETAILS')+'</span><span>EXPLORE ↗</span></div></button>'
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
  +'<td><button class="save-row '+(saved?'active':'')+'" type="button" aria-label="'+(saved?'Remove saved prop':'Save prop')+'" data-save="'+i+'">'+(saved?'★':'☆')+'</button></td></tr>';
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
 if(state.sport==='nba'&&/^(Player Form|Matchup vs Position)$/.test(name))return Boolean(state.nbaResearch?.players);
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
   +(state.sport==='nba'?'<section class="tool-panel fb-inline"><h3>First Basket / Opening Tip</h3><p>Verified recent tip wins, first made field goals and current-roster player participation. Observed history, not a calibrated betting probability.</p><div id="fbDetail">Retrieving verified NBA opening-event history…</div></section>':'')
   +section('Player selections for this game','Exact matches only')+tableMarkup(rows);
 }
 return section('Game slate','Select any matchup; all sports share one interaction pattern')+gamesMarkup();
}
function toolDetail(){
 const found=SPORTS[state.sport].tools.find(x=>String(x[0]).toLowerCase().replace(/[^a-z0-9]+/g,'-')===state.tool);
 if(!found){state.tool=null;return pageTools()}
 const ready=toolReady(found[0]);
 if(state.sport==='nba'&&['Player Form','Matchup vs Position'].includes(found[0])){
  const lab=window.TSO3NbaLab;
  const ctx={sport:state.sport,tool:state.tool,games:state.live?.games||[],props:state.props,models:state.nbaModels,research:state.nbaResearch,error:state.nbaPending?'Retrieving verified player data…':state.nbaError};
  return lab?'<div id="nbaLabSlot">'+lab.render(ctx,state.tool)+'</div>':empty('NBA research module unavailable','The NBA analytics script did not load. Refresh the preview.');
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
function render(){
 state.displayedRows.clear();
 renderNav();renderMetrics();renderFilters();
 let body='';
 if(state.page==='overview')body=overview();
 else if(state.page==='games')body=pageGames();
 else if(state.page==='props')body=section('Player prop explorer','Over / Yes markets only, no fabricated selections')+tableMarkup(filteredRows());
 else if(state.page==='trends')body=pageTrends();
 else if(state.page==='cheatsheets')body=pageTools();
 else if(state.page==='ratings')body=pageRatings();
 else if(state.page==='projections')body=pageModels();
 else if(state.page==='injuries')body=pageInjuries();
 else if(state.page==='saved')body=pageSaved();
 el('content').innerHTML=body;
 if(state.page==='games'&&state.game&&state.sport==='nba'){
  const game=getGames().find(g=>gameKey(g)===state.game);
  if(game)void hydrateFirstBasket(game);
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
 state.sport=sport;state.page=page;state.tool=matched;state.openSport=null;state.game=null;state.market='all';state.book='all';state.search='';state.maxRows=40;
 closeDrawer();render();el('main').scrollIntoView({block:'start'});
}
function onHash(){
 const [sport,page,tool]=location.hash.replace(/^#\/?/,'').split('/');
 if(!SPORTS[sport]||!PAGES.some(x=>x[0]===page)){location.hash='#/nfl/overview';return}
 const matched=page==='cheatsheets'&&SPORTS[sport].tools.some(t=>menuToolSlug(t[0])===tool)?tool:null;
 if(state.sport!==sport||state.page!==page||state.tool!==matched||state.openSport!==null)route(sport,page,matched);
}
async function load(force=false){
 if(state.pending)return;
 if(!force&&Date.now()-state.updated<30000)return;
 state.pending=true;el('refreshBtn').disabled=true;
 const pairs=await Promise.allSettled([
  fetch('/api/live?league=all',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Scoreboard HTTP '+r.status);return r.json()}),
  fetch('/api/props?league=all',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Props HTTP '+r.status);return r.json()}),
  fetch('/api/nba-research',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('NBA history HTTP '+r.status);return r.json()}),
  fetch('/api/nba-models',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('NBA model HTTP '+r.status);return r.json()})
 ]);
 if(pairs[0].status==='fulfilled'&&Array.isArray(pairs[0].value.games)){state.live=pairs[0].value;state.liveError=''}
 else state.liveError=String(pairs[0].reason?.message||'Scoreboard feed missing');
 if(pairs[1].status==='fulfilled'&&Array.isArray(pairs[1].value.rows)){state.props=pairs[1].value;state.propsError=''}
 else state.propsError=String(pairs[1].reason?.message||'Props feed missing');
 if(pairs[2].status==='fulfilled'&&pairs[2].value?.players){state.nbaResearch=pairs[2].value;state.nbaError=''}
 else {state.nbaError=String(pairs[2].reason?.message||'NBA history source missing')}
 if(pairs[3].status==='fulfilled'&&Array.isArray(pairs[3].value?.models))state.nbaModels=pairs[3].value;
 state.nbaPending=false;
 state.pending=false;state.updated=Date.now();el('refreshBtn').disabled=false;render();
}
document.addEventListener('click',e=>{
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
document.addEventListener('change',e=>{window.TSO3NbaLab?.change?.(e)});
document.addEventListener('input',e=>{window.TSO3NbaLab?.input?.(e)});
el('closeDrawer').addEventListener('click',closeDrawer);
el('scrim').addEventListener('click',closeDrawer);
el('savedBtn').addEventListener('click',()=>{location.hash='#/'+state.sport+'/saved'});
el('refreshBtn').addEventListener('click',()=>load(true));
el('search').addEventListener('input',e=>{state.search=e.target.value;state.maxRows=40;el('content').innerHTML=(state.page==='trends'?pageTrends():state.page==='games'&&state.game?pageGames():state.page==='overview'?overview():state.page==='cheatsheets'&&state.tool?toolDetail():section('Current selections','Filtered results')+tableMarkup(filteredRows()))});
for(const id of ['market','book','window','sort'])el(id).addEventListener('change',e=>{state[id]=e.target.value;state.maxRows=40;render()});
window.addEventListener('hashchange',onHash);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(state.openSport!==null){closeSportMenu();el('sportNav').querySelector('[data-sport-toggle="'+state.sport+'"]')?.focus()}else closeDrawer()}});
const hash=location.hash.replace(/^#\/?/,'').split('/');
if(SPORTS[hash[0]]&&PAGES.some(x=>x[0]===hash[1])){state.sport=hash[0];state.page=hash[1];state.tool=hash[1]==='cheatsheets'&&SPORTS[hash[0]].tools.some(t=>menuToolSlug(t[0])===hash[2])?hash[2]:null}else location.hash='#/nfl/overview';
render();load(true);
setInterval(()=>{if(!document.hidden)load(false)},60000);
window.TSO3={state,SPORTS,PAGES,render,load,exactModel,recent};
})();