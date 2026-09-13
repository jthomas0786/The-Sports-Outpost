import {installNhlPlayerModalV912} from './player-modal-v912.js?v=90.12';

let installed=false,observer=null,queued=false;

function ensureStyle(){
 if(typeof document==='undefined'||document.getElementById('nhl-player-modal-v913'))return;
 const l=document.createElement('link');
 l.id='nhl-player-modal-v913';
 l.rel='stylesheet';
 l.href='./sports/nhl/player-modal-v913.css?v=90.13';
 document.head.appendChild(l);
}
function text(el){return String(el?.textContent||'').trim();}
function pendingProbability(card){
 const raw=text(card.querySelector('.hk-grade-ring .sgr-pv'));
 return !/\d/.test(raw);
}
function sportsbookPending(card){
 if(card.querySelector('.tso-nfl-prop-odds-pending'))return true;
 for(const d of card.querySelectorAll('.hdr-stats>div')){
  if(text(d.querySelector('small')).toUpperCase()==='BOOK LINE'){
   const v=text(d.querySelector('b'));
   return !/\d/.test(v);
  }
 }
 return false;
}
function selectedLabel(card){return text(card.querySelector('#tsoNhlPropSelect')?.selectedOptions?.[0])||'Selected prop';}
function fixCard(card){
 if(!card)return;
 card.classList.add('tso-nhl-player-card-v913');
 if(pendingProbability(card)){
  const body=card.querySelector('.tso-nhl-verdict .vd-body,.tso-nhl-verdict p');
  const copy='Fresh confirmed lineup, goalie and model evidence required before a probability is shown.';
  if(body&&text(body)!==copy)body.textContent=copy;
 }
 if(sportsbookPending(card)){
  const host=card.querySelector('#tsoNhlSlipHost');
  if(host){
   let btn=host.querySelector('button');
   if(!btn){btn=document.createElement('button');host.replaceChildren(btn);}
   btn.className='cta tso-nhl-slip-cta tso-nhl-prop-disabled';
   btn.type='button';
   btn.disabled=true;
   const copy=`SPORTSBOOK ${selectedLabel(card).toUpperCase()} LINE PENDING`;
   if(text(btn)!==copy)btn.textContent=copy;
  }
 }
}
function scan(){queued=false;document.querySelectorAll('.tso-nhl-player-card-v912,.tso-nhl-player-card-v911').forEach(fixCard);}
function queueScan(){if(queued)return;queued=true;queueMicrotask(scan);}
export function installNhlPlayerModalV913(host=document.getElementById('nhlView')){
 ensureStyle();
 installNhlPlayerModalV912(host);
 if(installed)return;
 installed=true;
 observer=new MutationObserver(records=>{
  if(records.some(r=>r.type==='childList'||r.type==='characterData'))queueScan();
 });
 observer.observe(document.body,{childList:true,subtree:true,characterData:true});
 document.addEventListener('change',e=>{if(e.target?.id==='tsoNhlPropSelect')setTimeout(queueScan,0);});
 queueScan();
}
export const __NHL_PLAYER_MODAL_V913_TEST__={pendingProbability,sportsbookPending,selectedLabel};
