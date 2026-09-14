const STYLE_ID='tso-mlb-playstage-concept-v920-mobile-style';
const ROOT='.tso-mlb-playstage-v901';
const MQ='(max-width:720px)';
let installed=false,observer=null,raf=0;
const inningHtml=new WeakMap();

function ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
/* v920 mobile Gamecast: full-width field, readable scoreboard rows, and two-tab Live/Box switcher. */
@media(max-width:720px){
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920{width:100%!important;min-width:0!important;max-width:100%!important;overflow:hidden!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-grid{display:block!important;grid-template-columns:none!important;min-height:0!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-left{display:none!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-center{display:block!important;width:100%!important;min-width:0!important;height:auto!important;overflow:visible!important;background:#020914!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-stage{display:block!important;width:100%!important;max-width:100%!important;height:auto!important;min-height:0!important;aspect-ratio:1536/1024!important;margin:0!important;overflow:hidden!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps914-field{inset:0!important;width:100%!important;height:100%!important;object-fit:contain!important;object-position:center center!important}

  /* Header: score gets the space; mobile shows inning only, with count/outs/bases moved below field. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-top{grid-template-columns:44px minmax(0,1fr) 52px!important;gap:4px!important;padding:5px 4px!important;min-height:48px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-score{grid-template-columns:minmax(0,1fr) auto 38px auto minmax(0,1fr)!important;gap:3px!important;padding:4px!important;min-width:0!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-inning{font-size:7.5px!important;line-height:1.1!important;white-space:nowrap!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-bases-mini{display:none!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-weather{display:block!important;width:52px!important;max-width:52px!important;min-width:0!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-weather-block{min-height:32px!important;padding:2px 3px!important;gap:2px!important;border-left:1px solid #193657!important;justify-content:center!important;text-align:center!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-weather-icon{font-size:11px!important;line-height:1!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-weather b{font-size:8.5px!important;white-space:nowrap!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-weather span{display:none!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-venue-block{display:none!important}

  /* Bottom game state: OUTS | COUNT | BASES, then the inning-by-inning line beneath it. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-bottom{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;grid-template-rows:auto auto!important;min-height:0!important;width:100%!important;border-top:1px solid #17395e!important;background:#04101f!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-bottom-box{grid-row:1!important;min-height:72px!important;padding:8px 4px!important;border-left:1px solid #17314f!important;border-bottom:1px solid #17314f!important;box-sizing:border-box!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-linescore + .ps-bottom-box{grid-column:3!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-linescore + .ps-bottom-box + .ps-bottom-box{grid-column:2!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-linescore + .ps-bottom-box + .ps-bottom-box + .ps-bottom-box{grid-column:1!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-bottom-box label{font-size:7.5px!important;letter-spacing:.05em!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-count{font-size:19px!important;margin-top:7px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-dots{gap:5px!important;margin-top:7px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-dots i{width:10px!important;height:10px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-baseboard{width:48px!important;height:39px!important;margin-top:5px!important;transform:scale(.78)!important;transform-origin:center top!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-linescore{grid-row:2!important;grid-column:1/-1!important;width:100%!important;min-width:0!important;padding:8px 6px 10px!important;overflow-x:auto!important;box-sizing:border-box!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-line-head,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-line-row{grid-template-columns:44px repeat(9,minmax(18px,1fr)) 24px 24px 24px!important;min-width:350px!important;font-size:7px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-line-team{font-size:8px!important;gap:3px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-line-team img{width:13px!important;height:13px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-line-row{min-height:31px!important}

  /* Right rail becomes a full-width two-button switcher below the mobile scoreboard. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-right{display:block!important;width:100%!important;min-width:0!important;padding:8px!important;border-left:0!important;border-top:1px solid #17395e!important;background:#030d1c!important;box-sizing:border-box!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-right-tabs{display:grid!important;grid-template-columns:1fr 1fr!important;gap:7px!important;margin:0 0 8px!important;border:0!important;background:transparent!important;overflow:visible!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-right-tabs button{display:block!important;min-height:44px!important;padding:8px!important;border:1px solid #235a92!important;border-radius:9px!important;background:#071a32!important;color:#bcd1e8!important;font-size:11px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-right-tabs button.on{background:#1683ff!important;color:#fff!important;border-color:#45a2ff!important;box-shadow:0 0 18px rgba(45,127,255,.22)!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-right-tabs button[data-ps-tab="plays"],
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-right-tabs button[data-ps-tab="field"]{display:none!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-panel{width:100%!important;min-width:0!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-play-item{grid-template-columns:10px minmax(0,1fr)!important;gap:8px!important;padding:10px!important;margin-bottom:7px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-play-item b{font-size:14px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-play-item p{font-size:10px!important;line-height:1.35!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-play-item small{font-size:8px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-rail-person{grid-template-columns:58px minmax(0,1fr)!important;padding:10px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-rail-person img{width:58px!important;height:66px!important;object-fit:cover!important;object-position:center top!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-rail-person b{font-size:16px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v920 .ps-rail-person span{font-size:9px!important}
}
`;
  document.head.appendChild(s);
}

function shortInning(root){
  const el=root.querySelector('.ps-inning');
  if(!el) return;
  if(!inningHtml.has(el)) inningHtml.set(el,el.innerHTML);
  const raw=(el.textContent||'').replace(/\s+/g,' ').trim();
  const match=raw.match(/^(Top|Bot|Bottom|Middle|End)\s+\d+(?:st|nd|rd|th)/i);
  if(match) el.textContent=match[0].replace(/^Bottom\b/i,'Bot');
  else {
    const cleaned=raw.replace(/\s+\d+\s*-\s*\d+\s*·\s*\d+\s*OUTS?.*$/i,'').trim();
    if(cleaned) el.textContent=cleaned;
  }
}
function restoreInning(root){
  const el=root.querySelector('.ps-inning');
  if(el&&inningHtml.has(el)) el.innerHTML=inningHtml.get(el);
}
function ensureMobileTab(root){
  const tabs=[...root.querySelectorAll('.ps-right-tabs [data-ps-tab]')];
  const active=tabs.find(x=>x.classList.contains('on'))?.dataset.psTab;
  if(active!=='live'&&active!=='box') tabs.find(x=>x.dataset.psTab==='live')?.click();
}
function mobileize(root){
  root.classList.add('tso-mlb-mobile-v920');
  root.dataset.mobileLayout='v920';
  const grid=root.querySelector('.ps-grid');
  const center=root.querySelector('.ps-center');
  const right=root.querySelector('.ps-right');
  const bottom=root.querySelector('.ps-bottom');
  if(!grid||!center||!right||!bottom) return;
  if(bottom.parentElement!==center) center.appendChild(bottom);
  if(right.parentElement!==center) center.appendChild(right);
  shortInning(root);
  ensureMobileTab(root);
}
function desktopize(root){
  root.classList.remove('tso-mlb-mobile-v920');
  delete root.dataset.mobileLayout;
  const grid=root.querySelector('.ps-grid');
  const center=root.querySelector('.ps-center');
  const right=root.querySelector('.ps-right');
  const bottom=root.querySelector('.ps-bottom');
  if(grid&&center&&right&&right.parentElement!==grid) grid.appendChild(right);
  if(bottom&&bottom.parentElement!==root) root.appendChild(bottom);
  restoreInning(root);
}
function enhance(root){
  if(!root) return;
  if(window.matchMedia(MQ).matches) mobileize(root); else desktopize(root);
}
function scan(){
  raf=0;
  if(document.documentElement.getAttribute('data-sport')!=='mlb') return;
  document.querySelectorAll(ROOT).forEach(enhance);
}
function queue(){if(!raf) raf=requestAnimationFrame(scan);}
export function installMlbPlaystageConceptV920Mobile(){
  ensureStyles();
  if(installed){queue();return;}
  installed=true;
  observer=new MutationObserver(queue);
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',queue,{passive:true});
  window.addEventListener('hashchange',queue);
  queue();
}
export const __MLB_PLAYSTAGE_CONCEPT_V920_MOBILE_TEST__={STYLE_ID,ROOT,MQ};
