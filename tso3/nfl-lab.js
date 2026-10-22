/* TSO 3.0 NFL research: compact table-first, official game identity and actual TSO ATD model. */
(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const num=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const tools=['coverage-matchups','touchdown-opportunities','rushing-matchups','receiving-matchups','quarterback-research',
 'red-zone-usage','offensive-line-matchups','power-ratings','weather-impact','game-projections'];
const titles={
 'coverage-matchups':'COVERAGE & RECEIVER RESEARCH',
 'touchdown-opportunities':'ANYTIME TOUCHDOWN PROJECTIONS',
 'rushing-matchups':'RUSHING RESEARCH',
 'receiving-matchups':'RECEIVING RESEARCH',
 'quarterback-research':'QUARTERBACK RESEARCH',
 'red-zone-usage':'RED-ZONE TOUCHDOWN OPPORTUNITIES',
 'offensive-line-matchups':'OFFENSIVE LINE MATCHUPS',
 'power-ratings':'NFL TEAM RATINGS',
 'weather-impact':'GAME-DAY WEATHER & VENUES',
 'game-projections':'NFL GAME PROJECTIONS'
};
const notes={
 'coverage-matchups':'Verified route, target and receiver output where available. Individual coverage alignment and cornerback assignments require a tracking-grade source; never inferred.',
 'touchdown-opportunities':'TSO regressed anytime-rushing/receiving-touchdown estimates, 2025 production baseline and 2026 roster/availability context. Passing TDs do not count as quarterback ATDs.',
 'rushing-matchups':'Current NFL player history, carries, rush yards, rushing TDs, recent volume and exact verified sportsbook lines.',
 'receiving-matchups':'Verified target volume, receptions, yards, target share and season game logs. Coverage assignment grades are not inferred.',
 'quarterback-research':'Verified passing attempts, completions, passing yards, passing touchdowns, game logs and opponent context.',
 'red-zone-usage':'Historical goal-line and red-zone targets/carries, 2026 depth roles and opponent red-zone touchdown defense.',
 'offensive-line-matchups':'Official opponent and available team context. Independent pass-block and run-block win rates are not connected; no fabricated grades.',
 'power-ratings':'Current official team records and game slate. TSO has not verified a calibrated team power-rating input for this page.',
 'weather-impact':'Official schedule, venue and indoor/outdoor status when the original TSO NFL slate reports it. Weather forecasts are not inferred from stadium location.',
 'game-projections':'Current official NFL matchups matched to TSO Monte Carlo simulations. Estimated team scores, win probabilities, spread and total shown only for current verified model runs.'
};
const columns={
 'touchdown-opportunities':['PLAYER','MATCHUP','ATD PROBABILITY','TSO GRADE','OPPORTUNITY / GM','SNAP %','OPP RZ TD RATE','BEST ATD ODDS'],
 'red-zone-usage':['PLAYER','MATCHUP','RZ CARRIES','RZ TARGETS','RZ / GM','OPP RZ TD %','DEPTH','TSO ATD'],
 'rushing-matchups':['PLAYER','MATCHUP','L5 RUSH YDS','L10 RUSH YDS','L5 CARRIES','2026 YDS / GM','L5 RUSH TD','BEST BOOK'],
 'receiving-matchups':['PLAYER','MATCHUP','L5 REC YDS','L10 REC YDS','L5 TARGETS','L5 RECEPTIONS','TARGET SHARE','BEST BOOK'],
 'coverage-matchups':['PLAYER','MATCHUP','L5 TARGETS','L5 RECEPTIONS','L5 REC YDS','TARGET SHARE','POSITION','COVERAGE GRADE'],
 'quarterback-research':['PLAYER','MATCHUP','L5 PASS YDS','L5 ATTEMPTS','L5 COMPLETIONS','L5 PASS TD','2026 PASS YDS / GM','BEST BOOK'],
 'offensive-line-matchups':['MATCHUP','KICKOFF','AWAY TEAM','HOME TEAM','PASS BLOCK GRADE','RUN BLOCK GRADE','PRESSURE RATE','SOURCE STATUS'],
 'power-ratings':['MATCHUP','KICKOFF','AWAY RECORD','HOME RECORD','POWER RATING','INJURY CONTEXT','GAME STATUS','SOURCE STATUS'],
 'weather-impact':['MATCHUP','KICKOFF','VENUE','INDOOR','FORECAST WIND','PRECIPITATION','TEMP','SOURCE STATUS'],
 'game-projections':['MATCHUP','KICKOFF','AWAY WIN %','HOME WIN %','AWAY SCORE','HOME SCORE','SPREAD / TOTAL','SIM WORLDS']
};
const historyTool={
 'rushing-matchups':'rushYds','receiving-matchups':'recYds','coverage-matchups':'targets','quarterback-research':'passYds',
 'touchdown-opportunities':'tds','red-zone-usage':'tds'
};
const state={tool:'touchdown-opportunities',games:[],positions:[],search:'',minGames:0,sort:'model',reverse:false,open:{games:false,positions:false},max:90,all:[],visible:[],context:null,selected:null,version:null};
const modelTools=new Set(['touchdown-opportunities','red-zone-usage']);
const gameTools=new Set(['offensive-line-matchups','power-ratings','weather-impact','game-projections']);
const asof=raw=>{const d=new Date(raw||'');return Number.isFinite(d.getTime())?d.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'})+' CT':'unavailable'};
const when=raw=>{const d=new Date(raw||'');return Number.isFinite(d.getTime())?d.toLocaleString('en-US',{weekday:'short',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'})+' CT':'—'};
const f=v=>num(v)===null?'—':Number(v).toFixed(1);
const fmtPrice=v=>num(v)===null?'—':(v>0?'+':'')+Number(v);
const percent=v=>num(v)===null?'—':(Number(v)*100).toFixed(1)+'%';
const canonicalTeam=t=>({LAR:'LA',WSH:'WAS',JAX:'JAC',GNB:'GB',SFO:'SF'}[String(t||'').toUpperCase()]||String(t||'').toUpperCase());
function matchGame(doc,team){
 const now=Date.now();
 return (doc?.games||[]).filter(g=>g.state!=='post'&&Date.parse(g.startTime)>now-15*60000
  &&[g.home?.abbr,g.away?.abbr].map(canonicalTeam).includes(canonicalTeam(team)))
  .sort((a,b)=>Date.parse(a.startTime)-Date.parse(b.startTime))[0]||null;
}
function upcoming(doc){
 return (doc?.games||[]).filter(g=>g.league==='nfl'&&g.state!=='post'
  &&Date.parse(g.startTime)>Date.now()-15*60000)
  .sort((a,b)=>Date.parse(a.startTime)-Date.parse(b.startTime));
}
function findResearch(ctx,p){
 const players=ctx.research?.players||[];
 return players.find(x=>p.id&&String(x.id)===String(p.id))
  ||players.find(x=>norm(x.name)===norm(p.name)&&canonicalTeam(x.team)===canonicalTeam(p.team))
  ||null;
}
function avg(logs,key,n=5,season=null){
 const xs=(logs||[]).filter(g=>season===null||Number(g.season)===Number(season))
 .slice(0,n===Infinity?undefined:n)
 .map(g=>num(g[key])).filter(x=>x!==null);
 return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
}
function tdHit(logs,n=5,season=null){
 const xs=(logs||[]).filter(g=>season===null||Number(g.season)===Number(season)).slice(0,n);
 return xs.length?{hits:xs.filter(g=>(num(g.rushTds)||0)+(num(g.recTds)||0)>0).length,n:xs.length}:null;
}
function bestQuote(ctx,game,player,market){
 if(!game)return null;
 const rows=ctx.odds?.rows||[];
 const matches=rows.filter(x=>String(x.verifiedGameId)===String(game.id)
  &&norm(x.player)===norm(player.name)&&x.market===market);
 return matches.sort((a,b)=>Number(b.price)-Number(a.price))[0]||null;
}
function build(ctx,tool){
 const games=upcoming(ctx),slate=ctx.td?.games||[];
 if(gameTools.has(tool))return games.map(g=>{
  const original=slate.find(x=>String(x.id)===String(g.id));
  return {id:g.id,game:g,original,sim:ctx.sim?.games?.find(x=>String(x.id)===String(g.id))||null,kind:'game',name:(g.away?.abbr||'AWAY')+' @ '+(g.home?.abbr||'HOME')};
 });
 const all=slate.flatMap(g=>(g.players||[]).map(p=>({p,g})));
 const modeled=new Map();
 for(const rec of all)modeled.set(String(rec.g.id)+'|'+norm(rec.p.name),rec.p);
 const result=[],seen=new Set(),modeledData=ctx.td?.modelFresh===true;
 const real=ctx.research?.players||[];
 for(const player of real){
  if(!player?.name||!player?.team)continue;
  const game=matchGame(ctx,player.team);if(!game)continue;
  const mid=String(game.id)+'|'+norm(player.name);
  const m=modeled.get(mid)||null;
  const key=game.id+'|'+norm(player.name);
  if(seen.has(key))continue;seen.add(key);
  const pos=String(player.position||m?.position||'').toUpperCase();
  if(tool==='quarterback-research'&&pos!=='QB')continue;
  if(tool==='rushing-matchups'&&!['QB','RB','WR'].includes(pos))continue;
  if(['receiving-matchups','coverage-matchups'].includes(tool)&&!['WR','TE','RB'].includes(pos))continue;
  if(modelTools.has(tool)&&!['RB','WR','TE','QB'].includes(pos))continue;
  const logs=(player.logs||[]).filter(l=>Number(l.season)===Number(ctx.research?.season)||Number(l.season)===Number(ctx.research?.previousSeason))
   .sort((a,b)=>Number(b.season)-Number(a.season)||Number(b.week)-Number(a.week));
  const quote=bestQuote(ctx,game,player,tool==='touchdown-opportunities'?'atd':tool==='rushing-matchups'?'rushYds':tool==='quarterback-research'?'passYds':'recYds');
  result.push({id:key,kind:'player',name:player.name,team:canonicalTeam(player.team),position:pos,
   p:player,m,game,quote,logs,modelProbability:modeledData?num(m?.modelProbability):null});
 }
 // Model-only players absent from research should remain visible, but no historical logs are inferred.
 if(modelTools.has(tool)){
  for(const rec of all){
   const game=games.find(g=>g.id===rec.g.id);if(!game)continue;
   const key=game.id+'|'+norm(rec.p.name);
   if(seen.has(key))continue;seen.add(key);
   const p=rec.p;
   result.push({id:key,kind:'player',name:p.name,team:canonicalTeam(p.team),position:p.position||'',
     p:null,m:p,game,quote:bestQuote(ctx,game,p,'atd'),logs:[],
     modelProbability:modeledData?num(p.modelProbability):null});
  }
 }
 return result;
}
function getFiltered(){
 const q=state.search.toLowerCase().trim();
 let list=state.all.filter(r=>
  (!state.games.length||state.games.includes(String(r.game?.id||'')))
  &&(r.kind==='game'||!state.positions.length||state.positions.includes(r.position))
  &&(r.kind==='game'||!state.minGames||r.logs.length>=state.minGames)
  &&(!q||[r.name,r.team,r.position,r.game?.away?.abbr,r.game?.home?.abbr].join(' ').toLowerCase().includes(q)));
 const metric=state.tool,primary=r=>{
  if(metric==='touchdown-opportunities')return r.modelProbability;
  if(metric==='red-zone-usage')return (num(r.m?.rzCarries)||0)+(num(r.m?.rzTargets)||0);
  if(['rushing-matchups','receiving-matchups','coverage-matchups','quarterback-research'].includes(metric))
   return avg(r.logs,historyTool[metric],5);
  return Date.parse(r.game?.startTime||'');
 };
 list.sort((a,b)=>{const av=primary(a),bv=primary(b);if(av===null&&bv===null)return a.name.localeCompare(b.name);
  if(av===null)return 1;if(bv===null)return -1;return (state.reverse?av-bv:bv-av)||a.name.localeCompare(b.name)});
 state.visible=list;return list;
}
function selectBox(kind,data){
 const chosen=state[kind],label=kind==='games'?'MATCHUPS':'POSITION';
 const textValue=chosen.length?chosen.length+(kind==='games'?' games':' positions'):'All '+(kind==='games'?'Matchups':'Positions');
 const options=[['all','All '+(kind==='games'?'Matchups':'Positions')],...data];
 return '<div class="matchup-filter nfl-select"><span class="matchup-label">'+label+'</span><details class="matchup-picker" data-nfl-picker="'+kind+'" '+(state.open[kind]?'open':'')+'>'
  +'<summary class="matchup-trigger"><span class="matchup-trigger-text">'+esc(textValue)+'</span><span class="matchup-chevron"></span></summary>'
  +'<div class="matchup-options" role="group" aria-label="NFL '+label+'">'+options.map(([id,title])=>
   '<label class="matchup-option"><input type="checkbox" data-nfl-check="'+kind+'" data-nfl-value="'+esc(id)+'" '+((id==='all'?!chosen.length:chosen.includes(id))?'checked':'')+'><span>'+esc(title)+'</span></label>'
  ).join('')+'</div></details></div>';
}
const tdClass=p=>num(p)!==null&&p>=.45?'nfl-high':num(p)!==null&&p>=.3?'nfl-medium':'';
const nameCell=r=>'<td><div class="nfl-player"><b>'+esc(r.name)+'</b><small>'+esc(r.team)+' · '+esc(r.position)+(r.p?.depthRank?' · '+esc(r.p.depthRank):'')+'</small></div></td>';
const matchCell=r=>'<td><b>'+esc(r.game?.away?.abbr||'—')+' @ '+esc(r.game?.home?.abbr||'—')+'</b><small>'+esc(when(r.game?.startTime))+'</small></td>';
const statCell=(n,hint='')=>'<td><b>'+f(n)+'</b>'+(hint?'<small>'+esc(hint)+'</small>':'')+'</td>';
function row(r){
 if(r.kind==='game'){
  const g=r.game,venue=r.original?.venue||'';
  const values={
   'offensive-line-matchups':[r.name,when(g.startTime),g.away?.name||'—',g.home?.name||'—','—','—','—','Not sourced'],
   'power-ratings':[r.name,when(g.startTime),g.away?.record||'—',g.home?.record||'—','—','—',g.state,'Not rated'],
   'weather-impact':[r.name,when(g.startTime),venue||g.venue||'—',r.original?.indoor===true?'Indoor':r.original?.indoor===false?'Outdoor':'—','—','—','—','Forecast unavailable'],
   'game-projections':[r.name,when(g.startTime),
    r.sim?.awayWin==null?'—':percent(r.sim.awayWin),r.sim?.homeWin==null?'—':percent(r.sim.homeWin),
    r.sim?.awayPoints==null?'—':f(r.sim.awayPoints),r.sim?.homePoints==null?'—':f(r.sim.homePoints),
    r.sim?.total?.line!=null?('TOTAL '+r.sim.total.line+' · HOME '+(r.sim.spread?.homeLine??'—')):'—',
    r.sim?Number(r.sim.iterations).toLocaleString():'No verified model']
  }[state.tool]||[];
  return '<tr data-nfl-row="'+esc(r.id)+'">'+values.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>';
 }
 const season=r.p?.currentSeason,atd=r.modelProbability,quote=r.quote;
 const logs=r.logs||[],latest=logs.slice(0,5);
 const projected=atd===null?'—':percent(atd);
 const isTD=state.tool==='touchdown-opportunities';
 let cells=[];
 if(isTD)cells=[{html:'<b class="'+tdClass(atd)+'">'+projected+'</b><small>'+esc(r.m?.confidence||'')+'</small>'},
  {text:r.m?.modelGrade||'—'}, {text:f(r.m?.opportunityRate)},
  {text:percent(r.m?.snapShare)}, {text:percent(r.m?.opponentRzTdRate)},
  {html:'<b>'+esc(fmtPrice(quote?.price))+'</b><small>'+esc(quote?.book||'NO VERIFIED BOOK')+'</small>'}];
 else if(state.tool==='red-zone-usage')cells=[{text:r.m?.rzCarries??'—'},{text:r.m?.rzTargets??'—'},
  {text:f(r.m?.opportunityRate)},{text:percent(r.m?.opponentRzTdRate)},
  {text:r.p?.depthRank||r.m?.depthRank||'—'},{html:'<b class="'+tdClass(atd)+'">'+projected+'</b>'}];
 else if(state.tool==='rushing-matchups')cells=[{text:f(avg(logs,'rushYds',5))},{text:f(avg(logs,'rushYds',10))},
  {text:f(avg(logs,'carries',5))},{text:f(season?.perGame?.rushYds)},
  {text:f(avg(logs,'rushTds',5))},{text:fmtPrice(quote?.price)}];
 else if(state.tool==='quarterback-research')cells=[{text:f(avg(logs,'passYds',5))},{text:f(avg(logs,'attempts',5))},
  {text:f(avg(logs,'completions',5))},{text:f(avg(logs,'passTds',5))},
  {text:f(season?.perGame?.passYds)},{text:fmtPrice(quote?.price)}];
 else if(state.tool==='coverage-matchups')cells=[{text:f(avg(logs,'targets',5))},
  {text:f(avg(logs,'receptions',5))},{text:f(avg(logs,'recYds',5))},
  {text:season?.targetShare==null?'—':f(season.targetShare)+'%'},{text:r.position},{text:'—'}];
 else cells=[{text:f(avg(logs,'recYds',5))},{text:f(avg(logs,'recYds',10))},
  {text:f(avg(logs,'targets',5))},{text:f(avg(logs,'receptions',5))},
  {text:season?.targetShare==null?'—':f(season.targetShare)+'%'},{text:fmtPrice(quote?.price)}];
 return '<tr data-nfl-row="'+esc(r.id)+'">'+nameCell(r)+matchCell(r)+cells.map(c=>'<td>'+(c.html||'<b>'+esc(c.text)+'</b>')+'</td>').join('')+'</tr>';
}
function render(ctx,tool){
 if(!tools.includes(tool))return '';
 state.tool=tool;state.context=ctx;
 const signature=[tool,ctx.research?.generatedAt,ctx.td?.generatedAt,ctx.odds?.fetchedAt,ctx.sim?.generatedAt,(ctx.games||[]).map(g=>g.id+':'+g.startTime).join(',')].join('|');
 if(state.version!==signature){state.version=signature;state.all=build(ctx,tool);state.max=90;
  state.games=[];state.positions=[];state.minGames=0}
 const games=upcoming(ctx),gameOptions=games.map(g=>[String(g.id),
  (g.away?.abbr||'AWAY')+' @ '+(g.home?.abbr||'HOME')+' · '+when(g.startTime)]);
 const source='<div class="nba-depth-source">NFL OFFICIAL SLATE · '+games.length+' UPCOMING GAMES'
  +' · PLAYER RESEARCH '+esc(asof(ctx.research?.generatedAt))
  +' · TSO TD MODEL '+esc(asof(ctx.td?.generatedAt))
  +' · BOOKS '+esc(asof(ctx.odds?.fetchedAt))
  +(tool==='game-projections'?' · 50K SIM '+esc(asof(ctx.sim?.generatedAt)):'')+'</div>';
 const modelAlert=ctx.td?.modelFresh===false?'TD MODEL SNAPSHOT EXPIRED — probabilities hidden until refreshed.':
  ctx.td?.modelFresh===true?'TSO ATD estimates use 2025 NFL scoring and red-zone history adjusted for 2026 roster and matchup context.':
  'Verified current NFL touchdown model unavailable.';
 const list=getFiltered().slice(0,state.max);
 const controls='<div class="nba-controls nfl-controls">'+selectBox('games',gameOptions)
  +(gameTools.has(tool)?'':selectBox('positions',['QB','RB','WR','TE'].map(x=>[x,x])))
  +'<label>MIN GAMES<select data-nfl-min>'+[0,3,5,10].map(x=>'<option value="'+x+'" '+(state.minGames===x?'selected':'')+'>'+(x?x+'+ game logs':'Any sample')+'</option>').join('')+'</select></label>'
  +'<label class="nba-search-label">SEARCH<input data-nfl-search placeholder="Player or team" value="'+esc(state.search)+'"></label>'
  +'<button type="button" class="nba-sort-direction" data-nfl-sort title="Reverse sorting">'+(state.reverse?'↑':'↓')+'</button></div>';
 return '<section class="nba-lab nfl-lab"><div class="nba-intro"><div><span class="nba-eyebrow">THE SPORTS OUTPOST / NFL VERIFIED RESEARCH</span><h2>'+esc(titles[tool])+'</h2><p>'+esc(notes[tool])+'</p></div></div>'
 +source+(modelTools.has(tool)?'<p class="nfl-model-note">'+esc(modelAlert)+'</p>':'')
 +controls+'<div class="nba-table-scroll"><table class="nba-table nfl-table"><thead><tr>'
 +columns[tool].map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'
 +(list.map(row).join('')||'<tr><td colspan="8">No verified records meet these filters. Missing data is never filled with simulated stats.</td></tr>')
 +'</tbody></table></div><div class="nba-table-foot"><span>'+list.length+' shown of '+state.visible.length+' verified rows · click any row for details</span>'
 +(list.length<state.visible.length?'<button data-nfl-more type="button">SHOW MORE →</button>':'')+'</div>'
 +'<p class="nba-footnote">Data sources: current ESPN NFL scoreboards and 2026 rosters; nflverse verified player game logs (CC BY 4.0); the existing TSO regressed 2025-baseline anytime-touchdown model; ParlayAPI time-limited sportsbook snapshots where available. No sportsbook odds, model percentages, opponent coverage ratings, or forecast measurements are fabricated.</p></section>';
}
function detail(r,ctx){
 if(r.kind==='game')return '<div class="drawer-contents"><h2>'+esc(r.name)+'</h2><p>'+esc(when(r.game.startTime))+'</p><h3>Verified TSO Monte Carlo</h3>'
  +'<div class="nfl-detail-grid"><div><small>AWAY WIN</small><b>'+percent(r.sim?.awayWin)+'</b></div><div><small>HOME WIN</small><b>'+percent(r.sim?.homeWin)+'</b></div>'
  +'<div><small>AWAY AVG PTS</small><b>'+f(r.sim?.awayPoints)+'</b></div><div><small>HOME AVG PTS</small><b>'+f(r.sim?.homePoints)+'</b></div></div>'
  +'<p>Simulation run: '+esc(asof(r.sim?.runAt))+' · '+esc(r.sim?.iterations||'—')+' worlds. If missing, the saved TSO model is not verified for this event.</p>'
  +'<p>Weather, tracking grades and specialist ratings are not fabricated.</p></div>';
 const stats=[['L5 rushing yards',avg(r.logs,'rushYds',5)],['L5 receiving yards',avg(r.logs,'recYds',5)],
  ['L5 targets',avg(r.logs,'targets',5)],['L5 carries',avg(r.logs,'carries',5)],['L5 pass yards',avg(r.logs,'passYds',5)]];
 const td=tdHit(r.logs,5),td10=tdHit(r.logs,10);
 const logs=r.logs.slice(0,20);
 const max=Math.max(1,...logs.map(x=>(num(x.tds)||0)));
 const bar='<div class="nfl-bars">'+logs.slice(0,16).reverse().map(g=>'<div><i style="height:'+Math.round((num(g.tds)||0)/max*100)+'%"></i><span>'+esc(g.week||'')+'</span><b>'+esc(g.tds??'—')+'</b></div>').join('')+'</div>';
 return '<div class="drawer-contents nfl-details"><span class="eyebrow">NFL VERIFIED PLAYER RESEARCH</span><h2>'+esc(r.name)+'</h2><p class="subtitle">'+esc(r.team)+' · '+esc(r.position)+' · '+esc(r.game.away?.abbr)+' @ '+esc(r.game.home?.abbr)+' · '+esc(when(r.game.startTime))+'</p>'
  +'<div class="nfl-detail-grid"><div><small>TSO ATD ESTIMATE</small><b>'+percent(r.modelProbability)+'</b><small>2025 baseline · 2026 matchup</small></div>'
  +'<div><small>LAST 5 TD GAMES</small><b>'+(td?td.hits+'/'+td.n:'—')+'</b><small>Observed games</small></div>'
  +'<div><small>LAST 10 TD GAMES</small><b>'+(td10?td10.hits+'/'+td10.n:'—')+'</b></div>'
  +'<div><small>SNAP SHARE</small><b>'+percent(r.m?.snapShare)+'</b></div>'
  +'<div><small>RZ CARRIES (BASELINE)</small><b>'+esc(r.m?.rzCarries??'—')+'</b></div>'
  +'<div><small>RZ TARGETS (BASELINE)</small><b>'+esc(r.m?.rzTargets??'—')+'</b></div>'
  +'<div><small>OPP RZ TD ALLOWED</small><b>'+percent(r.m?.opponentRzTdRate)+'</b></div>'
  +'<div><small>INJURY STATUS</small><b>'+esc(r.p?.status||r.m?.injuryStatus||'Unknown')+'</b></div></div>'
  +'<h3>Last games · observed TD counts</h3>'+bar
  +'<h3>2026 player trends</h3><div class="nfl-detail-grid">'+stats.map(([name,value])=>'<div><small>'+esc(name.toUpperCase())+'</small><b>'+f(value)+'</b></div>').join('')+'</div>'
  +'<h3>Game log</h3><div class="nba-log-scroll"><table class="nba-log"><thead><tr><th>WEEK</th><th>SEASON</th><th>OPP</th><th>CARRIES</th><th>TARGETS</th><th>RUSH YDS</th><th>REC YDS</th><th>TD</th></tr></thead><tbody>'
  +(logs.map(g=>'<tr><td>'+esc(g.week)+'</td><td>'+esc(g.season)+'</td><td>'+esc(g.opponent)+'</td><td>'+esc(g.carries)+'</td><td>'+esc(g.targets)+'</td><td>'+esc(g.rushYds)+'</td><td>'+esc(g.recYds)+'</td><td>'+esc((num(g.rushTds)||0)+(num(g.recTds)||0))+'</td></tr>').join('')||'<tr><td colspan="8">No verified game log available.</td></tr>')
  +'</tbody></table></div><p class="nba-footnote">Historical rates are descriptive. TSO probabilities are model estimates, not guarantees. No QB passing touchdowns are counted in anytime TD.</p></div>';
}
function repaint(){
 const slot=document.getElementById('nflLabSlot');
 if(slot&&state.context)slot.innerHTML=render(state.context,state.tool);
}
function click(event){
 const target=event.target;
 if(target.closest('[data-nfl-sort]')){state.reverse=!state.reverse;repaint();return true}
 if(target.closest('[data-nfl-more]')){state.max+=100;repaint();return true}
 const selected=target.closest('[data-nfl-row]');if(selected){
  const r=state.all.find(x=>x.id===selected.dataset.nflRow);if(!r)return true;
  document.getElementById('drawerBody').innerHTML=detail(r,state.context);
  document.getElementById('drawer').hidden=false;
  document.getElementById('scrim').hidden=false;
  return true;
 }
 return false;
}
function change(event){
 const option=event.target.closest('[data-nfl-check]');
 if(option){
  const kind=option.dataset.nflCheck,id=option.dataset.nflValue;
  if(kind!=='games'&&kind!=='positions')return false;
  if(id==='all')state[kind]=[];
  else{const all=new Set(state[kind]);if(option.checked)all.add(id);else all.delete(id);state[kind]=[...all]}
  state.open[kind]=true;state.max=90;repaint();return true;
 }
 const min=event.target.closest('[data-nfl-min]');
 if(min){state.minGames=Number(min.value)||0;state.max=90;repaint();return true}
 return false;
}
function input(event){
 if(!event.target.matches('[data-nfl-search]'))return false;
 const caret=event.target.selectionStart;
 state.search=event.target.value;
 repaint();
 const target=document.querySelector('[data-nfl-search]');
 target?.focus?.();try{target?.setSelectionRange?.(caret,caret)}catch(_){}
 return true;
}
document.addEventListener('toggle',event=>{
 const type=event.target.dataset?.nflPicker;
 if(type==='games'||type==='positions')state.open[type]=Boolean(event.target.open);
},true);
document.addEventListener('click',event=>{
 for(const k of ['games','positions']){
  if(state.open[k]&&!event.target.closest?.('[data-nfl-picker="'+k+'"]')){
   const picker=document.querySelector('[data-nfl-picker="'+k+'"]');
   if(picker){picker.open=false;state.open[k]=false}
  }
 }
});
window.TSO3NflLab={tools,render,click,change,input,state};
})();