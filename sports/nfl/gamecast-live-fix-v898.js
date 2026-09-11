const ROOT_SELECTOR='[data-tso-v886e-gamecast]';
const OLD={w:1672,h:415,topY:91,bottomY:402,leftTop:170,rightTop:1502,leftBottom:0,rightBottom:1672};
const FIELD={w:1672,h:415,topY:87,bottomY:354,leftTop:276,rightTop:1394,leftBottom:46,rightBottom:1621};
const OFF_ROLES=['QB','OL','OL','OL','OL','OL','RB','TE','WR','WR','WR'];
const DEF_ROLES=['DL','DL','DL','DL','LB','LB','LB','DB','DB','DB','DB'];
let installed=false,observer=null,raf=0,cachedFieldSrc='';
const lastAnimatedByGame=new Map();

const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(+v)?+v:a));
const roots=()=>[...document.querySelectorAll(ROOT_SELECTOR)];
const text=(el,v)=>{if(el&&el.textContent!==String(v??''))el.textContent=String(v??'');};
const teamNorm=v=>({LAR:'LA',JAC:'JAX',WAS:'WSH',OAK:'LV',SD:'LAC',STL:'LA'}[String(v||'').toUpperCase()]||String(v||'').toUpperCase());

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
function fieldUV(x,y){
  const v=clamp((y-FIELD.topY)/(FIELD.bottomY-FIELD.topY),0,1);
  const left=FIELD.leftTop+(FIELD.leftBottom-FIELD.leftTop)*v;
  const right=FIELD.rightTop+(FIELD.rightBottom-FIELD.rightTop)*v;
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
    line.dataset.v898Projected='1';
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
  svg.dataset.v898FieldCalibration='1';
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
  if(root.dataset.v898GameplayProjected==='1')return;
  root.dataset.v898Calibrating='1';
  const nodes=[...root.querySelectorAll('.tso-ps886e__actors > .tso-ps886e__actor'),root.querySelector('.tso-ps886e__ball')].filter(Boolean);
  for(const el of nodes){
    const lp=parseFloat(el.style.left),tp=parseFloat(el.style.top);if(!Number.isFinite(lp)||!Number.isFinite(tp))continue;
    const uv=oldUV(lp/100*OLD.w,tp/100*OLD.h),p=newPoint(uv.u,uv.v);
    el.style.left=`${(p.x/FIELD.w*100).toFixed(4)}%`;el.style.top=`${(p.y/FIELD.h*100).toFixed(4)}%`;
  }
  root.dataset.v898GameplayProjected='1';
  requestAnimationFrame(()=>requestAnimationFrame(()=>{if(root.isConnected)delete root.dataset.v898Calibrating;}));
}
function ensurePatchSentinel(root){
  if(root.querySelector('[data-v883b-drive]'))return;
  const sentinel=document.createElement('span');
  sentinel.hidden=true;sentinel.setAttribute('aria-hidden','true');sentinel.dataset.v883bDrive='1';sentinel.dataset.v898PatchSentinel='1';
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

function playKind(value){
  const s=String(value||'').toLowerCase();
  if(/punt|kickoff|field goal|extra point/.test(s))return'kick';
  if(/sack/.test(s))return'sack';
  if(/pass|scrambl/.test(s))return'pass';
  if(/rush|left (end|guard|tackle)|right (end|guard|tackle)|up the middle/.test(s))return'rush';
  return'other';
}
function snapshotKey(snap){
  const cp=snap?.currentPlay||{},last=(snap?.liveScore?.plays||[]).at?.(-1)||{},drive=snap?.liveScore?.currentDrive||{};
  const desc=String(cp.description||last.text||snap?.liveScore?.lastPlayText||'').trim();
  const ident=cp.id||last.id||`${drive.id||''}|${drive.playCount??''}|${desc}`;
  return `${snap?.gameId||''}|${ident}`;
}
function offenseAbbr(snap){return teamNorm(snap?.possession==='home'?snap?.home?.abbr:snap?.away?.abbr);}
function liveFieldYard(snap){
  const y=Number(snap?.liveScore?.yardFromOwn),p=snap?.possession;
  if(!Number.isFinite(y)||(p!=='away'&&p!=='home'))return 50;
  return clamp(p==='away'?y:100-y,0,100);
}
function qbFromSnapshot(snap){
  const team=offenseAbbr(snap),rows=Object.values(snap?.liveScore?.playerStats?.byId||{});
  let q=rows.find(r=>teamNorm(r?.team)===team&&String(r?.position||'').toUpperCase()==='QB');
  if(q)return{name:q.name||'QB',jersey:q.jersey||''};
  const box=snap?.liveScore?.boxScore?.teams?.[team];
  for(const sec of box?.sections||[]){q=(sec.rows||[]).find(r=>String(r?.position||'').toUpperCase()==='QB');if(q)return{name:q.name||'QB',jersey:q.jersey||''};}
  if(String(snap?.currentPlay?.playerPos||'').toUpperCase()==='QB')return{name:snap.currentPlay.playerName||'QB',jersey:snap.currentPlay.playerNo||''};
  return{name:`${team||''} QB`.trim()||'QB',jersey:''};
}
function actorLabel(actor,value){
  if(!actor)return;let label=actor.querySelector(':scope > .tso-ps886e__actorLabel');
  if(!value){label?.remove();return;}
  if(!label){label=document.createElement('span');label.className='tso-ps886e__actorLabel';actor.appendChild(label);}
  text(label,String(value).trim().split(/\s+/).at(-1)||value);
}
function primaryIndex(snap,kind){
  const pos=String(snap?.currentPlay?.playerPos||'').toUpperCase();
  if(pos==='QB')return 0;if(/^(RB|HB|FB)$/.test(pos))return 6;if(pos==='TE')return 7;if(pos==='WR')return 8;
  if(kind==='rush')return 6;if(kind==='pass'||kind==='sack')return 0;return 6;
}
function syncActorIdentity(root,snap,kind){
  const actors=[...root.querySelectorAll('.tso-ps886e__actors > .tso-ps886e__actor:not(.ghost)')],off=actors.slice(0,11);if(off.length<11)return;
  const qb=qbFromSnapshot(snap),idx=primaryIndex(snap,kind),cp=snap?.currentPlay||{},cpLast=String(cp.playerName||'').trim().split(/\s+/).at(-1)||'';
  actorLabel(off[0],qb.name||'QB');
  if(idx!==0&&cpLast){for(let i=1;i<off.length;i++){const l=off[i].querySelector(':scope > .tso-ps886e__actorLabel');if(l&&l.textContent===cpLast&&i!==idx)l.remove();}actorLabel(off[idx],cp.playerName);}
}

function place(el,fieldYard,lateral){
  if(!el)return;el.getAnimations?.().forEach(a=>a.cancel());el.style.translate='0px 0px';
  const p=newPoint((10+clamp(fieldYard,0,100))/120,clamp(lateral,.08,.92));
  el.style.left=`${(p.x/FIELD.w*100).toFixed(4)}%`;el.style.top=`${(p.y/FIELD.h*100).toFixed(4)}%`;el.style.setProperty('--scale',(.72+clamp(lateral,.08,.92)*.42).toFixed(3));
}
function placeFormation(root,snap,kind){
  const actors=[...root.querySelectorAll('.tso-ps886e__actors > .tso-ps886e__actor:not(.ghost)')];if(actors.length<22)return false;
  const off=actors.slice(0,11),def=actors.slice(11,22),los=liveFieldYard(snap),attack=snap?.possession==='home'?-1:1;
  const O=[
    [los-4.8*attack,.60],[los-.45*attack,.40],[los-.30*attack,.47],[los-.15*attack,.54],[los,.61],[los+.15*attack,.68],
    [los-4.0*attack,.52],[los-.9*attack,.76],[los-.7*attack,.24],[los-.8*attack,.33],[los-.7*attack,.86]
  ];
  const D=[
    [los+1.1*attack,.41],[los+1.2*attack,.48],[los+1.25*attack,.56],[los+1.15*attack,.64],
    [los+4.8*attack,.36],[los+5.2*attack,.54],[los+4.9*attack,.72],[los+10.2*attack,.22],[los+10.7*attack,.43],[los+11.0*attack,.64],[los+10.4*attack,.82]
  ];
  off.forEach((a,i)=>place(a,O[i][0],O[i][1]));def.forEach((a,i)=>place(a,D[i][0],D[i][1]));
  const ball=root.querySelector('.tso-ps886e__ball');
  const start=kind==='rush'?O[6]:O[0];if(ball)place(ball,start[0]+.4*attack,start[1]);
  syncActorIdentity(root,snap,kind);return true;
}
function deltaFor(el,forwardYards,lateralDelta,attack){
  const lp=parseFloat(el.style.left),tp=parseFloat(el.style.top);if(!Number.isFinite(lp)||!Number.isFinite(tp))return{dx:0,dy:0};
  const x=lp/100*FIELD.w,y=tp/100*FIELD.h,uv=fieldUV(x,y),to=newPoint(uv.u+attack*forwardYards/120,uv.v+lateralDelta);
  return{dx:to.x-x,dy:to.y-y};
}
function tween(el,forwardYards,lateralDelta,attack,{duration=2400,delay=0,ease='cubic-bezier(.18,.72,.22,1)'}={}){
  if(!el)return;const {dx,dy}=deltaFor(el,forwardYards,lateralDelta,attack);el.getAnimations?.().forEach(a=>a.cancel());
  el.animate?.([{translate:'0px 0px'},{translate:`${(dx*.42).toFixed(1)}px ${(dy*.42).toFixed(1)}px`,offset:.38},{translate:`${dx.toFixed(1)}px ${dy.toFixed(1)}px`}],{duration,delay,easing:ease,fill:'forwards'});
}
function animateSnap(root,snap){
  const playText=String(snap?.currentPlay?.description||snap?.liveScore?.lastPlayText||'').trim();if(!playText)return false;
  const gameId=String(snap?.gameId||''),key=snapshotKey(snap);if(lastAnimatedByGame.get(gameId)===key)return false;
  const actors=[...root.querySelectorAll('.tso-ps886e__actors > .tso-ps886e__actor:not(.ghost)')];if(actors.length<22)return false;
  const kind=playKind(playText),attack=snap?.possession==='home'?-1:1,off=actors.slice(0,11),def=actors.slice(11,22),gain=clamp(Number(snap?.currentPlay?.resultYards??snap?.currentPlay?.yards??0),-12,40);
  placeFormation(root,snap,kind);lastAnimatedByGame.set(gameId,key);root.dataset.v898AnimatedKey=key;

  off.forEach((a,i)=>{
    const role=OFF_ROLES[i];let y=0,l=0;
    if(kind==='pass'){
      if(role==='QB')y=-3.2;else if(role==='OL'){y=1.1;l=(i%2?.008:-.008);}else if(role==='RB'){y=3.5;l=.035;}else if(role==='TE'){y=8;l=-.018;}else if(role==='WR'){y=[12,15,18][Math.max(0,i-8)]||12;l=[-.025,.035,-.045][Math.max(0,i-8)]||0;}
    }else if(kind==='sack'){
      if(role==='QB')y=gain<0?gain:-5;else if(role==='OL')y=-.8;else y=2;
    }else if(kind==='rush'){
      if(role==='RB')y=gain||6;else if(role==='QB')y=.5;else if(role==='OL')y=2.3;else if(role==='TE')y=2.8;else y=1.5;
      if(role==='RB')l=/left/i.test(playText)?-.035:/right/i.test(playText)?.035:0;
    }else if(kind==='kick'){y=role==='WR'?6:role==='QB'?0:2;}
    else y=role==='QB'?1:2.5;
    tween(a,y,l,attack,{duration:kind==='rush'?2100:2450,delay:role==='WR'&&kind==='pass'?90:0});
  });
  def.forEach((a,i)=>{
    const role=DEF_ROLES[i];let y=0,l=((i%3)-1)*.012;
    if(kind==='pass'){y=role==='DL'?-3.5:role==='LB'?3.2:10.5;}
    else if(kind==='sack'){y=role==='DL'?-5.5:role==='LB'?-2.2:2.5;}
    else if(kind==='rush'){y=role==='DL'?2.2:role==='LB'?4.5:Math.max(3,Math.min(8,(gain||6)*.65));l=((i%4)-1.5)*.018;}
    else if(kind==='kick')y=5;else y=2.5;
    tween(a,y,l,attack,{duration:kind==='rush'?2150:2450,delay:role==='DB'?80:20});
  });
  const ball=root.querySelector('.tso-ps886e__ball');
  if(ball){
    let y=0,l=0,duration=1750,delay=180;
    if(kind==='pass'){y=Math.max(9,Math.min(24,Math.abs(gain)||15));l=/left/i.test(playText)?-.07:/right/i.test(playText)?.07:-.015;duration=1550;delay=520;}
    else if(kind==='sack'){y=gain<0?gain:-5;duration=1300;delay=150;}
    else if(kind==='rush'){y=gain||6;l=/left/i.test(playText)?-.035:/right/i.test(playText)?.035:0;duration=1950;delay=80;}
    else if(kind==='kick'){y=28;l=-.02;duration=1900;delay=220;}
    tween(ball,y,l,attack,{duration,delay,ease:'cubic-bezier(.22,.72,.18,1)'});
  }
  root.dataset.tsoReenacting='1';setTimeout(()=>{if(root.isConnected)root.dataset.tsoReenacting='0';},2900);return true;
}
function prepareForSnapshot(root,snap){
  if(!snap)return;const key=snapshotKey(snap),kind=playKind(snap?.currentPlay?.description||snap?.liveScore?.lastPlayText||'');
  if(root.dataset.v898PreparedKey!==key){placeFormation(root,snap,kind);root.dataset.v898PreparedKey=key;}
  syncActorIdentity(root,snap,kind);
}

function processRoot(root){
  if(!root)return;root.removeAttribute('data-tso-v886c-gamecast');
  const scene=root.querySelector('.tso-ps886e__scene');if(!scene)return;
  preserveField(scene);ensurePatchSentinel(root);reprojectDownLines(root);reprojectGameplay(root);
  const snap=window.__TSO_NFL_LIVE_LATEST__;
  if(snap){updateDownLinesFromSnapshot(root,snap);patchPanels(root,snap);prepareForSnapshot(root,snap);setTimeout(()=>{if(root.isConnected)animateSnap(root,snap);},90);}
  root.dataset.tsoV898='1';
}
function run(){raf=0;roots().forEach(processRoot);}
function schedule(){if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>requestAnimationFrame(run));}
function onLive(e){
  const snap=e?.detail||window.__TSO_NFL_LIVE_LATEST__;if(!snap)return;
  roots().forEach(r=>{processRoot(r);updateDownLinesFromSnapshot(r,snap);patchPanels(r,snap);prepareForSnapshot(r,snap);});
  setTimeout(()=>roots().forEach(r=>animateSnap(r,snap)),110);
}

export function installNflGamecastLiveFixV898(){
  if(installed||typeof document==='undefined')return observer;installed=true;
  const style=document.createElement('style');style.id='tso-gamecast-live-fix-v898';
  style.textContent=`
    ${ROOT_SELECTOR} .tso-v890-fieldImage{opacity:1!important;transition:none!important}
    ${ROOT_SELECTOR}[data-v898-calibrating="1"] .tso-ps886e__actor,
    ${ROOT_SELECTOR}[data-v898-calibrating="1"] .tso-ps886e__ball{transition:none!important}
    ${ROOT_SELECTOR} .tso-ps886e__downlines{overflow:visible!important}
    ${ROOT_SELECTOR}[data-tso-reenacting="1"] .tso-ps886e__actor,
    ${ROOT_SELECTOR}[data-tso-reenacting="1"] .tso-ps886e__ball{will-change:translate,left,top}
    ${ROOT_SELECTOR} [data-v898-patch-sentinel]{display:none!important}
  `;
  if(!document.getElementById(style.id))document.head.appendChild(style);
  const existing=document.querySelector(`${ROOT_SELECTOR} .tso-v890-fieldImage`);if(existing?.src)cachedFieldSrc=existing.src;
  observer=new MutationObserver(schedule);observer.observe(document.getElementById('nflView')||document.body,{childList:true,subtree:true});
  window.addEventListener('tso:nfl-live-snapshot',onLive);
  run();return observer;
}

export const __V898_TEST__={OLD,FIELD,oldUV,newPoint,fieldUV,playKind,snapshotKey,liveFieldYard,primaryIndex};
