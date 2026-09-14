from pathlib import Path

p=Path('scripts/mlb-v916-simulation.mjs')
s=p.read_text()

if "simulationVersion:'v918'" in s:
    print('MLB simulation recorder already v918')
    raise SystemExit(0)

s=s.replace("mlb-v917-simulation.html","mlb-v918-simulation.html")
s=s.replace('?v=sim917','?v=sim918')
s=s.replace("tso-mlb-v917-sim","tso-mlb-v918-sim")
s=s.replace("simulationVersion:'v917'","simulationVersion:'v918'")
s=s.replace("http://127.0.0.1:4173/mlb-v917-simulation.html","http://127.0.0.1:4173/mlb-v918-simulation.html")

needle="""  metadata.start=await page.evaluate(()=>{
    const a=[...document.querySelectorAll('.ps-chibi')],take=x=>({id:x.dataset.playerId||'',kind:x.dataset.actorKind||'',role:x.dataset.actorRole||'',team:x.dataset.team||'',base:x.dataset.base||'',left:parseFloat(x.style.left)||0,top:parseFloat(x.style.top)||0,opacity:parseFloat(getComputedStyle(x).opacity)||0,c1:getComputedStyle(x).getPropertyValue('--c1').trim(),c2:getComputedStyle(x).getPropertyValue('--c2').trim()});
"""
if needle not in s: raise SystemExit('start metadata marker missing')

wait_marker="  await page.waitForTimeout(7800);"
if wait_marker not in s: raise SystemExit('simulation wait marker missing')
trajectory="""  await page.waitForSelector('.ps-trajectory.is-active',{timeout:15000});
  await page.waitForTimeout(520);
  metadata.trajectory=await page.evaluate(()=>{
    const svg=document.querySelector('.ps-trajectory'),line=document.querySelector('.ps-trajectory-flight'),glow=document.querySelector('.ps-trajectory-glow'),dot=document.querySelector('.ps-trajectory-landing');
    const cs=line?getComputedStyle(line):null;
    return {
      active:!!svg?.classList.contains('is-active'),
      path:line?.getAttribute('d')||'',
      glowPath:glow?.getAttribute('d')||'',
      stroke:cs?.stroke||'',
      strokeWidth:cs?.strokeWidth||'',
      landing:{x:Number(dot?.getAttribute('cx')),y:Number(dot?.getAttribute('cy'))},
      landingOpacity:dot?Number(getComputedStyle(dot).opacity):0
    };
  });
"""
s=s.replace(wait_marker,trajectory+wait_marker,1)

validation_marker="if(metadata.start?.defense!==9||metadata.start?.batter!==1||metadata.start?.runners!==2||metadata.start?.offensiveActors!==3)"
idx=s.find(validation_marker)
if idx<0: raise SystemExit('validation marker missing')
traj_validation="""if(metadata.simulationVersion!=='v918') throw new Error('Simulation recorder did not upgrade to v918');
if(!metadata.trajectory?.active||!metadata.trajectory?.path) throw new Error(`Blue trajectory was not rendered: ${JSON.stringify(metadata.trajectory)}`);
if(metadata.trajectory.path!==metadata.trajectory.glowPath) throw new Error('Trajectory glow and flight line must follow the same path');
if(!/45, 127, 255|45,127,255|#2d7fff/i.test(String(metadata.trajectory.stroke))) throw new Error(`Trajectory is not Sports Outpost blue: ${metadata.trajectory.stroke}`);
if(!(metadata.trajectory.landing?.x>55&&metadata.trajectory.landing?.y<32)) throw new Error(`Home-run landing is not deep right field: ${JSON.stringify(metadata.trajectory.landing)}`);
if(!String(metadata.start?.metrics?.[2]||'').includes('357 FT')) throw new Error(`Expected 357 FT showcase homer: ${JSON.stringify(metadata.start?.metrics)}`);
metadata.hitProjection={passed:true,landing:metadata.trajectory.landing,deepRight:true,trajectoryBlue:true};
"""
s=s[:idx]+traj_validation+s[idx:]
s=s.replace("console.log('MLB v917 simulation complete',metadata);","console.log('MLB v918 simulation complete',metadata);")
p.write_text(s)
print('Upgraded MLB simulation recorder to v918 landing + blue trajectory QA')
