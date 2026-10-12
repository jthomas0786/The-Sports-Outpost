/* TSO 2.0 Matchup Intelligence — game-first ranked player prop analysis.
 * Uses the existing /api/props, /api/research-detail and /api/prop-history.
 * Source-backed stats only; missing fields remain unavailable. */
(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const n=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const pct=v=>n(v)===null?'—':n(v).toFixed(1)+'%';
const amount=(v,suffix='')=>n(v)===null?'—':n(v).toFixed(1).replace(/\.0$/,'')+suffix;
const odds=v=>n(v)===null?'—':n(v)>0?'+'+Math.round(n(v)):String(Math.round(n(v)));
const marketGroup=row=>{
 const m=String(row?.market||'').toLowerCase();
 if(['atd','fgs','atg','firsttd','hr','homerun','goals'].includes(m))return 'SCORERS';
 if(/yards|reception|completion|strikeout|sog|save/.test(m))return 'YARDS / VOLUME';
 return 'OTHER PROPS';
};
const eventMarkets=new Set(['atd','fgs','atg','firsttd','hr','homerun']);
const state={expanded:new Set(),cached:new Map(),pending:new Map(),scouting:new Map(),activeFilter:'ALL',showAll:false,activeGame:''};
function key(row){return String(row?.key||'');}
function exactSelection(row){
 if(row?.selection)return String(row.selection);
 if(eventMarkets.has(String(row.market||'').toLowerCase()))return 'Yes';
 const line=n(row.line),side=row.side==='under'?'Under':'Over';
 return line===null?side:side+' '+amount(line);
}
function signEdge(value){return n(value)===null?'—':(n(value)>0?'+':'')+n(value).toFixed(1)+' pp';}
function rowBadge(row){
 const m=row?.model||{};
 if(n(m.probabilityPct)!==null)return '<span class="mi-prob"><b>'+pct(m.probabilityPct)+'</b><small>MODEL %</small></span>';
 return '<span class="mi-prob mi-prob--market"><b>'+odds(row.price)+'</b><small>MARKET ONLY</small></span>';
}
function playerMarkup(row,i){
 const id=key(row),open=state.expanded.has(id);
 const model=row?.model||{};
 const src=String(row.headshotUrl||'');
 const photo=src&&/^https:\/\//i.test(src)?'<img src="'+esc(src)+'" alt="" loading="lazy">':'<span aria-hidden="true">'+esc(String(row.player||'P').split(' ').slice(0,2).map(s=>s[0]||'').join('').toUpperCase())+'</span>';
 const score=n(model.score??model.rating);
 const details='<div class="mi-expanded-stats">'
   +'<div><small>MODEL PROBABILITY</small><strong>'+pct(model.probabilityPct)+'</strong></div>'
   +'<div><small>MARKET IMPLIED</small><strong>'+pct(row.impliedPct)+'</strong></div>'
   +'<div><small>MODEL EDGE</small><strong>'+signEdge(model.edgePct)+'</strong></div>'
   +'<div><small>SPORTSBOOK PRICE</small><strong>'+odds(row.price)+'</strong></div>'
   +'</div>'
   +'<div class="mi-reason"><b>WHY THIS PROP?</b><p>'+esc(model.reason||model.explanation||row.reason||'The exact market quote is verified; a matchup-specific explanation is not available in this source.')+'</p></div>'
   +'<div data-mi-research="'+esc(id)+'" class="mi-analytics">'+(state.cached.has(id)?renderResearch(state.cached.get(id),row):'<div class="mi-loading">Open to load verified recent form, matchup and line history.</div>')+'</div>'
   +'<div class="mi-actions"><button type="button" class="mi-add" data-mi-add="'+esc(id)+'">+ PARLAY PING</button><small>Exact player · market · side · line · book</small></div>';
 return '<article class="mi-player '+(open?'is-open':'')+'" data-mi-key="'+esc(id)+'">'
   +'<div class="mi-player-head"><button type="button" class="mi-player-expand" data-mi-expand="'+esc(id)+'" aria-expanded="'+open+'">'
   +'<span class="mi-rank">'+(i+1)+'</span><span class="mi-photo">'+photo+'</span>'
   +'<span class="mi-player-label"><b>'+esc(row.player||'Player')+'</b><small>'+esc(row.marketLabel||row.market||'Prop')+' · '+esc(exactSelection(row))+' · '+esc(row.team||'')+'</small>'
   +'<em>'+esc(row.book||'Verified book')+' '+odds(row.price)+(score!==null?' · Rating '+amount(score):'')+'</em></span>'
   +rowBadge(row)+'<span class="mi-chevron">'+(open?'▴':'▾')+'</span>'
   +'</button></div><div class="mi-player-body" '+(open?'':'hidden')+'>'+details+'</div></article>';
}
function filterRows(rows){
 const active=state.activeFilter;
 return active==='ALL'?rows:rows.filter(r=>marketGroup(r)===active);
}
function listing(game,rows){
 const id=String(game?.league||'')+':'+String(game?.id||'');
 if(state.activeGame!==id){state.activeGame=id;state.activeFilter='ALL';state.showAll=false;state.expanded.clear();}
 const all=rows.filter(r=>r&&r.key&&r.player);
 // One card per exact side and threshold; the authoritative best quote is
 // carried by the original row, never fabricated or reconstructed.
 const unique=[...new Map(all.map(r=>[key(r),r])).values()];
 const ranked=unique.sort((a,b)=>{
   const ae=n(a.model?.edgePct),be=n(b.model?.edgePct);
   if(ae!==null&&be!==null)return be-ae;
   if(ae!==null)return -1;if(be!==null)return 1;
   return (n(b.model?.probabilityPct)??-1)-(n(a.model?.probabilityPct)??-1);
 });
 const filtered=filterRows(ranked),shown=state.showAll?filtered:filtered.slice(0,7);
 const filters=['ALL','SCORERS','YARDS / VOLUME','OTHER PROPS'].filter(x=>x==='ALL'||ranked.some(r=>marketGroup(r)===x));
 return '<section class="mi-game-vault" aria-label="Matchup scouting and ranked prop opportunities">'
   +'<header class="mi-game-vault-header"><div><small>MATCHUP INTELLIGENCE · VERIFIED TSO DATA</small><h2>Game scouting</h2><p>Compare the matchup first, then open a player for the numbers behind the selection.</p></div></header>'
   +'<div class="mi-teams">'
   +[game.away,game.home].map((t,i)=>{
     const opp=i===0?game.home:game.away;
     const abbr=String(t?.abbr||'TEAM');
     const logo=t?.logo&&/^https:\/\//i.test(t.logo)?'<img src="'+esc(t.logo)+'" alt="" loading="lazy">':'';
     const record=String(t?.record||'');
     return '<div class="mi-team" data-mi-defender="'+esc(abbr)+'"><div class="mi-team-title">'+logo+'<div><small>'+esc(abbr)+' DEFENSE</small><h3>What '+esc(abbr)+' gives up</h3></div></div>'
       +'<p>Against '+esc(String(opp?.abbr||'the opponent'))+(record?' · '+esc(record):'')+'</p>'
       +'<div class="mi-team-scout" data-mi-scout="'+esc(abbr)+'">Loading source-backed opponent tendencies when available…</div></div>';
   }).join('')
   +'</div>'
   +'<div class="mi-ranked"><div class="mi-ranked-head"><div><small>PLAYER PROP INTELLIGENCE</small><h2>Players to watch</h2><p>'+unique.length+' exact selection'+(unique.length===1?'':'s')+' · ranked by verified model edge where available</p></div></div>'
   +'<div class="mi-filters" role="group" aria-label="Prop markets">'+filters.map(f=>'<button type="button" class="'+(state.activeFilter===f?'is-active':'')+'" data-mi-filter="'+esc(f)+'">'+esc(f==='YARDS / VOLUME'?'YARDS / STATS':f)+'</button>').join('')+'</div>'
   +'<div class="mi-player-list">'+(shown.length?shown.map(playerMarkup).join('')
      :'<div class="mi-empty">No exact verified player selections match this filter. No example players or probabilities are shown.</div>')+'</div>'
   +(filtered.length>7?'<button type="button" class="mi-show-all" data-mi-all>'+(state.showAll?'Show fewer':'Show all '+filtered.length+' selections')+'</button>':'')
   +'</div></section>';
}
function seriesFromResearch(data,row){
 if(!data?.available)return[];
 const m=String(row.market||'');
 const p=data.player||{},s=String(row.sport||'').toLowerCase();
 const out=[];
 const nflField={rushYds:'rushYds',recYds:'recYds',receptions:'receptions',passYds:'passYds',passTds:'passTds',completions:'completions',atd:'tds'}[m];
 const nbaField=m;
 for(const g of s==='nfl'?(m==='firstTd'?p.periodGameLog||[]:p.gameLog||[]):s==='mlb'?p.gameLog||[]:p.recentGames||[]){
   let v=null;
   if(s==='nfl')v=n(m==='firstTd'?g.firstTd:g[nflField]);
   if(s==='nba')v=n(g.stats?.[nbaField]);
   if(s==='nhl')v=n(m==='fgs'?g.firstGoal?1:0:m==='atg'?g.stats?.goals:g.stats?.[m]);
   if(s==='mlb'){
     const f={hr:'hr',homeRun:'hr',hits:'h',totalBases:'totalBases',rbi:'rbi',runs:'r',singles:'singles',doubles:'doubles',triples:'triples',walks:'walks',batterStrikeouts:'strikeouts',stolenBases:'stolenBases'}[m];
     v=n(g[f]);
     if(m==='hrr')v=[g.h,g.r,g.rbi].map(n).every(x=>x!==null)?Number(g.h)+Number(g.r)+Number(g.rbi):null;
   }
   if(v!==null)out.push({value:v,date:g.date,opponent:g.opponent,source:g.source||''});
 }
 return out.sort((a,b)=>(Date.parse(b.date||'')||0)-(Date.parse(a.date||'')||0));
}
function hit(value,row){
 const m=String(row.market||'').toLowerCase();
 if(eventMarkets.has(m))return value>0?'hit':'miss';
 const line=n(row.line);if(line===null)return null;
 if(Math.abs(value-line)<1e-8)return'push';
 return row.side==='under'?(value<line?'hit':'miss'):(value>line?'hit':'miss');
}
function lastStats(series,row,count){
 const window=series.slice(0,count);
 const decisions=window.map(g=>hit(g.value,row)).filter(v=>v==='hit'||v==='miss');
 const won=decisions.filter(x=>x==='hit').length;
 return {label:'L'+count,display:decisions.length?won+'/'+decisions.length:'—',rate:decisions.length?Math.round(100*won/decisions.length):null,games:window.length};
}
function researchNotes(data,row){
 const notes=[];
 const p=data?.player||{},sport=String(row.sport||'').toLowerCase();
 if(sport==='nfl'){
   if(p.position)notes.push('Position: '+p.position);
   const perf=p.matchup?.previousSeasonAllowed?.perGame||{};
   for(const [name,key,suffix] of [['Opponent TDs allowed','tds',' per game'],['Opponent rush yards allowed','rushYds',' / game'],['Opponent receiving yards allowed','recYds',' / game']]){
     if(n(perf[key])!==null)notes.push('Previous-season '+name.toLowerCase()+': '+amount(perf[key])+suffix);
   }
   if(n(p?.snapTrend?.last3AvgPct)!==null)notes.push('Snap share (last 3): '+pct(p.snapTrend.last3AvgPct));
 }
 if(sport==='nba'){
   if(n(data.matchup?.teamPace)!==null)notes.push('Team pace: '+amount(data.matchup.teamPace));
   if(n(data.matchup?.opponentPace)!==null)notes.push('Opponent pace: '+amount(data.matchup.opponentPace));
   if(p.position)notes.push('Position: '+p.position);
 }
 if(sport==='nhl'){
   if(n(p.recentAverages?.shotsOnGoal)!==null)notes.push('Recent SOG/game: '+amount(p.recentAverages.shotsOnGoal));
   if(n(p.shootingPct)!==null)notes.push('Shooting %: '+pct(p.shootingPct));
 }
 if(sport==='mlb'){
   if(p.battingOrder!=null)notes.push('Batting order: '+String(p.battingOrder));
   if(n(data.opponent?.pitcher?.era)!==null)notes.push('Opposing starter ERA: '+amount(data.opponent.pitcher.era));
 }
 return notes;
}
function renderResearch(data,row){
 if(!data?.available)return '<div class="mi-research-unavailable">Detailed historical context unavailable: '+esc(data?.reason||'No verified research snapshot.')+'</div>';
 const series=seriesFromResearch(data,row);
 const form=series.length
   ?'<div class="mi-form-metrics">'+[lastStats(series,row,5),lastStats(series,row,10)].map(x=>
      '<div><small>'+x.label+' EXACT LINE</small><b>'+x.display+'</b><span>'+(x.rate!==null?x.rate+'%':'Insufficient data')+'</span></div>').join('')
      +'<div><small>L5 AVERAGE</small><b>'+amount(series.slice(0,5).reduce((a,b)=>a+b.value,0)/Math.min(5,series.length))+'</b><span>Observed games</span></div></div>'
     +'<div class="mi-recent-log"><b>RECENT GAMES · EXACT SELECTION</b><div>'+series.slice(0,10).map(g=>
        '<span class="is-'+esc(hit(g.value,row)||'unknown')+'" title="'+esc((g.date||'')+' '+(g.opponent||''))+'">'+esc(amount(g.value))+'</span>').join('')+'</div>'
        +'<small>'+esc(series[0].source||data?.sources?.player||data?.source||'Verified game log')+' · '+series.length+' observed games available</small></div>'
   :'<div class="mi-research-unavailable">Exact-market game-log hit rate unavailable for this player and prop. No proxy metric is substituted.</div>';
 const notes=researchNotes(data,row);
 const source=String(data.sources?.player||data.source||data?.player?.recentSource||'TSO verified research snapshot');
 return '<div class="mi-section"><h4>Recent form</h4>'+form+'</div>'
   +'<div class="mi-section"><h4>Matchup & role</h4>'
   +(notes.length?'<div class="mi-research-notes">'+notes.map(v=>'<span>'+esc(v)+'</span>').join('')+'</div>':'<p class="mi-muted">Specific role or opponent-defense statistics are not available in this player snapshot.</p>')
   +'<small class="mi-muted">Source: '+esc(source)+'</small></div>'
   +'<div class="mi-section"><h4>Sportsbook line movement</h4><div data-mi-history="'+esc(key(row))+'">Loading committed sportsbook history…</div></div>';
}
function scoutingFromResult(data,against,game){
 if(!data?.available)return null;
 const sport=String(game.league||'').toLowerCase();
 if(sport==='nfl'){
   const per=data?.player?.matchup?.previousSeasonAllowed?.perGame||{};
   const names=[['tds','TDs allowed / game'],['rushYds','Rush yards / game'],['recYds','Receiving yards / game']];
   const metrics=names.filter(([k])=>n(per[k])!==null).map(([k,label])=>'<span><b>'+amount(per[k])+'</b><small>'+label+'</small></span>');
   if(metrics.length)return '<b>Previous-season opponent allowance</b><div class="mi-scout-metrics">'+metrics.join('')+'</div><small>Player research context; not a current-week defensive ranking.</small>';
 }
 if(sport==='nba'){
   const pace=n(data?.matchup?.opponentPace);
   if(pace!==null)return '<b>Verified opponent pace context</b><div class="mi-scout-metrics"><span><b>'+amount(pace)+'</b><small>Possessions estimate / game</small></span></div>';
 }
 if(sport==='mlb'){
   const era=n(data?.opponent?.pitcher?.era);
   if(era!==null)return '<b>Projected opponent starter</b><div class="mi-scout-metrics"><span><b>'+amount(era)+'</b><small>ERA</small></span></div>';
 }
 return null;
}
function getResearch(row,ctx){
 const id=key(row);if(state.cached.has(id))return Promise.resolve(state.cached.get(id));
 if(state.pending.has(id))return state.pending.get(id);
 const task=Promise.resolve().then(()=>ctx.research(row)).then(data=>{
   state.cached.set(id,data);return data;
 }).finally(()=>state.pending.delete(id));
 state.pending.set(id,task);return task;
}
function updatePlayer(row,root,ctx){
 const node=root.querySelector('[data-mi-research="'+CSS.escape(key(row))+'"]');
 if(!node)return;
 if(state.cached.has(key(row)))return updateResearchNode(node,row,state.cached.get(key(row)),ctx);
 node.innerHTML='<div class="mi-loading">Loading verified player game logs and opponent context…</div>';
 getResearch(row,ctx).then(data=>{
   if(!node.isConnected||node.closest('[data-mi-key]')?.dataset.miKey!==key(row))return;
   updateResearchNode(node,row,data,ctx);
   updateScouting(root,ctx);
 }).catch(e=>{
   if(node.isConnected)node.innerHTML='<div class="mi-research-unavailable">Detailed research temporarily unavailable. '+esc(e?.message||String(e))+'</div>';
 });
}
function updateResearchNode(node,row,data,ctx){
 node.innerHTML=renderResearch(data,row);
 const hist=node.querySelector('[data-mi-history]');
 if(hist&&typeof ctx.history==='function'){
   Promise.resolve().then(()=>ctx.history(row,row.book)).then(doc=>{
     if(!hist.isConnected)return;
     if(!doc?.available||!doc.open||!doc.current){
       hist.innerHTML='<p class="mi-muted">Exact quote history is not currently available for this book and line.</p>';return;
     }
     hist.innerHTML='<div class="mi-form-metrics">'
       +'<div><small>FIRST OBSERVED</small><b>'+odds(doc.open.price)+'</b><span>Committed snapshot</span></div>'
       +'<div><small>CURRENT</small><b>'+odds(doc.current.price)+'</b><span>'+esc(row.book||'Exact book')+'</span></div>'
       +'<div><small>OBSERVATIONS</small><b>'+String(doc.points?.length||0)+'</b><span>Verified snapshots</span></div></div>';
   }).catch(()=>{if(hist.isConnected)hist.innerHTML='<p class="mi-muted">Sportsbook movement unavailable at this time.</p>';});
 }
}
function updateScouting(root,ctx){
 const game=ctx.game,rows=ctx.rows;
 if(!game)return;
 for(const t of [game.away,game.home]){
   const opp=String(t?.abbr||'');
   const node=[...root.querySelectorAll('[data-mi-scout]')].find(x=>x.dataset.miScout===opp);
   if(!node)continue;
   const row=rows.find(r=>String(r.team||'').toLowerCase()!==opp.toLowerCase());
   if(!row){node.textContent='No verified opponent research for this matchup yet.';continue;}
   const memo=state.cached.get(key(row));
   if(memo){node.innerHTML=scoutingFromResult(memo,opp,game)||'<span>Opponent positional allowance data is not available from the verified source yet.</span>';continue;}
   node.textContent='Checking verified opponent-defense data…';
   getResearch(row,ctx).then(data=>{
     if(node.isConnected)node.innerHTML=scoutingFromResult(data,opp,game)||'<span>Source-backed opponent allowance data is unavailable for this matchup.</span>';
   }).catch(()=>{if(node.isConnected)node.textContent='Opponent scouting feed is currently unavailable.';});
 }
}
function bind(root,ctx){
 const game=ctx.game,rows=ctx.rows||[];
 root.querySelectorAll('[data-mi-expand]').forEach(b=>b.onclick=()=>{
   const k=b.dataset.miExpand;
   if(state.expanded.has(k))state.expanded.delete(k);else state.expanded.add(k);
   const card=b.closest('.mi-player'),opened=state.expanded.has(k),body=card?.querySelector('.mi-player-body');
   if(!card||!body)return;
   card.classList.toggle('is-open',opened);
   body.hidden=!opened;b.setAttribute('aria-expanded',String(opened));
   const arrow=b.querySelector('.mi-chevron');if(arrow)arrow.textContent=opened?'▴':'▾';
   if(opened){const row=rows.find(x=>key(x)===k);if(row)updatePlayer(row,root,ctx);}
 });
 root.querySelectorAll('[data-mi-add]').forEach(b=>b.onclick=()=>{
   const row=rows.find(x=>key(x)===b.dataset.miAdd);if(row)ctx.addProp(row);
 });
 root.querySelectorAll('[data-mi-filter]').forEach(b=>b.onclick=()=>{
   state.activeFilter=b.dataset.miFilter;state.showAll=false;ctx.refresh();
 });
 root.querySelector('[data-mi-all]')?.addEventListener('click',()=>{state.showAll=!state.showAll;ctx.refresh();});
 for(const k of state.expanded){const row=rows.find(x=>key(x)===k);if(row)updatePlayer(row,root,ctx);}
 updateScouting(root,ctx);
}
window.TSO2Matchup={listing,bind,matchedStats:seriesFromResearch};
})();