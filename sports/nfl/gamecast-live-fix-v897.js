const ROOT_SELECTOR='[data-tso-v886e-gamecast]';
const OLD={w:1672,h:415,topY:91,bottomY:402,leftTop:170,rightTop:1502,leftBottom:0,rightBottom:1672};
// Calibrated to the actual painted sidelines in the approved v89.0 field art.
const FIELD={w:1672,h:415,topY:87,bottomY:354,leftTop:276,rightTop:1394,leftBottom:46,rightBottom:1621};
let installed=false,observer=null,raf=0,cachedFieldSrc='';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(+v)?+v:a));
const roots=()=>[...document.querySelectorAll(ROOT_SELECTOR)];
const text=(el,v)=>{if(el&&el.textContent!==String(v??''))el.textContent=String(v??'');};

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

function setBeam(lines,start,u){
  const a=newPoint(u,0),b=newPoint(u,1);
  for(let i=start;i<Math.min(start+4,lines.length);i++){
    const line=lines[i];
    line.setAttribute('x1',a.x.toFixed(2));line.setAttribute('y1',a.y.toFixed(2));
    line.setAttribute('x2',b.x.toFixed(2));line.setAttribute('y2',b.y.toFixed(2));
    line.dataset.v897Projected='1';
  }
}
function reprojectDownLines(root){
  const svg=root.querySelector('.tso-ps886e__downlines');if(!svg)return;
  const lines=[...svg.querySelectorAll('line')];
  if(lines.length>=8){
    const uLos=clamp((Number(lines[0].getAttribute('x1'))-OLD.leftTop)/(OLD.rightTop-OLD.leftTop),0,1);
    const uFd=clamp((Number(lines[4].getAttribute('x1'))-OLD.leftTop)/(OLD.rightTop-OLD.leftTop),0,1);
    setBeam(lines,0,uLos);setBeam(lines,4,uFd);
  }
  svg.dataset.v897FieldCalibration='1';
}
function updateDownLinesFromSnapshot(root,snap){
  const live=snap?.liveScore||{},pos=snap?.possession;
  const y=Number(live.yardFromOwn),dist=Number(live.distance);
  if(!Number.isFinite(y)||(pos!=='away'&&pos!=='home'))return;
  const los=clamp(pos==='away'?y:100-y,0,100);
  const fd=clamp(los+(pos==='away'?1:-1)*(Number.isFinite(dist)?dist:10),0,100);
  const svg=root.querySelector('.tso-ps886e__downlines');if(!svg)return;
  const lines=[...svg.querySelectorAll('line')];if(lines.length<8)return;
  setBeam(lines,0,(10+los)/120);setBeam(lines,4,(10+fd)/120);
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

function ensurePatchSentinel(root){
  // The legacy live callback only falls back to a destructive full render when
  // its incremental patcher cannot find [data-v883b-drive]. v88.6e replaced
  // that old drive card with PlayStage, so provide a hidden compatibility node.
  // This makes the callback update the header/state in place instead of tearing
  // down the field on every snap.
  if(root.querySelector('[data-v883b-drive]'))return;
  const sentinel=document.createElement('span');
  sentinel.hidden=true;sentinel.setAttribute('aria-hidden','true');sentinel.dataset.v883bDrive='1';sentinel.dataset.v897PatchSentinel='1';
  root.appendChild(sentinel);
}

function downLabel(snap){
  const l=snap?.liveScore||{};if(l.downDistanceText)return l.downDistanceText;
  const d=Number(l.down),n=Number(l.distance);if(!Number.isFinite(d)||!Number.isFinite(n))return'Live';
  return `${d}${d===1?'st':d===2?'nd':d===3?'rd':'th'} & ${n}`;
}
function fieldLabel(snap){
  const l=snap?.liveScore||{},p=snap?.possession,y=Math.round(Number(l.yardFromOwn));
  if(!Number.isFinite(y)||(p!=='away'&&p!=='home'))return'50';
  const own=p==='away'?snap?.away?.abbr:snap?.home?.abbr,opp=p==='away'?snap?.home?.abbr:snap?.away?.abbr;
  return y<=50?`${own||''} ${y}`:`${opp||''} ${100-y}`;
}
function setAvatar(host,head,name){
  if(!host)return;
  if(head){const img=host.querySelector('img');if(!img||img.src!==head)host.innerHTML=`<img src="${String(head).replace(/"/g,'&quot;')}" alt="">`;}
  else if(!host.querySelector('img')){const initial=String(name||'P').trim().charAt(0).toUpperCase()||'P';host.innerHTML=`<span class="init">${initial}</span>`;}
}
function patchPanels(root,snap){
  const panels=[...root.querySelectorAll('.tso-ps886e__panel')];if(panels.length<2)return;
  const cp=snap?.currentPlay||{},name=cp.playerName||'Live Player',pos=cp.playerPos||'Player',no=cp.playerNo?` #${cp.playerNo}`:'';
  const current=panels[0],featured=panels[1],drive=snap?.liveScore?.currentDrive||{};
  text(current.querySelector('.tso-ps886e__pname'),`${downLabel(snap)}  |  ${fieldLabel(snap)}`);
  text(current.querySelector('.tso-ps886e__psub'),`${name} · ${pos}${no}`);
  text(current.querySelector('.tso-ps886e__copy'),cp.description||snap?.liveScore?.lastPlayText||'Live play updating.');
  setAvatar(current.querySelector('.tso-ps886e__avatar'),cp.headshot,name);
  const stats=[...current.querySelectorAll('.tso-ps886e__stats b')];
  if(stats[0])text(stats[0],drive.playCount??cp.drivePlays??'—');
  if(stats[1])text(stats[1],drive.yards??cp.driveYards??'—');
  if(stats[2])text(stats[2],drive.elapsedDisplay??cp.driveTime??'—');
  if(stats[3])text(stats[3],cp.resultYards??cp.yards??0);

  text(featured.querySelector('.tso-ps886e__pname'),name);
  text(featured.querySelector('.tso-ps886e__psub'),`${pos}${no}`);
  setAvatar(featured.querySelector('.tso-ps886e__avatar'),cp.headshot,name);
  const title=featured.querySelector('.tso-ps886e__title'),team=snap?.possession==='home'?snap?.home:snap?.away;
  const logo=title?.querySelector('img');if(logo&&team?.logo&&logo.getAttribute('src')!==team.logo)logo.setAttribute('src',team.logo);
}

function playKind(textValue){
  const s=String(textValue||'').toLowerCase();
  if(/punt|kickoff|field goal|extra point/.test(s))return'kick';
  if(/pass|sack|scrambl/.test(s))return'pass';
  if(/rush|left (end|guard|tackle)|right (end|guard|tackle)|up the middle/.test(s))return'rush';
  return'other';
}

function animateSnap(root,snap){
  const playText=String(snap?.currentPlay?.description||snap?.liveScore?.lastPlayText||'').trim();if(!playText)return;
  const key=`${snap?.gameId||''}|${snap?.currentPlay?.id||playText}`;
  if(root.dataset.v897AnimatedKey===key)return;
  const all=[...root.querySelectorAll('.tso-ps886e__actors > .tso-ps886e__actor:not(.ghost)')];if(all.length<11)return;
  root.dataset.v897AnimatedKey=key;
  const offense=all.slice(0,11),defense=all.slice(11,22),ball=root.querySelector('.tso-ps886e__ball');
  const dir=snap?.possession==='home'?-1:1,kind=playKind(playText),ease='cubic-bezier(.16,.78,.22,1)';
  offense.forEach((a,i)=>{
    const role=a.dataset.v888Role||(['QB','OL','OL','OL','OL','OL','RB','TE','WR','WR','WR'][i]||'WR');
    let dx=0,dy=((i%3)-1)*4;
    if(role==='OL'){dx=dir*(kind==='pass'?7:18);dy=((i%2)?4:-4);}
    else if(role==='QB'){dx=kind==='pass'?-dir*28:dir*(kind==='rush'?18:7);dy=0;}
    else if(kind==='pass'){dx=dir*(role==='WR'?118:role==='TE'?84:58);dy=((i%3)-1)*22;}
    else if(kind==='rush'){dx=dir*(role==='RB'?126:role==='TE'?50:36);dy=role==='RB'?0:dy*2;}
    else if(kind==='kick'){dx=dir*(role==='WR'?54:20);}
    else dx=dir*34;
    a.getAnimations?.().forEach(x=>x.cancel());
    a.animate?.([{translate:'0px 0px'},{translate:`${dx*.36}px ${dy*.45}px`,offset:.30},{translate:`${dx}px ${dy}px`,offset:.84},{translate:'0px 0px'}],{duration:3300,easing:ease});
  });
  defense.forEach((a,i)=>{
    const dx=dir*(kind==='pass'?42:kind==='rush'?72:34),dy=((i%5)-2)*7;
    a.getAnimations?.().forEach(x=>x.cancel());
    a.animate?.([{translate:'0px 0px'},{translate:`${dx*.32}px ${dy*.3}px`,offset:.32},{translate:`${dx}px ${dy}px`,offset:.84},{translate:'0px 0px'}],{duration:3300,easing:ease});
  });
  if(ball){
    ball.getAnimations?.().forEach(x=>x.cancel());
    const dx=dir*(kind==='pass'?180:kind==='rush'?120:kind==='kick'?220:55),lift=kind==='pass'||kind==='kick'?-34:-8;
    ball.animate?.([{translate:'0px 0px',scale:'1'},{translate:`${dx*.18}px ${lift*.5}px`,scale:'1.2',offset:.32},{translate:`${dx}px ${lift}px`,scale:'.9',offset:.84},{translate:'0px 0px',scale:'1'}],{duration:3200,easing:ease});
  }
  root.dataset.tsoReenacting='1';setTimeout(()=>{if(root.isConnected)root.dataset.tsoReenacting='0';},3400);
}

function processRoot(root){
  if(!root)return;root.removeAttribute('data-tso-v886c-gamecast');
  const scene=root.querySelector('.tso-ps886e__scene');if(!scene)return;
  preserveField(scene);ensurePatchSentinel(root);reprojectDownLines(root);reprojectGameplay(root);
  const snap=window.__TSO_NFL_LIVE_LATEST__;
  if(snap){updateDownLinesFromSnapshot(root,snap);patchPanels(root,snap);setTimeout(()=>{if(root.isConnected)animateSnap(root,snap);},80);}
  root.dataset.tsoV897='1';
}
function run(){raf=0;roots().forEach(processRoot);}
function schedule(){if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>requestAnimationFrame(run));}

function onLive(e){
  const snap=e?.detail||window.__TSO_NFL_LIVE_LATEST__;if(!snap)return;
  // Snapshot events arrive before the old callback. Patch the v88.6e PlayStage
  // immediately; the hidden sentinel then makes the legacy callback take its
  // incremental path rather than rebuilding the whole field.
  roots().forEach(r=>{processRoot(r);updateDownLinesFromSnapshot(r,snap);patchPanels(r,snap);});
  setTimeout(()=>roots().forEach(r=>animateSnap(r,snap)),120);
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
    ${ROOT_SELECTOR} [data-v897-patch-sentinel]{display:none!important}
  `;
  if(!document.getElementById(style.id))document.head.appendChild(style);
  const existing=document.querySelector(`${ROOT_SELECTOR} .tso-v890-fieldImage`);if(existing?.src)cachedFieldSrc=existing.src;
  observer=new MutationObserver(schedule);observer.observe(document.getElementById('nflView')||document.body,{childList:true,subtree:true});
  window.addEventListener('tso:nfl-live-snapshot',onLive);
  run();return observer;
}

export const __V897_TEST__={OLD,FIELD,oldUV,newPoint,playKind};
