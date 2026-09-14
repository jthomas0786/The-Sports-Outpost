from pathlib import Path
import re

CORE=Path('sports/mlb/playstage-v901.js')
s=CORE.read_text()

def replace_between(text,start,end,new,label):
    a=text.find(start)
    if a<0: raise SystemExit(f'{label}: start marker missing')
    b=text.find(end,a)
    if b<0: raise SystemExit(f'{label}: end marker missing')
    return text[:a]+new+text[b:]

old="function defensiveHitTarget(play,kind,landing=hitTarget(play,kind)){if(kind!=='home_run')return landing;return lerp2(HIT_HOME,wallPointForAngle(sprayAngle(play)),.94);}"
new="""function defensiveHitTarget(play,kind,landing=hitTarget(play,kind)){
 if(kind!=='home_run')return landing;
 const wall=wallPointForAngle(sprayAngle(play)),stop=lerp2(HIT_HOME,wall,.78);
 return[clamp(stop[0],18,82),clamp(stop[1],36,64)];
}"""
if old not in s: raise SystemExit('defensiveHitTarget marker missing')
s=s.replace(old,new,1)

old_svg='<svg class="ps-trajectory" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="ps-trajectory-glow" pathLength="1"></path><path class="ps-trajectory-flight" pathLength="1"></path><circle class="ps-trajectory-landing" r="1.05"></circle></svg>'
new_svg='<svg class="ps-trajectory" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="ps-trajectory-glow"></path><path class="ps-trajectory-flight"></path><circle class="ps-trajectory-head" r="1.35"></circle><circle class="ps-trajectory-landing" r="1.05"></circle></svg>'
if old_svg not in s: raise SystemExit('trajectory svg marker missing')
s=s.replace(old_svg,new_svg,1)

new_traj=r'''function clearTrajectory(root){
 const svg=root?.querySelector?.('.ps-trajectory');if(!svg)return;
 if(svg._fadeTimer){clearTimeout(svg._fadeTimer);svg._fadeTimer=0;}
 svg.classList.remove('is-active','is-complete','is-fading');
 for(const p of svg.querySelectorAll('path'))p.removeAttribute('d');
 for(const dot of svg.querySelectorAll('circle')){dot.removeAttribute('cx');dot.removeAttribute('cy');dot.style.opacity='0';}
}
function quadraticPoint(g,t){const mt=1-t;return[mt*mt*g.from[0]+2*mt*t*g.control[0]+t*t*g.to[0],mt*mt*g.from[1]+2*mt*t*g.control[1]+t*t*g.to[1]];}
function partialTrajectory(g,t){const a=lerp2(g.from,g.control,t),b=lerp2(g.control,g.to,t),point=lerp2(a,b,t);return{point,d:`M ${g.from[0]} ${g.from[1]} Q ${a[0]} ${a[1]} ${point[0]} ${point[1]}`};}
function prepareTrajectory(root,play,kind,to){
 const svg=root?.querySelector?.('.ps-trajectory');if(!svg||!to)return null;
 const g=trajectoryGeometry(play,kind,to),flight=svg.querySelector('.ps-trajectory-flight'),glow=svg.querySelector('.ps-trajectory-glow'),head=svg.querySelector('.ps-trajectory-head'),landing=svg.querySelector('.ps-trajectory-landing');
 svg.classList.remove('is-complete','is-fading');svg.classList.add('is-active');
 const startD=`M ${g.from[0]} ${g.from[1]} Q ${g.from[0]} ${g.from[1]} ${g.from[0]} ${g.from[1]}`;
 for(const p of [flight,glow])p?.setAttribute('d',startD);
 if(head){head.setAttribute('cx',String(g.from[0]));head.setAttribute('cy',String(g.from[1]));head.style.opacity='1';}
 if(landing){landing.setAttribute('cx',String(to[0]));landing.setAttribute('cy',String(to[1]));landing.style.opacity='0';}
 return{svg,g,flight,glow,head,landing};
}
function animateHitBall(root,from,to,play,kind,duration=900,arc=true){
 const b=root.querySelector('.ps-ball'),parts=prepareTrajectory(root,play,kind,to);if(!b||!parts)return animateBall(root,from,to,duration,arc);
 const {svg,g,flight,glow,head,landing}=parts;b.style.left=`${g.from[0]}%`;b.style.top=`${g.from[1]}%`;b.style.opacity='1';b.style.transform='translate(-50%,-50%)';
 const started=performance.now();
 return new Promise(resolve=>{
  const frame=now=>{
   const raw=clamp((now-started)/Math.max(1,duration),0,1),t=1-Math.pow(1-raw,2.15),seg=partialTrajectory(g,t),point=seg.point;
   for(const p of [flight,glow])p?.setAttribute('d',seg.d);
   if(head){head.setAttribute('cx',String(point[0]));head.setAttribute('cy',String(point[1]));head.style.opacity='1';}
   b.style.left=`${point[0]}%`;b.style.top=`${point[1]}%`;
   if(raw<1){requestAnimationFrame(frame);return;}
   for(const p of [flight,glow])p?.setAttribute('d',g.d);
   b.style.left=`${to[0]}%`;b.style.top=`${to[1]}%`;b.style.opacity='0';
   if(head)head.style.opacity='0';if(landing)landing.style.opacity='1';
   svg.classList.add('is-complete');svg._fadeTimer=setTimeout(()=>svg.classList.add('is-fading'),2600);resolve();
  };
  requestAnimationFrame(frame);
 });
}
'''
s=replace_between(s,'function clearTrajectory(root){','function pause(ms){',new_traj,'trajectory animation')
CORE.write_text(s)

concept=Path('sports/mlb/playstage-concept-v917.js')
c=concept.read_text()
start=c.find('/* v918 trajectory:')
end=c.find('\n\n`;',start)
if start<0 or end<0: raise SystemExit('v918 trajectory CSS block missing')
css=r'''/* v919 trajectory: solid glow grows directly behind the moving ball. */
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
'''
c=c[:start]+css+c[end:]
concept.write_text(c)

router=Path('sports/router.js')
r=router.read_text()
r2,n=re.subn(r"import\('\./mlb/playstage-v901\.js\?v=[^']+'\)","import('./mlb/playstage-v901.js?v=90.45')",r,count=1)
if n!=1: raise SystemExit('core router import not found')
r=r2
r2,n=re.subn(r"import\('\./mlb/playstage-concept-v917\.js\?v=[^']+'\)","import('./mlb/playstage-concept-v917.js?v=91.72')",r,count=1)
if n!=1: raise SystemExit('concept router import not found')
router.write_text(r2)

index=Path('index.html')
i=index.read_text()
i2,n=re.subn(r'\./sports/router\.js\?v=[A-Za-z0-9._-]+','./sports/router.js?v=90.45',i,count=1)
if n!=1: raise SystemExit('index router import not found')
index.write_text(i2)

for name in ['scripts/mlb-playstage-selftest.mjs','scripts/mlb-playstage-v916-selftest.mjs','scripts/mlb-v916-runner-isolation-selftest.mjs','scripts/mlb-v917-actor-role-selftest.mjs','scripts/mlb-v918-hit-trajectory-selftest.mjs']:
    p=Path(name)
    if not p.exists(): continue
    t=p.read_text().replace('playstage-v901.js?v=90.44','playstage-v901.js?v=90.45').replace('sports/router.js?v=90.44','sports/router.js?v=90.45').replace('playstage-concept-v917.js?v=91.71','playstage-concept-v917.js?v=91.72')
    if name.endswith('mlb-v918-hit-trajectory-selftest.mjs'):
        t=t.replace("assert.ok(concept.includes('@keyframes psTrajectoryDraw'),'trajectory must animate');","assert.ok(core.includes('requestAnimationFrame(frame)'),'trajectory must animate in lockstep with the moving ball');")
    p.write_text(t)

print('Applied MLB v919 playable-fielder stop and solid ball-following glow trail')
