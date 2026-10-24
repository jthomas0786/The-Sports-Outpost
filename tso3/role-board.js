/* TSO 3.0 role research sheet.
 * Screenshot-inspired comparative presentation; entirely original markup,
 * rankings and math over verified TSO/nflverse observations.
 * Defense ranks are observed 2026 position-group allowances, never player
 * assignment probabilities, QB passing TD projections, or bookmaker values. */
(function(){
'use strict';
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const V=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
const TEAM=t=>({LAR:'LA',WSH:'WAS',JAX:'JAC',GNB:'GB',SFO:'SF'}[String(t||'').toUpperCase()]||String(t||'').toUpperCase());
const TIME=t=>{const d=Date.parse(t||'');return Number.isFinite(d)?new Date(d).toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'})+' CT':'Kickoff unverified'};
const METRICS={
 receiving:[
  {key:'targets',title:'TGT',src:'targets'},
  {key:'receptions',title:'REC',src:'receptions'},
  {key:'recYds',title:'REC YDS',src:'recYds'},
  {key:'recTds',title:'REC TD',src:'recTds'},
  {key:'rz',title:'RZ OPP',src:null},
 ],
 rushing:[
  {key:'carries',title:'CAR',src:'carries'},
  {key:'rushYds',title:'RUSH YDS',src:'rushYds'},
  {key:'rushTds',title:'RUSH TD',src:'rushTds'},
  {key:'rz',title:'RZ OPP',src:null},
 ],
 passing:[
  {key:'attempts',title:'ATT',src:'attempts'},
  {key:'completions',title:'COMP',src:'completions'},
  {key:'passYds',title:'PASS YDS',src:'passYds'},
  {key:'passTds',title:'PASS TD',src:'passTds'},
 ]
};
const POS={receiving:['WR','TE','RB'],rushing:['RB','QB','WR'],passing:['QB']};
const state={ctx:null,game:null,tab:'receiving',range:'season',sort:'role',advanced:false,search:'',selected:null,rows:new Map(),sourceKey:''};
const fmt=(n,d=1)=>V(n)===null?'—':Number(n).toFixed(d);
function nextGames(ctx){
 const now=Date.now();
 return (ctx?.games||[]).filter(g=>g.league==='nfl'&&g.away?.abbr&&g.home?.abbr
  &&/^\d{6,14}$/.test(String(g.id||''))&&g.state!=='post'
  &&Number.isFinite(Date.parse(g.startTime||''))&&Date.parse(g.startTime)>now-15*60000)
  .sort((a,b)=>Date.parse(a.startTime)-Date.parse(b.startTime));
}
function indexDefense(ctx){
 const season=Number(ctx.research?.season),map=new Map(),conflicts=new Set();
 if(season!==2026)return {map,conflicts,ranks:new Map(),populations:new Map()};
 for(const p of ctx.research?.players||[]){
  const role=String(p.matchup?.positionGroup||'').toUpperCase(),
   opp=TEAM(p.matchup?.opponent),source=p.matchup?.currentSeasonAllowed;
  if(!['QB','RB','WR','TE'].includes(role)||!opp||Number(p.matchup?.season)!==2026
    ||String(source?.position||'').toUpperCase()!==role||V(source?.games)===null
    ||source.games<3||V(source?.perGame?.yards)===null)continue;
  const key=opp+'|'+role,prior=map.get(key);
  if(prior&&Number(prior.games)===Number(source.games)){
   const fields=['yards','passYds','recYds','rushYds','targets','receptions','carries','passTds','recTds','rushTds'];
   if(fields.some(k=>V(prior.perGame?.[k])!==null&&V(source.perGame?.[k])!==null
     &&Math.abs(prior.perGame[k]-source.perGame[k])>0.2)){conflicts.add(key);continue;}
  }
  if(!prior||source.games>prior.games){map.set(key,source);conflicts.delete(key);}
 }
 const ranks=new Map(),populations=new Map();
 for(const pos of ['QB','RB','WR','TE'])for(const tab of Object.keys(METRICS)){
  for(const metric of METRICS[tab]){
   if(!metric.src)continue;
   const vals=[...map].filter(([key,x])=>key.endsWith('|'+pos)
     &&!conflicts.has(key)&&V(x.perGame?.[metric.src])!==null)
     .map(([key,x])=>({key,v:x.perGame[metric.src]})).sort((a,b)=>b.v-a.v);
   const dictKey=pos+'|'+tab+'|'+metric.key;
   populations.set(dictKey,vals.length);
   // Competition rank: ties share rank. Missing data never receive a rank.
   let last=null,rank=0;
   vals.forEach((r,i)=>{if(last===null||r.v!==last){rank=i+1;last=r.v;}ranks.set(r.key+'|'+tab+'|'+metric.key,{rank,n:vals.length});});
  }
 }
 return {map,conflicts,ranks,populations};
}
function allowed(def,team,pos,tab,field){
 const k=TEAM(team)+'|'+pos,src=def.map.get(k);
 if(!src||def.conflicts.has(k)||!field.src)return {value:null,rank:null};
 const value=V(src.perGame?.[field.src]);
 const rank=def.ranks.get(k+'|'+tab+'|'+field.key)||null;
 return {value,rank:rank&&rank.n>=16&&value!==null?rank:null};
}
function heat(rank){
 if(!rank)return 'unknown';
 const t=rank.rank/rank.n;
 return t<=1/3?'favorable':t<=2/3?'neutral':'difficult';
}
function redzone(ctx,p){
 const f=ctx.redzone,r=f?.players?.[String(p.gsisId||'')],a=r?.current;
 const t=Date.parse(f?.generatedAt||''),end=Date.parse(String(f?.lastObservedGameDate||'')+'T23:59:59Z'),now=Date.now();
 if(f?.available!==true||Number(f.season)!==2026||TEAM(r?.team)!==TEAM(p.team)
  ||!Number.isFinite(t)||t>now+60000||now-t>10*86400000
  ||!Number.isFinite(end)||end>now+86400000||now-end>8*86400000
  ||Number(f.gamesScanned)<80||V(a?.redZoneOpps)===null||V(a?.gamesWithOpportunities)===null
  ||a.gamesWithOpportunities<3)return null;
 return {pg:a.redZoneOpps/a.gamesWithOpportunities,games:a.gamesWithOpportunities,
  goal:a.goalLineOpps,share:a.redZoneSharePct,goalShare:a.goalLineSharePct,source:f.generatedAt};
}
function playerStats(ctx,p,tab,range){
 const g=Number(p.currentSeason?.games||0),ps=p.currentSeason?.perGame||{},
  games=(p.logs||[]).filter(x=>Number(x.season)===2026
   &&Number.isFinite(Date.parse(x.date||''))).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
 const selected=range==='season'?[]:games.slice(0,range==='l5'?5:10);
 const values={};
 for(const metric of METRICS[tab]){
  if(metric.key==='rz'){values.rz=range==='season'?redzone(ctx,p)?.pg??null:null;continue;}
  if(range==='season')values[metric.key]=g>=1?V(ps[metric.key]):null;
  else {const sample=selected.map(x=>V(x[metric.key])).filter(x=>x!==null);
   values[metric.key]=sample.length?sample.reduce((a,b)=>a+b,0)/sample.length:null;}
 }
 return {games:range==='season'?g:selected.length,values,logs:games};
}
function rosterRole(p){const pos=String(p.position||'').toUpperCase();
 const depth=V(p.depthRank),r=depth!==null&&depth>=1&&depth<=9&&Number.isInteger(depth)?pos+depth:pos;
 return r||'—';
}
function playerRows(ctx,game,offense,defense,tab,range){
 const allowedPositions=new Set(POS[tab]),ids=new Set(),out=[];
 const source=ctx.research?.players||[];
 for(const p of source){
  const pos=String(p.position||'').toUpperCase(),team=TEAM(p.team),id=String(p.id||p.gsisId||p.name);
  if(team!==TEAM(offense)||!allowedPositions.has(pos)||!p.name||ids.has(id)
   ||Number(p.currentSeason?.games)<1)continue;
  if(p.matchup?.opponent&&TEAM(p.matchup.opponent)!==TEAM(defense))continue;
  ids.add(id);
  const sample=playerStats(ctx,p,tab,range);
  const rz=redzone(ctx,p);
  const values=sample.values;
  const statuses=(ctx.injuries?.entries||[]).filter(x=>String(x.athleteId)===String(p.id));
  out.push({id,player:p,name:p.name,pos,role:rosterRole(p),sample,rz,values,
   game,offense:TEAM(offense),defense:TEAM(defense),status:statuses[0]?.status||null});
 }
 return out;
}
function groupRows(ctx,def,defense,tab){
 const positions=POS[tab].filter(pos=>tab!=='passing'||pos==='QB');
 return positions.map(pos=>{
  const k=TEAM(defense)+'|'+pos,d=def.map.get(k),conflict=def.conflicts.has(k);
  return {pos,groupLabel:'All '+(pos==='WR'?'WRs':pos==='TE'?'TEs':pos==='RB'?'RBs':'QBs'),
   games:conflict?null:d?.games??null,values:METRICS[tab].map(f=>allowed(def,defense,pos,tab,f)),conflict};
 });
}
function cell(value,rank,scale=1,na='—'){
 const has=V(value)!==null;
 return '<td class="ts-role-number"><div class="ts-role-heat '+heat(rank)+'">'+
   '<strong>'+(has?E(fmt(value,Number.isInteger(value)&&scale===0?0:1)):na)+'</strong>'+
   (rank?'<small title="Observed 2026 defense ranking: #'+rank.rank+' of '+rank.n+' (more allowed ranks higher)">#'+rank.rank+'/'+rank.n+'</small>':'')+
   '</div></td>';
}
function tinyHeader(tab){
 return METRICS[tab].map(m=>'<th><button type="button" data-role-sort="'+m.key+'" aria-label="Sort by '+E(m.title)+'">'+E(m.title)+'</button></th>').join('');
}
function offenseRows(ctx,def,group,tab){
 const filter=state.search.toLowerCase().trim();
 let people=group.players.filter(r=>!filter||r.name.toLowerCase().includes(filter)||r.role.toLowerCase().includes(filter));
 people.sort((a,b)=>{
  if(state.sort==='role')return POS[tab].indexOf(a.pos)-POS[tab].indexOf(b.pos)
   ||(V(a.player.depthRank)??50)-(V(b.player.depthRank)??50)
   ||a.name.localeCompare(b.name);
  const av=V(a.values[state.sort]),bv=V(b.values[state.sort]);
  return (bv??-Infinity)-(av??-Infinity)||a.name.localeCompare(b.name);
 });
 return people.slice(0,state.advanced?75:26).map(p=>{
  const rowKey=String(group.game.id)+'|'+p.offense+'|'+p.id;
  state.rows.set(rowKey,p);
  return '<tr><td class="ts-role-player"><button type="button" data-role-player="'+E(rowKey)+'"><span class="ts-role-position">'+E(p.role)+'</span> '+E(p.name)+'</button>'+
   (p.status?'<small>'+E(p.status)+'</small>':'')+'</td>'+
   '<td class="ts-role-numeric">'+E(p.sample.games||'—')+'</td>'+
   METRICS[tab].map(metric=>{
    const opposition=allowed(def,group.defense,p.pos,tab,metric);
    const value=p.values[metric.key],rank=opposition.rank;
    return cell(value,rank);
   }).join('')+'</tr>';
 }).join('')||'<tr><td colspan="'+(2+METRICS[tab].length)+'">No independently observed '+E(tab)+' players for this offense and selected range.</td></tr>';
}
function panel(ctx,def,game,offense,defense,tab){
 const groups=groupRows(ctx,def,defense,tab);
 const players=playerRows(ctx,game,offense,defense,tab,state.range);
 const opponent=(name)=>E(name||'—');
 return '<div class="ts-role-side"><div class="ts-role-side-head"><strong>'+opponent(offense)+' offense</strong><span>against</span><strong>'+opponent(defense)+' defense</strong></div>'+
  '<div class="ts-role-band"><b>'+opponent(defense)+' allows</b><small>2026 observed position-group production per game · highest allowed = rank 1</small></div>'+
  '<div class="ts-role-scroll"><table class="ts-role-table"><thead><tr><th>GROUP</th><th>GP</th>'+tinyHeader(tab)+'</tr></thead><tbody>'+
  groups.map(r=>'<tr><td class="ts-role-player"><b>'+E(r.groupLabel)+'</b></td><td class="ts-role-numeric">'+E(r.games??'—')+'</td>'+
   r.values.map(x=>cell(x.value,x.rank)).join('')+'</tr>').join('')+'</tbody></table></div>'+
  '<div class="ts-role-band"><b>'+opponent(offense)+' players</b><small>'+E(state.range==='season'?'2026 season':state.range.toUpperCase()+' actual games')+' per-game production · colored by opposing defense rank, not player rank</small></div>'+
  '<div class="ts-role-scroll"><table class="ts-role-table"><thead><tr><th>PLAYER / ROLE</th><th>GP</th>'+tinyHeader(tab)+'</tr></thead><tbody>'+
   offenseRows(ctx,def,{game,offense,defense,players},tab)+'</tbody></table></div></div>';
}
function playerDrill(p,tab){
 if(!p)return '';
 const key=tab==='receiving'?'recYds':tab==='rushing'?'rushYds':'passYds',
  logs=p.sample.logs.slice(0,10).reverse(),nums=logs.map(x=>V(x[key])??0),
  maximum=Math.max(1,...nums);
 return '<section class="ts-role-drill"><div class="ts-role-drill-head"><div><h3>'+E(p.name)+'</h3>'+
  '<p>'+E(p.offense)+' · '+E(p.role)+' · 2026 observed game history</p></div>'+
  (/^\d{3,12}$/.test(String(p.player.id||''))?'<a href="#/nfl/player/'+E(p.player.id)+'">Full player dashboard ↗</a>':'')+
  '<button type="button" data-role-close aria-label="Close player history">×</button></div>'+
  '<div class="ts-role-chart" role="img" aria-label="Last recorded games '+E(key)+' chart, actual completed games">'+
  logs.map((g,i)=>'<div class="ts-role-bar-wrap" title="'+E(g.date+' vs '+g.opponent+': '+fmt(V(g[key])))+'"><span>'+E(fmt(V(g[key]),0))+'</span><i style="height:'+Math.max(2,Math.round((nums[i]/maximum)*96))+'%"></i><small>'+E(String(g.week||'—'))+'</small></div>').join('')+'</div>'+
  '<p class="ts-role-fine">Each bar is one completed 2026 game ('+E(key)+'). Missing source values are shown as unavailable in the tables. Heat colors describe the <b>opposing defense group</b>, not a player-vs-CB assignment or a calibrated prop probability.</p></section>';
}
function render(ctx){
 state.ctx=ctx;
 const games=nextGames(ctx),season=Number(ctx?.research?.season);
 if(!games.length)return '<section class="ts-role-board"><h2>NFL Role Matchups</h2><p>No verified future NFL games on the current official schedule. Do not use a past or fabricated matchup.</p></section>';
 if(season!==2026||!Array.isArray(ctx.research?.players)||!ctx.research.players.length)
  return '<section class="ts-role-board"><h2>NFL Role Matchups</h2><p>Verified 2026 player and defense research is not currently available. No matchup grades have been inferred.</p></section>';
 const selected=games.find(g=>String(g.id)===String(state.game))||games[0];
 state.game=String(selected.id);state.rows=new Map();
 const defense=indexDefense(ctx),tab=state.tab;
 const sources='ESPN official NFL fixtures · nflverse 2026 player logs and positional defensive allowances · '+
  '2026 red-zone source '+(ctx.redzone?.available?'verified where individually matched':'unavailable')+
  ' · research '+TIME(ctx.research?.generatedAt);
 const h='<div class="ts-role-top"><div><span>THE SPORTS OUTPOST / NFL MATCHUP INTELLIGENCE</span><h2>Role Matchups <small>2026 observed</small></h2>'+
  '<p>Compare how each defense performs against QB, RB, WR and TE groups, then view the opposing players and their real role and recent form. Independent descriptive rankings; no proprietary PropFinder values, individual coverage grades or synthetic betting edges.</p></div>'+
  '<div class="ts-role-filter"><label>UPCOMING GAME<select data-role-game>'+games.map(g=>'<option value="'+E(g.id)+'" '+(String(g.id)===state.game?'selected':'')+'>'+E(g.away.abbr+' @ '+g.home.abbr+' · '+TIME(g.startTime))+'</option>').join('')+'</select></label>'+
  '<label>RANGE<select data-role-range>'+[['season','2026 Season'],['l5','Last 5'],['l10','Last 10']].map(([v,label])=>'<option value="'+v+'" '+(state.range===v?'selected':'')+'>'+label+'</option>').join('')+'</select></label>'+
  '<label>PLAYER SEARCH<input data-role-search value="'+E(state.search)+'" placeholder="Player / role"></label></div></div>';
 const nav='<div class="ts-role-tools"><div class="ts-role-tabs">'+[['passing','Passing'],['receiving','Receiving'],['rushing','Rushing']].map(([key,label])=>
  '<button type="button" data-role-tab="'+key+'" class="'+(tab===key?'active':'')+'">'+label+'</button>').join('')+'</div>'+
  '<div class="ts-role-smallcontrols"><label>SORT BY<select data-role-order><option value="role" '+(state.sort==='role'?'selected':'')+'>Role / Depth</option>'+
  METRICS[tab].map(m=>'<option value="'+m.key+'" '+(state.sort===m.key?'selected':'')+'>'+E(m.title)+'</option>').join('')+'</select></label>'+
  '<button type="button" data-role-advanced aria-pressed="'+state.advanced+'">'+(state.advanced?'Show compact':'View advanced')+'</button></div></div>';
 const selectedRow=state.selected;
 let content='<div class="ts-role-comparison">'+panel(ctx,defense,selected,selected.away.abbr,selected.home.abbr,tab)+
 panel(ctx,defense,selected,selected.home.abbr,selected.away.abbr,tab)+'</div>';
 const details=state.rows.get(selectedRow);
 if(details)content+=playerDrill(details,tab);
 return '<section class="ts-role-board">'+h+'<div class="ts-role-source">'+E(sources)+'</div>'+nav+
 '<div class="ts-role-legend"><span><i class="favorable"></i> Top third (most allowed)</span><span><i class="neutral"></i> Middle third</span><span><i class="difficult"></i> Bottom third (least allowed)</span><span>Ranked only with ≥16 verified defenses</span></div>'+
 content+
 '<p class="ts-role-fine"><b>Data scope:</b> All opponent defensive numbers are observed 2026 season position-group allowances; L5/L10 only change the individual player rows because defensive L5/L10 breakdowns are not present. Defensive red-zone opportunity columns intentionally show —: this feed cannot verify defense-specific inside-20 targets. Player RZ OPP uses current 2026 nflverse goal-area carries/targets combined when individually validated, season-only. Longer/shortest receptions and true WR–CB assignments are not sourced. Ranking colors reflect opponent defense allowances rather than a calculated individual player grade. Ties share rank.</p></section>';
}
function repaint(){const root=document.getElementById('tsoRoleBoard');if(root&&state.ctx)root.innerHTML=render(state.ctx);}
function click(e){
 const root=e.target.closest('#tsoRoleBoard');if(!root)return false;
 const tab=e.target.closest('[data-role-tab]');
 if(tab){state.tab=tab.dataset.roleTab;state.sort='role';state.selected=null;repaint();return true;}
 const metric=e.target.closest('[data-role-sort]');
 if(metric){state.sort=metric.dataset.roleSort;repaint();return true;}
 if(e.target.closest('[data-role-advanced]')){state.advanced=!state.advanced;repaint();return true;}
 const row=e.target.closest('[data-role-player]');
 if(row){state.selected=String(row.dataset.rolePlayer||'');repaint();document.querySelector('.ts-role-drill')?.scrollIntoView({block:'nearest'});return true;}
 if(e.target.closest('[data-role-close]')){state.selected=null;repaint();return true;}
 return false;
}
function change(e){
 if(!e.target.closest('#tsoRoleBoard'))return false;
 if(e.target.matches('[data-role-game]')){state.game=e.target.value;state.selected=null;repaint();return true;}
 if(e.target.matches('[data-role-range]')){state.range=e.target.value;state.selected=null;repaint();return true;}
 if(e.target.matches('[data-role-order]')){state.sort=e.target.value;repaint();return true;}
 return false;
}
function input(e){
 if(!e.target.matches('#tsoRoleBoard [data-role-search]'))return false;
 state.search=e.target.value;const pos=e.target.selectionStart;repaint();
 const next=document.querySelector('#tsoRoleBoard [data-role-search]');next?.focus();try{next?.setSelectionRange(pos,pos)}catch(_){}
 return true;
}
document.addEventListener('click',click);
document.addEventListener('change',change);
document.addEventListener('input',input);
window.TSO3RoleBoard={render,state,metrics:METRICS,indexDefense,playerStats,allowed,redzone};
})();
