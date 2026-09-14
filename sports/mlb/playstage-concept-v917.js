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
/* v918 trajectory: actual hit direction + distance projected over the approved field. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-trajectory{
  position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
  z-index:46!important;pointer-events:none!important;overflow:visible!important;opacity:1!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-trajectory-flight,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-trajectory-glow{
  fill:none!important;stroke-linecap:round!important;stroke-linejoin:round!important;
  vector-effect:non-scaling-stroke!important;stroke-dasharray:1!important;stroke-dashoffset:1!important;opacity:0;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-trajectory-glow{
  stroke:rgba(45,127,255,.34)!important;stroke-width:5!important;filter:blur(2px) drop-shadow(0 0 7px rgba(45,127,255,.75))!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-trajectory-flight{
  stroke:#2d7fff!important;stroke-width:2.4!important;filter:drop-shadow(0 0 4px rgba(45,127,255,.95))!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-trajectory-landing{
  fill:#2d7fff!important;stroke:#dbeafe!important;stroke-width:.35!important;vector-effect:non-scaling-stroke!important;
  filter:drop-shadow(0 0 5px rgba(45,127,255,1))!important;opacity:0;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-trajectory.is-active .ps-trajectory-flight,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-trajectory.is-active .ps-trajectory-glow{
  animation:psTrajectoryDraw var(--ps-traj-ms,900ms) cubic-bezier(.18,.7,.2,1) forwards,psTrajectoryFade .7s ease 3.1s forwards!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v917 .ps-trajectory.is-active .ps-trajectory-landing{
  animation:psTrajectoryLand .24s ease var(--ps-traj-ms,900ms) forwards,psTrajectoryFade .7s ease 3.1s forwards!important;
}
@keyframes psTrajectoryDraw{0%{stroke-dashoffset:1;opacity:0}8%{opacity:1}100%{stroke-dashoffset:0;opacity:1}}
@keyframes psTrajectoryLand{0%{opacity:0;transform:scale(.35);transform-origin:center}70%{opacity:1;transform:scale(1.55);transform-origin:center}100%{opacity:1;transform:scale(1);transform-origin:center}}
@keyframes psTrajectoryFade{to{opacity:.22}}

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
