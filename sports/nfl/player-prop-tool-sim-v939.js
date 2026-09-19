import { __NFL_PLAYER_PROP_TOOL_V926_TEST__ as base } from './player-prop-tool-v926.js?v=92.7';

const TOOL_ID='nflPlayerPropTool';
const GUIDE_ID='nflPlayerPropGuide';
const VERSION='93.9';
const RING_C=113.1;
const markets=base?.MARKET_META||{};
const state=base?.state;
let installed=false;
let applyPromise=null;
let applyTable=null;

const norm=v=>String(v||'').toLowerCase().replace(/\./g,'').replace(/['’]/g,'').replace(/\s+(jr|sr|ii|iii|iv|v)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const team=v=>String(v||'').toUpperCase();
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const fmt=v=>v==null||!Number.isFinite(Number(v))?'—':Math.abs(Number(v))>=100?Math.round(Number(v)).toString():Number(v).toFixed(1).replace(/\.0$/,'');
const priceFmt=v=>v==null||!Number.isFinite(Number(v))?'—':Number(v)>0?`+${Math.round(Number(v))}`:`${Math.round(Number(v))}`;
const impliedFromAmerican=v=>{const p=num(v);if(p==null||p===0)return null;return p>0?100/(p+100):(-p)/((-p)+100);};
const gradeForPct=pct=>{const p=Number(pct)/100;return p>=.70?'A+':p>=.65?'A':p>=.61?'A-':p>=.57?'B+':p>=.54?'B':p>=.51?'B-':p>=.48?'C+':'C';};
const gradeColor=grade=>{const g=String(grade||'').toUpperCase();return g.startsWith('A')?'#22c55e':g.startsWith('B')?'#f4c430':g.startsWith('C')?'#ff9f43':'#8b95a8';};

function marketKeyForLabel(label){
  const needle=norm(label);
  for(const [key,meta] of Object.entries(markets)){
    if(needle===norm(meta?.short)||needle===norm(meta?.label))return key;
  }
  return '';
}
function buildSimIndex(sim){
  const games=new Map();
  for(const g of sim?.games||[]){
    const players=new Map();
    for(const p of g?.players||[]){
      for(const id of [p?.playerId,p?.gsisId,p?.espnId])if(id)players.set(`id:${id}`,p);
      players.set(`name:${team(p?.team)}|${norm(p?.name)}`,p);
    }
    games.set(String(g?.game?.gameId||g?.gameId||''),{entry:g,players});
  }
  return games;
}
function buildOddsIndex(odds){
  const games=new Map();
  for(const g of odds?.games||[]){
    const players=new Map();
    for(const p of g?.players||[]){
      if(p?.playerId)players.set(`id:${p.playerId}`,p);
      players.set(`name:${team(p?.team)}|${norm(p?.name)}`,p);
      players.set(`name:|${norm(p?.name)}`,p);
    }
    games.set(String(g?.gameId||g?.fixtureId||g?.matchKey||''),{entry:g,players});
  }
  return games;
}
function rowIdentity(row){
  const id=String(row?.dataset?.nflPptRow||'');
  const gameId=id.split('|')[0]||'';
  const playerId=row?.querySelector('[data-nfl-tool-player]')?.getAttribute('data-nfl-tool-player')||'';
  const name=String(row?.querySelector('.nfl-ppt-player b')?.textContent||'').replace('↗','').trim();
  const meta=String(row?.querySelector('.nfl-ppt-player small')?.textContent||'');
  const tm=(meta.match(/^\s*([A-Z0-9]+)\s+vs\s+/i)?.[1]||'').toUpperCase();
  const market=marketKeyForLabel(row?.querySelector('.nfl-ppt-consensus span')?.textContent||'');
  return {gameId,playerId,name,team:tm,market};
}
function matchIndexedPlayer(game,identity){
  if(!game)return null;
  if(identity.playerId&&game.players.has(`id:${identity.playerId}`))return game.players.get(`id:${identity.playerId}`);
  return game.players.get(`name:${identity.team}|${norm(identity.name)}`)||game.players.get(`name:|${norm(identity.name)}`)||null;
}
function distributionFor(player,market){
  const stat=markets?.[market]?.stat||market;
  return player?.distributions?.[stat]||null;
}
function simProbability(player,market,line,side){
  if(!player||!market||!side)return null;
  if(market==='atd')return side==='over'?num(player?.probabilities?.atd):null;
  const bucket=side==='over'?player?.sportsbook?.over?.[market]:player?.sportsbook?.under?.[market];
  if(!bucket)return null;
  const simLine=num(bucket.line);
  if(simLine!=null&&line!=null&&Math.abs(simLine-line)>.02)return null;
  return num(bucket.probability);
}
function chooseSide(player,market,line){
  if(market==='atd')return simProbability(player,market,line,'over')==null?null:'over';
  const over=simProbability(player,market,line,'over');
  const under=simProbability(player,market,line,'under');
  if(over==null&&under==null)return null;
  if(under!=null&&(over==null||under>over))return'under';
  return'over';
}
function exactOffer(oddsPlayer,market,side){
  const om=oddsPlayer?.odds?.[market];
  if(!om)return null;
  if(market==='atd')return {line:.5,offer:om.best||null};
  return {line:num(om.line),offer:om?.[side]?.best||null};
}
function formatRuns(v){
  const n=Number(v)||0;
  if(n>=1000&&n%1000===0)return`${Math.round(n/1000)}K`;
  return n?Intl.NumberFormat().format(n):'—';
}
function metricHtml(cls,value,label,tone=''){
  return `<div class="${cls}${tone?` ${tone}`:''}"><b>${fmt(value)}</b><span>${label}</span></div>`;
}
function probabilityHtml(prob){
  if(prob==null)return'<span class="nfl-ppt-prob empty">—</span>';
  const pct=Math.round(clamp(prob)*100),grade=gradeForPct(pct),color=gradeColor(grade),off=(RING_C*(1-pct/100)).toFixed(1);
  return `<span class="nfl-ppt-prob" style="--ring-color:${color}"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="nfl-ppt-ring-track" cx="22" cy="22" r="18"/><circle class="nfl-ppt-ring-fill" cx="22" cy="22" r="18" transform="rotate(-90 22 22)" stroke-dasharray="${RING_C}" stroke-dashoffset="${off}"/></svg><span class="nfl-ppt-ring-label"><b>${grade}</b><span>${pct}%</span></span></span>`;
}
function simRange(dist){
  const lo=num(dist?.p10),hi=num(dist?.p90);
  return lo==null||hi==null?'—':`${fmt(lo)}–${fmt(hi)}`;
}
function setPendingRow(row){
  const cells=[...row.children];
  if(cells.length<13)return;
  cells[2].innerHTML='<div class="nfl-ppt-pick"><small>SIM</small><b>PENDING</b><span>—</span></div>';
  cells[3].innerHTML=metricHtml('nfl-ppt-proj',null,'SIM MEAN');
  cells[4].innerHTML=metricHtml('nfl-ppt-avg',null,'SIM MEDIAN');
  cells[5].innerHTML=probabilityHtml(null);
  cells[6].innerHTML='<div class="nfl-ppt-edge"><b>—</b><span>SIM VS IMPLIED</span></div>';
  cells[7].innerHTML=metricHtml('nfl-ppt-def',null,'P10 FLOOR');
  cells[8].innerHTML=metricHtml('nfl-ppt-match',null,'P25','neutral');
  cells[9].innerHTML=metricHtml('nfl-ppt-sim',null,'P75');
  cells[10].innerHTML=metricHtml('nfl-ppt-hit',null,'P90 CEILING','neutral');
  cells[11].innerHTML='<div class="nfl-ppt-hit neutral"><b>—</b><span>P10–P90</span></div>';
  cells[12].innerHTML='<div class="nfl-ppt-hit neutral"><b>—</b><span>SIM RUNS</span></div>';
  row.dataset.nflPptSimSource='pending';
  row.dataset.nflPptSimIterations='0';
  row.dataset.snapshotProb='0';
  row.dataset.snapshotEdge='-1';
  row.dataset.snapshotProjection='';
  row.dataset.snapshotL10='-1';
}
function applyRow(row,simGame,oddsGame){
  const identity=rowIdentity(row),sp=matchIndexedPlayer(simGame,identity),op=matchIndexedPlayer(oddsGame,identity);
  const cells=[...row.children];
  if(cells.length<13||!identity.market||!sp||!op){setPendingRow(row);return false;}
  const currentLine=num(op?.odds?.[identity.market]?.line)??(identity.market==='atd'?.5:null);
  const side=chooseSide(sp,identity.market,currentLine);
  if(!side){setPendingRow(row);return false;}
  const exact=exactOffer(op,identity.market,side),line=num(exact?.line),price=num(exact?.offer?.price);
  const prob=simProbability(sp,identity.market,line,side),dist=distributionFor(sp,identity.market);
  if(prob==null||!dist){setPendingRow(row);return false;}
  const implied=impliedFromAmerican(price),edge=implied==null?null:prob-implied,iterations=Number(simGame?.entry?.iterations)||0;
  const mean=num(dist.mean),median=num(dist.median),p10=num(dist.p10),p25=num(dist.p25),p75=num(dist.p75),p90=num(dist.p90);

  const pick=identity.market==='atd'?op?.odds?.[identity.market]?.best:op?.odds?.[identity.market]?.[side]?.best;
  cells[1].querySelector('b')&&(cells[1].querySelector('b').textContent=fmt(line));
  cells[2].innerHTML=`<div class="nfl-ppt-pick ${side}"><small>${String(pick?.book||'BEST')}</small><b>${side==='over'?'O':'U'} ${fmt(line)}</b><span>${priceFmt(price)}</span></div>`;
  cells[3].innerHTML=metricHtml('nfl-ppt-proj',mean,'SIM MEAN');
  cells[4].innerHTML=metricHtml('nfl-ppt-avg',median,'SIM MEDIAN');
  cells[5].innerHTML=probabilityHtml(prob);
  cells[6].innerHTML=`<div class="nfl-ppt-edge"><b>${edge==null?'—':`${edge>=0?'+':''}${(edge*100).toFixed(1)}%`}</b><span>SIM VS IMPLIED</span></div>`;
  cells[7].innerHTML=metricHtml('nfl-ppt-def',p10,'P10 FLOOR');
  cells[8].innerHTML=metricHtml('nfl-ppt-match',p25,'P25','neutral');
  cells[9].innerHTML=metricHtml('nfl-ppt-sim',p75,'P75');
  cells[10].innerHTML=metricHtml('nfl-ppt-hit',p90,'P90 CEILING','neutral');
  cells[11].innerHTML=`<div class="nfl-ppt-hit neutral"><b>${simRange(dist)}</b><span>P10–P90</span></div>`;
  cells[12].innerHTML=`<div class="nfl-ppt-hit ${iterations>=50000?'good':'mid'}"><b>${formatRuns(iterations)}</b><span>SIM RUNS</span></div>`;

  row.dataset.nflPptSimSource='nfl-sim';
  row.dataset.nflPptSimIterations=String(iterations);
  row.dataset.nflPptSimMarket=identity.market;
  row.dataset.nflPptSimSide=side;
  row.dataset.snapshotProb=String(prob);
  row.dataset.snapshotEdge=edge==null?'-1':String(edge);
  row.dataset.snapshotProjection=mean==null?'':String(mean);
  row.dataset.snapshotL10=p90==null?'-1':String(p90);
  return true;
}
function patchHeaders(tool,sim){
  const groups=[...tool.querySelectorAll('.nfl-ppt-groups th')];
  if(groups[1])groups[1].textContent='50K SIM PROJECTION + VALUE';
  if(groups[2])groups[2].textContent='SIM DISTRIBUTION';
  if(groups[3])groups[3].textContent='SIM RANGE + SAMPLE';
  const heads=[...tool.querySelectorAll('.nfl-ppt-table thead tr:nth-child(2) th')];
  const labels=['PLAYER','CONSENSUS','PICK','SIM MEAN','SIM MED','SIM PROB','SIM EDGE','P10','P25','P75','P90','RANGE','RUNS'];
  heads.forEach((th,i)=>{if(labels[i])th.textContent=labels[i];if(![0,3,5,6].includes(i))th.removeAttribute('data-sort');});
  if(heads[0])heads[0].dataset.sort='name';
  if(heads[3])heads[3].dataset.sort='projection';
  if(heads[5])heads[5].dataset.sort='prob';
  if(heads[6])heads[6].dataset.sort='edge';
  const min=tool.querySelector('#nflPptMin');
  const minLabel=min?.closest('label');
  if(minLabel){for(const node of minLabel.childNodes){if(node.nodeType===Node.TEXT_NODE&&String(node.textContent||'').trim())node.textContent='Min Sim Prob';}}
  const badge=tool.querySelector('.nfl-ppt-snapshot-badge');
  const pregame=Number(sim?.meta?.pregameIterations)||50000;
  if(badge)badge.textContent=`${formatRuns(pregame)} SIM SNAPSHOT · REFRESH TO UPDATE`;
  const p=tool.querySelector('.nfl-ppt-head p');
  if(p&&!p.querySelector('.nfl-ppt-sim-authority-note')){
    const note=document.createElement('span');note.className='nfl-ppt-sim-authority-note';note.textContent=` · ${Intl.NumberFormat().format(pregame)}-simulation metrics`;p.append(note);
  }
}
function patchGuide(){
  const guide=document.getElementById(GUIDE_ID);
  const grid=guide?.querySelector('.nfl-ppt-guide-grid');
  if(!grid)return false;
  grid.innerHTML='<div><b>Consensus</b><p>Current sportsbook line. This is the comparison target, not a model input shown as a projection.</p></div><div><b>Pick</b><p>The Over/Under side with the higher exact-line simulation hit probability, paired with the best available price.</p></div><div><b>Sim Mean / Median</b><p>Mean and median outcomes from the game simulation distribution. No research-average projection fallback is used.</p></div><div><b>Sim Prob</b><p>Share of simulation outcomes that clear the exact current sportsbook line on the selected side.</p></div><div><b>Sim Edge</b><p>Simulation hit probability minus the implied probability of the displayed sportsbook price.</p></div><div><b>P10 / P25 / P75 / P90</b><p>Simulation distribution percentiles, showing downside floor through upside ceiling.</p></div><div><b>Range</b><p>The P10–P90 simulation interval for that player and prop.</p></div><div><b>Runs</b><p>Actual number of simulations behind that row. Pregame rows are expected to show 50K.</p></div>';
  const small=guide.querySelector('small');
  if(small)small.textContent='All model-derived values in this tool come from nfl-sim.json. Historical L5/L10/H2H and defensive-average fallbacks are not used for projection, probability, edge, or distribution stats.';
  return true;
}
function updateVisibleCount(tool){
  const rows=[...tool.querySelectorAll('tbody tr[data-nfl-ppt-row]')];
  if(state?.mode==='picks'){
    for(const row of rows){
      const p=Number(row.dataset.snapshotProb),e=Number(row.dataset.snapshotEdge);
      const sim=row.dataset.nflPptSimSource==='nfl-sim';
      if(!sim||!Number.isFinite(p)||!Number.isFinite(e)||p<Number(state.minProb||0)||e<0)row.hidden=true;
    }
  }
  const visible=rows.filter(row=>!row.hidden).length;
  const count=tool.querySelector('.nfl-ppt-head-stat b');
  if(count)count.textContent=String(visible);
}
async function readCachedJson(path){
  const r=await fetch(path,{cache:'no-store'});
  if(!r.ok)throw new Error(`${path} ${r.status}`);
  return r.json();
}
async function applyToTable(tool,table){
  const [sim,odds]=await Promise.all([readCachedJson('./slates/nfl-sim.json'),readCachedJson('./slates/nfl-odds.json')]);
  if(document.getElementById(TOOL_ID)!==tool||tool.querySelector('.nfl-ppt-table')!==table||tool.dataset.nflPptSnapshot!=='ready')return false;
  const simIndex=buildSimIndex(sim),oddsIndex=buildOddsIndex(odds);
  let matched=0;
  for(const row of table.querySelectorAll('tbody tr[data-nfl-ppt-row]')){
    const gameId=String(row.dataset.nflPptRow||'').split('|')[0]||'';
    if(applyRow(row,simIndex.get(gameId),oddsIndex.get(gameId)))matched++;
  }
  patchHeaders(tool,sim);
  updateVisibleCount(tool);
  table.dataset.nflPptSimV939=VERSION;
  tool.dataset.nflPptSimAuthority='nfl-sim';
  tool.dataset.nflPptSimRows=String(matched);
  tool.dataset.nflPptSimPregameIterations=String(Number(sim?.meta?.pregameIterations)||0);
  return true;
}
function applyIfReady(){
  const tool=document.getElementById(TOOL_ID),table=tool?.querySelector('.nfl-ppt-table');
  if(!tool||!table||tool.dataset.nflPptSnapshot!=='ready')return false;
  if(table.dataset.nflPptSimV939===VERSION)return true;
  if(applyPromise&&applyTable===table)return false;
  applyTable=table;
  applyPromise=applyToTable(tool,table).catch(err=>{console.warn('[NFL Player Prop Tool v93.9] simulation authority unavailable:',err);return false;}).finally(()=>{applyPromise=null;applyTable=null;});
  return false;
}
function onDocumentClick(event){
  if(event.target.closest?.(`#${TOOL_ID} #nflPptGuide`))queueMicrotask(patchGuide);
}

export function installNflPlayerPropToolSimV939(){
  if(typeof window==='undefined'||installed)return;
  installed=true;
  window.__TSO_NFL_PROP_SIM_V939__={applyIfReady,patchGuide};
  document.addEventListener('click',onDocumentClick,false);
}

export const __NFL_PLAYER_PROP_TOOL_SIM_V939_TEST__={marketKeyForLabel,buildSimIndex,buildOddsIndex,distributionFor,simProbability,chooseSide,formatRuns,impliedFromAmerican};
