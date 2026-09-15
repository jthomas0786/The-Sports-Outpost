const SUPABASE_URL='https://hjhfbhpuuxnrexddplxd.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqaGZiaHB1dXhucmV4ZGRwbHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0OTY5ODQsImV4cCI6MjEwMjA3Mjk4NH0.6URv-aSJgFupp1dkO65AsTqPpZF_aUckczhxJZBWVJ0';
const TABLE='nfl_watchlist';
const STYLE_ID='tso-nfl-watchlist-v910-style';
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let clientPromise=null,catalogPromise=null,rows=[],loaded=false,installed=false,observer=null,decorateQueued=false;

function client(){
  if(!clientPromise) clientPromise=import('https://esm.sh/@supabase/supabase-js@2').then(({createClient})=>createClient(SUPABASE_URL,SUPABASE_ANON_KEY));
  return clientPromise;
}
async function authUser(){
  try{const sb=await client();const {data}=await sb.auth.getSession();return data?.session?.user||null;}catch{return null;}
}
function ensureStyle(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
  .nfl-watch-star{display:inline-grid;place-items:center;width:28px;height:28px;min-width:28px;margin-left:7px;padding:0;border:1px solid rgba(148,163,184,.35);border-radius:50%;background:#07162d;color:#8da7c9;font:900 18px/1 system-ui;cursor:pointer;vertical-align:middle;transition:.15s ease;box-shadow:none}
  .nfl-watch-star:hover{border-color:#facc15;color:#facc15;transform:translateY(-1px)}
  .nfl-watch-star.is-watched{color:#facc15;border-color:rgba(250,204,21,.7);background:rgba(250,204,21,.08);text-shadow:0 0 10px rgba(250,204,21,.35)}
  .nfl-watch-star:focus-visible{outline:2px solid #2d7fff;outline-offset:2px}
  #ccFootballCol .cc-nfl-watch-row{display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:10px;align-items:center;width:100%;padding:10px 0;border:0;border-bottom:1px solid var(--line);background:transparent;color:inherit;text-align:left;cursor:pointer}
  #ccFootballCol .cc-nfl-watch-row:last-child{border-bottom:0}
  #ccFootballCol .cc-nfl-watch-avatar{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;overflow:hidden;background:var(--panel2);border:1px solid var(--line);font:800 9px monospace;color:#9ec8ff}
  #ccFootballCol .cc-nfl-watch-avatar img{width:100%;height:100%;object-fit:cover}
  #ccFootballCol .cc-nfl-watch-copy{min-width:0}#ccFootballCol .cc-nfl-watch-copy b{display:block}#ccFootballCol .cc-nfl-watch-copy small{display:block;color:var(--mute);margin-top:2px}
  #ccFootballCol .cc-nfl-watch-star{color:#facc15;font-size:18px}
  `;document.head.appendChild(s);
}

async function loadCatalog(){
  if(catalogPromise)return catalogPromise;
  catalogPromise=(async()=>{
    try{
      const r=await fetch('./slates/nfl.json?watch='+Date.now(),{cache:'no-store'});if(!r.ok)return {byId:new Map(),byName:new Map()};
      const doc=await r.json(),byId=new Map(),byName=new Map();
      for(const g of doc?.games||[])for(const p of g?.players||[]){
        const id=String(p?.espnId||p?.id||p?.playerId||'');if(!id||!p?.name)continue;
        const entry={id,name:p.name,team:p.team||'',position:p.position||p.pos||'',headshot:p.headshot||'',gameId:String(g.id||g.gameId||''),matchup:`${g.away?.abbr||''} @ ${g.home?.abbr||''}`.trim()};
        byId.set(id,entry);byName.set(norm(p.name),entry);
      }
      return {byId,byName};
    }catch{return {byId:new Map(),byName:new Map()};}
  })();
  return catalogPromise;
}

export async function getNflWatchlist({force=false}={}){
  if(loaded&&!force)return rows.slice();
  const user=await authUser();if(!user){rows=[];loaded=true;return [];}
  try{
    const sb=await client();const {data,error}=await sb.from(TABLE).select('player_id,player_name,team,created_at').eq('user_id',user.id).order('created_at',{ascending:true});
    if(error)throw error;rows=(data||[]).map(r=>({...r,player_id:String(r.player_id)}));loaded=true;return rows.slice();
  }catch(e){console.warn('[NFL watchlist] load failed:',e?.message||e);return rows.slice();}
}

export async function addNflWatchPlayer(player){
  const user=await authUser();if(!user)return {error:'not signed in'};
  const id=String(player?.id||player?.espnId||player?.player_id||'');if(!id)return {error:'missing player id'};
  const sb=await client();const {error}=await sb.from(TABLE).upsert({user_id:user.id,player_id:id,player_name:player.name||player.player_name||'Player',team:player.team||null},{onConflict:'user_id,player_id'});
  if(error)return {error:error.message};loaded=false;await refreshNflWatchlist();return {ok:true};
}
export async function removeNflWatchPlayer(playerId){
  const user=await authUser();if(!user)return {error:'not signed in'};
  const sb=await client();const {error}=await sb.from(TABLE).delete().eq('user_id',user.id).eq('player_id',String(playerId));
  if(error)return {error:error.message};loaded=false;await refreshNflWatchlist();return {ok:true};
}
export async function toggleNflWatchPlayer(player){
  const id=String(player?.id||player?.espnId||player?.player_id||'');if(!id)return {error:'missing player id'};
  const list=await getNflWatchlist();return list.some(r=>String(r.player_id)===id)?removeNflWatchPlayer(id):addNflWatchPlayer(player);
}
export async function refreshNflWatchlist(){
  const list=await getNflWatchlist({force:true});updateButtons();queueDecorate();
  try{window.dispatchEvent(new CustomEvent('tso:nfl-watchlist-changed',{detail:{players:list}}));}catch{}
  return list;
}

function findPlayerForName(text,catalog){return catalog.byName.get(norm(text))||null;}
function watched(id){return rows.some(r=>String(r.player_id)===String(id));}
function updateButton(btn){const on=watched(btn.dataset.nflWatchId);btn.classList.toggle('is-watched',on);btn.textContent=on?'★':'☆';btn.setAttribute('aria-label',`${on?'Remove from':'Add to'} NFL watchlist`);btn.title=`${on?'Remove from':'Add to'} NFL watchlist`;}
function updateButtons(){document.querySelectorAll('.nfl-watch-star[data-nfl-watch-id]').forEach(updateButton);}
function signInPrompt(){
  const btn=document.querySelector('[data-open-auth],#profileBtn,#userBtn,.profile-btn');if(btn){btn.click();return;}
  try{window.alert('Sign in to use your NFL Watchlist.');}catch{}
}
function makeButton(player){
  const b=document.createElement('button');b.type='button';b.className='nfl-watch-star';b.dataset.nflWatchId=String(player.id);b.dataset.nflWatchName=player.name;b.dataset.nflWatchTeam=player.team||'';updateButton(b);
  b.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();if(!await authUser()){signInPrompt();return;}b.disabled=true;try{const result=await toggleNflWatchPlayer(player);if(result?.error)console.warn('[NFL watchlist]',result.error);}finally{b.disabled=false;}});
  return b;
}
function eligibleNameNode(el){
  if(!el||el.closest('.nfl-watch-star')||el.children.length>2)return false;
  const txt=String(el.textContent||'').trim();if(!txt||txt.length>45)return false;
  const cls=String(el.closest('[class]')?.className||'');
  return /(player|person|threat|leader|feed|modal|card|slate|prop|scorer|name)/i.test(cls)||el.matches('h1,h2,h3,h4,strong,b');
}
function commandSection(){
  const host=document.getElementById('ccFootballCol');if(!host)return null;
  let section=host.querySelector('[data-nfl-watchlist-section]');
  if(!section){
    section=[...host.querySelectorAll('.cc-section')].find(s=>/^NFL Watchlist/i.test(String(s.querySelector('.cc-section-label')?.textContent||'')))||null;
    if(section)section.dataset.nflWatchlistSection='1';
  }
  if(!section){
    section=document.createElement('div');section.className='cc-section';section.dataset.nflWatchlistSection='1';
    const kpi=host.querySelector('.cc-kpi-row');if(kpi)kpi.insertAdjacentElement('afterend',section);else host.prepend(section);
  }
  return section;
}
function renderCommandCenter(catalog){
  const section=commandSection();if(!section)return;
  const body=rows.map(w=>{
    const p=catalog.byId.get(String(w.player_id))||catalog.byName.get(norm(w.player_name))||{};
    const name=p.name||w.player_name||'Player',team=p.team||w.team||'',pos=p.position||'',head=p.headshot||'',matchup=p.matchup||'';
    return `<button type="button" class="cc-nfl-watch-row" data-cc-nfl-watch-player="${esc(w.player_id)}" data-cc-nfl-watch-name="${esc(name)}"><span class="cc-nfl-watch-avatar">${head?`<img src="${esc(head)}" alt="">`:esc(team||'NFL')}</span><span class="cc-nfl-watch-copy"><b>${esc(name)}</b><small>${esc([team,pos,matchup].filter(Boolean).join(' · '))}</small></span><span class="cc-nfl-watch-star">★</span></button>`;
  }).join('');
  const html=`<div class="cc-section-label">NFL Watchlist <span>${rows.length||''}</span></div>${body||'<div class="cc-empty-note">Star a player anywhere in NFL to add them here. MLB watchlist players stay in MLB.</div>'}`;
  if(section.innerHTML!==html)section.innerHTML=html;
  if(!section.dataset.nflWatchBound){section.dataset.nflWatchBound='1';section.addEventListener('click',e=>{const b=e.target.closest('[data-cc-nfl-watch-player]');if(!b)return;window.DW_nflWatchlistTarget={id:b.dataset.ccNflWatchPlayer,name:b.dataset.ccNflWatchName};window.closeCommandCenter?.();window.DW_openNflPreviewTab?.('props');});}
}
async function decorateNow(){
  decorateQueued=false;ensureStyle();const catalog=await loadCatalog();if(!loaded)await getNflWatchlist();renderCommandCenter(catalog);
  const root=document.getElementById('nflView');if(!root||root.hidden)return;
  const nodes=root.querySelectorAll('h1,h2,h3,h4,strong,b,[class*="name"],[class*="player"]');
  for(const el of nodes){
    if(!eligibleNameNode(el))continue;const player=findPlayerForName(el.textContent,catalog);if(!player)continue;
    const host=el.closest('.ms-player-card,.ms-slate-person,.tso-nfl-player-card-v72,[class*="player-card"],[class*="player-row"],[class*="threat"],[class*="leader"],[class*="feed"],[class*="prop"]')||el.parentElement;
    if(!host||host.querySelector(`.nfl-watch-star[data-nfl-watch-id="${CSS.escape(String(player.id))}"]`))continue;
    el.insertAdjacentElement('afterend',makeButton(player));
  }
  updateButtons();
}
function queueDecorate(){if(decorateQueued)return;decorateQueued=true;requestAnimationFrame(()=>decorateNow().catch(()=>{}));}

export function installNflWatchlistV910(){
  if(installed){queueDecorate();return;}installed=true;ensureStyle();
  getNflWatchlist({force:true}).finally(queueDecorate);
  observer=new MutationObserver(queueDecorate);observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('hashchange',queueDecorate);window.addEventListener('dw-auth-changed',()=>{loaded=false;refreshNflWatchlist().finally(queueDecorate);});
  window.addEventListener('tso:nfl-live-snapshot',queueDecorate);
  window.DW_NFL_WATCHLIST={get:getNflWatchlist,refresh:refreshNflWatchlist,toggle:toggleNflWatchPlayer,add:addNflWatchPlayer,remove:removeNflWatchPlayer};
  queueDecorate();
}
