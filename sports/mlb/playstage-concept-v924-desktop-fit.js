const STYLE_ID='tso-mlb-playstage-concept-v924-desktop-fit-style';
const ROOT='.tso-mlb-playstage-v901';
const MQ='(min-width:721px)';
let installed=false,observer=null,raf=0;

function ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
@media(min-width:721px){
  /* v924: desktop Gamecast uses the full inner frame width and never escapes the root border. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v924{
    box-sizing:border-box!important;overflow:hidden!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v924 .ps-grid{
    width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important;
    margin:0!important;padding:0!important;overflow:visible!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v924 .ps-center{
    width:calc(100% - 24px)!important;max-width:none!important;min-width:0!important;
    margin:12px auto 0!important;box-sizing:border-box!important;overflow:visible!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v924 .ps-stage{
    width:100%!important;max-width:100%!important;min-width:0!important;
    margin:0 0 66px!important;box-sizing:border-box!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v924 .ps914-field{
    width:100%!important;height:100%!important;max-width:100%!important;object-fit:contain!important;
  }

  /* State/footer follows Live At-Bat tightly and spans the same full inner width as the field. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v924 .v923-game-footer{
    width:calc(100% - 24px)!important;max-width:none!important;min-width:0!important;
    margin:0 auto 12px!important;box-sizing:border-box!important;
    grid-template-columns:minmax(0,1fr) minmax(320px,31%)!important;gap:10px!important;
    overflow:hidden!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v924 .v923-state-wrap,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v924 .v923-live-wrap{
    max-width:100%!important;min-width:0!important;box-sizing:border-box!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v924 .v923-live-wrap .ps-panel{
    max-height:205px!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v924 .ps-bottom-box{
    min-height:76px!important;padding:8px 8px!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v924 .ps-linescore{
    padding:7px 12px 10px!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v924 .ps-line-head,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v924 .ps-line-row{
    grid-template-columns:96px repeat(9,minmax(34px,1fr)) 42px 42px 42px!important;
    column-gap:5px!important;
  }

  /* Full alternate views stay inside exactly the same inner frame. */
  html[data-sport="mlb"] ${ROOT}.tso-mlb-desktop-v924 .v923-alt-host{
    width:calc(100% - 24px)!important;max-width:none!important;min-width:0!important;
    margin:12px auto!important;box-sizing:border-box!important;
  }
}
`;
  document.head.appendChild(s);
}

function settleFooterGap(root,footer,banner,target=8){
  const scale=Math.max(.05,Number(root.dataset.ps915Scale)||1);
  const gap=footer.getBoundingClientRect().top-banner.getBoundingClientRect().bottom;
  const current=parseFloat(footer.style.marginTop)||0;
  footer.style.marginTop=`${current+((target-gap)/scale)}px`;
}
function tighten(root){
  if(!root||!window.matchMedia(MQ).matches) return;
  const footer=root.querySelector('.v923-game-footer');
  const banner=root.querySelector('.ps-play-banner');
  if(!footer||!banner) return;
  footer.style.marginTop='0px';
  requestAnimationFrame(()=>{
    if(!footer.isConnected||!banner.isConnected) return;
    let gap=footer.getBoundingClientRect().top-banner.getBoundingClientRect().bottom;
    if(gap>14||gap<6) settleFooterGap(root,footer,banner,8);
    requestAnimationFrame(()=>{
      if(!footer.isConnected||!banner.isConnected) return;
      gap=footer.getBoundingClientRect().top-banner.getBoundingClientRect().bottom;
      if(gap>14||gap<6) settleFooterGap(root,footer,banner,8);
      requestAnimationFrame(()=>{
        if(!footer.isConnected||!banner.isConnected) return;
        root.dataset.v924FooterGap=String(Math.round(footer.getBoundingClientRect().top-banner.getBoundingClientRect().bottom));
      });
    });
  });
}

function enhance(root){
  if(!root) return;
  if(window.matchMedia(MQ).matches){
    root.classList.add('tso-mlb-desktop-v924');
    root.dataset.desktopFit='v924';
    tighten(root);
  }else{
    root.classList.remove('tso-mlb-desktop-v924');
    delete root.dataset.desktopFit;
  }
}
function scan(){raf=0;if(document.documentElement.getAttribute('data-sport')!=='mlb')return;document.querySelectorAll(ROOT).forEach(enhance);}
function queue(){if(!raf)raf=requestAnimationFrame(scan);}
export function installMlbPlaystageConceptV924DesktopFit(){
  ensureStyles();
  if(installed){queue();return;}
  installed=true;
  observer=new MutationObserver(queue);
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',queue,{passive:true});
  window.addEventListener('hashchange',queue);
  queue();
}
export const __MLB_PLAYSTAGE_CONCEPT_V924_DESKTOP_FIT_TEST__={STYLE_ID,ROOT,MQ};
