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
export function ensureHalftimeLabStyles(){
  if(document.getElementById('tso-nfl-halftime-lab-v88')) return;
  const st=document.createElement('style');
  st.id='tso-nfl-halftime-lab-v88';
  st.textContent=`
  #nflView .tso-ht-banner{margin:0 0 16px;border:1px solid rgba(245,158,11,.45);border-radius:14px;background:linear-gradient(135deg,rgba(8,27,57,.98),rgba(16,31,55,.96));box-shadow:0 12px 28px rgba(0,0,0,.18);padding:14px 16px;display:flex;align-items:center;gap:14px}
  #nflView .tso-ht-bolt{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.34);font-size:22px}
  #nflView .tso-ht-banner-copy{min-width:0;flex:1}#nflView .tso-ht-banner-copy b{display:block;font:800 17px/1.1 'Oswald',sans-serif;color:#fff;letter-spacing:.02em;text-transform:uppercase}
  #nflView .tso-ht-banner-copy span{display:block;margin-top:5px;font:700 9px/1.35 'JetBrains Mono',monospace;color:#8faed3}
  #nflView .tso-ht-banner-copy strong{color:#59e99a}#nflView .tso-ht-banner button{flex:0 0 auto;border:1px solid #f59e0b;background:#f59e0b;color:#071326;border-radius:9px;padding:10px 15px;font:900 10px 'JetBrains Mono',monospace;cursor:pointer;text-transform:uppercase}
  #nflView .tso-ht-banner.pending{border-color:rgba(66,153,225,.35)}#nflView .tso-ht-banner.pending .tso-ht-bolt{border-color:rgba(66,153,225,.35);background:rgba(45,127,255,.1)}
  .tso-ht-backdrop{position:fixed;inset:0;z-index:10020;background:rgba(0,5,14,.68);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
  .tso-ht-drawer{position:fixed;z-index:10021;top:0;right:0;width:min(490px,94vw);height:100dvh;background:linear-gradient(180deg,#071326,#050d1c);border-left:1px solid rgba(45,127,255,.38);box-shadow:-18px 0 46px rgba(0,0,0,.38);display:flex;flex-direction:column;color:#e8f2ff}
  .tso-ht-head{padding:18px 20px 14px;border-bottom:1px solid rgba(45,127,255,.22);display:flex;gap:12px;align-items:flex-start}.tso-ht-head-main{flex:1;min-width:0}.tso-ht-kicker{font:900 8px 'JetBrains Mono',monospace;color:#f59e0b;letter-spacing:.12em;text-transform:uppercase}.tso-ht-head h2{margin:4px 0 0;font:800 25px/1 'Oswald',sans-serif;color:#fff}.tso-ht-head p{margin:7px 0 0;font:700 8px/1.45 'JetBrains Mono',monospace;color:#7f9fc5}.tso-ht-close{width:36px;height:36px;flex:0 0 36px;border-radius:50%;border:1px solid rgba(120,160,210,.24);background:#0b1930;color:#d8e9ff;font-size:20px;cursor:pointer}
  .tso-ht-livebar{margin:12px 20px 0;border:1px solid rgba(34,197,94,.25);background:rgba(5,61,42,.18);border-radius:9px;padding:9px 11px;display:flex;justify-content:space-between;gap:8px;font:800 8px 'JetBrains Mono',monospace;color:#83a8d0}.tso-ht-livebar b{color:#59e99a}
  .tso-ht-scroll{overflow:auto;flex:1;padding:14px 20px 100px}.tso-ht-section{margin-bottom:16px}.tso-ht-label{display:block;margin-bottom:7px;font:900 8px 'JetBrains Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:#7094bd}
  .tso-ht-seg{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}.tso-ht-seg button,.tso-ht-maxgames button{border:1px solid rgba(67,126,196,.32);background:#091a34;color:#b6cbe5;border-radius:8px;height:34px;font:900 9px 'JetBrains Mono',monospace;cursor:pointer}.tso-ht-seg button.active,.tso-ht-maxgames button.active{background:#2d7fff;border-color:#56b9ff;color:#fff}
  .tso-ht-mode{width:100%;height:42px;border:1px solid rgba(72,157,255,.45);border-radius:9px;background:#0a2142;color:#fff;padding:0 10px;font:800 10px 'JetBrains Mono',monospace}.tso-ht-mode-copy{margin-top:6px;font:700 8px/1.4 'JetBrains Mono',monospace;color:#708fb4}
  .tso-ht-maxgames{display:flex;gap:6px}.tso-ht-maxgames button{width:48px}.tso-ht-games{display:flex;flex-direction:column;gap:7px}.tso-ht-game{display:flex;align-items:center;gap:10px;padding:10px 11px;border:1px solid rgba(67,126,196,.25);border-radius:9px;background:#07182f;cursor:pointer}.tso-ht-game input{accent-color:#2d7fff}.tso-ht-game div{flex:1}.tso-ht-game b{display:block;font:800 11px 'Oswald',sans-serif;color:#fff}.tso-ht-game span{display:block;margin-top:2px;font:700 7px 'JetBrains Mono',monospace;color:#7697be}.tso-ht-game em{font:900 7px 'JetBrains Mono',monospace;color:#59e99a;font-style:normal}
  .tso-ht-generate{width:100%;height:46px;border:0;border-radius:10px;background:linear-gradient(180deg,#2d8cff,#176fe7);color:#fff;font:900 11px 'JetBrains Mono',monospace;text-transform:uppercase;cursor:pointer;box-shadow:0 8px 20px rgba(45,127,255,.2)}
  .tso-ht-error{padding:10px;border:1px solid rgba(255,159,67,.3);border-radius:9px;background:rgba(84,43,8,.2);font:700 8px/1.5 'JetBrains Mono',monospace;color:#ffb86b}
  .tso-ht-result{margin-top:18px;padding-top:16px;border-top:1px solid rgba(45,127,255,.22)}.tso-ht-result-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.tso-ht-result-head b{font:900 14px 'Oswald',sans-serif;color:#fff;text-transform:uppercase}.tso-ht-result-head span{font:800 7px 'JetBrains Mono',monospace;color:#f59e0b}
  .tso-ht-leg{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:9px;padding:11px 0;border-bottom:1px solid rgba(45,127,255,.14)}.tso-ht-leg-num{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:#0c2446;color:#60b9ff;font:900 9px 'JetBrains Mono',monospace}.tso-ht-leg-main b{display:block;font:800 13px 'Oswald',sans-serif;color:#fff}.tso-ht-leg-main strong{display:block;margin-top:2px;font:900 9px 'JetBrains Mono',monospace;color:#f3c340;text-transform:uppercase}.tso-ht-leg-main small{display:block;margin-top:5px;font:700 7px/1.4 'JetBrains Mono',monospace;color:#7798be}.tso-ht-leg-grade{width:40px;height:40px;border:3px solid #2d7fff;border-radius:50%;display:grid;place-items:center;color:#fff;font:900 11px 'Oswald',sans-serif}.tso-ht-corr{display:inline-block;margin-top:5px;padding:3px 6px;border-radius:999px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.25);color:#59e99a!important}
  .tso-ht-summary{margin-top:12px;padding:12px;border:1px solid rgba(45,127,255,.25);border-radius:11px;background:#071a35}.tso-ht-summary h3{margin:0 0 9px;font:900 11px 'JetBrains Mono',monospace;color:#68c9ff;text-transform:uppercase}.tso-ht-summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.tso-ht-summary-grid div{padding:8px;border-radius:8px;background:#06142a}.tso-ht-summary-grid span{display:block;font:800 6.5px 'JetBrains Mono',monospace;color:#6e8fb5;text-transform:uppercase}.tso-ht-summary-grid b{display:block;margin-top:3px;font:900 15px 'Oswald',sans-serif;color:#fff}.tso-ht-summary-grid .good b{color:#59e99a}
  .tso-ht-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.tso-ht-actions button{height:42px;border-radius:9px;font:900 9px 'JetBrains Mono',monospace;cursor:pointer}.tso-ht-add{grid-column:1/-1;background:#f59e0b!important;border:1px solid #ffc348!important;color:#071326!important}.tso-ht-regen{background:#0b2141;border:1px solid rgba(65,143,236,.4);color:#cae0fa}.tso-ht-reset{background:#09172c;border:1px solid rgba(90,122,166,.25);color:#8fabce}
  .tso-ht-toast{position:fixed;z-index:10040;right:22px;bottom:22px;padding:11px 14px;border-radius:9px;background:#08253a;border:1px solid rgba(34,197,94,.4);color:#80efac;font:800 9px 'JetBrains Mono',monospace;box-shadow:0 10px 30px rgba(0,0,0,.35)}
  @media(max-width:680px){#nflView .tso-ht-banner{padding:11px;align-items:center}#nflView .tso-ht-bolt{width:34px;height:34px;font-size:18px}#nflView .tso-ht-banner-copy b{font-size:14px}#nflView .tso-ht-banner button{padding:9px 10px;font-size:8px}.tso-ht-backdrop{background:rgba(0,5,14,.5)}.tso-ht-drawer{top:auto;bottom:0;left:0;right:0;width:100%;height:min(92dvh,820px);border-left:0;border-top:1px solid rgba(45,127,255,.4);border-radius:18px 18px 0 0}.tso-ht-drawer:before{content:'';position:absolute;top:7px;left:50%;width:42px;height:4px;transform:translateX(-50%);border-radius:99px;background:#385475}.tso-ht-head{padding-top:20px}.tso-ht-scroll{padding-left:15px;padding-right:15px}.tso-ht-summary-grid{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(st);
}

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
