const STYLE_ID='tso-mlb-playstage-concept-v915-style';
const ROOT='.tso-mlb-playstage-v901';
const FIELD_SRC='./images/mlb/playstage-field-v915.webp';
let installed=false,observer=null,raf=0;

function ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps914-field,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps907-scene,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps909-scene,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps908-atmosphere,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps908-foreground,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps911-fieldfx,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps911-lens,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps911-homeglow,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps912-home-dirt,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps912-box,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps912-plate,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps907-ump{display:none!important}

html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-center{min-height:0!important;background:#020914!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-stage{
  width:100%!important;height:auto!important;min-height:0!important;aspect-ratio:4/3!important;
  overflow:hidden!important;background:#020914!important;isolation:isolate!important;perspective:none!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-stage:before,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-stage:after{display:none!important;content:none!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps915-field{
  position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:center center;
  display:block;z-index:1;pointer-events:none;user-select:none;filter:none!important;transform:none!important;
}

/* The supplied field artwork already contains the complete defensive alignment,
   batter, catcher and umpire. Idle DOM actors stay hidden so the approved image
   is never duplicated or visually re-created. They appear only for live motion. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi{
  opacity:0!important;pointer-events:none!important;transform:translate(-50%,-91%)!important;
  transform-origin:50% 100%!important;transition:left .30s cubic-bezier(.2,.72,.2,1),top .30s cubic-bezier(.2,.72,.2,1),opacity .08s linear!important;
  filter:drop-shadow(0 4px 3px rgba(0,0,0,.48))!important;z-index:42!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-runner,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-windup,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-throwing,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-swing,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-running,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-catching,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps905-tracking,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps905-grounder,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps905-turn,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps905-catcher-throw,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps905-slide,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps905-tag,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps905-rounding,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps906-transfer{opacity:1!important}

html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi>.ps905-rig,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi>.ps907-backrig{
  width:100%!important;height:100%!important;filter:saturate(1.04) contrast(1.03) drop-shadow(0 1px 1px rgba(0,0,0,.3))!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-batter{width:58px!important;height:82px!important;z-index:50!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-catcher{width:50px!important;height:70px!important;z-index:48!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-pitcher{width:47px!important;height:68px!important;z-index:45!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi[data-pos="1B"],
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi[data-pos="3B"]{width:39px!important;height:56px!important;z-index:44!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi[data-pos="2B"],
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi[data-pos="SS"]{width:36px!important;height:52px!important;z-index:43!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi[data-pos="LF"],
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi[data-pos="CF"],
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi[data-pos="RF"]{width:25px!important;height:36px!important;z-index:42!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-runner{width:40px!important;height:58px!important;z-index:47!important}

html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner{z-index:96!important;top:10px!important;left:10px!important;max-width:min(370px,50%)!important;background:rgba(3,16,34,.88)!important;backdrop-filter:blur(7px)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-metrics{z-index:96!important;top:10px!important;right:10px!important;background:rgba(3,16,34,.88)!important;backdrop-filter:blur(7px)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-callout{z-index:97!important;bottom:10px!important;width:min(620px,72%)!important;padding:8px 14px!important;background:rgba(2,13,29,.91)!important;backdrop-filter:blur(7px)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-truth{z-index:98!important;bottom:1px!important;opacity:.62!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-ball,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-balltrail{z-index:99!important}

@media(max-width:620px){
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-batter{width:46px!important;height:65px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-catcher{width:40px!important;height:56px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-pitcher{width:37px!important;height:54px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi[data-pos="1B"],html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi[data-pos="3B"]{width:31px!important;height:45px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi[data-pos="2B"],html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi[data-pos="SS"]{width:29px!important;height:42px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi[data-pos="LF"],html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi[data-pos="CF"],html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi[data-pos="RF"]{width:20px!important;height:29px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-runner{width:32px!important;height:46px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner{max-width:64%!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-callout{width:82%!important}
}
@media(prefers-reduced-motion:reduce){html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi{transition:none!important}}
`;
  document.head.appendChild(s);
}

function addField(stage){
  if(!stage||stage.querySelector(':scope>.ps915-field')) return;
  stage.insertAdjacentHTML('afterbegin',`<img class="ps915-field" src="${FIELD_SRC}" alt="" aria-hidden="true" decoding="async" draggable="false">`);
}
function enhance(root){
  if(!root) return;
  root.classList.add('tso-mlb-concept-v915');
  root.dataset.approvedConcept='v915';
  addField(root.querySelector('.ps-stage'));
}
function scan(){
  raf=0;
  if(document.documentElement.getAttribute('data-sport')!=='mlb') return;
  document.querySelectorAll(ROOT).forEach(enhance);
}
function queue(){if(!raf) raf=requestAnimationFrame(scan);}
export function installMlbPlaystageConceptV915(){
  ensureStyles();
  if(installed){queue();return;}
  installed=true;
  observer=new MutationObserver(queue);
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-play-id','data-player-id']});
  window.addEventListener('hashchange',queue);
  queue();
}
export const __MLB_PLAYSTAGE_CONCEPT_V915_TEST__={STYLE_ID,ROOT,FIELD_SRC};
