import * as base from './view.js?v=90.22&props=2&launch=1';
import {installNhlSlateV906} from './slate-v906.js?v=90.22';
import {installNhlPlayerModalV921} from './player-modal-v921.js?v=90.22';
import {installNhlPropsDailyGuardV920} from './props-daily-guard-v920.js?v=90.22';
import {gradeForLean,gradeRingHTML} from './grade.js?v=90.4';
import {installNhlLaunchV922} from './launch-v922.js?v=90.22';
import {installPuckLineJesusV923} from './puck-line-jesus.js?v=90.29';
import {installPuckLineJesusRoutingV924} from './puck-line-jesus-routing-v924.js?v=90.24';
import {installPuckLineJesusAlertsV925} from './puck-line-jesus-alerts-v925.js?v=90.29';
import {installPljBeginnerGuideV930} from './plj-beginner-guide-v930.js?v=90.31';
import {installNhlFirstGoalV928} from './first-goal-v928.js?v=90.36-mobile-pin';
import {nhlShouldLiveRefresh,nhlNextRefreshDelay,NHL_IDLE_PROBE_MS} from './refresh-policy-v933.js?v=90.33';

let policySlate=null,policyFetchedAt=0,policyLoading=null,schedulerTimer=null,schedulerStarted=false;

function ensureNhlModalVisibilityV910(){
 if(typeof document==='undefined'||document.getElementById('nhl-player-modal-visibility-v910'))return;
 const link=document.createElement('link');
 link.id='nhl-player-modal-visibility-v910';
 link.rel='stylesheet';
 link.href='./sports/nhl/player-modal-visibility-v910.css?v=90.10';
 document.head.appendChild(link);
}
function nhlSurfaceActive(){return location.hash==='#nhl'||document.getElementById('ccHockeyCol')?.classList.contains('active');}
function auxiliaryPanelOpen(){return !!document.querySelector('#hkFirstGoalPanel,#hkPuckLineJesusPanel');}
function currentRefreshWindow(){return nhlShouldLiveRefresh(policySlate?.games||[]);}
async function fetchPolicySlate(force=false){
 if(policyLoading)return policyLoading;
 if(!force&&policySlate&&Date.now()-policyFetchedAt<60000)return policySlate;
 policyLoading=(async()=>{
  try{
   const response=await fetch(`./slates/nhl.json?t=${Date.now()}`,{cache:'no-store'});
   if(!response.ok)throw new Error(`HTTP ${response.status}`);
   policySlate=await response.json();policyFetchedAt=Date.now();
  }catch(error){console.warn('[NHL refresh policy] slate probe unavailable:',error);}
  finally{policyLoading=null;}
  return policySlate;
 })();
 return policyLoading;
}
function schedulePolicy(delay){
 if(schedulerTimer)clearTimeout(schedulerTimer);
 schedulerTimer=setTimeout(runPolicy,Math.max(1000,Number(delay)||NHL_IDLE_PROBE_MS));
}
async function runPolicy(){
 schedulerTimer=null;
 if(document.hidden||!nhlSurfaceActive()){schedulePolicy(30000);return;}
 await fetchPolicySlate();
 const liveWindow=currentRefreshWindow();
 window.DW_nhlRefreshWindowActive=liveWindow;
 if(liveWindow&&!auxiliaryPanelOpen())await base.refresh();
 if(Date.now()-policyFetchedAt>=60000)await fetchPolicySlate(true);
 schedulePolicy(nhlNextRefreshDelay(policySlate?.games||[]));
}
function startPolicyScheduler(){
 if(schedulerStarted)return;schedulerStarted=true;
 window.DW_nhlShouldLiveRefresh=()=>currentRefreshWindow();
 window.DW_nhlRefreshPolicyState=()=>({active:currentRefreshWindow(),slateDate:policySlate?.date||null,nextDelay:nhlNextRefreshDelay(policySlate?.games||[])});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){fetchPolicySlate(true).finally(()=>schedulePolicy(1000));}});
 fetchPolicySlate(true).finally(()=>schedulePolicy(nhlNextRefreshDelay(policySlate?.games||[])));
}
async function withoutLegacyBasePoll(task){
 const original=globalThis.setInterval;
 globalThis.setInterval=(fn,delay,...args)=>Number(delay)===10000?933010:original.call(globalThis,fn,delay,...args);
 try{return await task();}finally{globalThis.setInterval=original;}
}
function installSlateWithQuietPoll(helpers){
 const original=globalThis.setInterval;
 globalThis.setInterval=(fn,delay,...args)=>{
  if(Number(delay)===60000)return original.call(globalThis,()=>{if(window.DW_nhlShouldLiveRefresh?.())fn(...args);},delay);
  return original.call(globalThis,fn,delay,...args);
 };
 try{installNhlSlateV906(helpers);}finally{globalThis.setInterval=original;}
}
function closeAuxiliaryPanels(){
 window.DW_closeNhlFirstGoal?.();
 document.querySelector('#hkPuckLineJesusPanel [data-plj-close]')?.click();
}
function announceTab(next){
 window.dispatchEvent(new CustomEvent('tso:nhl-tab-change',{detail:{tab:next}}));
 window.DW_syncNhlSidebarState?.();
 if(currentRefreshWindow())schedulePolicy(1000);
}
function openBaseTab(next){
 window.DW_nhlPendingTab=next;
 if(location.hash!=='#nhl'){location.hash='nhl';return;}
 closeAuxiliaryPanels();
 base.selectTab(next);
 announceTab(next);
}
function installNavigationBridge(){window.DW_openNhlTab=openBaseTab;}

export function selectTab(next){closeAuxiliaryPanels();base.selectTab(next);announceTab(next);}
export async function mount(){
 const host=document.getElementById('nhlView');
 installNhlPropsDailyGuardV920(host);
 let result;
 await withoutLegacyBasePoll(async()=>{result=await base.mount();});
 ensureNhlModalVisibilityV910();
 window.DW_nhlShouldLiveRefresh=()=>currentRefreshWindow();
 installSlateWithQuietPoll({gradeForLean,gradeRingHTML});
 installNhlPlayerModalV921(host);
 await installNhlLaunchV922(host);
 installPuckLineJesusV923();
 installPuckLineJesusRoutingV924();
 installPuckLineJesusAlertsV925();
 installPljBeginnerGuideV930();
 installNhlFirstGoalV928();
 installNavigationBridge();
 startPolicyScheduler();
 window.DW_syncNhlSidebarState?.();
 return result;
}