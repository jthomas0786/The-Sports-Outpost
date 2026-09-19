import { __NFL_PLAYER_PROP_TOOL_V926_TEST__ as base } from './player-prop-tool-v926.js?v=92.7';

const TOOL_ID='nflPlayerPropTool';
const STYLE_ID='nfl-player-prop-tool-build-period-v940-css';
const VERSION='94.2';
const RING_C=113.1;
const markets=base?.MARKET_META||{};
const filterState=base?.state||null;
const BUILD_STYLES=[
  ['tsoPick','TSO Pick'],
  ['safest','Safest'],
  ['bestEdge','Best Edge'],
  ['balanced','Balanced'],
  ['aggressive','Aggressive'],
  ['correlated','Correlated'],
  ['longshot','Longshot'],
];
const STYLE_COPY={
  tsoPick:'Best overall mix of 50K hit rate, sportsbook value and line quality.',
  safest:'Prioritizes the highest exact 50K hit rates at currently posted sportsbook lines.',
  bestEdge:'Prioritizes the largest 50K probability edge versus the displayed sportsbook price.',
  balanced:'Targets strong probability with a more playable sportsbook price and line.',
  aggressive:'Moves toward higher-risk sportsbook lines with more payout upside.',
  correlated:'Ranks same-game candidates by exact 50K co-hit lift, using sportsbook-backed lines.',
  longshot:'Targets plus-money sportsbook lines that still clear TSO simulation quality gates.',
};
const PERIODS=[
  ['full','Full'],['1h','1H'],['2h','2H'],['q1','Q1'],['q2','Q2'],['q3','Q3'],['q4','Q4'],
];
let installed=false;
let buildStyle='tsoPick';
let period='full';
let simCache=null;
let simPromise=null;
let patchTimers=[];
const tableSnapshots=new WeakMap();

const norm=v=>String(v||'').toLowerCase().replace(/\./g,'').replace(/['’]/g,'').replace(/\s+(jr|sr|ii|iii|iv|v)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const fmt=v=>v==null||!Number.isFinite(Number(v))?'—':Math.abs(Number(v))>=100?Math.round(Number(v)).toString():Number(v).toFixed(1).replace(/\.0$/,'');
const priceFmt=v=>v==null||!Number.isFinite(Number(v))?'—':Number(v)>0?`+${Math.round(Number(v))}`:`${Math.round(Number(v))}`;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gradeForPct=pct=>{const p=Number(pct)/100;return p>=.70?'A+':p>=.65?'A':p>=.61?'A-':p>=.57?'B+':p>=.54?'B':p>=.51?'B-':p>=.48?'C+':'C';};
const gradeColor=grade=>{const g=String(grade||'').toUpperCase();return g.startsWith('A')?'#22c55e':g.startsWith('B')?'#f4c430':g.startsWith('C')?'#ff9f43':'#8b95a8';};

function ensureStyle(){
  if(document.getElementById(STYLE_ID))return;
  const link=document.createElement('link');
  link.id=STYLE_ID;link.rel='stylesheet';link.href='./sports/nfl/player-prop-tool-build-period-v940.css?v=94.2';
  document.head.appendChild(link);
}
function formatRuns(v){const n=Number(v)||0;if(n>=1000&&n%1000===0)return`${Math.round(n/1000)}K`;return n?Intl.NumberFormat().format(n):'—';}
function probabilityHtml(prob){
  if(prob==null)return'<span class="nfl-ppt-prob empty">—</span>';
  const pct=Math.round(clamp(prob)*100),grade=gradeForPct(pct),color=gradeColor(grade),off=(RING_C*(1-pct/100)).toFixed(1);
  return `<span class="nfl-ppt-prob" style="--ring-color:${color}"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="nfl-ppt-ring-track" cx="22" cy="22" r="18"/><circle class="nfl-ppt-ring-fill" cx="22" cy="22" r="18" transform="rotate(-90 22 22)" stroke-dasharray="${RING_C}" stroke-dashoffset="${off}"/></svg><span class="nfl-ppt-ring-label"><b>${grade}</b><span>${pct}%</span></span></span>`;
}
function metricHtml(cls,value,label,tone=''){return `<div class="${cls}${tone?` ${tone}`:''}"><b>${fmt(value)}</b><span>${esc(label)}</span></div>`;}
function rangeText(dist){const lo=num(dist?.p10),hi=num(dist?.p90);return lo==null||hi==null?'—':`${fmt(lo)}–${fmt(hi)}`;}
function marketLabel(key){return markets?.[key]?.short||markets?.[key]?.label||key;}
function rowIdentity(row){
  const gameId=String(row?.dataset?.nflPptRow||'').split('|')[0]||'';
  const playerId=row?.querySelector('[data-nfl-tool-player]')?.getAttribute('data-nfl-tool-player')||'';
  const name=String(row?.querySelector('.nfl-ppt-player b')?.textContent||'').replace('↗','').trim();
  const meta=String(row?.querySelector('.nfl-ppt-player small')?.textContent||'');
  const team=(meta.match(/^\s*([A-Z0-9]+)\s+vs\s+/i)?.[1]||'').toUpperCase();
  const market=String(row?.dataset?.nflPptSimMarket||row?.dataset?.snapshotMarket||'');
  return {gameId,playerId,name,team,market};
}
function saveSnapshot(table){
  if(tableSnapshots.has(table))return tableSnapshots.get(table);
  const rows=[...table.querySelectorAll('tbody tr[data-nfl-ppt-row]')];
  const snap={
    rows:rows.map(row=>({row,html:row.innerHTML,data:{...row.dataset}})),
    heads:[...table.querySelectorAll('thead tr:nth-child(2) th')].map(th=>({text:th.textContent,sort:th.getAttribute('data-sort')})),
    groups:[...table.querySelectorAll('.nfl-ppt-groups th')].map(th=>th.textContent),
  };
  tableSnapshots.set(table,snap);return snap;
}
function restoreRowDataset(row,data){for(const key of Object.keys(row.dataset))delete row.dataset[key];Object.assign(row.dataset,data||{});}
function restoreFull(table){
  const snap=saveSnapshot(table),tbody=table.tBodies?.[0];
  for(const item of snap.rows){item.row.innerHTML=item.html;restoreRowDataset(item.row,item.data);item.row.hidden=false;tbody?.appendChild(item.row);}
  const heads=[...table.querySelectorAll('thead tr:nth-child(2) th')];
  snap.heads.forEach((h,i)=>{if(!heads[i])return;heads[i].textContent=h.text;if(h.sort)heads[i].setAttribute('data-sort',h.sort);else heads[i].removeAttribute('data-sort');});
  const groups=[...table.querySelectorAll('.nfl-ppt-groups th')];snap.groups.forEach((text,i)=>{if(groups[i])groups[i].textContent=text;});
  table.dataset.nflPptPeriod='full';return snap;
}
function filterQualifies(row,prob=null){
  if(!filterState)return true;
  const d=row.dataset,id=rowIdentity(row);
  if(filterState.positions?.size&&d.snapshotPosition&&!filterState.positions.has(d.snapshotPosition))return false;
  if(filterState.game&&filterState.game!=='ALL'&&String(filterState.game)!==String(id.gameId))return false;
  if(filterState.market&&filterState.market!=='ALL'&&String(filterState.market)!==String(d.snapshotMarket||id.market))return false;
  if(filterState.team&&filterState.team!=='ALL'&&String(filterState.team)!==String(d.snapshotTeam||id.team))return false;
  if(filterState.search&&!(d.snapshotSearch||norm(row.textContent)).includes(norm(filterState.search)))return false;
  if(prob!=null&&Number(filterState.minProb)>0&&prob<Number(filterState.minProb))return false;
  return true;
}
async function readSim(){
  if(simCache)return simCache;if(simPromise)return simPromise;
  simPromise=fetch('./slates/nfl-sim.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`nfl-sim.json ${r.status}`);return r.json();}).then(doc=>{simCache=doc;return doc;}).finally(()=>{simPromise=null;});
  return simPromise;
}
function rankedBoardCandidates(sim,boardKey,style){
  const out=[];
  for(const game of sim?.games||[]){
    const gameId=String(game?.game?.gameId||game?.gameId||'');
    const board=boardKey==='full'?game?.propStyles:game?.propPeriods?.[boardKey];
    if(!board?.candidates?.length)continue;
    const byId=new Map(board.candidates.map(c=>[String(c.id),c]));
    const ranking=board?.rankings?.[style]||board?.rankings?.tsoPick||[];
    let rank=0;
    for(const id of ranking){const c=byId.get(String(id));if(c)out.push({gameId,candidate:c,rank:rank++});}
  }
  return out;
}
function candidateIndexes(list){
  const byId=new Map(),byName=new Map();
  for(const item of list){
    const c=item.candidate,market=String(c.market||''),ids=[c.playerId,c.espnId,c.gsisId].filter(Boolean).map(String);
    for(const pid of ids){const key=`${item.gameId}|${pid}|${market}`;if(!byId.has(key))byId.set(key,item);}
    const nk=`${item.gameId}|${String(c.team||'').toUpperCase()}|${norm(c.name)}|${market}`;if(!byName.has(nk))byName.set(nk,item);
  }
  return {byId,byName};
}
function matchCandidate(index,row){
  const id=rowIdentity(row),market=id.market;if(!market)return null;
  return index.byId.get(`${id.gameId}|${id.playerId}|${market}`)||index.byName.get(`${id.gameId}|${id.team}|${norm(id.name)}|${market}`)||null;
}
function applySportsbookCandidate(row,item){
  const c=item.candidate,dist=c.projection||null,cells=[...row.children];if(cells.length<13||!dist)return false;
  const iterations=Number(c.iterations||0),prob=num(c.simProbability),edge=num(c.edge),mean=num(dist.mean),median=num(dist.median),p10=num(dist.p10),p25=num(dist.p25),p75=num(dist.p75),p90=num(dist.p90),side=String(c.side||'over').toLowerCase();
  cells[1].innerHTML=`<div class="nfl-ppt-consensus"><b>${fmt(c.line)}</b><span>${esc(marketLabel(c.market))}</span></div>`;
  cells[2].innerHTML=`<div class="nfl-ppt-pick ${side}"><small>${esc(c.book||'BEST')}</small><b>${side==='under'?'U':'O'} ${fmt(c.line)}</b><span>${priceFmt(c.price)}</span></div>`;
  cells[3].innerHTML=metricHtml('nfl-ppt-proj',mean,'SIM MEAN');cells[4].innerHTML=metricHtml('nfl-ppt-avg',median,'SIM MEDIAN');cells[5].innerHTML=probabilityHtml(prob);
  cells[6].innerHTML=`<div class="nfl-ppt-edge"><b>${edge==null?'—':`${edge>=0?'+':''}${(edge*100).toFixed(1)}%`}</b><span>SIM VS IMPLIED</span></div>`;
  cells[7].innerHTML=metricHtml('nfl-ppt-def',p10,'P10 FLOOR');cells[8].innerHTML=metricHtml('nfl-ppt-match',p25,'P25','neutral');cells[9].innerHTML=metricHtml('nfl-ppt-sim',p75,'P75');cells[10].innerHTML=metricHtml('nfl-ppt-hit',p90,'P90 CEILING','neutral');
  cells[11].innerHTML=`<div class="nfl-ppt-hit neutral"><b>${rangeText(dist)}</b><span>P10–P90</span></div>`;cells[12].innerHTML=`<div class="nfl-ppt-hit ${iterations>=50000?'good':'mid'}"><b>${formatRuns(iterations)}</b><span>SIM RUNS</span></div>`;
  row.dataset.nflPptStyleCandidate='1';row.dataset.nflPptStyleRank=String(item.rank);row.dataset.nflPptBuildStyle=buildStyle;row.dataset.nflPptPeriod='full';row.dataset.nflPptSimSource='nfl-sim';row.dataset.nflPptSimIterations=String(iterations);row.dataset.nflPptSimMarket=String(c.market||'');row.dataset.nflPptSimSide=side;
  row.dataset.snapshotProb=prob==null?'0':String(prob);row.dataset.snapshotEdge=edge==null?'-1':String(edge);row.dataset.snapshotProjection=mean==null?'':String(mean);row.dataset.snapshotL10=p90==null?'-1':String(p90);row.hidden=false;return true;
}
function applyPeriodCandidate(row,item,periodLabel){
  const c=item.candidate,dist=c.projectedPeriod||c.projectedQuarter||null,cells=[...row.children];if(cells.length<13||!dist)return false;
  const iterations=Number(c.worldMaskIterations||0),prob=num(c.simProbability),edge=num(c.modelEdge),mean=num(dist.mean),median=num(dist.median),p10=num(dist.p10),p25=num(dist.p25),p75=num(dist.p75),p90=num(dist.p90);
  cells[1].innerHTML=`<div class="nfl-ppt-consensus"><b>${fmt(c.line)}</b><span>${esc(periodLabel)} ${esc(marketLabel(c.market))}</span></div>`;
  cells[2].innerHTML=`<div class="nfl-ppt-pick over"><small>50K SIM</small><b>O ${fmt(c.line)}</b><span>MODEL</span></div>`;
  cells[3].innerHTML=metricHtml('nfl-ppt-proj',mean,'SIM MEAN');cells[4].innerHTML=metricHtml('nfl-ppt-avg',median,'SIM MEDIAN');cells[5].innerHTML=probabilityHtml(prob);cells[6].innerHTML=`<div class="nfl-ppt-edge"><b>${edge==null?'—':`${edge>=0?'+':''}${edge.toFixed(2)}σ`}</b><span>SIM EDGE</span></div>`;
  cells[7].innerHTML=metricHtml('nfl-ppt-def',p10,'P10 FLOOR');cells[8].innerHTML=metricHtml('nfl-ppt-match',p25,'P25','neutral');cells[9].innerHTML=metricHtml('nfl-ppt-sim',p75,'P75');cells[10].innerHTML=metricHtml('nfl-ppt-hit',p90,'P90 CEILING','neutral');cells[11].innerHTML=`<div class="nfl-ppt-hit neutral"><b>${rangeText(dist)}</b><span>P10–P90</span></div>`;cells[12].innerHTML=`<div class="nfl-ppt-hit ${iterations>=50000?'good':'mid'}"><b>${formatRuns(iterations)}</b><span>SIM RUNS</span></div>`;
  row.dataset.nflPptPeriodCandidate='1';row.dataset.nflPptPeriodRank=String(item.rank);row.dataset.nflPptPeriod=period;row.dataset.nflPptSimMarket=String(c.market||'');row.dataset.nflPptSimSide='over';row.dataset.snapshotProb=prob==null?'0':String(prob);row.dataset.snapshotEdge=edge==null?'-1':String(edge);row.dataset.snapshotProjection=mean==null?'':String(mean);row.hidden=false;return true;
}
function patchPeriodHeaders(table,label){
  const heads=[...table.querySelectorAll('thead tr:nth-child(2) th')],labels=['PLAYER','TSO LINE','SIM LEAN','SIM MEAN','SIM MED','SIM PROB','SIM EDGE','P10','P25','P75','P90','RANGE','RUNS'];heads.forEach((th,i)=>{if(labels[i])th.textContent=labels[i];if(i!==0)th.removeAttribute('data-sort');});
  const groups=[...table.querySelectorAll('.nfl-ppt-groups th')];if(groups[1])groups[1].textContent=`${label} · 50K SIM PROJECTION + VALUE`;if(groups[2])groups[2].textContent='SIM DISTRIBUTION';if(groups[3])groups[3].textContent='SIM RANGE + SAMPLE';
}
async function applyFullBuild(table){
  const snap=restoreFull(table),sim=await readSim();if(!table.isConnected)return false;
  const list=rankedBoardCandidates(sim,'full',buildStyle),index=candidateIndexes(list),tbody=table.tBodies?.[0],matched=[];
  for(const item of snap.rows){
    const row=item.row,candidate=matchCandidate(index,row),prob=num(candidate?.candidate?.simProbability);
    if(candidate&&filterQualifies(row,prob)&&applySportsbookCandidate(row,candidate))matched.push({row,rank:candidate.rank});else row.hidden=true;
  }
  matched.sort((a,b)=>a.rank-b.rank);for(const item of matched)tbody?.appendChild(item.row);for(const item of snap.rows.filter(x=>x.row.hidden))tbody?.appendChild(item.row);
  const tool=table.closest(`#${TOOL_ID}`);if(tool){tool.dataset.nflPptBuildStyle=buildStyle;tool.dataset.nflPptPeriod='full';tool.dataset.nflPptOddsStyleBoard=list.length?'ready':'preparing';}
  setPeriodStatus(tool,matched.length?`Full · ${BUILD_STYLES.find(x=>x[0]===buildStyle)?.[1]||'TSO Pick'} · real sportsbook lines · ${formatRuns(sim?.meta?.pregameIterations||50000)} worlds`:'Full-game sportsbook style board is preparing');updateCount(tool);return matched.length>0;
}
async function applyPeriodBuild(table){
  const snap=restoreFull(table),sim=await readSim();if(!table.isConnected||period==='full')return applyFullBuild(table);
  const label=PERIODS.find(x=>x[0]===period)?.[1]||period.toUpperCase(),list=rankedBoardCandidates(sim,period,buildStyle),index=candidateIndexes(list),tbody=table.tBodies?.[0],matched=[];
  for(const item of snap.rows){const row=item.row,candidate=matchCandidate(index,row),prob=num(candidate?.candidate?.simProbability);if(candidate&&filterQualifies(row,prob)&&applyPeriodCandidate(row,candidate,label))matched.push({row,rank:candidate.rank});else row.hidden=true;}
  matched.sort((a,b)=>a.rank-b.rank);for(const item of matched)tbody?.appendChild(item.row);for(const item of snap.rows.filter(x=>x.row.hidden))tbody?.appendChild(item.row);patchPeriodHeaders(table,label);table.dataset.nflPptPeriod=period;
  const tool=table.closest(`#${TOOL_ID}`);if(tool){tool.dataset.nflPptBuildStyle=buildStyle;tool.dataset.nflPptPeriod=period;}setPeriodStatus(tool,matched.length?`${label} · ${formatRuns(sim?.meta?.pregameIterations||50000)} worlds`:`${label} simulation props are preparing`);updateCount(tool);return matched.length>0;
}
function updateCount(tool){if(!tool)return;const rows=[...tool.querySelectorAll('tbody tr[data-nfl-ppt-row]')],count=tool.querySelector('.nfl-ppt-head-stat b');if(count)count.textContent=String(rows.filter(r=>!r.hidden).length);}
function setPeriodStatus(tool,text=''){const el=tool?.querySelector('.nfl-ppt-period-status-v940');if(el)el.textContent=text;}
function controlsHtml(){return `<div class="nfl-ppt-periodbar-v940" data-nfl-ppt-periodbar="${VERSION}"><span class="nfl-ppt-period-label-v940">Period</span><div class="nfl-ppt-period-segments-v940" role="group" aria-label="Prop period">${PERIODS.map(([value,label])=>`<button type="button" data-nfl-ppt-period="${value}" class="${period===value?'active':''}" aria-pressed="${period===value?'true':'false'}">${label}</button>`).join('')}</div><span class="nfl-ppt-period-status-v940"></span></div>`;}
function patchBetStyleSelect(tool){
  const select=tool.querySelector('#nflPptMode');if(!select)return false;
  const current=[...select.options].map(o=>o.value).join('|'),wanted=BUILD_STYLES.map(x=>x[0]).join('|');
  if(select.dataset.nflPptBuildStyle!==VERSION||current!==wanted){select.innerHTML=BUILD_STYLES.map(([value,label])=>`<option value="${value}">${label}</option>`).join('');select.dataset.nflPptBuildStyle=VERSION;}
  select.value=buildStyle;select.setAttribute('aria-label','Bet Style');select.title=STYLE_COPY[buildStyle]||'';
  const label=select.closest('label'),span=label?.querySelector(':scope > span');if(span)span.textContent='Bet Style';
  if(label)label.title=STYLE_COPY[buildStyle]||'';
  return true;
}
function patchPeriodBar(tool){let bar=tool.querySelector('.nfl-ppt-periodbar-v940');if(!bar){const toolbar=tool.querySelector('.nfl-ppt-toolbar');if(!toolbar)return false;toolbar.insertAdjacentHTML('afterend',controlsHtml());bar=tool.querySelector('.nfl-ppt-periodbar-v940');}for(const button of bar.querySelectorAll('[data-nfl-ppt-period]')){const active=button.dataset.nflPptPeriod===period;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active?'true':'false');}return true;}
async function applyCurrent(){
  const tool=document.getElementById(TOOL_ID),table=tool?.querySelector('.nfl-ppt-table');if(!tool||!table||table.dataset.nflPptSimV939!=='93.9')return false;saveSnapshot(table);tool.dataset.nflPptBuildStyle=buildStyle;tool.dataset.nflPptPeriod=period;return period==='full'?applyFullBuild(table):applyPeriodBuild(table);
}
function patchTool(){
  const tool=document.getElementById(TOOL_ID),table=tool?.querySelector('.nfl-ppt-table');if(!tool||!table)return false;patchBetStyleSelect(tool);patchPeriodBar(tool);
  if(table.dataset.nflPptSimV939!=='93.9'){window.__TSO_NFL_PROP_SIM_V939__?.applyIfReady?.();return false;}
  applyCurrent().catch(err=>{console.warn('[NFL Player Prop Tool v94.2] bet-style/period view unavailable:',err);setPeriodStatus(tool,'Bet Style data unavailable');});return true;
}
function clearPatchTimers(){for(const id of patchTimers)clearTimeout(id);patchTimers=[];}
function schedulePatch(){clearPatchTimers();for(const delay of [0,40,100,220,450,800,1400,2400]){const id=setTimeout(()=>{if(patchTool())clearPatchTimers();},delay);patchTimers.push(id);}}
function onChangeCapture(event){
  const target=event.target;
  if(target?.id==='nflPptMode'&&target?.dataset?.nflPptBuildStyle===VERSION){event.stopImmediatePropagation();buildStyle=BUILD_STYLES.some(x=>x[0]===target.value)?target.value:'tsoPick';target.title=STYLE_COPY[buildStyle]||'';applyCurrent();return;}
  if(target?.closest?.(`#${TOOL_ID}`))setTimeout(schedulePatch,0);
}
function onClickCapture(event){
  const periodButton=event.target.closest?.(`#${TOOL_ID} [data-nfl-ppt-period]`);if(periodButton){period=PERIODS.some(x=>x[0]===periodButton.dataset.nflPptPeriod)?periodButton.dataset.nflPptPeriod:'full';const tool=document.getElementById(TOOL_ID);patchPeriodBar(tool);applyCurrent();return;}
  if(event.target.closest?.(`#${TOOL_ID} #nflPptRefresh`)){simCache=null;simPromise=null;tableSnapshots.delete(document.querySelector(`#${TOOL_ID} .nfl-ppt-table`));schedulePatch();return;}
  if(event.target.closest?.(`#${TOOL_ID}`))setTimeout(schedulePatch,0);
}
function onInputCapture(event){if(event.target.closest?.(`#${TOOL_ID}`))setTimeout(schedulePatch,0);}

export function installNflPlayerPropToolBuildPeriodV940(){
  if(installed||typeof document==='undefined')return;installed=true;ensureStyle();document.addEventListener('change',onChangeCapture,true);document.addEventListener('click',onClickCapture,true);document.addEventListener('input',onInputCapture,true);schedulePatch();
}

export const __NFL_PLAYER_PROP_TOOL_BUILD_PERIOD_V940_TEST__={BUILD_STYLES,STYLE_COPY,PERIODS,rankedBoardCandidates,candidateIndexes,marketLabel,filterQualifies};
