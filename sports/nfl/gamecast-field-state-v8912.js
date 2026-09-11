const GAME_ROOT='#nflView:not([hidden]) .nxg-concept[data-nfl-inline-gamecast]';
const STAGE='[data-tso-v886e-gamecast]';
const FIELD={w:1672,h:415,topY:87,bottomY:354,leftTop:276,rightTop:1394,leftBottom:46,rightBottom:1621};
const OFF_ROLES=['QB','OL','OL','OL','OL','OL','RB','TE','WR','WR','WR'];
const DEF_ROLES=['DL','DL','DL','DL','LB','LB','LB','DB','DB','DB','DB'];
const lastYardByGame=new Map();
const lastPossByGame=new Map();
const lastAnimatedByGame=new Map();
let installed=false,observer=null,raf=0;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const strictNum=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
const norm=v=>({LAR:'LA',JAC:'JAX',WAS:'WSH',OAK:'LV',SD:'LAC',STL:'LA'}[String(v||'').toUpperCase()]||String(v||'').toUpperCase());
const gameId=s=>String(s?.gameId||s?.id||'');
const offense=s=>norm(s?.possession==='home'?s?.home?.abbr:s?.possession==='away'?s?.away?.abbr:'');
const defense=s=>norm(s?.possession==='home'?s?.away?.abbr:s?.possession==='away'?s?.home?.abbr:'');

function point(fieldYard,lateral){
  const u=(10+clamp(fieldYard,0,100))/120,v=clamp(lateral,.06,.94);
  const y=FIELD.topY+(FIELD.bottomY-FIELD.topY)*v;
  const left=FIELD.leftTop+(FIELD.leftBottom-FIELD.leftTop)*v;
  const right=FIELD.rightTop+(FIELD.rightBottom-FIELD.rightTop)*v;
  return{x:left+(right-left)*u,y};
}
function fieldUV(x,y){
  const v=clamp((y-FIELD.topY)/(FIELD.bottomY-FIELD.topY),0,1);
  const left=FIELD.leftTop+(FIELD.leftBottom-FIELD.leftTop)*v;
  const right=FIELD.rightTop+(FIELD.rightBottom-FIELD.rightTop)*v;
  return{u:clamp((x-left)/Math.max(1,right-left),0,1),v};
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
function playText(snap){return String(snap?.currentPlay?.description||snap?.liveScore?.lastPlayText||'').trim();}
function playKey(snap){
  const cp=snap?.currentPlay||{},last=(snap?.liveScore?.plays||[]).at?.(-1)||{},drive=snap?.liveScore?.currentDrive||{};
  return `${gameId(snap)}|${cp.id||last.id||`${drive.id||''}|${drive.playCount??''}|${playText(snap)}`}`;
}
function resolveYardFromOwn(snap){
  const id=gameId(snap),live=snap?.liveScore||{},raw=strictNum(live.yardFromOwn);
  if(raw!==null&&raw>=0&&raw<=100){lastYardByGame.set(id,raw);lastPossByGame.set(id,snap?.possession||'');return raw;}
  const off=offense(snap),drive=live.currentDrive||{};
  let y=null;
  if(off&&norm(drive.team)===off){
    y=parseTerritorySpot(drive.endText,snap);
    if(y===null)y=parseTerritorySpot(drive.startText,snap);
  }
  if(y===null)y=parseTerritorySpot(live.downDistanceText,snap);
  if(y===null)y=parseTerritorySpot(playText(snap),snap);
  if(y!==null){lastYardByGame.set(id,y);lastPossByGame.set(id,snap?.possession||'');return y;}
  if(lastPossByGame.get(id)===(snap?.possession||''))return lastYardByGame.get(id)??null;
  return null;
}
function fieldAbs(snap,ownYard=resolveYardFromOwn(snap)){
  if(ownYard===null)return null;
  return snap?.possession==='away'?ownYard:snap?.possession==='home'?100-ownYard:null;
}
function fieldLabel(snap,y=resolveYardFromOwn(snap)){
  if(y===null)return '—';
  const own=snap?.possession==='away'?snap?.away?.abbr:snap?.home?.abbr;
  const opp=snap?.possession==='away'?snap?.home?.abbr:snap?.away?.abbr;
  return y<=50?`${own||''} ${Math.round(y)}`:`${opp||''} ${Math.round(100-y)}`;
}
function setText(el,v){if(el&&v!==null&&v!==undefined&&el.textContent!==String(v))el.textContent=String(v);}
function activeGameRoot(snap){
  const id=gameId(snap),root=document.querySelector(`${GAME_ROOT}[data-nfl-inline-gamecast="${CSS.escape(id)}"]`);
  return root||document.querySelector(GAME_ROOT);
}
function patchSituation(snap){
  const root=activeGameRoot(snap);if(!root)return;
  const y=resolveYardFromOwn(snap),secondary=root.querySelector('[data-v883a-situation-secondary]');
  if(secondary)setText(secondary,fieldLabel(snap,y));
  const primary=root.querySelector('[data-v883a-situation-primary]'),live=snap?.liveScore||{};
  if(primary&&live.downDistanceText)setText(primary,live.downDistanceText);
  const stage=root.querySelector(STAGE);if(stage)patchLines(stage,snap,y);
}
function beam(lines,start,fieldYard){
  const a=point(fieldYard,0),b=point(fieldYard,1);
  for(let i=start;i<Math.min(start+4,lines.length);i++){
    const line=lines[i];line.setAttribute('x1',a.x.toFixed(2));line.setAttribute('y1',a.y.toFixed(2));line.setAttribute('x2',b.x.toFixed(2));line.setAttribute('y2',b.y.toFixed(2));
  }
}
function patchLines(stage,snap,ownYard=resolveYardFromOwn(snap)){
  const abs=fieldAbs(snap,ownYard);if(abs===null)return;
  const svg=stage.querySelector('.tso-ps886e__downlines'),lines=[...svg?.querySelectorAll('line')||[]];if(lines.length<8)return;
  beam(lines,0,abs);
  const dist=strictNum(snap?.liveScore?.distance);
  if(dist!==null){const first=clamp(abs+(snap?.possession==='away'?dist:-dist),0,100);beam(lines,4,first);}
  svg.dataset.v8912='1';
}
function cancelMotion(el){el?.getAnimations?.().forEach(a=>a.cancel());if(el)el.style.translate='0px 0px';}
function place(el,fieldYard,lateral){
  if(!el)return;cancelMotion(el);const p=point(fieldYard,lateral);
  el.style.left=`${(p.x/FIELD.w*100).toFixed(4)}%`;el.style.top=`${(p.y/FIELD.h*100).toFixed(4)}%`;el.style.setProperty('--scale',(.72+clamp(lateral,.08,.92)*.42).toFixed(3));
}
function actors(stage){return [...stage.querySelectorAll('.tso-ps886e__actors > .tso-ps886e__actor:not(.ghost)')];}
function placeFormation(stage,snap,ownYard){
  const all=actors(stage);if(all.length<22||ownYard===null)return false;
  const off=all.slice(0,11),def=all.slice(11,22),los=fieldAbs(snap,ownYard),attack=snap?.possession==='home'?-1:1;
  const O=[[los-4.8*attack,.60],[los-.45*attack,.40],[los-.30*attack,.47],[los-.15*attack,.54],[los,.61],[los+.15*attack,.68],[los-4*attack,.52],[los-.9*attack,.76],[los-.7*attack,.24],[los-.8*attack,.33],[los-.7*attack,.86]];
  const D=[[los+1.1*attack,.41],[los+1.2*attack,.48],[los+1.25*attack,.56],[los+1.15*attack,.64],[los+4.8*attack,.36],[los+5.2*attack,.54],[los+4.9*attack,.72],[los+10.2*attack,.22],[los+10.7*attack,.43],[los+11*attack,.64],[los+10.4*attack,.82]];
  off.forEach((a,i)=>place(a,O[i][0],O[i][1]));def.forEach((a,i)=>place(a,D[i][0],D[i][1]));
  const ball=stage.querySelector('.tso-ps886e__ball');if(ball)place(ball,O[0][0]+.35*attack,O[0][1]);
  return true;
}
function delta(el,forwardOwn,lateral,attack){
  const lp=parseFloat(el.style.left),tp=parseFloat(el.style.top);if(!Number.isFinite(lp)||!Number.isFinite(tp))return{dx:0,dy:0};
  const x=lp/100*FIELD.w,y=tp/100*FIELD.h,uv=fieldUV(x,y),to=point((uv.u*120-10)+forwardOwn*attack,uv.v+lateral);
  return{dx:to.x-x,dy:to.y-y};
}
function tween(el,forwardOwn,lateral,attack,{duration=2450,delay=0}={}){
  if(!el)return;cancelMotion(el);const d=delta(el,forwardOwn,lateral,attack);
  el.animate?.([{translate:'0px 0px'},{translate:`${(d.dx*.35).toFixed(1)}px ${(d.dy*.35).toFixed(1)}px`,offset:.34},{translate:`${(d.dx*.72).toFixed(1)}px ${(d.dy*.72).toFixed(1)}px`,offset:.68},{translate:`${d.dx.toFixed(1)}px ${d.dy.toFixed(1)}px`}],{duration,delay,easing:'cubic-bezier(.18,.72,.22,1)',fill:'forwards'});
}
function kind(txt){const s=String(txt||'').toLowerCase();if(/timeout|end of|quarter|warning|no play/.test(s))return'idle';if(/punt|kickoff|field goal|extra point/.test(s))return'kick';if(/sack/.test(s))return'sack';if(/pass|scrambl/.test(s))return'pass';if(/rush|left (end|guard|tackle)|right (end|guard|tackle)|up the middle/.test(s))return'rush';return'other';}
function gainFrom(snap){
  const direct=strictNum(snap?.currentPlay?.resultYards??snap?.currentPlay?.yards);if(direct!==null)return clamp(direct,-20,50);
  const m=playText(snap).match(/for\s+(-?\d+)\s+yards?/i);return m?clamp(Number(m[1]),-20,50):0;
}
function animateCorrected(snap){
  const root=activeGameRoot(snap),stage=root?.querySelector(STAGE);if(!stage)return;
  const id=gameId(snap),key=playKey(snap);if(!id||lastAnimatedByGame.get(id)===key)return;
  const txt=playText(snap),k=kind(txt),end=resolveYardFromOwn(snap);if(end===null)return;
  const prevY=strictNum(stage.dataset.v8912EndYard),prevPoss=stage.dataset.v8912Poss||'',g=gainFrom(snap);
  let start=end;
  if(prevY!==null&&prevPoss===String(snap?.possession||'')&&Math.abs(end-prevY)<=45)start=prevY;
  else if(k!=='idle'&&Math.abs(g)<=45)start=clamp(end-g,0,100);
  stage.dataset.v8912EndYard=String(end);stage.dataset.v8912Poss=String(snap?.possession||'');lastAnimatedByGame.set(id,key);
  if(!placeFormation(stage,snap,start))return;
  if(k==='idle'||k==='other'){stage.dataset.tsoFieldState='89.12';return;}
  const all=actors(stage),off=all.slice(0,11),def=all.slice(11,22),attack=snap?.possession==='home'?-1:1,advance=clamp(end-start,-20,45);
  off.forEach((a,i)=>{
    const role=OFF_ROLES[i];let y=0,l=0;
    if(k==='rush'){
      if(role==='RB'){y=advance;l=/left/i.test(txt)?-.045:/right/i.test(txt)?.045:0;}
      else if(role==='OL')y=clamp(advance*.28+1.4,-1.5,4.5);else if(role==='QB')y=.6;else y=clamp(advance*.38+2,-1,7);
    }else if(k==='pass'){
      if(role==='QB')y=-3.4;else if(role==='OL')y=1.2;else if(role==='RB'){y=4;l=.035;}else if(role==='TE')y=Math.max(7,Math.min(13,Math.abs(advance)+3));else if(role==='WR')y=[11,15,19][Math.max(0,i-8)]||12;
    }else if(k==='sack'){if(role==='QB')y=advance||-5;else if(role==='OL')y=-.7;else y=2;}
    else if(k==='kick')y=role==='WR'?7:role==='QB'?0:2.5;
    tween(a,y,l,attack,{duration:k==='rush'?2600:2750,delay:role==='WR'&&k==='pass'?110:0});
  });
  def.forEach((a,i)=>{
    const role=DEF_ROLES[i];let y=0,l=((i%3)-1)*.014;
    if(k==='rush')y=role==='DL'?clamp(advance*.3+1.3,-1,4):role==='LB'?clamp(advance*.55+2,-1,8):clamp(advance*.7+2,-1,12);
    else if(k==='pass')y=role==='DL'?-3.5:role==='LB'?4:11;
    else if(k==='sack')y=role==='DL'?-5.5:role==='LB'?-2:2.5;else y=5;
    tween(a,y,l,attack,{duration:k==='rush'?2650:2750,delay:role==='DB'?90:25});
  });
  const ball=stage.querySelector('.tso-ps886e__ball');
  if(ball){let y=advance,l=0,delay=100,duration=2450;if(k==='pass'){y=Math.max(10,Math.min(25,Math.abs(advance)||15));l=/left/i.test(txt)?-.07:/right/i.test(txt)?.07:-.015;delay=560;duration=1800;}else if(k==='sack'){y=advance||-5;duration=1500;}else if(k==='kick'){y=30;duration=2050;delay=250;}tween(ball,y,l,attack,{duration,delay});}
  stage.dataset.tsoFieldState='89.12';stage.dataset.tsoReenacting='1';setTimeout(()=>{if(stage.isConnected)stage.dataset.tsoReenacting='0';},3300);
}
function correct(snap,{animate=false}={}){
  if(!snap)return;patchSituation(snap);
  const root=activeGameRoot(snap),stage=root?.querySelector(STAGE);if(!stage)return;
  const y=resolveYardFromOwn(snap);if(y!==null&&!stage.dataset.v8912EndYard){stage.dataset.v8912EndYard=String(y);stage.dataset.v8912Poss=String(snap?.possession||'');}
  if(animate)setTimeout(()=>animateCorrected(snap),165);
}
function schedule(){if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{raf=0;const snap=window.__TSO_NFL_LIVE_LATEST__;if(snap)correct(snap);});}
function onLive(e){const snap=e?.detail||window.__TSO_NFL_LIVE_LATEST__;if(!snap)return;correct(snap,{animate:true});}

export function installNflGamecastFieldStateV8912(){
  if(installed||typeof document==='undefined')return observer;installed=true;
  window.addEventListener('tso:nfl-live-snapshot',onLive);
  observer=new MutationObserver(schedule);observer.observe(document.getElementById('nflView')||document.body,{childList:true,subtree:true,characterData:true});
  const snap=window.__TSO_NFL_LIVE_LATEST__;if(snap)correct(snap);
  return observer;
}

export const __V8912_TEST__={strictNum,parseTerritorySpot,resolveYardFromOwn,fieldLabel,gainFrom,kind,lastYardByGame,lastAnimatedByGame};
