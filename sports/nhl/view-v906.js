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
import {installNhlFirstGoalV928} from './first-goal-v928.js?v=90.32';

function ensureNhlModalVisibilityV910(){
 if(typeof document==='undefined'||document.getElementById('nhl-player-modal-visibility-v910'))return;
 const link=document.createElement('link');
 link.id='nhl-player-modal-visibility-v910';
 link.rel='stylesheet';
 link.href='./sports/nhl/player-modal-visibility-v910.css?v=90.10';
 document.head.appendChild(link);
}

export const selectTab=base.selectTab;
export async function mount(){
 const host=document.getElementById('nhlView');
 installNhlPropsDailyGuardV920(host);
 const result=await base.mount();
 ensureNhlModalVisibilityV910();
 installNhlSlateV906({gradeForLean,gradeRingHTML});
 installNhlPlayerModalV921(host);
 await installNhlLaunchV922(host);
 installPuckLineJesusV923();
 installPuckLineJesusRoutingV924();
 installPuckLineJesusAlertsV925();
 installPljBeginnerGuideV930();
 installNhlFirstGoalV928();
 return result;
}