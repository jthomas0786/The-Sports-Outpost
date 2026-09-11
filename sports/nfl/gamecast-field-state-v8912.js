/**
 * v89.14 renderer for the NFL PlayStage.
 * This module does not infer live state. It only visualizes snap.gamecastState,
 * which is created after the live document has passed the authoritative acceptor.
 */
const ROOT='[data-tso-v886e-gamecast]';
const FIELD={w:1672,h:415,topY:87,bottomY:354,leftTop:276,rightTop:1394,leftBottom:46,rightBottom:1621};
const OFF_ROLES=['QB','OL','OL','OL','OL','OL','RB','TE','WR','WR','WR'];
const DEF_ROLES=['DL','DL','DL','DL','LB','LB','LB','DB','DB','DB','DB'];
const lastAnimatedByGame=new Map();
let observer=null,pending=false;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const num=v=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const sideOf=s=>s==='home'||s==='away'?s:null;
const attackDir=side=>side==='home'?-1:1;
const fieldAbs=(side,own)=>{const y=num(own);if(y==null||!sideOf(side))return null;return clamp(side==='home'?100-y:y,0,100);};
function fieldPoint(absYard,lateral){
  const u=clamp(Number(absYard)||0,0,100)/100,v=clamp(Number(lateral)||0,0,1);
  const topX=FIELD.leftTop+(FIELD.rightTop-FIELD.leftTop)*u;
  const bottomX=FIELD.leftBottom+(FIELD.rightBottom-FIELD.leftBottom)*u;
  return {x:topX+(bottomX-topX)*v,y:FIELD.topY+(FIELD.bottomY-FIELD.topY)*v};
}
function linePoint(absYard){
  const u=clamp(Number(absYard)||0,0,100)/100;
  return {x1:FIELD.leftTop+(FIELD.rightTop-FIELD.leftTop)*u,y1:FIELD.topY,x2:FIELD.leftBottom+(FIELD.rightBottom-FIELD.leftBottom)*u,y2:FIELD.bottomY};
}
function setBeam(lines,offset,absYard){
  const p=linePoint(absYard);
  for(let i=offset;i<Math.min(offset+4,lines.length);i++){
    const el=lines[i];el.setAttribute('x1',p.x1.toFixed(2));el.setAttribute('y1',p.y1.toFixed(2));el.setAttribute('x2',p.x2.toFixed(2));el.setAttribute('y2',p.y2.toFixed(2));
  }
}
function stateOf(snap){return snap?.gamecastState||snap?.liveScore?.gamecastState||null;}
function currentSide(snap,state){return sideOf(snap?.possession)||sideOf(state?.possession)||null;}
function patchLines(stage,snap,mode='current'){
  const st=stateOf(snap);if(!st)return;
  const svg=stage.querySelector('.tso-ps886e__downlines'),lines=[...svg?.querySelectorAll('line')||[]];if(lines.length<8)return;
  let side=currentSide(snap,st),los=num(st.currentYardFromOwn),first=num(st.currentFirstDownYardFromOwn);
  if(mode==='play'&&sideOf(st.playOffenseSide)&&num(st.startYardFromOwn)!=null){side=st.playOffenseSide;los=st.startYardFromOwn;first=st.preSnapFirstDownYardFromOwn;}
  const abs=fieldAbs(side,los);if(abs==null)return;
  setBeam(lines,0,abs);
  const firstAbs=fieldAbs(side,first);setBeam(lines,4,firstAbs==null?abs:firstAbs);
  svg.dataset.tsoAuthority='v89.14';
}
function patchSituation(stage,snap){
  const st=stateOf(snap),live=snap?.liveScore||{};if(!st)return;
  const down=num(live.down),distance=num(live.distance),own=num(st.currentYardFromOwn),side=currentSide(snap,st);
  const team=side==='home'?snap?.home?.abbr:snap?.away?.abbr,opp=side==='home'?snap?.away?.abbr:snap?.home?.abbr;
  const pos=own==null?'':own<=50?`${team||''} ${Math.round(own)}`:`${opp||''} ${Math.round(100-own)}`;
  const ordinal=d=>d===1?'1st':d===2?'2nd':d===3?'3rd':`${d||''}th`;
  const dd=live.downDistanceText||(down!=null&&distance!=null?`${ordinal(down)} & ${distance}`:'');
  const set=(sel,val)=>{const el=document.querySelector(`#nflView:not([hidden]) ${sel}`);if(el&&val&&el.textContent!==String(val))el.textContent=String(val);};
  set('[data-v883a-situation-primary]',dd);set('[data-v883a-situation-secondary]',pos);
}
function actors(stage){
  const all=[...stage.querySelectorAll('.tso-ps886e__actor:not(.ghost)')];
  all.forEach((a,i)=>{a.hidden=i>=22;a.dataset.tsoSlot=String(i);});
  return all.slice(0,22);
}
function pctPoint(abs,lateral){const p=fieldPoint(abs,lateral);return {left:`${(p.x/FIELD.w*100).toFixed(4)}%`,top:`${(p.y/FIELD.h*100).toFixed(4)}%`};}
function cancelMotion(el){try{el.getAnimations?.().forEach(a=>a.cancel());}catch{}}
function place(el,abs,lateral){if(!el)return;cancelMotion(el);const p=pctPoint(abs,lateral);el.style.left=p.left;el.style.top=p.top;}
function move(el,abs,lateral,{duration=1850,delay=0}={}){
  if(!el)return;cancelMotion(el);const to=pctPoint(abs,lateral),from={left:el.style.left,top:el.style.top};
  if(typeof el.animate!=='function'){el.style.left=to.left;el.style.top=to.top;return;}
  const anim=el.animate([from,to],{duration,delay,easing:'cubic-bezier(.2,.72,.2,1)',fill:'forwards'});
  anim.onfinish=()=>{el.style.left=to.left;el.style.top=to.top;try{anim.cancel();}catch{}};
}
function ensureLabel(actor,text){
  actor.querySelector(':scope > .tso-ps886e__actorLabel')?.remove();
  if(!text)return;
  const el=document.createElement('span');el.className='tso-ps886e__actorLabel';el.textContent=String(text).split(/\s+/).at(-1)||String(text);actor.append(el);
}
function focus(actor,on){
  if(!actor)return;actor.classList.toggle('focus',!!on);
  let spot=actor.querySelector(':scope > .tso-ps886e__actorSpot');
  if(on&&!spot){spot=document.createElement('span');spot.className='tso-ps886e__actorSpot';actor.prepend(spot);}else if(!on)spot?.remove();
}
function roleActors(stage){
  const list=actors(stage);if(list.length<22)return null;
  const offense=list.slice(0,11),defense=list.slice(11,22);
  offense.forEach((a,i)=>{a.dataset.tsoSide='offense';a.dataset.tsoRole=OFF_ROLES[i];a.dataset.v887Role=OFF_ROLES[i];});
  defense.forEach((a,i)=>{a.dataset.tsoSide='defense';a.dataset.tsoRole=DEF_ROLES[i];a.dataset.v887Role=DEF_ROLES[i];});
  return {offense,defense};
}
function skillIndex(player,direction='middle'){
  const pos=String(player?.position||'').toUpperCase();
  if(pos==='QB')return 0;if(['RB','HB','FB'].includes(pos))return 6;if(pos==='TE')return 7;
  if(direction==='left')return 8;if(direction==='right')return 10;return 9;
}
function patchIdentity(stage,snap){
  const st=stateOf(snap),group=roleActors(stage);if(!st||!group)return;
  for(const a of group.offense){ensureLabel(a,'');focus(a,false);delete a.dataset.tsoPlayer;}
  const qb=st.passer; if(qb?.name){ensureLabel(group.offense[0],qb.name);group.offense[0].dataset.tsoPlayer=qb.name;focus(group.offense[0],st.kind==='sack');}
  const involved=st.kind==='rush'?st.runner:st.kind==='pass'?st.target:null;
  if(involved?.name){
    const idx=skillIndex(involved,st.direction);
    if(idx!==0||!qb?.name||String(involved.name).toLowerCase()!==String(qb.name).toLowerCase()){
      ensureLabel(group.offense[idx],involved.name);group.offense[idx].dataset.tsoPlayer=involved.name;focus(group.offense[idx],true);
    }else focus(group.offense[0],true);
  }
}
function formation(stage,side,ownYard){
  const group=roleActors(stage);if(!group)return null;
  const los=fieldAbs(side,ownYard);if(los==null)return null;const dir=attackDir(side);
  const off=[
    [los-dir*4.8,.50],
    [los-dir*.35,.34],[los-dir*.25,.405],[los-dir*.15,.47],[los-dir*.25,.535],[los-dir*.35,.61],
    [los-dir*3.7,.55],[los-dir*.7,.69],[los-dir*.9,.18],[los-dir*.8,.50],[los-dir*.9,.82]
  ];
  const def=[
    [los+dir*1.6,.36],[los+dir*1.5,.445],[los+dir*1.5,.525],[los+dir*1.6,.61],
    [los+dir*4.8,.39],[los+dir*4.7,.53],[los+dir*4.8,.66],
    [los+dir*7.8,.18],[los+dir*8.8,.39],[los+dir*9.0,.62],[los+dir*7.8,.82]
  ];
  group.offense.forEach((a,i)=>place(a,clamp(off[i][0],0,100),off[i][1]));
  group.defense.forEach((a,i)=>place(a,clamp(def[i][0],0,100),def[i][1]));
  return {group,los,dir};
}
function ball(stage){return stage.querySelector('.tso-ps886e__ball,.tso-v887-ball,.tso-v889-ball,[data-tso-ball]');}
function placeBall(stage,abs,lateral){const b=ball(stage);if(!b)return;const p=pctPoint(abs,lateral);b.style.left=p.left;b.style.top=p.top;b.hidden=false;}
function moveBall(stage,abs,lateral,opt){const b=ball(stage);if(!b)return;b.hidden=false;move(b,abs,lateral,opt);}
function targetLateral(direction){return direction==='left'?.18:direction==='right'?.82:.50;}
function animatePlay(stage,snap){
  const st=stateOf(snap);if(!st||!sideOf(st.playOffenseSide)||num(st.startYardFromOwn)==null||num(st.endYardFromOwn)==null)return false;
  const key=`${snap?.gameId||st.gameId||''}|${st.playId||st.description||''}`;if(!st.playId||lastAnimatedByGame.get(String(snap?.gameId||st.gameId||''))===key)return false;
  const setup=formation(stage,st.playOffenseSide,st.startYardFromOwn);if(!setup)return false;
  patchLines(stage,snap,'play');patchIdentity(stage,snap);
  const {group,los,dir}=setup,end=fieldAbs(st.playOffenseSide,st.endYardFromOwn),advance=(end??los)-los,lat=targetLateral(st.direction);
  if(end==null)return false;
  lastAnimatedByGame.set(String(snap?.gameId||st.gameId||''),key);stage.dataset.tsoReenacting='1';stage.dataset.tsoPlayId=st.playId;
  const opt=(duration=1850,delay=90)=>({duration,delay});
  if(st.kind==='pass'||st.kind==='sack'){
    move(group.offense[0],clamp(los-dir*7.2,0,100),.50,opt(1050,80));
    for(let i=1;i<=5;i++)move(group.offense[i],clamp(los+dir*.8,0,100),[.34,.405,.47,.535,.61][i-1],opt(1250,90));
    move(group.offense[6],clamp(los+dir*3.5,0,100),.56,opt(1450,120));
    move(group.offense[7],clamp(los+dir*(st.kind==='sack'?3:9),0,100),.67,opt(1650,110));
    const targetIdx=skillIndex(st.target,st.direction);
    [[8,.18,12],[9,.50,15],[10,.82,18]].forEach(([i,l,y])=>move(group.offense[i],clamp(los+dir*y,0,100),l,opt(1850,100+i*18)));
    if(st.kind==='pass'&&st.target?.name)move(group.offense[targetIdx],end,lat,opt(1900,120));
    if(st.kind==='sack')move(group.offense[0],end,.50,opt(1350,120));
  }else if(st.kind==='rush'||st.kind==='turnover'){
    const runnerIdx=skillIndex(st.runner,st.direction);move(group.offense[0],clamp(los-dir*2.2,0,100),.50,opt(900,70));
    for(let i=1;i<=5;i++)move(group.offense[i],clamp(los+dir*1.4,0,100),[.34,.405,.47,.535,.61][i-1],opt(1200,80));
    for(const [i,l,y] of [[7,.69,3],[8,.18,5],[9,.50,4],[10,.82,5]])if(i!==runnerIdx)move(group.offense[i],clamp(los+dir*y,0,100),l,opt(1400,110));
    move(group.offense[runnerIdx],end,lat,opt(1800,110));
  }else{
    for(let i=0;i<group.offense.length;i++)move(group.offense[i],clamp(los+dir*Math.max(0,Math.min(6,advance*.45)),0,100),[.5,.34,.405,.47,.535,.61,.55,.69,.18,.5,.82][i],opt(1300,80));
  }
  const pursuit=Math.max(-4,Math.min(16,advance*.82));
  group.defense.forEach((a,i)=>{
    const base=i<4?-1.2:i<7?Math.max(1,pursuit*.65):pursuit;
    const startLat=[.36,.445,.525,.61,.39,.53,.66,.18,.39,.62,.82][i];
    const toward=i<4?startLat:startLat+(lat-startLat)*(i<7?.38:.62);
    move(a,clamp(los+dir*base,0,100),clamp(toward,.12,.88),opt(1700,110+i*12));
  });
  placeBall(stage,clamp(los-dir*3.2,0,100),.50);
  if(st.kind==='pass'&&st.target?.name)moveBall(stage,end,lat,opt(850,920));
  else if(st.kind==='rush'||st.kind==='turnover')moveBall(stage,end,lat,opt(1750,120));
  else moveBall(stage,end,.50,opt(1350,180));
  setTimeout(()=>{
    if(stage.dataset.tsoPlayId!==st.playId)return;
    delete stage.dataset.tsoReenacting;patchLines(stage,snap,'current');
  },2500);
  return true;
}
function settle(stage,snap){
  if(stage.dataset.tsoReenacting==='1')return;
  const st=stateOf(snap),side=currentSide(snap,st),own=num(st?.currentYardFromOwn);if(!st||!side||own==null)return;
  formation(stage,side,own);patchIdentity(stage,snap);patchLines(stage,snap,'current');
  const b=ball(stage);if(b)b.hidden=true;
}
function activeSnap(){return typeof window==='undefined'?null:window.__TSO_NFL_LIVE_LATEST__||null;}
function correct(snap,{animate=false}={}){
  if(!snap||typeof document==='undefined')return;
  patchSituation(document,snap);
  for(const stage of document.querySelectorAll(ROOT)){
    const id=String(stage.getAttribute('data-game-id')||stage.dataset.gameId||'');if(id&&String(snap.gameId||'')!==id)continue;
    if(animate&&!stage.dataset.tsoReenacting&&animatePlay(stage,snap))continue;
    settle(stage,snap);
  }
}
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>requestAnimationFrame(()=>{pending=false;correct(activeSnap());}));}
function onLive(e){correct(e.detail,{animate:true});}
export function installNflGamecastFieldStateV8912(){
  if(typeof document==='undefined')return null;
  if(observer)return observer;
  const style=document.createElement('style');style.id='tso-gamecast-authority-v8914';style.textContent=`
    ${ROOT} .tso-ps886e__actor[hidden]{display:none!important}
    ${ROOT}[data-tso-reenacting="1"] .tso-ps886e__actor,${ROOT}[data-tso-reenacting="1"] .tso-ps886e__ball{will-change:left,top}
    ${ROOT} .tso-ps886e__routes .ghost,${ROOT} .tso-ps886e__actor.ghost{display:none!important}
  `;if(!document.getElementById(style.id))document.head.append(style);
  window.addEventListener('tso:nfl-live-snapshot',onLive);
  observer=new MutationObserver(schedule);observer.observe(document.getElementById('nflView')||document.body,{childList:true,subtree:true});
  const snap=activeSnap();if(snap)correct(snap);
  return observer;
}
export function correctNflGamecastFieldStateV8912Now(){correct(activeSnap());}
export const __V8912_TEST__={fieldAbs,fieldPoint,linePoint,skillIndex,targetLateral,lastAnimatedByGame};
