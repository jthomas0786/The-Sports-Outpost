import {installNhlPlayerModalV913} from './player-modal-v913.js?v=90.13';

let installed=false,observer=null,queued=false;

function setImp(el,prop,value){ if(el) el.style.setProperty(prop,value,'important'); }
function lockRecentBars(card){
 if(!card)return;
 card.classList.add('tso-nhl-player-card-v914');
 const chart=card.querySelector('.tso-nhl-history-bars');
 if(!chart)return;
 setImp(chart,'width','100%');
 setImp(chart,'display','flex');
 setImp(chart,'align-items','stretch');
 setImp(chart,'overflow','visible');
 for(const col of chart.querySelectorAll(':scope > .b')){
  setImp(col,'position','relative');
  setImp(col,'display','grid');
  setImp(col,'grid-template-rows','minmax(0,1fr) 34px');
  setImp(col,'flex','1 1 0');
  setImp(col,'min-width','0');
  setImp(col,'height','100%');
  setImp(col,'align-items','stretch');
  setImp(col,'justify-items','stretch');
  const plot=col.querySelector('.plot');
  setImp(plot,'position','relative');
  setImp(plot,'display','block');
  setImp(plot,'width','100%');
  setImp(plot,'min-width','0');
  setImp(plot,'height','100%');
  setImp(plot,'min-height','0');
  setImp(plot,'padding-left','0');
  setImp(plot,'padding-right','0');
  setImp(plot,'overflow','visible');
  const bar=plot?.querySelector('.tso-nhl-game-bar');
  setImp(bar,'position','absolute');
  setImp(bar,'left','0');
  setImp(bar,'right','0');
  setImp(bar,'bottom','0');
  setImp(bar,'width','auto');
  setImp(bar,'max-width','none');
  setImp(bar,'min-width','0');
  setImp(bar,'margin','0');
  setImp(bar,'transform','none');
  setImp(bar,'display','block');
 }
}
function scan(){queued=false;document.querySelectorAll('.tso-nhl-player-card-v911,.tso-nhl-player-card-v912,.tso-nhl-player-card-v913').forEach(lockRecentBars);}
function queueScan(){if(queued)return;queued=true;requestAnimationFrame(scan);}

export function installNhlPlayerModalV914(host=document.getElementById('nhlView')){
 installNhlPlayerModalV913(host);
 if(installed)return;
 installed=true;
 observer=new MutationObserver(records=>{
  if(records.some(r=>r.type==='childList'&&([...r.addedNodes].some(n=>n.nodeType===1))))queueScan();
 });
 observer.observe(document.body,{childList:true,subtree:true});
 document.addEventListener('change',e=>{if(e.target?.id==='tsoNhlPropSelect')queueScan();});
 document.addEventListener('click',e=>{if(e.target?.closest?.('[data-nhl-chart-range],[data-nhl-chart-venue]'))setTimeout(queueScan,0);},true);
 queueScan();
}

export const __NHL_PLAYER_MODAL_V914_TEST__={lockRecentBars};
