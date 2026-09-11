let installed=false,observer=null,docCache=null;
const MODE_COPY={
  tsoPick:['TSO Pick','Best overall mix of hit rate, model cushion and same-world fit.'],
  safest:['Safest','Prioritizes the highest 50K simulated hit rates.'],
  bestEdge:['Best Edge','Largest TSO model cushion versus the selected quarter threshold.'],
  balanced:['Balanced','Strong probability without dropping the prop line too low.'],
  aggressive:['Aggressive','Higher thresholds with more payout-style risk.'],
  correlated:['Correlated','Uses exact same-world 50K masks to favor legs that work together.'],
  longshot:['Longshot','Most aggressive thresholds that still clear TSO quality gates.'],
};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=v=>Number.isFinite(Number(v))?`${(Number(v)*100).toFixed(1)}%`:'—';
const fmt=v=>Number.isInteger(Number(v))?String(Number(v)):Number(v).toFixed(1);

function ensureStyles(){
  if(document.getElementById('tso-quarter-modal-v893')) return;
  const st=document.createElement('style');st.id='tso-quarter-modal-v893';
  st.textContent=`
  .tso-ht-drawer{top:50%!important;left:50%!important;right:auto!important;transform:translate(-50%,-50%)!important;width:min(880px,94vw)!important;height:min(820px,92dvh)!important;border:1px solid rgba(45,127,255,.42)!important;border-radius:18px!important;box-shadow:0 28px 80px rgba(0,0,0,.58)!important;overflow:hidden!important}
  .tso-q-banner{margin:0 0 16px;border:1px solid rgba(45,127,255,.45);border-radius:14px;background:linear-gradient(135deg,rgba(8,27,57,.98),rgba(10,22,43,.98));padding:14px 16px;display:flex;align-items:center;gap:14px;box-shadow:0 12px 28px rgba(0,0,0,.18)}
  .tso-q-banner .ico{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:rgba(45,127,255,.12);border:1px solid rgba(45,127,255,.34);font-size:22px}.tso-q-banner .copy{flex:1;min-width:0}.tso-q-banner b{display:block;font:800 17px/1.1 'Oswald',sans-serif;color:#fff;text-transform:uppercase}.tso-q-banner span{display:block;margin-top:5px;font:700 9px/1.4 'JetBrains Mono',monospace;color:#8faed3}.tso-q-banner button{border:1px solid #62b7ff;background:#2d7fff;color:#fff;border-radius:9px;padding:10px 15px;font:900 10px 'JetBrains Mono',monospace;cursor:pointer;text-transform:uppercase}.tso-q-banner button:disabled{opacity:.5;cursor:not-allowed}
  .tso-q-backdrop{position:fixed;inset:0;z-index:10030;background:rgba(0,5,14,.72);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
  .tso-q-modal{position:fixed;z-index:10031;top:50%;left:50%;transform:translate(-50%,-50%);width:min(900px,94vw);height:min(820px,92dvh);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(45,127,255,.42);border-radius:18px;background:linear-gradient(180deg,#071326,#050d1c);box-shadow:0 28px 80px rgba(0,0,0,.58);color:#e8f2ff}
  .tso-q-head{padding:18px 20px 14px;border-bottom:1px solid rgba(45,127,255,.22);display:flex;gap:12px}.tso-q-head-main{flex:1}.tso-q-kicker{font:900 8px 'JetBrains Mono',monospace;color:#2d9cff;letter-spacing:.12em;text-transform:uppercase}.tso-q-head h2{margin:4px 0 0;font:800 25px/1 'Oswald',sans-serif;color:#fff}.tso-q-head p{margin:7px 0 0;font:700 8px/1.45 'JetBrains Mono',monospace;color:#7f9fc5}.tso-q-close{width:36px;height:36px;border-radius:50%;border:1px solid rgba(120,160,210,.24);background:#0b1930;color:#d8e9ff;font-size:20px;cursor:pointer}
  .tso-q-scroll{overflow:auto;flex:1;padding:16px 20px 28px}.tso-q-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.tso-q-field label{display:block;margin-bottom:6px;font:900 8px 'JetBrains Mono',monospace;color:#7094bd;text-transform:uppercase;letter-spacing:.08em}.tso-q-field select,.tso-q-field input{width:100%;height:42px;border:1px solid rgba(72,157,255,.45);border-radius:9px;background:#0a2142;color:#fff;padding:0 10px;font:800 10px 'JetBrains Mono',monospace;box-sizing:border-box}.tso-q-mode-copy{margin-top:6px;font:700 8px/1.45 'JetBrains Mono',monospace;color:#708fb4}
  .tso-q-generate{margin-top:14px;width:100%;height:46px;border:0;border-radius:10px;background:linear-gradient(180deg,#2d8cff,#176fe7);color:#fff;font:900 11px 'JetBrains Mono',monospace;text-transform:uppercase;cursor:pointer}.tso-q-generate:disabled{opacity:.5;cursor:not-allowed}.tso-q-result{margin-top:16px}.tso-q-summary{padding:12px;border:1px solid rgba(45,127,255,.28);border-radius:10px;background:#07182f;font:800 9px/1.5 'JetBrains Mono',monospace;color:#9fc3eb}.tso-q-summary strong{color:#59e99a}.tso-q-legs{margin-top:9px;display:flex;flex-direction:column;gap:8px}.tso-q-leg{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:11px 12px;border:1px solid rgba(67,126,196,.25);border-radius:9px;background:#07182f}.tso-q-leg b{display:block;font:800 12px 'Oswald',sans-serif;color:#fff}.tso-q-leg span{display:block;margin-top:3px;font:700 8px 'JetBrains Mono',monospace;color:#7697be}.tso-q-leg em{font:900 10px 'JetBrains Mono',monospace;color:#59e99a;font-style:normal}.tso-q-add{margin-top:12px;width:100%;height:44px;border:1px solid #59e99a;border-radius:10px;background:rgba(34,197,94,.11);color:#7af2ad;font:900 10px 'JetBrains Mono',monospace;text-transform:uppercase;cursor:pointer}
  @media(max-width:640px){.tso-ht-drawer,.tso-q-modal{width:calc(100vw - 12px)!important;height:calc(100dvh - 12px)!important;border-radius:14px!important}.tso-q-grid{grid-template-columns:1fr}.tso-q-banner{align-items:flex-start}.tso-q-banner button{padding:9px 10px}}
  `;document.head.appendChild(st);
}
async function loadDoc(force=false){
  if(docCache&&!force) return docCache;
  try{const r=await fetch('./slates/nfl-quarter.json?ts='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error(String(r.status));docCache=await r.json();return docCache;}catch{return {games:[]};}
}
function pregameGames(doc){
  const now=Date.now()-5*60*1000;
  return (doc?.games||[]).filter(g=>g?.ready&&(!g.startTimeUTC||new Date(g.startTimeUTC).getTime()>=now));
}
function bannerHTML(ready){return `<section class="tso-q-banner" data-tso-quarter-banner><div class="ico">⚡</div><div class="copy"><b>Quarter Parlay Generator</b><span>${ready?'50K pregame quarter distributions ready · Q1–Q4 · exact same-world correlation':'50K quarter board is updating from the pregame simulation.'}</span></div><button type="button" data-tso-quarter-open ${ready?'':'disabled'}>${ready?'Build Quarter Parlay':'Updating…'}</button></section>`;}
function decorateLivePage(){
  const live=document.querySelector('#nflView .nfl-live-page');if(!live||live.querySelector('[data-tso-quarter-banner]'))return;
  loadDoc().then(doc=>{if(!live.isConnected||live.querySelector('[data-tso-quarter-banner]'))return;const games=pregameGames(doc);const tmp=document.createElement('div');tmp.innerHTML=bannerHTML(games.length>0);live.prepend(tmp.firstElementChild);wireOpenButtons();});
}
function wireOpenButtons(){document.querySelectorAll('[data-tso-quarter-open]').forEach(b=>{if(b.dataset.wired)return;b.dataset.wired='1';b.addEventListener('click',()=>openQuarterModal());});}
function unpack(b64,n){const bin=atob(b64||'');const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return {bytes,n:Number(n)||0};}
function maskHit(mask,i){return !!(mask.bytes[i>>3]&(1<<(i&7)));}
function joint(legs){
  if(!legs.length)return 0;const masks=legs.map(c=>unpack(c.worldMaskB64,c.worldMaskIterations));const n=Math.min(...masks.map(m=>m.n));if(!n)return 0;let hits=0;outer:for(let i=0;i<n;i++){for(const m of masks)if(!maskHit(m,i))continue outer;hits++;}return hits/n;
}
function independent(legs){return legs.reduce((p,c)=>p*Number(c.simProbability||0),1);}
function pickCandidates(board,mode,count){
  const byId=new Map((board?.candidates||[]).map(c=>[c.id,c]));
  let ordered=(board?.rankings?.[mode]||board?.rankings?.tsoPick||[]).map(id=>byId.get(id)).filter(Boolean);
  if(!ordered.length)ordered=[...(board?.candidates||[])];
  const picked=[],used=new Set();
  if(mode==='correlated'){
    const pool=ordered.slice(0,16);let first=pool.shift();if(first){picked.push(first);used.add(first.playerId);}
    while(picked.length<count){let best=null,bestScore=-Infinity;for(const c of pool){if(used.has(c.playerId)||picked.includes(c))continue;const trial=[...picked,c],j=joint(trial),ind=independent(trial);const lift=j-ind;const score=lift*4+j;if(score>bestScore){bestScore=score;best=c;}}if(!best)break;picked.push(best);used.add(best.playerId);}return picked;
  }
  for(const c of ordered){if(used.has(c.playerId))continue;picked.push(c);used.add(c.playerId);if(picked.length>=count)break;}return picked;
}
function legLabel(c){return `Over ${fmt(c.line)} ${c.marketLabel||c.market}`;}
function modalHTML(doc){
  const games=pregameGames(doc);const gameOpts=games.map(g=>`<option value="${esc(g.gameId)}">${esc(g.matchup)}</option>`).join('');
  const modes=Object.entries(MODE_COPY).map(([k,v])=>`<option value="${k}">${esc(v[0])}</option>`).join('');
  return `<div class="tso-q-backdrop" id="tsoQBackdrop"></div><section class="tso-q-modal" id="tsoQModal" role="dialog" aria-modal="true" aria-label="Quarter Parlay Generator"><div class="tso-q-head"><div class="tso-q-head-main"><div class="tso-q-kicker">TSO 50K Pregame Simulator</div><h2>Quarter Parlay Generator</h2><p>Build Q1–Q4 parlays from the same 50,000 simulated worlds used by the pregame model.</p></div><button class="tso-q-close" id="tsoQClose" type="button">×</button></div><div class="tso-q-scroll"><div class="tso-q-grid"><div class="tso-q-field"><label>Game</label><select id="tsoQGame">${gameOpts}</select></div><div class="tso-q-field"><label>Quarter</label><select id="tsoQQuarter"><option value="q1">1st Quarter</option><option value="q2">2nd Quarter</option><option value="q3">3rd Quarter</option><option value="q4">4th Quarter</option></select></div><div class="tso-q-field"><label>Build Style</label><select id="tsoQMode">${modes}</select><div class="tso-q-mode-copy" id="tsoQModeCopy"></div></div><div class="tso-q-field"><label>Legs</label><select id="tsoQLegs"><option>2</option><option selected>3</option><option>4</option><option>5</option><option>6</option></select></div></div><button class="tso-q-generate" id="tsoQGenerate" type="button">Generate Quarter Parlay</button><div class="tso-q-result" id="tsoQResult"></div></div></section>`;
}
function close(){document.getElementById('tsoQBackdrop')?.remove();document.getElementById('tsoQModal')?.remove();}
function buildSlipLeg(c,game){return {id:`${c.name}|${c.quarter}|${c.market}|${c.line}`,kind:'prop',sport:'nfl',prop_key:c.market,period:c.quarter,quarter:c.quarter,side:'over',player:c.name,player_name:c.name,market:c.marketLabel||c.market,line:Number(c.line),pct:Number(c.simProbability)*100,grade:Number(c.simProbability)>=.72?'A':Number(c.simProbability)>=.64?'B+':'B',game:game?.matchup||c.gameId,game_pk:Number(c.gameId)||c.gameId,price:null,book:'TSO 50K Quarter Model',line_source:'TSO quarter simulation',quarter_model:true};}
function addAll(legs,game){let existing=[];try{existing=JSON.parse(localStorage.getItem('dw_betslip')||'[]')||[]}catch{}const ids=new Set(existing.map(x=>x?.id));for(const c of legs){const l=buildSlipLeg(c,game);if(ids.has(l.id))continue;if(typeof window.toggleLeg==='function')window.toggleLeg(l);else{existing.push(l);ids.add(l.id);}}if(typeof window.toggleLeg!=='function')localStorage.setItem('dw_betslip',JSON.stringify(existing));window.renderBetslipBar?.();window.syncAddButtons?.();}
async function openQuarterModal(){
  ensureStyles();close();const doc=await loadDoc(true);const games=pregameGames(doc);if(!games.length)return;
  document.body.insertAdjacentHTML('beforeend',modalHTML(doc));
  const gameSel=document.getElementById('tsoQGame'),qSel=document.getElementById('tsoQQuarter'),modeSel=document.getElementById('tsoQMode'),legsSel=document.getElementById('tsoQLegs'),copy=document.getElementById('tsoQModeCopy'),result=document.getElementById('tsoQResult');
  const syncCopy=()=>{copy.textContent=MODE_COPY[modeSel.value]?.[1]||'';};syncCopy();modeSel.addEventListener('change',syncCopy);
  const generate=()=>{const game=games.find(g=>String(g.gameId)===gameSel.value)||games[0];const board=game?.quarters?.[qSel.value];if(!board?.ready){result.innerHTML='<div class="tso-q-summary">Quarter board is not ready yet.</div>';return;}const legs=pickCandidates(board,modeSel.value,Number(legsSel.value)||3);const j=joint(legs),ind=independent(legs),lift=j-ind;result.innerHTML=`<div class="tso-q-summary"><strong>${MODE_COPY[modeSel.value]?.[0]||'TSO'} ${qSel.options[qSel.selectedIndex].text}</strong> · ${legs.length} legs · joint 50K hit rate <strong>${pct(j)}</strong>${Number.isFinite(lift)?` · correlation lift ${lift>=0?'+':''}${pct(lift)}`:''}</div><div class="tso-q-legs">${legs.map(c=>`<div class="tso-q-leg"><div><b>${esc(c.name)}</b><span>${esc(legLabel(c))} · ${esc(c.team)}</span></div><em>${pct(c.simProbability)}</em></div>`).join('')}</div><button class="tso-q-add" id="tsoQAdd" type="button">Add Entire Parlay to Slip</button>`;document.getElementById('tsoQAdd')?.addEventListener('click',()=>addAll(legs,game));};
  document.getElementById('tsoQGenerate')?.addEventListener('click',generate);document.getElementById('tsoQClose')?.addEventListener('click',close);document.getElementById('tsoQBackdrop')?.addEventListener('click',close);generate();
}
export function mountNflParlayModalV893(){
  ensureStyles();decorateLivePage();wireOpenButtons();if(installed)return;installed=true;observer=new MutationObserver(()=>{decorateLivePage();wireOpenButtons();});observer.observe(document.getElementById('nflView')||document.body,{childList:true,subtree:true});
}
export const __V893_TEST__={MODE_COPY,pickCandidates};
