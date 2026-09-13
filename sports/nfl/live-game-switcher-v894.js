const STYLE_ID='tso-nfl-live-game-switcher-v894';
const HOST_ID='tsoNflLiveGameSwitcher';
let installed=false,observer=null,raf=0;
const cache=new Map();

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function ensureStyles(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');style.id=STYLE_ID;
 style.textContent=`
 #nflView .tso-live-switcher{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px;padding:10px 12px;border:1px solid rgba(45,127,255,.22);border-radius:10px;background:rgba(4,17,37,.76);box-sizing:border-box}
 #nflView .tso-live-switcher label{display:flex;align-items:center;gap:9px;min-width:0;color:#809bbd;font:900 8px 'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.03em}
 #nflView .tso-live-switcher select{min-height:36px;min-width:280px;max-width:min(520px,70vw);padding:0 34px 0 10px;border:1px solid rgba(66,126,197,.34);border-radius:8px;background:#071a34;color:#edf6ff;font:800 10px 'JetBrains Mono',monospace;cursor:pointer}
 #nflView .tso-live-switcher .tso-live-switcher-state{color:#54e58b;font:900 8px 'JetBrains Mono',monospace;text-transform:uppercase;white-space:nowrap}
 #nflView .tso-live-switcher.is-empty .tso-live-switcher-state{color:#7895ba}
 @media(max-width:680px){#nflView .tso-live-switcher{align-items:stretch;flex-direction:column;padding:9px}#nflView .tso-live-switcher label{display:block;width:100%}#nflView .tso-live-switcher label>span{display:block;margin-bottom:6px}#nflView .tso-live-switcher select{width:100%;max-width:none;min-width:0}#nflView .tso-live-switcher .tso-live-switcher-state{padding-left:1px}}
 `;
 document.head.appendChild(style);
}

function gameLabel(btn){
 const id=String(btn?.dataset?.nflOpenGame||'');
 const teams=[...btn.querySelectorAll('.nfl-live-team b')].map(x=>String(x.textContent||'').trim()).filter(Boolean);
 const clock=String(btn.querySelector('.nfl-live-clock')?.textContent||'LIVE').trim();
 const away=teams[0]||'Away',home=teams[1]||'Home';
 return {id,label:`${away} @ ${home} · ${clock||'LIVE'}`};
}
function collect(){
 const root=document.getElementById('nflView');if(!root||root.hidden)return [];
 const buttons=[...root.querySelectorAll('.nfl-live-chip[data-nfl-open-game]')];
 if(buttons.length){
  cache.clear();
  for(const btn of buttons){const item=gameLabel(btn);if(item.id)cache.set(item.id,item);}
 }
 const current=root.querySelector('[data-nfl-inline-gamecast]')?.getAttribute('data-nfl-inline-gamecast');
 if(current&&!cache.has(String(current))){
  const away=String(root.querySelector('.nxg-teamblock:not(.home) .nxg-teamcopy b')?.textContent||'Away').trim();
  const home=String(root.querySelector('.nxg-teamblock.home .nxg-teamcopy b')?.textContent||'Home').trim();
  const detail=[root.querySelector('.nxg-period')?.textContent,root.querySelector('.nxg-clock')?.textContent].map(x=>String(x||'').trim()).filter(Boolean).join(' ');
  cache.set(String(current),{id:String(current),label:`${away} @ ${home} · ${detail||'LIVE'}`});
 }
 return [...cache.values()];
}
function currentGame(){return String(document.querySelector('#nflView [data-nfl-inline-gamecast]')?.getAttribute('data-nfl-inline-gamecast')||'');}
function liveAnchor(){
 const root=document.getElementById('nflView');if(!root||root.hidden)return null;
 const gamecast=root.querySelector('[data-nfl-inline-gamecast]');if(gamecast)return gamecast;
 const chip=root.querySelector('.nfl-live-chip[data-nfl-open-game]');if(chip)return chip.closest('.nfl-live-board,.nfl-live-list,.nfl-live-rail')||chip.parentElement;
 return null;
}
function openGame(id){
 id=String(id||'');if(!id||id===currentGame())return;
 const root=document.getElementById('nflView');if(!root)return;
 const direct=root.querySelector(`[data-nfl-open-game="${CSS.escape(id)}"][data-nfl-origin="live"]`);
 if(direct){direct.click();return;}
 root.querySelector('[data-nfl-close-game]')?.click();
 let tries=0;
 const reopen=()=>{
  const btn=document.querySelector(`#nflView [data-nfl-open-game="${CSS.escape(id)}"][data-nfl-origin="live"]`);
  if(btn){btn.click();return;}
  if(++tries<12)setTimeout(reopen,25);
 };
 setTimeout(reopen,0);
}
function render(){
 raf=0;ensureStyles();
 const anchor=liveAnchor(),root=document.getElementById('nflView');
 if(!root||root.hidden){document.getElementById(HOST_ID)?.remove();return;}
 const games=collect();
 if(!anchor&&!games.length){document.getElementById(HOST_ID)?.remove();return;}
 let host=document.getElementById(HOST_ID);
 if(!host){host=document.createElement('div');host.id=HOST_ID;host.className='tso-live-switcher';}
 if(anchor&&host.nextElementSibling!==anchor)anchor.parentElement?.insertBefore(host,anchor);
 const current=currentGame()||String(root.querySelector('.nfl-live-chip[data-nfl-open-game]')?.dataset?.nflOpenGame||games[0]?.id||'');
 host.classList.toggle('is-empty',!games.length);
 host.innerHTML=`<label><span>Live Game</span><select id="tsoNflLiveGameSelect" ${games.length?'':'disabled'}>${games.length?games.map(g=>`<option value="${esc(g.id)}" ${String(g.id)===current?'selected':''}>${esc(g.label)}</option>`).join(''):'<option>No live games available</option>'}</select></label><span class="tso-live-switcher-state">${games.length===1?'1 live game':games.length?`${games.length} live games`:'Waiting for live games'}</span>`;
 host.querySelector('select')?.addEventListener('change',e=>openGame(e.target.value));
}
function queue(){if(raf)return;raf=requestAnimationFrame(render);}

export function installNflLiveGameSwitcherV894(){
 ensureStyles();
 if(installed){queue();return;}
 installed=true;
 document.addEventListener('click',e=>{const b=e.target?.closest?.('.nfl-live-chip[data-nfl-open-game]');if(b){const item=gameLabel(b);if(item.id)cache.set(item.id,item);}},true);
 observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true,characterData:true});
 window.addEventListener('hashchange',queue);queue();
}
export const __NFL_LIVE_SWITCHER_V894_TEST__={gameLabel,openGame,collect};
