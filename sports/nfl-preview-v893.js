import * as basePreview from './nfl-preview-v890.js?v=89.10';
import { mountNflParlayModalV893 } from './nfl/quarter-parlay-ui-v893.js?v=89.3';
import { installNflGamecastLiveFixV898 } from './nfl/gamecast-live-fix-v898.js?v=89.8';
import { installNflGamecastScoreGuardV8910 } from './nfl/gamecast-score-guard-v8910.js?v=89.10';

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
  try{installNflGamecastLiveFixV898();}catch(e){console.warn('[NFL Gamecast v89.8] live fix unavailable:',e);}
  try{installNflGamecastScoreGuardV8910();}catch(e){console.warn('[NFL Gamecast v89.10] scoreboard guard unavailable:',e);}
  refreshQuarterCta();
  if(!quarterPollTimer) quarterPollTimer=setInterval(refreshQuarterCta,15000);
}
export async function mount(){const r=await basePreview.mount();arm();return r;}
export function selectTab(tab){const r=typeof basePreview.selectTab==='function'?basePreview.selectTab(tab):undefined;arm();return r;}
export const __V893_BASE__=basePreview;
