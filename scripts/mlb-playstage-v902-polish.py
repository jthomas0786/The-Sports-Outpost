from pathlib import Path
import re

play=Path('sports/mlb/playstage-v901.js')
s=play.read_text()

def one(old,new,label):
    global s
    if old not in s:
        raise SystemExit(f'{label} marker missing')
    s=s.replace(old,new,1)

one(
"function endBase(play){const runners=play?.runners||[];const move=runners.map(r=>r?.movement?.end).filter(Boolean).at(-1);if(move)return String(move).toLowerCase();const desc=String(play?.result?.description||'').toLowerCase();if(desc.includes('to second'))return'second';if(desc.includes('to third'))return'third';if(desc.includes('home'))return'home';return'first';}",
"""function endBase(play){const runners=play?.runners||[];const move=runners.map(r=>r?.movement?.end).filter(Boolean).at(-1);if(move)return baseKey(move)||'first';const desc=String(play?.result?.description||'').toLowerCase();if(desc.includes('to second'))return'second';if(desc.includes('to third'))return'third';if(desc.includes('home'))return'home';return'first';}
function baseKey(v){const x=String(v||'').trim().toLowerCase();if(!x)return'';if(x==='1b'||x.includes('first'))return'first';if(x==='2b'||x.includes('second'))return'second';if(x==='3b'||x.includes('third'))return'third';if(x==='score'||x==='home'||x.includes('home'))return'home';return'';}
function runnerMoves(play){return (play?.runners||[]).map(r=>({id:r?.details?.runner?.id||r?.details?.runner?.person?.id||null,name:r?.details?.runner?.fullName||'',start:baseKey(r?.movement?.start),end:baseKey(r?.movement?.end),isOut:!!r?.movement?.isOut,event:r?.details?.event||''})).filter(r=>r.id);}
function currentRunners(feed,side,batterId){const o=feed?.liveData?.linescore?.offense||{};return [['first',o.first],['second',o.second],['third',o.third]].map(([base,person])=>person?.id?{...playerFromFeed(feed,side,person),base}:null).filter(r=>r&&String(r.id)!==String(batterId||''));}
function seedRunners(s,prePlay){if(prePlay){const seen=new Set(),seeded=[];for(const m of runnerMoves(s.play)){if(!m.start||m.start==='home'||String(m.id)===String(s.batter.id)||seen.has(String(m.id)))continue;seeded.push({...playerFromFeed(s.feed,s.off,{id:m.id,fullName:m.name}),base:m.start});seen.add(String(m.id));}if(seeded.length)return seeded;}return s.runners||[];}""",
'endBase')

one('defenders:fielders(feed,def),ls,venue:', 'defenders:fielders(feed,def),runners:currentRunners(feed,off,batter.id),ls,venue:', 'currentState runners')

start=s.find('function stageHTML(s){')
end=s.find('\nfunction rootHTML(s)',start)
if start<0 or end<0: raise SystemExit('stageHTML block missing')
stage="""function stageHTML(s,{prePlay=false}={}){const defTeam=s[s.def],offTeam=s[s.off];const catcher=s.defenders.find(x=>x.pos==='C');const pitcher=s.defenders.find(x=>x.pos==='P')||s.pitcher;const runners=seedRunners(s,prePlay);const batPos=String(s.batter?.bats||'').toUpperCase()==='L'?[54,86]:[46,86];return`<div class="ps-stage" data-play-id="${esc(playId(s.play))}"><div class="ps-sky"></div><div class="ps-lights"></div><div class="ps-wall" data-venue="${esc(s.venue)}"></div><div class="ps-grass"></div><div class="ps-infield"></div><div class="ps-infield-grass"></div><div class="ps-mound"></div><div class="ps-foul left"></div><div class="ps-foul right"></div><i class="ps-base b1"></i><i class="ps-base b2"></i><i class="ps-base b3"></i><i class="ps-home"></i>${s.defenders.filter(p=>p.pos!=='C'&&p.pos!=='P').map(p=>chibiHTML(p,defTeam,DEF_POS[p.pos])).join('')}${pitcher?chibiHTML(pitcher,defTeam,DEF_POS.P,'ps-pitcher'):''}${catcher?chibiHTML(catcher,defTeam,DEF_POS.C,'ps-catcher'):''}${runners.filter(r=>BASE_POS[r.base]).map(r=>chibiHTML(r,offTeam,BASE_POS[r.base],'ps-runner')).join('')}${chibiHTML(s.batter,offTeam,batPos,'ps-batter')}<div class="ps-ball"></div><div class="ps-balltrail"></div><div class="ps-callout">${esc(s.description)}</div><div class="ps-truth">Schematic reconstruction · official MLB play data · not optical player tracking</div></div>`;}
"""
s=s[:start]+stage+s[end+1:]

one('function rootHTML(s){','function rootHTML(s,opts={}){','rootHTML signature')
one('${stageHTML(s)}','${stageHTML(s,opts)}','stageHTML call')

start=s.find("function animateMove(el,to,duration=900")
end=s.find('\nfunction animateBall(',start)
if start<0 or end<0: raise SystemExit('animateMove block missing')
move="""function animateMove(el,to,duration=900,easing='cubic-bezier(.2,.75,.2,1)'){if(!el||!to)return Promise.resolve();const from=xy(el),stage=el.closest('.ps-stage'),rect=stage?.getBoundingClientRect?.()||{width:700,height:560};const dx=(to[0]-from[0])*rect.width/100,dy=(to[1]-from[1])*rect.height/100;setClass(el,'ps-running',true);const a=el.animate([{transform:'translate(-50%,-56%) translate(0,0)'},{transform:`translate(-50%,-56%) translate(${dx}px,${dy}px)`}],{duration,easing,fill:'forwards'});return a.finished.catch(()=>{}).then(()=>{el.style.left=`${to[0]}%`;el.style.top=`${to[1]}%`;el.style.transform='translate(-50%,-56%)';a.cancel();setClass(el,'ps-running',false);});}
"""
s=s[:start]+move+s[end+1:]

start=s.find('function animateBall(root,from,to,duration=800,arc=true){')
end=s.find('\nfunction pause(',start)
if start<0 or end<0: raise SystemExit('animateBall block missing')
ball="""function animateBall(root,from,to,duration=800,arc=true){const b=root.querySelector('.ps-ball'),stage=root.querySelector('.ps-stage');if(!b)return Promise.resolve();b.style.left=`${from[0]}%`;b.style.top=`${from[1]}%`;b.style.opacity='1';const rect=stage?.getBoundingClientRect?.()||{width:700,height:560},dx=(to[0]-from[0])*rect.width/100,dy=(to[1]-from[1])*rect.height/100,apex=Math.min(110,Math.max(38,Math.abs(dx)*.16+Math.abs(dy)*.08));const frames=arc?[{transform:'translate(-50%,-50%) translate(0,0) scale(1)'},{offset:.5,transform:`translate(-50%,-50%) translate(${dx*.5}px,${dy*.5-apex}px) scale(1.35)`},{transform:`translate(-50%,-50%) translate(${dx}px,${dy}px) scale(.9)`}]:[{transform:'translate(-50%,-50%) translate(0,0)'},{transform:`translate(-50%,-50%) translate(${dx}px,${dy}px)`}];const a=b.animate(frames,{duration,easing:'cubic-bezier(.2,.6,.18,1)',fill:'forwards'});return a.finished.catch(()=>{}).then(()=>{b.style.opacity='0';a.cancel();});}
"""
s=s[:start]+ball+s[end+1:]

start=s.find('async function animatePlay(root,s){')
end=s.find('\n}\n\nasync function fetchFeed',start)
if start<0 or end<0: raise SystemExit('animatePlay block missing')
animation="""async function animateRunnerMoves(root,s,{excludeBatter=true}={}){const moves=runnerMoves(s.play).filter(m=>m.end);const jobs=[];for(const m of moves){if(excludeBatter&&String(m.id)===String(s.batter.id))continue;const el=actor(root,m.id),dest=BASE_POS[m.end];if(!el||!dest)continue;jobs.push(animateMove(el,dest,650).then(async()=>{if(m.isOut){setClass(el,'ps-out');await pause(220);}else if(m.end==='home'){const a=el.animate([{opacity:1},{opacity:.15}],{duration:260,fill:'forwards'});await a.finished.catch(()=>{});}}));}await Promise.all(jobs);}
function outBaseSequence(s){const bases=[];for(const m of runnerMoves(s.play)){if(!m.isOut||!m.end||m.end==='home')continue;if(!bases.includes(m.end))bases.push(m.end);}if(!bases.length&&['ground_out','double_play'].includes(s.kind))bases.push(endBase(s.play)||'first');if(s.kind==='double_play'&&!bases.includes('first'))bases.push('first');return bases;}
function nearestFielderAt(def,base,excludeId=''){const target=BASE_POS[base];if(!target)return null;let best=null,dist=1e9;for(const p of def){if(String(p.id)===String(excludeId))continue;const at=DEF_POS[p.pos];if(!at)continue;const d=Math.hypot(at[0]-target[0],at[1]-target[1]);if(d<dist){dist=d;best=p;}}return best;}
async function animatePlay(root,s){if(!root?.isConnected||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const kind=s.kind,play=s.play,batter=actor(root,s.batter.id),pitcher=actor(root,s.pitcher.id),target=hitTarget(play,kind),fielder=nearestFielder(s.defenders,target),fEl=fielder?actor(root,fielder.id):null;root.querySelectorAll('.ps-chibi').forEach(x=>x.getAnimations().forEach(a=>a.cancel()));
 setClass(pitcher,'ps-windup');await pause(180);setClass(pitcher,'ps-throwing');await animateBall(root,DEF_POS.P,[50,86],520,false);setClass(pitcher,'ps-throwing',false);setClass(pitcher,'ps-windup',false);
 if(kind==='steal'){await animateRunnerMoves(root,s,{excludeBatter:false});return;}
 if(['walk','hbp'].includes(kind)){await animateRunnerMoves(root,s,{excludeBatter:false});const bm=runnerMoves(play).find(m=>String(m.id)===String(s.batter.id));if(!bm&&batter)await animateMove(batter,BASE_POS.first,650);return;}
 if(['strikeout','pitch'].includes(kind))return;
 setClass(batter,'ps-swing');await pause(160);const air=['fly_out','fly_ball','line_out','home_run','double','triple'].includes(kind);const ballP=animateBall(root,[50,86],target,air?1050:720,air);const fieldP=fEl?animateMove(fEl,target,air?900:650):Promise.resolve();await Promise.all([ballP,fieldP]);setClass(batter,'ps-swing',false);
 if(fEl&&['fly_out','line_out'].includes(kind)){setClass(fEl,'ps-catching');await pause(540);setClass(fEl,'ps-catching',false);await animateRunnerMoves(root,s);return;}
 if(kind==='home_run'){const runnerP=animateRunnerMoves(root,s);for(const p of [BASE_POS.first,BASE_POS.second,BASE_POS.third,BASE_POS.home])await animateMove(batter,p,480);await runnerP;return;}
 if(['single','double','triple'].includes(kind)){const bm=runnerMoves(play).find(m=>String(m.id)===String(s.batter.id));const base=bm?.end||(kind==='single'?'first':kind==='double'?'second':'third');await Promise.all([animateMove(batter,BASE_POS[base],780),animateRunnerMoves(root,s)]);return;}
 if(['ground_out','double_play','ground_ball'].includes(kind)&&fEl){const runnerP=animateRunnerMoves(root,s);let from=target,thrower=fEl;for(const base of outBaseSequence(s)){const dest=BASE_POS[base];if(!dest)continue;const receiver=nearestFielderAt(s.defenders,base,thrower?.dataset?.playerId),rEl=receiver?actor(root,receiver.id):null;if(rEl)await animateMove(rEl,dest,380);setClass(thrower,'ps-throwing');await animateBall(root,from,dest,520,false);setClass(thrower,'ps-throwing',false);thrower=rEl||thrower;from=dest;}const bm=runnerMoves(play).find(m=>String(m.id)===String(s.batter.id));if(!bm&&batter)await animateMove(batter,BASE_POS.first,720);await runnerP;}
}
"""
s=s[:start]+animation+s[end+2:]

media='@media(max-width:1180px){'
if media not in s: raise SystemExit('media marker missing')
extra="""html[data-sport=\"mlb\"] .ps-chibi.ps-runner{width:47px;height:70px;z-index:12}.ps-runner .ps-chibi-cap,.ps-batter .ps-chibi-cap{height:14px;border-radius:50% 50% 7px 7px;box-shadow:0 2px 0 var(--c2),0 3px 4px rgba(0,0,0,.35)}.ps-catcher .ps-chibi-body{background:linear-gradient(90deg,var(--c1),#111827 20% 80%,var(--c1));border-color:#0b1220}.ps-catcher .ps-chibi-head{border-color:#111827;box-shadow:inset 0 0 0 2px rgba(255,255,255,.18),0 2px 5px rgba(0,0,0,.45)}.ps-chibi.ps-out{opacity:.28;filter:grayscale(.55) drop-shadow(0 3px 3px rgba(0,0,0,.25))}.ps-chibi.ps-windup .ps-chibi-leg.l{animation:psWindupLeg .42s ease-in-out}.ps-chibi.ps-windup .ps-chibi-body{animation:psWindupBody .42s ease-in-out}
"""
s=s.replace(media,extra+media,1)
if '@keyframes psPulse{' not in s: raise SystemExit('keyframe marker missing')
s=s.replace('@keyframes psPulse{','@keyframes psWindupLeg{0%{transform:rotate(4deg)}55%{transform:rotate(-58deg) translateY(-4px)}100%{transform:rotate(8deg)}}@keyframes psWindupBody{0%{transform:translateX(-50%) rotate(0)}55%{transform:translateX(-50%) rotate(-8deg)}100%{transform:translateX(-50%) rotate(4deg)}}@keyframes psPulse{',1)
one('shell.innerHTML=rootHTML(snap);root=shell.querySelector(`.${ROOT_CLASS}`);','shell.innerHTML=rootHTML(snap,{prePlay:shouldAnimate});root=shell.querySelector(`.${ROOT_CLASS}`);','preplay render')

play.write_text(s)

router=Path('sports/router.js')
r=router.read_text()
if "./mlb/playstage-v901.js?v=90.2" not in r: raise SystemExit('router v90.2 marker missing')
router.write_text(r.replace("./mlb/playstage-v901.js?v=90.2","./mlb/playstage-v901.js?v=90.3",1))

selftest=Path('scripts/mlb-playstage-selftest.mjs')
t=selftest.read_text()
if "./mlb/playstage-v901.js?v=90.2" not in t: raise SystemExit('selftest v90.2 marker missing')
t=t.replace("./mlb/playstage-v901.js?v=90.2","./mlb/playstage-v901.js?v=90.3",1)
insert="""\nfor(const marker of ['runnerMoves','currentRunners','seedRunners','ps-runner','ps-windup','outBaseSequence','nearestFielderAt','getBoundingClientRect']) assert.ok(src.includes(marker),`PlayStage polish missing ${marker}`);\n"""
if 'PlayStage polish missing' not in t:
    t=t.replace("const router=fs.readFileSync",insert+"\nconst router=fs.readFileSync",1)
selftest.write_text(t)

index=Path('index.html')
i=index.read_text()
i,n=re.subn(r'(\./sports/router\.js\?v=)[A-Za-z0-9._-]+',r'\g<1>90.9',i,count=1)
if n!=1: raise SystemExit('outer router marker missing')
index.write_text(i)

print('MLB PlayStage v902 polish applied')
