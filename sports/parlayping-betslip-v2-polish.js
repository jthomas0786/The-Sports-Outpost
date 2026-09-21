const ROOT_ID='ppSlipShell';
const STYLE_ID='ppSlipConnectorPolish';
let observer=null;
let bootObserver=null;

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v??'').toLowerCase().replace(/[.’']/g,'').replace(/\s+(jr|sr|ii|iii|iv|v)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
function readSlip(){try{const rows=JSON.parse(localStorage.getItem('dw_betslip')||'[]');return Array.isArray(rows)?rows:[];}catch{return[];}}
function playerOf(row){return String(row?.player??row?.player_name??row?.name??'').trim();}
function sportOf(row){return String(row?.sport||window.DW_SPORT||'nfl').toLowerCase().replace(/[^a-z0-9]/g,'');}
function directPhoto(row){for(const key of ['headshotUrl','headshot_url','headshot','photoUrl','photo_url','photo','imageUrl','image_url','image','avatar']){const value=row?.[key];if(typeof value==='string'&&/^https?:\/\//i.test(value))return value;}return'';}
function espnPhoto(row){const id=row?.player_id??row?.playerId??row?.espnId;if(!id)return'';const sport=sportOf(row),league={nfl:'nfl',nba:'nba',wnba:'wnba',nhl:'nhl',mlb:'mlb',ncaaf:'college-football',ncaab:'mens-college-basketball'}[sport]||sport;return `https://a.espncdn.com/i/headshots/${league}/players/full/${encodeURIComponent(id)}.png`;}
function initialsAvatar(name){const initials=String(name||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'?';const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#0d3850"/><stop offset="1" stop-color="#075f5c"/></linearGradient></defs><rect width="96" height="96" rx="48" fill="url(#g)"/><circle cx="48" cy="35" r="19" fill="#8bb7c8" opacity=".42"/><path d="M18 88c4-21 16-32 30-32s26 11 30 32" fill="#8bb7c8" opacity=".42"/><text x="48" y="56" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" font-weight="700" fill="#eaffff">${esc(initials)}</text></svg>`;return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;}

const ICONS={
  copy:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 13.4a2 2 0 0 0 2.8 0l4-4a2 2 0 1 0-2.8-2.8l-1.1 1.1"/><path d="M13.4 10.6a2 2 0 0 0-2.8 0l-4 4a2 2 0 1 0 2.8 2.8l1.1-1.1"/></svg>`,
  x:`<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" stroke="none"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.967 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/></svg>`,
  messages:`<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" stroke="none"><path d="M12 3C6.48 3 2 6.73 2 11.33c0 2.55 1.39 4.83 3.58 6.36L4.55 21l3.62-1.73c1.19.35 2.48.54 3.83.54 5.52 0 10-3.73 10-8.48S17.52 3 12 3Zm-4 9.1a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Zm4 0a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Zm4 0a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Z"/></svg>`,
  sms:`<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" stroke="none"><path d="M5 3h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7l-5.5 4v-4H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 6h8v2H8V9Zm0 4h5v2H8v-2Z"/></svg>`,
  more:`<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" stroke="none"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`,
};
function ensureConnectorStyle(){if(document.getElementById(STYLE_ID))return;const style=document.createElement('style');style.id=STYLE_ID;style.textContent='#ppLineCheck{display:none!important}.pps-tools{justify-content:flex-end!important}.pps-tools .pps-tool{flex:0 0 174px}@media(max-width:760px){.pps-tools{justify-content:stretch!important}.pps-tools .pps-tool{flex:1 1 auto}}';document.head.appendChild(style);}
function simplifyConnector(root){root.querySelector('#ppLineCheck')?.remove();const tools=root.querySelector('.pps-tools');if(tools)tools.style.justifyContent='flex-end';}
function renameParlayTune(root){const btn=root.querySelector('#ppTune'),label=btn?.querySelector('strong');if(label&&label.textContent!=='Parlay Tune')label.textContent='Parlay Tune';if(btn)btn.setAttribute('aria-label','Parlay Tune');}
function polishShare(root){root.querySelectorAll('.pps-share[data-share]').forEach(btn=>{const kind=btn.dataset.share||'',holder=btn.querySelector('i');if(!holder||holder.dataset.ppIcon===kind)return;const svg=ICONS[kind];if(!svg)return;holder.innerHTML=svg;holder.dataset.ppIcon=kind;holder.style.display='grid';holder.style.placeItems='center';const el=holder.querySelector('svg');if(el){el.style.width='24px';el.style.height='24px';el.style.stroke=kind==='copy'?'currentColor':'none';el.style.strokeWidth='1.8';el.style.strokeLinecap='round';el.style.strokeLinejoin='round';}});}
function matchLegForRow(row,legs){const label=norm(row.querySelector('.pps-leg-name')?.textContent||'');if(!label)return null;return legs.find(leg=>{const name=norm(playerOf(leg));return name&&label.startsWith(name);})||null;}
function polishHeadshots(root){const legs=readSlip();root.querySelectorAll('.pps-leg').forEach(row=>{const img=row.querySelector('.pps-headshot');if(!img)return;const leg=matchLegForRow(row,legs);if(!leg)return;const fallback=initialsAvatar(playerOf(leg)),photo=directPhoto(leg)||espnPhoto(leg);img.style.visibility='visible';if(img.dataset.ppLeg!==String(leg.id||playerOf(leg))){img.dataset.ppLeg=String(leg.id||playerOf(leg));img.src=fallback;}if(photo&&img.dataset.ppPhoto!==photo){img.dataset.ppPhoto=photo;const probe=new Image();probe.onload=()=>{if(img.isConnected)img.src=photo;};probe.onerror=()=>{if(img.isConnected)img.src=fallback;};probe.src=photo;}else if(!photo)img.src=fallback;});}
function polish(){const root=document.getElementById(ROOT_ID);if(!root)return;ensureConnectorStyle();simplifyConnector(root);renameParlayTune(root);polishShare(root);polishHeadshots(root);}
function arm(){const root=document.getElementById(ROOT_ID);if(!root)return;polish();if(observer)return;observer=new MutationObserver(()=>polish());observer.observe(root,{childList:true,subtree:true});}
export function installParlayPingBetslipPolish(){
  if(typeof document==='undefined')return;
  ensureConnectorStyle();
  if(document.getElementById(ROOT_ID)){arm();return;}
  if(bootObserver)return;
  bootObserver=new MutationObserver(()=>{if(!document.getElementById(ROOT_ID))return;bootObserver?.disconnect();bootObserver=null;arm();});
  bootObserver.observe(document.documentElement,{childList:true,subtree:true});
}
