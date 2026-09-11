import * as basePreview from './nfl-preview-v890.js?v=89.14';
import { mountNflParlayModalV893 } from './nfl/quarter-parlay-ui-v893.js?v=89.3';
import { installNflGamecastActiveLiveV8911 } from './nfl/gamecast-active-live-v8911.js?v=89.11';
import { installNflGamecastScoreGuardV8910 } from './nfl/gamecast-score-guard-v8910.js?v=89.14';
import { installNflGamecastFieldStateV8912 } from './nfl/gamecast-field-state-v8912.js?v=89.15';

let quarterPollTimer=null;

async function refreshQuarterCta(){
  const banner=document.querySelector('[data-tso-quarter-banner]');
  if(!banner) return;
  try{
    const r=await fetch('./slates/nfl-quarter.json?ts='+Date.now(),{cache:'no-store'});
    if(!r.ok) return;
    const doc=await r.json();
    const ready=(doc?.games||[]).some(g=>g?.ready);
    if(!ready) return;
    const btn=banner.querySelector('[data-tso-quarter-open]');
    const copy=banner.querySelector('.copy span');
    if(btn){btn.disabled=false;btn.removeAttribute('disabled');btn.textContent='Build Quarter Parlay';}
    if(copy) copy.textContent='50K pregame quarter distributions ready · Q1–Q4 · exact same-world correlation';
  }catch{}
}

function arm(){
  try{mountNflParlayModalV893();}catch(e){console.warn('[NFL parlay modal v89.3] enhancement unavailable:',e);}
  // One active-game gate, one accepted-score renderer, one field renderer.
  // v89.8 and v89.13 remain in history but are intentionally NOT installed;
  // both previously mutated the same LOS/actors after v89.12 and created races.
  try{installNflGamecastActiveLiveV8911();}catch(e){console.warn('[NFL Gamecast v89.11] active-game live gate unavailable:',e);}
  try{installNflGamecastScoreGuardV8910();}catch(e){console.warn('[NFL Gamecast v89.14] scoreboard renderer unavailable:',e);}
  try{installNflGamecastFieldStateV8912();}catch(e){console.warn('[NFL Gamecast v89.15] authoritative motion renderer unavailable:',e);}
  refreshQuarterCta();
  if(!quarterPollTimer) quarterPollTimer=setInterval(refreshQuarterCta,15000);
}
export async function mount(){const r=await basePreview.mount();arm();return r;}
export function selectTab(tab){const r=typeof basePreview.selectTab==='function'?basePreview.selectTab(tab):undefined;arm();return r;}
export const __V893_BASE__=basePreview;
