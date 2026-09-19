import { __NFL_PLAYER_PROP_TOOL_V923_TEST__ as base } from './player-prop-tool-v923.js?v=92.3';

let installed=false;
let observer=null;
let filtersOpen=false;

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

function stabilizeFilters(){
  const panel=document.getElementById('nflPptFilterPanel');
  if(panel&&filtersOpen)panel.hidden=false;
  patchSearchInput();
  if(state?.search)filterVisibleRows(state.search);
}

function onClick(e){
  if(e.target.closest?.('#nflPptFilters')){
    filtersOpen=!filtersOpen;
    queueMicrotask(stabilizeFilters);
    return;
  }
  if(e.target.closest?.('#nflPptClear')){
    // Keep Filters open after Clear; v92.3 handles the actual state reset/render.
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
