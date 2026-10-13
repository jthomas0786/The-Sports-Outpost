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
const marketNames={
 nfl:{atd:'Anytime TD',firstTd:'First TD',passYds:'Passing Yards',passTds:'Passing TDs',recYds:'Receiving Yards',receptions:'Receptions',rushYds:'Rushing Yards',completions:'Completions',longestReception:'Longest Reception',rushAtt:'Rushing Attempts'},
 nba:{points:'Points',rebounds:'Rebounds',assists:'Assists',threes:'3-Pointers Made',pra:'PRA',pr:'Points + Rebounds',pa:'Points + Assists',ra:'Rebounds + Assists',steals:'Steals',blocks:'Blocks'},
 mlb:{hr:'Home Runs',hits:'Hits',totalBases:'Total Bases',rbi:'RBI',runs:'Runs',pitcherStrikeouts:'Pitcher Strikeouts',strikeouts:'Strikeouts',stolenBases:'Stolen Bases',walks:'Walks'},
 nhl:{atg:'Anytime Goal',fgs:'First Goal',sog:'Shots on Goal',points:'Points',assists:'Assists',goals:'Goals',saves:'Goalie Saves',blocks:'Blocked Shots'}
};
const orderedMarkets={
 nfl:['atd','firstTd','passYds','passTds','recYds','receptions','rushYds','rushAtt','completions','longestReception'],
 nba:['points','rebounds','assists','threes','pra','pr','pa','ra','steals','blocks'],
 mlb:['hr','hits','totalBases','rbi','runs','pitcherStrikeouts','strikeouts','stolenBases','walks'],
 nhl:['atg','fgs','sog','points','assists','goals','saves','blocks']
};
const eventMarkets=new Set(['atd','fgs','atg','firsttd','firstTd','hr','homerun','homeRun']);
const marketName=row=>marketNames[String(row?.sport||'').toLowerCase()]?.[String(row?.market||'')]||String(row?.marketLabel||row?.market||'Other Props');
function eligibleOver(row){
 if(!row||!row.key||!row.player||row.researchRosterRow)return false;
 const side=String(row.side||'').trim().toLowerCase();
 const pick=String(row.selection||'').trim().toLowerCase();
 if(['under','no','false'].includes(side)||/^(?:under\b|u\s+\d|no\b)/i.test(pick))return false;
 if(['over','yes','true'].includes(side))return true;
 // Yes-only binary scorer markets may omit a side; never infer an Over from
 // missing selection on a normal total / counting market.
 return eventMarkets.has(String(row.market||''))&&(/^(yes|over)\b/i.test(pick));
}
function orderedMarketKeys(rows,sport){
 const present=[...new Set(rows.map(r=>String(r.market||'')))];
 const order=orderedMarkets[String(sport||'').toLowerCase()]||[];
 return present.sort((a,b)=>{
  const ai=order.indexOf(a),bi=order.indexOf(b);
  if(ai!==-1&&bi!==-1)return ai-bi;
  if(ai!==-1)return -1;if(bi!==-1)return 1;
  return marketName({sport,market:a}).localeCompare(marketName({sport,market:b}));
 });
}
const state={expanded:new Set(),cached:new Map(),pending:new Map(),scouting:new Map(),activeFilter:'ALL PROPS',showAll:false,activeGame:'',signalDoc:null};
function key(row){return String(row?.key||'');}
function exactSelection(row){
 if(row?.selection)return String(row.selection);
 if(eventMarkets.has(String(row.market||'').toLowerCase()))return 'Yes';
 const line=n(row.line),side='Over';
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
   +'<span class="mi-player-label"><b>'+esc(row.player||'Player')+'</b><small>'+esc(marketName(row))+' · '+esc(exactSelection(row))+' · '+esc(row.team||'')+'</small>'
   +'<em>'+esc(row.book||'Verified book')+' '+odds(row.price)+'</em></span>'
   +'<span class="mi-signal-mini" data-mi-signal="'+esc(id)+'">'+signalMini(row,state.cached.get(id),state.signalDoc)+'</span>'
   +rowBadge(row)+'<span class="mi-chevron">'+(open?'▴':'▾')+'</span>'
   +'</button></div><div class="mi-player-body" '+(open?'':'hidden')+'>'+details+'</div></article>';
}
function filterRows(rows){
 return state.activeFilter==='ALL PROPS'?rows:rows.filter(r=>String(r.market||'')===state.activeFilter);
}
function listing(game,rows){
 const id=String(game?.league||'')+':'+String(game?.id||'');
 if(state.activeGame!==id){state.activeGame=id;state.activeFilter='ALL PROPS';state.showAll=false;state.expanded.clear();}
 const all=rows.filter(eligibleOver);
 // One card per exact side and threshold; the authoritative best quote is
 // carried by the original row, never fabricated or reconstructed.
 const unique=[...new Map(all.map(r=>[key(r),r])).values()];
 // Display the highest verified MODEL probability first, regardless of
 // sportsbook edge. Missing model probabilities always appear at the bottom.
 // Only break equal probabilities with model edge and a stable player name.
 const ranked=unique.sort((a,b)=>{
   const ap=n(a.model?.probabilityPct),bp=n(b.model?.probabilityPct);
   if(ap===null&&bp!==null)return 1;
   if(ap!==null&&bp===null)return -1;
   if(ap!==null&&bp!==null&&ap!==bp)return bp-ap;
   const ae=n(a.model?.edgePct),be=n(b.model?.edgePct);
   if(ae!==null&&be!==null&&ae!==be)return be-ae;
   if(ae===null&&be!==null)return 1;
   if(ae!==null&&be===null)return -1;
   return String(a.player||'').localeCompare(String(b.player||''))||
     String(a.key||'').localeCompare(String(b.key||''));
 });
 const filtered=filterRows(ranked),shown=state.showAll?filtered:filtered.slice(0,7);
 const filters=['ALL PROPS',...orderedMarketKeys(ranked,game.league)];
 return '<section class="mi-game-vault" aria-label="Matchup scouting and ranked prop opportunities">'
   +'<header class="mi-game-vault-header"><div><small>MATCHUP INTELLIGENCE · VERIFIED TSO DATA</small><h2>Game scouting</h2><p>Compare the matchup first, then open a player for the numbers behind the selection.</p></div></header>'
   +'<div class="mi-teams">'
   +[game.away,game.home].map((t,i)=>{
     const opp=i===0?game.home:game.away;
     const abbr=String(t?.abbr||'TEAM');
     const logo=t?.logo&&/^https:\/\//i.test(t.logo)?'<img src="'+esc(t.logo)+'" alt="" loading="lazy">':'';
     const record=String(t?.record||'');
     return '<div class="mi-team" data-mi-defender="'+esc(abbr)+'"><div class="mi-team-title">'+logo+'<div><small>'+esc(abbr)+' MATCHUP</small><h3>'+esc(abbr)+' defense vs '+esc(String(opp?.abbr||'opponent'))+' offense</h3></div></div>'
       +'<p>Facing '+esc(String(opp?.abbr||'the opposing team'))+(record?' · '+esc(record):'')+'</p>'
       +'<div class="mi-team-scout" data-mi-scout="'+esc(abbr)+'">Checking opponent defensive data…</div>'
       +'<div class="mi-opposing-attack" data-mi-attack="'+esc(abbr)+'">Checking verified opponent offensive opportunity data…</div></div>';
   }).join('')
   +'</div>'
   +'<div class="mi-ranked"><div class="mi-ranked-head"><div><small>PLAYER PROP INTELLIGENCE · OVERS & YES ONLY</small><h2>Players to watch</h2><p>'+unique.length+' Over/Yes selection'+(unique.length===1?'':'s')+' · highest model probability first · choose an exact market below</p></div></div>'
   +'<div class="mi-filters" role="group" aria-label="Prop markets">'+filters.map(f=>'<button type="button" class="'+(state.activeFilter===f?'is-active':'')+'" data-mi-filter="'+esc(f)+'">'+esc(f==='ALL PROPS'?f:marketName({sport:game.league,market:f}))+' <span class="mi-filter-count">'+(f==='ALL PROPS'?ranked.length:ranked.filter(r=>String(r.market||'')===f).length)+'</span></button>').join('')+'</div>'
   +'<div class="mi-player-list">'+(shown.length?shown.map(playerMarkup).join('')
      :'<div class="mi-empty">No verified Over/Yes selections in this market. Choose a different prop category. Unders remain available in Advanced Props.</div>')+'</div>'
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

const clamp=(value,lo,hi)=>Math.max(lo,Math.min(hi,value));
function marketThreshold(row){
 return eventMarkets.has(String(row.market||''))?0.5:n(row.line);
}
function hitRateVisual(series,row,count){
 const stat=lastStats(series,row,count);
 const percentage=stat.rate===null?null:clamp(stat.rate,0,100);
 return '<div class="mi-hit-visual"><div class="mi-hit-visual-header"><strong>'+stat.label+'</strong><span>'+stat.display+' '+(percentage===null?'':'· '+percentage+'%')+'</span></div>'
    +'<div class="mi-hit-track" role="progressbar" aria-label="'+stat.label+' exact-line hit rate" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+(percentage??0)+'" aria-valuetext="'+esc(percentage===null?'No verified exact-line observations':stat.display+' hits, '+percentage+' percent')+'">'
    +(percentage===null?'':'<span style="width:'+percentage+'%"></span>')+'</div></div>';
}
function recentGamesChart(series,row){
 const values=series.slice(0,10).reverse();
 const target=marketThreshold(row);
 if(!values.length||target===null)return '<p class="mi-muted">A chart needs verified individual game results and an exact sportsbook threshold.</p>';
 // Chart coordinates use only source game-log values (no interpolation of games).
 const max=Math.max(1,target,...values.map(g=>g.value));
 const top=Math.max(1,Math.ceil(max*1.13*10)/10);
 const left=42,right=658,topY=22,bottom=214,w=right-left,height=bottom-topY;
 const y=value=>bottom-clamp(value/top,0,1)*height;
 const slot=w/values.length,barW=clamp(slot*.57,18,47);
 const targetY=y(target);
 const ticks=[0,top*.5,top];
 const grid=ticks.map(v=>'<line x1="'+left+'" x2="'+right+'" y1="'+y(v).toFixed(1)+'" y2="'+y(v).toFixed(1)+'" stroke="#35433f" stroke-dasharray="3 6"/><text x="34" y="'+(y(v)+4).toFixed(1)+'" fill="#8fa6a4" text-anchor="end" font-size="12">'+esc(amount(v))+'</text>').join('');
 const bars=values.map((g,i)=>{
   const x=left+slot*i+(slot-barW)/2;
   const res=hit(g.value,row),barH=Math.max(3,bottom-y(g.value));
   const fill=res==='hit'?'#58d8a0':res==='push'?'#f0bc6d':'#ff775d';
   const label=g.date&&Number.isFinite(Date.parse(g.date))?
     new Date(g.date).toLocaleDateString('en-US',{month:'numeric',day:'numeric',timeZone:'UTC'}):'G'+(i+1);
   return '<g><title>'+esc((g.date||'Game '+(i+1))+' · '+amount(g.value)+' · '+(res||'unrated'))+'</title>'
     +'<rect x="'+x.toFixed(1)+'" y="'+(bottom-barH).toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+barH.toFixed(1)+'" rx="4" fill="'+fill+'" opacity=".96"/>'
     +'<text x="'+(x+barW/2).toFixed(1)+'" y="'+Math.max(13,bottom-barH-7).toFixed(1)+'" text-anchor="middle" fill="#e2eee8" font-size="12" font-weight="750">'+esc(amount(g.value))+'</text>'
     +'<text x="'+(x+barW/2).toFixed(1)+'" y="235" text-anchor="middle" fill="#9bada9" font-size="11">'+esc(label)+'</text></g>';
 }).join('');
 return '<div class="mi-chart-topline"><span>LAST '+values.length+' OBSERVED GAMES</span><span class="mi-chart-key"><i class="mi-key-hit"></i> HIT <i class="mi-key-miss"></i> MISS</span></div>'
   +'<div class="mi-chart-container"><svg class="mi-games-chart" viewBox="0 0 680 250" role="img" aria-label="'+esc('Last '+values.length+' verified games for '+row.player+', threshold '+amount(target))+ '" preserveAspectRatio="xMidYMid meet">'
   +grid+bars
   +'<line x1="'+left+'" x2="'+right+'" y1="'+targetY.toFixed(1)+'" y2="'+targetY.toFixed(1)+'" stroke="#ffd277" stroke-width="2" stroke-dasharray="7 5"/>'
   +'<rect x="486" y="'+Math.max(2,targetY-24).toFixed(1)+'" width="165" height="20" rx="3" fill="#362a17" stroke="#70562b"/>'
   +'<text x="644" y="'+Math.max(16,targetY-10).toFixed(1)+'" text-anchor="end" fill="#ffe3a0" font-size="11" font-weight="800">PROP LINE '+esc(eventMarkets.has(String(row.market||''))?'YES':amount(target))+'</text>'
   +'</svg></div>';
}
function usageMeter(label,value,note){
 const actual=n(value);
 if(actual===null||actual<0||actual>100)return '';
 return '<div class="mi-usage-row"><div><strong>'+esc(label)+'</strong><span>'+pct(actual)+'</span></div>'
  +'<div class="mi-usage-track"><span style="width:'+clamp(actual,0,100)+'%"></span></div>'
  +(note?'<small>'+esc(note)+'</small>':'')+'</div>';
}
function roleVisual(data,row){
 if(!data?.available)return '';
 const p=data.player||{};
 const sport=String(row.sport||'').toLowerCase();
 const role=[];
 if(sport==='nfl'){
   const snap=p.snapTrend||{};
   const average=snap.avgOffensePct??snap.last3AvgPct;
   if(n(average)!==null)role.push(usageMeter('Offensive snap share',average,'Verified observed snap percentage'));
   const ts=n(p.targetSharePct??p.targetShare?.pct??p.targetShare);
   if(ts!==null)role.push(usageMeter('Target share',ts,'Observed player share'));
   const last=p.last5?.avg||{};
   const targets=n(last.targets),carries=n(last.carries);
   if(targets!==null&&carries!==null&&targets+carries>0){
      const share=targets/(targets+carries)*100;
      role.push('<div class="mi-opportunity-split"><div class="mi-opportunity-legend"><b>Recent touches & targets</b><span>'+amount(targets)+' targets · '+amount(carries)+' carries/game</span></div>'
        +'<div class="mi-opportunity-track"><span style="width:'+share.toFixed(2)+'%"></span></div><small>Orange: targets · Dark: carries (L5 average)</small></div>');
   }
 }
 if(sport==='nba'){
   const min=n(p.recentAverages?.minutes??p.last5?.avg?.minutes);
   if(min!==null)role.push('<div class="mi-role-stat"><b>'+amount(min)+'</b><small>Recent minutes / game</small></div>');
   const use=n(p.usagePct??p.recentAverages?.usagePct);
   if(use!==null)role.push(usageMeter('Usage rate',use));
 }
 if(sport==='nhl'&&n(p.recentAverages?.shotsOnGoal)!==null)
   role.push('<div class="mi-role-stat"><b>'+amount(p.recentAverages.shotsOnGoal)+'</b><small>Recent shots on goal / game</small></div>');
 if(sport==='mlb'&&n(p.battingOrder)!==null)
   role.push('<div class="mi-role-stat"><b>#'+Math.round(n(p.battingOrder))+'</b><small>Verified batting-order slot</small></div>');
 return role.filter(Boolean).length?'<div class="mi-usage-visual">'+role.join('')+'</div>':'<p class="mi-muted">No verified usage percentages or role charts for this player yet.</p>';
}
function lineMovementChart(doc,row){
 if(!doc?.available||!doc.open||!doc.current)return '<p class="mi-muted">Verified sportsbook line movement is not available for this exact market and book.</p>';
 const points=(Array.isArray(doc.points)?doc.points:[]).filter(p=>n(p?.price??p?.odds)!==null).slice(-40);
 const labels='<div class="mi-move-labels"><span><small>OPEN</small><strong>'+odds(doc.open.price)+'</strong></span>'
  +'<span><small>CURRENT</small><strong>'+odds(doc.current.price)+'</strong></span>'
  +'<span><small>SNAPSHOTS</small><strong>'+points.length+'</strong></span></div>';
 if(points.length<2)return labels+'<p class="mi-muted">A trend chart needs at least two saved price observations. No movement is inferred from one snapshot.</p>';
 // Convert American odds into implied market probability; raw negative/positive
 // odds cross zero discontinuously, so plotting their numbers is misleading.
 const implied=american=>{
   const x=n(american);if(x===null||x===0)return null;
   return x<0?100*(-x)/((-x)+100):100*100/(x+100);
 };
 const values=points.map(p=>implied(p.price??p.odds));
 if(values.some(v=>v===null))return labels+'<p class="mi-muted">Price history contains an invalid implied-probability value.</p>';
 const low=Math.max(0,Math.min(...values)-3),high=Math.min(100,Math.max(...values)+3);
 const y=v=>20+(100-20)*(1-(v-low)/Math.max(1,high-low));
 const x=i=>18+i*(604/Math.max(1,values.length-1));
 const pts=values.map((v,i)=>x(i).toFixed(1)+','+y(v).toFixed(1)).join(' ');
 const dots=values.map((v,i)=>'<circle cx="'+x(i).toFixed(1)+'" cy="'+y(v).toFixed(1)+'" r="'+(i===values.length-1?5:3)+'" fill="#ffd379"><title>'+esc('Snapshot '+(i+1)+': '+odds(points[i].price??points[i].odds)+' ('+pct(v)+' implied)')+'</title></circle>').join('');
 return labels+'<div class="mi-chart-container"><svg class="mi-movement-chart" viewBox="0 0 640 130" role="img" aria-label="'+esc('Verified sportsbook quote history, '+values.length+' observations')+'">'
   +'<line x1="18" x2="622" y1="100" y2="100" stroke="#39443d" stroke-dasharray="3 6"/>'
   +'<polyline points="'+pts+'" fill="none" stroke="#ffd379" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"/>'+dots
   +'<text x="18" y="123" font-size="11" fill="#91aaa0">First observed</text><text x="622" y="123" font-size="11" fill="#91aaa0" text-anchor="end">Latest saved</text>'
   +'</svg></div><small class="mi-muted">Trend shows the implied probability of the saved American prices, not a model projection.</small>';
}
// The Research page already publishes verified nflverse PBP usage shares. The
// Game Hub must reuse these exact GSIS-keyed observations, never join by name.
const NFL_PBP_SOURCE='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/tso-2.0-restructure/tso2/data/nfl-td-opportunities.json';
let nflPbpPromise=null;
function loadNflPbp(){
 if(!nflPbpPromise){
   nflPbpPromise=fetch(NFL_PBP_SOURCE,{cache:'no-store',headers:{accept:'application/json'}}).then(async response=>{
     if(!response.ok)throw Error('NFL play-by-play source HTTP '+response.status);
     const doc=await response.json();
     if(doc?.schemaVersion!==1||!String(doc.source||'').includes('nflverse')||
       !doc.seasons?.['2026']?.players||!doc.generatedAt)
       throw Error('Unverified NFL opportunity dataset');
     const generated=Date.parse(doc.generatedAt);
     if(!Number.isFinite(generated)||generated>Date.now()+3600000)
       throw Error('Invalid NFL source date');
     return doc;
   }).catch(error=>{
     nflPbpPromise=null;
     throw error;
   });
 }
 return nflPbpPromise;
}
const nflTeamCode=value=>({LAR:'LA',JAC:'JAX',WSH:'WAS'}[String(value||'').toUpperCase()]||String(value||'').toUpperCase());
function opportunityForPlayer(doc,research,row){
 if(!doc?.seasons?.['2026']||!research?.available||String(row?.sport||'').toLowerCase()!=='nfl')
   return null;
 const p=research.player||{},gsis=String(p.gsisId||'').trim(),team=nflTeamCode(row.team);
 if(!/^00-\d{7}$/.test(gsis)||!team||nflTeamCode(p.team)!==team)return null;
 const stat=doc.seasons['2026'].players?.[gsis];
 if(!stat||nflTeamCode(stat.team)!==team||Number(stat.gamesWithOpportunities||0)<1)return null;
 return stat;
}
function opportunityEvidence(doc,research,row){
 if(!doc)return '<p class="mi-muted">Verified play-by-play opportunity data is unavailable.</p>';
 const stat=opportunityForPlayer(doc,research,row);
 if(!stat)return '<p class="mi-muted">No exact GSIS player-and-team match in the NFL opportunity snapshot. Usage is not inferred from another player.</p>';
 const stamp=String(doc.generatedAt||'').slice(0,10);
 const age=Date.now()-Date.parse(doc.generatedAt);
 const outdated=Number.isFinite(age)&&age>10*86400000;
 const sample=n(stat.gamesWithOpportunities);
 const metrics=[['TARGET SHARE',stat.targetSharePct,'Share of team targets'],['CARRY SHARE',stat.carrySharePct,'Share of team carries'],
   ['RED-ZONE SHARE',stat.redZoneSharePct,'Share of team carries + targets inside the 20'],
   ['GOAL-LINE SHARE',stat.goalLineSharePct,'Share of team carries + targets inside the 5']]
   .filter(([,value])=>n(value)!==null&&n(value)>=0&&n(value)<=100);
 const bars=metrics.map(([name,value,note])=>
   '<div class="mi-verified-usage"><div><b>'+esc(name)+'</b><strong>'+pct(value)+'</strong></div>'
   +'<div class="mi-verified-usage-track"><span style="width:'+Math.max(0,Math.min(100,n(value)))+'%"></span></div>'
   +'<small>'+esc(note)+'</small></div>').join('');
 const counts=[['TARGETS',stat.targets],['CARRIES',stat.carries],['RED-ZONE CHANCES',stat.redZoneOpps],['GOAL-LINE CHANCES',stat.goalLineOpps],['RZ TD YIELD',stat.redZoneTdYieldPct,'percent']]
   .filter(([,value])=>n(value)!==null).map(([title,value,type])=>
    '<div class="mi-pbp-count"><span>'+esc(title)+'</span><strong>'+esc(amount(value,type==='percent'?'%':''))+'</strong></div>').join('');
 return '<div class="mi-nfl-opportunity-head"><div><b>WHERE THE OPPORTUNITIES COME FROM</b>'
   +'<small>2026 nflverse play-by-play · updated '+esc(stamp)
   +(outdated?' · AGED SOURCE, REFRESH NEEDED':'')+'</small></div>'
   +'<strong>'+esc(sample??'—')+' games</strong></div>'
   +'<div class="mi-opportunity-layout"><div class="mi-opportunity-bars">'+(bars||'<p class="mi-muted">No verified share denominators.</p>')+'</div>'
   +'<div class="mi-pbp-counts">'+counts+'</div></div>'
   +'<p class="mi-evidence-note">Percentages are a player’s share of observed team opportunities, not his probability of hitting this prop. '
   +'Touchdown yield is observed red-zone conversion, not a forecast.</p>';
}
function decisionEvidence(data,row){
 const series=seriesFromResearch(data,row);
 const line=eventMarkets.has(String(row.market||''))?null:marketThreshold(row),l5=lastStats(series,row,5),l10=lastStats(series,row,10);
 const sample5=series.slice(0,5);
 const average=sample5.length?sample5.reduce((sum,g)=>sum+g.value,0)/sample5.length:null;
 const avgDelta=average!==null&&line!==null?average-line:null;
 const model=n(row?.model?.probabilityPct);
 const gap=l10.rate!==null&&model!==null?model-l10.rate:null;
 const conflict=gap!==null&&Math.abs(gap)>=15&&l10.games>=5;
 const display=(name,value,detail,stateLabel)=>'<div class="mi-read-signal '+(stateLabel||'')+'"><small>'+esc(name)+'</small>'
   +'<strong>'+esc(value)+'</strong><span>'+esc(detail)+'</span></div>';
 let signals=[
   display('LAST 5 VS THIS LINE',l5.display,l5.rate===null?'Not enough observed results':l5.rate+'% historical hits'),
   display('LAST 10 VS THIS LINE',l10.display,l10.rate===null?'Not enough observed results':l10.rate+'% historical hits')
 ];
 if(avgDelta!==null){
   signals.push(display('RECENT AVG MINUS LINE',(avgDelta>0?'+':'')+amount(avgDelta),
     'L5 avg '+amount(average)+' versus line '+amount(line),avgDelta>=0?'mi-read-positive':'mi-read-negative'));
 }
 let reading='';
 if(conflict){
   reading='<div class="mi-read-caution"><b>MODEL AND RECENT RESULTS DIFFER</b> The model shows '+pct(model)
   +' while the last '+Math.min(10,series.length)+' observed games hit '+pct(l10.rate)
   +'. These measure different things. Check matchup, opportunity and sample size before using this selection.</div>';
 }else if(model!==null&&l10.rate!==null){
   reading='<p class="mi-evidence-note">Model probability ('+pct(model)+') and observed hit rate ('+pct(l10.rate)
   +') are different measures; historical results are not an independent prediction.</p>';
 }
 return '<section class="mi-decision-read"><div class="mi-read-title"><b>THE QUICK READ</b><span>Exact selection · real observations</span></div>'
   +'<div class="mi-read-grid">'+signals.join('')+'</div>'+reading+'</section>';
}
/* TSO Prop Signal v1: original line-specific strength index, NOT a betting probability.
 * Uses only authenticated research, exact market history and verified PBP.
 * No invented defense-versus-position or injury numbers. */
function observedForm(series,row,count){
 const results=series.slice(0,count).map(g=>hit(g.value,row)).filter(x=>x==='hit'||x==='miss');
 if(!results.length)return null;
 const wins=results.filter(x=>x==='hit').length;
 return {value:100*(wins+2)/(results.length+4),wins,count:results.length};
}
function propRole(data,doc,row){
 if(String(row.sport||'')!=='nfl'||!doc)return null;
 const date=Date.parse(doc.generatedAt||'');
 if(!Number.isFinite(date)||Date.now()-date>10*86400000||date>Date.now()+3600000)return null;
 const p=opportunityForPlayer(doc,data,row);
 if(!p||n(p.gamesWithOpportunities)<3)return null;
 const m=String(row.market||''),parts=[];
 function use(field,label,scale){
  const v=n(p[field]);
  if(v!==null&&v>=0&&v<=100)parts.push({value:clamp(25+v*scale,0,100),detail:label+' '+pct(v)});
 }
 if(['recYds','receptions','longestReception'].includes(m)&&n(p.targets)>=3)use('targetSharePct','Target share',2.1);
 if(['rushYds','rushAtt'].includes(m)&&n(p.carries)>=3)use('carrySharePct','Carry share',1.15);
 if(m==='atd'&&n(p.redZoneOpps)>=3){
  use('redZoneSharePct','Red-zone share',1.5);
  use('goalLineSharePct','Goal-line share',1.6);
 }
 if(!parts.length)return null;
 return {value:parts.reduce((s,v)=>s+v.value,0)/parts.length,detail:parts.map(v=>v.detail).join(' · ')+' · '+p.gamesWithOpportunities+' observed games'};
}
function signalScore(row,data,doc){
 const model=n(row?.model?.probabilityPct),modeled=model!==null&&model>=0&&model<=100;
 const series=seriesFromResearch(data,row),decisions=series.slice(0,10).map(g=>hit(g.value,row)).filter(v=>v==='hit'||v==='miss');
 if(decisions.length<5)return {score:null,reason:'Need 5 verified '+marketName(row)+' results ('+decisions.length+'/5)',modeled};
 const l5=observedForm(series,row,5),l10=observedForm(series,row,10);
 if(!l5||!l10)return {score:null,reason:'Verified game history unavailable',modeled};
 const factors=[];
 if(modeled)factors.push({label:'Model support',value:model,weight:28,note:'Exact-market forecast '+pct(model)});
 factors.push({label:'Recent exact-line form',value:.55*l5.value+.45*l10.value,weight:modeled?32:55,
  note:'L5 '+l5.wins+'/'+l5.count+' · L10 '+l10.wins+'/'+l10.count+' · smoothed sample'});
 const line=marketThreshold(row);
 if(line!==null){
  const arr=series.slice(0,5).map(g=>g.value).sort((a,b)=>a-b);
  const median=arr.length%2?arr[(arr.length-1)/2]:(arr[arr.length/2-1]+arr[arr.length/2])/2;
  factors.push({label:'Margin over line',value:clamp(50+40*(median-line)/Math.max(1,Math.abs(line)*.25),0,100),
   weight:modeled?12:25,note:'Recent median '+amount(median)+' versus exact line '+amount(line)});
 }
 const implied=n(row?.impliedPct),direct=n(row?.model?.edgePct);
 const edge=modeled?(direct!==null?direct:implied!==null&&implied>=0&&implied<=100?model-implied:null):null;
 if(edge!==null&&Math.abs(edge)<=100)
  factors.push({label:'Price value',value:clamp(50+edge*4,0,100),weight:13,note:'Model vs market '+signEdge(edge)});
 const role=propRole(data,doc,row);
 if(role)factors.push({label:'Verified role',value:role.value,weight:modeled?15:20,note:role.detail});
 const coverage=factors.reduce((s,f)=>s+f.weight,0);
 let score=Math.round(factors.reduce((s,f)=>s+f.weight*f.value,0)/coverage);
 if(decisions.length<10)score=Math.min(score,modeled?87:72);
 if(modeled){
  if(factors.length<4)score=Math.min(score,82);
  if(row.sport==='nfl'&&!role)score=Math.min(score,89);
 }else score=Math.min(score,74);
 return {score,tier:modeled?(score>=85?'ELITE':score>=75?'STRONG':score>=60?'WATCH':'CAUTION'):'FORM ONLY',
  modeled,factors,coverage,games:decisions.length};
}
function signalMini(row,data,doc){
 const s=signalScore(row,data,doc);
 if(s.score===null)return '<span class="mi-signal-kicker">TSO PROP SIGNAL</span><small class="mi-signal-pending">'+esc(s.reason)+'</small><div class="mi-signal-track"></div>';
 return '<span class="mi-signal-kicker">TSO PROP SIGNAL</span><span class="mi-signal-reading"><strong>'+s.score+'<small>/100</small></strong><b class="mi-signal-'+s.tier.toLowerCase().replace(/\s+/g,'-')+'">'+s.tier+'</b></span>'
  +'<div class="mi-signal-track'+(s.modeled?'':' is-form-only')+'" role="progressbar" aria-label="TSO Prop Signal evidence score" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+s.score+'"><span style="width:'+s.score+'%"></span></div>';
}
function signalDetail(row,data,doc){
 const s=signalScore(row,data,doc);
 const header='<div class="mi-signal-detail-head"><div><small>THE SPORTS OUTPOST EXCLUSIVE</small><h4>TSO Prop Signal</h4><p>Verified factors behind this exact player prop.</p></div><small>v1</small></div>';
 if(s.score===null)return '<section class="mi-signal-detail">'+header+'<p class="mi-muted">'+esc(s.reason)+'. TSO does not invent missing ratings.</p></section>';
 const factors=s.factors.map(f=>'<div class="mi-signal-factor"><div><b>'+esc(f.label)+'</b><span>'+f.weight+'% · '+Math.round(f.value)+'/100</span></div>'
  +'<div class="mi-signal-track"><span style="width:'+clamp(f.value,0,100)+'%"></span></div><small>'+esc(f.note)+'</small></div>').join('');
 return '<section class="mi-signal-detail">'+header+'<div class="mi-signal-big"><strong>'+s.score+'<small>/100</small></strong><div><b class="mi-signal-'+s.tier.toLowerCase().replace(/\s+/g,'-')+'">'+s.tier+'</b><small>'+s.games+' exact-line games · '+s.coverage+'% verified factor coverage</small></div></div>'
  +'<div class="mi-signal-track mi-signal-large'+(s.modeled?'':' is-form-only')+'" role="progressbar" aria-label="TSO Prop Signal evidence score" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+s.score+'"><span style="width:'+s.score+'%"></span></div>'
  +'<div class="mi-signal-factor-grid">'+factors+'</div><p class="mi-evidence-note">TSO Prop Signal is NOT a win probability. FORM ONLY is historical performance, not a verified forecast. Defense vs position and injuries remain excluded until verified.</p></section>';
}
function updateSignalView(root,row,data){
 for(const el of root.querySelectorAll('[data-mi-signal]'))if(el.dataset.miSignal===key(row))el.innerHTML=signalMini(row,data,state.signalDoc);
 for(const el of root.querySelectorAll('[data-mi-signal-detail]'))if(el.dataset.miSignalDetail===key(row))el.innerHTML=signalDetail(row,data,state.signalDoc);
}
function hydrateSignals(root,ctx){
 const visible=new Set([...root.querySelectorAll('[data-mi-signal]')].map(el=>el.dataset.miSignal));
 const rows=(ctx.rows||[]).filter(row=>visible.has(key(row)));
 for(const row of rows)getResearch(row,ctx).then(data=>{if(root.isConnected)updateSignalView(root,row,data);}).catch(()=>{});
 if(String(ctx.game?.league||'')==='nfl')
  loadNflPbp().then(doc=>{
   state.signalDoc=doc;
   for(const row of rows)if(root.isConnected&&state.cached.has(key(row)))updateSignalView(root,row,state.cached.get(key(row)));
  }).catch(()=>{state.signalDoc=null;});
}

function renderResearch(data,row){
 if(!data?.available)return '<div class="mi-research-unavailable">Detailed historical context unavailable: '+esc(data?.reason||'No verified research snapshot.')+'</div>';
 const series=seriesFromResearch(data,row);
 const stats=[lastStats(series,row,5),lastStats(series,row,10)];
 const form=series.length
   ?'<div class="mi-visual-grid"><div class="mi-chart-panel"><h5>RECENT GAME RESULTS</h5>'+recentGamesChart(series,row)+'</div>'
     +'<div class="mi-hit-panel"><h5>EXACT LINE HIT RATE</h5>'+stats.map(x=>hitRateVisual(series,row,Number(x.label.slice(1)))).join('')
       +'<div class="mi-l5-avg"><small>LAST 5 AVERAGE</small><strong>'+amount(series.slice(0,5).reduce((a,b)=>a+b.value,0)/Math.min(5,series.length))+'</strong></div>'
       +'<small class="mi-muted">Pushes are excluded from the hit-rate denominator.</small></div></div>'
     +'<p class="mi-source-note">'+esc(series[0].source||data?.sources?.player||data?.source||'Verified game logs')+' · '+series.length+' observed games available</p>'
   :'<div class="mi-research-unavailable">Exact-market game-log hit rate unavailable. No substitute chart or percentage is generated.</div>';
 const notes=researchNotes(data,row);
 const source=String(data.sources?.player||data.source||data?.player?.recentSource||'TSO verified research snapshot');
 return '<div data-mi-signal-detail="'+esc(key(row))+'">'+signalDetail(row,data,state.signalDoc)+'</div>'
  +decisionEvidence(data,row)+'<div class="mi-section mi-section--visual"><h4>Recent form & performance</h4>'+form+'</div>'
   +'<div class="mi-section"><h4>Role & matchup</h4>'+roleVisual(data,row)
   +(notes.length?'<div class="mi-research-notes">'+notes.map(v=>'<span>'+esc(v)+'</span>').join('')+'</div>':'<p class="mi-muted">Detailed opponent-defense statistics are unavailable for this player.</p>')
   +(String(row.sport).toLowerCase()==='nfl'?'<div class="mi-nfl-opportunities" data-mi-nfl-opportunities="'+esc(key(row))+'"><p class="mi-muted">Loading verified NFL opportunity and red-zone shares…</p></div>':'')
   +'<small class="mi-muted">Source: '+esc(source)+'</small></div>'
   +'<div class="mi-section mi-section--movement"><h4>Sportsbook odds movement</h4><div data-mi-history="'+esc(key(row))+'"><p class="mi-muted">Checking verified line history…</p></div></div>';
}
function verifiedDefensiveMatchup(data,defense,offense){
 if(!data?.available||data.sport!=='nfl')return null;
 const p=data.player||{},m=p.matchup||{},v=m.previousSeasonAllowed||{};
 const pos=String(m.positionGroup||'').toUpperCase();
 if(nflTeamCode(p.team)!==nflTeamCode(offense)||nflTeamCode(m.opponent)!==nflTeamCode(defense)||
  !['QB','RB','WR','TE'].includes(pos)||String(v.position||'').toUpperCase()!==pos||
  !Number.isInteger(Number(v.games))||Number(v.games)<5)return null;
 const columns=pos==='QB'?[['passYds','Passing yards'],['passTds','Passing TDs']]:
  pos==='RB'?[['rushYds','Rushing yards'],['recYds','Receiving yards']]:
  [['recYds','Receiving yards'],['receptions','Receptions']];
 const values=columns.filter(([k])=>n(v.perGame?.[k])!==null&&n(v.perGame?.[k])>=0)
  .map(([k,label])=>'<span><b>'+amount(v.perGame[k])+'</b><small>'+esc(label)+' / game</small></span>');
 if(!values.length)return null;
 return {pos,html:'<div class="mi-scout-pos"><b>'+esc(defense)+' defense vs '+pos+' · 2025</b>'
  +'<div class="mi-scout-metrics">'+values.join('')+'</div><small>Against all '+pos+'s combined · '+v.games+' observed games · prior season</small></div>'};
}
function scoutingFromResult(data,defense,game){
 if(!data?.available)return null;
 if(game.league==='nfl'){
  const offense=nflTeamCode(nflTeamCode(game.away?.abbr)===nflTeamCode(defense)?game.home?.abbr:game.away?.abbr);
  return verifiedDefensiveMatchup(data,defense,offense)?.html||null;
 }
 if(game.league==='nba'&&n(data?.matchup?.opponentPace)!==null)
  return '<b>Verified opponent pace</b><div class="mi-scout-metrics"><span><b>'+amount(data.matchup.opponentPace)+'</b><small>Possessions estimate / game</small></span></div>';
 if(game.league==='mlb'&&n(data?.opponent?.pitcher?.era)!==null)
  return '<b>Projected opposing starter</b><div class="mi-scout-metrics"><span><b>'+amount(data.opponent.pitcher.era)+'</b><small>ERA</small></span></div>';
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
 updateSignalView(node.closest('.mi-game-vault')||node,row,data);
 const opportunity=node.querySelector('[data-mi-nfl-opportunities]');
 if(opportunity&&data?.available){
   loadNflPbp().then(doc=>{
     if(opportunity.isConnected)opportunity.innerHTML=opportunityEvidence(doc,data,row);
    state.signalDoc=doc;
    if(node.isConnected)updateSignalView(node.closest('.mi-game-vault')||node,row,data);
   }).catch(error=>{
     if(opportunity.isConnected)opportunity.innerHTML='<p class="mi-muted">Verified opportunity data temporarily unavailable: '+esc(error.message||'Network error')+'</p>';
   });
 }
 const hist=node.querySelector('[data-mi-history]');
 if(hist&&typeof ctx.history==='function'){
   Promise.resolve().then(()=>ctx.history(row,row.book)).then(doc=>{
     if(!hist.isConnected)return;
     hist.innerHTML=lineMovementChart(doc,row);
   }).catch(()=>{if(hist.isConnected)hist.innerHTML='<p class="mi-muted">Sportsbook movement unavailable at this time.</p>';});
 }
}
function opposingOffenseEvidence(doc,defenseSide,game){
 if(game?.league!=='nfl'||!doc?.seasons?.['2026']?.teams)return '';
 const opponent=nflTeamCode(String(game.away?.abbr||'').toUpperCase()===String(defenseSide||'').toUpperCase()
   ?game.home?.abbr:game.away?.abbr);
 const teamData=doc.seasons['2026'].teams?.[opponent];
 const count=n(teamData?.gamesPlayed);
 if(!opponent||!teamData||count===null||count<2)return '';
 const rz=n(teamData.redZoneOpps),gl=n(teamData.goalLineOpps);
 const targets=n(teamData.targets),carries=n(teamData.carries);
 const sourceDate=String(doc.generatedAt||'').slice(0,10);
 const stat=(label,value,note)=>'<div class="mi-opp-stat"><b>'+esc(value)+'</b><span>'+esc(label)+'</span><small>'+esc(note)+'</small></div>';
 const values=[];
 if(rz!==null)values.push(stat('Red-zone opp / game',amount(rz/count),'Opponent offense · 2026'));
 if(gl!==null)values.push(stat('Goal-line opp / game',amount(gl/count),'Opponent offense · 2026'));
 const whole=targets!==null&&carries!==null?targets+carries:null;
 const passShare=whole?Math.round(100*targets/whole):null;
 const split=passShare===null?'':'<div class="mi-opp-split"><div><b>Offensive target / carry mix</b><span>'+passShare+'% targets · '+(100-passShare)+'% carries</span></div>'
    +'<div class="mi-opportunity-track"><span style="width:'+passShare+'%"></span></div></div>';
 return '<div class="mi-opp-offense-title"><b>'+esc(opponent)+' offense · observed opportunities</b><small>2026 nflverse through '+esc(sourceDate)+'</small></div>'
   +'<div class="mi-opp-stats">'+values.join('')+'</div>'+split
   +'<small class="mi-evidence-note">These are offensive opportunities *facing* '+esc(defenseSide)+', not defensive yards allowed or a game forecast.</small>';
}
function updateScouting(root,ctx){
 const game=ctx.game,rows=ctx.rows;
 if(!game)return;
 if(game.league==='nfl'){
   loadNflPbp().then(doc=>{
     for(const defender of [game.away,game.home]){
       const target=[...root.querySelectorAll('[data-mi-attack]')].find(el=>el.dataset.miAttack===defender?.abbr);
       if(target?.isConnected)target.innerHTML=opposingOffenseEvidence(doc,defender?.abbr,game)
         ||'<span class="mi-muted">Verified current-season opposing offense opportunity history unavailable.</span>';
     }
   }).catch(()=>{
     for(const el of root.querySelectorAll('[data-mi-attack]'))if(el.isConnected)el.textContent='Opponent offensive opportunity feed unavailable.';
   });
 }else{
   for(const el of root.querySelectorAll('[data-mi-attack]'))el.textContent='Opponent offensive opportunity comparison requires a verified sport-specific source.';
 }
 for(const t of [game.away,game.home]){
  const defense=nflTeamCode(t?.abbr||'');
  const node=[...root.querySelectorAll('[data-mi-scout]')].find(e=>nflTeamCode(e.dataset.miScout)===defense);
  if(!node)continue;
  const offense=nflTeamCode(nflTeamCode(game.away?.abbr)===defense?game.home?.abbr:game.away?.abbr);
  const pool=rows.filter(row=>nflTeamCode(row.team)===offense);
  if(game.league!=='nfl'){
   const row=pool[0];if(!row){node.textContent='Verified opponent data unavailable.';continue;}
   getResearch(row,ctx).then(data=>{
    if(node.isConnected)node.innerHTML=scoutingFromResult(data,defense,game)||'<span>Matchup data unavailable.</span>';
   }).catch(()=>{if(node.isConnected)node.textContent='Matchup data unavailable.';});
   continue;
  }
  const markets=['passYds','completions','rushYds','rushAtt','recYds','receptions','atd'];
  const candidates=[...new Map(markets.flatMap(m=>pool.filter(r=>r.market===m).slice(0,4))
    .map(r=>[String(r.player||'').toLowerCase(),r])).values()].slice(0,12);
  if(!candidates.length){node.textContent='No verified defense-vs-position observations.';continue;}
  node.textContent='Verifying positional defensive records…';
  Promise.allSettled(candidates.map(r=>getResearch(r,ctx))).then(results=>{
   if(!node.isConnected)return;
   const profiles=new Map();
   for(const item of results){
    const match=item.status==='fulfilled'?verifiedDefensiveMatchup(item.value,defense,offense):null;
    if(match&&!profiles.has(match.pos))profiles.set(match.pos,match.html);
   }
   node.innerHTML=profiles.size?'<b>Verified 2025 defense vs position</b><div class="mi-scout-pos-grid">'
    +['QB','RB','WR','TE'].filter(p=>profiles.has(p)).map(p=>profiles.get(p)).join('')+'</div>'
    +'<small>Previous-season positional allowance; not current-week defensive rankings.</small>'
    :'<span class="mi-muted">Position-specific defensive numbers unavailable for '+esc(defense)+'. No unrelated opponent data substituted.</span>';
  });
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
 hydrateSignals(root,ctx);
}
window.TSO2Matchup={listing,bind,matchedStats:seriesFromResearch,eligibleOver,marketName,recentGamesChart,lineMovementChart,hitRateVisual,decisionEvidence,signalScore,signalMini,signalDetail,verifiedDefensiveMatchup,opportunityForPlayer,opportunityEvidence,opposingOffenseEvidence};
})();