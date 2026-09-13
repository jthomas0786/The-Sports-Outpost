const ROOT='#nflView:not([hidden]) .nxg-concept[data-nfl-inline-gamecast]';
const lastByGame=new Map();
let installed=false;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=v=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const norm=v=>({LAR:'LA',JAC:'JAX',WAS:'WSH',OAK:'LV',SD:'LAC',STL:'LA'}[String(v||'').toUpperCase()]||String(v||'').toUpperCase());
const side=v=>v==='away'||v==='home'?v:null;
const gameId=s=>String(s?.gameId||s?.id||'');
const teamFor=(s,which)=>norm(which==='home'?s?.home?.abbr:which==='away'?s?.away?.abbr:'');

function spotFromText(value,snap,possession){
  const poss=side(possession);if(!poss)return null;
  const txt=String(value||'').toUpperCase();if(!txt)return null;
  const offense=teamFor(snap,poss),defense=teamFor(snap,poss==='away'?'home':'away');
  const to=txt.match(/\bTO\s+([A-Z]{2,3})\s+(\d{1,2})\b/);
  const all=[...txt.matchAll(/\b([A-Z]{2,3})\s+(\d{1,2})\b/g)];
  const m=to||all.at(-1);
  if(m){
    const loc=norm(m[1]),yard=Number(m[2]);
    if(Number.isFinite(yard)&&yard>=0&&yard<=50){
      if(loc===offense)return yard;
      if(loc===defense)return 100-yard;
    }
  }
  if(/\b50\b/.test(txt))return 50;
  return null;
}

function deriveCurrentOwn(snap){
  if(!snap)return null;
  const live=snap.liveScore||{},pos=side(snap.possession||live.possession||snap?.gamecastState?.possession);
  if(!pos)return null;

  // Prefer explicit territory text because the ESPN scoreboard schema now sends
  // examples such as "IND 4" / "ATL 15" while older ballLocation can be absent.
  for(const value of [
    live.possessionText,
    live.downDistanceText,
    live.currentDrive?.endText,
    snap.currentPlay?.description,
    live.lastPlayText,
  ]){
    const y=spotFromText(value,snap,pos);if(y!=null){lastByGame.set(gameId(snap),{pos,y});return y;}
  }

  const raw=finite(live.yardFromOwn);
  if(raw!=null&&raw>=0&&raw<=100){lastByGame.set(gameId(snap),{pos,y:raw});return raw;}

  // If ESPN gives a timeout/incomplete play with no spot, preserve the last
  // accepted position for the same possession instead of snapping back to 0.
  const prior=lastByGame.get(gameId(snap));
  if(prior?.pos===pos&&finite(prior.y)!=null)return clamp(prior.y,0,100);

  // Final fallback: current drive start + net yards when both are available.
  const start=spotFromText(live.currentDrive?.startText,snap,pos),driveYards=finite(live.currentDrive?.yards);
  if(start!=null&&driveYards!=null){const y=clamp(start+driveYards,0,100);lastByGame.set(gameId(snap),{pos,y});return y;}
  return null;
}

function repairSnapshot(snap){
  if(!snap)return snap;
  const pos=side(snap.possession||snap?.liveScore?.possession||snap?.gamecastState?.possession);if(!pos)return snap;
  const current=deriveCurrentOwn(snap);if(current==null)return snap;
  const live=snap.liveScore||(snap.liveScore={});
  const st=snap.gamecastState||live.gamecastState;
  live.yardFromOwn=current;
  if(!st)return snap;
  snap.gamecastState=st;live.gamecastState=st;
  st.possession=pos;
  st.currentYardFromOwn=current;
  const distance=finite(live.distance);
  st.currentFirstDownYardFromOwn=distance==null?null:clamp(current+Math.max(0,distance),0,100);

  // For normal plays, anchor the reenactment at the previous line and settle at
  // the current authoritative spot. This is what actually moves the Chibis downfield.
  if(!st.turnover&&(!st.playOffenseSide||st.playOffenseSide===pos)){
    const gain=finite(st.resultYards)??0;
    st.endYardFromOwn=current;
    if(finite(st.startYardFromOwn)==null)st.startYardFromOwn=clamp(current-gain,0,100);
    const startDistance=finite(st.startDistance)??distance??10;
    st.preSnapFirstDownYardFromOwn=clamp(Number(st.startYardFromOwn)+Math.max(0,startDistance),0,100);
  }
  return snap;
}

function activeSnap(){
  const root=document.querySelector(ROOT);if(!root)return null;
  const snap=window.__TSO_NFL_LIVE_LATEST__;if(!snap)return null;
  const id=String(root.getAttribute('data-nfl-inline-gamecast')||'');
  return id&&gameId(snap)===id?snap:null;
}
function onLive(e){repairSnapshot(e?.detail);}

export function installNflGamecastFieldPositionV8925(){
  if(typeof window==='undefined')return null;
  repairSnapshot(activeSnap()||window.__TSO_NFL_LIVE_LATEST__);
  if(installed)return true;
  installed=true;
  // Register before the authoritative field renderer so every future snapshot
  // already contains the correct LOS when the renderer receives it.
  window.addEventListener('tso:nfl-live-snapshot',onLive,true);
  return true;
}

export const __V8925_TEST__={spotFromText,deriveCurrentOwn,repairSnapshot};
