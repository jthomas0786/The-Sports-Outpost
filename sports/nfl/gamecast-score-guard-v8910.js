/**
 * v89.14 score/clock DOM guard.
 * The live acceptor in live.js is the only authority. This module never invents,
 * clamps, advances or merges game state; it only reapplies the accepted snapshot
 * after legacy DOM work or a structural rerender.
 */
const snapshots=new Map();
let observer=null,pending=false;
const num=v=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const gameId=s=>String(s?.gameId||s?.id||'');
function activeGameId(){
  const root=document.querySelector('#nflView:not([hidden]) [data-tso-v886e-gamecast],#nflView:not([hidden]) [data-nfl-inline-gamecast]');
  return String(root?.getAttribute('data-game-id')||root?.getAttribute('data-nfl-inline-gamecast')||root?.dataset?.gameId||'');
}
function clockText(v){const n=num(v);if(n==null)return'';let s=Math.max(0,Math.round(n*60));const m=Math.floor(s/60);s%=60;return`${m}:${String(s).padStart(2,'0')}`;}
function periodText(p){const n=num(p);if(!n)return'';if(n>=5)return'OT';return`${n}${n===1?'ST':n===2?'ND':n===3?'RD':'TH'}`;}
function stateFrom(snap){return {gameId:gameId(snap),away:num(snap?.away?.score),home:num(snap?.home?.score),period:num(snap?.liveScore?.period),clockMin:num(snap?.liveScore?.clockMin)};}
function remember(snap){const id=gameId(snap);if(!id)return null;snapshots.set(id,snap);return snap;}
function acceptedForView(){
  const id=activeGameId();if(id&&snapshots.has(id))return snapshots.get(id);
  const latest=window.__TSO_NFL_LIVE_LATEST__;return !id||gameId(latest)===id?latest:null;
}
function apply(snap=acceptedForView()){
  if(!snap||typeof document==='undefined')return;
  const id=activeGameId();if(id&&gameId(snap)!==id)return;
  const root=document.querySelector('#nflView:not([hidden]) .nxg-concept')||document.querySelector('#nflView:not([hidden])');if(!root)return;
  const s=stateFrom(snap),scores=root.querySelectorAll('.nxg-score');
  if(scores[0]&&s.away!=null)scores[0].textContent=String(s.away);
  if(scores[1]&&s.home!=null)scores[1].textContent=String(s.home);
  const q=root.querySelector('.nxg-period');if(q&&s.period!=null)q.textContent=periodText(s.period);
  const c=root.querySelector('.nxg-clock');if(c&&s.clockMin!=null)c.textContent=clockText(s.clockMin);
}
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;apply();});}
function onLive(e){const snap=remember(e.detail);if(snap)apply(snap);}
export function installNflGamecastScoreGuardV8910(){
  if(typeof document==='undefined')return null;
  if(observer)return observer;
  window.addEventListener('tso:nfl-live-snapshot',onLive);
  const latest=window.__TSO_NFL_LIVE_LATEST__;if(latest)remember(latest);
  observer=new MutationObserver(schedule);observer.observe(document.getElementById('nflView')||document.body,{childList:true,subtree:true,characterData:true});
  apply();return observer;
}
export function renderNflGamecastScoreGuardV8910Now(){apply();}
export const __V8910_TEST__={clockText,periodText,stateFrom,snapshots};
