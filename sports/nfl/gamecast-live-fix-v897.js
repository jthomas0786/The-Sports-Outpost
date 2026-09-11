const ROOT_SELECTOR='[data-tso-v886e-gamecast]';
const OLD={w:1672,h:415,topY:91,bottomY:402,leftTop:170,rightTop:1502,leftBottom:0,rightBottom:1672};
// Calibrated directly to the approved v89.0 field artwork. The old geometry
// extended below the near sideline and was too wide at the far sideline.
const FIELD={w:1672,h:415,topY:87,bottomY:354,leftTop:276,rightTop:1394,leftBottom:46,rightBottom:1621};
let installed=false,observer=null,raf=0,cachedFieldSrc='';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(+v)?+v:a));
const roots=()=>[...document.querySelectorAll(ROOT_SELECTOR)];

function newPoint(u,v){
  v=clamp(v,0,1);u=clamp(u,0,1);
  const y=FIELD.topY+(FIELD.bottomY-FIELD.topY)*v;
  const left=FIELD.leftTop+(FIELD.leftBottom-FIELD.leftTop)*v;
  const right=FIELD.rightTop+(FIELD.rightBottom-FIELD.rightTop)*v;
  return{x:left+(right-left)*u,y};
}
function oldUV(x,y){
  const v=clamp((y-OLD.topY)/(OLD.bottomY-OLD.topY),0,1);
  const left=OLD.leftTop+(OLD.leftBottom-OLD.leftTop)*v;
  const right=OLD.rightTop+(OLD.rightBottom-OLD.rightTop)*v;
  return{u:clamp((x-left)/Math.max(1,right-left),0,1),v};
}

function preserveField(scene){
  let img=scene?.querySelector(':scope > .tso-v890-fieldImage');
  if(img?.src)cachedFieldSrc=img.src;
  if(!img&&cachedFieldSrc){
    img=document.createElement('img');
    img.className='tso-v890-fieldImage is-ready';img.alt='';img.setAttribute('aria-hidden','true');img.src=cachedFieldSrc;
    scene.prepend(img);
  }
  if(img){img.classList.add('is-ready');img.style.opacity='1';}
}

function reprojectDownLines(root){
  const svg=root.querySelector('.tso-ps886e__downlines');if(!svg)return;
  for(const line of svg.querySelectorAll('line')){
    if(line.dataset.v897Projected==='1')continue;
    const x1=Number(line.getAttribute('x1')),y1=Number(line.getAttribute('y1'));
    if(!Number.isFinite(x1)||!Number.isFinite(y1))continue;
    // Every scrimmage/first-down beam is a constant-yard line. Infer its yard
    // fraction from the old far-sideline endpoint, then draw it exactly between
    // the painted far and near sidelines in the v89.0 artwork.
    const u=clamp((x1-OLD.leftTop)/(OLD.rightTop-OLD.leftTop),0,1);
    const a=newPoint(u,0),b=newPoint(u,1);
    line.setAttribute('x1',a.x.toFixed(2));line.setAttribute('y1',a.y.toFixed(2));
    line.setAttribute('x2',b.x.toFixed(2));line.setAttribute('y2',b.y.toFixed(2));
    line.dataset.v897Projected='1';
  }
  svg.dataset.v897FieldCalibration='1';
}

function reprojectGameplay(root){
  if(root.dataset.v897GameplayProjected==='1')return;
  root.dataset.v897Calibrating='1';
  const nodes=[...root.querySelectorAll('.tso-ps886e__actors > .tso-ps886e__actor'),root.querySelector('.tso-ps886e__ball')].filter(Boolean);
  for(const el of nodes){
    const lp=parseFloat(el.style.left),tp=parseFloat(el.style.top);if(!Number.isFinite(lp)||!Number.isFinite(tp))continue;
    const uv=oldUV(lp/100*OLD.w,tp/100*OLD.h),p=newPoint(uv.u,uv.v);
    el.style.left=`${(p.x/FIELD.w*100).toFixed(4)}%`;el.style.top=`${(p.y/FIELD.h*100).toFixed(4)}%`;
  }
  root.dataset.v897GameplayProjected='1';
  requestAnimationFrame(()=>requestAnimationFrame(()=>{if(root.isConnected)delete root.dataset.v897Calibrating;}));
}

function playKind(text){
  const s=String(text||'').toLowerCase();
  if(/punt|kickoff/.test(s))return'kick';
  if(/field goal|extra point/.test(s))return'kick';
  if(/pass|sack|scrambl/.test(s))return'pass';
  if(/rush|left (end|guard|tackle)|right (end|guard|tackle)|up the middle/.test(s))return'rush';
  return'other';
}

function animateSnap(root,snap){
  const text=String(snap?.currentPlay?.description||snap?.liveScore?.lastPlayText||'').trim();if(!text)return;
  const key=`${snap?.gameId||''}|${snap?.currentPlay?.id||text}`;
  if(root.dataset.v897AnimatedKey===key)return;
  const all=[...root.querySelectorAll('.tso-ps886e__actors > .tso-ps886e__actor:not(.ghost)')];
  if(all.length<11)return;
  root.dataset.v897AnimatedKey=key;
  const offense=all.slice(0,11),defense=all.slice(11,22),ball=root.querySelector('.tso-ps886e__ball');
  const dir=snap?.possession==='home'?-1:1,kind=playKind(text),ease='cubic-bezier(.16,.78,.22,1)';
  offense.forEach((a,i)=>{
    const role=a.dataset.v888Role||(['QB','OL','OL','OL','OL','OL','RB','TE','WR','WR','WR'][i]||'WR');
    let dx=0,dy=((i%3)-1)*4;
    if(role==='OL'){dx=dir*(kind==='pass'?6:14);dy=((i%2)?3:-3);}
    else if(role==='QB'){dx=kind==='pass'?-dir*22:dir*(kind==='rush'?15:5);dy=0;}
    else if(kind==='pass'){dx=dir*(role==='WR'?96:role==='TE'?68:48);dy=((i%3)-1)*18;}
    else if(kind==='rush'){dx=dir*(role==='RB'?104:role==='TE'?42:30);dy=role==='RB'?0:dy*2;}
    else if(kind==='kick'){dx=dir*(role==='WR'?45:16);}
    else dx=dir*28;
    a.getAnimations?.().forEach(x=>x.cancel());
    a.animate?.([{translate:'0px 0px'},{translate:`${dx*.38}px ${dy*.5}px`,offset:.34},{translate:`${dx}px ${dy}px`,offset:.82},{translate:'0px 0px'}],{duration:3000,easing:ease});
  });
  defense.forEach((a,i)=>{
    const dx=dir*(kind==='pass'?34:kind==='rush'?58:28),dy=((i%5)-2)*6;
    a.getAnimations?.().forEach(x=>x.cancel());
    a.animate?.([{translate:'0px 0px'},{translate:`${dx*.35}px ${dy*.35}px`,offset:.36},{translate:`${dx}px ${dy}px`,offset:.82},{translate:'0px 0px'}],{duration:3000,easing:ease});
  });
  if(ball){
    ball.getAnimations?.().forEach(x=>x.cancel());
    const dx=dir*(kind==='pass'?150:kind==='rush'?102:kind==='kick'?190:45),lift=kind==='pass'||kind==='kick'?-28:-7;
    ball.animate?.([{translate:'0px 0px',scale:'1'},{translate:`${dx*.2}px ${lift*.55}px`,scale:'1.18',offset:.38},{translate:`${dx}px ${lift}px`,scale:'.9',offset:.82},{translate:'0px 0px',scale:'1'}],{duration:2900,easing:ease});
  }
  root.dataset.tsoReenacting='1';setTimeout(()=>{if(root.isConnected)root.dataset.tsoReenacting='0';},3100);
}

function processRoot(root){
  if(!root)return;root.removeAttribute('data-tso-v886c-gamecast');
  const scene=root.querySelector('.tso-ps886e__scene');if(!scene)return;
  preserveField(scene);reprojectDownLines(root);reprojectGameplay(root);
  const snap=window.__TSO_NFL_LIVE_LATEST__;if(snap)setTimeout(()=>{if(root.isConnected)animateSnap(root,snap);},70);
  root.dataset.tsoV897='1';
}
function run(){raf=0;roots().forEach(processRoot);}
function schedule(){if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>requestAnimationFrame(run));}

function onLive(e){
  const snap=e?.detail||window.__TSO_NFL_LIVE_LATEST__;if(!snap)return;
  // Let the base renderer finish its meaningful-play update, then animate the
  // newly mounted actors instead of the old DOM that is about to be replaced.
  setTimeout(()=>roots().forEach(r=>{processRoot(r);animateSnap(r,snap);}),110);
}

export function installNflGamecastLiveFixV897(){
  if(installed||typeof document==='undefined')return observer;installed=true;
  const style=document.createElement('style');style.id='tso-gamecast-live-fix-v897';
  style.textContent=`
    ${ROOT_SELECTOR} .tso-v890-fieldImage{opacity:1!important;transition:none!important}
    ${ROOT_SELECTOR}[data-v897-calibrating="1"] .tso-ps886e__actor,
    ${ROOT_SELECTOR}[data-v897-calibrating="1"] .tso-ps886e__ball{transition:none!important}
    ${ROOT_SELECTOR} .tso-ps886e__downlines{overflow:visible!important}
    ${ROOT_SELECTOR}[data-tso-reenacting="1"] .tso-ps886e__actor,
    ${ROOT_SELECTOR}[data-tso-reenacting="1"] .tso-ps886e__ball{will-change:translate,left,top}
  `;
  if(!document.getElementById(style.id))document.head.appendChild(style);
  // Cache the already-loaded field before any later live render can replace it.
  const existing=document.querySelector(`${ROOT_SELECTOR} .tso-v890-fieldImage`);if(existing?.src)cachedFieldSrc=existing.src;
  observer=new MutationObserver(schedule);observer.observe(document.getElementById('nflView')||document.body,{childList:true,subtree:true});
  window.addEventListener('tso:nfl-live-snapshot',onLive);
  run();return observer;
}

export const __V897_TEST__={OLD,FIELD,oldUV,newPoint,playKind};
