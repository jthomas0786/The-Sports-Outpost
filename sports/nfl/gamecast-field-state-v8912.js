/**
 * v89.15 authoritative NFL Gamecast field renderer.
 *
 * Live state is owned by sports/nfl/live.js. This renderer never invents score,
 * clock, possession, LOS, or first-down state. It only visualizes the accepted
 * snapshot and reenacts the accepted play with existing DOM actors.
 */
const ROOT='[data-tso-v886e-gamecast]';
const FIELD={w:1672,h:415,topY:87,bottomY:354,leftTop:276,rightTop:1394,leftBottom:46,rightBottom:1621};
const OFF_ROLES=['QB','OL','OL','OL','OL','OL','RB','TE','WR','WR','WR'];
const DEF_ROLES=['DL','DL','DL','DL','LB','LB','LB','DB','DB','DB','DB'];
const lastAnimatedByGame=new Map();
const settleTimers=new WeakMap();
let observer=null,pending=false;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const num=v=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const sideOf=s=>s==='home'||s==='away'?s:null;
const attackDir=side=>side==='home'?-1:1;
const fieldAbs=(side,own)=>{const y=num(own);if(y==null||!sideOf(side))return null;return clamp(side==='home'?100-y:y,0,100);};
const fwd=(los,dir,yards)=>clamp(los+dir*yards,0,100);
const pt=(abs,lat,offset)=>({abs:clamp(Number(abs)||0,0,100),lat:clamp(Number(lat)||0,0,1),...(offset==null?{}:{offset:clamp(Number(offset)||0,0,1)})});

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
  svg.dataset.tsoAuthority='v89.15';
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
function cancelMotion(el){try{el?.getAnimations?.().forEach(a=>a.cancel());}catch{}}
function place(el,abs,lateral){if(!el)return;cancelMotion(el);const p=pctPoint(abs,lateral);el.style.left=p.left;el.style.top=p.top;}
function normalizePath(points){
  const clean=(Array.isArray(points)?points:[]).filter(Boolean);
  if(!clean.length)return [];
  if(clean.length===1)return [{...clean[0],offset:0},{...clean[0],offset:1}];
  let last=0;
  return clean.map((p,i)=>{
    let offset=num(p.offset);
    if(offset==null)offset=i/(clean.length-1);
    offset=clamp(Math.max(last,offset),0,1);last=offset;
    return {...p,offset};
  });
}
function animatePath(el,points,{duration=2600,delay=0,easing='linear'}={}){
  if(!el)return null;
  cancelMotion(el);
  const normalized=normalizePath(points);if(!normalized.length)return null;
  const frames=normalized.map((p,i)=>{
    const q=pctPoint(p.abs,p.lat);
    const frame={left:q.left,top:q.top,offset:p.offset};
    if(i<normalized.length-1)frame.easing=p.easing||'cubic-bezier(.20,.70,.22,1)';
    return frame;
  });
  const last=frames.at(-1);
  if(typeof el.animate!=='function'){
    el.style.left=last.left;el.style.top=last.top;return null;
  }
  const anim=el.animate(frames,{duration,delay,easing,fill:'forwards'});
  anim.onfinish=()=>{
    el.style.left=last.left;el.style.top=last.top;
    try{anim.cancel();}catch{}
  };
  return anim;
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
  const qb=st.passer;if(qb?.name){ensureLabel(group.offense[0],qb.name);group.offense[0].dataset.tsoPlayer=qb.name;focus(group.offense[0],st.kind==='sack');}
  const involved=st.kind==='rush'?st.runner:st.kind==='pass'?st.target:null;
  if(involved?.name){
    const idx=skillIndex(involved,st.direction);
    if(idx!==0||!qb?.name||String(involved.name).toLowerCase()!==String(qb.name).toLowerCase()){
      ensureLabel(group.offense[idx],involved.name);group.offense[idx].dataset.tsoPlayer=involved.name;focus(group.offense[idx],true);
    }else focus(group.offense[0],true);
  }
}

function formationCoords(los,dir){
  return {
    off:[
      [los-dir*4.8,.50],
      [los-dir*.35,.34],[los-dir*.25,.405],[los-dir*.15,.47],[los-dir*.25,.535],[los-dir*.35,.61],
      [los-dir*3.7,.55],[los-dir*.7,.69],[los-dir*.9,.18],[los-dir*.8,.50],[los-dir*.9,.82]
    ],
    def:[
      [los+dir*1.6,.36],[los+dir*1.5,.445],[los+dir*1.5,.525],[los+dir*1.6,.61],
      [los+dir*4.8,.39],[los+dir*4.7,.53],[los+dir*4.8,.66],
      [los+dir*7.8,.18],[los+dir*8.8,.39],[los+dir*9.0,.62],[los+dir*7.8,.82]
    ]
  };
}
function formation(stage,side,ownYard){
  const group=roleActors(stage);if(!group)return null;
  const los=fieldAbs(side,ownYard);if(los==null)return null;const dir=attackDir(side),coords=formationCoords(los,dir);
  group.offense.forEach((a,i)=>place(a,clamp(coords.off[i][0],0,100),coords.off[i][1]));
  group.defense.forEach((a,i)=>place(a,clamp(coords.def[i][0],0,100),coords.def[i][1]));
  return {group,los,dir,coords};
}
function ball(stage){return stage.querySelector('.tso-ps886e__ball,.tso-v887-ball,.tso-v889-ball,[data-tso-ball]');}
function placeBall(stage,abs,lateral){const b=ball(stage);if(!b)return;const p=pctPoint(abs,lateral);b.style.left=p.left;b.style.top=p.top;b.hidden=false;}
function animateBall(stage,path,opt){const b=ball(stage);if(!b)return null;b.hidden=false;return animatePath(b,path,opt);}
function targetLateral(direction){return direction==='left' ? .20 : direction==='right' ? .80 : .50;}
function startPath(pair){return pt(pair[0],pair[1],0);}
function approachLat(from,to,factor){return clamp(from+(to-from)*factor,.12,.88);}

function buildPassPlan(st,los,dir,end,coords,{sack=false,interception=false}={}){
  const desc=String(st?.description||'').toLowerCase();
  const incomplete=!sack&&!interception&&/incomplete|no good/.test(desc);
  const gain=(end-los)*dir;
  const lat=targetLateral(st?.direction);
  const targetIdx=st?.target?.name?skillIndex(st.target,st.direction):(st?.direction==='left'?8:st?.direction==='right'?10:9);
  const offense=Array(11),defense=Array(11);
  const qbStart=coords.off[0];
  const dropAbs=fwd(los,dir,-7.1),setAbs=fwd(los,dir,-6.5),climbAbs=fwd(los,dir,-5.5);

  if(sack){
    offense[0]=[startPath(qbStart),pt(dropAbs,.50,.31),pt(setAbs,.50,.56),pt(end,.50,1)];
  }else{
    offense[0]=[startPath(qbStart),pt(dropAbs,.50,.30),pt(setAbs,.50,.58),pt(climbAbs,.50,1)];
  }

  const olLats=[.34,.405,.47,.535,.61];
  for(let i=1;i<=5;i++){
    const start=coords.off[i],spread=(i-3)*.011;
    offense[i]=[
      startPath(start),
      pt(fwd(los,dir,-.75),clamp(olLats[i-1]+spread,.28,.67),.22),
      pt(fwd(los,dir,-.25),clamp(olLats[i-1]+spread*1.4,.27,.68),.62),
      pt(fwd(los,dir,.10),clamp(olLats[i-1]+spread,.28,.67),1)
    ];
  }

  const visualDepth=incomplete?clamp(Math.max(7,Math.abs(gain)+5),7,14):gain;
  const catchDepth=incomplete
    ?visualDepth
    :gain>=4?clamp(gain*.62,4,14):gain>=0?Math.max(1.25,gain):Math.max(-2.5,gain*.55);
  const catchAbs=fwd(los,dir,catchDepth);
  const targetEnd=incomplete?catchAbs:end;
  const targetStart=coords.off[targetIdx];
  const stemDepth=clamp(Math.max(3.5,Math.abs(catchDepth)*.45),3.5,7.5);
  const stemAbs=fwd(los,dir,catchDepth<0?-1.0:stemDepth);
  offense[targetIdx]=[
    startPath(targetStart),
    pt(stemAbs,approachLat(targetStart[1],lat,.18),.30),
    pt(catchAbs,approachLat(targetStart[1],lat,.72),.73),
    pt(targetEnd,lat,1)
  ];

  const routeDefs=[
    [8,.18,13,.25],
    [9,.50,16,.50],
    [10,.82,13,.75]
  ];
  for(const [idx,startLat,depth,endLat] of routeDefs){
    if(idx===targetIdx)continue;
    const start=coords.off[idx];
    offense[idx]=[
      startPath(start),
      pt(fwd(los,dir,5.5),startLat,.34),
      pt(fwd(los,dir,depth),approachLat(startLat,endLat,.7),.76),
      pt(fwd(los,dir,depth+2),endLat,1)
    ];
  }
  if(targetIdx!==7){
    const start=coords.off[7];
    offense[7]=[
      startPath(start),
      pt(fwd(los,dir,4.2),.67,.34),
      pt(fwd(los,dir,8.5),.60,.74),
      pt(fwd(los,dir,9.5),.57,1)
    ];
  }
  if(targetIdx!==6){
    const start=coords.off[6],releaseLat=st?.direction==='left' ? .64 : .36;
    offense[6]=[
      startPath(start),
      pt(fwd(los,dir,-1.4),.55,.22),
      pt(fwd(los,dir,2.5),releaseLat,.62),
      pt(fwd(los,dir,4.2),releaseLat,1)
    ];
  }

  const primaryRusher=st?.direction==='left'?0:st?.direction==='right'?3:2;
  const dlLats=[.36,.445,.525,.61];
  for(let i=0;i<4;i++){
    const start=coords.def[i],rushLat=approachLat(dlLats[i],.50,i===primaryRusher ? .62 : .24);
    const finishAbs=sack&&i===primaryRusher?end:fwd(los,dir,i===primaryRusher?-4.4:-2.2);
    const finishLat=sack&&i===primaryRusher ? .50 : rushLat;
    defense[i]=[
      startPath(start),
      pt(fwd(los,dir,.25),dlLats[i],.16),
      pt(fwd(los,dir,-1.2),rushLat,.48),
      pt(finishAbs,finishLat,1)
    ];
  }

  const closeAbs=sack?end:targetEnd;
  const lbLats=[.39,.53,.66];
  for(let j=0;j<3;j++){
    const i=4+j,start=coords.def[i];
    defense[i]=[
      startPath(start),
      pt(fwd(los,dir,5.8+j*.4),lbLats[j],.30),
      pt(fwd(los,dir,Math.max(2,catchDepth*.55)),approachLat(lbLats[j],lat,.42),.66),
      pt(closeAbs,approachLat(lbLats[j],lat,.76),1)
    ];
  }

  const dbLats=[.18,.39,.62,.82];
  for(let j=0;j<4;j++){
    const i=7+j,start=coords.def[i],isNear=Math.abs(dbLats[j]-lat)<=.24;
    const depth=11.5+(j%2)*2.2;
    defense[i]=[
      startPath(start),
      pt(fwd(los,dir,depth),dbLats[j],.32),
      pt(fwd(los,dir,Math.max(depth,catchDepth)),approachLat(dbLats[j],lat,isNear ? .56 : .22),.70),
      pt(closeAbs,approachLat(dbLats[j],lat,isNear ? .88 : .48),1)
    ];
  }

  if(interception){
    const pickIdx=lat<.35?7:lat>.65?10:9;
    const s=coords.def[pickIdx];
    defense[pickIdx]=[
      startPath(s),
      pt(fwd(los,dir,Math.max(8,catchDepth+1.5)),approachLat(s[1],lat,.55),.52),
      pt(catchAbs,lat,.80),
      pt(catchAbs,lat,1)
    ];
  }

  const center=coords.off[3];
  const ballPath=[
    pt(center[0],center[1],0),
    pt(qbStart[0],qbStart[1],.12),
    pt(dropAbs,.50,.50)
  ];
  if(sack){
    ballPath.push(pt(end,.50,1));
  }else{
    ballPath.push(pt(catchAbs,lat,.80));
    ballPath.push(pt(targetEnd,lat,1));
  }

  return {duration:sack?2450:2800,offense,defense,ball:ballPath,targetIdx,gain,lat,catchAbs,targetEnd};
}

function buildRushPlan(st,los,dir,end,coords){
  const gain=(end-los)*dir,lat=targetLateral(st?.direction);
  const namedRunner=!!st?.runner?.name;
  const runnerIdx=namedRunner?skillIndex(st.runner,st.direction):6;
  const offense=Array(11),defense=Array(11);
  const shift=(lat-.50)*.22;

  for(let i=1;i<=5;i++){
    const start=coords.off[i],laneShift=shift*(.45+Math.abs(i-3)*.12);
    offense[i]=[
      startPath(start),
      pt(fwd(los,dir,.65),clamp(start[1]+laneShift,.27,.70),.24),
      pt(fwd(los,dir,1.35),clamp(start[1]+laneShift*1.18,.26,.71),.58),
      pt(fwd(los,dir,1.85),clamp(start[1]+laneShift,.26,.71),1)
    ];
  }

  if(runnerIdx===0){
    const qb=coords.off[0];
    const escapeLat=approachLat(qb[1],lat,.58);
    offense[0]=[
      startPath(qb),
      pt(fwd(los,dir,-6.2),.50,.24),
      pt(fwd(los,dir,-1.0),escapeLat,.52),
      pt(fwd(los,dir,Math.max(-.5,gain*.45)),approachLat(escapeLat,lat,.80),.72),
      pt(end,lat,1)
    ];
    const rb=coords.off[6];
    offense[6]=[
      startPath(rb),
      pt(fwd(los,dir,-1.4),.56,.24),
      pt(fwd(los,dir,1.4),approachLat(.56,lat,.45),.58),
      pt(fwd(los,dir,4.0),approachLat(.56,lat,.65),1)
    ];
  }else{
    const qb=coords.off[0],runner=coords.off[runnerIdx],meshAbs=fwd(los,dir,-2.35),meshLat=.51;
    offense[0]=[
      startPath(qb),
      pt(meshAbs,meshLat,.25),
      pt(fwd(los,dir,-1.9),approachLat(.51,1-lat,.20),.52),
      pt(fwd(los,dir,-1.1),approachLat(.50,1-lat,.28),1)
    ];
    const burstDepth=clamp(gain*.42,-.8,Math.min(7,Math.max(2,gain)));
    const runnerPath=[
      startPath(runner),
      pt(meshAbs,meshLat,.28),
      pt(fwd(los,dir,clamp(gain*.13,-.6,1.5)),approachLat(meshLat,lat,.52),.48),
      pt(fwd(los,dir,burstDepth),approachLat(meshLat,lat,.82),.73),
      pt(end,lat,1)
    ];
    offense[runnerIdx]=runnerPath;
    if(runnerIdx!==6){
      const rb=coords.off[6];
      offense[6]=[startPath(rb),pt(fwd(los,dir,-1.4),.55,.24),pt(fwd(los,dir,2.2),approachLat(.55,lat,.55),.62),pt(fwd(los,dir,4.6),approachLat(.55,lat,.70),1)];
    }
  }

  for(const idx of [7,8,9,10]){
    if(offense[idx])continue;
    const start=coords.off[idx],depth=idx===7?4.2:idx===9?5.2:4.8;
    offense[idx]=[
      startPath(start),
      pt(fwd(los,dir,2.2),start[1],.34),
      pt(fwd(los,dir,depth),approachLat(start[1],lat,.22),.68),
      pt(fwd(los,dir,depth+1.2),approachLat(start[1],lat,.34),1)
    ];
  }

  const closeDepth=clamp(gain,.2,18);
  for(let i=0;i<4;i++){
    const start=coords.def[i],engageLat=approachLat(start[1],lat,.16);
    defense[i]=[
      startPath(start),
      pt(fwd(los,dir,.45),start[1],.20),
      pt(fwd(los,dir,-.1),engageLat,.48),
      pt(fwd(los,dir,Math.max(-1,closeDepth*.58)),approachLat(engageLat,lat,.64),1)
    ];
  }
  for(let j=0;j<3;j++){
    const i=4+j,start=coords.def[i],readDepth=3.6+j*.35;
    defense[i]=[
      startPath(start),
      pt(fwd(los,dir,readDepth),start[1],.24),
      pt(fwd(los,dir,Math.max(1,closeDepth*.45)),approachLat(start[1],lat,.56),.58),
      pt(end,approachLat(start[1],lat,.88),1)
    ];
  }
  for(let j=0;j<4;j++){
    const i=7+j,start=coords.def[i],trigger=gain>5 ? .46 : .62;
    defense[i]=[
      startPath(start),
      pt(fwd(los,dir,9.0+(j%2)*1.5),start[1],.32),
      pt(fwd(los,dir,Math.max(5,closeDepth*.72)),approachLat(start[1],lat,.48),trigger),
      pt(end,approachLat(start[1],lat,.82),1)
    ];
  }

  const center=coords.off[3],qb=coords.off[0];
  const ballPath=[pt(center[0],center[1],0),pt(qb[0],qb[1],.10)];
  if(runnerIdx===0){
    ballPath.push(pt(fwd(los,dir,-6.2),.50,.24),pt(fwd(los,dir,-1.0),approachLat(.50,lat,.58),.52),pt(end,lat,1));
  }else{
    ballPath.push(pt(fwd(los,dir,-2.35),.51,.28),pt(fwd(los,dir,clamp(gain*.13,-.6,1.5)),approachLat(.51,lat,.52),.48),pt(end,lat,1));
  }
  return {duration:clamp(2300+Math.max(0,gain)*22,2300,3100),offense,defense,ball:ballPath,runnerIdx,gain,lat};
}

function buildOtherPlan(st,los,dir,end,coords){
  const gain=(end-los)*dir,lat=targetLateral(st?.direction),offense=Array(11),defense=Array(11);
  for(let i=0;i<11;i++){
    const s=coords.off[i],depth=i===0?-1.5:i>=8?Math.max(3,Math.min(7,gain*.5)):Math.max(.3,Math.min(2.5,gain*.22));
    offense[i]=[startPath(s),pt(fwd(los,dir,depth),approachLat(s[1],lat,i>=8 ? .15 : .06),1)];
  }
  for(let i=0;i<11;i++){
    const s=coords.def[i],depth=i<4?-.6:i<7?Math.max(1,gain*.35):Math.max(2,gain*.6);
    defense[i]=[startPath(s),pt(fwd(los,dir,depth),approachLat(s[1],lat,i<4 ? .12 : .34),1)];
  }
  const center=coords.off[3];
  return {duration:2100,offense,defense,ball:[pt(center[0],center[1],0),pt(end,lat,1)],gain,lat};
}

function buildPlayPlan(st,los,dir,end,coords=formationCoords(los,dir)){
  const desc=String(st?.description||'').toLowerCase();
  if(st?.kind==='sack')return buildPassPlan(st,los,dir,end,coords,{sack:true});
  if(st?.kind==='pass')return buildPassPlan(st,los,dir,end,coords);
  if(st?.kind==='rush')return buildRushPlan(st,los,dir,end,coords);
  if(st?.kind==='turnover'){
    if(/intercept/.test(desc))return buildPassPlan(st,los,dir,end,coords,{interception:true});
    return buildRushPlan(st,los,dir,end,coords);
  }
  return buildOtherPlan(st,los,dir,end,coords);
}

function cancelStageMotion(stage){
  const timer=settleTimers.get(stage);if(timer){clearTimeout(timer);settleTimers.delete(stage);}
  for(const el of [...actors(stage),ball(stage)].filter(Boolean))cancelMotion(el);
  delete stage.dataset.tsoReenacting;
}
function animatePlay(stage,snap){
  const st=stateOf(snap);if(!st||!sideOf(st.playOffenseSide)||num(st.startYardFromOwn)==null||num(st.endYardFromOwn)==null)return false;
  const gameKey=String(snap?.gameId||st.gameId||''),key=`${gameKey}|${st.playId||st.description||''}`;
  if(!st.playId||lastAnimatedByGame.get(gameKey)===key)return false;

  if(stage.dataset.tsoReenacting==='1'){
    if(stage.dataset.tsoPlayId===String(st.playId))return true;
    cancelStageMotion(stage);
  }

  stage.dataset.tsoReenacting='1';
  stage.dataset.tsoPlayId=String(st.playId);
  const setup=formation(stage,st.playOffenseSide,st.startYardFromOwn);if(!setup){delete stage.dataset.tsoReenacting;return false;}
  patchLines(stage,snap,'play');patchIdentity(stage,snap);

  const {group,los,dir,coords}=setup,end=fieldAbs(st.playOffenseSide,st.endYardFromOwn);if(end==null){delete stage.dataset.tsoReenacting;return false;}
  const plan=buildPlayPlan(st,los,dir,end,coords);
  lastAnimatedByGame.set(gameKey,key);

  const reduceMotion=typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const duration=reduceMotion?Math.min(720,plan.duration):plan.duration;
  group.offense.forEach((a,i)=>animatePath(a,plan.offense[i]||[startPath(coords.off[i])],{duration,delay:i<6?0:18*(i-5)}));
  group.defense.forEach((a,i)=>animatePath(a,plan.defense[i]||[startPath(coords.def[i])],{duration,delay:28+i*10}));

  const center=coords.off[3];
  placeBall(stage,center[0],center[1]);
  animateBall(stage,plan.ball,{duration,delay:0});

  const hold=reduceMotion?80:360;
  const timer=setTimeout(()=>{
    if(stage.dataset.tsoPlayId!==String(st.playId))return;
    delete stage.dataset.tsoReenacting;
    patchLines(stage,snap,'current');
    settle(stage,snap,{force:true});
    settleTimers.delete(stage);
  },duration+hold);
  settleTimers.set(stage,timer);
  return true;
}

function settle(stage,snap,{force=false}={}){
  if(stage.dataset.tsoReenacting==='1'&&!force)return;
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
    if(animate&&animatePlay(stage,snap))continue;
    settle(stage,snap);
  }
}
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>requestAnimationFrame(()=>{pending=false;correct(activeSnap());}));}
function onLive(e){correct(e.detail,{animate:true});}

export function installNflGamecastFieldStateV8912(){
  if(typeof document==='undefined')return null;
  if(observer)return observer;
  const style=document.createElement('style');style.id='tso-gamecast-authority-v8915';style.textContent=`
    ${ROOT} .tso-ps886e__actor[hidden]{display:none!important}
    ${ROOT}[data-tso-reenacting="1"] .tso-ps886e__actor,
    ${ROOT}[data-tso-reenacting="1"] .tso-ps886e__ball{will-change:left,top;transition:none!important}
    ${ROOT}[data-tso-reenacting="1"] .tso-ps886e__actorGraphic{transform-origin:50% 92%;animation:tso-v8915-run-bob .34s linear infinite}
    ${ROOT}[data-tso-reenacting="1"] .tso-ps886e__actor[data-tso-role="OL"] .tso-ps886e__actorGraphic,
    ${ROOT}[data-tso-reenacting="1"] .tso-ps886e__actor[data-tso-role="DL"] .tso-ps886e__actorGraphic{animation:tso-v8915-trench-bob .46s ease-in-out infinite}
    ${ROOT} .tso-ps886e__routes .ghost,${ROOT} .tso-ps886e__actor.ghost{display:none!important}
    @keyframes tso-v8915-run-bob{0%,100%{transform:translateY(0) rotate(-.25deg)}50%{transform:translateY(-2px) rotate(.25deg)}}
    @keyframes tso-v8915-trench-bob{0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(1px) scaleY(.992)}}
    @media(prefers-reduced-motion:reduce){
      ${ROOT}[data-tso-reenacting="1"] .tso-ps886e__actorGraphic{animation:none!important}
    }
  `;if(!document.getElementById(style.id))document.head.append(style);
  window.addEventListener('tso:nfl-live-snapshot',onLive);
  observer=new MutationObserver(schedule);observer.observe(document.getElementById('nflView')||document.body,{childList:true,subtree:true});
  const snap=activeSnap();if(snap)correct(snap);
  return observer;
}
export function correctNflGamecastFieldStateV8912Now(){correct(activeSnap());}
export const __V8912_TEST__={
  fieldAbs,fieldPoint,linePoint,skillIndex,targetLateral,formationCoords,buildPlayPlan,normalizePath,lastAnimatedByGame
};
