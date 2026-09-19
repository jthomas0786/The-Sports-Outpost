import { __NFL_PLAYER_PROP_TOOL_V923_TEST__ as base } from './player-prop-tool-v923.js?v=92.3';

let installed=false;
let observer=null;
let searchTimer=null;
let filtersOpen=false;
let restoreSearchFocus=false;
let restoreCaret=null;

const state=base?.state;

function triggerToolRender(){
  const market=document.getElementById('nflPptMarket');
  if(market){
    market.dispatchEvent(new Event('change',{bubbles:true}));
    return;
  }
  const mode=document.getElementById('nflPptMode');
  mode?.dispatchEvent(new Event('change',{bubbles:true}));
}

function patchSearchInput(){
  const input=document.getElementById('nflPptSearch');
  if(!input||input.dataset.nflPptStableSearch==='1')return;

  // v92.3 rendered the entire tool on every input event. That detached the
  // search box while a user was typing and also collapsed the Filters panel.
  // Clone once to remove that direct listener, then drive the same tool state
  // through a short debounce so the actual filter logic stays authoritative.
  const stable=input.cloneNode(true);
  stable.dataset.nflPptStableSearch='1';
  input.replaceWith(stable);

  stable.addEventListener('input',e=>{
    if(state)state.search=e.target.value;
    restoreSearchFocus=true;
    restoreCaret=e.target.selectionStart;
    clearTimeout(searchTimer);
    searchTimer=setTimeout(triggerToolRender,250);
  });

  if(restoreSearchFocus&&filtersOpen){
    requestAnimationFrame(()=>{
      if(!stable.isConnected)return;
      stable.focus({preventScroll:true});
      const pos=Math.min(Number.isFinite(restoreCaret)?restoreCaret:stable.value.length,stable.value.length);
      try{stable.setSelectionRange(pos,pos);}catch{}
      restoreSearchFocus=false;
    });
  }
}

function stabilizeFilters(){
  const panel=document.getElementById('nflPptFilterPanel');
  if(panel&&filtersOpen)panel.hidden=false;
  patchSearchInput();
}

function onClick(e){
  if(e.target.closest?.('#nflPptFilters')){
    filtersOpen=!filtersOpen;
    queueMicrotask(stabilizeFilters);
    return;
  }
  if(e.target.closest?.('#nflPptClear')){
    // Keep the panel open after Clear so the user can immediately set a new
    // search/market/team filter instead of reopening Filters every time.
    filtersOpen=true;
    queueMicrotask(stabilizeFilters);
  }
}

export function installNflPlayerPropToolFilterStabilityV924(){
  if(installed)return;
  installed=true;
  document.addEventListener('click',onClick,true);
  observer=new MutationObserver(()=>stabilizeFilters());
  observer.observe(document.body,{childList:true,subtree:true});
  stabilizeFilters();
}
