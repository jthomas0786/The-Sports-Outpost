const STYLE_ID='tso-mlb-playstage-concept-v921-mobile-style';
const ROOT='.tso-mlb-playstage-v901';
const MQ='(max-width:720px)';
let installed=false,observer=null,raf=0;

function ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
/* v921 mobile polish: move live status below field, expose Live/Box tabs,
   center Bases geometry, tighten score/team pairs, and shrink weather. */
@media(max-width:720px){
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-top{
    grid-template-columns:40px minmax(0,1fr) 34px!important;
    gap:3px!important;padding:5px 4px!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-score{
    grid-template-columns:max-content max-content minmax(34px,1fr) max-content max-content!important;
    column-gap:4px!important;padding:4px 6px!important;min-width:0!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-team{
    width:max-content!important;max-width:78px!important;gap:4px!important;min-width:0!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-team.home{justify-self:end!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-team img{width:20px!important;height:20px!important;flex:0 0 20px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-team b{font-size:10px!important;white-space:nowrap!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-score-num{
    font-size:20px!important;line-height:1!important;align-self:center!important;margin:0!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-inning{
    justify-self:center!important;min-width:34px!important;font-size:7.5px!important;
  }

  /* Weather is an inline temperature chip, not a competing header box. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-weather{
    display:flex!important;width:34px!important;max-width:34px!important;min-width:34px!important;
    align-items:center!important;justify-content:center!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-weather-block{
    width:34px!important;min-width:34px!important;min-height:24px!important;height:24px!important;
    padding:0!important;gap:0!important;border-left:0!important;border:1px solid rgba(61,116,177,.28)!important;
    border-radius:7px!important;background:rgba(5,22,43,.72)!important;justify-content:center!important;text-align:center!important;
    box-sizing:border-box!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-weather-icon{display:none!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-weather b{font-size:8px!important;line-height:1!important}

  /* Keep the live-at-bat banner fully outside the approved field image. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-stage{
    margin:0 0 58px!important;overflow:visible!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps914-field{overflow:hidden!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-play-banner{
    top:calc(100% + 6px)!important;bottom:auto!important;left:8px!important;right:8px!important;
    width:auto!important;max-width:none!important;transform:none!important;margin:0!important;
    min-height:42px!important;padding:7px 10px!important;gap:7px!important;box-sizing:border-box!important;
    border-radius:9px!important;background:rgba(3,17,36,.96)!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-play-banner .ball{font-size:17px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-play-banner b{font-size:13px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-play-banner span{font-size:9px!important;line-height:1.2!important;margin-top:2px!important}

  /* Live / Box sit immediately below the field status, before game-state rows. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 > .ps-top + .ps-grid .ps-center > .ps-right-tabs{
    display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;
    margin:0 8px 8px!important;padding:0!important;border:0!important;background:transparent!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-center > .ps-right-tabs button{
    display:block!important;min-height:42px!important;padding:8px!important;border:1px solid #235a92!important;
    border-radius:9px!important;background:#071a32!important;color:#bcd1e8!important;font:900 11px/1 'JetBrains Mono',monospace!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-center > .ps-right-tabs button.on{
    background:#1683ff!important;color:#fff!important;border-color:#45a2ff!important;box-shadow:0 0 18px rgba(45,127,255,.22)!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-center > .ps-right-tabs button[data-ps-tab="plays"],
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-center > .ps-right-tabs button[data-ps-tab="field"]{display:none!important}

  /* The content rail now only contains the selected Live/Box panel. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-right{
    padding:8px!important;border-top:1px solid #17395e!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-right>.ps-right-tabs{display:none!important}

  /* Bases diamond is centered and never clips in the three-column state row. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-bottom-box{
    min-height:72px!important;padding:8px 5px!important;overflow:hidden!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-baseboard{
    width:52px!important;height:38px!important;margin:6px auto 0!important;transform:none!important;transform-origin:center!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-baseboard i{width:14px!important;height:14px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-baseboard i:nth-child(1){left:19px!important;top:0!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-baseboard i:nth-child(2){left:6px!important;top:15px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-mobile-v921 .ps-baseboard i:nth-child(3){left:auto!important;right:6px!important;top:15px!important}
}
`;
  document.head.appendChild(s);
}

function mobileize(root){
  root.classList.add('tso-mlb-mobile-v921');
  root.dataset.mobilePolish='v921';
  const center=root.querySelector('.ps-center');
  const bottom=root.querySelector('.ps-bottom');
  const right=root.querySelector('.ps-right');
  const tabs=root.querySelector('.ps-right-tabs');
  if(center&&bottom&&tabs&&tabs.parentElement!==center) center.insertBefore(tabs,bottom);
  if(center&&bottom&&tabs&&tabs.nextElementSibling!==bottom) center.insertBefore(tabs,bottom);
  if(center&&right&&bottom&&right.parentElement===center&&right.previousElementSibling!==bottom) center.appendChild(right);
}
function desktopize(root){
  root.classList.remove('tso-mlb-mobile-v921');
  delete root.dataset.mobilePolish;
  const right=root.querySelector('.ps-right');
  const tabs=root.querySelector('.ps-right-tabs');
  if(right&&tabs&&tabs.parentElement!==right) right.insertBefore(tabs,right.firstChild);
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
export function installMlbPlaystageConceptV921Mobile(){
  ensureStyles();
  if(installed){queue();return;}
  installed=true;
  observer=new MutationObserver(queue);
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',queue,{passive:true});
  window.addEventListener('hashchange',queue);
  queue();
}
export const __MLB_PLAYSTAGE_CONCEPT_V921_MOBILE_TEST__={STYLE_ID,ROOT,MQ};
