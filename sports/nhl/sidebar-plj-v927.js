import {NHL_PLJ_ATTR,closeNhlFeaturePanels,installNhlSidebarStateV931,setExclusiveNhlSidebarActive} from './sidebar-state-v931.js?v=90.33';
const ITEM_ATTR=NHL_PLJ_ATTR;
let installed=false,observer=null,retryTimer=null,queued=false;

function panelForNhl(){
  const head=document.querySelector('#sbSportAccordion .sb-sport-head[data-sport="nhl"]');
  return head?.closest('.sb-sport-block')?.querySelector('.sb-sport-panel')||null;
}

function isPanelOpen(){return !!document.getElementById('hkGameEdgePanel');}
function syncActive(){setExclusiveNhlSidebarActive(ITEM_ATTR,isPanelOpen());}

function openPuckLineJesus(){
  closeNhlFeaturePanels('plj');
  window.DW_nhlPendingGameEdge=true;
  if(location.hash!=='#nhl') location.hash='nhl';
  if(retryTimer) clearTimeout(retryTimer);
  const started=Date.now();
  const attempt=()=>{
    if(typeof window.DW_openGameEdge==='function'){
      retryTimer=null;
      window.DW_nhlPendingGameEdge=false;
      window.DW_openGameEdge();
      syncActive();
      return;
    }
    if(Date.now()-started<8000) retryTimer=setTimeout(attempt,100);
    else retryTimer=null;
  };
  attempt();
}

function ensureItem(){
  const panel=panelForNhl();
  if(!panel)return;
  let btn=panel.querySelector('.sb-sub-item[data-nhl-game-edge],'+`.sb-sub-item[${ITEM_ATTR}]`);
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';
    btn.className='sb-sub-item';
    btn.setAttribute(ITEM_ATTR,'1');
    btn.setAttribute('data-nhl-game-edge','1');
    btn.textContent='Game Edge';
    btn.addEventListener('click',openPuckLineJesus);
    const live=panel.querySelector('.sb-sub-item[data-nhl-tab="live"]');
    if(live) live.insertAdjacentElement('afterend',btn);
    else panel.appendChild(btn);
  }
  syncActive();
}

function sync(){ensureItem();syncActive();}
function queueSync(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;sync();});
}
function nodeTouchesSidebarOrPlj(node){
  if(node?.nodeType!==1)return false;
  return node.matches?.('#sbSportAccordion,#hkPuckLineJesusPanel,.sb-sport-block,.sb-sport-panel')||
    !!node.querySelector?.('#sbSportAccordion,#hkPuckLineJesusPanel,.sb-sport-block,.sb-sport-panel');
}
function mutationNeedsSync(records){
  return records.some(r=>r.type==='childList'&&(
    [...r.addedNodes].some(nodeTouchesSidebarOrPlj)||
    [...r.removedNodes].some(nodeTouchesSidebarOrPlj)
  ));
}

export function installNhlSidebarPuckLineJesusV927(){
  if(installed){queueSync();return;}
  installed=true;
  const start=()=>{
    installNhlSidebarStateV931();
    sync();
    observer=new MutationObserver(records=>{if(mutationNeedsSync(records))queueSync();});
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('hashchange',()=>setTimeout(queueSync,0));
    window.DW_openGameEdgeFromSidebar=openPuckLineJesus;
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
}
