import { ensureNflGamecastV888Styles } from './gamecast-v888-styles.js?v=88.8';

const ROOT_SELECTOR='[data-tso-v886e-gamecast]';
const ROLE_MAP=['QB','OL','OL','OL','OL','OL','RB','TE','WR','WR','WR','DL','DL','DL','DL','LB','LB','LB','DB','DB','DB','DB'];
let observer=null;
let rafId=0;

const clean=v=>String(v||'').trim();
const safeColor=(v,fallback)=>/^#[0-9a-f]{3,8}$/i.test(clean(v))?clean(v):fallback;

function paletteFromGraphic(graphic,ghost=false){
  if(ghost) return {helmet:'#eef4f8',jersey:'#c8d1da',accent:'#ffffff',pants:'#d7dde3',skin:'#aeb7c0'};
  const stops=[...graphic.querySelectorAll('linearGradient stop')].map(n=>clean(n.getAttribute('stop-color'))).filter(Boolean);
  return {
    helmet:safeColor(stops[1],'#f4f6f8'),
    accent:safeColor(stops[4],'#7ccfff'),
    jersey:safeColor(stops[5],'#0d315c'),
    pants:safeColor(stops[8],'#f1f4f7'),
    skin:'#b97858'
  };
}

function teamLogoFromGraphic(graphic){
  const img=graphic.querySelector('image');
  return clean(img?.getAttribute('href')||img?.getAttribute('xlink:href'));
}

function oldDirection(graphic){
  return /scale\(-1\s+1\)/.test(graphic.innerHTML) ? -1 : 1;
}

function numberFromActor(actor){
  const svgText=[...actor.querySelectorAll('.tso-ps886e__actorGraphic text')]
    .map(n=>clean(n.textContent)).find(v=>/^\d{1,2}$/.test(v));
  return svgText||'';
}

function poseParts(role){
  if(role==='QB') return {
    arms:`<path d="M37 58 C24 66 19 76 24 87"/><path d="M65 56 C76 62 81 72 77 81"/>`,
    legs:`<path d="M46 94 C40 108 36 123 33 139"/><path d="M58 94 C64 108 73 121 81 132"/>`,
    ball:`<g transform="translate(72 78) rotate(-18)"><ellipse cx="0" cy="0" rx="10" ry="5.5" fill="#8e4a24" stroke="#e8d7c9" stroke-width="1"/><path d="M-4 0 H4 M-1 -2 V2 M2 -2 V2" stroke="#f4e8de" stroke-width=".85"/></g>`
  };
  if(role==='OL'||role==='DL') return {
    arms:`<path d="M39 60 C26 67 18 81 14 92"/><path d="M64 60 C78 67 85 79 90 89"/>`,
    legs:`<path d="M44 95 C35 108 29 124 24 139"/><path d="M59 95 C69 108 78 121 88 134"/>`,
    ball:''
  };
  if(role==='LB') return {
    arms:`<path d="M38 58 C26 67 18 77 13 88"/><path d="M65 57 C77 64 84 74 91 83"/>`,
    legs:`<path d="M45 94 C36 109 31 124 25 140"/><path d="M58 94 C69 108 77 121 88 132"/>`,
    ball:''
  };
  return {
    arms:`<path d="M38 57 C25 66 17 78 11 90"/><path d="M65 55 C75 62 85 71 92 80"/>`,
    legs:`<path d="M45 94 C35 108 29 123 23 141"/><path d="M58 94 C69 106 80 118 93 127"/>`,
    ball:''
  };
}

function realisticPlayerSvg({palette,role,dir=1,ghost=false,logo='',number='',uid='p'}){
  const p=palette;
  const safeUid=String(uid).replace(/[^a-z0-9_-]/gi,'');
  const ids={helmet:`v888-helmet-${safeUid}`,jersey:`v888-jersey-${safeUid}`,pants:`v888-pants-${safeUid}`,skin:`v888-skin-${safeUid}`,shadow:`v888-shadow-${safeUid}`};
  const parts=poseParts(role);
  const mirror=dir<0?'translate(106 0) scale(-1 1)':'';
  const bulky=role==='OL'||role==='DL';
  const padL=bulky?30:34,padR=bulky?74:70;
  const opacity=ghost?.74:1;
  const helmetLogo=logo&&!ghost?`<image href="${logo.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" x="48" y="18" width="18" height="13" preserveAspectRatio="xMidYMid meet" opacity=".98"/>`:'';
  return `<svg class="v888-player" viewBox="0 0 106 148" aria-hidden="true">
    <defs>
      <linearGradient id="${ids.helmet}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".16" stop-color="${p.helmet}"/><stop offset=".72" stop-color="${p.helmet}"/><stop offset="1" stop-color="#3c4651"/></linearGradient>
      <linearGradient id="${ids.jersey}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${p.accent}"/><stop offset=".19" stop-color="${p.jersey}"/><stop offset=".73" stop-color="${p.jersey}"/><stop offset="1" stop-color="#030913"/></linearGradient>
      <linearGradient id="${ids.pants}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${p.pants}"/><stop offset="1" stop-color="#697582"/></linearGradient>
      <linearGradient id="${ids.skin}" x1="0" x2="1"><stop offset="0" stop-color="#754432"/><stop offset=".45" stop-color="${p.skin}"/><stop offset="1" stop-color="#6b3b2d"/></linearGradient>
      <radialGradient id="${ids.shadow}"><stop offset="0" stop-color="rgba(0,0,0,.52)"/><stop offset="1" stop-color="rgba(0,0,0,0)"/></radialGradient>
    </defs>
    <ellipse cx="53" cy="142" rx="28" ry="6" fill="url(#${ids.shadow})"/>
    <g transform="${mirror}" opacity="${opacity}">
      <g fill="none" stroke="url(#${ids.skin})" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">${parts.arms}</g>
      <g fill="none" stroke="url(#${ids.pants})" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">${parts.legs}</g>
      <path d="M${padL} 53 Q53 39 ${padR} 53 L67 95 Q53 102 39 95Z" fill="url(#${ids.jersey})" stroke="rgba(255,255,255,.34)" stroke-width="1.2"/>
      <path d="M${padL} 55 Q53 45 ${padR} 55" fill="none" stroke="${p.accent}" stroke-width="7.5" stroke-linecap="round" opacity=".98"/>
      <path class="v888-pad-highlight" d="M36 53 Q53 44 70 53" fill="none" stroke="rgba(255,255,255,.42)" stroke-width="1.4"/>
      <path d="M40 95 Q53 101 66 95 L64 111 Q53 116 42 111Z" fill="url(#${ids.pants})" stroke="rgba(0,0,0,.25)" stroke-width="1"/>
      <path d="M47 97 V109 M59 97 V109" stroke="${p.accent}" stroke-width="2.2" opacity=".74"/>
      <ellipse cx="53" cy="32" rx="20" ry="22" fill="url(#${ids.helmet})" stroke="rgba(255,255,255,.74)" stroke-width="1.5"/>
      <path d="M37 32 Q46 23 64 26 L70 37 L63 47 H40 Q35 42 37 32Z" fill="#07111d" opacity=".92"/>
      <path d="M35 28 Q44 12 60 13 Q72 15 78 28" fill="none" stroke="rgba(255,255,255,.30)" stroke-width="2.6" stroke-linecap="round"/>
      ${helmetLogo}
      <g class="v888-facemask" fill="none" stroke="#dce6ee" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round">
        <path d="M68 28 Q84 31 81 45 L69 50"/>
        <path d="M68 34 H85"/><path d="M68 40 H82"/><path d="M70 46 H78"/>
      </g>
      <path d="M40 47 Q53 51 66 47" fill="none" stroke="rgba(0,0,0,.34)" stroke-width="2"/>
      ${parts.ball}
      <path class="v888-cleat" d="M22 139 h18" stroke="#eef4f8" stroke-width="5.5" stroke-linecap="round"/>
      <path class="v888-cleat" d="M81 132 h18" stroke="#eef4f8" stroke-width="5.5" stroke-linecap="round"/>
    </g>
    ${number?`<text class="v888-jersey-number" x="53" y="79" fill="#fff" font-family="Arial Black,Arial,sans-serif" font-size="15" font-weight="900" text-anchor="middle">${number}</text>`:''}
  </svg>`;
}

function ensureStageWarp(scene){
  let warp=scene.querySelector(':scope > .tso-v888-stageWarp');
  if(warp) return warp;
  warp=document.createElement('div');
  warp.className='tso-v888-stageWarp';
  const kids=[...scene.children];
  kids.forEach(child=>warp.appendChild(child));
  scene.appendChild(warp);
  return warp;
}

function setAttr(el, attrs){
  Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));
}

function enhanceEndzones(fieldSvg){
  if(!fieldSvg || fieldSvg.dataset.v888Endzones==='1') return;
  const images=[...fieldSvg.querySelectorAll('image')];
  const texts=[...fieldSvg.querySelectorAll('text')];
  const endzoneTexts=texts.filter(t=>String(t.getAttribute('font-size'))==='38');
  if(endzoneTexts[0]){
    endzoneTexts[0].classList.add('tso-v888-endzone-text');
    setAttr(endzoneTexts[0],{x:94,y:306,'text-anchor':'middle',transform:'rotate(-90 94 306)'});
  }
  if(endzoneTexts[1]){
    endzoneTexts[1].classList.add('tso-v888-endzone-text');
    setAttr(endzoneTexts[1],{x:1578,y:306,'text-anchor':'middle',transform:'rotate(90 1578 306)'});
  }
  if(images[0]){
    images[0].classList.add('tso-v888-endzone-logo');
    setAttr(images[0],{x:46,y:226,width:44,height:34,opacity:.98});
  }
  if(images[1]){
    images[1].classList.add('tso-v888-endzone-logo');
    setAttr(images[1],{x:1570,y:225,width:48,height:36,opacity:.98});
  }
  fieldSvg.dataset.v888Endzones='1';
}

function enhanceActors(root){
  const actors=[...root.querySelectorAll('.tso-ps886e__actors > .tso-ps886e__actor')];
  let liveIndex=0;
  actors.forEach((actor,actorIndex)=>{
    const ghost=actor.classList.contains('ghost');
    const role=ghost?'GHOST':(ROLE_MAP[liveIndex]||'WR');
    if(!ghost) liveIndex++;
    const graphic=actor.querySelector('.tso-ps886e__actorGraphic');
    if(!graphic) return;
    const signature=[ghost,role,oldDirection(graphic),numberFromActor(actor),teamLogoFromGraphic(graphic)].join('|');
    if(actor.dataset.v888Signature===signature) {
      actor.dataset.v888Role=role;
      return;
    }
    const palette=paletteFromGraphic(graphic,ghost);
    const logo=teamLogoFromGraphic(graphic);
    const dir=oldDirection(graphic);
    const number=numberFromActor(actor);
    actor.dataset.v888Role=role;
    graphic.innerHTML=realisticPlayerSvg({palette,role:ghost?'WR':role,dir,ghost,logo,number,uid:`a${actorIndex}`});
    actor.dataset.v888Signature=signature;
  });
}

function enhanceField(root){
  const scene=root.querySelector('.tso-ps886e__scene');
  if(!scene) return;
  ensureStageWarp(scene);
  const warp=scene.querySelector(':scope > .tso-v888-stageWarp');
  const baseField=warp?.querySelector('.tso-ps886e__fieldSvg:not(.tso-ps886e__downlines):not(.tso-ps886e__routes)');
  if(baseField){
    baseField.classList.add('tso-v888-basefield');
    enhanceEndzones(baseField);
  }
  if(!scene.querySelector(':scope > .tso-v888-fieldfx')){
    const fx=document.createElement('div');
    fx.className='tso-v888-fieldfx';
    fx.setAttribute('aria-hidden','true');
    scene.prepend(fx);
  }
  if(!scene.querySelector(':scope > .tso-v888-scrim')){
    const scrim=document.createElement('div');
    scrim.className='tso-v888-scrim';
    scrim.setAttribute('aria-hidden','true');
    scene.append(scrim);
  }
  const down=scene.querySelector('.tso-ps886e__downlines');
  if(down&&!down.dataset.v888Enhanced){
    down.dataset.v888Enhanced='1';
    down.setAttribute('aria-label','Line of scrimmage and line to gain');
  }
  const routes=scene.querySelector('.tso-ps886e__routes');
  if(routes&&!routes.dataset.v888Enhanced){
    routes.dataset.v888Enhanced='1';
    const paths=[...routes.querySelectorAll('path')];
    if(paths[1]) paths[1].setAttribute('stroke-dasharray','6 8');
    if(paths[3]) paths[3].setAttribute('stroke-width','3.6');
  }
}

function enhanceRoot(root){
  if(!root) return;
  ensureNflGamecastV888Styles();
  enhanceField(root);
  enhanceActors(root);
  root.dataset.tsoV888='1';
}

function run(){
  rafId=0;
  document.querySelectorAll(ROOT_SELECTOR).forEach(enhanceRoot);
}

function schedule(){
  if(typeof document==='undefined') return;
  if(rafId) cancelAnimationFrame(rafId);
  rafId=requestAnimationFrame(run);
}

export function enhanceNflGamecastV888Now(){
  if(typeof document==='undefined') return 0;
  ensureNflGamecastV888Styles();
  const roots=[...document.querySelectorAll(ROOT_SELECTOR)];
  roots.forEach(enhanceRoot);
  return roots.length;
}

export function installNflGamecastV888Enhancer(){
  if(typeof document==='undefined') return null;
  ensureNflGamecastV888Styles();
  if(observer) return observer;
  observer=new MutationObserver(schedule);
  observer.observe(document.getElementById('nflView')||document.body,{childList:true,subtree:true});
  enhanceNflGamecastV888Now();
  return observer;
}

export const __V888_TEST__={ROLE_MAP, enhanceEndzones};
