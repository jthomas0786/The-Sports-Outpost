import { __NFL_PLAYER_PROP_TOOL_V923_TEST__ as base } from './player-prop-tool-v923.js?v=92.3';

const STYLE_ID='nfl-player-prop-tool-v925-polish';
const TOOL_ID='nflPlayerPropTool';
const STASH_ID='nflPlayerPropToolBaseStash';
const RING_C=326.7;
const state=base?.state;

let installed=false;
let observer=null;
let observedRoot=null;
let filtersOpen=false;
let playerModalOpen=false;
let restoreQueued=false;
let raf=0;

const norm=v=>String(v||'').toLowerCase().replace(/\./g,'').replace(/['’]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const gradeForPct=pct=>{const p=Number(pct)/100;return p>=.70?'A+':p>=.65?'A':p>=.61?'A-':p>=.57?'B+':p>=.54?'B':p>=.51?'B-':p>=.48?'C+':'C';};
const gradeColor=grade=>{const g=String(grade||'').toUpperCase();return g.startsWith('A')?'#22c55e':g.startsWith('B')?'#f4c430':g.startsWith('C')?'#ff9f43':'#8b95a8';};

function ensureStyle(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
/* v92.5: compact, lower-paint Player Prop Tool */
#nflView #${TOOL_ID}{padding:12px 10px 22px!important}
#nflView .nfl-ppt-head,#nflView .nfl-ppt-toolbar,#nflView .nfl-ppt-filter-panel,#nflView .nfl-ppt-table-wrap{max-width:1180px!important}
#nflView .nfl-ppt-toolbar{grid-template-columns:minmax(340px,1.1fr) auto minmax(360px,.9fr)!important;gap:8px!important}
#nflView .nfl-ppt-selects{grid-template-columns:repeat(3,minmax(100px,1fr))!important;gap:5px!important}
#nflView .nfl-ppt-selects select,#nflView .nfl-ppt-filter-panel select,#nflView .nfl-ppt-filter-panel input{height:36px!important;padding:0 8px!important;font-size:10px!important}
#nflView .nfl-ppt-positions{gap:5px!important}
#nflView .nfl-ppt-positions button{width:34px!important;height:34px!important;font-size:9px!important;box-shadow:none!important}
#nflView .nfl-ppt-actions{gap:6px!important}
#nflView .nfl-ppt-actions>button{height:34px!important;padding:0 10px!important;font-size:10px!important}
#nflView .nfl-ppt-filter-panel{padding:7px!important;gap:6px!important;grid-template-columns:minmax(180px,1.35fr) repeat(3,minmax(108px,.7fr)) auto!important}
#nflView .nfl-ppt-filter-panel button{height:36px!important;padding:0 10px!important}

#nflView .nfl-ppt-table-wrap{overflow:auto!important;contain:layout paint;overscroll-behavior:contain!important;scroll-behavior:auto!important;scrollbar-gutter:stable}
#nflView .nfl-ppt-table{width:1050px!important;min-width:1050px!important;table-layout:fixed!important;font-size:10.5px!important}
#nflView .nfl-ppt-table thead tr:nth-child(2) th{height:36px!important;padding:0 3px!important;font-size:7.5px!important;letter-spacing:.015em!important}
#nflView .nfl-ppt-table .nfl-ppt-groups th{height:22px!important;padding:0 4px!important;font-size:6.5px!important;letter-spacing:.14em!important;transform:none!important}
#nflView .nfl-ppt-table tbody tr{height:58px!important}
#nflView .nfl-ppt-table td{padding:3px 4px!important}
#nflView .nfl-ppt-table th:nth-child(1),#nflView .nfl-ppt-table td:nth-child(1){width:215px!important}
#nflView .nfl-ppt-table th:nth-child(2),#nflView .nfl-ppt-table td:nth-child(2){width:75px!important}
#nflView .nfl-ppt-table th:nth-child(3),#nflView .nfl-ppt-table td:nth-child(3){width:84px!important}
#nflView .nfl-ppt-table th:nth-child(4),#nflView .nfl-ppt-table td:nth-child(4){width:60px!important}
#nflView .nfl-ppt-table th:nth-child(5),#nflView .nfl-ppt-table td:nth-child(5){width:68px!important}
#nflView .nfl-ppt-table th:nth-child(6),#nflView .nfl-ppt-table td:nth-child(6){width:72px!important}
#nflView .nfl-ppt-table th:nth-child(7),#nflView .nfl-ppt-table td:nth-child(7){width:62px!important}
#nflView .nfl-ppt-table th:nth-child(8),#nflView .nfl-ppt-table td:nth-child(8){width:72px!important}
#nflView .nfl-ppt-table th:nth-child(9),#nflView .nfl-ppt-table td:nth-child(9){width:88px!important}
#nflView .nfl-ppt-table th:nth-child(10),#nflView .nfl-ppt-table td:nth-child(10){width:68px!important}
#nflView .nfl-ppt-table th:nth-child(n+11),#nflView .nfl-ppt-table td:nth-child(n+11){width:62px!important}
#nflView .nfl-ppt-player{gap:6px!important}
#nflView .nfl-ppt-avatar{flex-basis:36px!important;width:36px!important;height:36px!important}
#nflView .nfl-ppt-player b{font-size:11px!important}
#nflView .nfl-ppt-player small{margin-top:2px!important;font-size:7px!important}
#nflView .nfl-ppt-consensus b,#nflView .nfl-ppt-proj b,#nflView .nfl-ppt-avg b,#nflView .nfl-ppt-edge b,#nflView .nfl-ppt-def b,#nflView .nfl-ppt-sim b,#nflView .nfl-ppt-hit b{font-size:11px!important}
#nflView .nfl-ppt-consensus span,#nflView .nfl-ppt-proj span,#nflView .nfl-ppt-avg span,#nflView .nfl-ppt-edge span,#nflView .nfl-ppt-def span,#nflView .nfl-ppt-sim span,#nflView .nfl-ppt-hit span{margin-top:2px!important;font-size:6.5px!important}
#nflView .nfl-ppt-pick{min-height:42px!important;gap:1px!important}
#nflView .nfl-ppt-pick small{font-size:6px!important;max-width:70px!important}
#nflView .nfl-ppt-pick b{font-size:10px!important}
#nflView .nfl-ppt-pick span{font-size:8px!important}
#nflView .nfl-ppt-match{height:42px!important}
#nflView .nfl-ppt-match b{font-size:9px!important}
#nflView .nfl-ppt-match span{margin-top:2px!important;font-size:6px!important}
#nflView .nfl-ppt-hit{height:42px!important;margin:-3px -4px!important}

/* Use the same SVG progress-ring language as the established NFL surfaces. */
#nflView .nfl-ppt-prob{position:relative!important;width:46px!important;height:46px!important;margin:0 auto!important;display:grid!important;place-items:center!important;vertical-align:middle!important;background:none!important;border:0!important;border-radius:50%!important;box-shadow:none!important;color:var(--ring-color,#8b95a8)!important}
#nflView .nfl-ppt-prob::before{display:none!important}
#nflView .nfl-ppt-prob>svg{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;overflow:visible!important}
#nflView .nfl-ppt-prob .nfl-ppt-ring-track{fill:none!important;stroke:#e1e8f0!important;stroke-width:8!important}
#nflView .nfl-ppt-prob .nfl-ppt-ring-fill{fill:none!important;stroke:currentColor!important;stroke-width:8!important;stroke-linecap:round!important}
#nflView .nfl-ppt-prob .nfl-ppt-ring-label{position:absolute!important;inset:0!important;z-index:2!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:1px!important;text-align:center!important;line-height:1!important;transform:none!important}
#nflView .nfl-ppt-prob .nfl-ppt-ring-label b{position:static!important;display:block!important;margin:0!important;padding:0!important;font:800 10px/1 'Oswald',sans-serif!important;color:#13233a!important;text-align:center!important}
#nflView .nfl-ppt-prob .nfl-ppt-ring-label span{display:block!important;margin:0!important;padding:0!important;font:800 6.5px/1 'JetBrains Mono',monospace!important;color:currentColor!important;text-align:center!important}
#nflView .nfl-ppt-prob>i,#nflView .nfl-ppt-prob>button{display:none!important}
#nflView .nfl-ppt-prob.empty{background:#f5f7fa!important;color:#8b95a8!important;border:1px solid #e1e8f0!important;font:800 11px/1 'JetBrains Mono',monospace!important}

/* Sticky first cells force expensive repaints across a wide desktop table. Keep
   them only where horizontal scrolling actually needs the player anchor. */
@media(min-width:901px){
  #nflView .nfl-ppt-player-sticky{position:static!important;left:auto!important;z-index:auto!important;box-shadow:none!important}
  #nflView .nfl-ppt-table thead tr:nth-child(2) th:first-child{left:auto!important}
}
@media(max-width:1600px){
  #nflView .nfl-ppt-toolbar{grid-template-columns:minmax(0,1fr) auto!important}
  #nflView .nfl-ppt-actions{grid-column:1/-1!important}
  #nflView .nfl-ppt-filter-panel{grid-template-columns:repeat(2,minmax(125px,1fr))!important}
}
@media(max-width:700px){
  #nflView #${TOOL_ID}{padding:9px 5px 16px!important}
  #nflView .nfl-ppt-table{width:1035px!important;min-width:1035px!important}
  #nflView .nfl-ppt-table th:nth-child(1),#nflView .nfl-ppt-table td:nth-child(1){width:200px!important}
  #nflView .nfl-ppt-filter-panel{grid-template-columns:1fr!important}
  #nflView .nfl-ppt-prob{width:44px!important;height:44px!important}
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

function decorateRings(){
  const tool=document.getElementById(TOOL_ID);
  if(!tool)return;
  for(const ring of tool.querySelectorAll('.nfl-ppt-prob:not(.empty):not([data-v925-ring])')){
    const pct=Math.max(0,Math.min(100,Number.parseFloat(ring.querySelector('b')?.textContent)||Number.parseFloat(ring.style.getPropertyValue('--pct'))||0));
    const grade=gradeForPct(pct),color=gradeColor(grade),off=(RING_C*(1-pct/100)).toFixed(1);
    ring.dataset.v925Ring='1';
    ring.style.setProperty('--ring-color',color);
    ring.innerHTML=`<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="nfl-ppt-ring-track" cx="60" cy="60" r="52"/><circle class="nfl-ppt-ring-fill" cx="60" cy="60" r="52" transform="rotate(-90 60 60)" stroke-dasharray="${RING_C}" stroke-dashoffset="${off}"/></svg><span class="nfl-ppt-ring-label"><b>${grade}</b><span>${Math.round(pct)}%</span></span>`;
  }
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
  decorateRings();
  restoreAfterPlayerModal();
}

function scheduleStabilize(){
  if(raf)return;
  raf=requestAnimationFrame(stabilize);
}

function mutationIsRelevant(m){
  const target=m.target?.nodeType===1?m.target:null;
  if(target?.closest?.(`#${STASH_ID}`))return false;
  if(target?.closest?.('[data-v925-ring]'))return false;
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
