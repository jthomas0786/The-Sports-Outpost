const STYLE_ID='tso-mlb-playstage-concept-v917-style';
const ROOT='.tso-mlb-playstage-v901';
let installed=false,observer=null,raf=0;

function ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
/* v917: explicit offense/defense identity + stronger team-color uniforms. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-chibi .ps-chibi-cap{
  background:var(--c1)!important;
  border-bottom-color:var(--c2)!important;
  box-shadow:0 2px 0 var(--c2),0 3px 5px rgba(0,0,0,.5)!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-chibi .ps-chibi-body{
  background:linear-gradient(90deg,var(--c2) 0 10%,var(--c1) 10% 90%,var(--c2) 90%)!important;
  border-color:var(--c2)!important;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.18),0 2px 5px rgba(0,0,0,.35)!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-chibi .ps-chibi-arm{
  background:var(--c1)!important;
  border-color:var(--c2)!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-chibi .ps-chibi-body:after{
  color:#fff!important;
  text-shadow:0 1px 2px rgba(0,0,0,.9),0 0 3px rgba(0,0,0,.55)!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-chibi[data-actor-kind="runner"] .ps-actor-label,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-chibi[data-actor-kind="batter"] .ps-actor-label{
  border-color:var(--c2)!important;
  box-shadow:0 0 0 1px var(--c1),0 3px 9px rgba(0,0,0,.45)!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-chibi[data-actor-kind="runner"] .ps-actor-label b,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-chibi[data-actor-kind="batter"] .ps-actor-label b{
  color:#fff!important;
  background:var(--c1)!important;
  border-radius:4px!important;
  padding:1px 3px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-chibi[data-actor-kind="defender"] .ps-actor-label b{
  color:#fff!important;
  background:var(--c1)!important;
  border:1px solid var(--c2)!important;
  border-radius:4px!important;
  padding:1px 3px!important;
}
/* v919 trajectory: solid glow grows directly behind the moving ball. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-trajectory{
  position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
  z-index:29!important;pointer-events:none!important;overflow:visible!important;opacity:1!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-trajectory-flight,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-trajectory-glow{
  fill:none!important;stroke-linecap:round!important;stroke-linejoin:round!important;
  vector-effect:non-scaling-stroke!important;opacity:0;transition:opacity .18s ease;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-trajectory-glow{
  stroke:rgba(45,127,255,.42)!important;stroke-width:7!important;filter:blur(2.2px) drop-shadow(0 0 9px rgba(45,127,255,.9))!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-trajectory-flight{
  stroke:#2d7fff!important;stroke-width:2.8!important;filter:drop-shadow(0 0 5px rgba(45,127,255,1))!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-trajectory.is-active .ps-trajectory-flight,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-trajectory.is-active .ps-trajectory-glow{opacity:1!important;}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-trajectory-head{
  fill:rgba(45,127,255,.24)!important;stroke:#8fc0ff!important;stroke-width:.6!important;vector-effect:non-scaling-stroke!important;
  filter:drop-shadow(0 0 4px #2d7fff) drop-shadow(0 0 10px rgba(45,127,255,.98))!important;opacity:0;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-trajectory-landing{
  fill:#2d7fff!important;stroke:#e8f2ff!important;stroke-width:.38!important;vector-effect:non-scaling-stroke!important;
  filter:drop-shadow(0 0 6px rgba(45,127,255,1))!important;opacity:0;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-trajectory.is-complete .ps-trajectory-landing{animation:psTrajectoryLandV919 .28s ease both;}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-trajectory.is-fading .ps-trajectory-flight,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-trajectory.is-fading .ps-trajectory-glow,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-trajectory.is-fading .ps-trajectory-landing{opacity:.18!important;transition:opacity .7s ease!important;}
@keyframes psTrajectoryLandV919{0%{transform:scale(.45);transform-origin:center}65%{transform:scale(1.55);transform-origin:center}100%{transform:scale(1);transform-origin:center}}


`;
  document.head.appendChild(s);
}

function enhance(root){
  if(!root) return;
  root.classList.add('tso-mlb-concept-v917');
  root.dataset.actorRoles='v917';
}
function scan(){
  raf=0;
  if(document.documentElement.getAttribute('data-sport')!=='mlb') return;
  document.querySelectorAll(ROOT).forEach(enhance);
}
function queue(){if(!raf) raf=requestAnimationFrame(scan);}
export function installMlbPlaystageConceptV917(){
  ensureStyles();
  if(installed){queue();return;}
  installed=true;
  observer=new MutationObserver(queue);
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-actor-kind','data-team']});
  window.addEventListener('hashchange',queue);
  queue();
}
export const __MLB_PLAYSTAGE_CONCEPT_V917_TEST__={STYLE_ID,ROOT};
