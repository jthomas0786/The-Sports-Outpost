const ROOT='#nflView:not([hidden]) .nxg-concept';
const states=new Map();
let installed=false,observer=null,raf=0;

const num=v=>Number.isFinite(Number(v))?Number(v):null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const gameId=s=>String(s?.gameId||s?.id||'');
const periodLabel=p=>p>=5?'OT':p===1?'1ST':p===2?'2ND':p===3?'3RD':p===4?'4TH':'';
const clockText=sec=>{if(sec==null)return'';sec=Math.max(0,Math.round(sec));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;};
const clockSec=s=>{const m=num(s?.liveScore?.clockMin);return m==null?null:Math.round(m*60);};
const scorePair=s=>({away:num(s?.away?.score),home:num(s?.home?.score)});

function acceptSnapshot(snap){
  const id=gameId(snap);if(!id)return null;
  const incomingPeriod=num(snap?.liveScore?.period)||0;
  const incomingClock=clockSec(snap);
  const sc=scorePair(snap);
  const prev=states.get(id);
  if(!prev){
    const provisionalZero=incomingPeriod>0&&incomingClock===0&&((sc.away||0)+(sc.home||0)===0);
    const next={id,period:incomingPeriod,clock:incomingClock,away:sc.away,home:sc.home,provisionalZero,updatedAt:Date.now()};
    states.set(id,next);return next;
  }

  const next={...prev,updatedAt:Date.now()};
  if(sc.away!=null) next.away=prev.away==null?sc.away:Math.max(prev.away,sc.away);
  if(sc.home!=null) next.home=prev.home==null?sc.home:Math.max(prev.home,sc.home);

  if(incomingPeriod>prev.period){
    next.period=incomingPeriod;
    next.clock=incomingClock;
    next.provisionalZero=incomingClock===0;
  }else if(incomingPeriod===prev.period){
    const scoreAdvanced=(next.away??0)>(prev.away??0)||(next.home??0)>(prev.home??0);
    if(prev.clock==null){
      next.clock=incomingClock;
    }else if(incomingClock!=null){
      // NFL clock should count down within a period. Allow tiny official-clock
      // corrections, but never let a stale/default 0:00 replace a real clock.
      const staleZero=incomingClock===0&&prev.clock>30&&!scoreAdvanced;
      const suspiciousJump=incomingClock>prev.clock+8&&!prev.provisionalZero&&!scoreAdvanced;
      if(!staleZero&&!suspiciousJump) next.clock=incomingClock;
      // A 0:00/0-0 placeholder may be the first thing rendered. The first real
      // live snapshot is allowed to recover upward from that provisional state.
      if(prev.provisionalZero&&incomingClock>0) next.clock=incomingClock;
    }
    if(next.clock>0||scoreAdvanced) next.provisionalZero=false;
  }
  states.set(id,next);return next;
}

function currentState(){
  const snap=window.__TSO_NFL_LIVE_LATEST__;
  const id=gameId(snap);
  return (id&&states.get(id))||null;
}
function setText(el,value){if(el&&value!==''&&el.textContent!==String(value))el.textContent=String(value);}
function applyState(st=currentState()){
  if(!st)return;
  const root=document.querySelector(ROOT);if(!root)return;
  const scores=root.querySelectorAll('.nxg-score');
  if(st.away!=null)setText(scores[0],Math.round(st.away));
  if(st.home!=null)setText(scores[1],Math.round(st.home));
  if(st.period>0)setText(root.querySelector('.nxg-period'),periodLabel(st.period));
  if(st.clock!=null)setText(root.querySelector('.nxg-clock'),clockText(st.clock));
  root.dataset.tsoScoreGuard='89.10';
}
function scheduleApply(){if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{raf=0;applyState();});}
function onSnapshot(e){const snap=e?.detail||window.__TSO_NFL_LIVE_LATEST__;if(!snap)return;acceptSnapshot(snap);applyState();}

export function installNflGamecastScoreGuardV8910(){
  if(installed||typeof document==='undefined')return observer;installed=true;
  window.addEventListener('tso:nfl-live-snapshot',onSnapshot);
  const snap=window.__TSO_NFL_LIVE_LATEST__;if(snap)acceptSnapshot(snap);
  observer=new MutationObserver(scheduleApply);
  observer.observe(document.getElementById('nflView')||document.body,{childList:true,subtree:true,characterData:true});
  applyState();
  return observer;
}

export const __V8910_TEST__={acceptSnapshot,clockText,periodLabel,states};
