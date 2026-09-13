const STYLE_ID='tso-mlb-live-game-switcher-v905';
const HOST_ID='tsoMlbLiveGameSwitcher';
const INLINE_ID='tsoMlbInlineGamecast';
const MODAL_HOST_ID='tsoMlbModalLiveGameSwitcher';
let installed=false,observer=null,raf=0,currentGameId='',slatePromise=null,slate=[];

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function globalBinding(name){
 try{return window.eval(name);}catch{}
 try{return (0,eval)(name);}catch{}
 return null;
}

function ensureStyles(){
 if(document.getElementById(STYLE_ID))return;
 for(const id of ['tso-mlb-live-game-switcher-v901','tso-mlb-live-game-switcher-v902','tso-mlb-live-game-switcher-v903','tso-mlb-live-game-switcher-v904'])document.getElementById(id)?.remove();
 const style=document.createElement('style');style.id=STYLE_ID;
 style.textContent=`
 html[data-sport="mlb"] .tso-mlb-live-switcher{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;margin:0 0 14px;padding:10px 12px;border:1px solid rgba(45,127,255,.30);border-radius:11px;background:linear-gradient(180deg,rgba(10,32,67,.96),rgba(5,19,43,.96));box-sizing:border-box;color:#edf6ff}
 html[data-sport="mlb"] .tso-mlb-live-switcher label{display:flex;align-items:center;gap:10px;min-width:0;flex:1;color:#74dfff;font:900 9px 'JetBrains Mono','Space Mono',monospace;text-transform:uppercase;letter-spacing:.08em}
 html[data-sport="mlb"] .tso-mlb-live-switcher select{appearance:auto;min-height:38px;min-width:0;width:min(560px,72vw);max-width:100%;padding:0 10px;border:1px solid rgba(66,126,197,.52);border-radius:8px;background:#071a34;color:#edf6ff;font:800 10px 'JetBrains Mono','Space Mono',monospace;cursor:pointer}
 html[data-sport="mlb"] .tso-mlb-live-switcher select:disabled{cursor:default;color:#9eb0c8;opacity:1}
 html[data-sport="mlb"] .tso-mlb-live-switcher-state{color:#54e58b;font:900 8px 'JetBrains Mono','Space Mono',monospace;text-transform:uppercase;white-space:nowrap;letter-spacing:.04em}
 html[data-sport="mlb"] .tso-mlb-live-switcher.is-idle .tso-mlb-live-switcher-state{color:#8b95a8}
 html[data-sport="mlb"] #${INLINE_ID}{width:100%;margin:0 0 18px;scroll-margin-top:76px}
 html[data-sport="mlb"] #${INLINE_ID} .mlb-live-gc-shell{width:100%;max-width:none;margin:0;background:linear-gradient(180deg,rgba(7,25,53,.98),rgba(3,14,31,.98));border:1px solid rgba(45,127,255,.28);border-radius:14px;padding:12px;box-shadow:0 14px 40px rgba(0,0,0,.22)}
 html[data-sport="mlb"] #${INLINE_ID} .mlb-live-gc-top{margin-top:0}
 html[data-sport="mlb"] #${INLINE_ID} .modal-close{display:none!important}
 @media(max-width:680px){html[data-sport="mlb"] .tso-mlb-live-switcher{align-items:stretch;flex-direction:column;padding:10px;margin-bottom:12px}html[data-sport="mlb"] .tso-mlb-live-switcher label{display:block;width:100%}html[data-sport="mlb"] .tso-mlb-live-switcher label>span{display:block;margin-bottom:7px}html[data-sport="mlb"] .tso-mlb-live-switcher select{display:block;width:100%;max-width:none;font-size:16px}html[data-sport="mlb"] .tso-mlb-live-switcher-state{padding-left:1px}html[data-sport="mlb"] #${INLINE_ID} .mlb-live-gc-shell{padding:8px;border-radius:12px}}
 `;
 document.head.appendChild(style);
}

async function loadSlate(){
 if(slate.length)return slate;
 if(!slatePromise)slatePromise=fetch('./slate.json?ts='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null).then(doc=>{
  slate=Array.isArray(doc?.games)?doc.games.map(g=>({
   id:String(g.gamePk??''),
   away:String(g.away?.abbr||g.away?.name||'Away'),
   home:String(g.home?.abbr||g.home?.name||'Home'),
   start:String(g.startTimeUTC||''),
   detail:String(g.detailedStatus||g.status||'Scheduled')
  })).filter(g=>g.id):[];
  return slate;
 }).catch(()=>[]).finally(()=>{slatePromise=null;});
 return slatePromise;
}

function liveIds(){return new Set([...document.querySelectorAll('html[data-sport="mlb"] [data-live-game-pk]')].map(x=>String(x.dataset.liveGamePk||'')).filter(Boolean));}
function clockLabel(start){
 const t=Date.parse(start||'');if(!Number.isFinite(t))return 'Scheduled';
 try{return new Date(t).toLocaleString([],{weekday:'short',hour:'numeric',minute:'2-digit'});}catch{return 'Scheduled';}
}
function gamesForSelector(){
 const live=liveIds();
 return slate.map(g=>({...g,live:live.has(g.id),label:`${g.away} @ ${g.home} · LIVE`}));
}
function activeGames(games){return games.filter(g=>g.live);}
function nextGame(games){
 const now=Date.now();
 return games.filter(g=>!g.live&&!/final/i.test(g.detail)).map(g=>({g,t:Date.parse(g.start||'')})).filter(x=>Number.isFinite(x.t)&&x.t>now-60000).sort((a,b)=>a.t-b.t)[0]?.g||null;
}
function idleLabel(g){return g?`No games live · Next: ${g.away} @ ${g.home} · ${clockLabel(g.start)}`:'No games live · No upcoming games';}
function preferred(games){return activeGames(games)[0]||null;}
function livePage(){return document.querySelector('html[data-sport="mlb"] .mlb-live-page');}

function baseGame(id){
 const games=globalBinding('games');
 return Array.isArray(games)?games.find(g=>String(g?.gamePk??g?.id??'')===String(id)):null;
}
function removeInlineGamecast(){
 const host=document.getElementById(INLINE_ID);if(!host)return;
 host.remove();
 const mount=globalBinding('mountGamecasts');
 try{if(typeof mount==='function')mount();}catch{}
}
function renderInlineGamecast(id,{scroll=false}={}){
 id=String(id||'');
 const page=livePage(),selector=document.getElementById(HOST_ID),g=baseGame(id);
 if(!page||!selector||!g)return false;
 const detail=globalBinding('liveDetailHTML');
 const mount=globalBinding('mountGamecasts');
 const wire=globalBinding('wireGamecastTabs');
 if(typeof detail!=='function'||typeof mount!=='function'||typeof wire!=='function')return false;
 let host=document.getElementById(INLINE_ID);
 if(!host){host=document.createElement('section');host.id=INLINE_ID;host.className='tso-mlb-inline-gamecast';}
 if(host.parentElement!==page||host.previousElementSibling!==selector)selector.insertAdjacentElement('afterend',host);
 const ls=g.liveScore||{};
 const inningFn=globalBinding('mlbInningLabel');
 let inning='LIVE';try{if(typeof inningFn==='function')inning=inningFn(g)||inning;}catch{}
 const outs=ls.outs??0;
 host.dataset.gamePk=id;
 host.dataset.gcGid=String(g.id??g.gamePk??id);
 host.innerHTML=`<div class="mlb-live-gc-shell tso-mlb-live-gc-inline-shell"><div class="mlb-live-gc-top"><div><b>${esc(g.awayName||g.away?.name||'Away')} @ ${esc(g.homeName||g.home?.name||'Home')}</b><span>${esc(inning)} · ${ls.balls??0}-${ls.strikes??0} · ${outs} out${outs===1?'':'s'}</span></div><span>LIVE GAMECAST</span></div>${detail(g)}</div>`;
 requestAnimationFrame(()=>{try{mount();}catch{}try{wire(host);}catch{}if(scroll)host.scrollIntoView?.({block:'start',behavior:'smooth'});});
 return true;
}
function activateLivePage(id,scroll=true){
 currentGameId=String(id||'');
 const run=()=>{
  if(renderInlineGamecast(currentGameId,{scroll}))return true;
  return false;
 };
 if(run())return;
 try{window.eval(`activeTab='live'; renderTabs(); renderList();`);}catch{
  document.querySelector('[data-tab="live"],#tab-live')?.click();
 }
 let tries=0;
 const retry=()=>{if(run())return;if(++tries<20)setTimeout(retry,25);};
 setTimeout(retry,0);
}
function switchGame(id){
 id=String(id||'');if(!id)return;
 activateLivePage(id,true);
 setTimeout(queue,0);
}
function paint(host,games){
 const active=activeGames(games);
 host.classList.toggle('is-idle',active.length===0);
 if(active.length){
  if(!active.some(g=>g.id===currentGameId))currentGameId=active[0].id;
  host.innerHTML=`<label><span>Game</span><select>${active.map(g=>`<option value="${esc(g.id)}" ${g.id===currentGameId?'selected':''}>${esc(g.label)}</option>`).join('')}</select></label><span class="tso-mlb-live-switcher-state">● ${active.length} LIVE</span>`;
  host.querySelector('select')?.addEventListener('change',e=>switchGame(e.target.value));
 }else{
  currentGameId='';
  removeInlineGamecast();
  const next=nextGame(games);
  host.innerHTML=`<label><span>Game</span><select disabled><option>${esc(idleLabel(next))}</option></select></label><span class="tso-mlb-live-switcher-state">Waiting for first pitch</span>`;
 }
}

async function render(){
 raf=0;ensureStyles();
 if(document.documentElement.getAttribute('data-sport')!=='mlb'){
  document.getElementById(HOST_ID)?.remove();document.getElementById(INLINE_ID)?.remove();document.getElementById(MODAL_HOST_ID)?.remove();return;
 }
 await loadSlate();
 const games=gamesForSelector(),active=activeGames(games),page=livePage();
 document.getElementById(MODAL_HOST_ID)?.remove();
 if(page&&games.length){
  let host=document.getElementById(HOST_ID);
  if(!host){host=document.createElement('div');host.id=HOST_ID;host.className='tso-mlb-live-switcher';}
  if(page.firstElementChild!==host)page.insertBefore(host,page.firstChild);
  paint(host,games);
  if(active.length&&currentGameId&&!document.getElementById(INLINE_ID))renderInlineGamecast(currentGameId);
 }else{
  document.getElementById(HOST_ID)?.remove();
  document.getElementById(INLINE_ID)?.remove();
 }
}
function queue(){if(raf)return;raf=requestAnimationFrame(()=>{render();});}
function radarGameId(btn){
 const raw=String(btn?.getAttribute('onclick')||'');
 return raw.match(/openRadarGamecastModal\(['\"]([^'\"]+)['\"]\)/)?.[1]||'';
}

export function installMlbLiveGameSwitcherV901(){
 ensureStyles();
 if(installed){queue();return;}
 installed=true;
 loadSlate().then(queue);
 // Normal Live/Radar/Slate interactions now stay in-page. The existing
 // notification Watch paths (.notify-watch-btn and service-worker watch-game)
 // are intentionally NOT intercepted, so they remain the only modal launchers.
 document.addEventListener('click',e=>{
  if(e.target?.closest?.('.notify-watch-btn'))return;
  const live=e.target?.closest?.('[data-live-game-pk]');
  const slateBtn=e.target?.closest?.('[data-open-live-gamecast]');
  const radar=e.target?.closest?.('.so-radar-tip-expand');
  const id=String(live?.dataset?.liveGamePk||slateBtn?.dataset?.openLiveGamecast||radarGameId(radar)||'');
  if(!id)return;
  e.preventDefault();
  e.stopPropagation();
  activateLivePage(id,true);
 },true);
 observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
 window.addEventListener('hashchange',queue);queue();
}
export const __MLB_LIVE_SWITCHER_V901_TEST__={switchGame,gamesForSelector,preferred,liveIds,activeGames,nextGame,idleLabel,renderInlineGamecast,radarGameId};
