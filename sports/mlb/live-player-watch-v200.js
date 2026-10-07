
const STYLE_ID='tso-mlb-live-player-watch-v200-style';
const CARD_CLASS='tso-mlb2-watch';
const TOPGRID_CLASS='tso-mlb2-topgrid';
const POLL_MS=20000;

let installed=false;
let observer=null;
let currentGamePk='';
let poll=null;
let fetchToken=0;

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const headshot=id=>id?`https://img.mlbstatic.com/mlb-photos/image/upload/w_180,q_auto:best/v1/people/${encodeURIComponent(id)}/headshot/67/current`:'';

function ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
    html[data-sport="mlb"] .${TOPGRID_CLASS}{
      display:grid!important;grid-template-columns:minmax(0,1.55fr) minmax(280px,.7fr)!important;
      gap:12px!important;align-items:stretch!important;margin:0 0 12px!important;
    }
    html[data-sport="mlb"] .${TOPGRID_CLASS}>.mlb-live-gc-top{
      margin:0!important;height:100%!important;min-height:132px!important;
      border:1px solid rgba(45,127,255,.28)!important;border-radius:12px!important;
      background:linear-gradient(180deg,#07182e,#04101f)!important;padding:16px 18px!important;
    }
    html[data-sport="mlb"] .${CARD_CLASS}{
      border:1px solid rgba(45,127,255,.34);border-radius:12px;background:linear-gradient(180deg,#07182e,#04101f);
      padding:12px 13px;display:flex;flex-direction:column;justify-content:center;min-width:0;
      box-shadow:0 12px 34px rgba(0,0,0,.18);
    }
    html[data-sport="mlb"] .${CARD_CLASS}__head{display:flex;align-items:center;justify-content:space-between;gap:8px;
      color:#cfe3ff;font:800 10px/1.2 Inter,"Segoe UI",Arial,sans-serif;text-transform:uppercase;letter-spacing:.09em}
    html[data-sport="mlb"] .${CARD_CLASS}__hot{display:inline-flex;align-items:center;gap:5px;color:#fb923c}
    html[data-sport="mlb"] .${CARD_CLASS}__hot i{width:7px;height:7px;border-radius:50%;background:#fb923c;box-shadow:0 0 10px rgba(251,146,60,.85)}
    html[data-sport="mlb"] .${CARD_CLASS}__person{display:flex;align-items:center;gap:10px;margin-top:10px;min-width:0}
    html[data-sport="mlb"] .${CARD_CLASS}__photo{width:56px;height:56px;flex:0 0 56px;border-radius:10px;overflow:hidden;
      border:1px solid #214b78;background:#0a213a;display:grid;place-items:center;color:#7d9bb8;font-weight:900}
    html[data-sport="mlb"] .${CARD_CLASS}__photo img{width:100%;height:100%;object-fit:cover;object-position:50% 15%}
    html[data-sport="mlb"] .${CARD_CLASS}__copy{min-width:0}
    html[data-sport="mlb"] .${CARD_CLASS}__copy b{display:block;color:#fff;font:800 17px/1.1 Inter,"Segoe UI",Arial,sans-serif;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    html[data-sport="mlb"] .${CARD_CLASS}__copy span{display:block;margin-top:4px;color:#8199b2;font-size:10px}
    html[data-sport="mlb"] .${CARD_CLASS}__stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px}
    html[data-sport="mlb"] .${CARD_CLASS}__stat{padding:7px 5px;text-align:center;border:1px solid #173f69;border-radius:8px;background:#06172a}
    html[data-sport="mlb"] .${CARD_CLASS}__stat b{display:block;color:#fff;font:900 18px/1 Inter,"Segoe UI",Arial,sans-serif}
    html[data-sport="mlb"] .${CARD_CLASS}__stat span{display:block;margin-top:3px;color:#7f98b2;font:800 8px/1 Inter,"Segoe UI",Arial,sans-serif;letter-spacing:.07em}
    html[data-sport="mlb"] .${CARD_CLASS}__empty{margin-top:10px;color:#8ea6bd;font-size:11px;line-height:1.4}
    html[data-sport="mlb"] .mlb-live-gc-shell .gc-pbp-pane,
    html[data-sport="mlb"] .mlb-live-gc-shell .gc-pbp-card{width:100%!important;max-width:none!important}
    @media(max-width:820px){
      html[data-sport="mlb"] .${TOPGRID_CLASS}{grid-template-columns:1fr!important}
      html[data-sport="mlb"] .${TOPGRID_CLASS}>.mlb-live-gc-top{min-height:0!important}
    }
  `;
  document.head.appendChild(s);
}

function rememberGamePkFromClick(event){
  const el=event.target.closest?.('[data-live-game-pk],[data-open-live-gamecast]');
  if(!el) return;
  const pk=el.dataset.liveGamePk||el.dataset.openLiveGamecast||'';
  if(pk) currentGamePk=String(pk);
}

function hitterRows(side){
  if(!side?.players) return [];
  const ids=Array.isArray(side.batters)?side.batters:[];
  return ids.map(id=>{
    const p=side.players['ID'+id];
    const b=p?.stats?.batting;
    if(!p?.person||!b) return null;
    const pa=n(b.plateAppearances);
    const ab=n(b.atBats);
    if(pa<=0&&ab<=0) return null;
    const hits=n(b.hits),hr=n(b.homeRuns),rbi=n(b.rbi),runs=n(b.runs),bb=n(b.baseOnBalls),sb=n(b.stolenBases);
    const totalBases=n(b.totalBases);
    return {
      type:'hitter',id:p.person.id,name:p.person.fullName||'Player',pos:p.position?.abbreviation||'',
      hits,hr,rbi,runs,bb,sb,totalBases,
      score:(hr*9)+(rbi*3)+(hits*2.25)+(runs*1.5)+(sb*3)+(bb*.75)+(totalBases*.5)
    };
  }).filter(Boolean);
}

function pitcherRows(side){
  if(!side?.players) return [];
  const ids=Array.isArray(side.pitchers)?side.pitchers:[];
  return ids.map(id=>{
    const p=side.players['ID'+id];
    const x=p?.stats?.pitching;
    if(!p?.person||!x) return null;
    const so=n(x.strikeOuts);
    if(so<5) return null;
    return {
      type:'pitcher',id:p.person.id,name:p.person.fullName||'Pitcher',pos:'P',
      so,ip:x.inningsPitched??'0.0',pitches:x.pitchesThrown??x.numberOfPitches??'—',
      score:so*3.25
    };
  }).filter(Boolean);
}

function selectHotPlayer(data){
  const teams=data?.liveData?.boxscore?.teams;
  if(!teams) return null;
  const hitters=[...hitterRows(teams.away),...hitterRows(teams.home)];
  const pitchers=[...pitcherRows(teams.away),...pitcherRows(teams.home)];
  const pool=[...hitters,...pitchers];
  if(!pool.length) return null;
  pool.sort((a,b)=>b.score-a.score);
  return pool[0];
}

function statsHtml(p){
  if(p.type==='pitcher'){
    return [
      ['K',p.so],
      ['IP',p.ip],
      ['PITCHES',p.pitches]
    ].map(([label,value])=>`<div class="${CARD_CLASS}__stat"><b>${esc(value)}</b><span>${label}</span></div>`).join('');
  }
  return [
    ['H',p.hits],
    ['HR',p.hr],
    ['RBI',p.rbi]
  ].map(([label,value])=>`<div class="${CARD_CLASS}__stat"><b>${esc(value)}</b><span>${label}</span></div>`).join('');
}

function renderCard(card,p){
  if(!p){
    card.innerHTML=`<div class="${CARD_CLASS}__head"><span>✦ Player to Watch</span><span>GAME STATS</span></div>
      <div class="${CARD_CLASS}__empty">Waiting for enough real box-score production to identify the hottest player in this game.</div>`;
    return;
  }
  const src=headshot(p.id);
  card.innerHTML=`<div class="${CARD_CLASS}__head"><span>✦ Player to Watch</span><span class="${CARD_CLASS}__hot"><i></i> HOT</span></div>
    <div class="${CARD_CLASS}__person">
      <div class="${CARD_CLASS}__photo">${src?`<img src="${esc(src)}" alt="${esc(p.name)}">`:'MLB'}</div>
      <div class="${CARD_CLASS}__copy"><b>${esc(p.name)}</b><span>${esc(p.type==='pitcher'?'Pitcher · qualifies by strikeouts only':`${p.pos||'Hitter'} · this game only`)}</span></div>
    </div>
    <div class="${CARD_CLASS}__stats">${statsHtml(p)}</div>`;
}

function ensureCard(){
  const shell=document.querySelector('.mlb-live-gc-shell');
  const top=shell?.querySelector('.mlb-live-gc-top');
  if(!shell||!top) return null;
  let grid=top.parentElement?.classList?.contains(TOPGRID_CLASS)?top.parentElement:null;
  if(!grid){
    grid=document.createElement('div');
    grid.className=TOPGRID_CLASS;
    top.before(grid);
    grid.appendChild(top);
  }
  let card=grid.querySelector('.'+CARD_CLASS);
  if(!card){
    card=document.createElement('section');
    card.className=CARD_CLASS;
    grid.appendChild(card);
    renderCard(card,null);
  }
  return card;
}

async function refreshCard(){
  const card=ensureCard();
  const pk=String(currentGamePk||'');
  if(!card||!pk) return;
  const token=++fetchToken;
  try{
    const r=await fetch(`https://statsapi.mlb.com/api/v1.1/game/${encodeURIComponent(pk)}/feed/live`,{cache:'no-store'});
    if(!r.ok) return;
    const data=await r.json();
    if(token!==fetchToken) return;
    renderCard(card,selectHotPlayer(data));
  }catch(e){
    console.warn('[MLB 2.0 Player to Watch] live box score unavailable',e);
  }
}

function queueRefresh(){
  requestAnimationFrame(()=>{
    if(ensureCard()) refreshCard();
  });
}

function startPolling(){
  if(poll) clearInterval(poll);
  poll=setInterval(()=>{
    if(document.querySelector('.mlb-live-gc-shell')&&document.visibilityState!=='hidden') refreshCard();
  },POLL_MS);
}

export function installMlbLivePlayerWatchV200(){
  ensureStyles();
  if(installed){queueRefresh();return;}
  installed=true;
  document.addEventListener('click',rememberGamePkFromClick,true);
  observer=new MutationObserver(queueRefresh);
  observer.observe(document.body,{childList:true,subtree:true});
  startPolling();
  queueRefresh();
}
