import { buildTsoPropView, normalizeMarket } from './sim/prop-probabilities-v8917.js?v=89.17';

const CARD='.nfl-mlb-prop-card';
const STRIP='tso-nfl-prop-model-v8917';
const SIM_URL='./slates/nfl-sim.json';
let installed=false,observer=null,pending=false,refreshTimer=null,simIndex=null,loading=null;

const norm=s=>String(s??'').toLowerCase().replace(/\./g,'').replace(/\s+(jr|sr|ii|iii|iv|v)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=p=>Number.isFinite(Number(p))?`${(Number(p)*100).toFixed(1)}%`:'—';
const numText=n=>Number.isFinite(Number(n))?Number(n).toFixed(Math.abs(Number(n))>=10?1:2).replace(/\.0$/,''):'—';
const iterText=n=>{const x=Number(n);if(!Number.isFinite(x)||x<=0)return 'Sim';if(x>=1000&&x%1000===0)return `${Math.round(x/1000)}K sims`;return `${x.toLocaleString()} sims`;};
const priceNumber=s=>{const m=String(s??'').match(/([+-]\d{3,4})\b/);return m?Number(m[1]):null;};

function marketFromCard(card){
  const strong=card.querySelector('.nfl-mlb-prop-market strong');
  return normalizeMarket(strong?.textContent||'');
}
function sideLineFromCard(card,market){
  const text=String(card.querySelector('.nfl-mlb-prop-odds strong')?.textContent||'').trim();
  const side=/\bunder\b/i.test(text)?'under':'over';
  if(market==='atd')return {side,line:null};
  const m=text.match(/(-?\d+(?:\.\d+)?)/);
  return {side,line:m?Number(m[1]):null};
}
function priceFromCard(card){return priceNumber(card.querySelector('.nfl-mlb-prop-odds b')?.textContent||card.querySelector('.nfl-mlb-prop-odds')?.textContent||'');}

function buildIndex(doc){
  const byId=new Map(),players=[];
  for(const game of doc?.games||[]){
    const iterations=Number(game?.iterations)||Number(doc?.meta?.pregameIterations)||null;
    for(const p of game?.players||[]){
      const row={playerSim:p,iterations,gameId:String(game?.game?.gameId||'')};players.push(row);
      for(const id of [p?.espnId,p?.playerId,p?.gsisId])if(id!=null&&String(id))byId.set(String(id),row);
    }
  }
  return {byId,players,generatedAt:doc?.generatedAt||null,engineVersion:doc?.engineVersion||null};
}
async function loadSim({force=false}={}){
  if(loading)return loading;
  if(simIndex&&!force)return simIndex;
  loading=(async()=>{
    try{
      const r=await fetch(`${SIM_URL}?ts=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`${r.status}`);
      const doc=await r.json();simIndex=buildIndex(doc);return simIndex;
    }catch(e){console.warn('[NFL Prop Model v89.17] simulation cache unavailable:',e);return simIndex;}
    finally{loading=null;}
  })();
  return loading;
}
function rowForCard(card){
  if(!simIndex)return null;
  const id=String(card.dataset.nflPlayer||card.getAttribute('data-nfl-player')||'');
  if(id&&simIndex.byId.has(id))return simIndex.byId.get(id);
  const text=norm(card.textContent);
  let best=null,bestLen=0;
  for(const row of simIndex.players){const n=norm(row.playerSim?.name);if(n.length>=4&&n.length>bestLen&&text.includes(n)){best=row;bestLen=n.length;}}
  return best;
}
function stripHtml(view){
  const edge=view.edgePoints,edgeText=edge==null?'':`<span class="edge ${edge>0?'pos':edge<0?'neg':'flat'}">Edge ${edge>=0?'+':''}${edge.toFixed(1)} pp</span>`;
  const projection=view.projection!=null&&view.line!=null?`<span>Median ${numText(view.median??view.projection)}</span><span>Proj ${numText(view.projection)}</span>`:'';
  const range=view.p10!=null&&view.p90!=null?`<small>P10 ${numText(view.p10)} · P90 ${numText(view.p90)}</small>`:'';
  const basis=view.edgeBasis==='fair-market'?'vs fair market':view.edgeBasis==='implied'?'vs implied':'model probability';
  return `<div class="${STRIP}__main"><strong>TSO ${pct(view.tsoProbability)}</strong>${projection}${edgeText}<b>${esc(view.tier)}</b></div><div class="${STRIP}__sub"><small>${esc(iterText(view.iterations))} · ${esc(basis)} · ${esc(view.probabilityMethod)}</small>${range}</div>`;
}
function patchCard(card){
  const market=marketFromCard(card);if(!market)return;
  const row=rowForCard(card);if(!row)return;
  const {side,line}=sideLineFromCard(card,market),price=priceFromCard(card);
  if(market!=='atd'&&!Number.isFinite(line))return;
  const view=buildTsoPropView({playerSim:row.playerSim,market,line,side,price,iterations:row.iterations});if(!view)return;
  const sig=[market,side,line??'',price??'',row.playerSim?.playerId||row.playerSim?.espnId||'',row.iterations,view.tsoProbability,view.edgePoints].join('|');
  let strip=card.querySelector(`:scope > .${STRIP}`);
  if(strip?.dataset.sig===sig)return;
  if(!strip){strip=document.createElement('div');strip.className=STRIP;strip.setAttribute('aria-label','TSO simulation model');card.append(strip);}
  strip.dataset.sig=sig;strip.innerHTML=stripHtml(view);
}
function patchAll(){
  pending=false;if(!simIndex)return;
  const root=document.getElementById('nflView')||document;
  root.querySelectorAll(CARD).forEach(patchCard);
}
function schedule(){if(pending)return;pending=true;(typeof requestAnimationFrame==='function'?requestAnimationFrame:setTimeout)(patchAll);}
function ensureStyle(){
  if(document.getElementById('tso-nfl-prop-model-v8917-style'))return;
  const s=document.createElement('style');s.id='tso-nfl-prop-model-v8917-style';s.textContent=`
    #nflView ${CARD}{position:relative}
    #nflView .${STRIP}{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:10px;margin:3px 0 0;padding:7px 10px;border:1px solid rgba(45,127,255,.22);border-radius:8px;background:linear-gradient(90deg,rgba(45,127,255,.095),rgba(7,22,42,.18));pointer-events:none;min-width:0}
    #nflView .${STRIP}__main,#nflView .${STRIP}__sub{display:flex;align-items:center;gap:9px;min-width:0;flex-wrap:wrap}
    #nflView .${STRIP}__main strong{font:950 10px 'JetBrains Mono',monospace;color:#75caff;letter-spacing:.02em}
    #nflView .${STRIP}__main span{font:800 9px 'JetBrains Mono',monospace;color:#d8e7f8}
    #nflView .${STRIP}__main .edge.pos{color:#62dda0}#nflView .${STRIP}__main .edge.neg{color:#ff8f98}#nflView .${STRIP}__main .edge.flat{color:#9cb1c9}
    #nflView .${STRIP}__main b{font:900 8px 'JetBrains Mono',monospace;color:#a8c7e8;text-transform:uppercase;letter-spacing:.06em}
    #nflView .${STRIP}__sub{justify-content:flex-end;color:#7896ba}#nflView .${STRIP}__sub small{font:750 7.5px 'JetBrains Mono',monospace;white-space:nowrap}
    @media(max-width:760px){#nflView .${STRIP}{align-items:flex-start;flex-direction:column;gap:4px}#nflView .${STRIP}__sub{justify-content:flex-start}}
  `;document.head.append(s);
}

export async function installNflPropModelEdgeV8917(){
  if(typeof document==='undefined')return null;
  ensureStyle();await loadSim();schedule();
  if(!installed){
    installed=true;
    const root=document.getElementById('nflView')||document.body;
    observer=new MutationObserver(mutations=>{
      if(mutations.every(m=>m.target?.closest?.(`.${STRIP}`)))return;
      schedule();
    });observer.observe(root,{childList:true,subtree:true,characterData:true});
    refreshTimer=setInterval(async()=>{await loadSim({force:true});schedule();},60000);
  }
  return observer;
}
export async function refreshNflPropModelEdgeV8917(){await loadSim({force:true});schedule();}
export const __V8917_UI_TEST__={buildIndex,marketFromCard,sideLineFromCard,priceNumber,iterText,norm};
