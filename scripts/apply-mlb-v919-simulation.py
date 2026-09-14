from pathlib import Path

p=Path('scripts/mlb-v916-simulation.mjs')
s=p.read_text()
s=s.replace('v918','v919').replace('sim918','sim919').replace('mlb-v918-simulation.html','mlb-v919-simulation.html').replace('tso-mlb-v918-sim','tso-mlb-v919-sim')

old="""const svg=document.querySelector('.ps-trajectory'),line=document.querySelector('.ps-trajectory-flight'),glow=document.querySelector('.ps-trajectory-glow'),dot=document.querySelector('.ps-trajectory-landing');
    const cs=line?getComputedStyle(line):null;
    return {
      active:!!svg?.classList.contains('is-active'),
      path:line?.getAttribute('d')||'',
      glowPath:glow?.getAttribute('d')||'',
      stroke:cs?.stroke||'',
      strokeWidth:cs?.strokeWidth||'',
      landing:{x:Number(dot?.getAttribute('cx')),y:Number(dot?.getAttribute('cy'))},
      landingOpacity:dot?Number(getComputedStyle(dot).opacity):0
    };"""
new="""const svg=document.querySelector('.ps-trajectory'),line=document.querySelector('.ps-trajectory-flight'),glow=document.querySelector('.ps-trajectory-glow'),head=document.querySelector('.ps-trajectory-head'),dot=document.querySelector('.ps-trajectory-landing'),ball=document.querySelector('.ps-ball'),rf=document.querySelector('.ps-chibi[data-actor-kind=\"defender\"][data-actor-role=\"RF\"]'),stage=document.querySelector('.ps-stage');
    const cs=line?getComputedStyle(line):null,rr=rf?.getBoundingClientRect(),sr=stage?.getBoundingClientRect();
    return {
      active:!!svg?.classList.contains('is-active'),
      path:line?.getAttribute('d')||'',glowPath:glow?.getAttribute('d')||'',
      stroke:cs?.stroke||'',strokeWidth:cs?.strokeWidth||'',strokeDasharray:cs?.strokeDasharray||'',
      landing:{x:Number(dot?.getAttribute('cx')),y:Number(dot?.getAttribute('cy'))},landingOpacity:dot?Number(getComputedStyle(dot).opacity):0,
      head:{x:Number(head?.getAttribute('cx')),y:Number(head?.getAttribute('cy')),opacity:head?Number(getComputedStyle(head).opacity):0},
      ball:{x:parseFloat(ball?.style.left)||0,y:parseFloat(ball?.style.top)||0,opacity:ball?Number(getComputedStyle(ball).opacity):0},
      rightFielder:rr&&sr?{x:((rr.left+rr.width/2-sr.left)/sr.width)*100,y:((rr.top+rr.height/2-sr.top)/sr.height)*100}:null
    };"""
if old not in s: raise SystemExit('trajectory capture block missing')
s=s.replace(old,new,1)

needle="if(metadata.trajectory.path!==metadata.trajectory.glowPath) throw new Error('Trajectory glow and flight line must follow the same path');"
extra="""
if(!metadata.trajectory?.head||metadata.trajectory.head.opacity<=0) throw new Error(`Moving trajectory glow head is not visible: ${JSON.stringify(metadata.trajectory?.head)}`);
if(Math.hypot(metadata.trajectory.head.x-metadata.trajectory.ball.x,metadata.trajectory.head.y-metadata.trajectory.ball.y)>.8) throw new Error(`Glow head is not following the baseball: ${JSON.stringify({head:metadata.trajectory.head,ball:metadata.trajectory.ball})}`);
if(metadata.trajectory.strokeDasharray&&metadata.trajectory.strokeDasharray!=='none'&&metadata.trajectory.strokeDasharray!=='0px') throw new Error(`Trajectory must be solid, not dashed/dotted: ${metadata.trajectory.strokeDasharray}`);
if(!metadata.trajectory.rightFielder||metadata.trajectory.rightFielder.y<34||metadata.trajectory.rightFielder.x>86) throw new Error(`Right fielder left playable outfield: ${JSON.stringify(metadata.trajectory.rightFielder)}`);
"""
if needle not in s: raise SystemExit('trajectory validation marker missing')
s=s.replace(needle,needle+extra,1)
s=s.replace("metadata.hitProjection={passed:true,landing:metadata.trajectory.landing,deepRight:true,trajectoryBlue:true};","metadata.hitProjection={passed:true,landing:metadata.trajectory.landing,deepRight:true,trajectoryBlue:true,solidTrail:true,glowFollowsBall:true,rightFielderPlayable:true};",1)
s=s.replace("console.log('MLB v919 simulation complete',metadata);","console.log('MLB v919 simulation complete',metadata);",1)
p.write_text(s)
print('Upgraded showcase recorder to MLB v919 fielder/trail QA')
