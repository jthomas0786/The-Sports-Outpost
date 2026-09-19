import { __NFL_PLAYER_PROP_TOOL_V923_TEST__ as base } from './player-prop-tool-v923.js?v=92.3';

let installed=false;
let observer=null;
let filtersOpen=false;
let playerModalOpen=false;
let restoreQueued=false;

const state=base?.state;
const norm=v=>String(v||'').toLowerCase().replace(/\./g,'').replace(/['’]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

function filterVisibleRows(query){
  const tool=document.getElementById('nflPlayerPropTool');
  if(!tool)return;
  const q=norm(query);
  let shown=0;
  for(const row of tool.querySelectorAll('tbody tr')){
    const match=!q||norm(row.textContent).includes(q);
    row.hidden=!match;
    if(match)shown++;
  }
  const count=tool.querySelector('.nfl-ppt-head-stat b');
  if(count)count.textContent=String(shown);
}

function patchSearchInput(){
  const input=document.getElementById('nflPptSearch');
  if(!input||input.dataset.nflPptStableSearch==='1')return;

  // v92.3 rebuilt the entire Player Prop Tool on every keystroke. That detached
  // the input, collapsed Filters, and could interrupt the next control action.
  // Replace only this input once so typing filters the already-rendered rows in
  // place. State still updates, so the next normal market/team/game render uses
  // the exact same search term and remains authoritative.
  const stable=input.cloneNode(true);
  stable.dataset.nflPptStableSearch='1';
  input.replaceWith(stable);
  stable.addEventListener('input',e=>{
    if(state)state.search=e.target.value;
    filterVisibleRows(e.target.value);
  });
}

function restoreAfterPlayerModal(){
  const root=document.getElementById('nflView');
  if(!root)return;
  const modal=root.querySelector('[data-nfl-close-modal],.tso-nfl-player-card-v70,.tso-nfl-player-card-v72');
  if(modal){playerModalOpen=true;return;}
  if(!playerModalOpen||root.querySelector('#nflPlayerPropTool')||restoreQueued)return;
  restoreQueued=true;
  setTimeout(()=>{
    restoreQueued=false;
    const liveRoot=document.getElementById('nflView');
    if(!liveRoot)return;
    const stillModal=liveRoot.querySelector('[data-nfl-close-modal],.tso-nfl-player-card-v70,.tso-nfl-player-card-v72');
    if(stillModal)return;
    if(liveRoot.querySelector('#nflPlayerPropTool')){playerModalOpen=false;return;}
    const trigger=document.getElementById('nflPlayerPropToolBtn');
    // v92.3 deliberately keeps this nav item active while its canonical NFL
    // Player Modal is open. Clicking it after the modal closes reuses the same
    // tool opener and stashes the freshly rendered base page again.
    if(trigger?.classList.contains('is-active'))trigger.click();
    playerModalOpen=false;
  },80);
}

function stabilize(){
  const panel=document.getElementById('nflPptFilterPanel');
  if(panel&&filtersOpen)panel.hidden=false;
  patchSearchInput();
  if(state?.search)filterVisibleRows(state.search);
  restoreAfterPlayerModal();
}

function onClick(e){
  if(e.target.closest?.('#nflPptFilters')){
    filtersOpen=!filtersOpen;
    queueMicrotask(stabilize);
    return;
  }
  if(e.target.closest?.('#nflPptClear')){
    // Keep Filters open after Clear; v92.3 handles the actual state reset/render.
    filtersOpen=true;
    queueMicrotask(stabilize);
  }
}

export function installNflPlayerPropToolFilterStabilityV924(){
  if(installed)return;
  installed=true;
  document.addEventListener('click',onClick,true);
  observer=new MutationObserver(()=>stabilize());
  observer.observe(document.body,{childList:true,subtree:true});
  stabilize();
}
