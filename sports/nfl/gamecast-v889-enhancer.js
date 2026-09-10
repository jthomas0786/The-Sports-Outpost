import { installNflGamecastV888Enhancer, enhanceNflGamecastV888Now } from './gamecast-v888-enhancer.js?v=88.8';
import { ensureNflGamecastV889Styles } from './gamecast-v889-styles.js?v=88.9';

const ROOT_SELECTOR='[data-tso-v886e-gamecast]';
let observer=null;
let rafId=0;

function setAttr(el,attrs){
  Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));
}

function unwrapV888Stage(scene){
  const warp=scene.querySelector(':scope > .tso-v888-stageWarp');
  if(warp){
    while(warp.firstChild) scene.insertBefore(warp.firstChild,warp);
    warp.remove();
  }
  scene.querySelectorAll(':scope > .tso-v888-fieldfx,:scope > .tso-v888-scrim').forEach(n=>n.remove());
  scene.dataset.v889NativeGeometry='1';
}

function alignEndzones(fieldSvg){
  if(!fieldSvg) return;
  const texts=[...fieldSvg.querySelectorAll('text')];
  const images=[...fieldSvg.querySelectorAll('image')];
  const names=texts.filter(t=>String(t.getAttribute('font-size'))==='38'||t.classList.contains('tso-v888-endzone-text')||t.classList.contains('tso-v889-endzone-text'));

  // The stadium shell's transparent field aperture is authored to the native
  // SCENE coordinates: top corners 170/1502 at y=91, bottom corners 0/1672 at
  // y=402. The endzone centerline angle is therefore ~63.4°, not vertical.
  if(names[0]){
    names[0].classList.remove('tso-v888-endzone-text');
    names[0].classList.add('tso-v889-endzone-text');
    setAttr(names[0],{x:141,y:248,'text-anchor':'middle',transform:'rotate(-63.4 141 248)'});
  }
  if(names[1]){
    names[1].classList.remove('tso-v888-endzone-text');
    names[1].classList.add('tso-v889-endzone-text');
    setAttr(names[1],{x:1531,y:248,'text-anchor':'middle',transform:'rotate(63.4 1531 248)'});
  }

  if(images[0]){
    images[0].classList.remove('tso-v888-endzone-logo');
    images[0].classList.add('tso-v889-endzone-logo');
    setAttr(images[0],{x:168,y:108,width:78,height:48,opacity:.98,transform:'rotate(-5.5 207 132)'});
  }
  if(images[1]){
    images[1].classList.remove('tso-v888-endzone-logo');
    images[1].classList.add('tso-v889-endzone-logo');
    setAttr(images[1],{x:1426,y:108,width:78,height:48,opacity:.98,transform:'rotate(5.5 1465 132)'});
  }
  fieldSvg.dataset.v889Endzones='1';
}

function refineRoot(root){
  const scene=root?.querySelector('.tso-ps886e__scene');
  if(!scene) return;
  unwrapV888Stage(scene);
  const field=scene.querySelector(':scope > .tso-ps886e__fieldSvg:not(.tso-ps886e__downlines):not(.tso-ps886e__routes)');
  if(field){
    field.classList.add('tso-v889-basefield');
    alignEndzones(field);
  }
  if(!scene.querySelector(':scope > .tso-v889-fieldfx')){
    const fx=document.createElement('div');
    fx.className='tso-v889-fieldfx';
    fx.setAttribute('aria-hidden','true');
    scene.prepend(fx);
  }
  if(!scene.querySelector(':scope > .tso-v889-scrim')){
    const scrim=document.createElement('div');
    scrim.className='tso-v889-scrim';
    scrim.setAttribute('aria-hidden','true');
    scene.append(scrim);
  }
  root.dataset.tsoV889='1';
}

function run(){
  rafId=0;
  // Reuse v88.8's player refinement, then immediately remove only its field
  // warp. This preserves the improved athletes without letting the old warp
  // distort the stadium-authored perspective plane.
  enhanceNflGamecastV888Now();
  document.querySelectorAll(ROOT_SELECTOR).forEach(refineRoot);
}

function schedule(){
  if(typeof document==='undefined') return;
  if(rafId) cancelAnimationFrame(rafId);
  rafId=requestAnimationFrame(run);
}

export function enhanceNflGamecastV889Now(){
  if(typeof document==='undefined') return 0;
  ensureNflGamecastV889Styles();
  run();
  return document.querySelectorAll(ROOT_SELECTOR).length;
}

export function installNflGamecastV889Enhancer(){
  if(typeof document==='undefined') return null;
  ensureNflGamecastV889Styles();
  if(observer) return observer;

  // Install v88.8 once to get its player pipeline/styles, then disconnect its
  // observer so v88.9 is the single owner of subsequent refresh scheduling.
  const oldObserver=installNflGamecastV888Enhancer();
  oldObserver?.disconnect?.();

  observer=new MutationObserver(schedule);
  observer.observe(document.getElementById('nflView')||document.body,{childList:true,subtree:true});
  run();
  return observer;
}

export const __V889_TEST__={endzoneAngle:63.4};