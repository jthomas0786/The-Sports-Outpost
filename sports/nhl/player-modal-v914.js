import {installNhlPlayerModalV913} from './player-modal-v913.js?v=90.13';

let installed=false,observer=null,queued=false;

function useNflRecentBars(card){
 if(!card)return;
 card.classList.add('tso-nhl-player-card-v915');
 const chart=card.querySelector('.tso-nhl-history-bars');
 if(!chart)return;
 for(const marker of chart.querySelectorAll('.tso-nhl-line-marker')) marker.remove();
 for(const bar of chart.querySelectorAll('.tso-nhl-game-bar')){
  const h=bar.style.getPropertyValue('--nhl-bar-h')||bar.style.height||'5%';
  bar.classList.remove('tso-nhl-game-bar');
  bar.classList.add('bar');
  bar.removeAttribute('style');
  bar.style.height=h;
 }
}
function scan(){queued=false;document.querySelectorAll('.tso-nhl-player-card-v911,.tso-nhl-player-card-v912,.tso-nhl-player-card-v913,.tso-nhl-player-card-v914').forEach(useNflRecentBars);}
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

export const __NHL_PLAYER_MODAL_V914_TEST__={useNflRecentBars};
