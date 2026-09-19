const STYLE_ID='nfl-player-prop-tool-v923-css';
const PERF_STYLE_ID='nfl-player-prop-tool-v926-css';
const TOOL_ID='nflPlayerPropTool';
const BUTTON_ID='nflPlayerPropToolBtn';
const STASH_ID='nflPlayerPropToolBaseStash';
const GUIDE_ID='nflPlayerPropGuide';
const CACHE_MS=45000;
const PAGE_SIZE=5000;
const RING_C=113.1;
const MARKET_META={
  rushYds:{label:'Rush Yds',short:'Rush Yds',stat:'rushYds',positions:['QB','RB','WR']},
  recYds:{label:'Receiving Yds',short:'Rec Yds',stat:'recYds',positions:['RB','WR','TE']},
  receptions:{label:'Receptions',short:'Recs',stat:'receptions',positions:['RB','WR','TE']},
  passYds:{label:'Passing Yds',short:'Pass Yds',stat:'passYds',positions:['QB']},
  passTds:{label:'Passing TDs',short:'Pass TDs',stat:'passTds',positions:['QB']},
  completions:{label:'Completions',short:'Comps',stat:'completions',positions:['QB']},
  atd:{label:'Anytime TD',short:'ATD',stat:'tds',positions:['QB','RB','WR','TE'],binary:true}
};
const POSITIONS=['QB','RB','WR','TE'];
const state={mode:'picks',game:'ALL',market:'ALL',team:'ALL',search:'',sort:'edge',sortDir:'desc',positions:new Set(POSITIONS),color:true,minProb:0.52,filtersOpen:false};
let installed=false,active=false,baseSelectTab=null,cache=null,cacheAt=0,renderToken=0,rowCache=null,rowCacheSource=null,renderLimit=PAGE_SIZE,searchTimer=null,restoreTimer=null;
let currentRows=new Map();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').toLowerCase().replace(/\./g,'').replace(/['’]/g,'').replace(/\s+(jr|sr|ii|iii|iv|v)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const team=v=>String(v||'').toUpperCase();
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const ordinal=n=>{n=Number(n)||0;const s=['th','st','nd','rd'],v=n%100;return `${n}${s[(v-20)%10]||s[v]||s[0]}`;};
const fmt=v=>v==null||!Number.isFinite(Number(v))?'—':Math.abs(Number(v))>=100?Math.round(Number(v)).toString():Number(v).toFixed(1).replace(/\.0$/,'');
const priceFmt=v=>v==null||!Number.isFinite(Number(v))?'—':Number(v)>0?`+${Math.round(Number(v))}`:`${Math.round(Number(v))}`;
const impliedFromAmerican=v=>{const p=num(v);if(p==null||p===0)return null;return p>0?100/(p+100):(-p)/((-p)+100);};
const kickoff=iso=>{const d=new Date(iso||0);return Number.isFinite(d.getTime())?d.toLocaleString([],{weekday:'short',hour:'numeric',minute:'2-digit'}):'TBD';};
const cssEscape=v=>globalThis.CSS?.escape?CSS.escape(String(v)):String(v).replace(/["\\]/g,'\\$&');
const gradeForPct=pct=>{const p=Number(pct)/100;return p>=.70?'A+':p>=.65?'A':p>=.61?'A-':p>=.57?'B+':p>=.54?'B':p>=.51?'B-':p>=.48?'C+':'C';};
const gradeColor=grade=>{const g=String(grade||'').toUpperCase();return g.startsWith('A')?'#22c55e':g.startsWith('B')?'#f4c430':g.startsWith('C')?'#ff9f43':'#8b95a8';};

function ensureStyle(){
  if(!document.getElementById(STYLE_ID)){
    const l=document.createElement('link');l.id=STYLE_ID;l.rel='stylesheet';l.href='./sports/nfl/player-prop-tool-v923.css?v=92.3';document.head.appendChild(l);
  }
  if(!document.getElementById(PERF_STYLE_ID)){
    const l=document.createElement('link');l.id=PERF_STYLE_ID;l.rel='stylesheet';l.href='./sports/nfl/player-prop-tool-v926.css?v=92.6';document.head.appendChild(l);
  }
}
async function getJson(path){const r=await fetch(`${path}?v=92.6-${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`${path} ${r.status}`);return r.json();}
async function loadDocs(force=false){
  if(!force&&cache&&Date.now()-cacheAt<CACHE_MS)return cache;
  const [slate,odds,sim,research]=await Promise.all([
    getJson('./slates/nfl.json'),getJson('./slates/nfl-odds.json').catch(()=>({games:[],meta:{}})),getJson('./slates/nfl-sim.json').catch(()=>({games:[]})),getJson('./slates/nfl-research.json').catch(()=>({players:[]}))
  ]);
  cache={slate,odds,sim,research};cacheAt=Date.now();rowCache=null;rowCacheSource=null;return cache;
}
function findResearch(index,p){return index.byEspn.get(String(p.espnId||''))||index.byGsis.get(String(p.gsisId||''))||index.byTeamName.get(`${team(p.team)}|${norm(p.name)}`)||null;}
function buildResearchIndex(research){const byEspn=new Map(),byGsis=new Map(),byTeamName=new Map();for(const p of research?.players||[]){if(p.espnId)byEspn.set(String(p.espnId),p);if(p.gsisId)byGsis.set(String(p.gsisId),p);byTeamName.set(`${team(p.team)}|${norm(p.name)}`,p);}return{byEspn,byGsis,byTeamName};}
function buildOddsIndex(odds){const games=new Map();for(const g of odds?.games||[]){const players=new Map();for(const p of g.players||[]){if(p.playerId)players.set(`id:${p.playerId}`,p);players.set(`name:${team(p.team)}|${norm(p.name)}`,p);players.set(`name:|${norm(p.name)}`,p);}games.set(String(g.gameId||g.fixtureId||g.matchKey),{g,players});games.set(`${team(g.away)}-${team(g.home)}`,{g,players});}return games;}
function buildSimIndex(sim){const games=new Map();for(const g of sim?.games||[]){const players=new Map();for(const p of g.players||[]){for(const id of [p.espnId,p.gsisId,p.playerId])if(id)players.set(`id:${id}`,p);players.set(`name:${team(p.team)}|${norm(p.name)}`,p);}games.set(String(g?.game?.gameId||g?.gameId||''),{g,players});}return games;}
function researchLogs(r){return Array.isArray(r?.gameLog)&&r.gameLog.length?r.gameLog:(r?.last5?.gamesLog||[]);}
function statValue(log,key){if(!log)return null;if(key==='tds')return num(log.tds??((num(log.rushTds)||0)+(num(log.recTds)||0)));return num(log[key]);}
function recentAverage(logs,key,n=10){const vals=(logs||[]).slice(0,n).map(x=>statValue(x,key)).filter(v=>v!=null);return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;}
function hitRate(logs,key,line,side,n=5){const rows=(logs||[]).slice(0,n),usable=rows.map(x=>statValue(x,key)).filter(v=>v!=null);if(!usable.length)return null;const hits=usable.filter(v=>side==='over'?v>line:v<line).length;return{hits,total:usable.length};}
function h2hRate(logs,key,line,side,opp){const usable=(logs||[]).filter(x=>team(x.opponent)===team(opp)).map(x=>statValue(x,key)).filter(v=>v!=null).slice(0,10);if(!usable.length)return null;const hits=usable.filter(v=>side==='over'?v>line:v<line).length;return{hits,total:usable.length};}
function rateText(v){return v?`${v.hits}/${v.total}`:'—';}
function rateTone(v){if(!v||!v.total)return'neutral';const p=v.hits/v.total;return p>=.7?'good':p<=.3?'bad':'mid';}
function fallbackProjection(r,key){return num(r?.currentSeason?.perGame?.[key]??r?.last5?.avg?.[key]??r?.previousSeason?.perGame?.[key]);}
function simProbability(sp,key,line,side){if(!sp)return null;if(key==='atd')return side==='over'?num(sp?.probabilities?.atd):null;const bucket=side==='over'?sp?.sportsbook?.over?.[key]:sp?.sportsbook?.under?.[key];if(!bucket)return null;const simLine=num(bucket.line);if(simLine!=null&&line!=null&&Math.abs(simLine-line)>.02)return null;return num(bucket.probability);}
function matchOddsPlayer(og,p){if(!og)return null;for(const id of [p.espnId,p.gsisId]){if(id&&og.players.has(`id:${id}`))return og.players.get(`id:${id}`);}return og.players.get(`name:${team(p.team)}|${norm(p.name)}`)||og.players.get(`name:|${norm(p.name)}`)||null;}
function matchSimPlayer(sg,p){if(!sg)return null;for(const id of [p.espnId,p.gsisId]){if(id&&sg.players.has(`id:${id}`))return sg.players.get(`id:${id}`);}return sg.players.get(`name:${team(p.team)}|${norm(p.name)}`)||null;}
function defenseRankMap(research,marketKey){const meta=MARKET_META[marketKey];if(!meta)return new Map();const byKey=new Map();for(const p of research?.players||[]){const m=p?.matchup,pg=m?.previousSeasonAllowed?.perGame,pos=String(m?.positionGroup||p.position||'').toUpperCase();const v=num(pg?.[meta.stat]);if(!m?.opponent||!pos||v==null)continue;byKey.set(`${team(m.opponent)}|${pos}`,v);}const grouped=new Map();for(const [k,v]of byKey){const pos=k.split('|')[1];if(!grouped.has(pos))grouped.set(pos,[]);grouped.get(pos).push({k,v});}const out=new Map();for(const arr of grouped.values()){arr.sort((a,b)=>a.v-b.v);arr.forEach((x,i)=>out.set(x.k,{rank:i+1,total:arr.length,value:x.v}));}return out;}
function matchupLabel(rank,total){if(!rank||!total)return{label:'NO DATA',tone:'neutral'};const pct=(rank-1)/Math.max(1,total-1);if(pct<=.22)return{label:'POOR',tone:'bad'};if(pct<=.48)return{label:'FAIR',tone:'mid'};if(pct<=.75)return{label:'GOOD',tone:'good'};return{label:'GREAT',tone:'great'};}
function buildRows(docs){
  const rIndex=buildResearchIndex(docs.research),oIndex=buildOddsIndex(docs.odds),sIndex=buildSimIndex(docs.sim),rankCache=new Map();const rows=[];
  for(const g of docs.slate?.games||[]){
    if(g.status&&g.status!=='pre')continue;
    const og=oIndex.get(String(g.gameId))||oIndex.get(`${team(g.away?.abbr)}-${team(g.home?.abbr)}`),sg=sIndex.get(String(g.gameId));
    for(const p of g.players||[]){
      if(!POSITIONS.includes(String(p.position||'').toUpperCase()))continue;
      const op=matchOddsPlayer(og,p);if(!op?.odds)continue;const sp=matchSimPlayer(sg,p),r=findResearch(rIndex,p),logs=researchLogs(r);
      for(const [key,meta] of Object.entries(MARKET_META)){
        const om=op.odds?.[key];if(!om)continue;
        if(meta.positions&&!meta.positions.includes(String(p.position||'').toUpperCase()))continue;
        const line=key==='atd'?0.5:num(om.line);if(line==null)continue;
        const proj=key==='atd'?num(sp?.probabilities?.atd):num(sp?.distributions?.[key]?.mean)??fallbackProjection(r,meta.stat);
        const overProb=simProbability(sp,key,line,'over'),underProb=simProbability(sp,key,line,'under');
        let side='over',prob=overProb;
        if(key!=='atd'&&underProb!=null&&(overProb==null||underProb>overProb)){side='under';prob=underProb;}
        if(prob==null&&proj!=null&&key!=='atd')side=proj>=line?'over':'under';
        const offer=key==='atd'?om.best:om?.[side]?.best,price=num(offer?.price),implied=impliedFromAmerican(price),edge=prob!=null&&implied!=null?prob-implied:null;
        const rankMap=rankCache.get(key)||defenseRankMap(docs.research,key);rankCache.set(key,rankMap);
        const pos=String(p.position||'').toUpperCase(),def=rankMap.get(`${team(p.opponent)}|${pos}`)||null,matchup=matchupLabel(def?.rank,def?.total);
        const l5=hitRate(logs,meta.stat,line,side,5),l10=hitRate(logs,meta.stat,line,side,10),h2h=h2hRate(logs,meta.stat,line,side,p.opponent),l10Avg=recentAverage(logs,meta.stat,10);
        rows.push({id:`${g.gameId}|${p.gsisId||p.espnId||p.name}|${key}`,gameId:String(g.gameId),game:`${g.away?.abbr} @ ${g.home?.abbr}`,kickoff:g.startTimeUTC,playerId:String(p.gsisId||p.espnId||p.name),espnId:p.espnId||null,gsisId:p.gsisId||null,name:p.name,team:team(p.team),opp:team(p.opponent),position:pos,headshot:p.headshot||'',market:key,marketLabel:meta.short,line,side,book:offer?.book||'',price,proj,prob,edge,l10Avg,l5,l10,h2h,defRank:def?.rank||null,defTotal:def?.total||null,defValue:def?.value??null,matchup:matchup.label,matchupTone:matchup.tone});
      }
    }
  }
  return rows;
}
function rowsForDocs(docs,force=false){if(force||rowCacheSource!==docs||!rowCache){rowCache=buildRows(docs);rowCacheSource=docs;}return rowCache;}
function qualify(row){if(!state.positions.has(row.position))return false;if(state.game!=='ALL'&&row.gameId!==state.game)return false;if(state.market!=='ALL'&&row.market!==state.market)return false;if(state.team!=='ALL'&&row.team!==state.team)return false;if(state.search){const q=norm(state.search);if(!norm(`${row.name} ${row.team} ${row.opp} ${row.position} ${row.marketLabel} ${row.game}`).includes(q))return false;}if(state.mode==='picks'){if(row.prob!=null&&row.prob<state.minProb)return false;if(row.edge!=null&&row.edge<0)return false;}return true;}
function sortRows(rows){const mul=state.sortDir==='asc'?1:-1;return [...rows].sort((a,b)=>{let av,bv;if(state.sort==='name'){av=a.name;bv=b.name;return av.localeCompare(bv)*mul;}if(state.sort==='prob'){av=a.prob??-1;bv=b.prob??-1;}else if(state.sort==='projection'){av=a.proj??-1;bv=b.proj??-1;}else if(state.sort==='def'){av=a.defRank??999;bv=b.defRank??999;}else if(state.sort==='l10'){av=a.l10?.total?a.l10.hits/a.l10.total:-1;bv=b.l10?.total?b.l10.hits/b.l10.total:-1;}else{av=a.edge??-999;bv=b.edge??-999;}return((av??0)-(bv??0))*mul||a.name.localeCompare(b.name);});}
function probRing(prob){if(prob==null)return'<span class="nfl-ppt-prob empty">—</span>';const pct=Math.round(clamp(prob)*100),grade=gradeForPct(pct),color=gradeColor(grade),off=(RING_C*(1-pct/100)).toFixed(1);return`<span class="nfl-ppt-prob" style="--ring-color:${color}"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="nfl-ppt-ring-track" cx="22" cy="22" r="18"/><circle class="nfl-ppt-ring-fill" cx="22" cy="22" r="18" transform="rotate(-90 22 22)" stroke-dasharray="${RING_C}" stroke-dashoffset="${off}"/></svg><span class="nfl-ppt-ring-label"><b>${grade}</b><span>${pct}%</span></span></span>`;}
function sideLabel(row){return row.side==='over'?'O':'U';}
function pickCell(row){return`<div class="nfl-ppt-pick ${row.side}"><small>${esc(row.book||'BEST')}</small><b>${sideLabel(row)} ${fmt(row.line)}</b><span>${priceFmt(row.price)}</span></div>`;}
function matchupCell(row){return`<div class="nfl-ppt-match ${row.matchupTone}"><b>${esc(row.matchup)}</b><span>${esc(row.position)} vs ${esc(row.opp)} DEF</span></div>`;}
function rateCell(rate,side){return`<div class="nfl-ppt-hit ${rateTone(rate)}"><b>${rateText(rate)}</b><span>${esc(side==='over'?'Over Hit':'Under Hit')}</span></div>`;}
function rowHtml(row){const edge=row.edge==null?'—':`${row.edge>=0?'+':''}${(row.edge*100).toFixed(1)}%`,rank=row.defRank?ordinal(row.defRank):'—';return`<tr data-nfl-ppt-row="${esc(row.id)}">
  <td class="nfl-ppt-player-sticky"><button type="button" class="nfl-ppt-player" data-nfl-tool-player="${esc(row.playerId)}" data-name="${esc(row.name)}"><span class="nfl-ppt-avatar">${row.headshot?`<img src="${esc(row.headshot)}" alt="" loading="lazy" decoding="async" width="34" height="34">`:`<i>${esc(row.name.split(/\s+/).map(x=>x[0]).slice(0,2).join(''))}</i>`}</span><span><b>${esc(row.name)} ↗</b><small>${esc(row.team)} vs ${esc(row.opp)} · ${esc(kickoff(row.kickoff))}</small></span></button></td>
  <td><div class="nfl-ppt-consensus"><b>${fmt(row.line)}</b><span>${esc(row.marketLabel)}</span></div></td>
  <td>${pickCell(row)}</td>
  <td><div class="nfl-ppt-proj"><b>${fmt(row.proj)}</b><span>${row.proj==null?'Projection pending':esc(row.proj>row.line?'Over':'Under')}</span></div></td>
  <td><div class="nfl-ppt-avg"><b>${fmt(row.l10Avg)}</b><span>${esc(row.marketLabel)}</span></div></td>
  <td>${probRing(row.prob)}</td>
  <td><div class="nfl-ppt-edge"><b>${edge}</b><span>vs implied</span></div></td>
  <td><div class="nfl-ppt-def"><b>${rank}</b><span>${row.defValue==null?'vs Prop':`${fmt(row.defValue)} allowed`}</span></div></td>
  <td>${matchupCell(row)}</td>
  <td><div class="nfl-ppt-sim"><b>${row.prob==null?'—':`${Math.round(row.prob*10)}/10`}</b><span>${esc(row.side==='over'?'Over Lean':'Under Lean')}</span></div></td>
  <td>${rateCell(row.l5,row.side)}</td><td>${rateCell(row.l10,row.side)}</td><td>${rateCell(row.h2h,row.side)}</td>
</tr>`;}
function controlsHtml(docs,rows){const games=[...new Map((docs.slate?.games||[]).filter(g=>!g.status||g.status==='pre').map(g=>[String(g.gameId),g])).values()],teams=[...new Set(rows.map(r=>r.team))].sort();return`<div class="nfl-ppt-toolbar">
  <div class="nfl-ppt-selects"><label><span>View</span><select id="nflPptMode"><option value="picks" ${state.mode==='picks'?'selected':''}>TSO Picks</option><option value="all" ${state.mode==='all'?'selected':''}>All Props</option></select></label><label><span>Game</span><select id="nflPptGame"><option value="ALL">All Games</option>${games.map(g=>`<option value="${esc(g.gameId)}" ${state.game===String(g.gameId)?'selected':''}>${esc(g.away?.abbr)} @ ${esc(g.home?.abbr)}</option>`).join('')}</select></label><label><span>Week</span><select id="nflPptWeek"><option>Week ${esc(docs.slate?.week||'—')}</option></select></label></div>
  <div class="nfl-ppt-positions">${POSITIONS.map(p=>`<button type="button" data-nfl-ppt-pos="${p}" class="${state.positions.has(p)?'active':''}">${p}</button>`).join('')}</div>
  <div class="nfl-ppt-actions"><button type="button" id="nflPptGuide">Quick Guide</button><button type="button" id="nflPptColor" class="toggle ${state.color?'on':''}"><span>Color Cells</span><i></i></button><button type="button" id="nflPptFilters">Filters ⚙</button><button type="button" id="nflPptRefresh">Refresh ↻</button></div>
</div><div class="nfl-ppt-filter-panel" id="nflPptFilterPanel" ${state.filtersOpen?'':'hidden'}><label>Search<input id="nflPptSearch" type="search" value="${esc(state.search)}" placeholder="Player, team, matchup…"></label><label>Market<select id="nflPptMarket"><option value="ALL">All Markets</option>${Object.entries(MARKET_META).map(([k,m])=>`<option value="${k}" ${state.market===k?'selected':''}>${esc(m.label)}</option>`).join('')}</select></label><label>Team<select id="nflPptTeam"><option value="ALL">All Teams</option>${teams.map(t=>`<option value="${t}" ${state.team===t?'selected':''}>${t}</option>`).join('')}</select></label><label>Min Model Prob<select id="nflPptMin"><option value="0.50" ${state.minProb===.5?'selected':''}>50%</option><option value="0.52" ${state.minProb===.52?'selected':''}>52%</option><option value="0.55" ${state.minProb===.55?'selected':''}>55%</option><option value="0.60" ${state.minProb===.6?'selected':''}>60%</option></select></label><button type="button" id="nflPptClear">Clear Filters</button></div>`;}
function headerHtml(docs,rows,visible){const updated=docs.odds?.meta?.fetchedAt||docs.sim?.generatedAt||docs.slate?.generatedAt;return`<header class="nfl-ppt-head"><div><span>THE SPORTS OUTPOST · NFL</span><h1>PLAYER PROP TOOL</h1><p>Best NFL props · Week ${esc(docs.slate?.week||'—')} · ${updated?`data updated ${esc(new Date(updated).toLocaleString())}`:'live data'}</p></div><div class="nfl-ppt-head-stat"><b>${visible}</b><span>matching of ${rows.length} live prop rows</span></div></header>`;}
function tableHtml(rows){const page=rows.slice(0,renderLimit);const more=Math.max(0,rows.length-page.length);return`<div class="nfl-ppt-table-wrap"><table class="nfl-ppt-table"><colgroup><col><col><col><col><col><col><col><col><col><col><col><col><col></colgroup><thead><tr class="nfl-ppt-groups"><th colspan="3"></th><th colspan="4">PROJECTIONS + VALUE</th><th colspan="3">TSO INSIGHTS + DATA</th><th colspan="3">HIT RATES</th></tr><tr><th data-sort="name">PLAYER</th><th>CONSENSUS</th><th>PICK</th><th data-sort="projection">PROJ</th><th>L10 AVG</th><th data-sort="prob">MODEL PROB</th><th data-sort="edge">EDGE</th><th data-sort="def">DEF VS PROP</th><th>MATCHUP</th><th>SIM DEF</th><th>L5</th><th data-sort="l10">L10</th><th>H2H</th></tr></thead><tbody>${page.map(rowHtml).join('')}</tbody></table>${rows.length?'':'<div class="nfl-ppt-empty">No player props match these filters right now.</div>'}${more?`<div class="nfl-ppt-more"><button type="button" id="nflPptMore">Show ${Math.min(PAGE_SIZE,more)} more</button><span>Showing ${page.length} of ${rows.length}</span></div>`:''}</div>`;}
function guideHtml(){return`<div class="nfl-ppt-guide-backdrop" id="${GUIDE_ID}"><section class="nfl-ppt-guide"><button type="button" data-nfl-ppt-guide-close>×</button><span>QUICK GUIDE</span><h2>How to read the Player Prop Tool</h2><div class="nfl-ppt-guide-grid"><div><b>Consensus</b><p>Current main sportsbook line from the NFL odds feed.</p></div><div><b>Pick</b><p>The model-preferred side plus the best currently available price/book.</p></div><div><b>Projection</b><p>TSO simulation mean, with research averages as a fallback.</p></div><div><b>Model Prob</b><p>Probability of the selected side at the current line.</p></div><div><b>Edge</b><p>Model probability minus the implied probability of the listed sportsbook price.</p></div><div><b>DEF vs Prop</b><p>Previous-season opponent allowance rank by the player’s position and stat.</p></div><div><b>Matchup</b><p>POOR → GREAT based on how much that defense allowed to the position group.</p></div><div><b>L5 / L10 / H2H</b><p>Historical hit counts at today’s line and selected Over/Under side.</p></div></div><small>TSO data is informational. Sportsbook lines can move; always verify the current number before using a pick.</small></section></div>`;}
function syncNav(){document.querySelectorAll('#sbSportAccordion .sb-sub-item,[data-nfl-tab],[data-nfl-preview-tab]').forEach(b=>b.classList.toggle('is-active',b.id===BUTTON_ID));document.getElementById(BUTTON_ID)?.classList.add('is-active');}
function installButton(){const host=document.getElementById('sbSportAccordion');if(!host)return;let btn=document.getElementById(BUTTON_ID);if(btn)return;const anchor=host.querySelector('[data-nfl-preview-tab="props"]')||host.querySelector('[data-nfl-tab="props"]');if(!anchor)return;btn=document.createElement('button');btn.id=BUTTON_ID;btn.type='button';btn.className='sb-sub-item nfl-player-prop-tool-trigger';btn.textContent='Player Prop Tool';btn.dataset.nflPropTool='1';btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openTool();});anchor.insertAdjacentElement('afterend',btn);}
function proxyFor(row,stash){if(!stash)return null;for(const id of [row.gsisId,row.espnId,row.playerId]){if(!id)continue;const el=stash.querySelector(`[data-nfl-player="${cssEscape(id)}"]`);if(el)return el;}return[...stash.querySelectorAll('[data-nfl-player]')].find(el=>norm(el.querySelector('b')?.textContent||el.textContent).includes(norm(row.name)))||null;}
function openExistingPlayerModal(row){const stash=document.getElementById(STASH_ID),proxy=proxyFor(row,stash);if(proxy){proxy.click();return true;}return false;}
function modalIsOpen(){return !!document.querySelector('#nflView [data-nfl-close-modal],#nflView .tso-nfl-player-card-v70,#nflView .tso-nfl-player-card-v72,#nflView .ms-modal');}
function scheduleToolRestore(){clearTimeout(restoreTimer);const tryRestore=()=>{if(!active||document.getElementById(TOOL_ID)||modalIsOpen())return;mountToolShell();};restoreTimer=setTimeout(tryRestore,120);setTimeout(tryRestore,320);setTimeout(tryRestore,700);}
function mountToolShell(){const root=document.getElementById('nflView');if(!root||root.querySelector(`#${TOOL_ID}`))return false;const stash=document.createElement('div');stash.id=STASH_ID;stash.hidden=true;while(root.firstChild)stash.appendChild(root.firstChild);const tool=document.createElement('section');tool.id=TOOL_ID;tool.className=`nfl-player-prop-tool ${state.color?'':'ppt-color-off'}`;tool.innerHTML='<div class="nfl-ppt-loading"><b>Loading Player Prop Tool…</b><span>Joining slate, sportsbook, simulation and player research data.</span></div>';root.append(stash,tool);bindToolEvents(tool);syncNav();renderTool();return true;}
async function renderTool(force=false){const tool=document.getElementById(TOOL_ID);if(!tool)return;const token=++renderToken;try{const docs=await loadDocs(force);if(token!==renderToken||!active)return;const all=rowsForDocs(docs,force),visible=sortRows(all.filter(qualify));currentRows=new Map(all.map(r=>[r.id,r]));tool.classList.toggle('ppt-color-off',!state.color);tool.innerHTML=headerHtml(docs,all,visible.length)+controlsHtml(docs,all)+tableHtml(visible);}catch(err){tool.innerHTML=`<div class="nfl-ppt-error"><b>Player Prop Tool could not load.</b><span>${esc(err?.message||err)}</span><button type="button" id="nflPptRetry">Retry</button></div>`;}}
function resetLimit(){renderLimit=PAGE_SIZE;}
function bindToolEvents(tool){
  if(tool.dataset.bound926==='1')return;tool.dataset.bound926='1';
  tool.addEventListener('click',e=>{
    const t=e.target;
    if(t.closest?.('#nflPptRetry')){resetLimit();renderTool(true);return;}
    if(t.closest?.('#nflPptFilters')){state.filtersOpen=!state.filtersOpen;const panel=tool.querySelector('#nflPptFilterPanel');if(panel)panel.hidden=!state.filtersOpen;return;}
    if(t.closest?.('#nflPptGuide')){document.body.insertAdjacentHTML('beforeend',guideHtml());return;}
    if(t.closest?.('#nflPptColor')){state.color=!state.color;tool.classList.toggle('ppt-color-off',!state.color);t.closest('#nflPptColor')?.classList.toggle('on',state.color);return;}
    if(t.closest?.('#nflPptRefresh')){resetLimit();renderTool(true);return;}
    if(t.closest?.('#nflPptClear')){Object.assign(state,{game:'ALL',market:'ALL',team:'ALL',search:'',mode:'picks',sort:'edge',sortDir:'desc',minProb:.52,filtersOpen:true});state.positions=new Set(POSITIONS);resetLimit();renderTool();return;}
    const pos=t.closest?.('[data-nfl-ppt-pos]');if(pos){const p=pos.dataset.nflPptPos;if(state.positions.has(p)&&state.positions.size>1)state.positions.delete(p);else state.positions.add(p);resetLimit();renderTool();return;}
    const th=t.closest?.('th[data-sort]');if(th){const k=th.dataset.sort;if(state.sort===k)state.sortDir=state.sortDir==='asc'?'desc':'asc';else{state.sort=k;state.sortDir=k==='name'?'asc':'desc';}resetLimit();renderTool();return;}
    if(t.closest?.('#nflPptMore')){renderLimit+=PAGE_SIZE;renderTool();return;}
    const player=t.closest?.('[data-nfl-tool-player]');if(player){const id=player.closest('tr')?.dataset.nflPptRow,row=currentRows.get(id);if(row&&!openExistingPlayerModal(row)){player.classList.add('nfl-ppt-player-missing');setTimeout(()=>player.classList.remove('nfl-ppt-player-missing'),900);}return;}
  });
  tool.addEventListener('change',e=>{const t=e.target;if(t.id==='nflPptMode')state.mode=t.value;else if(t.id==='nflPptGame')state.game=t.value;else if(t.id==='nflPptMarket')state.market=t.value;else if(t.id==='nflPptTeam')state.team=t.value;else if(t.id==='nflPptMin')state.minProb=Number(t.value)||.52;else return;resetLimit();renderTool();});
  tool.addEventListener('input',e=>{const t=e.target;if(t.id!=='nflPptSearch')return;state.search=t.value;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{resetLimit();renderTool();},140);});
}
async function openTool(){if(active&&document.getElementById(TOOL_ID))return;active=true;try{baseSelectTab?.('players');}catch{}await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));mountToolShell();}
function deactivate(){active=false;renderToken++;clearTimeout(searchTimer);document.getElementById(GUIDE_ID)?.remove();}
function onDocumentClick(e){
  if(e.target.closest?.('[data-nfl-ppt-guide-close]')||e.target.id===GUIDE_ID){document.getElementById(GUIDE_ID)?.remove();return;}
  if(e.target.closest?.('[data-nfl-close-modal]')&&active){scheduleToolRestore();return;}
  const btn=e.target.closest?.('#sbSportAccordion [data-nfl-preview-tab],#sbSportAccordion [data-nfl-tab],#nflSideNav [data-nfl-tab]');if(btn&&btn.id!==BUTTON_ID)deactivate();
  if(e.target.closest?.('#sbSportAccordion'))setTimeout(installButton,0);
}
function onHashChange(){if(!String(location.hash||'').toLowerCase().startsWith('#nfl'))deactivate();setTimeout(installButton,0);}
export function installNflPlayerPropToolV926(options={}){ensureStyle();if(typeof options.selectBaseTab==='function')baseSelectTab=options.selectBaseTab;installButton();if(!installed){installed=true;document.addEventListener('click',onDocumentClick,true);window.addEventListener('hashchange',onHashChange);}}
export const __NFL_PLAYER_PROP_TOOL_V926_TEST__={MARKET_META,hitRate,h2hRate,recentAverage,impliedFromAmerican,matchupLabel,buildRows,state,PAGE_SIZE};
