import {installNhlPlayerModalV911} from './player-modal-v911.js?v=90.11';

let installed=false,observer=null,slatePromise=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{const x=Number(String(v??'').replace(/[^0-9.+-]/g,''));return Number.isFinite(x)?x:null;};

function ensureStyle(){
 if(typeof document==='undefined'||document.getElementById('nhl-player-modal-v912'))return;
 const l=document.createElement('link');l.id='nhl-player-modal-v912';l.rel='stylesheet';l.href='./sports/nhl/player-modal-v912.css?v=90.12';document.head.appendChild(l);
}
async function slateDoc(){
 if(slatePromise)return slatePromise;
 slatePromise=fetch(`./slates/nhl.json?v=90.12-${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null).finally(()=>setTimeout(()=>slatePromise=null,30000));
 return slatePromise;
}
function cleanPlayerName(card){
 const h=card.querySelector('.who h2');if(!h)return '';
 const c=h.cloneNode(true);c.querySelectorAll('span').forEach(x=>x.remove());return c.textContent.trim();
}
function subParts(card){
 const parts=String(card.querySelector('.who .sub')?.textContent||'').split('·').map(x=>x.trim()).filter(Boolean);
 return {opponent:String(parts.find(x=>/^vs\s+/i.test(x))||'').replace(/^vs\s+/i,'').trim(),team:parts.at(-1)||''};
}
function headerStat(card,label){
 for(const d of card.querySelectorAll('.hdr-stats>div'))if(String(d.querySelector('small')?.textContent||'').trim().toUpperCase()===label.toUpperCase())return String(d.querySelector('b')?.textContent||'').trim();
 return '—';
}
function selectedMeta(card){
 const s=card.querySelector('#tsoNhlPropSelect'),opt=s?.selectedOptions?.[0];return {key:s?.value||'atg',label:opt?.textContent?.trim()||'Anytime Goal'};
}
function probability(card){
 const t=String(card.querySelector('.hk-grade-ring .sgr-pv')?.textContent||'').trim();const x=num(t);return x==null?null:x/100;
}
function grade(card){return String(card.querySelector('.hk-grade-ring .sgr-gd2')?.textContent||'—').trim();}
function playerPosition(card){return String(card.querySelector('.tso-nfl-hdr-badge')?.textContent||'').split('·')[0].trim();}
function fmtDate(v){
 const d=new Date(v||'');if(!Number.isFinite(d.getTime()))return null;
 try{return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}catch{return d.toISOString().slice(0,10);}
}
function normalizeDates(card){
 for(const el of card.querySelectorAll('.tso-nhl-history-bars .xd')){
  const m=String(el.textContent||'').trim().match(/^(\d{1,2})[\/-](\d{1,2})$/);if(m)el.textContent=`${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
 }
}
function decorateVerdict(card){
 const v=card.querySelector('.tso-nhl-verdict');if(!v)return;
 v.classList.add('verdict');
 const right=v.children[1];if(!right)return;right.classList.add('vd-right');
 const h=right.querySelector('h3'),p=right.querySelector('p');h?.classList.add('vd-head');p?.classList.add('vd-body');
 right.querySelector(':scope>span')?.classList.add('tso-nhl-verdict-kicker');
 const meta=selectedMeta(card),name=cleanPlayerName(card),last=name.split(/\s+/).at(-1)||name,{opponent}=subParts(card),prob=probability(card),pos=playerPosition(card),l5=headerStat(card,'L5 AVG'),season=headerStat(card,'SEASON AVG');
 if(p&&prob!=null)p.textContent=`${Math.round(prob*100)}% ${meta.label.toLowerCase()} probability for ${last}. ${pos||'NHL'} · ${season} season avg · ${l5} L5 avg · vs ${opponent||'opponent'}.`;
 let row=right.querySelector('.vd-honesty-row');if(!row){row=document.createElement('div');row.className='vd-honesty-row';right.appendChild(row);}
 row.innerHTML=`<span class="pv-interval">${esc(meta.label)}</span><span class="pv-pa-note">TSO model</span><span class="pv-cal-label pv-cal-underconfident">TSO MODEL</span>`;
}
function slipHasLeg(id){try{return (JSON.parse(localStorage.getItem('dw_betslip')||'[]')||[]).some(x=>x?.id===id);}catch{return false;}}
function toggleLegLocal(leg){
 if(typeof window.toggleLeg==='function'){window.toggleLeg(leg);return;}
 let rows=[];try{rows=JSON.parse(localStorage.getItem('dw_betslip')||'[]')||[];}catch{}
 const i=rows.findIndex(x=>x?.id===leg.id);if(i>=0)rows.splice(i,1);else rows.push(leg);
 localStorage.setItem('dw_betslip',JSON.stringify(rows));window.renderBetslipBar?.();window.syncAddButtons?.();
}
async function resolveGamePlayer(card){
 const doc=await slateDoc();if(!doc)return null;const name=cleanPlayerName(card),{team,opponent}=subParts(card);
 for(const g of doc.games||[]){
  if(team&&![g.away?.abbr,g.home?.abbr].includes(team))continue;
  if(opponent&&![g.away?.abbr,g.home?.abbr].includes(opponent))continue;
  const p=(g.players||[]).find(x=>String(x.name||'').toLowerCase()===name.toLowerCase()&&(!team||String(x.team||'').toUpperCase()===team.toUpperCase()));
  if(p)return {g,p};
 }
 return null;
}
async function renderSlip(card){
 const first=card.querySelector('.tso-nhl-scroll>.sec:first-child');if(!first)return;
 first.classList.add('tso-nhl-primary-sec');let host=first.querySelector('#tsoNhlSlipHost');
 if(!host){host=document.createElement('div');host.id='tsoNhlSlipHost';first.appendChild(host);}
 const meta=selectedMeta(card),line=meta.key==='atg'?.5:num(headerStat(card,'BOOK LINE')),prob=probability(card),gkey=grade(card),name=cleanPlayerName(card),pair=await resolveGamePlayer(card),sig=[name,meta.key,line,prob,gkey,pair?.g?.id||''].join('|');
 if(host.dataset.sig===sig)return;host.dataset.sig=sig;
 if(line==null){host.innerHTML='<button class="cta tso-nhl-slip-cta tso-nhl-prop-disabled" type="button" disabled>SPORTSBOOK LINE PENDING</button>';return;}
 if(prob==null){host.innerHTML='<button class="cta tso-nhl-slip-cta tso-nhl-prop-disabled" type="button" disabled>TSO SIGNAL PENDING</button>';return;}
 const {team,opponent}=subParts(card),market=meta.key==='atg'?'ATG':meta.label,price=num(card.querySelector('.tso-nfl-prop-odds-price')?.textContent),book=String(card.querySelector('.tso-nfl-prop-odds-market')?.textContent||'').split('·')[0].trim()||null,id=`${name}|${market}|${line}`;
 const leg={id,kind:'prop',sport:'nhl',prop_key:meta.key,side:'over',player:name,player_name:name,market,line,pct:Number((prob*100).toFixed(1)),grade:gkey,game:pair?`${pair.g.away?.abbr} @ ${pair.g.home?.abbr}`:`${team} vs ${opponent}`,game_pk:pair?.g?.id||null,event_id:pair?.g?.id||null,player_id:pair?.p?.id||null,price,book,slate_date:fmtDate(pair?.g?.startTime||pair?.g?.startTimeUTC)};
 const label=`Add ${line} ${meta.label} to Slip`,on=slipHasLeg(id);host.innerHTML=`<button class="add-leg cta tso-nhl-slip-cta ${on?'in-slip':''}" type="button">${on?'✓ In Slip':esc(label)}</button>`;
 host.querySelector('button')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggleLegLocal(leg);host.dataset.sig='';renderSlip(card);});
}
function enhance(card){
 if(!card)return;card.classList.add('tso-nhl-player-card-v912');normalizeDates(card);decorateVerdict(card);renderSlip(card);
}
function scan(){document.querySelectorAll('.tso-nhl-player-card-v911').forEach(enhance);}
export function installNhlPlayerModalV912(host=document.getElementById('nhlView')){
 ensureStyle();installNhlPlayerModalV911(host);if(installed)return;installed=true;
 observer=new MutationObserver(()=>queueMicrotask(scan));observer.observe(document.body,{childList:true,subtree:true});
 document.addEventListener('change',e=>{if(e.target?.id==='tsoNhlPropSelect')setTimeout(scan,0);});scan();
}
export const __NHL_PLAYER_MODAL_V912_TEST__={cleanPlayerName,subParts,headerStat,selectedMeta,probability,fmtDate};
