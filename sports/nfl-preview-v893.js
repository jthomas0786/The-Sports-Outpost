import * as basePreview from './nfl-preview-v890.js?v=89.43';
import { mountNflParlayModalV893 } from './nfl/quarter-parlay-ui-v893.js?v=89.3';
import { installNflGamecastActiveLiveV8911 } from './nfl/gamecast-active-live-v8911.js?v=89.11';
import { installNflGamecastScoreGuardV8910 } from './nfl/gamecast-score-guard-v8910.js?v=89.14';
import { installNflGamecastFieldPositionV8925 } from './nfl/gamecast-field-position-v8925.js?v=89.25';
import { installNflGamecastFieldStateV8912 } from './nfl/gamecast-field-state-v8912.js?v=89.16';
import { installNflPropModelEdgeV8918 } from './nfl/prop-model-edge-v8918.js?v=89.18';
import { installNflLiveGameSwitcherV894 } from './nfl/live-game-switcher-v894.js?v=89.37';
import { installNflGamecastLiveFixV898 } from './nfl/gamecast-live-fix-v898.js?v=89.8';
import { installNflGamecastStageGuardV899 } from './nfl/gamecast-stage-guard-v899.js?v=89.9';
import { installNflGamecastPossessionBallV8922 } from './nfl/gamecast-possession-ball-v8922.js?v=89.24';
import { installNflPlayerModalSlateSyncV907 } from './nfl/player-modal-slate-sync-v907.js?v=90.7';
import { installNflAllPlayersControlsV8921 } from './nfl/all-players-controls-v8921.js?v=89.21';
import { installNflReadabilityV8922 } from './nfl/readability-v8922.js?v=89.22';
import { installNflPlayerPropToolV947 } from './nfl/player-prop-tool-v947.js?v=94.7';

let quarterPollTimer=null,replayLabPromise=null;

async function installReplayLabIfRequested(){
  if(typeof location==='undefined'||new URLSearchParams(location.search).get('nflReplayLab')!=='1')return;
  if(!replayLabPromise)replayLabPromise=import('./nfl/gamecast-replay-lab-v8916.js?v=89.16');
  try{const mod=await replayLabPromise;mod.installNflGamecastReplayLabV8916?.();}
  catch(e){console.warn('[NFL Gamecast v89.16] Replay Lab unavailable:',e);}
}

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
  try{installNflLiveGameSwitcherV894();}catch(e){console.warn('[NFL Live v89.9] game switcher unavailable:',e);}
  try{installNflPlayerModalSlateSyncV907();}catch(e){console.warn('[NFL modal slate sync v90.7] unavailable:',e);}
  try{installNflAllPlayersControlsV8921();}catch(e){console.warn('[NFL All Players v89.21] controls unavailable:',e);}
  try{installNflReadabilityV8922();}catch(e){console.warn('[NFL readability v89.22] unavailable:',e);}
  try{installNflPlayerPropToolV947({selectBaseTab:tab=>basePreview.selectTab?.(tab)});}catch(e){console.warn('[NFL Player Prop Tool v94.7] unavailable:',e);}
  try{installNflGamecastActiveLiveV8911();}catch(e){console.warn('[NFL Gamecast v89.11] active-game live gate unavailable:',e);}
  try{installNflGamecastPossessionBallV8922();}catch(e){console.warn('[NFL Gamecast v89.24] possession football unavailable:',e);}
  try{installNflGamecastFieldPositionV8925();}catch(e){console.warn('[NFL Gamecast v89.25] field position authority unavailable:',e);}
  try{installNflGamecastScoreGuardV8910();}catch(e){console.warn('[NFL Gamecast v89.14] scoreboard renderer unavailable:',e);}
  try{installNflGamecastFieldStateV8912();}catch(e){console.warn('[NFL Gamecast v89.16] authoritative motion renderer unavailable:',e);}
  try{installNflGamecastLiveFixV898();}catch(e){console.warn('[NFL Gamecast v89.8] live stability layer unavailable:',e);}
  try{installNflGamecastStageGuardV899();}catch(e){console.warn('[NFL Gamecast v89.9] stage visibility guard unavailable:',e);}
  installNflPropModelEdgeV8918().catch(e=>console.warn('[NFL Prop Model v89.18] simulation + 2+ TD UI unavailable:',e));
  installReplayLabIfRequested();
  refreshQuarterCta();
  if(!quarterPollTimer) quarterPollTimer=setInterval(refreshQuarterCta,15000);
}
export async function mount(){const r=await basePreview.mount();arm();return r;}
export function selectTab(tab){const r=typeof basePreview.selectTab==='function'?basePreview.selectTab(tab):undefined;arm();return r;}
export const __V893_BASE__=basePreview;
