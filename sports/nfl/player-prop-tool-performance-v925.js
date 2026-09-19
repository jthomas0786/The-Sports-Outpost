import { __NFL_PLAYER_PROP_TOOL_V923_TEST__ as base } from './player-prop-tool-v923.js?v=92.3';

const STYLE_ID='nfl-player-prop-tool-v925-polish';
const TOOL_ID='nflPlayerPropTool';
const STASH_ID='nflPlayerPropToolBaseStash';
const state=base?.state;

let installed=false;
let observer=null;
let observedRoot=null;
let filtersOpen=false;
let playerModalOpen=false;
let restoreQueued=false;
let raf=0;

const norm=v=>String(v||'').toLowerCase().replace(/\./g,'').replace(/['’]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

function ensureStyle(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
/* v92.5: compact, lower-paint Player Prop Tool */
#nflView #${TOOL_ID}{padding:14px 12px 24px!important}
#nflView .nfl-ppt-head,#nflView .nfl-ppt-toolbar,#nflView .nfl-ppt-filter-panel,#nflView .nfl-ppt-table-wrap{max-width:1240px!important}
#nflView .nfl-ppt-toolbar{grid-template-columns:minmax(360px,1.15fr) auto minmax(390px,.95fr)!important;gap:10px!important}
#nflView .nfl-ppt-selects{grid-template-columns:repeat(3,minmax(105px,1fr))!important;gap:6px!important}
#nflView .nfl-ppt-selects select,#nflView .nfl-ppt-filter-panel select,#nflView .nfl-ppt-filter-panel input{height:38px!important;padding:0 9px!important;font-size:11px!important}
#nflView .nfl-ppt-positions{gap:6px!important}
#nflView .nfl-ppt-positions button{width:36px!important;height:36px!important;font-size:10px!important;box-shadow:none!important}
#nflView .nfl-ppt-actions{gap:8px!important}
#nflView .nfl-ppt-actions>button{height:36px!important;font-size:11px!important}
#nflView .nfl-ppt-filter-panel{padding:8px!important;gap:7px!important;grid-template-columns:minmax(190px,1.4fr) repeat(3,minmax(115px,.7fr)) auto!important}
#nflView .nfl-ppt-filter-panel button{height:38px!important;padding:0 11px!important}

#nflView .nfl-ppt-table-wrap{overflow:auto!important;contain:layout paint;overscroll-behavior:contain!important;scroll-behavior:auto!important;scrollbar-gutter:stable}
#nflView .nfl-ppt-table{width:1110px!important;min-width:1110px!important;table-layout:fixed!important;font-size:11px!important}
#nflView .nfl-ppt-table thead tr:nth-child(2) th{height:38px!important;padding:0 4px!important;font-size:8px!important;letter-spacing:.02em!important}
#nflView .nfl-ppt-table .nfl-ppt-groups th{height:24px!important;padding:0 5px!important;font-size:7px!important;letter-spacing:.16em!important;transform:none!important}
#nflView .nfl-ppt-table tbody tr{height:62px!important}
#nflView .nfl-ppt-table td{padding:4px 5px!important}
#nflView .nfl-ppt-table th:nth-child(1),#nflView .nfl-ppt-table td:nth-child(1){width:230px!important}
#nflView .nfl-ppt-table th:nth-child(2),#nflView .nfl-ppt-table td:nth-child(2){width:80px!important}
#nflView .nfl-ppt-table th:nth-child(3),#nflView .nfl-ppt-table td:nth-child(3){width:90px!important}
#nflView .nfl-ppt-table th:nth-child(4),#nflView .nfl-ppt-table td:nth-child(4){width:64px!important}
#nflView .nfl-ppt-table th:nth-child(5),#nflView .nfl-ppt-table td:nth-child(5){width:72px!important}
#nflView .nfl-ppt-table th:nth-child(6),#nflView .nfl-ppt-table td:nth-child(6){width:76px!important}
#nflView .nfl-ppt-table th:nth-child(7),#nflView .nfl-ppt-table td:nth-child(7){width:66px!important}
#nflView .nfl-ppt-table th:nth-child(8),#nflView .nfl-ppt-table td:nth-child(8){width:76px!important}
#nflView .nfl-ppt-table th:nth-child(9),#nflView .nfl-ppt-table td:nth-child(9){width:92px!important}
#nflView .nfl-ppt-table th:nth-child(10),#nflView .nfl-ppt-table td:nth-child(10){width:72px!important}
#nflView .nfl-ppt-table th:nth-child(n+11),#nflView .nfl-ppt-table td:nth-child(n+11){width:64px!important}
#nflView .nfl-ppt-player{gap:7px!important}
#nflView .nfl-ppt-avatar{flex-basis:38px!important;width:38px!important;height:38px!important}
#nflView .nfl-ppt-player b{font-size:11.5px!important}
#nflView .nfl-ppt-player small{margin-top:3px!important;font-size:7.5px!important}
#nflView .nfl-ppt-consensus b,#nflView .nfl-ppt-proj b,#nflView .nfl-ppt-avg b,#nflView .nfl-ppt-edge b,#nflView .nfl-ppt-def b,#nflView .nfl-ppt-sim b,#nflView .nfl-ppt-hit b{font-size:12px!important}
#nflView .nfl-ppt-consensus span,#nflView .nfl-ppt-proj span,#nflView .nfl-ppt-avg span,#nflView .nfl-ppt-edge span,#nflView .nfl-ppt-def span,#nflView .nfl-ppt-sim span,#nflView .nfl-ppt-hit span{margin-top:3px!important;font-size:7px!important}
#nflView .nfl-ppt-pick{min-height:46px!important;gap:1px!important}
#nflView .nfl-ppt-pick small{font-size:6.5px!important;max-width:76px!important}
#nflView .nfl-ppt-pick b{font-size:11px!important}
#nflView .nfl-ppt-pick span{font-size:9px!important}
#nflView .nfl-ppt-match{height:46px!important}
#nflView .nfl-ppt-match b{font-size:10px!important}
#nflView .nfl-ppt-match span{margin-top:3px!important;font-size:6.5px!important}
#nflView .nfl-ppt-hit{height:46px!important;margin:-4px -5px!important}

/* Centered probability ring: one centered label, thin track, no extra grid child. */
#nflView .nfl-ppt-prob{width:44px!important;height:44px!important;margin:0 auto!important;display:grid!important;place-items:center!important;vertical-align:middle!important;background:conic-gradient(from -90deg,#22c55e calc(var(--pct)*1%),#e6ebf1 0)!important;box-shadow:inset 0 0 0 1px rgba(15,35,58,.06)!important}
#nflView .nfl-ppt-prob::before{inset:4px!important;background:#fff!important;box-shadow:0 0 0 1px #edf1f5!important}
#nflView .nfl-ppt-prob b{position:absolute!important;inset:0!important;z-index:2!important;display:grid!important;place-items:center!important;margin:0!important;padding:0!important;font:800 10px/1 'JetBrains Mono',monospace!important;color:#102039!important;text-align:center!important}
#nflView .nfl-ppt-prob i{display:none!important}
#nflView .nfl-ppt-prob.empty{background:#e8edf3!important;color:#7c899d!important}

/* Sticky first cells force expensive repaints across a wide desktop table. Keep
   them only where horizontal scrolling actually needs the player anchor. */
@media(min-width:901px){
  #nflView .nfl-ppt-player-sticky{position:static!important;left:auto!important;z-index:auto!important;box-shadow:none!important}
  #nflView .nfl-ppt-table thead tr:nth-child(2) th:first-child{left:auto!important}
}
@media(max-width:1600px){
  #nflView .nfl-ppt-toolbar{grid-template-columns:minmax(0,1fr) auto!important}
  #nflView .nfl-ppt-actions{grid-column:1/-1!important}
  #nflView .nfl-ppt-filter-panel{grid-template-columns:repeat(2,minmax(130px,1fr))!important}
}
@media(max-width:700px){
  #nflView #${TOOL_ID}{padding:10px 6px 18px!important}
  #nflView .nfl-ppt-table{width:1080px!important;min-width:1080px!important}
  #nflView .nfl-ppt-table th:nth-child(1),#nflView .nfl-ppt-table td:nth-child(1){width:210px!important}
  #nflView .nfl-ppt-filter-panel{grid-template-columns:1fr!important}
  #nflView .nfl-ppt-prob{width:42px!important;height:42px!important}
}
`;
  document.head.appendChild(style);
}

function filterVisibleRows(query){
  const tool=document.getElementById(TOOL_ID);
  if(!tool)return;
  const q=norm(query);
  let shown=0;
  const rows=tool.querySelectorAll('tbody tr');
  for(const row of rows){
    const match=!q||norm(row.textContent).includes(q);
    row.hidden=!match;
    if(match)shown++;
  }
  const count=tool.querySelector('.nfl-ppt-head-stat b');
  if(count)count.textContent=String(shown);
}

function patchSearchInput(){
  const input=document.getElementById('nflPptSearch');
  if(!input||input.dataset.nflPptStableSearch==='925')return false;

  const stable=input.cloneNode(true);
  stable.dataset.nflPptStableSearch='925';
  input.replaceWith(stable);
  stable.addEventListener('input',e=>{
    if(state)state.search=e.target.value;
    filterVisibleRows(e.target.value);
  });
  return true;
}

function restoreAfterPlayerModal(){
  const root=document.getElementById('nflView');
  if(!root)return;
  const modal=root.querySelector('[data-nfl-close-modal],.tso-nfl-player-card-v70,.tso-nfl-player-card-v72');
  if(modal){playerModalOpen=true;return;}
  if(!playerModalOpen||root.querySelector(`#${TOOL_ID}`)||restoreQueued)return;
  restoreQueued=true;
  setTimeout(()=>{
    restoreQueued=false;
    const liveRoot=document.getElementById('nflView');
    if(!liveRoot)return;
    if(liveRoot.querySelector('[data-nfl-close-modal],.tso-nfl-player-card-v70,.tso-nfl-player-card-v72'))return;
    if(liveRoot.querySelector(`#${TOOL_ID}`)){playerModalOpen=false;return;}
    const trigger=document.getElementById('nflPlayerPropToolBtn');
    if(trigger?.classList.contains('is-active'))trigger.click();
    playerModalOpen=false;
  },60);
}

function stabilize(){
  raf=0;
  ensureStyle();
  const panel=document.getElementById('nflPptFilterPanel');
  if(panel&&filtersOpen)panel.hidden=false;
  const patched=patchSearchInput();
  if(patched&&state?.search)filterVisibleRows(state.search);
  restoreAfterPlayerModal();
}

function scheduleStabilize(){
  if(raf)return;
  raf=requestAnimationFrame(stabilize);
}

function mutationIsRelevant(m){
  const target=m.target?.nodeType===1?m.target:null;
  if(target?.closest?.(`#${STASH_ID}`))return false;
  if(target?.id==='nflView'||target?.closest?.(`#${TOOL_ID}`))return true;
  for(const node of [...m.addedNodes,...m.removedNodes]){
    if(node?.nodeType!==1)continue;
    if(node.id===TOOL_ID||node.matches?.('[data-nfl-close-modal],.tso-nfl-player-card-v70,.tso-nfl-player-card-v72'))return true;
    if(node.querySelector?.(`#${TOOL_ID},[data-nfl-close-modal],.tso-nfl-player-card-v70,.tso-nfl-player-card-v72`))return true;
  }
  return false;
}

function bindObserver(){
  const root=document.getElementById('nflView');
  if(!root){setTimeout(bindObserver,200);return;}
  if(root===observedRoot&&observer)return;
  observer?.disconnect();
  observedRoot=root;
  observer=new MutationObserver(mutations=>{
    if(mutations.some(mutationIsRelevant))scheduleStabilize();
  });
  observer.observe(root,{childList:true,subtree:true});
}

function onClick(e){
  const filterButton=e.target.closest?.('#nflPptFilters');
  if(filterButton){
    e.preventDefault();
    e.stopImmediatePropagation();
    const panel=document.getElementById('nflPptFilterPanel');
    filtersOpen=panel?panel.hidden:!filtersOpen;
    if(panel)panel.hidden=!filtersOpen;
    scheduleStabilize();
    return;
  }
  if(e.target.closest?.('#nflPptClear')){
    filtersOpen=true;
    queueMicrotask(scheduleStabilize);
  }
}

export function installNflPlayerPropToolPerformanceV925(){
  if(installed)return;
  installed=true;
  ensureStyle();
  document.addEventListener('click',onClick,true);
  bindObserver();
  stabilize();
}
