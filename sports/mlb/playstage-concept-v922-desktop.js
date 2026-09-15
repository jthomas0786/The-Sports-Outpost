const STYLE_ID='tso-mlb-playstage-concept-v922-desktop-style';
const ROOT='.tso-mlb-playstage-v901';
const MQ='(min-width:721px)';
let installed=false,observer=null,raf=0;

function ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
/* v922 desktop polish only. Mobile v920/v921 remains authoritative <=720px. */
@media(min-width:721px){
  /* Remove the stale tall desktop grid gap so the footer/state boxes follow the field. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-grid{
    min-height:0!important;height:auto!important;grid-auto-rows:max-content!important;align-items:start!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-center{
    min-height:0!important;height:auto!important;align-self:start!important;overflow:visible!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-right{align-self:start!important;height:auto!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-bottom{margin-top:0!important}

  /* Bigger, readable At Bat / Pitching cards. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .v915-primary-card{
    top:16px!important;width:300px!important;min-height:154px!important;padding:11px 12px!important;
    border-radius:12px!important;overflow:hidden!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .v915-atbat-card{left:16px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .v915-pitcher-card{right:16px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .v915-primary-card .ps-card-title{
    gap:7px!important;font-size:11px!important;line-height:1.15!important;letter-spacing:.025em!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .v915-primary-card .ps-card-title img{width:20px!important;height:20px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .v915-primary-card .ps-player{
    grid-template-columns:62px minmax(0,1fr)!important;gap:10px!important;margin-top:8px!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .v915-primary-card .ps-headshot{height:72px!important;border-radius:8px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .v915-primary-card .ps-player h3{
    font-size:20px!important;line-height:1.08!important;letter-spacing:0!important;overflow-wrap:normal!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .v915-primary-card .ps-player .meta{
    display:block!important;margin-top:5px!important;font-size:10px!important;line-height:1.35!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .v915-primary-card .ps-statrow{display:grid!important;margin-top:8px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .v915-primary-card .ps-stat{padding-top:7px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .v915-primary-card .ps-stat b{font-size:16px!important;line-height:1!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .v915-primary-card .ps-stat span{font-size:8.5px!important;margin-top:4px!important}

  /* On Deck remains secondary but is large enough to read without squinting. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .v915-ondeck-card{
    left:16px!important;top:180px!important;width:300px!important;min-height:38px!important;
    padding:8px 10px!important;gap:9px!important;border-radius:9px!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .v915-ondeck-card .ps-card-title{font-size:8.5px!important;letter-spacing:.02em!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .v915-ondeck-card .ps-player h3{font-size:15px!important;line-height:1.1!important}

  /* Statcast strip: larger labels, larger values, more breathing room. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-metrics{
    top:16px!important;width:420px!important;min-width:420px!important;border-radius:10px!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-metric{padding:12px 16px!important;min-height:58px!important;box-sizing:border-box!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-metric span{font-size:10px!important;line-height:1.1!important;letter-spacing:.02em!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-metric b{font-size:20px!important;line-height:1!important;margin-top:7px!important}

  /* The approved field image stays untouched; Live At-Bat is placed beneath it. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-stage{
    margin:0 0 76px!important;overflow:visible!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps914-field{
    object-fit:contain!important;object-position:center center!important;filter:none!important;transform:none!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-play-banner{
    top:calc(100% + 10px)!important;bottom:auto!important;left:50%!important;right:auto!important;
    width:min(720px,76%)!important;max-width:76%!important;min-height:54px!important;
    transform:translateX(-50%)!important;margin:0!important;padding:10px 16px!important;gap:11px!important;
    box-sizing:border-box!important;border-radius:10px!important;background:rgba(3,17,36,.96)!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-play-banner .ball{font-size:22px!important;line-height:1!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-play-banner b{font-size:18px!important;line-height:1.1!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-play-banner span{font-size:11px!important;line-height:1.3!important;margin-top:3px!important}

  /* Batter was visually undersized at home plate. Bring him back to the foreground scale. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-chibi.ps-batter,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-chibi[data-actor-kind="batter"]{
    width:78px!important;height:108px!important;z-index:50!important;
  }

  /* Replace the hard condensed/block treatment with a readable UI face. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-card-title,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-player h3,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-player .meta,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-stat b,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-stat span,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-metric span,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-metric b,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-play-banner b,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-play-banner span,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-actor-label,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-actor-label b,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-team b,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-score-num,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-inning,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-weather b,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-weather span,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-right,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-bottom{
    font-family:Inter,"Segoe UI",Arial,sans-serif!important;font-stretch:normal!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-actor-label{
    max-width:118px!important;padding:3px 6px!important;font-size:9.5px!important;line-height:1.1!important;letter-spacing:0!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-actor-label b{font-size:8.5px!important;letter-spacing:0!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-play-item b{font-family:Inter,"Segoe UI",Arial,sans-serif!important;font-size:14px!important;line-height:1.15!important;letter-spacing:0!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v922 .ps-play-item p{font-family:Inter,"Segoe UI",Arial,sans-serif!important;font-size:10px!important;line-height:1.35!important}
}
`;
  document.head.appendChild(s);
}

function enhance(root){
  if(!root) return;
  if(window.matchMedia(MQ).matches){
    root.classList.add('tso-mlb-desktop-v922');
    root.dataset.desktopPolish='v922';
  }else{
    root.classList.remove('tso-mlb-desktop-v922');
    delete root.dataset.desktopPolish;
  }
}
function scan(){
  raf=0;
  if(document.documentElement.getAttribute('data-sport')!=='mlb') return;
  document.querySelectorAll(ROOT).forEach(enhance);
}
function queue(){if(!raf) raf=requestAnimationFrame(scan);}
export function installMlbPlaystageConceptV922Desktop(){
  ensureStyles();
  if(installed){queue();return;}
  installed=true;
  observer=new MutationObserver(queue);
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',queue,{passive:true});
  window.addEventListener('hashchange',queue);
  queue();
}
export const __MLB_PLAYSTAGE_CONCEPT_V922_DESKTOP_TEST__={STYLE_ID,ROOT,MQ};
