const STYLE_ID='tso-mlb-live-game-switcher-v901';
const HOST_ID='tsoMlbLiveGameSwitcher';
const MODAL_HOST_ID='tsoMlbModalLiveGameSwitcher';
let installed=false,observer=null,raf=0,currentGameId='';
const liveGames=new Map();

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function ensureStyles(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');style.id=STYLE_ID;
 style.textContent=`
 html[data-sport="mlb"] .tso-mlb-live-switcher{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px;padding:10px 12px;border:1px solid rgba(45,127,255,.22);border-radius:10px;background:rgba(4,17,37,.76);box-sizing:border-box;color:#edf6ff}
 html[data-sport="mlb"] .tso-mlb-live-switcher label{display:flex;align-items:center;gap:9px;min-width:0;color:#809bbd;font:900 8px 'Space Mono','JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.03em}
 html[data-sport="mlb"] .tso-mlb-live-switcher select{min-height:36px;min-width:280px;max-width:min(520px,70vw);padding:0 34px 0 10px;border:1px solid rgba(66,126,197,.34);border-radius:8px;background:#071a34;color:#edf6ff;font:800 10px 'Space Mono','JetBrains Mono',monospace;cursor:pointer}
 html[data-sport="mlb"] .tso-mlb-live-switcher-state{color:#54e58b;font:900 8px 'Space Mono','JetBrains Mono',monospace;text-transform:uppercase;white-space:nowrap}
 html[data-sport="mlb"] #${MODAL_HOST_ID}{margin:0 0 14px}
 @media(max-width:680px){html[data-sport="mlb"] .tso-mlb-live-switcher{align-items:stretch;flex-direction:column;padding:9px}html[data-sport="mlb"] .tso-mlb-live-switcher label{display:block;width:100%}html[data-sport="mlb"] .tso-mlb-live-switcher label>span{display:block;margin-bottom:6px}html[data-sport="mlb"] .tso-mlb-live-switcher select{width:100%;max-width:none;min-width:0}html[data-sport="mlb"] .tso-mlb-live-switcher-state{padding-left:1px}}
 `;
 document.head.appendChild(style);
}
function itemFromCard(card){
 const id=String(card?.dataset?.gid||'');
 const rows=[...card.querySelectorAll('.slate-team-row')];
 const away=String(rows[0]?.querySelector('.slate-team-name')?.textContent||'Away').trim();
 const home=String(rows[1]?.querySelector('.slate-team-name')?.textContent||'Home').trim();
 const detail=String(card.querySelector('.slate-time')?.textContent||'LIVE').trim();
 return {id,label:`${away} @ ${home} · ${detail||'LIVE'}`};
}
function collect(){
 for(const card of document.querySelectorAll('html[data-sport="mlb"] .slate-card.is-live[data-gid]')){
  const item=itemFromCard(card);if(item.id)liveGames.set(item.id,item);
 }
 return [...liveGames.values()];
}
function liveList(){return document.querySelector('html[data-sport="mlb"] .slate-list');}
function modalIsOpen(){return document.querySelector('#modalOverlay.open #modalBody');}
function switchGame(id){
 id=String(id||'');if(!id||id===currentGameId)return;
 const card=document.querySelector(`html[data-sport="mlb"] .slate-card.is-live[data-gid="${CSS.escape(id)}"]`);
 if(!card)return;
 const modal=modalIsOpen();
 if(modal){document.querySelector('#modalBody #modalClose')?.click();setTimeout(()=>card.click(),0);}
 else{card.scrollIntoView?.({block:'start',behavior:'smooth'});card.click();}
 currentGameId=id;
}
function markup(games,selected){
 return `<label><span>Live Game</span><select ${games.length?'':'disabled'}>${games.length?games.map(g=>`<option value="${esc(g.id)}" ${String(g.id)===String(selected)?'selected':''}>${esc(g.label)}</option>`).join(''):'<option>No live games available</option>'}</select></label><span class="tso-mlb-live-switcher-state">${games.length===1?'1 live game':games.length?`${games.length} live games`:'Waiting for live games'}</span>`;
}
function wire(host){host.querySelector('select')?.addEventListener('change',e=>switchGame(e.target.value));}
function render(){
 raf=0;ensureStyles();
 if(document.documentElement.getAttribute('data-sport')!=='mlb'){document.getElementById(HOST_ID)?.remove();document.getElementById(MODAL_HOST_ID)?.remove();return;}
 const games=collect(),list=liveList();
 if(list&&games.length){
  let host=document.getElementById(HOST_ID);if(!host){host=document.createElement('div');host.id=HOST_ID;host.className='tso-mlb-live-switcher';}
  if(host.nextElementSibling!==list)list.parentElement?.insertBefore(host,list);
  const selected=currentGameId||games[0]?.id||'';host.innerHTML=markup(games,selected);wire(host);
 }
 const modal=modalIsOpen();
 if(modal&&games.length&&currentGameId){
  let host=document.getElementById(MODAL_HOST_ID);if(!host){host=document.createElement('div');host.id=MODAL_HOST_ID;host.className='tso-mlb-live-switcher';}
  const head=modal.querySelector('.modal-head');if(head&&host.nextElementSibling!==head)modal.insertBefore(host,head);
  host.innerHTML=markup(games,currentGameId);wire(host);
 }else document.getElementById(MODAL_HOST_ID)?.remove();
}
function queue(){if(raf)return;raf=requestAnimationFrame(render);}
export function installMlbLiveGameSwitcherV901(){
 ensureStyles();
 if(installed){queue();return;}
 installed=true;
 document.addEventListener('click',e=>{const card=e.target?.closest?.('html[data-sport="mlb"] .slate-card.is-live[data-gid]');if(card){const item=itemFromCard(card);if(item.id){currentGameId=item.id;liveGames.set(item.id,item);setTimeout(queue,0);}}},true);
 observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
 window.addEventListener('hashchange',queue);queue();
}
export const __MLB_LIVE_SWITCHER_V901_TEST__={itemFromCard,switchGame};
