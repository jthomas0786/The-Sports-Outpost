import {
  optimizeHalftimeParlay, marketLabel, formatAmerican
} from './halftime-optimizer.js?v=88';

let pollTimer=null;
let currentDoc=null;
let currentContext=null;
let generated=null;
let history=new Set();
let uiState={legCount:4,maxGames:2,mode:'tsoPick',selected:new Set()};

const MODE_COPY={
  tsoPick:['TSO Pick','Best overall mix of hit rate, edge and correlation.'],
  safest:['Safest','Highest simulated joint hit probability.'],
  bestEdge:['Best Edge','Largest TSO advantage versus market-implied probability.'],
  balanced:['Balanced','Balances probability, edge and payout.'],
  longshot:['Longshot','Higher payout while staying inside TSO quality gates.'],
  correlated:['Correlated','Actively rewards positive same-game simulation correlation.'],
};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=(v,d=1)=>Number.isFinite(Number(v))?`${(Number(v)*100).toFixed(d)}%`:'—';
const fmtLine=v=>Number.isInteger(Number(v))?String(Number(v)):Number(v).toFixed(1);
export function isHalftimeGameState(g){
  if(!g) return false;
  const status=String(g.status||g.liveScore?.status||'').toLowerCase();
  if(status!=='in' && status!=='live') return false;
  const detail=`${g.statusDetail||''} ${g.detail||''} ${g.liveScore?.statusDetail||''}`.toLowerCase();
  if(/half\s*time|halftime|end of (?:the )?2nd|end of second/.test(detail)) return true;
  const period=Number(g.liveScore?.period ?? g.period);
  const clock=Number(g.liveScore?.clockMin ?? g.clockMin);
  return period===2 && Number.isFinite(clock) && clock<=0.05;
}
const isHalf=b=>/half/i.test(String(b?.state?.statusDetail||'')) || (Number(b?.state?.period)===2&&Number(b?.state?.clockMin)<=.05);
const readyBoards=doc=>(doc?.games||[]).filter(b=>isHalf(b)&&b.ready&&Array.isArray(b.candidates)&&b.candidates.length>=2);
const halfBoards=doc=>(doc?.games||[]).filter(isHalf);
function boardForGame(doc,g){
  const gid=String(g?.id||g?.gameId||'');
  return readyBoards(doc).find(b=>String(b?.gameId||'')===gid)||null;
}

export function halftimeBannerHTML(doc,liveGames=[]){
  const half=halfBoards(doc),ready=readyBoards(doc),liveHalf=(liveGames||[]).filter(isHalftimeGameState);
  if(!half.length&&!liveHalf.length)return '';
  if(ready.length){
    const candidates=ready.reduce((n,b)=>n+(b.candidates?.length||0),0);
    return `<section class="tso-ht-banner"><div class="tso-ht-bolt">⚡</div><div class="tso-ht-banner-copy"><b>TSO Halftime Parlay Lab</b><span><strong>${ready.length} halftime game${ready.length===1?'':'s'} ready</strong> · 50,000 live simulations · ${candidates} qualified prop candidates</span></div><button type="button" data-nfl-halftime-open>Build Parlay</button></section>`;
  }
  return `<section class="tso-ht-banner pending"><div class="tso-ht-bolt">◐</div><div class="tso-ht-banner-copy"><b>Halftime Model Calculating</b><span>Halftime detected. TSO is waiting for the live sportsbook prop board, then runs the 50K same-world simulation automatically. No refresh required.</span></div></section>`;
}

export function halftimeGamecastBannerHTML(g,doc){
  if(!isHalftimeGameState(g)) return '';
  const board=boardForGame(doc,g);
  if(board){
    const count=board.candidates?.length||0;
    return `<section class="tso-ht-gamecast-banner ready" data-tso-halftime-gamecast><div><strong>⚡ HALFTIME PARLAY LAB READY</strong><span>50K live simulation complete · ${count} qualified props</span></div><button type="button" data-nfl-halftime-open>Build Parlay</button></section>`;
  }
  return `<section class="tso-ht-gamecast-banner pending" data-tso-halftime-gamecast><div><strong>◐ HALFTIME MODEL CALCULATING</strong><span>Waiting for live sportsbook props → 50K simulation → candidate board</span></div><span class="tso-ht-gamecast-wait">AUTO</span></section>`;
}

export function startHalftimeBoardPolling(onUpdate,{intervalMs=5000}={}){
  if(pollTimer)return;
  const tick=async()=>{
    if(document.hidden||window.DW_SPORT!=='nfl')return;
    try{
      const r=await fetch(`./slates/nfl-halftime.json?t=${Date.now()}`,{cache:'no-store'});
      if(!r.ok)return;
      const d=await r.json();
      if(!Array.isArray(d?.games))return;
      currentDoc=d;onUpdate?.(d);
    }catch{}
  };
  tick();
  pollTimer=setInterval(tick,intervalMs);
}

async function latestDoc(fallback){
  try{
    const r=await fetch(`./slates/nfl-halftime.json?t=${Date.now()}`,{cache:'no-store'});
    if(r.ok){const d=await r.json();if(Array.isArray(d?.games)){currentDoc=d;return d}}
  }catch{}
  return currentDoc||fallback||null;
}
function modeOptions(){
  return Object.entries(MODE_COPY).map(([k,[label]])=>`<option value="${k}" ${uiState.mode===k?'selected':''}>${label}</option>`).join('');
}
function selectedReadyBoards(doc){
  const r=readyBoards(doc);
  if(!uiState.selected.size) r.forEach(b=>uiState.selected.add(String(b.gameId)));
  return r;
}
function controlsHTML(doc){
  const boards=selectedReadyBoards(doc);
  const maxPossible=Math.max(1,Math.min(3,boards.length));
  uiState.maxGames=Math.min(uiState.maxGames,maxPossible);
  return `<div class="tso-ht-section"><span class="tso-ht-label">Legs</span><div class="tso-ht-seg">${[2,3,4,5,6].map(n=>`<button type="button" data-ht-legs="${n}" class="${uiState.legCount===n?'active':''}">${n}</button>`).join('')}</div></div>
    <div class="tso-ht-section"><label class="tso-ht-label" for="tsoHtMode">Mode</label><select id="tsoHtMode" class="tso-ht-mode">${modeOptions()}</select><div class="tso-ht-mode-copy" id="tsoHtModeCopy">${esc(MODE_COPY[uiState.mode]?.[1]||'')}</div></div>
    <div class="tso-ht-section"><span class="tso-ht-label">Max Games</span><div class="tso-ht-maxgames">${[1,2,3].filter(n=>n<=maxPossible).map(n=>`<button type="button" data-ht-maxgames="${n}" class="${uiState.maxGames===n?'active':''}">${n}</button>`).join('')}</div></div>
    <div class="tso-ht-section"><span class="tso-ht-label">Games</span><div class="tso-ht-games">${boards.map(b=>`<label class="tso-ht-game"><input type="checkbox" data-ht-game="${esc(b.gameId)}" ${uiState.selected.has(String(b.gameId))?'checked':''}><div><b>${esc(b.matchup)}</b><span>${esc(b.state?.statusDetail||'Halftime')} · ${b.candidates.length} qualified props</span></div><em>50K ✓</em></label>`).join('')}</div></div>
    <button class="tso-ht-generate" type="button" id="tsoHtGenerate">Generate Parlay</button><div id="tsoHtResult"></div>`;
}
function correlationLabels(result,doc){
  const tagged=new Set();
  for(const b of readyBoards(doc)){
    const chosen=new Set(result.legs.filter(x=>String(x.gameId)===String(b.gameId)).map(x=>x.id));
    for(const p of b.correlations?.positive||[])if(chosen.has(p.a)&&chosen.has(p.b)){tagged.add(p.a);tagged.add(p.b)}
  }
  return tagged;
}
function resultHTML(result,doc){
  if(result?.error)return `<div class="tso-ht-result"><div class="tso-ht-error">${esc(result.error)}</div></div>`;
  const ev=result.evaluation,tagged=correlationLabels(result,doc);
  return `<div class="tso-ht-result"><div class="tso-ht-result-head"><b>${esc(MODE_COPY[result.mode]?.[0]||'TSO Pick')} · ${result.legs.length} Legs</b><span>${ev.exactSameWorld?'EXACT SAME-WORLD':'SIM ESTIMATE'}</span></div>
    ${result.legs.map((c,i)=>`<article class="tso-ht-leg"><div class="tso-ht-leg-num">${i+1}</div><div class="tso-ht-leg-main"><b>${esc(c.name)} · ${esc(c.team)}</b><strong>${esc(c.market==='atd'?'Anytime TD':`${c.side==='under'?'Under':'Over'} ${fmtLine(c.line)} ${marketLabel(c.market)}`)}</strong><small>TSO ${pct(c.simProbability)} · Book implied ${pct(c.bookFairProbability)} · Edge ${c.edge>=0?'+':''}${(c.edge*100).toFixed(1)} pts · ${esc(c.book||'Sportsbook')} ${formatAmerican(c.price)}</small>${tagged.has(c.id)?'<small class="tso-ht-corr">↗ Positive simulated correlation</small>':''}</div><div class="tso-ht-leg-grade">${esc(c.grade||'—')}</div></article>`).join('')}
    <section class="tso-ht-summary"><h3>TSO Parlay Simulation</h3><div class="tso-ht-summary-grid"><div class="good"><span>Joint Sim Probability</span><b>${pct(ev.jointProbability)}</b></div><div><span>Independent Product</span><b>${pct(ev.independentProbability)}</b></div><div class="${ev.correlationAdvantage>0?'good':''}"><span>Correlation Advantage</span><b>${ev.correlationAdvantage>=0?'+':''}${(ev.correlationAdvantage*100).toFixed(2)} pts</b></div><div class="${ev.parlayEdge>0?'good':''}"><span>TSO Parlay Edge</span><b>${ev.parlayEdge>=0?'+':''}${(ev.parlayEdge*100).toFixed(2)} pts</b></div><div><span>Market Price Estimate</span><b>${formatAmerican(ev.marketPriceEstimateAmerican)}</b></div><div class="good"><span>TSO Fair Odds</span><b>${formatAmerican(ev.tsoFairAmerican)}</b></div></div></section>
    <div class="tso-ht-actions"><button class="tso-ht-regen" type="button" id="tsoHtRegen">Regenerate</button><button class="tso-ht-reset" type="button" id="tsoHtReset">Change Settings</button><button class="tso-ht-add" type="button" id="tsoHtAdd">Add Entire Parlay to Betslip</button></div></div>`;
}
function buildLeg(c,doc){
  const board=(doc?.games||[]).find(b=>String(b.gameId)===String(c.gameId));
  const label=marketLabel(c.market);
  return {
    id:`NFL-HT|${c.id}`,
    kind:'prop',sport:'nfl',source:'tso-halftime-parlay',live_generated:true,point_wager_eligible:false,
    prop_key:c.market,side:c.side||'over',player:c.name,player_name:c.name,
    market:c.market==='atd'?'Anytime TD':label,line:c.line,
    pct:Math.round(Number(c.simProbability||0)*100),probability:Number(c.simProbability||0),grade:c.grade||null,
    game:board?.matchup||'',game_pk:String(c.gameId),player_id:c.espnId||c.playerId,
    price:c.price??null,book:c.book||null,link:c.link||null,
    tso_edge:Number(c.edge||0),halftime:true
  };
}
function addToBetslip(result,doc){
  const legs=result.legs.map(c=>buildLeg(c,doc));
  let existing=[];try{existing=JSON.parse(localStorage.getItem('dw_betslip')||'[]')||[]}catch{}
  const ids=new Set(existing.map(l=>l?.id));
  if(typeof window.toggleLeg==='function'){
    for(const l of legs)if(!ids.has(l.id))window.toggleLeg(l);
  }else{
    for(const l of legs)if(!ids.has(l.id)){existing.push(l);ids.add(l.id)}
    localStorage.setItem('dw_betslip',JSON.stringify(existing));
    window.renderBetslipBar?.();window.syncAddButtons?.();
  }
  const t=document.createElement('div');t.className='tso-ht-toast';t.textContent=`✓ ${legs.length} halftime legs added to TSO Betslip`;document.body.appendChild(t);setTimeout(()=>t.remove(),2600);
}
function generate(doc,regenerate=false){
  const boards=readyBoards(doc);
  if(regenerate&&generated?.signature)history.add(generated.signature);
  const result=optimizeHalftimeParlay({
    boards,selectedGameIds:[...uiState.selected],legCount:uiState.legCount,maxGames:uiState.maxGames,
    mode:uiState.mode,excludedSignatures:[...history]
  });
  generated=result;
  const host=document.getElementById('tsoHtResult');if(host)host.innerHTML=resultHTML(result,doc);
  wireResult(doc);
}
function wireResult(doc){
  document.getElementById('tsoHtRegen')?.addEventListener('click',()=>generate(doc,true));
  document.getElementById('tsoHtReset')?.addEventListener('click',()=>{generated=null;history.clear();const h=document.getElementById('tsoHtResult');if(h)h.innerHTML='';});
  document.getElementById('tsoHtAdd')?.addEventListener('click',()=>{if(generated&&!generated.error)addToBetslip(generated,doc)});
}
function wireDrawer(doc){
  document.querySelectorAll('[data-ht-legs]').forEach(b=>b.addEventListener('click',()=>{uiState.legCount=Number(b.dataset.htLegs);document.querySelectorAll('[data-ht-legs]').forEach(x=>x.classList.toggle('active',x===b));}));
  document.querySelectorAll('[data-ht-maxgames]').forEach(b=>b.addEventListener('click',()=>{uiState.maxGames=Number(b.dataset.htMaxgames);document.querySelectorAll('[data-ht-maxgames]').forEach(x=>x.classList.toggle('active',x===b));}));
  document.querySelectorAll('[data-ht-game]').forEach(x=>x.addEventListener('change',()=>{x.checked?uiState.selected.add(String(x.dataset.htGame)):uiState.selected.delete(String(x.dataset.htGame));}));
  document.getElementById('tsoHtMode')?.addEventListener('change',e=>{uiState.mode=e.target.value;const c=document.getElementById('tsoHtModeCopy');if(c)c.textContent=MODE_COPY[uiState.mode]?.[1]||'';});
  document.getElementById('tsoHtGenerate')?.addEventListener('click',()=>{history.clear();generate(doc,false)});
}
function closeLab(){document.getElementById('tsoHtBackdrop')?.remove();document.getElementById('tsoHtDrawer')?.remove();generated=null;history.clear();}
export async function openHalftimeParlayLab({halftimeDoc=null}={}){
  ensureHalftimeLabStyles();
  const doc=await latestDoc(halftimeDoc);
  const boards=readyBoards(doc);
  if(!boards.length)return;
  uiState.selected=new Set(boards.map(b=>String(b.gameId)));uiState.maxGames=Math.min(2,boards.length||1);
  document.getElementById('tsoHtBackdrop')?.remove();document.getElementById('tsoHtDrawer')?.remove();
  const back=document.createElement('div');back.id='tsoHtBackdrop';back.className='tso-ht-backdrop';back.addEventListener('click',closeLab);
  const drawer=document.createElement('section');drawer.id='tsoHtDrawer';drawer.className='tso-ht-drawer';drawer.innerHTML=`<header class="tso-ht-head"><div class="tso-ht-head-main"><div class="tso-ht-kicker">⚡ Powered by 50K Live Simulations</div><h2>Halftime Parlay Lab</h2><p>Choose legs, games and strategy. TSO optimizes against the same simulated worlds — not random prop combinations.</p></div><button class="tso-ht-close" type="button" aria-label="Close">×</button></header><div class="tso-ht-livebar"><span><b>● LIVE MODEL</b> · ${boards.length} halftime game${boards.length===1?'':'s'}</span><span>50,000 / game ✓</span></div><div class="tso-ht-scroll">${controlsHTML(doc)}</div>`;
  document.body.append(back,drawer);drawer.querySelector('.tso-ht-close')?.addEventListener('click',closeLab);wireDrawer(doc);
}
