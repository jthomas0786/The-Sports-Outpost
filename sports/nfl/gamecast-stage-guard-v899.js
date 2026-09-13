import { enhanceNflGamecastV890Now } from './gamecast-v890-enhancer.js?v=89.9';

const ROOT_SELECTOR='[data-tso-v886e-gamecast]';
const STYLE_ID='tso-nfl-gamecast-stage-guard-v899';
let installed=false,observer=null,raf=0,retryTimer=0;

function ensureStyles(){
  if(typeof document==='undefined'||document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    /* Never allow the Gamecast stage to become a blank canvas while the clean
       field artwork/player refinement is loading or recovering. */
    ${ROOT_SELECTOR}:not([data-tso-stage-art-ready="1"]) .tso-ps886e__fieldSvg:not(.tso-ps886e__downlines):not(.tso-ps886e__routes){opacity:1!important;visibility:visible!important;display:block!important;z-index:1!important}
    ${ROOT_SELECTOR}:not([data-tso-stage-art-ready="1"]) .tso-ps886e__shell{display:block!important;opacity:1!important;visibility:visible!important}
    ${ROOT_SELECTOR}[data-tso-stage-art-ready="1"] .tso-ps886e__fieldSvg:not(.tso-ps886e__downlines):not(.tso-ps886e__routes){opacity:0!important;visibility:hidden!important}
    ${ROOT_SELECTOR}[data-tso-stage-art-ready="1"] .tso-ps886e__shell{display:none!important}

    /* v89.0 intentionally hid the old sprite while the refined Chibi was being
       built. If that refinement misses a live remount, the result was no players.
       Fail open: a base player is always better than an empty field. */
    ${ROOT_SELECTOR} .tso-ps886e__actors{display:block!important;opacity:1!important;visibility:visible!important}
    ${ROOT_SELECTOR} .tso-ps886e__actor:not(.ghost){display:block!important;opacity:1!important;visibility:visible!important}
    ${ROOT_SELECTOR} .tso-ps886e__actorGraphic{opacity:1!important;visibility:visible!important}
    ${ROOT_SELECTOR} .tso-ps886e__actorGraphic>svg{opacity:1!important;visibility:visible!important}
  `;
  document.head.appendChild(style);
}

function cleanImageReady(img){
  return !!(img&&img.complete&&Number(img.naturalWidth)>0&&Number(img.naturalHeight)>0);
}

function syncFieldReady(root){
  const img=root.querySelector('.tso-v890-fieldImage');
  if(cleanImageReady(img)) root.dataset.tsoStageArtReady='1';
  else delete root.dataset.tsoStageArtReady;
  if(!img||img.dataset.v899Wired==='1')return;
  img.dataset.v899Wired='1';
  const sync=()=>{
    if(!root.isConnected)return;
    if(cleanImageReady(img)) root.dataset.tsoStageArtReady='1';
    else delete root.dataset.tsoStageArtReady;
  };
  img.addEventListener('load',sync);
  img.addEventListener('error',sync);
}

function healRoot(root){
  if(!root)return;
  root.dataset.tsoStageGuard='89.9.1';
  syncFieldReady(root);
  root.querySelectorAll('.tso-ps886e__actor:not(.ghost)').forEach(actor=>{
    actor.style.removeProperty('display');
    actor.style.removeProperty('visibility');
    const graphic=actor.querySelector('.tso-ps886e__actorGraphic');
    if(graphic){graphic.style.removeProperty('display');graphic.style.removeProperty('visibility');}
  });
}

function run(){
  raf=0;
  try{enhanceNflGamecastV890Now();}catch(e){console.warn('[NFL Gamecast v89.9] field/player rehydrate unavailable:',e);}
  const roots=[...document.querySelectorAll(ROOT_SELECTOR)];
  roots.forEach(healRoot);
  clearTimeout(retryTimer);
  retryTimer=setTimeout(()=>{
    const liveRoots=[...document.querySelectorAll(ROOT_SELECTOR)];
    try{enhanceNflGamecastV890Now();}catch{}
    liveRoots.forEach(healRoot);
  },450);
}

function schedule(){
  if(typeof document==='undefined')return;
  if(raf)return;
  if(typeof requestAnimationFrame==='function')raf=requestAnimationFrame(run);
  else queueMicrotask(run);
}

export function installNflGamecastStageGuardV899(){
  if(typeof document==='undefined')return null;
  ensureStyles();
  if(installed){schedule();return observer;}
  installed=true;
  observer=new MutationObserver(schedule);
  observer.observe(document.getElementById('nflView')||document.body,{childList:true,subtree:true});
  window.addEventListener('tso:nfl-live-snapshot',schedule);
  window.addEventListener('resize',schedule,{passive:true});
  schedule();
  return observer;
}

export const __V899_TEST__={cleanImageReady};
