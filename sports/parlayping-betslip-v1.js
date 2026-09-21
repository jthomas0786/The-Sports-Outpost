let installed=false;
let clientPromise=null;
let lastBuild=null;

const SUPABASE_URL='https://hjhfbhpuuxnrexddplxd.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqaGZiaHB1dXhucmV4ZGRwbHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0OTY5ODQsImV4cCI6MjEwMjA3Mjk4NH0.6URv-aSJgFupp1dkO65AsTqPpZF_aUckczhxJZBWVJ0';

function readSlip(){
  try{const rows=JSON.parse(localStorage.getItem('dw_betslip')||'[]');return Array.isArray(rows)?rows:[];}catch{return [];}
}

function gameIdFor(row){return row?.gameId??row?.event_id??row?.eventId??row?.game_pk??row?.gamePk??row?.game??null;}
function candidateFor(row,index){
  return {
    id:row?.id||`tso-${index+1}`,
    sport:String(row?.sport||'NFL').toUpperCase(),
    player:row?.player||row?.player_name||'',
    market:row?.market||row?.prop_key||'',
    side:row?.side||'over',
    line:row?.line??null,
    gameId:gameIdFor(row),
    team:row?.team||null,
    originalText:legText(row),
  };
}

function legText(row){
  if(row?.kind==='firstinning')return `${row.game||''} first inning ${row.side||'over'} ${row.line??''} runs`.trim();
  const market=String(row?.market||row?.prop_key||'').trim();
  if(/^(atd|anytime td|anytime touchdown)$/i.test(market))return `${row?.player||row?.player_name||'Player'} anytime touchdown`;
  const side=String(row?.side||'over').toLowerCase();
  return `${row?.player||row?.player_name||'Player'} ${market} ${side} ${row?.line??''}`.replace(/\s+/g,' ').trim();
}

async function client(){
  if(!clientPromise){
    clientPromise=import('https://esm.sh/@supabase/supabase-js@2').then(({createClient})=>createClient(SUPABASE_URL,SUPABASE_ANON_KEY));
  }
  return clientPromise;
}

async function invokeBuilder(legs,options={}){
  if(!Array.isArray(legs)||!legs.length)return{ok:false,error:'Add at least one pick first.'};
  const sb=await client();
  const candidates=legs.slice(0,20).map(candidateFor);
  try{
    const {data,error}=await sb.functions.invoke('parlayping-build',{body:{
      candidates,
      desiredLegs:options.desiredLegs??Math.min(4,candidates.length),
      allowSameGame:options.allowSameGame===true,
      minProbability:options.minProbability??0,
      sports:options.sports||null,
      referenceTime:new Date().toISOString(),
    }});
    if(error){
      const detail=await error.context?.json?.().catch(()=>null);
      return{ok:false,error:detail?.error||error.message||'ParlayPing could not build this slip.',code:detail?.code||null};
    }
    if(!data?.ok)return{ok:false,error:data?.error||'ParlayPing could not build this slip.',code:data?.code||null};
    return data;
  }catch(error){return{ok:false,error:error?.message||'Could not reach ParlayPing.'};}
}

function ensureStyle(){
  if(document.getElementById('pp-builder-style'))return;
  const style=document.createElement('style');style.id='pp-builder-style';style.textContent=`
#ppBuilderBackdrop{position:fixed;inset:0;background:rgba(3,7,18,.78);backdrop-filter:blur(7px);z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:18px}
#ppBuilderBackdrop[hidden]{display:none!important}.ppb-card{width:min(680px,100%);max-height:min(820px,92vh);overflow:auto;background:#0b1220;border:1px solid rgba(34,197,94,.35);border-radius:22px;box-shadow:0 28px 90px rgba(0,0,0,.55);color:#f8fafc;padding:20px}.ppb-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.ppb-brand{font-size:22px;font-weight:900;letter-spacing:-.02em}.ppb-brand span{color:#22c55e}.ppb-sub{color:#94a3b8;font-size:13px;margin-top:4px}.ppb-close{border:0;background:#162033;color:#cbd5e1;border-radius:10px;width:36px;height:36px;font-size:21px;cursor:pointer}.ppb-legs{display:grid;gap:8px;margin:16px 0}.ppb-leg{display:flex;justify-content:space-between;gap:10px;padding:11px 12px;background:#101a2d;border:1px solid #1f2c42;border-radius:12px;font-size:13px}.ppb-prob{color:#86efac;font-weight:800;white-space:nowrap}.ppb-controls{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.ppb-control{display:grid;gap:5px;font-size:12px;color:#94a3b8}.ppb-control select{background:#101a2d;color:#fff;border:1px solid #2a3a54;border-radius:10px;padding:10px}.ppb-check{display:flex;gap:8px;align-items:center;margin:12px 0;color:#cbd5e1;font-size:13px}.ppb-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}.ppb-btn{border:0;border-radius:11px;padding:11px 15px;font-weight:800;cursor:pointer;background:#22c55e;color:#052e16}.ppb-btn.secondary{background:#162033;color:#e2e8f0}.ppb-btn:disabled{opacity:.55;cursor:wait}.ppb-status{margin-top:14px;padding:11px 12px;border-radius:11px;background:#101a2d;color:#cbd5e1;font-size:13px}.ppb-status.error{border:1px solid rgba(248,113,113,.45);color:#fecaca}.ppb-model{margin-top:12px;color:#86efac;font-size:13px;font-weight:800}.ppb-note{color:#94a3b8;font-size:12px;line-height:1.5;margin-top:8px}@media(max-width:560px){.ppb-controls{grid-template-columns:1fr}.ppb-card{padding:16px;border-radius:17px}}
  `;document.head.appendChild(style);
}

function ensureModal(){
  ensureStyle();let root=document.getElementById('ppBuilderBackdrop');if(root)return root;
  root=document.createElement('div');root.id='ppBuilderBackdrop';root.hidden=true;
  root.innerHTML=`<section class="ppb-card" role="dialog" aria-modal="true" aria-labelledby="ppBuilderTitle"><div class="ppb-head"><div><div class="ppb-brand" id="ppBuilderTitle">Build with <span>ParlayPing</span></div><div class="ppb-sub">Model-ranked betslip builder powered by the ParlayPing API</div></div><button class="ppb-close" id="ppBuilderClose" aria-label="Close">×</button></div><div id="ppBuilderLegs" class="ppb-legs"></div><div class="ppb-controls"><label class="ppb-control">Legs to build<select id="ppBuilderCount"></select></label><label class="ppb-control">Minimum model probability<select id="ppBuilderMin"><option value="0">Any supported probability</option><option value="0.5">50%+</option><option value="0.55">55%+</option><option value="0.6">60%+</option><option value="0.65">65%+</option></select></label></div><label class="ppb-check"><input id="ppBuilderSameGame" type="checkbox"> Allow multiple legs from the same game</label><div class="ppb-actions"><button id="ppBuilderRun" class="ppb-btn">Build my slip</button><button id="ppBuilderUse" class="ppb-btn secondary" hidden>Use this build</button></div><div id="ppBuilderStatus" class="ppb-status">ParlayPing will only use real picks currently in your TSO betslip.</div><div id="ppBuilderModel" class="ppb-model"></div><div class="ppb-note">ParlayPing will not invent a leg just to reach the requested count. Same-game combinations are excluded by default because their probabilities may be correlated.</div></section>`;
  document.body.appendChild(root);
  root.addEventListener('click',e=>{if(e.target===root)closeModal();});
  root.querySelector('#ppBuilderClose').addEventListener('click',closeModal);
  root.querySelector('#ppBuilderRun').addEventListener('click',runBuild);
  root.querySelector('#ppBuilderUse').addEventListener('click',useBuild);
  return root;
}

function setStatus(text,error=false){const el=document.getElementById('ppBuilderStatus');if(!el)return;el.textContent=text;el.classList.toggle('error',error);}
function closeModal(){const root=document.getElementById('ppBuilderBackdrop');if(root)root.hidden=true;}
function openModal(){
  const legs=readSlip();if(!legs.length){const note=document.getElementById('bsNote');if(note)note.textContent='Add at least one pick before opening ParlayPing.';return;}
  const root=ensureModal();lastBuild=null;root.querySelector('#ppBuilderUse').hidden=true;root.querySelector('#ppBuilderModel').textContent='';
  const list=root.querySelector('#ppBuilderLegs');list.innerHTML='';for(const leg of legs){const row=document.createElement('div');row.className='ppb-leg';const name=document.createElement('span');name.textContent=legText(leg);row.appendChild(name);list.appendChild(row);}
  const count=root.querySelector('#ppBuilderCount');count.innerHTML='';const max=Math.min(10,legs.length);for(let n=1;n<=max;n++){const option=document.createElement('option');option.value=String(n);option.textContent=`${n} leg${n===1?'':'s'}`;if(n===max)option.selected=true;count.appendChild(option);}
  setStatus('Ready. ParlayPing will rank the supported pregame picks already in this slip.');root.hidden=false;
}

async function runBuild(){
  const root=ensureModal(),button=root.querySelector('#ppBuilderRun'),legs=readSlip();button.disabled=true;button.textContent='Building…';root.querySelector('#ppBuilderUse').hidden=true;root.querySelector('#ppBuilderModel').textContent='';
  const desiredLegs=Number(root.querySelector('#ppBuilderCount').value||legs.length);const minProbability=Number(root.querySelector('#ppBuilderMin').value||0);const allowSameGame=root.querySelector('#ppBuilderSameGame').checked;
  setStatus('ParlayPing is checking the current model data for every candidate…');
  const result=await invokeBuilder(legs,{desiredLegs,minProbability,allowSameGame});button.disabled=false;button.textContent='Build my slip';
  if(!result?.ok){setStatus(result?.error||'ParlayPing could not build this slip.',true);return;}
  lastBuild=result.build||null;const selected=lastBuild?.selectedLegs||[];
  const list=root.querySelector('#ppBuilderLegs');list.innerHTML='';
  for(const leg of selected){const row=document.createElement('div');row.className='ppb-leg';const name=document.createElement('span');name.textContent=legText(leg);const prob=document.createElement('span');prob.className='ppb-prob';prob.textContent=Number.isFinite(leg.probabilityPct)?`${leg.probabilityPct}%`:'';row.append(name,prob);list.appendChild(row);}
  if(lastBuild?.buildable){setStatus(`Built ${lastBuild.selectedCount} legs using ${lastBuild.strategy.replaceAll('-',' ')}.`);root.querySelector('#ppBuilderUse').hidden=false;if(Number.isFinite(lastBuild.combinedProbabilityPct))root.querySelector('#ppBuilderModel').textContent=`Combined model estimate: ${lastBuild.combinedProbabilityPct}%`;}
  else{setStatus(lastBuild?.note||'There were not enough eligible picks to fill this build.',true);if(selected.length)root.querySelector('#ppBuilderUse').hidden=false;}
}

function useBuild(){
  const selected=lastBuild?.selectedLegs||[];if(!selected.length)return;
  const original=readSlip();const ids=new Set(selected.map(row=>String(row.id||'')));const next=original.filter((row,index)=>ids.has(String(row?.id||`tso-${index+1}`)));
  if(!next.length)return setStatus('Could not match the selected build back to your TSO betslip.',true);
  localStorage.setItem('dw_betslip',JSON.stringify(next));window.renderBetslipBar?.();window.syncAddButtons?.();setStatus(`Updated your TSO betslip to the ${next.length}-leg ParlayPing build.`);setTimeout(closeModal,700);
}

function renameButton(){
  const btn=document.getElementById('bsText');if(!btn)return false;
  if(btn.tagName==='INPUT')btn.value='Build with ParlayPing';else btn.textContent='Build with ParlayPing';
  btn.setAttribute('aria-label','Build this betslip with ParlayPing');return true;
}

export function installParlayPingBetslipV1(){
  if(installed||typeof document==='undefined')return;installed=true;renameButton();requestAnimationFrame(renameButton);
  document.addEventListener('click',e=>{const btn=e.target?.closest?.('#bsText');if(!btn)return;e.preventDefault();e.stopImmediatePropagation();renameButton();openModal();},true);
}

export const __PARLAYPING_BETSLIP_TEST__={readSlip,candidateFor,legText,invokeBuilder,gameIdFor};
