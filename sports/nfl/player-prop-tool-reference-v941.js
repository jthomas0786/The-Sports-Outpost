const TOOL_ID='nflPlayerPropTool';
const VERSION='94.1';
const RING_C=113.1;
const HEADERS=['PLAYER','CONSENSUS','PICK','PROJ','L10 AVG','COV PROB','EDGE','DEF VS PROP','MATCHUP','SIM DEF','L5','L10','H2H'];
const GROUPS=['','PROJECTIONS + VALUE','TSO INSIGHTS + DATA','HIT RATES'];
const RETRIES=[0,45,120,260,520,900,1500,2400];
let installed=false;
let timers=[];

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const fmt=v=>v==null||!Number.isFinite(Number(v))?'—':Math.abs(Number(v))>=100?Math.round(Number(v)).toString():Number(v).toFixed(1).replace(/\.0$/,'');
const ordinal=n=>{n=Math.max(1,Math.min(32,Math.round(Number(n)||32)));const v=n%100,s=['th','st','nd','rd'];return `${n}${s[(v-20)%10]||s[v]||s[0]}`;};
const gradeForPct=pct=>{const p=Number(pct)/100;return p>=.70?'A+':p>=.65?'A':p>=.61?'A-':p>=.57?'B+':p>=.54?'B':p>=.51?'B-':p>=.48?'C+':'C';};
const gradeColor=grade=>{const g=String(grade||'').toUpperCase();return g.startsWith('A')?'#22c55e':g.startsWith('B')?'#f4c430':g.startsWith('C')?'#ff9f43':'#8b95a8';};

function ring(prob){
  if(prob==null)return'<span class="nfl-ppt-prob empty">—</span>';
  const pct=Math.round(clamp(prob)*100),grade=gradeForPct(pct),color=gradeColor(grade),off=(RING_C*(1-pct/100)).toFixed(1);
  return `<span class="nfl-ppt-prob" style="--ring-color:${color}" title="${pct}% of 50,000 simulated worlds cover this side"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="nfl-ppt-ring-track" cx="22" cy="22" r="18"/><circle class="nfl-ppt-ring-fill" cx="22" cy="22" r="18" transform="rotate(-90 22 22)" stroke-dasharray="${RING_C}" stroke-dashoffset="${off}"/></svg><span class="nfl-ppt-ring-label"><b>${grade}</b><span>${pct}%</span></span></span>`;
}
function rate(prob,total){
  const p=clamp(prob),hits=Math.max(0,Math.min(total,Math.round(p*total)));
  return {hits,total,p};
}
function rateTone(r){return r.p>=.70?'good':r.p<=.40?'bad':'mid';}
function rateCell(prob,total,side){
  const r=rate(prob,total),label=side==='under'?'Under Hit':'Over Hit';
  return `<div class="nfl-ppt-hit ${rateTone(r)}" title="Equivalent hit count derived from the exact 50K simulation cover probability"><b>${r.hits}/${r.total}</b><span>${label}</span></div>`;
}
function simDefCell(prob,side){
  const r=rate(prob,10),label=side==='under'?'Under Hit':'Over Hit';
  return `<div class="nfl-ppt-sim" title="10-bin display of the exact 50K simulation cover probability"><b>${r.hits}/10</b><span>${label}</span></div>`;
}
function marketLabel(row){return String(row.querySelector('.nfl-ppt-consensus span')?.textContent||row.dataset.nflPptSimMarket||'PROP').trim();}
function rowMeta(row){
  const text=String(row.querySelector('.nfl-ppt-player small')?.textContent||'');
  const m=text.match(/^\s*([A-Z0-9]+)\s+vs\s+([A-Z0-9]+)/i);
  return {team:(m?.[1]||'').toUpperCase(),opp:(m?.[2]||'DEF').toUpperCase()};
}
function selectedSide(row){
  if(row.dataset.nflPptPeriodCandidate==='1')return String(row.dataset.nflPptPeriodSide||'over').toLowerCase();
  return String(row.dataset.nflPptSimSide||'over').toLowerCase();
}
function captureMetrics(row){
  const cells=[...row.children];
  const projection=num(row.dataset.snapshotProjection)??num(cells[3]?.querySelector('b')?.textContent);
  const median=num(cells[4]?.querySelector('b')?.textContent)??projection;
  const prob=num(row.dataset.snapshotProb);
  const rawEdge=num(row.dataset.snapshotEdge);
  const period=row.dataset.nflPptPeriodCandidate==='1'||String(row.dataset.nflPptPeriod||'full')!=='full';
  const edge=period&&prob!=null?prob-.5:rawEdge;
  return {projection,median,prob,edge,side:selectedSide(row),market:row.dataset.nflPptSimMarket||marketLabel(row),label:marketLabel(row),period};
}
function positionFor(row,market){
  const explicit=String(row.dataset.nflPptPosition||'').toUpperCase();
  if(explicit)return explicit;
  const key=String(market||'').toLowerCase();
  if(key.includes('pass')||key.includes('completion'))return'QB';
  return'OFF';
}
function matchupTone(rank){return rank<=8?['GREAT','great']:rank<=16?['GOOD','good']:rank<=24?['FAIR','mid']:['POOR','bad'];}
function offenseScore(metrics){return metrics.side==='under'?1-clamp(metrics.prob):clamp(metrics.prob);}
function scaledRanks(rows){
  const groups=new Map();
  for(const row of rows){
    const m=row.__tsoV941;
    if(!m||m.prob==null)continue;
    const key=String(m.market||'PROP');
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(row);
  }
  const out=new Map();
  for(const group of groups.values()){
    group.sort((a,b)=>offenseScore(b.__tsoV941)-offenseScore(a.__tsoV941)||String(a.dataset.nflPptRow||'').localeCompare(String(b.dataset.nflPptRow||'')));
    const n=group.length;
    group.forEach((row,i)=>{
      const rank=n<=1?16:Math.max(1,Math.min(32,Math.round(1+(i*31)/(n-1))));
      out.set(row,rank);
    });
  }
  return out;
}
function patchHeaders(tool){
  const heads=[...tool.querySelectorAll('.nfl-ppt-table thead tr:nth-child(2) th')];
  heads.forEach((th,i)=>{if(HEADERS[i])th.textContent=HEADERS[i];});
  const groups=[...tool.querySelectorAll('.nfl-ppt-groups th')];
  groups.forEach((th,i)=>{if(GROUPS[i]!=null)th.textContent=GROUPS[i];});
}
function patchGuide(){
  const guide=document.getElementById('nflPlayerPropGuide');
  const grid=guide?.querySelector('.nfl-ppt-guide-grid');
  if(!grid)return false;
  grid.innerHTML='<div><b>Consensus</b><p>Current sportsbook line for Full. Period views use the TSO simulation threshold because a comparable sportsbook period line is not always published.</p></div><div><b>Pick</b><p>The side favored by the 50,000-run simulation at the displayed line.</p></div><div><b>Proj / L10 Avg</b><p>Projection and central-value columns are generated from the 50K simulation distribution. L10 Avg is a simulation display category here, not a historical last-10 average.</p></div><div><b>Cov Prob</b><p>Exact share of the 50,000 simulated worlds in which the selected side covers the displayed line.</p></div><div><b>Edge</b><p>For Full, simulation cover probability minus sportsbook implied probability. Period views show simulation advantage over a neutral 50% baseline.</p></div><div><b>DEF vs Prop / Matchup</b><p>Simulation-only matchup rank and grade, derived from how the 50K worlds perform against the prop line. No historical defense-rank fallback is used.</p></div><div><b>Sim Def / L5 / L10 / H2H</b><p>Compact equivalent-hit displays calculated from the exact 50K cover probability. They are simulation analogs for the reference layout, not historical game-log counts.</p></div><div><b>50K Authority</b><p>All model-derived values on this table trace back to the same 50,000 pregame simulation worlds.</p></div>';
  const small=guide.querySelector('small');
  if(small)small.textContent='TSO simulation categories are informational. L5/L10/H2H labels on this table are simulation equivalents, not claims about historical game samples.';
  return true;
}
function patchRows(tool){
  const rows=[...tool.querySelectorAll('tbody tr[data-nfl-ppt-row]')];
  for(const row of rows)row.__tsoV941=captureMetrics(row);
  const ranks=scaledRanks(rows);
  for(const row of rows){
    const cells=[...row.children],m=row.__tsoV941;
    if(cells.length<13||!m||m.prob==null)continue;
    const meta=rowMeta(row),rank=ranks.get(row)||16,[matchLabel,tone]=matchupTone(rank),pos=positionFor(row,m.market);
    const edge=m.edge==null?'—':`${m.edge>=0?'+':''}${(m.edge*100).toFixed(1)}%`;
    cells[3].innerHTML=`<div class="nfl-ppt-proj"><b>${fmt(m.projection)}</b><span>${m.side==='under'?'Under':'Over'}</span></div>`;
    cells[4].innerHTML=`<div class="nfl-ppt-avg" title="Simulation central value from 50,000 worlds"><b>${fmt(m.median)}</b><span>${m.label||'50K SIM'}</span></div>`;
    cells[5].innerHTML=ring(m.prob);
    cells[6].innerHTML=`<div class="nfl-ppt-edge"><b>${edge}</b><span>${m.period?'SIM VS 50%':'SIM VS IMPLIED'}</span></div>`;
    cells[7].innerHTML=`<div class="nfl-ppt-def" title="Relative simulation matchup rank for this prop market"><b>${ordinal(rank)}</b><span>SIM vs Prop</span></div>`;
    cells[8].innerHTML=`<div class="nfl-ppt-match ${tone}" title="50K simulation matchup grade"><b>${matchLabel}</b><span>${pos} vs ${meta.opp} Def</span></div>`;
    cells[9].innerHTML=simDefCell(m.prob,m.side);
    cells[10].innerHTML=rateCell(m.prob,5,m.side);
    cells[11].innerHTML=rateCell(m.prob,10,m.side);
    cells[12].innerHTML=rateCell(m.prob,1,m.side);
    row.dataset.nflPptReferenceV941=VERSION;
    row.dataset.nflPptReferenceRank=String(rank);
  }
}
function applyReference(){
  const tool=document.getElementById(TOOL_ID),table=tool?.querySelector('.nfl-ppt-table');
  if(!tool||!table||tool.dataset.nflPptSnapshot!=='ready')return false;
  patchHeaders(tool);patchRows(tool);patchGuide();
  tool.dataset.nflPptReferenceLayout=VERSION;
  table.dataset.nflPptReferenceV941=VERSION;
  return true;
}
function triggerV940(){
  const tool=document.getElementById(TOOL_ID);
  if(!tool)return false;
  tool.dispatchEvent(new Event('input',{bubbles:true}));
  return true;
}
function schedule(){
  for(const id of timers)clearTimeout(id);timers=[];
  for(const ms of RETRIES){
    timers.push(setTimeout(()=>{triggerV940();setTimeout(applyReference,0);},ms));
  }
}
function onClick(event){
  const opener=event.target.closest?.('#nflPlayerPropToolBtn');
  if(opener){schedule();return;}
  const inside=event.target.closest?.(`#${TOOL_ID}`);
  if(!inside)return;
  if(event.target.closest?.('[data-nfl-ppt-period],#nflPptRefresh,#nflPptGuide,[data-sort],#nflPptClear,#nflPptMore'))setTimeout(applyReference,35);
}
function onChange(event){
  if(!event.target.closest?.(`#${TOOL_ID}`))return;
  setTimeout(applyReference,35);
}
function onInput(event){
  if(!event.target.closest?.(`#${TOOL_ID}`))return;
  setTimeout(applyReference,170);
}

export function installNflPlayerPropToolReferenceV941(){
  if(typeof window==='undefined'||installed)return;
  installed=true;
  window.__TSO_NFL_PROP_REFERENCE_V941__={applyReference,patchHeaders,patchRows,patchGuide,HEADERS,GROUPS};
  document.addEventListener('click',onClick,true);
  document.addEventListener('change',onChange,true);
  document.addEventListener('input',onInput,true);
  schedule();
}

export const __NFL_PLAYER_PROP_TOOL_REFERENCE_V941_TEST__={HEADERS,GROUPS,rate,rateTone,offenseScore,matchupTone};
