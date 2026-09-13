import {installNhlPlayerModalV913} from './player-modal-v913.js?v=90.13';

let installed=false,observer=null,queued=false;

function imp(el,prop,value){if(el)el.style.setProperty(prop,value,'important');}
function nflBarPaint(col,bar){
 if(col.classList.contains('td2')){
  imp(bar,'background','linear-gradient(180deg,#f5c842,#c99411)');
  imp(bar,'box-shadow','0 0 12px rgba(245,200,66,.24)');
 }else if(col.classList.contains('on')){
  imp(bar,'background','linear-gradient(180deg,#3ee37a,#22c55e)');
  imp(bar,'box-shadow','0 0 12px rgba(62,227,122,.28)');
 }else{
  imp(bar,'background','linear-gradient(180deg,rgba(45,127,255,.55),rgba(45,127,255,.20))');
  imp(bar,'box-shadow','none');
 }
}
function useNflRecentBars(card){
 if(!card)return;
 card.classList.add('tso-nhl-player-card-v916');
 const chart=card.querySelector('.tso-nhl-history-bars');
 if(!chart)return;
 imp(chart,'display','flex');
 imp(chart,'align-items','stretch');
 imp(chart,'width','100%');
 imp(chart,'min-width','0');
 imp(chart,'overflow','visible');
 for(const marker of chart.querySelectorAll('.tso-nhl-line-marker'))marker.remove();
 for(const col of chart.querySelectorAll(':scope > .b')){
  imp(col,'position','relative');
  imp(col,'display','grid');
  imp(col,'grid-template-rows','minmax(0,1fr) 34px');
  imp(col,'flex','1 1 0');
  imp(col,'width','auto');
  imp(col,'min-width','0');
  imp(col,'height','100%');
  imp(col,'align-items','stretch');
  imp(col,'justify-items','stretch');
  const plot=col.querySelector('.plot');
  if(!plot)continue;
  imp(plot,'position','relative');
  imp(plot,'display','flex');
  imp(plot,'align-items','flex-end');
  imp(plot,'justify-content','stretch');
  imp(plot,'width','100%');
  imp(plot,'min-width','0');
  imp(plot,'height','100%');
  imp(plot,'min-height','0');
  imp(plot,'padding-left','0');
  imp(plot,'padding-right','0');
  imp(plot,'overflow','visible');
  const bar=plot.querySelector('.tso-nhl-game-bar,.bar');
  if(!bar)continue;
  const h=bar.style.getPropertyValue('--nhl-bar-h')||bar.style.height||'5%';
  bar.classList.remove('tso-nhl-game-bar');
  bar.classList.add('bar');
  bar.removeAttribute('style');
  imp(bar,'position','relative');
  imp(bar,'display','block');
  imp(bar,'box-sizing','border-box');
  imp(bar,'width','100%');
  imp(bar,'max-width','none');
  imp(bar,'min-width','0');
  imp(bar,'height',h);
  imp(bar,'min-height','5px');
  imp(bar,'margin','0');
  imp(bar,'transform','none');
  imp(bar,'border-radius','5px 5px 0 0');
  imp(bar,'flex','1 1 100%');
  nflBarPaint(col,bar);
  const value=bar.querySelector('.v');
  if(value){
   imp(value,'position','absolute');
   imp(value,'left','0');
   imp(value,'right','0');
   imp(value,'top','-17px');
   imp(value,'transform','none');
   imp(value,'width','100%');
   imp(value,'text-align','center');
   imp(value,'color','#fff');
   imp(value,'white-space','nowrap');
  }
 }
}
function scan(){queued=false;document.querySelectorAll('.tso-nhl-player-card-v911,.tso-nhl-player-card-v912,.tso-nhl-player-card-v913,.tso-nhl-player-card-v914,.tso-nhl-player-card-v915,.tso-nhl-player-card-v916').forEach(useNflRecentBars);}
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

export const __NHL_PLAYER_MODAL_V914_TEST__={useNflRecentBars,nflBarPaint};
