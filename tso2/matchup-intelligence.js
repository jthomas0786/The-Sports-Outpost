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
/* One athlete receives one grade for each sport + market; odds and alt lines
 * remain exact offerings, never inputs to the TSO athlete/market grade. */
function playerMarketKey(row){
 const player=String(row?.player||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
 return [String(row?.sport||'').toLowerCase(),String(row?.team||'').toUpperCase(),player,String(row?.market||'')].join('|');
}
function playerMarketRows(rows){
 const selected=new Map();
 for(const original of (rows||[]).filter(eligibleOver)){
  const row=bestExactQuote(original),id=playerMarketKey(row),prev=selected.get(id);
  if(!prev||Boolean(prev.researchScorerModel)&&!row.researchScorerModel||
   Boolean(prev.researchScorerModel)===Boolean(row.researchScorerModel)&&
   ((Date.parse(row.snapshotTime||'')||0)>(Date.parse(prev.snapshotTime||'')||0)||
    (Date.parse(row.snapshotTime||'')||0)===(Date.parse(prev.snapshotTime||'')||0)&&
    String(row.key).localeCompare(String(prev.key))<0))selected.set(id,row);
 }
 return [...selected.values()];
}
const state={expanded:new Set(),cached:new Map(),pending:new Map(),scouting:new Map(),activeFilter:'ALL PROPS',showAll:false,activeGame:'',signalDoc:null,defense2026:null,ranking:null,nhlRates:new Map(),nhlPending:new Map(),nhlTeamDoc:null,nhlTeamGame:''};
function key(row){return String(row?.key||'');}
function exactSelection(row){
 if(row?.selection)return String(row.selection);
 if(eventMarkets.has(String(row.market||'').toLowerCase()))return 'Yes';
 const line=n(row.line),side='Over';
 return line===null?side:side+' '+amount(line);
}
function signEdge(value){return n(value)===null?'—':(n(value)>0?'+':'')+n(value).toFixed(1)+' pp';}

/* Exact quote selection. Books are only compared for the SAME player, side
 * and line; changing a line cannot manufacture a 'best' price. */
const bookDomains={
 fanduel:'fanduel.com',draftkings:'draftkings.com',betmgm:'betmgm.com',
 caesars:'caesars.com',betrivers:'betrivers.com',fanatics:'fanatics.com',
 fanaticssportsbook:'fanatics.com',bet365:'bet365.com',
 hardrockbet:'hardrock.bet',hardrock:'hardrock.bet',
 espnbet:'espnbet.com','espn bet':'espnbet.com',
 thescorebet:'thescore.bet',thescore:'thescore.bet',
 pointsbet:'pointsbet.com',betparx:'betparx.com'
};
const normalizedBook=b=>String(b||'').toLowerCase().replace(/[^a-z0-9]/g,'');
function bookIcon(book,logoUrl){
 const label=String(book||'Sportsbook');
 const source=String(logoUrl||'');
 if(source.startsWith('https://')&&!/[\s<>]/.test(source))return '<img class="mi-book-icon" src="'+esc(source)+'" alt="'+esc(label)+' logo" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'inline-grid\'"><span class="mi-book-monogram" style="display:none" aria-hidden="true">'+esc(label.slice(0,2).toUpperCase())+'</span>';
 const domain=bookDomains[normalizedBook(label)];
 if(!domain)return '<span class="mi-book-monogram" aria-hidden="true">'+esc(label.slice(0,2).toUpperCase())+'</span>';
 const favicon='https://www.google.com/s2/favicons?domain='+encodeURIComponent(domain)+'&sz=64';
 return '<img class="mi-book-icon" src="'+esc(favicon)+'" loading="lazy" alt="'+esc(label)+' logo" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'inline-grid\'">'
   +'<span class="mi-book-monogram" style="display:none" aria-hidden="true">'+esc(label.slice(0,2).toUpperCase())+'</span>';
}
function quoteAtExactLine(row,quote){
 if(!quote||typeof quote!=='object'||n(quote.price)===null||n(quote.price)===0)return false;
 if(quote.available===false||quote.active===false||quote.suspended===true||quote.preserved===true)return false;
 if(n(quote.line)!==null&&n(row.line)!==null&&n(quote.line)!==n(row.line))return false;
 if(quote.side&&row.side&&String(quote.side).toLowerCase()!==String(row.side).toLowerCase())return false;
 return Boolean(quote.book||quote.bookName||quote.sportsbook);
}
function bestExactQuote(row){
 if(row.researchScorerModel)return row;
 const options=(Array.isArray(row.books)?row.books:[]).filter(q=>quoteAtExactLine(row,q));
 const own=n(row.price)!==null&&n(row.price)!==0?{book:row.book,price:row.price,link:row.link,snapshotTime:row.snapshotTime}:null;
 if(own)options.push(own);
 if(!options.length)return row;
 options.sort((a,b)=>Number(b.price)-Number(a.price)||
  (Date.parse(b.snapshotTime||'')||0)-(Date.parse(a.snapshotTime||'')||0));
 const winner=options[0],book=winner.book||winner.bookName||winner.sportsbook;
 const price=n(winner.price);
 const implied=price<0?100*(-price)/(-price+100):100*100/(price+100);
 const model=n(row.model?.probabilityPct);
 return {...row,book,price:price,link:winner.link||row.link||null,
  snapshotTime:winner.snapshotTime||row.snapshotTime,
  bookLogoUrl:winner.logoUrl||winner.logo||row.bookLogoUrl||null,
  impliedPct:implied,
  model:row.model&&model!==null?{...row.model,edgePct:model-implied,marketProbabilityPct:implied}:row.model};
}
function exactLineModelPct(row){
 if(row.researchScorerModel||row.model?.exactMatch===false||row.model?.lineMatch===false)return null;
 if(row.model?.matchType&&/market.only|category.only|line.mismatch/i.test(String(row.model.matchType)))return null;
 // Binary YES outcomes have an exact event rather than a numeric threshold.
 const side=String(row.side||'').toLowerCase();
 if(n(row.line)===null&&!eventMarkets.has(String(row.market||'').toLowerCase()))return null;
 if(!['over','yes','true'].includes(side))return null;
 return n(row.model?.probabilityPct);
}
function rowMetrics(row){
 const modelPct=exactLineModelPct(row),marketOnly=modelPct===null,price=!row.researchScorerModel?n(row.price):null;
 const book=price!==null?String(row.book||'Verified book'):'';
 return '<span class="mi-row-metrics" aria-label="TSO Prop Signal, Line Model percentage, and sportsbook odds">'
  +'<span class="mi-signal-mini" data-mi-signal="'+esc(key(row))+'">'+signalMini(row,state.cached.get(key(row)),state.signalDoc)+'</span>'
  +'<span class="mi-line-model '+(marketOnly?'is-unavailable':'')+'"><b>'+pct(modelPct)+'</b><small>'+(marketOnly?'NO EXACT MATCH':'EXACT LINE')+'</small></span>'
  +'<span class="mi-line-odds"><b>'+(!row.researchScorerModel?odds(price):'—')+'</b><small class="mi-book-under">'+(price!==null?bookIcon(book,row.bookLogoUrl)+'<span>'+esc(book)+'</span>':'<span>NO LIVE BOOK</span>')+'</small></span>'
  +'</span>';
}
function playerMarkup(row,i){
 const id=key(row),open=state.expanded.has(id),modelOnly=Boolean(row.researchScorerModel);
 const modelPct=exactLineModelPct(row),src=String(row.headshotUrl||'');
 const photo=src&&/^https:\/\//i.test(src)?'<img src="'+esc(src)+'" alt="" loading="lazy">':
 '<span aria-hidden="true">'+esc(String(row.player||'P').split(' ').slice(0,2).map(s=>s[0]||'').join('').toUpperCase())+'</span>';
 const quick='<div class="mi-selection-brief"><span><small>PROP / SIDE</small><b>'+esc(marketName(row))+' · '+esc(exactSelection(row))+'</b></span>'
  +'<span><small>EXACT LINE MODEL</small><b>'+pct(modelPct)+'</b></span>'
  +'<span><small>BEST SPORTSBOOK</small><b>'+(modelOnly?'—':esc(row.book||'Unavailable')+' · '+odds(row.price))+'</b></span></div>';
 const explain=modelOnly?'Pregame scorer forecast, not a verified exact sportsbook selection.':
   (row.model?.reason||row.model?.explanation||row.reason||
    'No source-backed matchup-specific model explanation is available for this exact selection.');
 const details=quick
   +'<div class="mi-player-overview"><div><h4>TSO PROP SIGNAL · CONTRIBUTING EVIDENCE</h4><p>Verified production, usage, matchup factors and exact-line game results.</p></div>'+(modelOnly?'':'<button type="button" class="mi-add" data-mi-add="'+esc(id)+'">+ ADD TO PARLAY PING</button>')+'</div>'
   +'<div data-mi-research="'+esc(id)+'" class="mi-analytics">'+(state.cached.has(id)?renderResearch(state.cached.get(id),row):'<div class="mi-loading">Loading verified recent form and matchup trends…</div>')+'</div>'
   +'<div class="mi-reason"><b>TSO ANALYSIS</b><p>'+esc(explain)+'</p></div>'
   +(modelOnly?'<div class="mi-actions"><small>MODEL ONLY · No exact live sportsbook line.</small></div>':
    '<div class="mi-actions"><small>Verified exact player · market · side · line · best available sportsbook.</small></div>');
 return '<article class="mi-player '+(open?'is-open':'')+'" data-mi-key="'+esc(id)+'">'
  +'<div class="mi-player-head"><button type="button" class="mi-player-expand" data-mi-expand="'+esc(id)+'" aria-expanded="'+open+'">'
  +'<span class="mi-rank">'+(i+1)+'</span><span class="mi-photo">'+photo+'</span>'
  +'<span class="mi-player-label"><b>'+esc(row.player||'Player')+'</b><small>'+esc(marketName(row))+' · '+esc(row.team||'')+'</small>'
  +'<em>'+esc(exactSelection(row))+(modelOnly?' · NO LIVE QUOTE':' · BEST AVAILABLE VERIFIED QUOTE')+'</em></span>'
  +rowMetrics(row)+'<span class="mi-chevron" aria-hidden="true">'+(open?'▴':'▾')+'</span>'
  +'</button></div><div class="mi-player-body" '+(open?'':'hidden')+'>'+details+'</div></article>';
}
function filterRows(rows){
 return state.activeFilter==='ALL PROPS'?rows:rows.filter(r=>String(r.market||'')===state.activeFilter);
}
// Rank using the TSO-exclusive score (never raw model %, price, or edge).
// Missing scores have NO rank, and are always placed last.
function rankRowsBySignal(rows,cache=state.cached,doc=state.signalDoc){
 const result=new Map(rows.map(r=>[key(r),signalScore(r,cache.get(key(r)),doc)]));
 return [...rows].sort((a,b)=>{
  const sa=result.get(key(a)),sb=result.get(key(b)),an=n(sa?.score),bn=n(sb?.score);
  if(an===null&&bn!==null)return 1;
  if(an!==null&&bn===null)return -1;
  if(an!==null&&bn!==null&&an!==bn)return bn-an;
  if(an!==null&&bn!==null&&sa.modeled!==sb.modeled)return sa.modeled?-1:1;
  return String(a.player||'').localeCompare(String(b.player||''))||
   String(a.market||'').localeCompare(String(b.market||''))||
   String(a.line??'').localeCompare(String(b.line??''))||
   key(a).localeCompare(key(b));
 });
}
function rankingSignature(game,rows){
 return [String(game?.league||''),String(game?.id||''),...playerMarketRows(rows).map(r=>
  [playerMarketKey(r),key(r)].join(':')).sort()].join('|');
}
function rankingStatus(game,rows){
 const job=state.ranking;
 if(!job||job.signature!==rankingSignature(game,rows))
  return 'Verifying TSO Prop Signals · temporary order while checking all players';
 if(job.done)return 'TSO Prop Signal · highest to lowest · ungraded last';
 return 'Verifying TSO Prop Signals · '+job.completed+'/'+job.total+' player profiles · order provisional';
}
function listing(game,rows,{showScouting=true}={}){
 const id=String(game?.league||'')+':'+String(game?.id||'');
 if(state.activeGame!==id){state.activeGame=id;state.activeFilter='ALL PROPS';state.showAll=false;state.expanded.clear();state.ranking=null;}
 // One card per athlete and market, regardless of alternative sportsbook thresholds.
 // The chosen displayed quote is real but does not alter the grade.
 const unique=playerMarketRows(rows);
 const modelOnlyCount=unique.filter(r=>r.researchScorerModel).length;
 // Ranked by the TSO Prop Signal for every market category and All Props.
 const ranked=rankRowsBySignal(unique);
 const filtered=filterRows(ranked),shown=state.showAll?filtered:filtered.slice(0,7);
 const filters=['ALL PROPS',...orderedMarketKeys(ranked,game.league)];
 return '<section class="mi-game-vault" aria-label="Matchup scouting and ranked prop opportunities">'
   +(showScouting?(
    '<header class="mi-game-vault-header"><div><small>MATCHUP INTELLIGENCE · VERIFIED TSO DATA</small><h2>Game scouting</h2><p>Compare the matchup first, then open a player for the numbers behind the selection.</p></div></header>'
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

   ):'')
   +'<div class="mi-ranked"><div class="mi-ranked-head"><div><small>PLAYER PROP INTELLIGENCE · OVERS & YES ONLY</small><h2>Players to watch</h2><p>'+(unique.length-modelOnlyCount)+' sportsbook-backed player/market candidates'+(modelOnlyCount?' · '+modelOnlyCount+' scorer-model candidates (research only)':'')+' · one grade per player and market · line-independent TSO Prop Signal</p></div></div>'
   +'<p class="mi-ranking-status" data-mi-ranking-status aria-live="polite">'+esc(rankingStatus(game,rows))+'</p>'
   +'<div class="mi-filters" role="group" aria-label="Prop markets">'+filters.map(f=>'<button type="button" class="'+(state.activeFilter===f?'is-active':'')+'" data-mi-filter="'+esc(f)+'">'+esc(f==='ALL PROPS'?f:marketName({sport:game.league,market:f}))+' <span class="mi-filter-count">'+(f==='ALL PROPS'?ranked.length:ranked.filter(r=>String(r.market||'')===f).length)+'</span></button>').join('')+'</div>'
   +'<div class="mi-row-column-head" aria-hidden="true"><span>PLAYER · PROP</span><span>TSO PROP SIGNAL</span><span>LINE MODEL %</span><span>LINE ODDS</span></div>'
   +'<div class="mi-player-list">'+(shown.length?shown.map(playerMarkup).join('')
      :'<div class="mi-empty">No verified sportsbook Over/Yes selection'+(modelOnlyCount?' or TSO scorer-model candidate':'')+' for this game and market. Live games may no longer have pregame quotes. Check another game, or use Advanced Props to inspect the full verified feed.</div>')+'</div>'
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
   // The NFL Game Hub grades and charts current 2026 performance only.
   // Discard explicit 2025/older observations; never mix seasons silently.
   const gameYear=Number(g?.season)||Number(String(g?.date||'').slice(0,4))||null;
   if(s==='nfl'&&gameYear!==null&&gameYear!==2026)continue;
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
   const matchup=p.matchup||{},opp=nflTeamCode(matchup.opponent),pos=nflDefensePosition(p.position||matchup.positionGroup);
   const record=state.defense2026?.season===2026?state.defense2026.teams?.[opp]?.byPosition?.[pos]:null;
   const statName={QB:['passYds','passing yards'],RB:['rushYds','rushing yards'],WR:['recYds','receiving yards'],TE:['recYds','receiving yards']}[pos];
   if(record?.games>=3&&statName&&n(record.perGame?.[statName[0]])!==null)
     notes.push('2026 '+opp+' defense vs '+pos+': '+amount(record.perGame[statName[0]])+' '+statName[1]+'/game across all '+pos+'s ('+record.games+' games)');
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
/* TSO Prop Signal v2 — athlete + prop-category production grade.
 * Not a probability, not an exact-line edge and not derived from sportsbook
 * thresholds, payout, model probability at an alternate line, or vig.
 * Fixed reference values are transparent SCORING RUBRIC anchors, not
 * assertions of league averages or predictions. Scores compare within each
 * sport/market only, never the raw yards of one sport to another.
 */
const productionRubric={
 nfl:{atd:.75,firstTd:.14,passYds:275,passTds:2.5,recYds:85,receptions:7,rushYds:85,rushAtt:18,completions:25,longestReception:35},
 nba:{points:30,rebounds:12,assists:10,threes:4,pra:48,pr:40,pa:37,ra:19,steals:2,blocks:2},
 mlb:{hr:.52,homeRun:.52,hits:2,totalBases:3.5,rbi:1.5,runs:1.5,pitcherStrikeouts:8,strikeouts:8,stolenBases:.55,walks:1.3,singles:1.7,doubles:.5,hrr:3.6},
 nhl:{atg:.67,fgs:.14,goals:.67,sog:4.2,points:1.6,assists:1,saves:34,blocks:3.5}
};
function scaleProduction(v,target){
 return n(v)===null||!Number.isFinite(target)||target<=0?null:clamp(100*v/target,0,100);
}
function meanValues(values){
 const real=values.map(n).filter(x=>x!==null&&x>=0);
 return real.length?real.reduce((sum,v)=>sum+v,0)/real.length:null;
}
// Current-season play-by-play usage only when exact GSIS identity, team,
// sample size, and source freshness all match.
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
 return {value:parts.reduce((sum,item)=>sum+item.value,0)/parts.length,
  detail:parts.map(item=>item.detail).join(' · ')+' · '+p.gamesWithOpportunities+' observed games'};
}
function verifiedVolume(data,doc,row){
 const sport=String(row.sport||'').toLowerCase(),market=String(row.market||'');
 const p=data?.player||{};
 const factors=[];
 if(sport==='nfl'){
  const role=propRole(data,doc,row);
  if(role)factors.push({value:role.value,note:'NFL 2026 verified opportunity shares · '+role.detail});
  const avg=p.last5?.avg||{};
  const carries=n(avg.carries),targets=n(avg.targets);
  if(['rushYds','rushAtt','atd'].includes(market)&&carries!==null)
   factors.push({value:scaleProduction(carries,18),note:'Recent carries '+amount(carries)+'/game'});
  if(['recYds','receptions','longestReception','atd'].includes(market)&&targets!==null)
   factors.push({value:scaleProduction(targets,9),note:'Recent targets '+amount(targets)+'/game'});
  const snap=n(p.snapTrend?.last3AvgPct??p.snapTrend?.avgOffensePct);
  if(snap!==null&&snap>=0&&snap<=100)
   factors.push({value:snap,note:'Observed offensive snaps '+pct(snap)});
 }
 if(sport==='nba'){
  const min=n(p.recentAverages?.minutes??p.last5?.avg?.minutes);
  if(min!==null)factors.push({value:scaleProduction(min,36),note:'Recent minutes '+amount(min)+'/game'});
  const usage=n(p.usagePct??p.recentAverages?.usagePct);
  if(usage!==null&&usage>=0&&usage<=100)
   factors.push({value:scaleProduction(usage,30),note:'Observed usage rate '+pct(usage)});
 }
 if(sport==='nhl'&&['atg','fgs','goals','points','assists'].includes(market)){
  const shots=n(p.recentAverages?.shotsOnGoal);
  if(shots!==null)factors.push({value:scaleProduction(shots,4.2),note:'Recent shots on goal '+amount(shots)+'/game'});
 }
 if(sport==='mlb'){
  const order=n(p.battingOrder);
  if(order!==null&&order>=1&&order<=9)
   factors.push({value:clamp(110-order*9,0,100),note:'Verified batting-order position #'+order});
 }
 const usable=factors.filter(f=>f.value!==null);
 if(!usable.length)return null;
 return {value:meanValues(usable.map(f=>f.value)),detail:usable.map(f=>f.note).join(' · ')};
}
// Only join matchup factors to a valid identified opponent/season and market.
// If a defensible sport-specific observation is missing, OMIT the factor.
function verifiedMarketMatchup(data,row){
 if(!data?.available)return null;
 const sport=String(row.sport||'').toLowerCase(),market=String(row.market||''),p=data.player||{};
 if(sport==='nba'){
  const opp=n(data.matchup?.opponentPace),league=n(data.matchup?.leaguePace);
  if(opp!==null&&league!==null&&league>70&&opp>70){
   return {value:clamp(50+200*(opp/league-1),20,80),
    detail:'Verified opponent pace '+amount(opp)+' vs reported league pace '+amount(league)};
  }
 }
 if(sport==='mlb'){
  const era=n(data.opponent?.pitcher?.era);
  if(era!==null&&era>=0&&era<=15&&['hr','homeRun','hits','totalBases','rbi','runs','walks','hrr'].includes(market)){
   return {value:clamp(50+(era-4)*12,20,80),
    detail:'Verified opposing starter ERA '+amount(era)+' · 4.0 is a TSO rubric reference, not league average'};
  }
 }
 if(sport==='nfl'){
  // Match player and opponent identity, then compare CURRENT-SEASON 2026
  // allowances with the same-position 2026 league baseline.
  const m=p.matchup||{},pos=nflDefensePosition(p.position||m.positionGroup);
  const opponent=nflTeamCode(m.opponent),source=state.defense2026;
  const teamMatch=nflTeamCode(p.team)===nflTeamCode(row.team);
  const knownTeams=[row.homeTeam,row.awayTeam].map(nflTeamCode).filter(team=>team.length>=2&&team.length<=4);
  const gameMatch=!knownTeams.length||knownTeams.includes(opponent);
  const record=source?.season===2026?source.teams?.[opponent]?.byPosition?.[pos]:null;
  const league=source?.season===2026?source.league?.byPosition?.[pos]:null;
  const field={passYds:'passYds',passTds:'passTds',rushYds:'rushYds',recYds:'recYds',
    receptions:'receptions',atd:'tds',rushAtt:'carries'}[market];
  if(teamMatch&&gameMatch&&field&&record?.games>=3&&league?.games>=10){
   const allowed=n(record.perGame?.[field]),base=n(league.perGame?.[field]);
   if(allowed!==null&&base!==null&&base>0)
    return {value:clamp(50+75*(allowed/base-1),20,80),
      detail:'2026 '+opponent+' defense vs '+pos+': '+amount(allowed)+' '+field+'/game allowed to all '+pos+'s · 2026 position baseline '+amount(base)+' · '+record.games+' games'};
  }
 }
 return null;
}
function independentProjection(row){
 const model=row?.model||{},sport=String(row.sport||'').toLowerCase(),market=String(row.market||'');
 const reference=productionRubric[sport]?.[market];
 const estimated=n(model.projection?.mean??model.projection?.median??model.projectedValue??model.projection?.projectedValue);
 if(estimated!==null&&estimated>=0&&reference){
  return {value:scaleProduction(estimated,reference),detail:'Verified model projection '+amount(estimated)+' '+market+' (not line-hit probability)'};
 }
 // Yes/no markets have no interchangeable yard/point threshold. A verified
 // player-level goal/TD/HR forecast may inform this market category.
 if(eventMarkets.has(market)){
  const p=n(model.probabilityPct);
  if(p!==null&&p>=0&&p<=100&&reference)
   return {value:scaleProduction(p/100,reference),detail:'Binary player-event model '+pct(p)+' · no alternate numeric line'};
 }
 return null;
}

/* 2026–27 NHL contributing stats. Weight allocations and BENCH anchors follow
 * the user-provided reference layout; these are explicit TSO comparison
 * references, NOT claimed league averages. Missing xG/60 or line GF% is NOT
 * replaced by last-five goals or sportsbook model odds.
 */
const nhlBench=[
 {label:'Goals/60',key:'goalsPer60',benchmark:.85,weight:18},
 {label:'Shots/60',key:'shotsPer60',benchmark:2.8,weight:14},
 {label:'Shooting %',key:'shootingPct',benchmark:10,weight:10},
 {label:'xG/60',key:'xGoalsPer60',benchmark:.8,weight:16},
 {label:'PP TOI/gm',key:'ppToiMinutesPerGame',benchmark:2.5,weight:12},
 {label:'Line GF%',key:'lineGoalsForPct',benchmark:50,weight:10},
 // NHL official summary reports PER GAME, not per 60; do not relabel it.
 {label:'Opp GA/G',key:'opponentGoalsAgainstPerGame',benchmark:2.8,weight:12},
 {label:'Opp SA/G',key:'opponentShotsAgainstPerGame',benchmark:30,weight:8}
];
const nhlNorm=value=>({NJ:'NJD',TB:'TBL',LA:'LAK',SJ:'SJS',MON:'MTL'}[String(value||'').toUpperCase()]||String(value||'').toUpperCase());
function nhlPlayerId(row,data){
 const values=[row?.playerId,row?.nhlPlayerId,data?.player?.nhlId,data?.player?.playerId,data?.player?.id];
 return values.map(v=>String(v||'')).find(v=>/^\d{7}$/.test(v))||null;
}
function nhlOpponent(row){
 const team=nhlNorm(row?.team),away=nhlNorm(state.nhlCurrentGame?.away?.abbr),home=nhlNorm(state.nhlCurrentGame?.home?.abbr);
 if(team===away&&home)return home;
 if(team===home&&away)return away;
 return null;
}
function nhlIdentityKey(row){
 const clean=String(row?.player||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
 return nhlNorm(row?.team)+'|'+clean;
}
async function verifiedNhlRates(row,data){
 const team=nhlNorm(row?.team),id=nhlPlayerId(row,data);
 const name=String(row?.player||data?.player?.name||'').trim();
 if(!name||!/^[A-Z]{2,3}$/.test(team))return null;
 const k=nhlIdentityKey({...row,player:name});
 if(state.nhlRates.has(k))return state.nhlRates.get(k);
 if(state.nhlPending.has(k))return state.nhlPending.get(k);
 const task=fetch('/api/tso2-nhl-player-rates?playerId='+encodeURIComponent(id||'')+'&team='+encodeURIComponent(team)+'&name='+encodeURIComponent(name),{cache:'no-store',headers:{accept:'application/json'}})
  .then(async response=>{
   const doc=await response.json();
   if(!response.ok||doc?.available!==true||doc.season!==20262027||!/^\d{7}$/.test(String(doc.playerId||''))||doc.team!==team||n(doc.games)<1)return null;
   return doc;
  }).catch(()=>null).then(doc=>{state.nhlRates.set(k,doc);return doc;}).finally(()=>state.nhlPending.delete(k));
 state.nhlPending.set(k,task);
 return task;
}
async function verifiedNhlTeams(game){
 if(game?.league!=='nhl')return;
 state.nhlCurrentGame=game;
 const away=nhlNorm(game.away?.abbr),home=nhlNorm(game.home?.abbr),k=away+'|'+home;
 if(state.nhlTeamGame===k&&state.nhlTeamDoc)return;
 state.nhlTeamGame=k;state.nhlTeamDoc=null;
 try{
  const r=await fetch('/api/tso2-nhl-team-stats?away='+encodeURIComponent(away)+'&home='+encodeURIComponent(home),{cache:'no-store'});
  const doc=await r.json();
  if(r.ok&&doc?.available===true&&doc.season===20262027&&doc.teams?.[away]?.team===away&&doc.teams?.[home]?.team===home&&state.nhlTeamGame===k)
   state.nhlTeamDoc=doc;
 }catch(_){/* No verified opponent stats available. */}
}
function nhlFactorScore(value,benchmark){
 if(n(value)===null||value<0||!Number.isFinite(benchmark)||benchmark<=0)return null;
 return clamp(50+60*(value/benchmark-1),0,100);
}
function nhlSignalScore(row,data){
 const id=nhlPlayerId(row,data),team=nhlNorm(row?.team);
 const rate=state.nhlRates.get(nhlIdentityKey(row));
 const sameTeam=rate?.team===team&&/^\d{7}$/.test(String(rate?.playerId||''))&&rate?.season===20262027&&n(rate?.games)>=1;
 const opponent=nhlOpponent(row),record=state.nhlTeamDoc?.teams?.[opponent];
 const away=state.nhlTeamDoc?.teams?.[nhlNorm(state.nhlCurrentGame?.away?.abbr)];
 const home=state.nhlTeamDoc?.teams?.[nhlNorm(state.nhlCurrentGame?.home?.abbr)];
 const validOpponent=record?.team===opponent&&record.season===20262027&&n(record.games)>=1&&away&&home;
 const stats=sameTeam?rate.metrics||{}:{};
 const metrics={...stats,
   opponentGoalsAgainstPerGame:validOpponent?record.stats?.goalsAgainstPerGame:null,
   opponentShotsAgainstPerGame:validOpponent?record.stats?.shotsAllowedPerGame:null};
 const factors=nhlBench.map(f=>{
  const value=n(metrics[f.key]),valid=value!==null&&value>=0&&value<1000;
  const factorScore=valid?nhlFactorScore(value,f.benchmark):null;
  return {...f,value:valid?value:null,factorScore,
   note:valid?(f.key.startsWith('opponent')?opponent+' · 2026–27 official team stats':'NHL 2026–27 official skater report'):'NO VERIFIED SOURCE'};
 });
 const available=factors.filter(f=>f.factorScore!==null),coverage=available.reduce((sum,f)=>sum+f.weight,0);
 if(coverage<60||!sameTeam)return {
   score:null,modeled:false,reason:!row?.player?'Verified NHL player identity is unavailable':!sameTeam?'2026–27 NHL skater statistics/roster unavailable':'Only '+coverage+'% of weighted contributing metrics verified (minimum 60%)',
   factors,coverage,games:rate?.games||0,evidence:'INCOMPLETE · NHL 2026–27'
 };
 const raw=available.reduce((sum,f)=>sum+f.factorScore*f.weight,0)/coverage;
 // Do not allow an incomplete advanced-stats panel to be described as ELITE.
 const score=Math.min(Math.round(raw),coverage<100?84:100);
 const tier=coverage<100?'PARTIAL':score>=85?'ELITE':score>=70?'STRONG':score>=50?'WATCH':'CAUTION';
 return {score,tier,modeled:false,factors,coverage,games:rate.games,
  evidence:coverage===100?'OFFICIAL / ADVANCED':'OFFICIAL NHL · '+coverage+'% VERIFIED WEIGHT',
  reason:null,nhl:true};
}
function signalScore(row,data,doc){
 if(String(row?.sport||'').toLowerCase()==='nhl')return nhlSignalScore(row,data);
 const series=seriesFromResearch(data,row);
 const target=productionRubric[String(row?.sport||'').toLowerCase()]?.[String(row?.market||'')];
 if(!target)return {score:null,reason:'No calibrated player-market scoring rubric yet',modeled:false};
 if(series.length<5)return {score:null,reason:'Need 5 verified '+marketName(row)+' game logs ('+series.length+'/5)',modeled:false};
 const values=series.slice(0,10).map(g=>g.value).filter(v=>n(v)!==null&&v>=0);
 if(values.length<5)return {score:null,reason:'Insufficient verified market production',modeled:false};
 const recent=values.slice(0,5),mean5=meanValues(recent),mean10=meanValues(values);
 const consistency=100*values.filter(v=>v>=target*.5).length/values.length;
 const factors=[
  {label:'Recent player production',value:scaleProduction(mean5,target),weight:48,
   note:'Last 5: '+amount(mean5)+' '+marketName(row)+'/game · TSO benchmark '+amount(target)},
  {label:'Extended historical form',value:scaleProduction(mean10,target),weight:26,
   note:'Last '+values.length+': '+amount(mean10)+' per game · independent of sportsbook line'},
  {label:'Meaningful output frequency',value:consistency,weight:12,
   note:values.filter(v=>v>=target*.5).length+'/'+values.length+' games reached half the TSO production benchmark (not a bet line)'}
 ];
 const role=verifiedVolume(data,doc,row);
 if(role)factors.push({label:'Verified role and opportunity',value:role.value,weight:12,note:role.detail});
 const matchup=verifiedMarketMatchup(data,row);
 if(matchup?.value!==null&&matchup?.value!==undefined)
  factors.push({label:'Opponent matchup',value:matchup.value,weight:8,note:matchup.detail});
 const proj=independentProjection(row);
 if(proj)factors.push({label:'Independent model forecast',value:proj.value,weight:20,note:proj.detail});
 const coverage=factors.reduce((sum,f)=>sum+f.weight,0);
 let score=Math.round(factors.reduce((sum,f)=>sum+f.value*f.weight,0)/coverage);
 if(series.length<10)score=Math.min(score,82);
 if(!proj)score=Math.min(score,88);
 return {score,tier:score>=85?'ELITE':score>=70?'STRONG':score>=50?'WATCH':'CAUTION',
  modeled:Boolean(proj),factors,coverage,games:values.length,
  benchmark:target,matchupContext:matchup?.value===null?matchup.detail:null,
  evidence:proj?'PROJECTION + HISTORY':'HISTORY / USAGE',
  l5:mean5,l10:mean10};
}
function signalMini(row,data,doc){
 const s=signalScore(row,data,doc);
 if(s.score===null)return '<span class="mi-signal-kicker">TSO PLAYER/MARKET SIGNAL</span><small class="mi-signal-pending">'+esc(s.reason)+'</small><div class="mi-signal-track"></div>';
 return '<span class="mi-signal-kicker">TSO PROP SIGNAL</span><span class="mi-signal-reading"><strong>'+s.score+'<small>/100</small></strong><b class="mi-signal-'+s.tier.toLowerCase().replace(/\s+/g,'-')+'">'+s.tier+'</b></span><small class="mi-signal-evidence">'+esc(s.evidence)+'</small>'
  +'<div class="mi-signal-track'+(s.modeled?'':' is-form-only')+'" role="progressbar" aria-label="TSO player market production grade" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+s.score+'"><span style="width:'+s.score+'%"></span></div>';
}
function nhlSignalPanel(s){
 const rows=(s.factors||nhlBench).map(f=>{
  const ready=f.value!==null&&f.value!==undefined;
  const score=n(f.factorScore),value=ready?amount(f.value):'—';
  const size=score===null?0:Math.max(0,Math.min(100,Math.round(score)));
  const direction=!ready?'—':Number(f.value)>=f.benchmark?'↑':'↓';
  return '<div class="mi-nhl-factor-row'+(ready?'':' is-unavailable')+'">'
   +'<span>'+esc(f.label)+'</span><strong>'+esc(value)+'</strong>'
   +'<span>vs '+esc(amount(f.benchmark))+'</span>'
   +'<div class="mi-nhl-impact-track" title="'+esc(f.note||'')+'"><span style="width:'+size+'%"></span></div>'
   +'<span class="mi-nhl-direction">'+direction+'</span><small>'+f.weight+'%</small></div>';
 }).join('');
 return '<section class="mi-signal-detail mi-nhl-signal-detail"><div class="mi-nhl-signal-heading"><h4>TSO PROP SIGNAL — CONTRIBUTING STATS</h4></div>'
 +'<div class="mi-nhl-factor-table"><div class="mi-nhl-factor-labels"><span>STAT</span><span>VALUE</span><span>BENCH</span><span>IMPACT</span><span>DIR</span><span>WT</span></div>'
 +rows+'</div><div class="mi-nhl-signal-final"><span>Combined Signal</span><strong>'+(s.score===null?'UNRATED':s.score+'<small>/100</small>')+'</strong></div>'
 +'<p class="mi-evidence-note">'+esc(s.evidence||s.reason||'')+' · '+s.coverage+'% verified metric weight. Reference benchmarks come from the supplied framework, NOT asserted league averages. Missing xG/60 and Line GF% remain unavailable until a verified advanced source is connected. Opponent defensive allowances are per game (not /60). No sportsbook odds or exact-line probability is used.</p></section>';
}
function signalDetail(row,data,doc){
 if(String(row?.sport||'').toLowerCase()==='nhl')return nhlSignalPanel(signalScore(row,data,doc));
 const s=signalScore(row,data,doc);
 const header='<div class="mi-signal-detail-head"><div><small>THE SPORTS OUTPOST EXCLUSIVE</small><h4>TSO Player / Market Signal</h4><p>Player production and usage for this prop category, independent of exact sportsbook thresholds or odds.</p></div><small>v2</small></div>';
 if(s.score===null)return '<section class="mi-signal-detail">'+header+'<p class="mi-muted">'+esc(s.reason)+'. TSO does not invent missing ratings.</p></section>';
 const factors=s.factors.map(f=>'<div class="mi-signal-factor"><div><b>'+esc(f.label)+'</b><span>'+f.weight+'% · '+Math.round(f.value)+'/100</span></div>'
  +'<div class="mi-signal-track"><span style="width:'+clamp(f.value,0,100)+'%"></span></div><small>'+esc(f.note)+'</small></div>').join('');
 return '<section class="mi-signal-detail">'+header+'<div class="mi-signal-big"><strong>'+s.score+'<small>/100</small></strong><div><b class="mi-signal-'+s.tier.toLowerCase().replace(/\s+/g,'-')+'">'+s.tier+'</b><small>'+s.games+' observed games · '+s.factors.length+' verified scoring factors · '+esc(s.evidence)+'</small></div></div>'
  +'<div class="mi-signal-track mi-signal-large'+(s.modeled?'':' is-form-only')+'" role="progressbar" aria-label="TSO player market production grade" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+s.score+'"><span style="width:'+s.score+'%"></span></div>'
  +'<div class="mi-signal-factor-grid">'+factors+'</div>'+(s.matchupContext?'<p class="mi-evidence-note">Opponent context (not numerically graded): '+esc(s.matchupContext)+'</p>':'')+'<p class="mi-evidence-note">A player/market production grade, NOT a bet probability. TSO benchmarks are internal scoring references, not reported league averages. Sportsbook lines, prices, implied odds and exact-line model edges are excluded. Missing matchup factors are not guessed.</p></section>';
}
function updateSignalView(root,row,data){
 for(const el of root.querySelectorAll('[data-mi-signal]'))if(el.dataset.miSignal===key(row))el.innerHTML=signalMini(row,data,state.signalDoc);
 for(const el of root.querySelectorAll('[data-mi-signal-detail]'))if(el.dataset.miSignalDetail===key(row))el.innerHTML=signalDetail(row,data,state.signalDoc);
}
// Fetch enough verified information to rank ALL players, not merely seven
// visible cards. Share requests per athlete/game and limit concurrent work.
function hydrateSignals(root,ctx){
 const candidates=playerMarketRows(ctx.rows||[]);
 if(ctx.game?.league==='nhl')state.nhlCurrentGame=ctx.game;
 const signature=rankingSignature(ctx.game,ctx.rows||[]);
 let job=state.ranking;
 if(job&&job.signature===signature){
  // Filtering a prop category replaces the DOM; retain the active root.
  job.root=root;job.refresh=ctx.refresh;
  for(const row of candidates)if(state.cached.has(key(row)))
   updateSignalView(root,row,state.cached.get(key(row)));
  return;
 }
 const grouped=new Map();
 for(const row of candidates){
  const identity=[row.sport,row.eventId||ctx.game?.id||'',
   row.playerId||'',String(row.player||'').toLowerCase(),nflTeamCode(row.team)].join('|');
  if(!grouped.has(identity))grouped.set(identity,[]);
  grouped.get(identity).push(row);
 }
 const queue=[...grouped.values()];
 job={signature,completed:0,total:queue.length,done:!queue.length,root,refresh:ctx.refresh};
 state.ranking=job;
 const progress=()=>{
  const status=job.root?.querySelector?.('[data-mi-ranking-status]');
  if(status)status.textContent=rankingStatus(ctx.game,ctx.rows||[]);
 };
 if(!queue.length){progress();return;}
 const pbp=String(ctx.game?.league||'')==='nfl'
  ?loadNflPbp().then(doc=>{if(state.ranking===job)state.signalDoc=doc;}).catch(()=>{})
  :Promise.resolve();
 async function work(){
  while(queue.length&&state.ranking===job){
   const group=queue.shift();
   try{
    const data=await getResearch(group[0],ctx);
    if(ctx.game?.league==='nhl')await Promise.all([verifiedNhlRates(group[0],data),verifiedNhlTeams(ctx.game)]);
    if(state.ranking!==job)return;
    for(const row of group){
     state.cached.set(key(row),data);
     if(job.root?.isConnected)updateSignalView(job.root,row,data);
    }
   }catch{
    // Missing source evidence remains ungraded, never a fabricated 0.
   }
   job.completed++;
   progress();
  }
 }
 Promise.allSettled([...Array(Math.min(6,queue.length))].map(()=>work()).concat([pbp])).then(()=>{
  if(state.ranking!==job)return;
  job.done=true;progress();
  if(job.root?.isConnected&&typeof job.refresh==='function')job.refresh();
 });
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
 return '<div class="mi-evidence-layout"><div class="mi-evidence-left">'
  +'<div data-mi-signal-detail="'+esc(key(row))+'">'+signalDetail(row,data,state.signalDoc)+'</div></div>'
  +'<div class="mi-evidence-right"><div class="mi-section mi-section--visual"><h4>LAST 10 · EXACT-LINE RESULTS</h4>'+form+'</div>'
  +'<section class="mi-player-defender"><h4>OPPONENT DEFENSE · VERIFIED ALLOWANCES</h4><div data-mi-player-defense="'+esc(key(row))+'">Looking up current-season defense vs position…</div></section></div></div>'
  +decisionEvidence(data,row)
   +'<div class="mi-section"><h4>Role & matchup</h4>'+roleVisual(data,row)
   +(notes.length?'<div class="mi-research-notes">'+notes.map(v=>'<span>'+esc(v)+'</span>').join('')+'</div>':'<p class="mi-muted">Detailed opponent-defense statistics are unavailable for this player.</p>')
   +(String(row.sport).toLowerCase()==='nfl'?'<div class="mi-nfl-opportunities" data-mi-nfl-opportunities="'+esc(key(row))+'"><p class="mi-muted">Loading verified NFL opportunity and red-zone shares…</p></div>':'')
   +'<small class="mi-muted">Source: '+esc(source)+'</small></div>'
   +'<div class="mi-section mi-section--movement"><h4>Sportsbook odds movement</h4><div data-mi-history="'+esc(key(row))+'"><p class="mi-muted">Checking verified line history…</p></div></div>';
}
// Verified CURRENT 2026 defense vs position, not preseason/2025 records.
function nflDefensePosition(value){
 const v=String(value||'').toUpperCase();
 return v==='FB'||v==='HB'?'RB':['QB','RB','WR','TE'].includes(v)?v:null;
}
let nflDefensePromise=null;
function loadNflDefense2026(){
 if(!nflDefensePromise){
  nflDefensePromise=fetch('/api/nfl-defense-2026',{cache:'no-store',headers:{accept:'application/json'}})
   .then(async response=>{
    const doc=await response.json();
    if(!response.ok||doc?.available!==true||doc?.season!==2026||
     !doc.teams||!doc.league?.byPosition||!Number.isFinite(Date.parse(doc.generatedAt)))
      throw Error(doc?.error||'Verified 2026 defensive data unavailable');
    return doc;
   }).catch(error=>{nflDefensePromise=null;throw error;});
 }
 return nflDefensePromise;
}
function verifiedDefensiveMatchup(doc,defense,position){
 if(doc?.season!==2026||doc?.available!==true)return null;
 const team=nflTeamCode(defense),pos=nflDefensePosition(position);
 const record=doc.teams?.[team]?.byPosition?.[pos];
 if(!pos||!record||n(record.games)===null||record.games<3)return null;
 const columns=pos==='QB'?[['passYds','Passing yards'],['passTds','Passing TDs']]:
  pos==='RB'?[['rushYds','Rushing yards'],['recYds','Receiving yards']]:
  [['recYds','Receiving yards'],['receptions','Receptions']];
 const metrics=columns.filter(([k])=>n(record.perGame?.[k])!==null&&n(record.perGame?.[k])>=0)
   .map(([k,label])=>'<span><b>'+amount(record.perGame[k])+'</b><small>'+esc(label)+' / game</small></span>');
 if(!metrics.length)return null;
 return {pos,html:'<div class="mi-scout-pos"><b>'+esc(team)+' defense vs '+pos+' · 2026</b>'
  +'<div class="mi-scout-metrics">'+metrics.join('')+'</div>'
  +'<small>All opposing '+pos+'s combined · '+record.games+' observed games · 2026 regular season</small></div>'};
}
function scoutingFromResult(data,defense,game){
 if(!data?.available)return null;
 if(game.league==='nfl')return null; // Never promote 2025 defensive data.
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
 const defenderNode=node.querySelector('[data-mi-player-defense]');
 if(defenderNode&&String(row.sport||'').toLowerCase()==='nfl'){
  loadNflDefense2026().then(doc=>{
   if(!defenderNode.isConnected)return;
   const offense=nflTeamCode(row.team),opponent=nflTeamCode(ctx.game?.away?.abbr)===offense?
    nflTeamCode(ctx.game?.home?.abbr):nflTeamCode(ctx.game?.away?.abbr);
   const entry=verifiedDefensiveMatchup(doc,opponent,row.position||'');
   defenderNode.innerHTML=entry?entry.html:
    '<p class="mi-muted">Current-season defense-vs-position statistics are unavailable for this matchup. TSO does not infer a defensive ranking.</p>';
  }).catch(()=>{if(defenderNode.isConnected)defenderNode.innerHTML='<p class="mi-muted">Verified opponent defense data unavailable.</p>';});
 }else if(defenderNode){
  defenderNode.innerHTML='<p class="mi-muted">Opponent positional allowances for this sport are not verified in the current feed.</p>';
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
  node.textContent='Loading verified 2026 defense-vs-position stats…';
  // All four positions are available independently of sportsbook props.
  loadNflDefense2026().then(doc=>{
   if(!node.isConnected)return;
   const fresh=state.defense2026!==doc;
   state.defense2026=doc;
   const cards=['QB','RB','WR','TE'].map(pos=>verifiedDefensiveMatchup(doc,defense,pos)).filter(Boolean);
   node.innerHTML=cards.length
     ?'<b>Verified 2026 defense vs position</b><div class="mi-scout-pos-grid">'+cards.map(c=>c.html).join('')+'</div>'
      +'<small>2026 nflverse · updated '+esc(String(doc.generatedAt||'').slice(0,10))
      +' · defensive allowances, not a future-game forecast.</small>'
     :'<span class="mi-muted">Insufficient verified 2026 defensive observations for '+esc(defense)+'. No 2025 fallback.</span>';
   // Re-grade player/market matches once the verified 2026 defense is present.
   if(fresh&&node.isConnected&&typeof ctx.refresh==='function')ctx.refresh();
  }).catch(()=>{
   if(node.isConnected)node.innerHTML='<span class="mi-muted">Verified 2026 defense-vs-position data is unavailable. 2025 stats are disabled.</span>';
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
window.TSO2Matchup={bestExactQuote,exactLineModelPct,loadNflPbp,loadNflDefense2026,listing,bind,matchedStats:seriesFromResearch,eligibleOver,marketName,recentGamesChart,lineMovementChart,hitRateVisual,decisionEvidence,signalScore,signalMini,signalDetail,rankRowsBySignal,verifiedDefensiveMatchup,opportunityForPlayer,opportunityEvidence,opposingOffenseEvidence};
})();