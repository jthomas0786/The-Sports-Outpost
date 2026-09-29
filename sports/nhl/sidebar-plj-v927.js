const ITEM_ATTR='data-nhl-plj';
let installed=false,observer=null,retryTimer=null;

function panelForNhl(){
  const head=document.querySelector('#sbSportAccordion .sb-sport-head[data-sport="nhl"]');
  return head?.closest('.sb-sport-block')?.querySelector('.sb-sport-panel')||null;
}

function isPanelOpen(){return !!document.getElementById('hkPuckLineJesusPanel');}

function syncActive(){
  document.querySelectorAll(`#sbSportAccordion .sb-sub-item[${ITEM_ATTR}]`).forEach(btn=>btn.classList.toggle('is-active',isPanelOpen()));
}

function openPuckLineJesus(){
  window.DW_nhlPendingPlj=true;
  if(location.hash!=='#nhl') location.hash='nhl';
  const started=Date.now();
  const attempt=()=>{
    if(typeof window.DW_openPuckLineJesus==='function'){
      window.DW_nhlPendingPlj=false;
      window.DW_openPuckLineJesus();
      syncActive();
      return;
    }
    if(Date.now()-started<8000) retryTimer=setTimeout(attempt,100);
  };
  attempt();
}

function ensureItem(){
  const panel=panelForNhl();
  if(!panel)return;
  let btn=panel.querySelector(`.sb-sub-item[${ITEM_ATTR}]`);
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';
    btn.className='sb-sub-item';
    btn.setAttribute(ITEM_ATTR,'1');
    btn.textContent='Puck Line Jesus';
    btn.addEventListener('click',openPuckLineJesus);
    const live=panel.querySelector('.sb-sub-item[data-nhl-tab="live"]');
    if(live) live.insertAdjacentElement('afterend',btn);
    else panel.appendChild(btn);
  }
  syncActive();
}

function sync(){ensureItem();syncActive();}

export function installNhlSidebarPuckLineJesusV927(){
  if(installed){sync();return;}
  installed=true;
  const start=()=>{
    sync();
    observer=new MutationObserver(()=>queueMicrotask(sync));
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('hashchange',()=>setTimeout(sync,0));
    window.DW_openPuckLineJesusFromSidebar=openPuckLineJesus;
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
}
