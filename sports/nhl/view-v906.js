import * as base from './view.js?v=90.5&props=1';
import {installNhlSlateV906} from './slate-v906.js?v=90.6.1';
import {installNhlPlayerModalV918} from './player-modal-v918.js?v=90.18';
import {installNhlPropsDailyGuardV920} from './props-daily-guard-v920.js?v=90.20';
import {gradeForLean,gradeRingHTML} from './grade.js?v=90.4';

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
 installNhlPlayerModalV918(host);
 return result;
}
