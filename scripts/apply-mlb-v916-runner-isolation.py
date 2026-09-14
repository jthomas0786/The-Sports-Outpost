from pathlib import Path
import re

core=Path('sports/mlb/playstage-v901.js')
s=core.read_text()
old="function actor(root,id){return root.querySelector(`.ps-chibi[data-player-id=\"${CSS.escape(String(id||''))}\"]`);}\n"
new="function actor(root,id){return root.querySelector(`.ps-chibi[data-player-id=\"${CSS.escape(String(id||''))}\"]`);}\nfunction offenseActor(root,id,{allowBatter=true}={}){const key=CSS.escape(String(id||''));const selectors=[`.ps-chibi.ps-runner[data-player-id=\"${key}\"]`];if(allowBatter)selectors.push(`.ps-chibi.ps-batter[data-player-id=\"${key}\"]`);return root.querySelector(selectors.join(','));}\n"
if old not in s: raise SystemExit('actor marker missing')
s=s.replace(old,new,1)
old="async function animateRunnerMoves(root,s,{excludeBatter=true}={}){const moves=runnerMoves(s.play).filter(m=>m.end);const jobs=[];for(const m of moves){if(excludeBatter&&String(m.id)===String(s.batter.id))continue;const el=actor(root,m.id),dest=BASE_POS[m.end];if(!el||!dest)continue;jobs.push(animateMove(el,dest,650).then(async()=>{if(m.isOut){setClass(el,'ps-out');await pause(220);}else if(m.end==='home'){const a=el.animate([{opacity:1},{opacity:.15}],{duration:260,fill:'forwards'});await a.finished.catch(()=>{});}}));}await Promise.all(jobs);}\n"
new="async function animateRunnerMoves(root,s,{excludeBatter=true}={}){const moves=runnerMoves(s.play).filter(m=>m.end),defensiveIds=new Set((s.defenders||[]).map(p=>String(p?.id||'')).filter(Boolean));const jobs=[];for(const m of moves){const id=String(m.id||'');if(!id||defensiveIds.has(id))continue;if(excludeBatter&&id===String(s.batter.id))continue;const el=offenseActor(root,id,{allowBatter:!excludeBatter}),dest=BASE_POS[m.end];if(!el||!dest||(!el.classList.contains('ps-runner')&&!el.classList.contains('ps-batter')))continue;jobs.push(animateMove(el,dest,650).then(async()=>{if(m.isOut){setClass(el,'ps-out');await pause(220);}else if(m.end==='home'){const a=el.animate([{opacity:1},{opacity:.15}],{duration:260,fill:'forwards'});await a.finished.catch(()=>{});}}));}await Promise.all(jobs);}\n"
if old not in s: raise SystemExit('runner animation marker missing')
s=s.replace(old,new,1)
old="if(kind==='home_run'){const runnerP=animateRunnerMoves(root,s);for(const p of [BASE_POS.first,BASE_POS.second,BASE_POS.third,BASE_POS.home])await animateMove(batter,p,480);await runnerP;return;}"
new="if(kind==='home_run'){const runnerP=animateRunnerMoves(root,s);for(const p of [BASE_POS.first,BASE_POS.second,BASE_POS.third,BASE_POS.home])await animateMove(batter,p,480);await runnerP;if(fEl&&fielder?.pos&&DEF_POS[fielder.pos])await animateMove(fEl,DEF_POS[fielder.pos],420);return;}"
if old not in s: raise SystemExit('home run marker missing')
s=s.replace(old,new,1)
core.write_text(s)

router=Path('sports/router.js')
r=router.read_text()
r2,n=re.subn(r"import\('\./mlb/playstage-v901\.js\?v=[^']+'\)","import('./mlb/playstage-v901.js?v=90.42')",r,count=1)
if n!=1: raise SystemExit('router playstage import missing')
router.write_text(r2)

index=Path('index.html')
i=index.read_text()
i2,n=re.subn(r'\./sports/router\.js\?v=[A-Za-z0-9._-]+','./sports/router.js?v=90.42',i,count=1)
if n!=1: raise SystemExit('index router cache marker missing')
index.write_text(i2)

p=Path('scripts/mlb-playstage-selftest.mjs')
t=p.read_text()
t2,n=re.subn(r'\.\/mlb\/playstage-v901\.js\?v=[0-9.]+','./mlb/playstage-v901.js?v=90.42',t,count=1)
if n!=1: raise SystemExit('MLB selftest router version marker missing')
p.write_text(t2)

p=Path('scripts/mlb-playstage-v916-selftest.mjs')
t=p.read_text()
t=t.replace("./sports/router.js?v=90.41","./sports/router.js?v=90.42")
if "./sports/router.js?v=90.42" not in t: raise SystemExit('v916 index version marker missing')
p.write_text(t)

print('Applied MLB v916 runner isolation and defensive reset')
