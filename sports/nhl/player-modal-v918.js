import {installNhlPlayerModalV917} from './player-modal-v917.js?v=90.17';

let installed=false,observer=null,queued=false;

function ensureStyle(){
 if(typeof document==='undefined'||document.getElementById('nhl-player-modal-v918'))return;
 const l=document.createElement('link');
 l.id='nhl-player-modal-v918';
 l.rel='stylesheet';
 l.href='./sports/nhl/player-modal-v918.css?v=90.18';
 document.head.appendChild(l);
}
function enhance(card){
 if(!card)return;
 card.classList.add('tso-nhl-player-card-v918');
}
function scan(){
 queued=false;
 document.querySelectorAll('.tso-nhl-player-card-v911,.tso-nhl-player-card-v912,.tso-nhl-player-card-v913').forEach(enhance);
}
function queue(){if(queued)return;queued=true;requestAnimationFrame(scan);}

export function installNhlPlayerModalV918(host=document.getElementById('nhlView')){
 installNhlPlayerModalV917(host);
 ensureStyle();
 if(installed){queue();return;}
 installed=true;
 observer=new MutationObserver(records=>{
  if(records.some(r=>r.type==='childList'&&[...r.addedNodes].some(n=>n.nodeType===1)))queue();
 });
 observer.observe(document.body,{childList:true,subtree:true});
 document.addEventListener('change',e=>{if(e.target?.id==='tsoNhlPropSelect')setTimeout(queue,0);});
 document.addEventListener('click',e=>{if(e.target?.closest?.('[data-nhl-chart-range],[data-nhl-chart-venue]'))setTimeout(queue,0);},true);
 queue();
}

export const __NHL_PLAYER_MODAL_V918_TEST__={enhance};
