/**
 * v89.2 — NFL player modal alternate prop line -> wager CTA bridge.
 *
 * Extends v89.1 alternate-line selection so the selected sportsbook alternate
 * becomes the actual wager leg behind the Player Modal Add-to-Slip button.
 */
const STYLE_ID='tso-nfl-alt-props-v892-styles';
const PROP_META={
  rushYds:{label:'Rushing Yards',unit:'YDS'},
  recYds:{label:'Receiving Yards',unit:'YDS'},
  receptions:{label:'Receptions',unit:'REC'},
  passYds:{label:'Passing Yards',unit:'YDS'},
  passTds:{label:'Passing TDs',unit:'TD'},
  completions:{label:'Completions',unit:'CMP'},
};
const SUPPORTED=new Set(Object.keys(PROP_META));
let rootRef=null;
let observer=null;
let scheduled=false;
let oddsPromise=null;
let oddsData=null;
let oddsEventBound=false;
let modalState=new WeakMap();

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normName=s=>String(s||'').toLowerCase().replace(/\./g,'').replace(/\s+(jr|sr|ii|iii|iv|v)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const normTeam=t=>({LAR:'LA',JAC:'JAX',WAS:'WSH',OAK:'LV',SD:'LAC',STL:'LA'}[String(t||'').toUpperCase()]||String(t||'').toUpperCase());
const finite=v=>Number.isFinite(Number(v))?Number(v):null;
const fmtLine=v=>{const n=finite(v);return n==null?'—':Number.isInteger(n)?String(n):n.toFixed(1);};
const fmtAmerican=v=>{const n=finite(v);return n==null?'—':`${n>0?'+':''}${Math.round(n)}`;};
const impliedFromAmerican=v=>{const n=finite(v);if(n==null||n===0)return null;return n>0?100/(n+100):(-n)/((-n)+100);};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const choiceKey=c=>c?`${c.side}|${c.line}|${c.offer?.price}|${c.offer?.book||''}`:'';

function ensureStyles(){
  if(typeof document==='undefined'||document.getElementById(STYLE_ID)) return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    .tso-nfl-player-card-v72 .tso-nfl-alt-control{margin-top:8px}
    .tso-nfl-player-card-v72 .tso-nfl-alt-control[hidden]{display:none!important}
    .tso-nfl-player-card-v72 .tso-nfl-alt-label{display:block;margin:0 0 5px;font:900 7px 'JetBrains Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:#82a5cc}
    .tso-nfl-player-card-v72 .tso-nfl-alt-select-wrap{position:relative}
    .tso-nfl-player-card-v72 .tso-nfl-alt-select{width:100%;height:36px;padding:0 30px 0 10px;border:1px solid rgba(67,151,249,.34);border-radius:8px;background:#06172f;color:#eaf4ff;font:800 9px 'JetBrains Mono',monospace;appearance:none;-webkit-appearance:none;outline:none;cursor:pointer}
    .tso-nfl-player-card-v72 .tso-nfl-alt-select:focus{border-color:rgba(45,127,255,.86);box-shadow:0 0 0 2px rgba(45,127,255,.12)}
    .tso-nfl-player-card-v72 .tso-nfl-alt-chevron{position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;color:#45a8ff;font-size:8px}
    .tso-nfl-player-card-v72 .tso-nfl-alt-readout{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px;padding:7px 9px;border:1px solid rgba(34,197,94,.22);border-radius:8px;background:rgba(5,63,43,.14);font:700 7px 'JetBrains Mono',monospace;color:#8eabc9}
    .tso-nfl-player-card-v72 .tso-nfl-alt-readout b{font:900 13px 'Oswald',sans-serif;color:#58e89a;white-space:nowrap}
    .tso-nfl-player-card-v72 .tso-nfl-alt-readout span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .tso-nfl-player-card-v72 .tso-nfl-alt-readout em{font-style:normal;color:#b8cde4;white-space:nowrap}
    #tsoNflSlipHost .cta.tso-nfl-alt-active{box-shadow:0 0 0 1px rgba(88,232,154,.18),0 8px 22px rgba(45,127,255,.12)}
    @media(max-width:680px){.tso-nfl-player-card-v72 .tso-nfl-alt-select{height:42px;font-size:9px}.tso-nfl-player-card-v72 .tso-nfl-alt-readout{font-size:7px}}
  `;
  document.head.appendChild(style);
}

async function loadOdds(force=false){
  if(force){oddsPromise=null;oddsData=null;}
  if(oddsData) return oddsData;
  if(oddsPromise) return oddsPromise;
  oddsPromise=(async()=>{
    try{
      const res=await fetch('./slates/nfl-odds.json',{cache:'no-cache'});
      if(!res.ok) throw new Error(`NFL odds ${res.status}`);
      oddsData=await res.json();
      return oddsData;
    }catch(err){
      console.warn('[NFL v89.2 alt props] odds feed unavailable:',err);
      return null;
    }
  })();
  return oddsPromise;
}

function modalPlayerName(modal){
  const h2=modal?.querySelector('.who h2');
  if(!h2) return '';
  for(const n of h2.childNodes){
    if(n.nodeType===3&&String(n.textContent||'').trim()) return String(n.textContent).trim();
  }
  return String(h2.textContent||'').replace(/Sourced.*$/i,'').trim();
}

function modalTeam(modal){
  const ident=modal?.querySelector('.tso-nfl-research-identity strong')?.textContent||'';
  const fromIdent=String(ident).split('·')[0]?.trim();
  if(/^[A-Z]{2,4}$/.test(fromIdent||'')) return normTeam(fromIdent);
  const sub=modal?.querySelector('#tsoNflPropSub')?.textContent||'';
  const tokens=String(sub).split(/\s+|·/).map(x=>x.trim()).filter(Boolean);
  return normTeam(tokens.find(x=>/^[A-Z]{2,4}$/.test(x))||'');
}

function findOddsPlayer(name,team=''){
  const nk=normName(name),nt=normTeam(team);
  if(!nk||!oddsData) return null;
  let fallback=null;
  for(const game of oddsData.games||[]){
    for(const player of game.players||[]){
      if(normName(player.name)!==nk) continue;
      const hit={game,player};
      if(nt&&normTeam(player.team)===nt) return hit;
      if(!fallback) fallback=hit;
    }
  }
  return fallback;
}

function bestOffer(branch){
  const b=branch?.best;
  if(b&&finite(b.price)!=null) return b;
  const all=[...(branch?.all||[])].filter(x=>finite(x?.price)!=null);
  return all.sort((a,b)=>Number(b.price)-Number(a.price))[0]||null;
}

function marketChoices(slot,key){
  if(!slot||!SUPPORTED.has(key)) return [];
  const lines=[];
  const seen=new Set();
  const source=Array.isArray(slot.alternates)&&slot.alternates.length
    ? slot.alternates
    : (finite(slot.line)!=null?[{line:Number(slot.line),over:slot.over,under:slot.under}]:[]);
  for(const row of source){
    const line=finite(row?.line); if(line==null) continue;
    for(const side of ['over','under']){
      const offer=bestOffer(row?.[side]);
      if(!offer) continue;
      const id=`${side}|${line}`;
      if(seen.has(id)) continue;
      seen.add(id);
      lines.push({side,line,offer});
    }
  }
  return lines.sort((a,b)=>a.line-b.line||(a.side==='over'?-1:1));
}

function canonicalProjection(name,team,key){
  if(typeof window==='undefined'||typeof window.DW_NFL_PROP_RESULT!=='function') return null;
  try{
    const r=window.DW_NFL_PROP_RESULT({name,team,prop:key})||null;
    return finite(r?.projection);
  }catch{return null;}
}

function estimateAltProb(key,line,projection){
  if(projection==null||line==null) return null;
  const scale=key==='receptions'?1.6:key==='passTds'?0.7:key==='completions'?3.5:Math.max(7,Math.abs(line)*.16);
  return clamp(50+((projection-line)/Math.max(.5,scale))*15,5,95);
}

function gradeFromProbability(p){
  const n=finite(p);
  if(n==null) return null;
  return n>=70?'A+':n>=65?'A':n>=61?'A-':n>=57?'B+':n>=54?'B':n>=51?'B-':n>=48?'C+':'C';
}

function optionLabel(choice,key){
  const meta=PROP_META[key]||{unit:''};
  return `${choice.side==='over'?'Over':'Under'} ${fmtLine(choice.line)} ${meta.unit}   ${fmtAmerican(choice.offer.price)} · ${choice.offer.book||'Sportsbook'}`;
}

function selectedAltProbability(name,team,key,choice){
  const projection=canonicalProjection(name,team,key);
  let altProb=estimateAltProb(key,choice?.line,projection);
  if(altProb!=null&&choice?.side==='under') altProb=100-altProb;
  return altProb;
}

function slipHasLeg(id){
  if(typeof localStorage==='undefined') return false;
  try{return (JSON.parse(localStorage.getItem('dw_betslip')||'[]')||[]).some(l=>l?.id===id);}catch{return false;}
}

function decodeButtonLeg(button){
  try{return JSON.parse(decodeURIComponent(button?.dataset?.leg||''));}catch{return null;}
}

function buildAltLeg(baseLeg,choice,key,name,altProb){
  if(!baseLeg||!choice||!SUPPORTED.has(key)) return null;
  const player=baseLeg.player||baseLeg.player_name||name||'';
  const market=baseLeg.market||String(PROP_META[key]?.label||key).toUpperCase();
  const line=Number(choice.line);
  const side=choice.side==='under'?'under':'over';
  const legacyOverId=`${player}|${market}|${fmtLine(line)}`;
  const id=side==='over'?legacyOverId:`${player}|${market}|UNDER|${fmtLine(line)}`;
  return {
    ...baseLeg,
    id,
    prop_key:key,
    side,
    line,
    pct:altProb==null?baseLeg.pct:+Number(altProb).toFixed(1),
    grade:altProb==null?baseLeg.grade:(gradeFromProbability(altProb)||baseLeg.grade),
    price:finite(choice.offer?.price),
    book:choice.offer?.book||'Sportsbook',
    link:choice.offer?.link??null,
    line_source:'Sportsbook alternate',
    alternate_line:true,
  };
}

function syncSlipButton(modal,choice,key,name,team,altProb){
  const button=modal?.querySelector('#tsoNflSlipHost .add-leg.cta');
  if(!button||!choice) return false;
  const baseLeg=decodeButtonLeg(button);
  const leg=buildAltLeg(baseLeg,choice,key,name,altProb);
  if(!leg) return false;
  const sideLabel=choice.side==='under'?'Under':'Over';
  const label=`Add ${sideLabel} ${fmtLine(choice.line)} ${PROP_META[key]?.label||key} to Slip`;
  const on=slipHasLeg(leg.id);
  button.dataset.legid=leg.id;
  button.dataset.leg=encodeURIComponent(JSON.stringify(leg));
  button.dataset.ctaLabel=label;
  button.dataset.tsoNflAltActive='1';
  button.classList.add('tso-nfl-alt-active');
  button.classList.toggle('in-slip',on);
  button.textContent=on?'✓ In Slip':label;
  return true;
}

function renderChoice(modal,choice,key,name,team){
  const readout=modal.querySelector('.tso-nfl-alt-readout');
  if(!readout||!choice) return;
  const altProb=selectedAltProbability(name,team,key,choice);
  const implied=impliedFromAmerican(choice.offer.price);
  const edge=(altProb!=null&&implied!=null)?altProb-implied*100:null;
  readout.innerHTML=`<span>${esc(choice.side==='over'?'Over':'Under')} ${esc(fmtLine(choice.line))} ${esc(PROP_META[key]?.unit||'')} · ${esc(choice.offer.book||'Sportsbook')}</span><b>${esc(fmtAmerican(choice.offer.price))}</b><em>${altProb==null?'TSO alt prob —':`TSO ${altProb.toFixed(0)}%${edge==null?'':` · ${edge>=0?'+':''}${edge.toFixed(1)} edge`}`}</em>`;
  modal.dataset.tsoNflAltProp=key;
  modal.dataset.tsoNflAltSide=choice.side;
  modal.dataset.tsoNflAltLine=String(choice.line);
  modal.dataset.tsoNflAltPrice=String(choice.offer.price);
  modal.dataset.tsoNflAltBook=String(choice.offer.book||'Sportsbook');
  syncSlipButton(modal,choice,key,name,team,altProb);
}

function ensureAltControl(modal){
  const propSelect=modal?.querySelector('#tsoNflPropSelect');
  const control=modal?.querySelector('.tso-nfl-prop-control');
  if(!propSelect||!control) return;
  let host=control.querySelector('.tso-nfl-alt-control');
  if(!host){
    host=document.createElement('div');
    host.className='tso-nfl-alt-control';
    host.innerHTML=`<label class="tso-nfl-alt-label" for="tsoNflAltPropSelect">Alternate Line</label><div class="tso-nfl-alt-select-wrap"><select class="tso-nfl-alt-select" id="tsoNflAltPropSelect" aria-label="Select alternate player prop line"></select><span class="tso-nfl-alt-chevron" aria-hidden="true">▼</span></div><div class="tso-nfl-alt-readout"></div>`;
    const oddsStrip=control.querySelector('#tsoNflPropOdds');
    control.insertBefore(host,oddsStrip||null);
  }

  const key=propSelect.value;
  if(!SUPPORTED.has(key)){
    host.hidden=true;
    return;
  }
  const name=modalPlayerName(modal),team=modalTeam(modal),hit=findOddsPlayer(name,team);
  const slot=hit?.player?.odds?.[key];
  const choices=marketChoices(slot,key);
  host.hidden=false;
  const select=host.querySelector('#tsoNflAltPropSelect');
  let state=modalState.get(modal)||{};
  const sig=choices.map(choiceKey).join('||');
  const marketChanged=state.key!==key;

  if(state.sig!==sig||marketChanged){
    if(!choices.length){
      select.innerHTML='<option value="">Alternate sportsbook lines pending</option>';
      select.disabled=true;
      host.querySelector('.tso-nfl-alt-readout').innerHTML='<span>No alternate lines posted yet</span><b>—</b><em>Next odds refresh will update this</em>';
      modalState.set(modal,{key,sig,choices:[],selectedKey:''});
      return;
    }
    select.disabled=false;
    select.innerHTML=choices.map((c,i)=>`<option value="${i}">${esc(optionLabel(c,key))}</option>`).join('');
    const primaryLine=finite(slot?.line);
    let idx=choices.findIndex(c=>c.side==='over'&&primaryLine!=null&&c.line===primaryLine);
    if(idx<0) idx=0;
    const priorKey=!marketChanged?state.selectedKey:'';
    if(priorKey){
      const priorIdx=choices.findIndex(c=>choiceKey(c)===priorKey);
      if(priorIdx>=0) idx=priorIdx;
    }
    state={key,sig,choices,selectedKey:choiceKey(choices[idx])};
    modalState.set(modal,state);
    select.value=String(idx);
  }else{
    const idx=Math.max(0,choices.findIndex(c=>choiceKey(c)===state.selectedKey));
    select.value=String(idx);
  }

  state=modalState.get(modal)||state;
  const selectedChoice=state.choices?.find(c=>choiceKey(c)===state.selectedKey)||state.choices?.[Number(select.value)]||null;
  if(selectedChoice) renderChoice(modal,selectedChoice,key,name,team);

  if(!select.dataset.v892Bound){
    select.dataset.v892Bound='1';
    select.addEventListener('change',()=>{
      const current=modalState.get(modal);
      const choice=current?.choices?.[Number(select.value)]||null;
      if(!choice) return;
      current.selectedKey=choiceKey(choice);
      modalState.set(modal,current);
      renderChoice(modal,choice,propSelect.value,modalPlayerName(modal),modalTeam(modal));
    });
  }
  if(!propSelect.dataset.v892AltBound){
    propSelect.dataset.v892AltBound='1';
    propSelect.addEventListener('change',()=>{
      modalState.delete(modal);
      queueEnhance();
    });
  }
}

function enhance(){
  scheduled=false;
  if(!rootRef||!oddsData) return;
  rootRef.querySelectorAll('.ms-modal .tso-nfl-player-card-v72').forEach(card=>ensureAltControl(card.closest('.ms-modal')||card));
}

function queueEnhance(){
  if(scheduled||typeof document==='undefined') return;
  scheduled=true;
  if(typeof requestAnimationFrame==='function') requestAnimationFrame(enhance);
  else queueMicrotask(enhance);
}

export async function mountNflAltPropsV892(root=document.getElementById('nflView')){
  if(!root||typeof document==='undefined') return false;
  rootRef=root;
  ensureStyles();
  await loadOdds();
  if(observer) observer.disconnect();
  observer=new MutationObserver(queueEnhance);
  observer.observe(rootRef,{childList:true,subtree:true});
  if(!oddsEventBound){
    oddsEventBound=true;
    window.addEventListener('dw-nfl-odds-updated',async()=>{
      await loadOdds(true);
      modalState=new WeakMap();
      queueEnhance();
    });
  }
  queueEnhance();
  return true;
}

export const __V892_TEST__={PROP_META,marketChoices,optionLabel,estimateAltProb,fmtAmerican,buildAltLeg,gradeFromProbability};
