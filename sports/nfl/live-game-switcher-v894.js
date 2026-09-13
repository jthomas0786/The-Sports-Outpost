const STYLE_ID='tso-nfl-live-game-switcher-v8932';
const HOST_ID='tsoNflLiveGameSwitcher';
let installed=false,observer=null,raf=0,slatePromise=null,autoOpening=false;
let slateGames=[];
const liveOverrides=new Map();
const authoritativeStatus=new Map();

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const normStatus=v=>{
 const s=String(v||'').trim().toLowerCase().replace(/[\s_-]+/g,'');
 if(['post','final','closed','complete','completed','gameover'].includes(s))return 'post';
 if(['in','live','inprogress','inprogressgame','halftime'].includes(s))return 'in';
 if(['pre','scheduled','created','preview'].includes(s))return 'pre';
 return s;
};

function ensureStyles(){
 if(document.getElementById(STYLE_ID))return;
 document.getElementById('tso-nfl-live-game-switcher-v894')?.remove();
 document.getElementById('tso-nfl-live-game-switcher-v895')?.remove();
 document.getElementById('tso-nfl-live-game-switcher-v896')?.remove();
 document.getElementById('tso-nfl-live-game-switcher-v899')?.remove();
 const style=document.createElement('style');style.id=STYLE_ID;
 style.textContent=`
 #nflView .tso-live-switcher{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px;padding:10px 12px;border:1px solid rgba(45,127,255,.22);border-radius:10px;background:rgba(4,17,37,.76);box-sizing:border-box;position:relative;z-index:40}
 #nflView .tso-live-switcher label{display:flex;align-items:center;gap:9px;min-width:0;flex:1;color:#809bbd;font:900 8px 'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.03em}
 #nflView .tso-live-switcher select{min-height:36px;min-width:280px;width:min(560px,72vw);max-width:100%;padding:0 34px 0 10px;border:1px solid rgba(66,126,197,.34);border-radius:8px;background:#071a34;color:#edf6ff;font:800 10px 'JetBrains Mono',monospace;cursor:pointer;pointer-events:auto;position:relative;z-index:41}
 #nflView .tso-live-switcher select:disabled{cursor:default;color:#9eb0c8;opacity:1}
 #nflView .tso-live-switcher .tso-live-switcher-state{color:#54e58b;font:900 8px 'JetBrains Mono',monospace;text-transform:uppercase;white-space:nowrap}
 #nflView .tso-live-switcher.is-idle .tso-live-switcher-state{color:#7895ba}
 @media(max-width:680px){#nflView .tso-live-switcher{align-items:stretch;flex-direction:column;padding:9px}#nflView .tso-live-switcher label{display:block;width:100%}#nflView .tso-live-switcher label>span{display:block;margin-bottom:6px}#nflView .tso-live-switcher select{width:100%;max-width:none;min-width:0}#nflView .tso-live-switcher .tso-live-switcher-state{padding-left:1px}}
 `;
 document.head.appendChild(style);
}

function kickoffLabel(g){
 const status=normStatus(g?.status);
 if(status==='in')return g.statusDetail||g.detail||g.time||'LIVE';
 if(status==='post')return 'Final';
 if(g?.time)return String(g.time);
 const raw=g?.startTimeUTC||g?.date||g?.start;
 if(!raw)return 'Scheduled';
 const d=new Date(raw);if(!Number.isFinite(d.getTime()))return 'Scheduled';
 return d.toLocaleString([],{weekday:'short',hour:'numeric',minute:'2-digit'});
}
function itemFromSlate(g){
 const id=String(g?.id??g?.gameId??'');
 const away=g?.away||{},home=g?.home||{};
 const awayName=away.abbr||away.name||g?.awayAbbr||g?.awayName||'Away';
 const homeName=home.abbr||home.name||g?.homeAbbr||g?.homeName||'Home';
 const start=String(g?.startTimeUTC||g?.date||'');
 return {id,status:normStatus(g?.status),start,awayName:String(awayName),homeName:String(homeName),label:`${awayName} @ ${homeName} · ${kickoffLabel(g)}`};
}
function gameLabel(btn){
 const id=String(btn?.dataset?.nflOpenGame||'');
 const teams=[...btn.querySelectorAll('.nfl-live-team b')].map(x=>String(x.textContent||'').trim()).filter(Boolean);
 const clock=String(btn.querySelector('.nfl-live-clock')?.textContent||'LIVE').trim();
 const away=teams[0]||'Away',home=teams[1]||'Home';
 return {id,status:'in',start:'',awayName:away,homeName:home,label:`${away} @ ${home} · ${clock||'LIVE'}`};
}
function liveDetail(snap){
 const p=Number(snap?.liveScore?.period),c=Number(snap?.liveScore?.clockMin);
 if(/half/i.test(String(snap?.statusDetail||'')))return 'Halftime';
 if(Number.isFinite(p)&&Number.isFinite(c)){
  const m=Math.max(0,Math.floor(c)),sec=Math.max(0,Math.min(59,Math.round((c-m)*60)));
  return `Q${p} ${m}:${String(sec).padStart(2,'0')}`;
 }
 return String(snap?.statusDetail||'LIVE').trim()||'LIVE';
}
function ingestLiveSnapshot(snap){
 const id=String(snap?.gameId??snap?.id??'');if(!id)return;
 const status=normStatus(snap?.status||snap?.liveScore?.status);
 if(status)authoritativeStatus.set(id,status);
 const base=slateGames.find(g=>g.id===id);
 if(status!=='in'){
  liveOverrides.delete(id);
  queue();
  return;
 }
 const away=String(snap?.away?.abbr||snap?.awayAbbr||base?.awayName||'Away');
 const home=String(snap?.home?.abbr||snap?.homeAbbr||base?.homeName||'Home');
 liveOverrides.set(id,{id,status:'in',start:base?.start||'',awayName:away,homeName:home,label:`${away} @ ${home} · ${liveDetail(snap)}`});
 queue();
}
async function loadSlate(){
 if(slatePromise)return slatePromise;
 slatePromise=(async()=>{
  try{const r=await fetch(`./slates/nfl.json?ts=${Date.now()}`,{cache:'no-store'});if(!r.ok)return;const json=await r.json();slateGames=(json?.games||[]).map(itemFromSlate).filter(g=>g.id);}catch{}
  queue();
 })();
 return slatePromise;
}
function collect(){
 const root=document.getElementById('nflView');if(!root||root.hidden)return [];
 for(const btn of root.querySelectorAll('.nfl-live-chip[data-nfl-open-game]')){
  const item=gameLabel(btn);if(!item.id)continue;
  const known=authoritativeStatus.get(item.id);
  if(known!=='post'&&known!=='pre')liveOverrides.set(item.id,item);
 }
 const current=root.querySelector('[data-nfl-inline-gamecast]')?.getAttribute('data-nfl-inline-gamecast');
 if(current){
  const away=String(root.querySelector('.nxg-teamblock:not(.home) .nxg-teamcopy b')?.textContent||'Away').trim();
  const home=String(root.querySelector('.nxg-teamblock.home .nxg-teamcopy b')?.textContent||'Home').trim();
  const detail=[root.querySelector('.nxg-period')?.textContent,root.querySelector('.nxg-clock')?.textContent].map(x=>String(x||'').trim()).filter(Boolean).join(' ');
  const base=slateGames.find(g=>g.id===String(current));
  const known=authoritativeStatus.get(String(current))||normStatus(base?.status);
  if(known==='in'||(!known&&!base))liveOverrides.set(String(current),{id:String(current),status:'in',start:base?.start||'',awayName:away,homeName:home,label:`${away} @ ${home} · ${detail||'LIVE'}`});
 }
 const base=slateGames.length?slateGames:[...liveOverrides.values()];
 const seen=new Set(base.map(g=>g.id));
 const all=[...base,...[...liveOverrides.values()].filter(g=>!seen.has(g.id))];
 return all.map(g=>{
  const status=authoritativeStatus.get(g.id)||normStatus(g.status);
  if(status==='in')return {...g,...(liveOverrides.get(g.id)||{}),status:'in'};
  return {...g,status};
 });
}
function currentGame(){return String(document.querySelector('#nflView [data-nfl-inline-gamecast]')?.getAttribute('data-nfl-inline-gamecast')||'');}
function liveLanding(){const root=document.getElementById('nflView');if(!root||root.hidden)return false;return !!root.querySelector('.nfl-live-chip[data-nfl-open-game],.nfl-live-empty');}
function liveAnchor(){
 const root=document.getElementById('nflView');if(!root||root.hidden)return null;
 const gamecast=root.querySelector('[data-nfl-inline-gamecast]');if(gamecast)return gamecast;
 const chip=root.querySelector('.nfl-live-chip[data-nfl-open-game]');if(chip)return chip.closest('.nfl-live-board,.nfl-live-list,.nfl-live-rail')||chip.parentElement;
 const empty=root.querySelector('.nfl-live-empty');if(empty)return empty.parentElement||empty;
 return null;
}
function liveGames(games){return games.filter(g=>normStatus(g.status)==='in');}
function nextGame(games){const now=Date.now();return games.filter(g=>!['post','in'].includes(normStatus(g.status))).map(g=>({g,t:Date.parse(g.start||'')})).filter(x=>Number.isFinite(x.t)&&x.t>now-60000).sort((a,b)=>a.t-b.t)[0]?.g||null;}
function idleLabel(g){return g?`No games live · Next: ${g.awayName} @ ${g.homeName} · ${kickoffLabel(g)}`:'No games live · No upcoming games';}
function preferredGame(games){return liveGames(games)[0]||null;}
function openGame(id){
 id=String(id||'');if(!id||id===currentGame())return;
 const root=document.getElementById('nflView');if(!root)return;
 const direct=root.querySelector(`[data-nfl-open-game="${CSS.escape(id)}"][data-nfl-origin="live"]`);
 if(direct){direct.click();return;}
 window.DW_nflCommandCenterGame=id;
 if(typeof window.DW_nflPreviewSelectTab==='function')window.DW_nflPreviewSelectTab('live');
 else return;
 setTimeout(queue,0);
}

function wireSelect(host){
 const sel=host.querySelector('#tsoNflLiveGameSelect');if(!sel||sel.dataset.tsoWired==='1')return;
 sel.dataset.tsoWired='1';
 sel.addEventListener('change',e=>openGame(e.currentTarget.value));
}
function render(){
 raf=0;ensureStyles();
 const root=document.getElementById('nflView');
 if(!root||root.hidden){document.getElementById(HOST_ID)?.remove();return;}
 const games=collect(),anchor=liveAnchor();
 if(!anchor){document.getElementById(HOST_ID)?.remove();return;}
 const active=liveGames(games);
 if(liveLanding()&&!currentGame()&&active.length&&!autoOpening){autoOpening=true;openGame(active[0].id);setTimeout(()=>{autoOpening=false;},180);return;}
 let host=document.getElementById(HOST_ID);
 if(!host){host=document.createElement('div');host.id=HOST_ID;host.className='tso-live-switcher';}
 if(host.nextElementSibling!==anchor)anchor.parentElement?.insertBefore(host,anchor);
 host.classList.toggle('is-idle',active.length===0);
 if(active.length){
  const current=active.some(g=>g.id===currentGame())?currentGame():active[0].id;
  const sig=`live|${active.map(g=>g.id).join(',')}|${current}`;
  if(host.dataset.renderSig!==sig){
   host.innerHTML=`<label><span>Game</span><select id="tsoNflLiveGameSelect">${active.map(g=>`<option value="${esc(g.id)}" ${g.id===current?'selected':''}>${esc(g.awayName)} @ ${esc(g.homeName)}</option>`).join('')}</select></label><span class="tso-live-switcher-state">● ${active.length} LIVE</span>`;
   host.dataset.renderSig=sig;wireSelect(host);
  }else{
   const sel=host.querySelector('#tsoNflLiveGameSelect');if(sel&&document.activeElement!==sel&&sel.value!==current)sel.value=current;
   const state=host.querySelector('.tso-live-switcher-state');if(state)state.textContent=`● ${active.length} LIVE`;
  }
 }else{
  const next=nextGame(games),sig=`idle|${next?.id||''}`;
  if(host.dataset.renderSig!==sig){host.innerHTML=`<label><span>Game</span><select id="tsoNflLiveGameSelect" disabled><option>${esc(idleLabel(next))}</option></select></label><span class="tso-live-switcher-state">Waiting for kickoff</span>`;host.dataset.renderSig=sig;}
 }
}
function queue(){if(raf)return;raf=requestAnimationFrame(render);}

export function installNflLiveGameSwitcherV894(){
 ensureStyles();loadSlate();
 if(installed){queue();return;}
 installed=true;
 document.addEventListener('click',e=>{const b=e.target?.closest?.('.nfl-live-chip[data-nfl-open-game]');if(b){const item=gameLabel(b),known=authoritativeStatus.get(item.id);if(item.id&&known!=='post'&&known!=='pre')liveOverrides.set(item.id,item);}},true);
 window.addEventListener('tso:nfl-live-snapshot',e=>ingestLiveSnapshot(e.detail),true);
 if(window.__TSO_NFL_LIVE_LATEST__)ingestLiveSnapshot(window.__TSO_NFL_LIVE_LATEST__);
 observer=new MutationObserver(muts=>{if(muts.some(m=>m.type==='childList'))queue();});
 observer.observe(document.getElementById('nflView')||document.body,{childList:true,subtree:true});
 window.addEventListener('hashchange',queue);queue();
}
export const __NFL_LIVE_SWITCHER_V894_TEST__={gameLabel,itemFromSlate,openGame,collect,preferredGame,liveGames,nextGame,idleLabel,normStatus,ingestLiveSnapshot};
