const ROOT='#nflView:not([hidden]) .nxg-concept[data-nfl-inline-gamecast]';
const byGame=new Map();
let installed=false,observer=null,raf=0;

const num=v=>Number.isFinite(Number(v))?Number(v):null;
const clockText=min=>{
  const n=num(min);if(n==null)return'';
  let sec=Math.max(0,Math.round(n*60));
  return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
};
const periodText=p=>p>=5?'OT':p===1?'1ST':p===2?'2ND':p===3?'3RD':p===4?'4TH':'';
const snapId=s=>String(s?.gameId||s?.id||'');
const activeRoot=()=>document.querySelector(ROOT);
const activeId=()=>String(activeRoot()?.getAttribute('data-nfl-inline-gamecast')||'');
const setText=(el,v)=>{if(el&&v!==''&&el.textContent!==String(v))el.textContent=String(v);};

function renderActive(){
  const root=activeRoot();if(!root)return;
  const id=String(root.getAttribute('data-nfl-inline-gamecast')||'');
  const snap=byGame.get(id);if(!snap)return;
  const scores=root.querySelectorAll('.nxg-score');
  const away=num(snap?.away?.score),home=num(snap?.home?.score);
  if(away!=null)setText(scores[0],Math.round(away));
  if(home!=null)setText(scores[1],Math.round(home));
  const period=num(snap?.liveScore?.period);
  const clock=snap?.liveScore?.clockMin;
  if(period>0)setText(root.querySelector('.nxg-period'),periodText(period));
  if(num(clock)!=null)setText(root.querySelector('.nxg-clock'),clockText(clock));
  const poss=snap?.possession;
  const possEl=root.querySelector('.nxg-posstext');
  if(possEl&&(poss==='away'||poss==='home')){
    const abbr=poss==='away'?snap?.away?.abbr:snap?.home?.abbr;
    if(abbr)setText(possEl,`${abbr} has the ball`);
  }
  root.dataset.tsoActiveLive='89.11';
}
function schedule(){if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{raf=0;renderActive();});}

function onLive(e){
  const snap=e?.detail;if(!snap)return;
  const id=snapId(snap);if(!id)return;
  byGame.set(id,snap);
  const active=activeId();
  if(active&&id!==active){
    // live.js polls the whole slate. Older code wrote every game's 0-0/0:00
    // snapshot into the one visible Gamecast. Stop non-active game events before
    // animation/score listeners see them, and restore the active snapshot.
    const keep=byGame.get(active);
    window.__TSO_NFL_LIVE_LATEST__=keep||null;
    e.stopImmediatePropagation();
    schedule();
    return;
  }
  if(!active||active===id){
    window.__TSO_NFL_LIVE_LATEST__=snap;
    renderActive();
  }
}

export function installNflGamecastActiveLiveV8911(){
  if(installed||typeof document==='undefined')return observer;
  installed=true;
  // Capture listeners on Window run before the existing bubble listeners.
  window.addEventListener('tso:nfl-live-snapshot',onLive,true);
  const active=activeId();
  const seed=window.__TSO_NFL_LIVE_LATEST__;
  if(seed&&snapId(seed)){
    const id=snapId(seed);
    byGame.set(id,seed);
    // Do not let the old score guard seed itself from whichever other slate
    // game happened to be polled last before v89.11 mounted.
    if(active&&id!==active)window.__TSO_NFL_LIVE_LATEST__=null;
  }
  observer=new MutationObserver(schedule);
  observer.observe(document.getElementById('nflView')||document.body,{childList:true,subtree:true,characterData:true});
  schedule();
  return observer;
}

export const __V8911_TEST__={byGame,clockText,periodText,activeId,renderActive};
