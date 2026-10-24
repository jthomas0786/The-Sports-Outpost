/* TSO3 2026-27 NBA source-verified two-team DvP sheet.
   Never relabel multi-season cached defensive aggregates as 2026-27 data. */
(function(){
'use strict';
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
const fm=v=>N(v)===null?'—':v.toFixed(1);
const stats={points:'PTS',rebounds:'REB',assists:'AST',threes:'3PM',pra:'PRA'};
const values=Object.keys(stats);
const pos=p=>['PG','SG','G'].includes(String(p||'').toUpperCase())?'G':
 ['SF','PF','F'].includes(String(p||'').toUpperCase())?'F':
 ['C','FC','C-F','F-C'].includes(String(p||'').toUpperCase())?'C':null;
const state={ctx:null,gameId:null,market:'points',range:'season',sort:'metric',expanded:false,
 search:'',selected:null,rows:new Map(),defense:null,lastChecked:0,pending:false,sourceError:null};
const time=x=>{const d=Date.parse(x||'');return Number.isFinite(d)?new Date(d).toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'})+' CT':'—'};
function fixtures(ctx){
 const now=Date.now();
 return (ctx.games||[]).filter(g=>g.league==='nba'&&g.state!=='post'&&g.home?.id&&g.away?.id&&/^[0-9]{8,14}$/.test(String(g.id||''))
  &&Number.isFinite(Date.parse(g.startTime||''))&&Date.parse(g.startTime)>now-15*60000)
  .sort((a,b)=>Date.parse(a.startTime)-Date.parse(b.startTime));
}
function observations(p){
 const now=Date.now(),season=Number(state.ctx?.research?.currentSeason);
 return (p.recentGames||[]).filter(x=>Number(x.season)===season&&season===2027
  &&Number(x.seasonType)===2&&N(x.minutes)!==null&&x.minutes>=4&&x.stats&&
  Number.isFinite(Date.parse(x.date||''))&&Date.parse(x.date)<now)
  .sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
}
function historical(p,market,range){
 const g=observations(p),selected=range==='season'?g:g.slice(0,range==='l5'?5:10);
 const used=selected.map(g=>N(g.stats?.[market])).filter(v=>v!==null);
 return {games:selected.length,verified:used.length,mean:used.length?used.reduce((a,b)=>a+b,0)/used.length:null,logs:g};
}
function positional(ctx,defenseId,group,market){
 const doc=state.defense,entry=doc?.groups?.find(x=>String(x.teamId)===String(defenseId)&&x.position===group);
 if(!doc?.available||Number(doc.season)!==2027||doc.coverageComplete!==true
  ||!Number.isFinite(Date.parse(doc.updatedAt||''))||Date.now()-Date.parse(doc.updatedAt)>24*3600000
  ||!entry||Number(entry.games)<1)return {value:null,games:0,rank:null};
 const value=N(entry.perGame?.[market]),grouped=(doc.groups||[]).filter(x=>x.position===group&&Number(x.games)>=3
  &&N(x.perGame?.[market])!==null).sort((a,b)=>b.perGame[market]-a.perGame[market]);
 const rank=value!==null&&entry.games>=3&&grouped.length>=16
  ?{position:1+grouped.filter(x=>x.perGame[market]>value).length,total:grouped.length}:null;
 return {value,games:entry.games,rank};
}
function rankStyle(r){if(!r)return 'unknown';return r.position/r.total<=1/3?'favorable':r.position/r.total<=2/3?'neutral':'difficult'}
function numberCell(v,rank,extra=''){
 return '<td class="ts-role-number"><div class="ts-role-heat '+rankStyle(rank)+'"><strong>'+fm(v)+'</strong>'+
  (rank?'<small title="Observed season defense rank; most allowed first">#'+rank.position+'/'+rank.total+'</small>':'')+
  (extra?'<small>'+E(extra)+'</small>':'')+'</div></td>';
}
function players(ctx,offenseId,defId){
 const out=[],seen=new Set();
 for(const p of Object.values(ctx.research?.players||{})){
  if(String(p.teamId)!==String(offenseId)||!p.name||seen.has(String(p.id)))continue;
  const position=pos(p.position);if(!position)continue;
  const season=observations(p);if(!season.length)continue;
  seen.add(String(p.id));
  const sample=historical(p,state.market,state.range),minutes=season.slice(0,5).map(g=>N(g.minutes)).filter(v=>v!==null);
  const injury=(ctx.injuries?.entries||[]).find(i=>String(i.athleteId)===String(p.id)&&String(i.teamId)===String(p.teamId));
  const role={player:p,id:p.id,name:p.name,position,teamId:offenseId,defenseId:defId,
   sample,minutes:minutes.length?minutes.reduce((a,b)=>a+b,0)/minutes.length:null,injury:injury||p.injury||null};
  out.push(role);
 }
 const term=state.search.trim().toLowerCase();
 out.sort((a,b)=>state.sort==='name'?a.name.localeCompare(b.name):
  (N(b.sample.mean)??-1)-(N(a.sample.mean)??-1)||a.name.localeCompare(b.name));
 return out.filter(p=>!term||p.name.toLowerCase().includes(term)||p.position.toLowerCase().includes(term))
  .slice(0,state.expanded?100:35);
}
function side(ctx,g,offense,defense){
 const team=ctx.research?.teams?.[String(offense.id)],def=ctx.research?.teams?.[String(defense.id)];
 const title=t=>E(t?.abbreviation||t?.abbr||t?.shortName||t?.name||'—');
 const cols=['points','rebounds','assists','threes','pra'];
 const groups=['G','F','C'].map(group=>{
  const rates=cols.map(metric=>positional(ctx,defense.id,group,metric));
  return '<tr><td class="ts-role-player"><b>All '+group+'s</b></td><td class="ts-role-numeric">'+E(rates[0].games||'—')+'</td>'+
   rates.map(x=>numberCell(x.value,x.rank)).join('')+'</tr>';
 }).join('');
 const athletes=players(ctx,offense.id,defense.id).map(p=>{
  const id=String(g.id)+'|'+p.id,stateKey=id;
  state.rows.set(stateKey,p);
  const logs=observations(p);
  const line='<td class="ts-role-player"><button type="button" data-nba-board-player="'+E(id)+'"><span class="ts-role-position">'+E(p.player.position||p.position)+'</span> '+E(p.name)+'</button>'+
   (p.injury?.status?'<small>REPORTED: '+E(p.injury.status)+'</small>':'')+'</td>'+
   '<td class="ts-role-numeric">'+E(p.sample.games)+'</td>';
  const per=cols.map(metric=>{
   const v=historical(p.player,metric,state.range),allowed=positional(ctx,defense.id,p.position,metric);
   return numberCell(v.mean,allowed.rank);
  }).join('');
  const advanced=state.expanded?'<td class="ts-role-numeric">'+fm(p.minutes)+'</td><td class="ts-role-numeric">'+E(logs.length)+'</td>':'';
  return '<tr>'+line+per+advanced+'</tr>';
 }).join('')||'<tr><td colspan="'+(7+(state.expanded?2:0))+'">No verified 2026-27 completed-game player observations for this offense.</td></tr>';
 const head='<th>ROLE / PLAYER</th><th>GP</th>'+cols.map(k=>'<th>'+E(stats[k])+'</th>').join('')+
  (state.expanded?'<th>MIN L5</th><th>2027 GP</th>':'');
 return '<div class="ts-role-side"><div class="ts-role-side-head"><strong>'+title(team||offense)+'</strong><span>offense against</span><strong>'+title(def||defense)+' defense</strong></div>'+
  '<div class="ts-role-band"><b>'+title(def||defense)+' allows</b><small>2026–27 opponent position groups · only complete official game boxscores</small></div>'+
  '<div class="ts-role-scroll"><table class="ts-role-table"><thead><tr><th>POSITION</th><th>GP</th>'+
   cols.map(k=>'<th>'+stats[k]+'</th>').join('')+'</tr></thead><tbody>'+groups+'</tbody></table></div>'+
  '<div class="ts-role-band"><b>'+title(team||offense)+' player form</b><small>Actual completed 2026–27 games · '+E(state.range==='season'?'season to date':state.range.toUpperCase())+'</small></div>'+
  '<div class="ts-role-scroll"><table class="ts-role-table"><thead><tr>'+head+'</tr></thead><tbody>'+athletes+'</tbody></table></div></div>';
}
function playerChart(p){
 if(!p)return '';
 const logs=observations(p.player).filter(x=>N(x.stats?.[state.market])!==null).slice(0,10).reverse();
 const max=Math.max(1,...logs.map(x=>x.stats[state.market]));
 const bar=logs.length?'<div class="ts-role-chart">'+logs.map(x=>
  '<div class="ts-role-bar-wrap" title="'+E(x.date)+'"><span>'+fm(x.stats[state.market])+'</span>'+
  '<i style="height:'+Math.max(2,Math.round(x.stats[state.market]/max*95))+'%"></i>'+
  '<small>'+E(new Date(x.date).toLocaleDateString('en-US',{month:'numeric',day:'numeric'}))+'</small></div>').join('')+'</div>':
  '<p>No verified current-season games for this statistic.</p>';
 return '<section class="ts-role-drill"><div class="ts-role-drill-head"><div><h3>'+E(p.name)+'</h3><p>'+E(p.player.position)+' · verified 2026–27 completed games</p></div>'+
  '<a href="#/nba/player/'+E(p.id)+'">Full player dashboard</a><button type="button" data-nba-board-close aria-label="Close chart">×</button></div>'+
  '<p>Observed '+E(stats[state.market])+' per game, no sportsbook line implied</p>'+bar+'</section>';
}
function render(ctx){
 state.ctx=ctx;const games=fixtures(ctx),season=Number(ctx.research?.currentSeason);
 if(season!==2027||!ctx.research?.players||!Object.keys(ctx.research.players).length)
  return '<section class="ts-role-board"><h2>NBA Matchup vs Position</h2><p>Verified 2026–27 NBA athlete history is unavailable; no older season is substituted.</p></section>';
 if(!games.length)return '<section class="ts-role-board"><h2>NBA Matchup vs Position</h2><p>No current verified future NBA games. Player logs remain available through Player Form.</p></section>';
 const game=games.find(x=>String(x.id)===String(state.gameId))||games[0];
 state.gameId=String(game.id);state.rows=new Map();
 const status=state.pending?'Building current-season defense totals from ESPN completed box scores…':
  state.defense?.available?'Current-season ESPN boxscores: '+E(state.defense.gamesScanned)+' completed games scanned · updated '+E(time(state.defense.updatedAt)):
   'Current-season position-defense aggregates unavailable: '+E(state.sourceError||state.defense?.reason||'unverified ESPN source');
 const date=Date.parse(ctx.research?.generatedAt||''),stale=Number.isFinite(date)&&Date.now()-date>24*3600000;
 const header='<div class="ts-role-top"><div><span>THE SPORTS OUTPOST / NBA VERIFIED 2026–27 RESEARCH</span><h2>Matchup vs Position <small>2026–27</small></h2>'+
  '<p>Head-to-head guard, forward and center allowances followed by actual player production. Both teams use the same independently verified season and same source window. No hidden estimates.</p></div>'+
  '<div class="ts-role-filter"><label>GAME<select data-nba-board-game>'+games.map(g=>'<option value="'+E(g.id)+'" '+(String(g.id)===state.gameId?'selected':'')+'>'+E(g.away?.abbr+' @ '+g.home?.abbr+' · '+time(g.startTime))+'</option>').join('')+'</select></label>'+
  '<label>RANGE<select data-nba-board-range>'+[['season','2026–27 Season'],['l5','Last 5 (this season)'],['l10','Last 10 (this season)']].map(([v,t])=>'<option value="'+v+'" '+(state.range===v?'selected':'')+'>'+t+'</option>').join('')+'</select></label>'+
  '<label>PLAYER SEARCH<input data-nba-board-search value="'+E(state.search)+'" placeholder="Search athletes"></label></div></div>';
 const tabs='<div class="ts-role-tools"><div class="ts-role-tabs">'+Object.entries(stats).map(([k,label])=>
  '<button type="button" data-nba-board-market="'+k+'" class="'+(state.market===k?'active':'')+'">'+label+'</button>').join('')+'</div>'+
  '<div class="ts-role-smallcontrols"><label>SORT<select data-nba-board-sort><option value="metric" '+(state.sort==='metric'?'selected':'')+'>Selected '+E(stats[state.market])+' avg</option><option value="name" '+(state.sort==='name'?'selected':'')+'>Player name</option></select></label>'+
  '<button type="button" data-nba-board-advanced aria-pressed="'+state.expanded+'">'+(state.expanded?'Compact view':'View advanced')+'</button></div></div>';
 const color='<div class="ts-role-legend"><span><i class="favorable"></i> More allowed</span><span><i class="neutral"></i> Middle</span><span><i class="difficult"></i> Less allowed</span><span>Ranks require ≥3 games for ≥16 defensive teams</span></div>';
 const paired='<div class="ts-role-comparison">'+side(ctx,game,game.away,game.home)+side(ctx,game,game.home,game.away)+'</div>';
 const detail=playerChart(state.rows.get(state.selected));
 return '<section class="ts-role-board">'+header+'<div class="ts-role-source">'+E(status)+' · player feed '+E(time(ctx.research.generatedAt))+(stale?' · PLAYER HISTORY REFRESH OVERDUE':'')+'</div>'+tabs+color+paired+detail+
  '<p class="ts-role-fine"><b>Source policy:</b> Player L5/L10/Season use only actual completed regular-season 2026–27 ESPN logs, never previous-season games. Defensive G/F/C numbers come exclusively from independently completed current-season ESPN boxscore summaries when full daily coverage is verified. Rows/heat ranks remain blank if unavailable or insufficiently sampled. The older cached NBA teamDefense/pace source mixes seasons and is intentionally excluded from this board. Team defense is descriptive, not a player-specific projection or defensive assignment.</p></section>';
}
function repaint(){const el=document.getElementById('nbaMatchupBoard');if(el&&state.ctx)el.innerHTML=render(state.ctx)}
async function hydrate(ctx){
 state.ctx=ctx;
 if(state.pending||state.defense&&Date.now()-state.lastChecked<15*60000
   ||Date.now()-state.lastChecked<2*60000)return;
 state.pending=true;state.lastChecked=Date.now();repaint();
 try{const resp=await fetch('/api/nba-current-dvp',{cache:'no-store'});const doc=await resp.json();
  if(!resp.ok||doc.available!==true||Number(doc.season)!==2027||doc.coverageComplete!==true)
   throw Error(doc.error||doc.reason||'Missing verifiable current-season defensive boxscores');
  state.defense=doc;state.sourceError=null;
 }catch(e){state.defense=null;state.sourceError=String(e?.message||'NBA opponent position source unavailable').slice(0,150)}
 finally{state.pending=false;repaint()}
}
function click(e){
 if(!e.target.closest('#nbaMatchupBoard'))return false;
 const market=e.target.closest('[data-nba-board-market]');
 if(market&&values.includes(market.dataset.nbaBoardMarket)){state.market=market.dataset.nbaBoardMarket;state.selected=null;repaint();return true}
 const p=e.target.closest('[data-nba-board-player]');
 if(p){state.selected=p.dataset.nbaBoardPlayer;repaint();return true}
 if(e.target.closest('[data-nba-board-close]')){state.selected=null;repaint();return true}
 if(e.target.closest('[data-nba-board-advanced]')){state.expanded=!state.expanded;repaint();return true}
 return false;
}
function change(e){
 if(!e.target.closest('#nbaMatchupBoard'))return false;
 if(e.target.matches('[data-nba-board-game]')){state.gameId=e.target.value;state.selected=null;repaint();return true}
 if(e.target.matches('[data-nba-board-range]')){state.range=e.target.value;state.selected=null;repaint();return true}
 if(e.target.matches('[data-nba-board-sort]')){state.sort=e.target.value;repaint();return true}
 return false;
}
function input(e){
 if(!e.target.matches('#nbaMatchupBoard [data-nba-board-search]'))return false;
 state.search=e.target.value;const caret=e.target.selectionStart;repaint();
 const next=document.querySelector('#nbaMatchupBoard [data-nba-board-search]');next?.focus();try{next?.setSelectionRange(caret,caret)}catch(_){}
 return true;
}
document.addEventListener('click',click);document.addEventListener('change',change);document.addEventListener('input',input);
window.TSO3NbaMatchupBoard={render,hydrate,state,observations,historical,positional,fixtures};
})();
