const VERSION='94.7';
const TOOL_ID='nflPlayerPropTool';
const BUTTON_ID='nflPlayerPropToolBtn';
const STASH_ID='nflPlayerPropToolBaseStash';
const GUIDE_ID='nflPlayerPropGuide';
const STYLE_ID='nfl-player-prop-tool-v947-css';
const FILES=['./slates/nfl.json','./slates/nfl-odds.json','./slates/nfl-sim.json','./slates/nfl-research.json'];
const BUILD_STYLES=[
  ['tsoPick','TSO Pick'],
  ['safest','Safest'],
  ['bestEdge','Best Edge'],
  ['balanced','Balanced'],
  ['aggressive','Aggressive'],
  ['correlated','Correlated'],
  ['longshot','Longshot'],
];
const PERIODS=[['full','Full'],['1h','1H'],['2h','2H'],['q1','Q1'],['q2','Q2'],['q3','Q3'],['q4','Q4']];
const MARKET_META={
  rushYds:{label:'Rush Yds',long:'Rushing Yards'},
  recYds:{label:'Rec Yds',long:'Receiving Yards'},
  receptions:{label:'Receptions',long:'Receptions'},
  passYds:{label:'Pass Yds',long:'Passing Yards'},
  passTds:{label:'Pass TDs',long:'Passing TDs'},
  completions:{label:'Completions',long:'Completions'},
  atd:{label:'ATD',long:'Anytime TD'},
};
const POSITIONS=['QB','RB','WR','TE'];
const HEADERS=[
  ['player','PLAYER'],['consensus','CONSENSUS'],['pick','PICK'],['proj','PROJ'],['median','L10 AVG'],
  ['prob','COV PROB'],['edge','EDGE'],['def','DEF VS PROP'],['matchup','MATCHUP'],['simDef','SIM DEF'],
  ['l5','L5'],['l10','L10'],['h2h','H2H'],
];
const BOOK_DOMAINS=[
  [/fanduel/i,'fanduel.com'],[/draftkings/i,'draftkings.com'],[/betmgm/i,'betmgm.com'],[/caesars/i,'caesars.com'],
  [/bet365/i,'bet365.com'],[/fanatics/i,'fanatics.com'],[/espn\s*bet/i,'espnbet.com'],[/hard\s*rock/i,'hardrock.bet'],
  [/betrivers|rushbet/i,'betrivers.com'],[/bovada/i,'bovada.lv'],[/pinnacle/i,'pinnacle.com'],[/fliff/i,'getfliff.com'],
  [/parx/i,'betparx.com'],[/unibet/i,'unibet.com'],[/pointsbet/i,'pointsbet.com'],
];
const state={
  style:'tsoPick',period:'full',game:'ALL',market:'ALL',team:'ALL',positions:new Set(POSITIONS),
  search:'',minProb:.40,sortKey:'style',sortDir:'desc',color:true,filtersOpen:false,
};
let installed=false,active=false,selectBaseTab=null,snapshot=null,loadPromise=null,rowsCache=new Map(),modalReturn=null,restoreRaf=0;
const currentRows=new Map();

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').toLowerCase().replace(/\./g,'').replace(/['’]/g,'').replace(/\s+(jr|sr|ii|iii|iv|v)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const team=v=>({LAR:'LA',JAC:'JAX',WAS:'WSH',OAK:'LV',SD:'LAC',STL:'LA'}[String(v||'').toUpperCase()]||String(v||'').toUpperCase());
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const fmt=v=>v==null||!Number.isFinite(Number(v))?'—':Math.abs(Number(v))>=100?Math.round(Number(v)).toString():Number(v).toFixed(1).replace(/\.0$/,'');
const priceFmt=v=>v==null||!Number.isFinite(Number(v))?'—':Number(v)>0?`+${Math.round(Number(v))}`:`${Math.round(Number(v))}`;
const kickoff=iso=>{const d=new Date(iso||0);return Number.isFinite(d.getTime())?d.toLocaleString([],{weekday:'short',hour:'numeric',minute:'2-digit'}):'TBD';};
const gradeFor=p=>p>=.70?'A+':p>=.65?'A':p>=.61?'A-':p>=.57?'B+':p>=.54?'B':p>=.51?'B-':p>=.48?'C+':'C';
const gradeTone=p=>p>=.67?'great':p>=.58?'good':p>=.50?'mid':'tough';
const cssEscape=v=>globalThis.CSS?.escape?CSS.escape(String(v)):String(v).replace(/["\\]/g,'\\$&');

function ensureStyle(){
  if(document.getElementById(STYLE_ID))return;
  const link=document.createElement('link');
  link.id=STYLE_ID;link.rel='stylesheet';link.href=`./sports/nfl/player-prop-tool-v947.css?v=${VERSION}`;
  document.head.appendChild(link);
}
async function getJson(path){
  const r=await fetch(`${path}?v=${VERSION}-${Date.now()}`,{cache:'no-store'});
  if(!r.ok)throw new Error(`${path} ${r.status}`);
  return r.json();
}
async function loadSnapshot(force=false){
  if(snapshot&&!force)return snapshot;
  if(loadPromise)return loadPromise;
  loadPromise=Promise.all(FILES.map((p,i)=>getJson(p).catch(err=>{
    if(i===0||i===2)throw err;
    return i===1?{games:[],meta:{}}:{players:[]};
  }))).then(([slate,odds,sim,research])=>{
    snapshot={slate,odds,sim,research,loadedAt:Date.now()};
    rowsCache.clear();
    return snapshot;
  }).finally(()=>{loadPromise=null;});
  return loadPromise;
}
function teamLogo(code){
  const c=team(code),espn={LA:'lar',JAX:'jax',WSH:'wsh'}[c]||String(c||'').toLowerCase();
  return espn?`https://a.espncdn.com/i/teamlogos/nfl/500/${encodeURIComponent(espn)}.png`:'';
}
function bookDomain(book){
  const b=String(book||'');
  return BOOK_DOMAINS.find(([re])=>re.test(b))?.[1]||'';
}
function bookLogo(book){
  const domain=bookDomain(book);
  return domain?`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`:'';
}
function marketLabel(key){return MARKET_META[key]?.label||key||'Prop';}
function stablePlayerKey(c){return String(c.playerId||c.espnId||c.gsisId||`${team(c.team)}|${norm(c.name)}`);}
function gameMaps(docs){
  const byId=new Map();
  for(const g of docs?.slate?.games||[]){
    const id=String(g.gameId||g.id||'');if(id)byId.set(id,g);
  }
  return byId;
}
function findSlatePlayer(game,c){
  const players=game?.players||[];
  const ids=[c.playerId,c.espnId,c.gsisId].filter(Boolean).map(String);
  for(const p of players){
    if([p.playerId,p.espnId,p.gsisId].filter(Boolean).map(String).some(id=>ids.includes(id)))return p;
  }
  return players.find(p=>team(p.team)===team(c.team)&&norm(p.name)===norm(c.name))||null;
}
function payoutBonus(price){const p=num(price);if(p==null)return 0;if(p>0)return Math.min(.22,p/1800);return Math.max(-.10,(p+110)/2200);}
function styleScore(r){
  const p=r.prob??0,e=r.edge??-.5,pay=payoutBonus(r.price);
  if(state.style==='safest')return p*1.05+e*.08;
  if(state.style==='bestEdge')return e*1.2+p*.15+pay*.04;
  if(state.style==='balanced')return 1-Math.abs(p-.68)*2.7+e*.35+pay*.05;
  if(state.style==='aggressive')return 1-Math.abs(p-.59)*3+e*.30+pay*.18;
  if(state.style==='longshot')return 1-Math.abs(p-.52)*3.4+e*.24+pay*.34;
  if(state.style==='correlated')return Number(r.correlationLift||0)*2+p*.45+e*.25;
  return p*.58+e*.42+pay*.08;
}
function periodBoard(gameDoc){
  if(state.period==='full')return gameDoc?.propStyles||null;
  return gameDoc?.propPeriods?.[state.period]||gameDoc?.quarters?.periods?.[state.period]||null;
}
function buildRows(docs){
  const key=`${state.period}|${state.style}`;
  if(rowsCache.has(key))return rowsCache.get(key);
  const slateById=gameMaps(docs),out=[];
  for(const simGame of docs?.sim?.games||[]){
    const gameId=String(simGame?.game?.gameId||simGame?.gameId||'');
    const board=periodBoard(simGame);
    if(!gameId||!board?.candidates?.length)continue;
    const ranking=board?.rankings?.[state.style]||board?.rankings?.tsoPick||[];
    const byId=new Map(board.candidates.map(c=>[String(c.id),c]));
    const seen=new Set();
    for(let rank=0;rank<ranking.length;rank++){
      const c=byId.get(String(ranking[rank]));if(!c)continue;
      const rowKey=`${gameId}|${stablePlayerKey(c)}|${c.market}`;
      if(seen.has(rowKey))continue;seen.add(rowKey);
      const g=slateById.get(gameId)||simGame?.game||{};
      const player=findSlatePlayer(g,c);
      const away=team(g?.away?.abbr||g?.away||simGame?.game?.away?.abbr),home=team(g?.home?.abbr||g?.home||simGame?.game?.home?.abbr);
      const playerTeam=team(c.team||player?.team);
      const opp=playerTeam===away?home:playerTeam===home?away:team(player?.opponent||c.opponent);
      const full=state.period==='full';
      const dist=full?(c.projection||null):(c.projectedPeriod||c.projectedQuarter||c.projection||null);
      if(!dist)continue;
      const prob=num(c.simProbability),edge=full?num(c.edge):num(c.modelEdge??c.edge),iterations=Number(c.iterations||c.worldMaskIterations||board.iterations||simGame.iterations||0);
      if(prob==null)continue;
      const mean=num(dist.mean),median=num(dist.median)??mean,p25=num(dist.p25),p75=num(dist.p75),p90=num(dist.p90),p10=num(dist.p10);
      const simStop=clamp(1-prob),matchScore=clamp(prob+(full&&edge!=null?edge*.20:0));
      const row={
        id:rowKey,gameId,game:`${away||'AWY'} @ ${home||'HME'}`,kickoff:g?.startTimeUTC||simGame?.game?.startTimeUTC,
        playerId:String(c.playerId||player?.gsisId||player?.espnId||''),espnId:c.espnId||player?.espnId||null,gsisId:c.gsisId||player?.gsisId||null,
        name:c.name||player?.name||'Player',team:playerTeam,opp,position:String(c.position||player?.position||'').toUpperCase(),headshot:player?.headshot||c.headshot||'',
        market:String(c.market||''),line:num(c.line),side:String(c.side||'over').toLowerCase(),price:full?num(c.price):null,book:full?String(c.book||'Sportsbook'):'TSO 50K',
        prob,edge,mean,median,p10,p25,p75,p90,iterations,simStop,matchScore,rank,correlationLift:num(c.correlationLift),correlationPartner:c.correlationPartner||'',
      };
      row.styleScore=styleScore(row);
      row.search=norm(`${row.name} ${row.team} ${row.opp} ${row.position} ${marketLabel(row.market)} ${row.game}`);
      out.push(row);
    }
  }
  rowsCache.set(key,out);
  return out;
}
function passes(row,ignore=''){
  if(ignore!=='position'&&state.positions.size&&!state.positions.has(row.position))return false;
  if(ignore!=='game'&&state.game!=='ALL'&&row.gameId!==state.game)return false;
  if(ignore!=='market'&&state.market!=='ALL'&&row.market!==state.market)return false;
  if(ignore!=='team'&&state.team!=='ALL'&&row.team!==state.team)return false;
  if(ignore!=='search'&&state.search&&!row.search.includes(norm(state.search)))return false;
  if(ignore!=='minProb'&&row.prob<state.minProb)return false;
  return true;
}
function reconcileFilters(rows){
  if(state.game!=='ALL'&&!rows.some(r=>r.gameId===state.game&&passes(r,'game')))state.game='ALL';
  if(state.market!=='ALL'&&!rows.some(r=>r.market===state.market&&passes(r,'market')))state.market='ALL';
  if(state.team!=='ALL'&&!rows.some(r=>r.team===state.team&&passes(r,'team')))state.team='ALL';
}
function valueFor(row,key){
  if(key==='player')return row.name.toLowerCase();
  if(key==='consensus')return row.line??-1;
  if(key==='pick')return row.price??row.line??-9999;
  if(key==='proj')return row.mean??-1;
  if(key==='median')return row.median??-1;
  if(key==='prob')return row.prob??-1;
  if(key==='edge')return row.edge??-999;
  if(key==='def')return row.simStop??-1;
  if(key==='matchup')return row.matchScore??-1;
  if(key==='simDef')return row.simStop??-1;
  if(key==='l5')return row.prob??-1;
  if(key==='l10')return row.prob??-1;
  if(key==='h2h')return row.prob??-1;
  return row.styleScore??-999;
}
function sorted(rows){
  const mul=state.sortDir==='asc'?1:-1,key=state.sortKey;
  return [...rows].sort((a,b)=>{
    const av=valueFor(a,key),bv=valueFor(b,key);
    if(typeof av==='string'||typeof bv==='string')return String(av).localeCompare(String(bv))*mul;
    return ((Number(av)||0)-(Number(bv)||0))*mul||a.name.localeCompare(b.name);
  });
}
function ringHtml(prob){
  const pct=Math.round(clamp(prob)*100),g=gradeFor(prob),c=113.1,off=(c*(1-pct/100)).toFixed(1);
  return `<span class="nfl-ppt-ring-v947" title="${pct}% of 50,000 simulated worlds cover this exact side"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="track" cx="22" cy="22" r="18"/><circle class="fill" cx="22" cy="22" r="18" transform="rotate(-90 22 22)" stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg><span><b>${g}</b><small>${pct}%</small></span></span>`;
}
function bookHtml(row){
  if(state.period!=='full')return `<span class="nfl-ppt-bookmark tso" title="TSO 50K simulation">TSO</span>`;
  const src=bookLogo(row.book);
  if(!src)return `<span class="nfl-ppt-bookmark fallback" title="${esc(row.book)}">${esc(String(row.book||'SB').slice(0,2).toUpperCase())}</span>`;
  return `<span class="nfl-ppt-bookmark" title="${esc(row.book)}"><img src="${esc(src)}" alt="${esc(row.book)}" loading="lazy" referrerpolicy="no-referrer"><i>${esc(String(row.book||'SB').slice(0,2).toUpperCase())}</i></span>`;
}
function defHtml(row){
  const src=teamLogo(row.opp);
  return `<div class="nfl-ppt-def-v947" title="${esc(row.opp)} defense · 50K simulation matchup read">${src?`<img src="${esc(src)}" alt="${esc(row.opp)}">`:`<b>${esc(row.opp||'DEF')}</b>`}<span>vs Prop</span></div>`;
}
function matchupHtml(row){
  const tone=gradeTone(row.matchScore),label=tone==='great'?'GREAT':tone==='good'?'GOOD':tone==='mid'?'FAIR':'TOUGH';
  const corr=state.style==='correlated'&&row.correlationLift>0?` · +${(row.correlationLift*100).toFixed(1)}% co-hit`:'';
  return `<div class="nfl-ppt-match-v947 ${tone}"><b>${label}</b><span>${esc(row.position||'OFF')} vs ${esc(row.opp||'DEF')}${esc(corr)}</span></div>`;
}
function hitCell(prob,total,label){
  const hits=Math.max(0,Math.min(total,Math.round(clamp(prob)*total))),tone=prob>=.67?'good':prob<.48?'bad':'mid';
  return `<div class="nfl-ppt-hit-v947 ${tone}"><b>${hits}/${total}</b><span>${label}</span></div>`;
}
function rowHtml(row){
  const edge=row.edge==null?'—':state.period==='full'?`${row.edge>=0?'+':''}${(row.edge*100).toFixed(1)}%`:`${row.edge>=0?'+':''}${row.edge.toFixed(2)}σ`;
  const periodLabel=PERIODS.find(x=>x[0]===state.period)?.[1]||state.period.toUpperCase();
  const book=bookHtml(row),side=row.side==='under'?'U':'O';
  return `<tr data-nfl-ppt-row="${esc(row.id)}" data-nfl-ppt-game="${esc(row.gameId)}" data-nfl-ppt-market="${esc(row.market)}" data-nfl-ppt-style="${esc(state.style)}" data-nfl-ppt-period="${esc(state.period)}">
    <td class="nfl-ppt-player-sticky"><button type="button" class="nfl-ppt-player-v947" data-nfl-tool-player="${esc(row.playerId||row.espnId||row.gsisId||row.name)}" data-row-id="${esc(row.id)}"><span class="nfl-ppt-avatar-v947">${row.headshot?`<img src="${esc(row.headshot)}" alt="" loading="lazy">`:`<i>${esc(row.name.split(/\s+/).map(x=>x[0]).slice(0,2).join(''))}</i>`}</span><span><b>${esc(row.name)} ↗</b><small>${esc(row.team)} vs ${esc(row.opp)} · ${esc(kickoff(row.kickoff))}</small></span></button></td>
    <td><div class="nfl-ppt-consensus-v947"><b>${fmt(row.line)}</b><span>${state.period==='full'?'':`${esc(periodLabel)} `}${esc(marketLabel(row.market))}</span></div></td>
    <td><div class="nfl-ppt-pick-v947 ${esc(row.side)}">${book}<span class="nfl-ppt-pick-number"><b>${side} ${fmt(row.line)}</b><small>${row.price==null?'MODEL':priceFmt(row.price)}</small></span></div></td>
    <td><div class="nfl-ppt-metric-v947"><b>${fmt(row.mean)}</b><span>SIM MEAN</span></div></td>
    <td><div class="nfl-ppt-metric-v947"><b>${fmt(row.median)}</b><span>SIM MED</span></div></td>
    <td>${ringHtml(row.prob)}</td>
    <td><div class="nfl-ppt-edge-v947"><b>${edge}</b><span>${state.period==='full'?'VS IMPLIED':'SIM EDGE'}</span></div></td>
    <td>${defHtml(row)}</td>
    <td>${matchupHtml(row)}</td>
    <td><div class="nfl-ppt-simdef-v947"><b>${Math.round(row.simStop*100)}%</b><span>SIM STOP</span></div></td>
    <td>${hitCell(row.prob,5,row.side==='under'?'Under':'Over')}</td>
    <td>${hitCell(row.prob,10,row.side==='under'?'Under':'Over')}</td>
    <td><div class="nfl-ppt-hit-v947 sim"><b>${Math.round(row.prob*100)}%</b><span>50K SIM</span></div></td>
  </tr>`;
}
function headerHtml(){
  return `<thead><tr class="nfl-ppt-groups"><th colspan="3"></th><th colspan="4">PROJECTIONS + VALUE</th><th colspan="3">TSO INSIGHTS + DATA</th><th colspan="3">HIT RATES</th></tr><tr>${HEADERS.map(([key,label])=>`<th data-col="${key}" aria-sort="none"><button type="button" data-ppt-sort="${key}"><span>${label}</span><i>↕</i></button></th>`).join('')}</tr></thead>`;
}
function controlsHtml(){
  return `<div class="nfl-ppt-toolbar-v947">
    <div class="nfl-ppt-selects-v947">
      <label><span>Bet Style</span><select id="nflPptMode">${BUILD_STYLES.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label>
      <label><span>Game</span><select id="nflPptGame"><option value="ALL">All Games</option></select></label>
      <label><span>Prop</span><select id="nflPptMarket"><option value="ALL">All Props</option></select></label>
    </div>
    <div class="nfl-ppt-positions-v947">${POSITIONS.map(p=>`<button type="button" data-nfl-ppt-pos="${p}" class="active">${p}</button>`).join('')}</div>
    <div class="nfl-ppt-actions-v947"><button type="button" id="nflPptGuide">Quick Guide</button><button type="button" id="nflPptFilters">Filters ⚙</button><button type="button" id="nflPptRefresh">Refresh ↻</button></div>
  </div>
  <div class="nfl-ppt-periodbar-v947"><span>Period</span><div>${PERIODS.map(([v,l])=>`<button type="button" data-nfl-ppt-period="${v}" class="${v==='full'?'active':''}">${l}</button>`).join('')}</div><small id="nflPptPeriodStatus">Full · TSO Pick · frozen 50K sim</small></div>
  <div class="nfl-ppt-filter-panel-v947" id="nflPptFilterPanel" hidden>
    <label>Search<input id="nflPptSearch" type="search" placeholder="Player, team, matchup…"></label>
    <label>Team<select id="nflPptTeam"><option value="ALL">All Teams</option></select></label>
    <label>Min Cov Prob<select id="nflPptMin"><option value="0.40">40%</option><option value="0.45">45%</option><option value="0.50">50%</option><option value="0.55">55%</option><option value="0.60">60%</option><option value="0.65">65%</option></select></label>
    <button type="button" id="nflPptClear">Clear Filters</button>
  </div>`;
}
function shellHtml(docs){
  const week=docs?.slate?.week||'—';
  return `<header class="nfl-ppt-head-v947"><div><span>THE SPORTS OUTPOST · NFL</span><h1>PLAYER PROP TOOL</h1><p>Sportsbook-backed Bet Styles · Week ${esc(week)} · exact 50K simulation snapshot</p></div><div class="nfl-ppt-head-stat"><b id="nflPptVisibleCount">0</b><span>matching props</span></div></header>
    ${controlsHtml()}
    <div class="nfl-ppt-table-wrap"><table class="nfl-ppt-table">${'<col>'.repeat(13)}${headerHtml()}<tbody></tbody></table><div class="nfl-ppt-empty" hidden>No sportsbook-backed 50K props match these filters.</div></div>`;
}
function guideHtml(){
  return `<div class="nfl-ppt-guide-backdrop-v947" id="${GUIDE_ID}"><section><button type="button" data-nfl-ppt-guide-close>×</button><span>QUICK GUIDE</span><h2>50K Player Prop Tool</h2><div class="nfl-ppt-guide-grid-v947">
    <div><b>Bet Style</b><p>Changes the actual sportsbook-backed line, side and price selected for each player market from the frozen 50K board.</p></div>
    <div><b>Consensus / Pick</b><p>Consensus is the selected line. Pick is the exact side, sportsbook logo and American price for Full-game props.</p></div>
    <div><b>PROJ / L10 AVG</b><p>Simulation mean and simulation median from the same 50,000 worlds. L10 AVG is a display category here, not a historical last-10 claim.</p></div>
    <div><b>COV PROB / Edge</b><p>Exact 50K cover rate and, for Full, the difference versus the displayed sportsbook price's implied probability.</p></div>
    <div><b>DEF vs Prop</b><p>The opponent defense logo tied to the selected prop. Matchup and SIM DEF are simulation reads, not a historical defense-rank fallback.</p></div>
    <div><b>L5 / L10 / H2H</b><p>Compact 50K simulation equivalents so every displayed stat stays simulation-backed.</p></div>
    <div><b>Sorting</b><p>Every column header is sortable. Click once for one direction and again to reverse it.</p></div>
    <div><b>Snapshot behavior</b><p>Style, period, sorting and filters never refetch data. Only Refresh or a browser reload replaces the four-file snapshot.</p></div>
  </div><small>Period views use TSO simulation thresholds when a comparable sportsbook period market is not published; no sportsbook quote is invented.</small></section></div>`;
}
function syncControlOptions(allRows){
  const tool=document.getElementById(TOOL_ID);if(!tool)return;
  const gameSel=tool.querySelector('#nflPptGame'),marketSel=tool.querySelector('#nflPptMarket'),teamSel=tool.querySelector('#nflPptTeam');
  const games=[...new Map(allRows.filter(r=>passes(r,'game')).map(r=>[r.gameId,r.game])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  const markets=[...new Set(allRows.filter(r=>passes(r,'market')).map(r=>r.market))].sort((a,b)=>marketLabel(a).localeCompare(marketLabel(b)));
  const teams=[...new Set(allRows.filter(r=>passes(r,'team')).map(r=>r.team))].sort();
  const fill=(sel,first,items,current,labelFn=x=>x)=>{if(!sel)return;sel.innerHTML=`<option value="ALL">${first}</option>`+items.map(x=>{const v=Array.isArray(x)?x[0]:x,l=Array.isArray(x)?x[1]:labelFn(x);return`<option value="${esc(v)}">${esc(l)}</option>`;}).join('');sel.value=current;};
  fill(gameSel,'All Games',games,state.game);
  fill(marketSel,'All Props',markets.map(k=>[k,MARKET_META[k]?.long||marketLabel(k)]),state.market);
  fill(teamSel,'All Teams',teams,state.team);
  const styleSel=tool.querySelector('#nflPptMode');if(styleSel)styleSel.value=state.style;
  const minSel=tool.querySelector('#nflPptMin');if(minSel)minSel.value=state.minProb.toFixed(2);
  const search=tool.querySelector('#nflPptSearch');if(search&&document.activeElement!==search)search.value=state.search;
  tool.querySelectorAll('[data-nfl-ppt-pos]').forEach(b=>b.classList.toggle('active',state.positions.has(b.dataset.nflPptPos)));
  tool.querySelectorAll('.nfl-ppt-periodbar-v947 [data-nfl-ppt-period]').forEach(b=>{const on=b.dataset.nflPptPeriod===state.period;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on?'true':'false');});
  const panel=tool.querySelector('#nflPptFilterPanel');if(panel)panel.hidden=!state.filtersOpen;
}
function updateSortHeaders(tool){
  tool.querySelectorAll('th[data-col]').forEach(th=>{
    const key=th.dataset.col,on=state.sortKey===key;
    th.setAttribute('aria-sort',on?(state.sortDir==='asc'?'ascending':'descending'):'none');
    const i=th.querySelector('i');if(i)i.textContent=on?(state.sortDir==='asc'?'↑':'↓'):'↕';
  });
}
function renderRows(){
  const tool=document.getElementById(TOOL_ID);if(!tool||!snapshot)return;
  const all=buildRows(snapshot);
  reconcileFilters(all);
  syncControlOptions(all);
  const visible=sorted(all.filter(r=>passes(r)));
  currentRows.clear();for(const r of all)currentRows.set(r.id,r);
  const tbody=tool.querySelector('tbody');if(tbody)tbody.innerHTML=visible.map(rowHtml).join('');
  const empty=tool.querySelector('.nfl-ppt-empty');if(empty)empty.hidden=visible.length>0;
  const count=tool.querySelector('#nflPptVisibleCount');if(count)count.textContent=String(visible.length);
  const status=tool.querySelector('#nflPptPeriodStatus');
  if(status)status.textContent=`${PERIODS.find(x=>x[0]===state.period)?.[1]||state.period} · ${BUILD_STYLES.find(x=>x[0]===state.style)?.[1]||'TSO Pick'} · frozen 50K sim`;
  tool.dataset.nflPptSnapshot='ready';tool.dataset.nflPptVersion=VERSION;tool.dataset.nflPptBuildStyle=state.style;tool.dataset.nflPptPeriod=state.period;tool.dataset.nflPptRows=String(visible.length);
  updateSortHeaders(tool);
}
function syncNav(){
  document.querySelectorAll('#sbSportAccordion .sb-sub-item,[data-nfl-tab],[data-nfl-preview-tab]').forEach(b=>b.classList.toggle('is-active',b.id===BUTTON_ID));
  document.getElementById(BUTTON_ID)?.classList.add('is-active');
}
function installButton(){
  const host=document.getElementById('sbSportAccordion');if(!host)return false;
  if(document.getElementById(BUTTON_ID))return true;
  const anchor=host.querySelector('[data-nfl-preview-tab="props"]')||host.querySelector('[data-nfl-tab="props"]')||host.querySelector('[data-nfl-preview-tab="players"]');
  if(!anchor)return false;
  const btn=document.createElement('button');btn.id=BUTTON_ID;btn.type='button';btn.className='sb-sub-item nfl-player-prop-tool-trigger';btn.textContent='Player Prop Tool';btn.dataset.nflPropTool='1';
  btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openTool();});
  anchor.insertAdjacentElement('afterend',btn);return true;
}
function restoreBase(){
  const root=document.getElementById('nflView'),tool=document.getElementById(TOOL_ID),stash=document.getElementById(STASH_ID);
  if(tool)tool.remove();
  if(root&&stash){while(stash.firstChild)root.insertBefore(stash.firstChild,stash);stash.remove();}
}
function deactivate(){active=false;modalReturn=null;if(restoreRaf)cancelAnimationFrame(restoreRaf);restoreRaf=0;document.documentElement.classList.remove('nfl-ppt-opening-modal');document.getElementById(GUIDE_ID)?.remove();restoreBase();}
function mountShell(){
  const root=document.getElementById('nflView');if(!root)return false;
  if(root.querySelector(`#${TOOL_ID}`))return true;
  const stash=document.createElement('div');stash.id=STASH_ID;stash.hidden=true;
  while(root.firstChild)stash.appendChild(root.firstChild);
  const tool=document.createElement('section');tool.id=TOOL_ID;tool.className='nfl-player-prop-tool-v947';tool.innerHTML='<div class="nfl-ppt-loading-v947"><b>Loading Player Prop Tool…</b><span>Freezing slate, sportsbook and 50K simulation data.</span></div>';
  root.append(stash,tool);bindTool(tool);syncNav();return true;
}
async function openTool(){
  if(active&&document.getElementById(TOOL_ID))return;
  active=true;
  try{selectBaseTab?.('players');}catch{}
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  if(!mountShell())return;
  const tool=document.getElementById(TOOL_ID);
  try{
    const docs=await loadSnapshot(false);if(!active||!tool?.isConnected)return;
    tool.innerHTML=shellHtml(docs);renderRows();
  }catch(err){
    if(tool)tool.innerHTML=`<div class="nfl-ppt-error-v947"><b>Player Prop Tool could not load.</b><span>${esc(err?.message||err)}</span><button type="button" id="nflPptRefresh">Retry</button></div>`;
  }
}
function findPlayerProxy(row){
  const stash=document.getElementById(STASH_ID);if(!stash)return null;
  for(const id of [row.playerId,row.gsisId,row.espnId]){if(!id)continue;const hit=stash.querySelector(`[data-nfl-player="${cssEscape(id)}"]`);if(hit)return hit;}
  return [...stash.querySelectorAll('[data-nfl-player]')].find(el=>norm(el.textContent).includes(norm(row.name)))||null;
}
async function enhanceOpenedPlayerModal(){
  const root=document.getElementById('nflView');if(!root)return;
  try{
    const research=await import('../nfl-research-ui.js?v=86.10');
    await research.mountNflResearchUI(root);
  }catch(e){console.warn('[NFL Player Prop Tool v94.7] research modal enhancement unavailable:',e);}
  let frames=0;
  await new Promise(resolve=>{
    const tick=()=>{if(root.querySelector('.tso-nfl-player-card-v72')||++frames>120)return resolve();requestAnimationFrame(tick);};
    requestAnimationFrame(tick);
  });
  document.documentElement.classList.remove('nfl-ppt-opening-modal');
}
function queueModalRestore(){
  if(restoreRaf)cancelAnimationFrame(restoreRaf);
  let frames=0;
  const run=()=>{
    restoreRaf=0;
    const saved=modalReturn,root=document.getElementById('nflView');
    if(!saved||!active||!root)return;
    const modal=root.querySelector('.ms-modal,.tso-nfl-player-card-v72');
    if(modal&&modal.getClientRects().length&&++frames<240){restoreRaf=requestAnimationFrame(run);return;}
    const existing=root.querySelector(`#${STASH_ID}`);existing?.remove();
    const stash=document.createElement('div');stash.id=STASH_ID;stash.hidden=true;
    while(root.firstChild)stash.appendChild(root.firstChild);
    root.append(stash,saved.tool);
    const wrap=saved.tool.querySelector('.nfl-ppt-table-wrap');if(wrap)wrap.scrollLeft=saved.tableX;
    window.scrollTo(saved.x,saved.y);
    modalReturn=null;syncNav();
  };
  restoreRaf=requestAnimationFrame(run);
}
async function openPlayer(row){
  const tool=document.getElementById(TOOL_ID),proxy=findPlayerProxy(row);if(!tool||!proxy)return;
  const wrap=tool.querySelector('.nfl-ppt-table-wrap');
  modalReturn={tool,x:window.scrollX,y:window.scrollY,tableX:wrap?.scrollLeft||0};
  document.documentElement.classList.add('nfl-ppt-opening-modal');
  proxy.click();
  await enhanceOpenedPlayerModal();
}
function clearFilters(){
  Object.assign(state,{game:'ALL',market:'ALL',team:'ALL',search:'',minProb:.40,sortKey:'style',sortDir:'desc',filtersOpen:true});
  state.positions=new Set(POSITIONS);renderRows();
}
function bindTool(tool){
  if(tool.dataset.bound947==='1')return;tool.dataset.bound947='1';
  tool.addEventListener('click',e=>{
    const t=e.target;
    const sort=t.closest?.('[data-ppt-sort]');if(sort){const key=sort.dataset.pptSort;if(state.sortKey===key)state.sortDir=state.sortDir==='asc'?'desc':'asc';else{state.sortKey=key;state.sortDir=key==='player'?'asc':'desc';}renderRows();return;}
    const periodBtn=t.closest?.('.nfl-ppt-periodbar-v947 [data-nfl-ppt-period]');if(periodBtn){state.period=periodBtn.dataset.nflPptPeriod||'full';state.sortKey='style';state.sortDir='desc';renderRows();return;}
    const pos=t.closest?.('[data-nfl-ppt-pos]');if(pos){const p=pos.dataset.nflPptPos;if(state.positions.has(p)&&state.positions.size>1)state.positions.delete(p);else state.positions.add(p);renderRows();return;}
    if(t.closest?.('#nflPptFilters')){state.filtersOpen=!state.filtersOpen;syncControlOptions(buildRows(snapshot));return;}
    if(t.closest?.('#nflPptGuide')){document.body.insertAdjacentHTML('beforeend',guideHtml());return;}
    if(t.closest?.('#nflPptClear')){clearFilters();return;}
    if(t.closest?.('#nflPptRefresh')){refreshTool();return;}
    const player=t.closest?.('[data-nfl-tool-player]');if(player){const row=currentRows.get(player.dataset.rowId);if(row)openPlayer(row);return;}
  });
  tool.addEventListener('change',e=>{
    const t=e.target;
    if(t.id==='nflPptMode'){state.style=BUILD_STYLES.some(x=>x[0]===t.value)?t.value:'tsoPick';state.sortKey='style';state.sortDir='desc';renderRows();return;}
    if(t.id==='nflPptGame'){state.game=t.value;renderRows();return;}
    if(t.id==='nflPptMarket'){state.market=t.value;renderRows();return;}
    if(t.id==='nflPptTeam'){state.team=t.value;renderRows();return;}
    if(t.id==='nflPptMin'){state.minProb=Number(t.value)||.40;renderRows();}
  });
  tool.addEventListener('input',e=>{if(e.target.id==='nflPptSearch'){state.search=e.target.value;renderRows();}});
}
async function refreshTool(){
  const tool=document.getElementById(TOOL_ID);if(!tool)return;
  tool.classList.add('is-refreshing');
  try{await loadSnapshot(true);renderRows();}catch(err){console.warn('[NFL Player Prop Tool v94.7] refresh failed:',err);}
  finally{tool.classList.remove('is-refreshing');}
}
function onDocumentClick(e){
  if(e.target.closest?.('[data-nfl-ppt-guide-close]')||e.target.id===GUIDE_ID){document.getElementById(GUIDE_ID)?.remove();return;}
  if(modalReturn&&e.target.closest?.('[data-nfl-close-modal],.modal-close,.ms-modal-x'))queueModalRestore();
  const nav=e.target.closest?.('#sbSportAccordion [data-nfl-preview-tab],#sbSportAccordion [data-nfl-tab],#nflSideNav [data-nfl-tab]');
  if(nav&&nav.id!==BUTTON_ID&&active)deactivate();
  if(e.target.closest?.('#sbSportAccordion'))requestAnimationFrame(installButton);
}
function onKeydown(e){if(e.key==='Escape'&&modalReturn)queueModalRestore();}
function onHashChange(){if(!String(location.hash||'').toLowerCase().startsWith('#nfl')&&active)deactivate();requestAnimationFrame(installButton);}

export function installNflPlayerPropToolV947(options={}){
  ensureStyle();if(typeof options.selectBaseTab==='function')selectBaseTab=options.selectBaseTab;installButton();
  if(installed)return;installed=true;
  document.addEventListener('click',onDocumentClick,true);
  document.addEventListener('keydown',onKeydown,true);
  window.addEventListener('hashchange',onHashChange);
  window.__TSO_NFL_PLAYER_PROP_V947__={open:openTool,refresh:refreshTool,state,buildRows:()=>snapshot?buildRows(snapshot):[]};
}
export const __NFL_PLAYER_PROP_TOOL_V947_TEST__={VERSION,HEADERS,BUILD_STYLES,PERIODS,MARKET_META,bookDomain,teamLogo,styleScore,valueFor};
