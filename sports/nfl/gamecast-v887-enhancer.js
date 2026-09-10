import { ensureNflGamecastV887Styles } from './gamecast-v887-styles.js?v=88.7';

const ROOT_SELECTOR='[data-tso-v886e-gamecast]';
const ROLE_MAP=['QB','OL','OL','OL','OL','OL','RB','TE','WR','WR','WR','DL','DL','DL','DL','LB','LB','LB','DB','DB','DB','DB'];
let observer=null;
let scheduled=false;

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
    arms:`<path d="M38 54 C27 61 22 72 28 80"/><path d="M63 53 C72 59 75 69 69 76"/>`,
    legs:`<path d="M45 89 C39 104 34 119 31 137"/><path d="M57 89 C62 104 69 116 77 128"/>`,
    ball:`<g transform="translate(67 74) rotate(-19)"><ellipse cx="0" cy="0" rx="9" ry="5.2" fill="#8e4a24" stroke="#e8d7c9" stroke-width="1"/><path d="M-4 0 H4 M-1 -2 V2 M2 -2 V2" stroke="#f4e8de" stroke-width=".85"/></g>`
  };
  if(role==='OL'||role==='DL') return {
    arms:`<path d="M38 55 C25 62 19 75 15 87"/><path d="M64 55 C78 61 83 73 87 84"/>`,
    legs:`<path d="M44 88 C34 103 27 117 22 132"/><path d="M58 88 C69 102 77 115 87 126"/>`,
    ball:''
  };
  if(role==='LB') return {
    arms:`<path d="M38 54 C26 61 20 72 14 83"/><path d="M64 53 C76 60 82 69 89 78"/>`,
    legs:`<path d="M45 89 C34 104 29 119 24 135"/><path d="M58 89 C69 103 76 116 86 128"/>`,
    ball:''
  };
  return {
    arms:`<path d="M39 54 C26 62 20 73 14 86"/><path d="M64 52 C74 58 82 67 90 76"/>`,
    legs:`<path d="M45 88 C36 102 31 117 26 136"/><path d="M58 88 C68 100 78 111 91 120"/>`,
    ball:''
  };
}

function realisticPlayerSvg({palette,role,dir=1,ghost=false,logo='',number='',uid='p'}){
  const p=palette;
  const safeUid=String(uid).replace(/[^a-z0-9_-]/gi,'');
  const ids={helmet:`v887-helmet-${safeUid}`,jersey:`v887-jersey-${safeUid}`,pants:`v887-pants-${safeUid}`,skin:`v887-skin-${safeUid}`,shadow:`v887-shadow-${safeUid}`};
  const parts=poseParts(role);
  const mirror=dir<0?'translate(102 0) scale(-1 1)':'';
  const bulky=role==='OL'||role==='DL';
  const padL=bulky?31:34,padR=bulky?71:68;
  const chestTop=47,chestBottom=91;
  const opacity=ghost?.74:1;
  const helmetLogo=logo&&!ghost?`<image href="${logo.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" x="48" y="18" width="17" height="13" preserveAspectRatio="xMidYMid meet" opacity=".98"/>`:'';
  return `<svg class="v887-player" viewBox="0 0 102 145" aria-hidden="true">
    <defs>
      <linearGradient id="${ids.helmet}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".16" stop-color="${p.helmet}"/><stop offset=".72" stop-color="${p.helmet}"/><stop offset="1" stop-color="#3c4651"/></linearGradient>
      <linearGradient id="${ids.jersey}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${p.accent}"/><stop offset=".19" stop-color="${p.jersey}"/><stop offset=".73" stop-color="${p.jersey}"/><stop offset="1" stop-color="#030913"/></linearGradient>
      <linearGradient id="${ids.pants}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${p.pants}"/><stop offset="1" stop-color="#697582"/></linearGradient>
      <linearGradient id="${ids.skin}" x1="0" x2="1"><stop offset="0" stop-color="#754432"/><stop offset=".45" stop-color="${p.skin}"/><stop offset="1" stop-color="#6b3b2d"/></linearGradient>
      <radialGradient id="${ids.shadow}"><stop offset="0" stop-color="rgba(0,0,0,.5)"/><stop offset="1" stop-color="rgba(0,0,0,0)"/></radialGradient>
    </defs>
    <ellipse cx="51" cy="139" rx="27" ry="6" fill="url(#${ids.shadow})"/>
    <g transform="${mirror}" opacity="${opacity}">
      <g fill="none" stroke="url(#${ids.skin})" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">${parts.arms}</g>
      <g fill="none" stroke="url(#${ids.pants})" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">${parts.legs}</g>
      <path d="M${padL} 50 Q51 37 ${padR} 50 L66 ${chestBottom} Q51 99 36 ${chestBottom}Z" fill="url(#${ids.jersey})" stroke="rgba(255,255,255,.34)" stroke-width="1.1"/>
      <path d="M${padL} 52 Q51 43 ${padR} 52" fill="none" stroke="${p.accent}" stroke-width="7" stroke-linecap="round" opacity=".98"/>
      <path class="v887-pad-highlight" d="M35 51 Q50 42 67 51" fill="none" stroke="rgba(255,255,255,.42)" stroke-width="1.4"/>
      <path d="M39 89 Q51 95 63 89 L61 104 Q51 109 41 104Z" fill="url(#${ids.pants})" stroke="rgba(0,0,0,.25)" stroke-width="1"/>
      <path d="M45 91 V103 M57 91 V103" stroke="${p.accent}" stroke-width="2.2" opacity=".72"/>
      <ellipse cx="51" cy="31" rx="19" ry="21" fill="url(#${ids.helmet})" stroke="rgba(255,255,255,.74)" stroke-width="1.5"/>
      <path d="M35 31 Q44 22 61 25 L67 35 L61 45 H38 Q34 40 35 31Z" fill="#07111d" opacity=".90"/>
      <path d="M33 27 Q42 11 58 12 Q70 14 75 26" fill="none" stroke="rgba(255,255,255,.30)" stroke-width="2.5" stroke-linecap="round"/>
      ${helmetLogo}
      <g class="v887-facemask" fill="none" stroke="#dce6ee" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
        <path d="M66 27 Q82 30 79 43 L68 48"/><path d="M67 33 H83"/><path d="M67 39 H80"/><path d="M69 45 H76"/>
      </g>
      <path d="M39 45 Q51 49 64 45" fill="none" stroke="rgba(0,0,0,.34)" stroke-width="2"/>
      ${parts.ball}
      <path class="v887-cleat" d="M21 132 h17" stroke="#eef4f8" stroke-width="5.5" stroke-linecap="round"/><path class="v887-cleat" d="M79 127 h17" stroke="#eef4f8" stroke-width="5.5" stroke-linecap="round"/>
    </g>
    ${number?`<text class="v887-jersey-number" x="51" y="76" fill="#fff" font-family="Arial Black,Arial,sans-serif" font-size="15" font-weight="900" text-anchor="middle">${number}</text>`:''}
  </svg>`;
}

function enhanceActors(root){
  const actors=[...root.querySelectorAll('.tso-ps886e__actors > .tso-ps886e__actor')];
  let liveIndex=0;
  actors.forEach((actor,actorIndex)=>{
    const ghost=actor.classList.contains('ghost');
    const role=ghost?'GHOST':(ROLE_MAP[liveIndex]||'WR');
    if(!ghost) liveIndex++;
    if(actor.dataset.v887Enhanced==='1') return;
    const graphic=actor.querySelector('.tso-ps886e__actorGraphic');
    if(!graphic) return;
    const palette=paletteFromGraphic(graphic,ghost);
    const logo=teamLogoFromGraphic(graphic);
    const dir=oldDirection(graphic);
    const number=numberFromActor(actor);
    actor.dataset.v887Role=role;
    graphic.innerHTML=realisticPlayerSvg({palette,role:ghost?'WR':role,dir,ghost,logo,number,uid:`a${actorIndex}`});
    actor.dataset.v887Enhanced='1';
  });
}

function enhanceField(root){
  const scene=root.querySelector('.tso-ps886e__scene');
  if(!scene) return;
  if(!scene.querySelector('.tso-v887-fieldfx')){
    const fx=document.createElement('div');
    fx.className='tso-v887-fieldfx';
    fx.setAttribute('aria-hidden','true');
    scene.prepend(fx);
  }
  if(!scene.querySelector('.tso-v887-scrim')){
    const scrim=document.createElement('div');
    scrim.className='tso-v887-scrim';
    scrim.setAttribute('aria-hidden','true');
    scene.append(scrim);
  }
  const down=scene.querySelector('.tso-ps886e__downlines');
  if(down&&!down.dataset.v887Enhanced){
    down.dataset.v887Enhanced='1';
    down.setAttribute('aria-label','Line of scrimmage and line to gain');
  }
  const routes=scene.querySelector('.tso-ps886e__routes');
  if(routes&&!routes.dataset.v887Enhanced){
    routes.dataset.v887Enhanced='1';
    const paths=[...routes.querySelectorAll('path')];
    if(paths[1]) paths[1].setAttribute('stroke-dasharray','5 8');
  }
}

function enhanceRoot(root){
  if(!root) return;
  ensureNflGamecastV887Styles();
  enhanceField(root);
  enhanceActors(root);
  root.dataset.tsoV887='1';
}

function run(){
  scheduled=false;
  document.querySelectorAll(ROOT_SELECTOR).forEach(enhanceRoot);
}

function schedule(){
  if(scheduled||typeof document==='undefined') return;
  scheduled=true;
  queueMicrotask(run);
}

export function enhanceNflGamecastV887Now(){
  if(typeof document==='undefined') return 0;
  ensureNflGamecastV887Styles();
  const roots=[...document.querySelectorAll(ROOT_SELECTOR)];
  roots.forEach(enhanceRoot);
  return roots.length;
}

export function installNflGamecastV887Enhancer(){
  if(typeof document==='undefined') return null;
  ensureNflGamecastV887Styles();
  if(observer) return observer;
  observer=new MutationObserver(schedule);
  observer.observe(document.getElementById('nflView')||document.body,{childList:true,subtree:true});
  enhanceNflGamecastV887Now();
  return observer;
}

export const __V887_TEST__={ROLE_MAP};
