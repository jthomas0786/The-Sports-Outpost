const STYLE_ID='tso-mlb-playstage-concept-v923-desktop-style';
const ROOT='.tso-mlb-playstage-v901';
const MQ='(min-width:721px)';
const activeView=new Map();
const feedCache=new Map();
let installed=false,observer=null,raf=0;

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Number.isFinite(Number(v))?Number(v):0;

function ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
@media(min-width:721px){
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923{overflow:hidden!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-view-tabs{
    display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;
    padding:9px 12px!important;border-bottom:1px solid #17395e!important;background:#03101f!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-view-tabs button{
    min-width:126px!important;height:38px!important;padding:0 16px!important;border:1px solid #225589!important;border-radius:8px!important;
    background:#071a32!important;color:#bcd1e8!important;font:800 13px/1 Inter,"Segoe UI",Arial,sans-serif!important;cursor:pointer!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-view-tabs button.on{
    background:#1683ff!important;border-color:#58aaff!important;color:#fff!important;box-shadow:0 0 18px rgba(45,127,255,.24)!important;
  }

  /* Gamecast owns the full content width. The obsolete desktop side rail is gone. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .ps-grid{
    display:block!important;grid-template-columns:none!important;width:100%!important;min-height:0!important;height:auto!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .ps-center{
    display:block!important;width:min(1180px,calc(100% - 24px))!important;max-width:1180px!important;margin:12px auto 0!important;
    min-height:0!important;height:auto!important;overflow:visible!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .ps-right{display:none!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .ps-stage{margin:0 0 76px!important}

  /* Batter returns to the same base Chibi scale as the nearby defensive players. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .ps-chibi.ps-batter,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .ps-chibi[data-actor-kind="batter"]{
    width:50px!important;height:72px!important;z-index:50!important;
  }

  /* Bottom Gamecast composition: state/innings on the left, live play-by-play on the right. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-game-footer{
    width:min(1180px,calc(100% - 24px))!important;max-width:1180px!important;margin:0 auto 12px!important;
    display:grid!important;grid-template-columns:minmax(0,1fr) 360px!important;gap:12px!important;align-items:stretch!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-state-wrap,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-live-wrap{
    min-width:0!important;border:1px solid #173f6a!important;border-radius:10px!important;background:#04101f!important;overflow:hidden!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-live-head{
    padding:9px 12px!important;border-bottom:1px solid #17395e!important;color:#eef6ff!important;
    font:800 13px/1 Inter,"Segoe UI",Arial,sans-serif!important;background:#07182e!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-live-wrap .ps-panel{
    display:block!important;max-height:210px!important;overflow:auto!important;padding:8px!important;background:#030d1c!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-live-wrap .ps-play-item{
    padding:8px 7px!important;margin:0 0 6px!important;border:1px solid #14395f!important;border-radius:8px!important;background:#07182e!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-live-wrap .ps-play-item:last-child{margin-bottom:0!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-live-wrap .ps-play-item b{font-size:13px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-live-wrap .ps-play-item p{font-size:10px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-live-wrap .ps-play-item small{font-size:8px!important}

  /* Bases / Count / Outs above a full-width, evenly-spaced inning line. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .ps-bottom{
    display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;grid-template-rows:auto auto!important;
    width:100%!important;min-width:0!important;margin:0!important;border:0!important;background:#04101f!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .ps-bottom-box{
    grid-row:1!important;min-height:82px!important;padding:10px 8px!important;border-left:1px solid #17314f!important;border-bottom:1px solid #17314f!important;
    box-sizing:border-box!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .ps-linescore + .ps-bottom-box{grid-column:1!important;border-left:0!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .ps-linescore + .ps-bottom-box + .ps-bottom-box{grid-column:2!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .ps-linescore + .ps-bottom-box + .ps-bottom-box + .ps-bottom-box{grid-column:3!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .ps-bottom-box label{font-size:8.5px!important;letter-spacing:.04em!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .ps-count{font-size:25px!important;margin-top:5px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .ps-baseboard{margin:5px auto 0!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .ps-linescore{
    grid-row:2!important;grid-column:1/-1!important;width:100%!important;min-width:0!important;padding:10px 12px 12px!important;
    overflow:visible!important;box-sizing:border-box!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .ps-line-head,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .ps-line-row{
    grid-template-columns:84px repeat(9,minmax(30px,1fr)) 40px 40px 40px!important;width:100%!important;min-width:0!important;
    column-gap:2px!important;font-size:9.5px!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .ps-line-row{min-height:34px!important}

  /* Separate full screens for Box Score and Play by Play. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-alt-host{
    width:min(1180px,calc(100% - 24px))!important;max-width:1180px!important;margin:12px auto!important;min-height:620px!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-alt-screen[hidden],
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .ps-grid[hidden],
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-game-footer[hidden]{display:none!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-alt-screen{
    border:1px solid #173f6a!important;border-radius:11px!important;background:#03101f!important;overflow:hidden!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-screen-title{
    padding:14px 16px!important;border-bottom:1px solid #17395e!important;font:800 18px/1 Inter,"Segoe UI",Arial,sans-serif!important;color:#f3f8ff!important;background:#07182e!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-screen-body{padding:14px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-loading{padding:28px!important;color:#9db3cb!important;text-align:center!important;font:700 13px Inter,"Segoe UI",Arial,sans-serif!important}

  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-box-teams{display:grid!important;grid-template-columns:1fr 1fr!important;gap:14px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-team-box{min-width:0!important;border:1px solid #16395d!important;border-radius:9px!important;overflow:hidden!important;background:#06162a!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-team-title{padding:10px 12px!important;background:#09203d!important;color:#fff!important;font:800 15px Inter,"Segoe UI",Arial,sans-serif!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-subtitle{margin:12px 0 6px!important;color:#65d8ff!important;font:800 10px Inter,"Segoe UI",Arial,sans-serif!important;text-transform:uppercase!important;letter-spacing:.07em!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-table{width:100%!important;border-collapse:collapse!important;font:700 10px Inter,"Segoe UI",Arial,sans-serif!important;color:#dce9f7!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-table th{padding:7px 6px!important;border-bottom:1px solid #17395e!important;color:#8fa9c5!important;text-align:right!important;font-size:8.5px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-table td{padding:7px 6px!important;border-bottom:1px solid rgba(23,57,94,.65)!important;text-align:right!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-table th:first-child,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-table td:first-child{text-align:left!important;width:42%!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-table tr:last-child td{border-bottom:0!important}

  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-pbp{display:grid!important;gap:8px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-pbp-row{display:grid!important;grid-template-columns:84px 120px minmax(0,1fr) 74px!important;gap:12px!important;align-items:start!important;padding:11px 12px!important;border:1px solid #16395d!important;border-radius:9px!important;background:#06162a!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-pbp-inning{color:#64d8ff!important;font:800 10px Inter,"Segoe UI",Arial,sans-serif!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-pbp-event{color:#fff!important;font:800 12px Inter,"Segoe UI",Arial,sans-serif!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-pbp-desc{color:#c5d5e6!important;font:600 11px/1.35 Inter,"Segoe UI",Arial,sans-serif!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v923 .v923-pbp-score{color:#fff!important;text-align:right!important;font:800 11px Inter,"Segoe UI",Arial,sans-serif!important}
}
`;
  document.head.appendChild(s);
}

function gamePk(root){
  const host=root.closest('[data-game-pk],[data-gc-gid]');
  return String(host?.dataset?.gamePk||host?.dataset?.gcGid||root.dataset.gamePk||'');
}

function teamName(feed,side){
  return feed?.gameData?.teams?.[side]?.name||side.toUpperCase();
}

async function loadFeed(id){
  const now=Date.now(),cached=feedCache.get(id);
  if(cached&&now-cached.ts<4000) return cached.promise;
  const promise=fetch(`https://statsapi.mlb.com/api/v1.1/game/${encodeURIComponent(id)}/feed/live?language=en`).then(r=>{if(!r.ok)throw new Error(`MLB feed ${r.status}`);return r.json();});
  feedCache.set(id,{ts:now,promise});
  return promise;
}

function playerRecord(team,id){return team?.players?.[`ID${id}`]||team?.players?.[String(id)]||null;}
function fmt(v){return v===undefined||v===null||v===''?'—':String(v);}
function avg(v){const x=Number(v);return Number.isFinite(x)?x.toFixed(3).replace(/^0/,''):fmt(v);}

function battingRows(team){
  const ids=(team?.battingOrder||[]).map(String);
  return ids.map(id=>{
    const p=playerRecord(team,id)||{},st=p?.stats?.batting||{};
    return `<tr><td>${esc(p?.person?.fullName||'Player')} <small>${esc(p?.position?.abbreviation||'')}</small></td><td>${fmt(st.atBats)}</td><td>${fmt(st.runs)}</td><td>${fmt(st.hits)}</td><td>${fmt(st.rbi)}</td><td>${fmt(st.baseOnBalls)}</td><td>${fmt(st.strikeOuts)}</td><td>${avg(st.avg)}</td></tr>`;
  }).join('')||'<tr><td colspan="8">No batting data yet.</td></tr>';
}
function pitchingRows(team){
  const ids=(team?.pitchers||[]).map(String);
  return ids.map(id=>{
    const p=playerRecord(team,id)||{},st=p?.stats?.pitching||{};
    return `<tr><td>${esc(p?.person?.fullName||'Pitcher')}</td><td>${fmt(st.inningsPitched)}</td><td>${fmt(st.hits)}</td><td>${fmt(st.runs)}</td><td>${fmt(st.earnedRuns)}</td><td>${fmt(st.baseOnBalls)}</td><td>${fmt(st.strikeOuts)}</td><td>${fmt(st.era)}</td></tr>`;
  }).join('')||'<tr><td colspan="8">No pitching data yet.</td></tr>';
}
function teamBox(feed,side){
  const team=feed?.liveData?.boxscore?.teams?.[side]||{};
  return `<section class="v923-team-box"><div class="v923-team-title">${esc(teamName(feed,side))}</div><div style="padding:0 10px 10px"><div class="v923-subtitle">Batting</div><table class="v923-table"><thead><tr><th>Player</th><th>AB</th><th>R</th><th>H</th><th>RBI</th><th>BB</th><th>K</th><th>AVG</th></tr></thead><tbody>${battingRows(team)}</tbody></table><div class="v923-subtitle">Pitching</div><table class="v923-table"><thead><tr><th>Pitcher</th><th>IP</th><th>H</th><th>R</th><th>ER</th><th>BB</th><th>K</th><th>ERA</th></tr></thead><tbody>${pitchingRows(team)}</tbody></table></div></section>`;
}
function boxScoreHTML(feed){return `<div class="v923-box-teams">${teamBox(feed,'away')}${teamBox(feed,'home')}</div>`;}

function playByPlayHTML(feed){
  const plays=[...(feed?.liveData?.plays?.allPlays||[])].reverse();
  if(!plays.length) return '<div class="v923-loading">No play-by-play available yet.</div>';
  return `<div class="v923-pbp">${plays.map(p=>{
    const inn=n(p?.about?.inning),half=p?.about?.halfInning==='bottom'?'Bot':'Top';
    const event=p?.result?.event||p?.result?.eventType||'Play';
    const desc=p?.result?.description||event;
    const away=n(p?.result?.awayScore),home=n(p?.result?.homeScore);
    return `<div class="v923-pbp-row"><div class="v923-pbp-inning">${half} ${inn}</div><div class="v923-pbp-event">${esc(event)}</div><div class="v923-pbp-desc">${esc(desc)}</div><div class="v923-pbp-score">${away}-${home}</div></div>`;
  }).join('')}</div>`;
}

async function renderAlt(root,view){
  const id=gamePk(root),screen=root.querySelector(`.v923-alt-screen[data-v923-view="${view}"]`),body=screen?.querySelector('.v923-screen-body');
  if(!id||!body) return;
  body.innerHTML='<div class="v923-loading">Loading live MLB data…</div>';
  try{
    const feed=await loadFeed(id);
    if(!root.isConnected||activeView.get(id)!==view) return;
    body.innerHTML=view==='box'?boxScoreHTML(feed):playByPlayHTML(feed);
  }catch(e){
    body.innerHTML=`<div class="v923-loading">Unable to load ${view==='box'?'box score':'play by play'} right now.</div>`;
  }
}

function applyView(root,view){
  const id=gamePk(root),v=['gamecast','box','plays'].includes(view)?view:'gamecast';
  if(id) activeView.set(id,v);
  root.dataset.desktopView=v;
  root.querySelectorAll('.v923-view-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.v923View===v));
  const grid=root.querySelector('.ps-grid'),footer=root.querySelector('.v923-game-footer'),alt=root.querySelector('.v923-alt-host');
  if(grid) grid.hidden=v!=='gamecast';
  if(footer) footer.hidden=v!=='gamecast';
  if(alt) alt.hidden=v==='gamecast';
  root.querySelectorAll('.v923-alt-screen').forEach(s=>s.hidden=s.dataset.v923View!==v);
  if(v!=='gamecast') renderAlt(root,v);
}

function buildDesktop(root){
  root.classList.add('tso-mlb-desktop-v923');
  root.dataset.desktopLayout='v923';
  const top=root.querySelector('.ps-top'),grid=root.querySelector('.ps-grid'),center=root.querySelector('.ps-center'),right=root.querySelector('.ps-right');
  if(!top||!grid||!center||!right) return;

  let nav=root.querySelector(':scope > .v923-view-tabs');
  if(!nav){
    nav=document.createElement('nav');
    nav.className='v923-view-tabs';
    nav.setAttribute('aria-label','MLB Gamecast views');
    nav.innerHTML='<button type="button" data-v923-view="gamecast">Gamecast</button><button type="button" data-v923-view="box">Box Score</button><button type="button" data-v923-view="plays">Play by Play</button>';
    top.insertAdjacentElement('afterend',nav);
    nav.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>applyView(root,btn.dataset.v923View)));
  }

  let footer=root.querySelector(':scope > .v923-game-footer');
  if(!footer){
    footer=document.createElement('section');
    footer.className='v923-game-footer';
    footer.innerHTML='<div class="v923-state-wrap"></div><aside class="v923-live-wrap"><div class="v923-live-head">Live Play-by-Play</div></aside>';
    grid.insertAdjacentElement('afterend',footer);
  }
  const bottom=root.querySelector(':scope > .ps-bottom')||center.querySelector(':scope > .ps-bottom');
  const stateWrap=footer.querySelector('.v923-state-wrap');
  if(bottom&&bottom.parentElement!==stateWrap) stateWrap.appendChild(bottom);
  const livePanel=right.querySelector('[data-ps-panel="live"]');
  const liveWrap=footer.querySelector('.v923-live-wrap');
  if(livePanel&&livePanel.parentElement!==liveWrap) liveWrap.appendChild(livePanel);
  if(livePanel){livePanel.hidden=false;livePanel.removeAttribute('hidden');}

  let alt=root.querySelector(':scope > .v923-alt-host');
  if(!alt){
    alt=document.createElement('section');
    alt.className='v923-alt-host';
    alt.innerHTML='<section class="v923-alt-screen" data-v923-view="box"><div class="v923-screen-title">Box Score</div><div class="v923-screen-body"></div></section><section class="v923-alt-screen" data-v923-view="plays"><div class="v923-screen-title">Play by Play</div><div class="v923-screen-body"></div></section>';
    footer.insertAdjacentElement('afterend',alt);
  }
  const id=gamePk(root),view=id&&activeView.get(id)||'gamecast';
  applyView(root,view);
}

function clearDesktop(root){
  root.classList.remove('tso-mlb-desktop-v923');
  delete root.dataset.desktopLayout;delete root.dataset.desktopView;
}
function enhance(root){if(window.matchMedia(MQ).matches)buildDesktop(root);else clearDesktop(root);}
function scan(){raf=0;if(document.documentElement.getAttribute('data-sport')!=='mlb')return;document.querySelectorAll(ROOT).forEach(enhance);}
function queue(){if(!raf)raf=requestAnimationFrame(scan);}
export function installMlbPlaystageConceptV923DesktopTabs(){
  ensureStyles();
  if(installed){queue();return;}
  installed=true;
  observer=new MutationObserver(queue);
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',queue,{passive:true});
  window.addEventListener('hashchange',queue);
  queue();
}
export const __MLB_PLAYSTAGE_CONCEPT_V923_DESKTOP_TABS_TEST__={STYLE_ID,ROOT,MQ};
