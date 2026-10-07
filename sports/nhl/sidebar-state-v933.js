let installed=false,observer=null,queued=false;

function nhlPanel(){
 const head=document.querySelector('#sbSportAccordion .sb-sport-head[data-sport="nhl"]');
 return head?.closest('.sb-sport-block')?.querySelector('.sb-sport-panel')||null;
}
function mode(){
 if(document.getElementById('hkFirstGoalPanel'))return 'first-goal';
 if(document.getElementById('hkGameEdgePanel')||document.getElementById('hkPuckLineJesusPanel'))return 'plj';
 return String(window.DW_nhlTab||'slate');
}
function sync(){
 const panel=nhlPanel();if(!panel)return;
 const current=mode();
 for(const button of panel.querySelectorAll('.sb-sub-item')){
  const isFirst=button.hasAttribute('data-nhl-first-goal');
  const isPlj=button.hasAttribute('data-nhl-plj')||button.hasAttribute('data-nhl-game-edge');
  const tab=button.getAttribute('data-nhl-tab');
  if(!isFirst&&!isPlj&&!tab)continue;
  const on=current==='first-goal'?isFirst:current==='plj'?isPlj:!!tab&&tab===current;
  if(button.classList.contains('is-active')!==on)button.classList.toggle('is-active',on);
  if(on)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
 }
}
function queueSync(){
 if(queued)return;queued=true;
 requestAnimationFrame(()=>{queued=false;sync();});
}
function closePlj(){if(typeof window.DW_closeGameEdge==='function')window.DW_closeGameEdge();else{document.querySelector('#hkGameEdgePanel [data-ge-close]')?.click();document.querySelector('#hkGameEdgePanel,#hkPuckLineJesusPanel [data-plj-close]')?.click();}}
function closeFirstGoal(){window.DW_closeNhlFirstGoal?.();}
function onClick(event){
 const target=event.target?.closest?.('button,.sb-sub-item');if(!target)return;
 if(target.matches('#hkFirstGoalBtn,[data-nhl-first-goal]'))closePlj();
 else if(target.matches('#hkPuckLineJesusBtn,[data-nhl-plj],[data-nhl-game-edge]'))closeFirstGoal();
 else if(target.matches('.sb-sub-item[data-nhl-tab]')){closeFirstGoal();closePlj();}
 if(target.closest('#sbSportAccordion')||target.matches('#hkFirstGoalBtn,#hkPuckLineJesusBtn,[data-plj-close],[data-fgs-close]'))setTimeout(queueSync,0);
}
function relevant(node){
 if(node?.nodeType!==1)return false;
 return node.matches?.('#sbSportAccordion,#hkFirstGoalPanel,#hkGameEdgePanel,#hkPuckLineJesusPanel,.sb-sport-panel,.sb-sub-item')||
  !!node.querySelector?.('#sbSportAccordion,#hkFirstGoalPanel,#hkGameEdgePanel,#hkPuckLineJesusPanel,.sb-sport-panel,.sb-sub-item');
}
function needsSync(records){
 return records.some(record=>record.type==='childList'&&(
  [...record.addedNodes].some(relevant)||[...record.removedNodes].some(relevant)
 ));
}

export function installNhlSidebarStateV933(){
 if(installed){queueSync();return;}
 installed=true;
 const start=()=>{
  sync();
  document.addEventListener('click',onClick,true);
  window.addEventListener('hashchange',queueSync);
  window.addEventListener('tso:first-goal-panel',queueSync);
  window.addEventListener('tso:nhl-tab-change',queueSync);
  observer=new MutationObserver(records=>{if(needsSync(records))queueSync();});
  observer.observe(document.body,{childList:true,subtree:true});
  window.DW_syncNhlSidebarState=queueSync;
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
