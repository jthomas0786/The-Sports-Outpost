const ROOT_ID='ppSlipShell';
let observer=null;
let armTimer=null;

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v??'').toLowerCase().replace(/[.’']/g,'').replace(/\s+(jr|sr|ii|iii|iv|v)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();

function readSlip(){
  try{const rows=JSON.parse(localStorage.getItem('dw_betslip')||'[]');return Array.isArray(rows)?rows:[];}catch{return[];}
}

function playerOf(row){return String(row?.player??row?.player_name??row?.name??'').trim();}
function sportOf(row){return String(row?.sport||window.DW_SPORT||'nfl').toLowerCase().replace(/[^a-z0-9]/g,'');}

function directPhoto(row){
  for(const key of ['headshotUrl','headshot_url','headshot','photoUrl','photo_url','photo','imageUrl','image_url','image','avatar']){
    const value=row?.[key];
    if(typeof value==='string'&&/^https?:\/\//i.test(value))return value;
  }
  return'';
}

function espnPhoto(row){
  const id=row?.player_id??row?.playerId??row?.espnId;
  if(!id)return'';
  const sport=sportOf(row),league={nfl:'nfl',nba:'nba',wnba:'wnba',nhl:'nhl',mlb:'mlb',ncaaf:'college-football',ncaab:'mens-college-basketball'}[sport]||sport;
  return `https://a.espncdn.com/i/headshots/${league}/players/full/${encodeURIComponent(id)}.png`;
}

function initialsAvatar(name){
  const initials=String(name||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'?';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#0d3850"/><stop offset="1" stop-color="#075f5c"/></linearGradient></defs><rect width="96" height="96" rx="48" fill="url(#g)"/><circle cx="48" cy="35" r="19" fill="#8bb7c8" opacity=".42"/><path d="M18 88c4-21 16-32 30-32s26 11 30 32" fill="#8bb7c8" opacity=".42"/><text x="48" y="54" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" font-weight="700" fill="#eaffff">${esc(initials)}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const ICONS={
  copy:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 13.4a2 2 0 0 0 2.8 0l4-4a2 2 0 1 0-2.8-2.8l-1.1 1.1"/><path d="M13.4 10.6a2 2 0 0 0-2.8 0l-4 4a2 2 0 1 0 2.8 2.8l1.1-1.1"/></svg>`,
  x:`<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" stroke="none"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.967 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/></svg>`,
  messages:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.2a7.8 7.8 0 0 1-8.1 7.5c-1.3 0-2.5-.3-3.6-.8L4 20l1.5-4A7.1 7.1 0 0 1 4 11.7C4 7.5 7.6 4 12 4s8 3.2 8 7.2Z"/><path d="M8 10.8h.01M12 10.8h.01M16 10.8h.01"/></svg>`,
  sms:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8.5 8.5 0 0 1-9 8 10 10 0 0 1-3.5-.6L3 21l1.8-4.3A7.5 7.5 0 0 1 3 12c0-4.4 4-8 9-8s9 3.6 9 8Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg>`,
  more:`<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" stroke="none"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`,
};

function simplifyConnector(root){
  root.querySelector('#ppLineCheck')?.remove();
  const tools=root.querySelector('.pps-tools');
  if(tools){tools.style.gridTemplateColumns='1fr';tools.style.justifyItems='end';}
}

function polishShare(root){
  root.querySelectorAll('.pps-share[data-share]').forEach(btn=>{
    const kind=btn.dataset.share||'';
    const holder=btn.querySelector('i');
    if(!holder||holder.dataset.ppIcon===kind)return;
    const svg=ICONS[kind];if(!svg)return;
    holder.innerHTML=svg;holder.dataset.ppIcon=kind;
    holder.style.display='grid';holder.style.placeItems='center';
    const el=holder.querySelector('svg');if(el){el.style.width='24px';el.style.height='24px';el.style.stroke='currentColor';el.style.strokeWidth='1.8';el.style.strokeLinecap='round';el.style.strokeLinejoin='round';}
  });
}

function matchLegForRow(row,legs){
  const label=norm(row.querySelector('.pps-leg-name')?.textContent||'');
  if(!label)return null;
  return legs.find(leg=>{const name=norm(playerOf(leg));return name&&label.startsWith(name);})||null;
}

function polishHeadshots(root){
  const legs=readSlip();
  root.querySelectorAll('.pps-leg').forEach(row=>{
    const img=row.querySelector('.pps-headshot');if(!img)return;
    const leg=matchLegForRow(row,legs);if(!leg)return;
    const photo=directPhoto(leg)||espnPhoto(leg);
    img.style.visibility='visible';
    img.onerror=()=>{img.onerror=null;img.style.visibility='visible';img.src=initialsAvatar(playerOf(leg));};
    if(photo&&img.src!==photo)img.src=photo;
    else if(!photo&&!img.getAttribute('src'))img.src=initialsAvatar(playerOf(leg));
  });
}

function polish(){const root=document.getElementById(ROOT_ID);if(!root)return;simplifyConnector(root);polishShare(root);polishHeadshots(root);}
function arm(){
  clearTimeout(armTimer);
  const root=document.getElementById(ROOT_ID);
  if(!root){armTimer=setTimeout(arm,60);return;}
  polish();
  if(observer)return;
  observer=new MutationObserver(()=>polish());
  observer.observe(root,{childList:true,subtree:true});
}

export function installParlayPingBetslipPolish(){
  if(typeof document==='undefined')return;
  document.addEventListener('click',e=>{if(e.target?.closest?.('#bsText'))setTimeout(arm,0);},true);
  if(document.getElementById(ROOT_ID))arm();
}
