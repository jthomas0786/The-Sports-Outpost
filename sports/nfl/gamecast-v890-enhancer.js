import { installNflGamecastV889Enhancer, enhanceNflGamecastV889Now } from './gamecast-v889-enhancer.js?v=88.9';
import { ensureNflGamecastV890Styles } from './gamecast-v890-styles.js?v=89.0';

const ROOT_SELECTOR='[data-tso-v886e-gamecast]';
const FIELD_CHUNK_COUNT=7;
const FIELD_CHUNK_PREFIX='/sports/nfl/gamecast-field-v890.b64.';
let observer=null;
let rafId=0;
let fieldObjectUrl='';
let fieldPromise=null;

const clean=v=>String(v||'').trim();

function sourceField(scene){
  return scene?.querySelector(':scope > .tso-ps886e__fieldSvg:not(.tso-ps886e__downlines):not(.tso-ps886e__routes)')||null;
}

function extractTeamLogoUrls(field){
  const imgs=[...(field?.querySelectorAll('image')||[])];
  return imgs.slice(0,2).map(img=>clean(img.getAttribute('href')||img.getAttribute('xlink:href')));
}

function chunkUrl(i){
  return `${FIELD_CHUNK_PREFIX}${String(i).padStart(2,'0')}?v=89.0`;
}

async function loadFieldObjectUrl(){
  if(fieldObjectUrl) return fieldObjectUrl;
  if(fieldPromise) return fieldPromise;
  fieldPromise=(async()=>{
    const parts=await Promise.all(Array.from({length:FIELD_CHUNK_COUNT},async(_,i)=>{
      const r=await fetch(chunkUrl(i),{cache:'force-cache'});
      if(!r.ok) throw new Error(`v89.0 field chunk ${i} failed: ${r.status}`);
      return (await r.text()).trim();
    }));
    const binary=atob(parts.join(''));
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    fieldObjectUrl=URL.createObjectURL(new Blob([bytes],{type:'image/avif'}));
    return fieldObjectUrl;
  })().catch(err=>{
    fieldPromise=null;
    console.warn('[NFL v89.0] clean field art unavailable:',err);
    return '';
  });
  return fieldPromise;
}

function ensureVisibleField(scene){
  let img=scene.querySelector(':scope > .tso-v890-fieldImage');
  if(!img){
    img=document.createElement('img');
    img.className='tso-v890-fieldImage';
    img.alt='';
    img.setAttribute('aria-hidden','true');
    img.decoding='async';
    scene.prepend(img);
  }
  loadFieldObjectUrl().then(url=>{
    if(url&&img.isConnected&&img.getAttribute('src')!==url){
      img.onload=()=>img.classList.add('is-ready');
      img.setAttribute('src',url);
      if(img.complete&&img.naturalWidth) img.classList.add('is-ready');
    }
  });
  return img;
}

function ensureTeamLogo(scene,side,url){
  const cls=`tso-v890-teamLogo--${side}`;
  let img=scene.querySelector(`:scope > .${cls}`);
  if(!url){
    img?.remove();
    return null;
  }
  if(!img){
    img=document.createElement('img');
    img.className=`tso-v890-teamLogo ${cls}`;
    img.alt='';
    img.setAttribute('aria-hidden','true');
    scene.appendChild(img);
  }
  if(img.getAttribute('src')!==url) img.setAttribute('src',url);
  return img;
}

function removeLegacyGeometryFx(scene){
  scene.querySelectorAll(':scope > .tso-v887-fieldfx,:scope > .tso-v887-scrim,:scope > .tso-v888-fieldfx,:scope > .tso-v888-scrim,:scope > .tso-v889-fieldfx,:scope > .tso-v889-scrim').forEach(n=>n.remove());
  const warp=scene.querySelector(':scope > .tso-v888-stageWarp');
  if(warp){
    while(warp.firstChild) scene.insertBefore(warp.firstChild,warp);
    warp.remove();
  }
}

function restructureRoot(root){
  const scene=root?.querySelector('.tso-ps886e__scene');
  if(!scene) return;

  removeLegacyGeometryFx(scene);
  const field=sourceField(scene);
  const [awayLogo,homeLogo]=extractTeamLogoUrls(field);
  if(field) field.dataset.v890LogicField='1';

  ensureVisibleField(scene);
  ensureTeamLogo(scene,'away',awayLogo);
  ensureTeamLogo(scene,'home',homeLogo);

  root.dataset.tsoV890='1';
  root.dataset.tsoFieldArchitecture='image-visible__svg-logic__overlay-gameplay';
}

function run(){
  rafId=0;
  enhanceNflGamecastV889Now();
  document.querySelectorAll(ROOT_SELECTOR).forEach(restructureRoot);
}

function schedule(){
  if(typeof document==='undefined') return;
  if(typeof requestAnimationFrame!=='function'){
    queueMicrotask(run);
    return;
  }
  if(rafId) cancelAnimationFrame(rafId);
  rafId=requestAnimationFrame(run);
}

export function enhanceNflGamecastV890Now(){
  if(typeof document==='undefined') return 0;
  ensureNflGamecastV890Styles();
  run();
  return document.querySelectorAll(ROOT_SELECTOR).length;
}

export function installNflGamecastV890Enhancer(){
  if(typeof document==='undefined') return null;
  ensureNflGamecastV890Styles();
  if(observer) return observer;

  const oldObserver=installNflGamecastV889Enhancer();
  oldObserver?.disconnect?.();

  observer=new MutationObserver(schedule);
  observer.observe(document.getElementById('nflView')||document.body,{childList:true,subtree:true});
  run();
  return observer;
}

export const __V890_TEST__={FIELD_CHUNK_COUNT,FIELD_CHUNK_PREFIX};
