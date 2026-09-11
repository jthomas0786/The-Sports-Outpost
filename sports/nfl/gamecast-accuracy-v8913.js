const ROOT_SELECTOR='[data-tso-v886e-gamecast]';
const FIELD={w:1672,h:415,topY:87,bottomY:354,leftTop:276,rightTop:1394,leftBottom:46,rightBottom:1621};
const OFF_ROLES=['QB','OL','OL','OL','OL','OL','RB','TE','WR','WR','WR'];
const lastYardByGame=new Map();
const lastPossByGame=new Map();
let installed=false,observer=null,raf=0;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const strictNum=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
const norm=v=>({LAR:'LA',JAC:'JAX',WAS:'WSH',OAK:'LV',SD:'LAC',STL:'LA'}[String(v||'').toUpperCase()]||String(v||'').toUpperCase());
const gameId=s=>String(s?.gameId||s?.id||'');
const offense=s=>norm(s?.possession==='home'?s?.home?.abbr:s?.possession==='away'?s?.away?.abbr:'');
const defense=s=>norm(s?.possession==='home'?s?.away?.abbr:s?.possession==='away'?s?.home?.abbr:'');
const playText=s=>String(s?.currentPlay?.description||s?.liveScore?.lastPlayText||'').trim();

function point(fieldYard,lateral){
  const u=(10+clamp(fieldYard,0,100))/120,v=clamp(lateral,.06,.94);
  const y=FIELD.topY+(FIELD.bottomY-FIELD.topY)*v;
  const left=FIELD.leftTop+(FIELD.leftBottom-FIELD.leftTop)*v;
  const right=FIELD.rightTop+(FIELD.rightBottom-FIELD.rightTop)*v;
  return{x:left+(right-left)*u,y};
}
function parseTerritorySpot(value,snap){
  const txt=String(value||'').toUpperCase();
  const matches=[...txt.matchAll(/\b([A-Z]{2,3})\s+(\d{1,2})\b/g)];
  if(!matches.length){if(/\b50\b/.test(txt))return 50;return null;}
  const m=matches.at(-1),team=norm(m[1]),yard=Number(m[2]),off=offense(snap);
  if(!off||!Number.isFinite(yard)||yard<0||yard>50)return null;
  if(team===off)return yard;
  if(team===defense(snap))return 100-yard;
  return null;
}
function resolveYardFromOwn(snap){
  const id=gameId(snap),live=snap?.liveScore||{},pos=String(snap?.possession||'');
  const raw=strictNum(live.yardFromOwn);
  if(raw!==null&&raw>=0&&raw<=100){
    lastYardByGame.set(id,raw);lastPossByGame.set(id,pos);return raw;
  }
  const drive=live.currentDrive||{};
  let y=null;
  if(offense(snap)&&norm(drive.team)===offense(snap)){
    y=parseTerritorySpot(drive.endText,snap);
    if(y===null)y=parseTerritorySpot(drive.startText,snap);
  }
  if(y===null)y=parseTerritorySpot(live.downDistanceText,snap);
  if(y===null)y=parseTerritorySpot(playText(snap),snap);
  if(y!==null){lastYardByGame.set(id,y);lastPossByGame.set(id,pos);return y;}
  if(lastPossByGame.get(id)===pos)return lastYardByGame.get(id)??null;
  return null;
}
function fieldAbs(snap,own=resolveYardFromOwn(snap)){
  if(own===null)return null;
  return snap?.possession==='away'?own:snap?.possession==='home'?100-own:null;
}
function beam(lines,start,fieldYard){
  const a=point(fieldYard,0),b=point(fieldYard,1);
  for(let i=start;i<Math.min(start+4,lines.length);i++){
    const line=lines[i];
    line.setAttribute('x1',a.x.toFixed(2));line.setAttribute('y1',a.y.toFixed(2));
    line.setAttribute('x2',b.x.toFixed(2));line.setAttribute('y2',b.y.toFixed(2));
    line.dataset.v8913='1';
  }
}
function patchDownLines(root,snap){
  const own=resolveYardFromOwn(snap),los=fieldAbs(snap,own);
  if(los===null)return false;
  const svg=root.querySelector('.tso-ps886e__downlines'),lines=[...svg?.querySelectorAll('line')||[]];
  if(lines.length<8)return false;
  beam(lines,0,los);
  const dist=strictNum(snap?.liveScore?.distance);
  if(dist!==null){
    const fd=clamp(los+(snap?.possession==='away'?dist:-dist),0,100);
    beam(lines,4,fd);
  }
  svg.dataset.v8913Authoritative='1';
  return true;
}

function actors(root){return [...root.querySelectorAll('.tso-ps886e__actors > .tso-ps886e__actor:not(.ghost)')];}
function setLabel(actor,value){
  if(!actor)return;
  let label=actor.querySelector(':scope > .tso-ps886e__actorLabel');
  if(!value){label?.remove();return;}
  if(!label){label=document.createElement('span');label.className='tso-ps886e__actorLabel';actor.appendChild(label);}
  const labelText=String(value).trim().split(/\s+/).at(-1)||String(value);
  if(label.textContent!==labelText)label.textContent=labelText;
}
function setFocus(actor,on){
  if(!actor)return;
  actor.classList.toggle('focus',!!on);
  let spot=actor.querySelector(':scope > .tso-ps886e__actorSpot');
  if(on&&!spot){spot=document.createElement('span');spot.className='tso-ps886e__actorSpot';actor.prepend(spot);}
  if(!on)spot?.remove();
}
function rosterQb(snap){
  const team=offense(snap),rows=Object.values(snap?.liveScore?.playerStats?.byId||{});
  let q=rows.find(r=>norm(r?.team)===team&&String(r?.position||'').toUpperCase()==='QB');
  if(q?.name)return q.name;
  const box=snap?.liveScore?.boxScore?.teams?.[team];
  for(const sec of box?.sections||[]){
    q=(sec.rows||[]).find(r=>String(r?.position||'').toUpperCase()==='QB');
    if(q?.name)return q.name;
  }
  const cp=snap?.currentPlay||{};
  if(String(cp.playerPos||'').toUpperCase()==='QB'&&cp.playerName)return cp.playerName;
  const t=playText(snap).replace(/^\([^)]*\)\s*/,'');
  const m=t.match(/^\b([A-Z]\.[A-Za-z][A-Za-z'’-]{2,})\b/);
  if(m&&/(pass|sack|scrambl|kneel)/i.test(t))return m[1].replace('.','. ');
  return 'QB';
}
function playKind(snap){
  const s=playText(snap).toLowerCase();
  if(/punt|kickoff|field goal|extra point/.test(s))return'kick';
  if(/sack/.test(s))return'sack';
  if(/pass/.test(s))return'pass';
  if(/scrambl|kneel/.test(s))return'qb-run';
  if(/rush|left (end|guard|tackle)|right (end|guard|tackle)|up the middle/.test(s))return'rush';
  return'other';
}
function targetName(snap){
  const t=playText(snap);
  const m=t.match(/\bto\s+([A-Z]\.[A-Za-z][A-Za-z'’-]{2,})\b/i);
  return m?m[1].replace('.','. '):'';
}
function currentRunner(snap){
  const cp=snap?.currentPlay||{},pos=String(cp.playerPos||'').toUpperCase();
  if(/^(RB|HB|FB)$/.test(pos)&&cp.playerName)return cp.playerName;
  const t=playText(snap).replace(/^\([^)]*\)\s*/,'');
  const m=t.match(/^\b([A-Z]\.[A-Za-z][A-Za-z'’-]{2,})\b/);
  return m?m[1].replace('.','. '):'';
}
function targetIndex(snap){
  const t=playText(snap).toLowerCase();
  if(/\bleft\b/.test(t))return 8;
  if(/\bright\b/.test(t))return 10;
  return 9;
}
function patchIdentity(root,snap){
  const all=actors(root),off=all.slice(0,11);if(off.length<11)return false;
  off.forEach(a=>{setLabel(a,'');setFocus(a,false);});
  const kind=playKind(snap),qb=rosterQb(snap);
  setLabel(off[0],qb);setFocus(off[0],kind==='pass'||kind==='sack'||kind==='qb-run');
  if(kind==='rush'){
    const runner=currentRunner(snap);
    if(runner){setLabel(off[6],runner);setFocus(off[6],true);}
  }else if(kind==='pass'){
    const target=targetName(snap),idx=targetIndex(snap);
    if(target&&String(target).split(/\s+/).at(-1)!==String(qb).split(/\s+/).at(-1)){
      setLabel(off[idx],target);setFocus(off[idx],true);
    }
  }
  root.dataset.v8913Identity='1';
  return true;
}
function correct(snap){
  if(!snap)return;
  const id=gameId(snap);
  const roots=[...document.querySelectorAll(ROOT_SELECTOR)];
  for(const root of roots){
    const host=root.closest?.('[data-nfl-inline-gamecast]');
    if(host?.dataset?.nflInlineGamecast&&id&&host.dataset.nflInlineGamecast!==id)continue;
    patchDownLines(root,snap);
    patchIdentity(root,snap);
    root.dataset.tsoAccuracy='89.13';
  }
}
function schedule(){
  if(raf)cancelAnimationFrame(raf);
  raf=requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
    raf=0;correct(window.__TSO_NFL_LIVE_LATEST__);
  })));
}
function onLive(e){
  const snap=e?.detail||window.__TSO_NFL_LIVE_LATEST__;if(!snap)return;
  correct(snap);
  setTimeout(()=>correct(snap),135);
  setTimeout(()=>correct(snap),240);
}
export function installNflGamecastAccuracyV8913(){
  if(installed||typeof document==='undefined')return observer;installed=true;
  const style=document.createElement('style');style.id='tso-gamecast-accuracy-v8913';
  style.textContent=`
    ${ROOT_SELECTOR} .tso-ps886e__routes,
    ${ROOT_SELECTOR} .tso-ps886e__actor.ghost{display:none!important}
    ${ROOT_SELECTOR} .tso-ps886e__ball{opacity:0!important}
    ${ROOT_SELECTOR}[data-tso-reenacting="1"] .tso-ps886e__ball{opacity:1!important}
  `;
  if(!document.getElementById(style.id))document.head.appendChild(style);
  window.addEventListener('tso:nfl-live-snapshot',onLive);
  observer=new MutationObserver(schedule);
  observer.observe(document.getElementById('nflView')||document.body,{childList:true,subtree:true,characterData:true});
  correct(window.__TSO_NFL_LIVE_LATEST__);
  return observer;
}
export const __V8913_TEST__={strictNum,parseTerritorySpot,resolveYardFromOwn,fieldAbs,playKind,targetIndex};
