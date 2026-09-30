export const NHL_FIRST_GOAL_ATTR='data-nhl-first-goal';
export const NHL_PLJ_ATTR='data-nhl-plj';
let installed=false;

export function nhlSidebarPanel(){
  if(typeof document==='undefined')return null;
  const head=document.querySelector('#sbSportAccordion .sb-sport-head[data-sport="nhl"]');
  return head?.closest('.sb-sport-block')?.querySelector('.sb-sport-panel')||null;
}

export function setExclusiveNhlSidebarActive(attr,isActive){
  const panel=nhlSidebarPanel();
  if(!panel)return;
  const item=panel.querySelector(`.sb-sub-item[${attr}]`);
  if(isActive){
    panel.querySelectorAll('.sb-sub-item.is-active').forEach(btn=>btn.classList.remove('is-active'));
    item?.classList.add('is-active');
  }else item?.classList.remove('is-active');
}

function closeFirstGoal(){
  if(typeof window?.DW_closeNhlFirstGoal==='function')window.DW_closeNhlFirstGoal();
  else document.querySelector('#hkFirstGoalPanel [data-fgs-close]')?.click();
  setExclusiveNhlSidebarActive(NHL_FIRST_GOAL_ATTR,false);
}

function closePuckLineJesus(){
  const close=document.querySelector('#hkPuckLineJesusPanel [data-plj-close]');
  if(close)close.click();
  else{
    const headerButton=document.getElementById('hkPuckLineJesusBtn');
    if(headerButton?.getAttribute('aria-pressed')==='true')headerButton.click();
  }
  setExclusiveNhlSidebarActive(NHL_PLJ_ATTR,false);
}

export function closeNhlFeaturePanels(except=''){
  if(typeof document==='undefined')return;
  if(except!=='first-goal')closeFirstGoal();
  if(except!=='plj')closePuckLineJesus();
}

function onSidebarClick(event){
  const item=event.target?.closest?.('.sb-sub-item');
  const panel=nhlSidebarPanel();
  if(!item||!panel?.contains(item))return;
  if(item.matches(`[${NHL_FIRST_GOAL_ATTR}]`)){closeNhlFeaturePanels('first-goal');return;}
  if(item.matches(`[${NHL_PLJ_ATTR}]`)){closeNhlFeaturePanels('plj');return;}
  closeNhlFeaturePanels();
}

export function installNhlSidebarStateV931(){
  if(installed||typeof document==='undefined')return;
  installed=true;
  document.addEventListener('click',onSidebarClick,true);
}
