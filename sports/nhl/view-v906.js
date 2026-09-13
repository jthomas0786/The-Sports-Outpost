import * as base from './view.js?v=90.5';
import {installNhlSlateV906} from './slate-v906.js?v=90.6.1';
import {installNhlPlayerModalV908} from './player-modal-v908.js?v=90.8';
import {gradeForLean,gradeRingHTML} from './grade.js?v=90.4';

export const selectTab=base.selectTab;
export async function mount(){
 const result=await base.mount();
 installNhlSlateV906({gradeForLean,gradeRingHTML});
 installNhlPlayerModalV908(document.getElementById('nhlView'));
 return result;
}
