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

# Replace the shallow direct XY mapping with distance + spray-angle projection.
new_hit=r'''const HIT_HOME=[50,88.5];
const FIELD_WALL={left:[12.5,28],center:[50,18.5],right:[87.5,28]};
const MAX_SPRAY=Math.PI/4.05;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const lerp2=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t)];
function hitDataFor(play){if(play?.hitData)return play.hitData;const events=Array.isArray(play?.playEvents)?play.playEvents:[];for(let i=events.length-1;i>=0;i--)if(events[i]?.hitData)return events[i].hitData;return null;}
function descriptionSprayAngle(play){const d=String(play?.result?.description||'').toLowerCase();if(d.includes('right center')||d.includes('right-center'))return .31;if(d.includes('left center')||d.includes('left-center'))return-.31;if(d.includes('right field'))return .57;if(d.includes('left field'))return-.57;if(d.includes('center field')||d.includes('to center'))return 0;return null;}
function sprayAngle(play){const hit=hitDataFor(play)||{},c=hit.coordinates||{},x=Number(c.coordX),y=Number(c.coordY);let a=null;if(Number.isFinite(x)&&Number.isFinite(y)){const dx=x-125,forward=199-y;if(Math.abs(dx)>1||Math.abs(forward)>1)a=Math.atan2(dx,Math.max(1,forward));}const described=descriptionSprayAngle(play);if(described!=null){if(a==null)a=described;else if(described>0&&a<0)a=-a;else if(described<0&&a>0)a=-a;else if(Math.abs(described)<.08&&Math.abs(a)>.34)a*=.35;}return clamp(a??0,-MAX_SPRAY,MAX_SPRAY);}
function wallPointForAngle(angle){const a=clamp(Number(angle)||0,-MAX_SPRAY,MAX_SPRAY),t=Math.abs(a)/MAX_SPRAY;return a<0?lerp2(FIELD_WALL.center,FIELD_WALL.left,t):lerp2(FIELD_WALL.center,FIELD_WALL.right,t);}
function fenceFeetForAngle(angle){const t=Math.abs(clamp(Number(angle)||0,-MAX_SPRAY,MAX_SPRAY))/MAX_SPRAY;return lerp(400,330,t);}
function hitTarget(play,kind){
 const hit=hitDataFor(play)||{},angle=sprayAngle(play),wall=wallPointForAngle(angle),distance=Number(hit.totalDistance);
 if(Number.isFinite(distance)&&distance>0){const fence=fenceFeetForAngle(angle);let scale=distance/fence;if(kind==='home_run')scale=clamp(Math.max(1.025,scale),1.025,1.16);else scale=clamp(scale,.08,.985);return lerp2(HIT_HOME,wall,scale);}
 const described=descriptionSprayAngle(play);if(kind==='home_run'||described!=null){const scale=kind==='home_run'?1.045:.72;return lerp2(HIT_HOME,wall,scale);}
 const desc=String(play?.result?.description||'').toLowerCase();if(desc.includes('shortstop'))return[42,54];if(desc.includes('second baseman'))return[58,54];if(desc.includes('third baseman'))return[31,63];if(desc.includes('first baseman'))return[69,63];if(kind==='ground_out'||kind==='ground_ball'||kind==='double_play')return[45,58];return[58,44];
}
function defensiveHitTarget(play,kind,landing=hitTarget(play,kind)){if(kind!=='home_run')return landing;return lerp2(HIT_HOME,wallPointForAngle(sprayAngle(play)),.94);}
function trajectoryGeometry(play,kind,to){const hit=hitDataFor(play)||{},from=[50,86],la=Number(hit.launchAngle),ground=/ground/.test(kind)||Number.isFinite(la)&&la<5;const flight=Math.hypot(to[0]-from[0],to[1]-from[1]);const rise=ground?clamp(1.5+Math.max(0,la||0)*.12,1.5,5):clamp(7+Math.max(0,Number.isFinite(la)?la:20)*.42+flight*.035,8,30);const cx=(from[0]+to[0])/2,cy=Math.max(3,Math.min(from[1],to[1])-rise);return{from,to,control:[cx,cy],d:`M ${from[0]} ${from[1]} Q ${cx} ${cy} ${to[0]} ${to[1]}`};}
'''
s=replace_between(s,'function hitTarget(play,kind){','function nearestFielder(def,target)',new_hit,'hit projection')

# Add an SVG layer on the approved field. The image itself stays untouched.
old='<div class="ps-ball"></div><div class="ps-balltrail"></div>'
new='<svg class="ps-trajectory" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="ps-trajectory-glow" pathLength="1"></path><path class="ps-trajectory-flight" pathLength="1"></path><circle class="ps-trajectory-landing" r="1.05"></circle></svg><div class="ps-ball"></div><div class="ps-balltrail"></div>'
if old not in s: raise SystemExit('stage ball marker missing')
s=s.replace(old,new,1)

# Add trajectory animation helpers immediately before pause().
marker='function pause(ms){return new Promise(r=>setTimeout(r,ms));}'
if marker not in s: raise SystemExit('pause marker missing')
helpers=r'''function clearTrajectory(root){const svg=root?.querySelector?.('.ps-trajectory');if(!svg)return;svg.classList.remove('is-active');for(const p of svg.querySelectorAll('path'))p.removeAttribute('d');const dot=svg.querySelector('.ps-trajectory-landing');if(dot){dot.removeAttribute('cx');dot.removeAttribute('cy');}}
function drawTrajectory(root,play,kind,to,duration=900){const svg=root?.querySelector?.('.ps-trajectory');if(!svg||!to)return;const g=trajectoryGeometry(play,kind,to),flight=svg.querySelector('.ps-trajectory-flight'),glow=svg.querySelector('.ps-trajectory-glow'),dot=svg.querySelector('.ps-trajectory-landing');for(const p of [flight,glow])p?.setAttribute('d',g.d);if(dot){dot.setAttribute('cx',String(to[0]));dot.setAttribute('cy',String(to[1]));}svg.style.setProperty('--ps-traj-ms',`${Math.max(280,duration)}ms`);svg.classList.remove('is-active');void svg.getBoundingClientRect();svg.classList.add('is-active');}
function animateHitBall(root,from,to,play,kind,duration=900,arc=true){drawTrajectory(root,play,kind,to,duration);return animateBall(root,from,to,duration,arc);}
'''
s=s.replace(marker,helpers+marker,1)

# Ball landing and fielder tracking are now separate. A HR fielder tracks to the wall,
# while the ball/blue line continue to the projected landing point beyond the fence.
old="async function animatePlay(root,s){if(!root?.isConnected||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const kind=s.kind,play=s.play,batter=batterActor(root,s.batter.id),pitcher=defenderActor(root,'P',s.pitcher.id),target=hitTarget(play,kind),fielder=nearestFielder(s.defenders,target),fEl=fielder?defenderActor(root,fielder.pos,fielder.id):null;root.querySelectorAll('.ps-chibi').forEach(x=>x.getAnimations().forEach(a=>a.cancel()));"
new="async function animatePlay(root,s){if(!root?.isConnected||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const kind=s.kind,play=s.play,batter=batterActor(root,s.batter.id),pitcher=defenderActor(root,'P',s.pitcher.id),target=hitTarget(play,kind),fieldTarget=defensiveHitTarget(play,kind,target),fielder=nearestFielder(s.defenders,fieldTarget),fEl=fielder?defenderActor(root,fielder.pos,fielder.id):null;root.querySelectorAll('.ps-chibi').forEach(x=>x.getAnimations().forEach(a=>a.cancel()));clearTrajectory(root);"
if old not in s: raise SystemExit('animatePlay header marker missing')
s=s.replace(old,new,1)
old="const air=['fly_out','fly_ball','line_out','home_run','double','triple'].includes(kind);const ballP=animateBall(root,[50,86],target,air?1050:720,air);const fieldP=fEl?animateMove(fEl,target,air?900:650):Promise.resolve();"
new="const air=['fly_out','fly_ball','line_out','home_run','double','triple'].includes(kind);const ballP=animateHitBall(root,[50,86],target,play,kind,air?1050:720,air);const fieldP=fEl?animateMove(fEl,fieldTarget,air?900:650):Promise.resolve();"
if old not in s: raise SystemExit('batted-ball animation marker missing')
s=s.replace(old,new,1)
# Ground-ball throw originates from where the fielder actually tracked.
s=s.replace('let from=target,thrower=fEl;','let from=fieldTarget,thrower=fEl;',1)

# Export projection helpers for regression testing.
old='export const __MLB_PLAYSTAGE_V901_TEST__={playKind,hitTarget,endBase,headline,currentState,playerImg,teamLogo,DEF_POS,BASE_POS};'
new='export const __MLB_PLAYSTAGE_V901_TEST__={playKind,hitTarget,defensiveHitTarget,sprayAngle,trajectoryGeometry,hitDataFor,endBase,headline,currentState,playerImg,teamLogo,DEF_POS,BASE_POS};'
if old not in s: raise SystemExit('test export marker missing')
s=s.replace(old,new,1)
CORE.write_text(s)

# Add the visible blue trajectory treatment to the existing team-color layer.
concept=Path('sports/mlb/playstage-concept-v917.js')
c=concept.read_text()
css=r'''
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
'''
needle='\n`;\n  document.head.appendChild(s);'
if needle not in c: raise SystemExit('concept style closing marker missing')
c=c.replace(needle,css+needle,1)
concept.write_text(c)

# Cache-bust core and concept without touching NFL/NHL versions.
router=Path('sports/router.js')
r=router.read_text()
r2,n=re.subn(r"import\('\./mlb/playstage-v901\.js\?v=[^']+'\)","import('./mlb/playstage-v901.js?v=90.44')",r,count=1)
if n!=1: raise SystemExit('core router import not found')
r=r2
r2,n=re.subn(r"import\('\./mlb/playstage-concept-v917\.js\?v=[^']+'\)","import('./mlb/playstage-concept-v917.js?v=91.71')",r,count=1)
if n!=1: raise SystemExit('v917 router import not found')
router.write_text(r2)

index=Path('index.html')
i=index.read_text()
i2,n=re.subn(r'\./sports/router\.js\?v=[A-Za-z0-9._-]+','./sports/router.js?v=90.44',i,count=1)
if n!=1: raise SystemExit('index router import not found')
index.write_text(i2)

# Keep existing MLB regression version checks current.
for name in ['scripts/mlb-playstage-selftest.mjs','scripts/mlb-playstage-v916-selftest.mjs','scripts/mlb-v916-runner-isolation-selftest.mjs','scripts/mlb-v917-actor-role-selftest.mjs']:
    p=Path(name)
    if not p.exists(): continue
    t=p.read_text().replace('playstage-v901.js?v=90.43','playstage-v901.js?v=90.44').replace('sports/router.js?v=90.43','sports/router.js?v=90.44').replace('playstage-concept-v917.js?v=91.70','playstage-concept-v917.js?v=91.71')
    p.write_text(t)

print('Applied MLB v918 distance/spray projection and blue trajectory line')
