const STYLE_ID='tso-mlb-playstage-concept-v915-style';
const ROOT='.tso-mlb-playstage-v901';
const FIELD_SRC='./field-bg.jpg';
const FALLBACK_ASPECT='1536 / 1024';
const DESIGN_WIDTH=1440;
let installed=false,observer=null,raf=0;
const scaleWatchers=new WeakMap();

function ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
/* v915 uses the user-approved field-bg.jpg as the only stadium/field surface.
   The image is never cropped, filtered, transformed, or visually reconstructed. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-sky,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-lights,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-wall,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-grass,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-infield,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-infield-grass,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-mound,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-foul,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-base,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-home,
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
  width:100%!important;height:auto!important;min-height:0!important;aspect-ratio:${FALLBACK_ASPECT}!important;
  overflow:hidden!important;background:#020914!important;isolation:isolate!important;perspective:none!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-stage:before,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-stage:after{display:none!important;content:none!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps914-field{
  position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
  object-fit:contain!important;object-position:center center!important;display:block!important;
  z-index:1!important;pointer-events:none!important;user-select:none!important;
  filter:none!important;transform:none!important;image-rendering:auto!important;
}

/* Every DOM actor is invisible at rest. Role classes such as ps-runner never
   make an actor visible by themselves; only short-lived animation-state classes do. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-batter,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-catcher,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-pitcher,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-runner{
  opacity:0!important;pointer-events:none!important;transform:translate(-50%,-91%)!important;
  transform-origin:50% 100%!important;
  transition:left .30s cubic-bezier(.2,.72,.2,1),top .30s cubic-bezier(.2,.72,.2,1),opacity .08s linear!important;
  filter:drop-shadow(0 4px 3px rgba(0,0,0,.48))!important;z-index:42!important;
}
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
  width:100%!important;height:100%!important;
  filter:saturate(1.04) contrast(1.03) drop-shadow(0 1px 1px rgba(0,0,0,.3))!important;
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

/* v915 proportional desktop/mobile shell */
html[data-sport="mlb"] .ps915-scale-frame{
  position:relative!important;width:100%!important;max-width:100%!important;
  min-height:0!important;overflow:hidden!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915{
  width:${DESIGN_WIDTH}px!important;min-width:${DESIGN_WIDTH}px!important;max-width:${DESIGN_WIDTH}px!important;
  transform-origin:0 0!important;overflow:hidden!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-top{
  min-height:72px!important;grid-template-columns:minmax(100px,.55fr) minmax(410px,1.45fr) minmax(280px,.9fr)!important;
  gap:12px!important;padding:9px 14px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-grid{
  grid-template-columns:205px minmax(0,1fr) 205px!important;
  min-height:0!important;align-items:start!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-left,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-right{
  min-width:0!important;width:auto!important;padding:6px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-center{
  min-width:0!important;width:auto!important;height:auto!important;align-self:start!important;overflow:hidden!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-stage{
  width:100%!important;max-width:none!important;margin:0!important;
}

/* At Bat / Pitching are deliberately compact so the approved field dominates. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card{
  padding:6px!important;margin-bottom:6px!important;border-radius:9px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-card-title{
  gap:5px!important;font-size:8px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-card-title img{
  width:16px!important;height:16px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player{
  grid-template-columns:50px minmax(0,1fr)!important;gap:7px!important;margin-top:5px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-headshot{
  height:58px!important;border-radius:6px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player h3{
  font-size:15px!important;line-height:1!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player .meta{
  margin-top:3px!important;font-size:8px!important;line-height:1.25!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-statrow{
  margin-top:5px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-stat{
  padding-top:5px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-stat b{
  font-size:13px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-stat span{
  margin-top:3px!important;font-size:7px!important;
}

/* On Deck is only a small label + player name. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card{
  display:flex!important;align-items:center!important;gap:7px!important;
  padding:6px 8px!important;margin-bottom:6px!important;min-height:30px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-card-title{
  flex:0 0 auto!important;font-size:7px!important;gap:0!important;white-space:nowrap!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-card-title img,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-headshot,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .meta,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-statrow{
  display:none!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-player{
  display:block!important;min-width:0!important;margin:0!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-player h3{
  margin:0!important;font-size:13px!important;line-height:1!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;
}

@media(prefers-reduced-motion:reduce){html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi{transition:none!important}}
`;
  document.head.appendChild(s);
}

function applyNativeAspect(stage,img){
  if(!stage||!img||!img.naturalWidth||!img.naturalHeight) return;
  stage.style.setProperty('aspect-ratio',`${img.naturalWidth} / ${img.naturalHeight}`,'important');
}
function ensureApprovedField(stage){
  if(!stage) return;
  let img=stage.querySelector(':scope>.ps914-field');
  if(!img){
    stage.insertAdjacentHTML('afterbegin',`<img class="ps914-field" src="${FIELD_SRC}" alt="" aria-hidden="true" decoding="async" draggable="false">`);
    img=stage.querySelector(':scope>.ps914-field');
  }else if(img.getAttribute('src')!==FIELD_SRC){
    img.setAttribute('src',FIELD_SRC);
  }
  if(img.complete&&img.naturalWidth) applyNativeAspect(stage,img);
  else img.addEventListener('load',()=>applyNativeAspect(stage,img),{once:true});
}
function markInfoCards(root){
  root.querySelectorAll('.ps-card').forEach(card=>{
    const title=(card.querySelector('.ps-card-title')?.textContent||'').trim().toLowerCase();
    card.classList.toggle('v915-atbat-card',title.includes('at bat'));
    card.classList.toggle('v915-pitcher-card',title.includes('pitching'));
    card.classList.toggle('v915-ondeck-card',title.includes('on deck'));
    card.classList.toggle('v915-primary-card',title.includes('at bat')||title.includes('pitching'));
  });
}
function applyGamecastScale(root){
  const frame=root?.parentElement;
  if(!root||!frame) return;
  frame.classList.add('ps915-scale-frame');
  const available=Math.max(1,frame.clientWidth||DESIGN_WIDTH);
  const scale=Math.min(1,available/DESIGN_WIDTH);
  const rendered=DESIGN_WIDTH*scale;
  const gap=Math.max(0,(available-rendered)/2);
  root.style.transform=`scale(${scale})`;
  root.style.marginLeft=`${gap/scale}px`;
  root.dataset.ps915Scale=scale.toFixed(4);
  frame.style.height=`${Math.ceil(root.offsetHeight*scale)}px`;
}
function wireScale(root){
  if(!scaleWatchers.has(root)&&typeof ResizeObserver!=='undefined'){
    const ro=new ResizeObserver(()=>requestAnimationFrame(()=>applyGamecastScale(root)));
    ro.observe(root);
    scaleWatchers.set(root,ro);
  }
  requestAnimationFrame(()=>applyGamecastScale(root));
}

function enhance(root){
  if(!root) return;
  root.classList.add('tso-mlb-concept-v915');
  root.dataset.approvedConcept='v915';
  ensureApprovedField(root.querySelector('.ps-stage'));
  markInfoCards(root);
  wireScale(root);
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
  window.addEventListener('resize',queue,{passive:true});
  queue();
}
export const __MLB_PLAYSTAGE_CONCEPT_V915_TEST__={STYLE_ID,ROOT,FIELD_SRC,FALLBACK_ASPECT,DESIGN_WIDTH};
