from pathlib import Path

p=Path('scripts/mlb-v916-simulation.mjs')
s=p.read_text()
old="""      defense:a.filter(x=>!x.classList.contains('ps-batter')&&!x.classList.contains('ps-runner')).length,
      batter:a.filter(x=>x.classList.contains('ps-batter')).length,
      runners:a.filter(x=>x.classList.contains('ps-runner')).length,
      visible:a.filter(x=>parseFloat(getComputedStyle(x).opacity)>.01).length,
"""
new="""      defense:a.filter(x=>!x.classList.contains('ps-batter')&&!x.classList.contains('ps-runner')).length,
      defenderState:a.filter(x=>!x.classList.contains('ps-batter')&&!x.classList.contains('ps-runner')).map(x=>({id:x.dataset.playerId||'',role:x.dataset.actorRole||x.dataset.pos||'',left:parseFloat(x.style.left)||0,top:parseFloat(x.style.top)||0,opacity:parseFloat(getComputedStyle(x).opacity)||0})),
      batter:a.filter(x=>x.classList.contains('ps-batter')).length,
      runners:a.filter(x=>x.classList.contains('ps-runner')).length,
      visible:a.filter(x=>parseFloat(getComputedStyle(x).opacity)>.01).length,
"""
if old not in s: raise SystemExit('start metadata marker missing')
s=s.replace(old,new,1)
old="""    return {defense:a.filter(x=>!x.classList.contains('ps-batter')&&!x.classList.contains('ps-runner')).length,batter:a.filter(x=>x.classList.contains('ps-batter')).length,runners:a.filter(x=>x.classList.contains('ps-runner')).length,visible:a.filter(x=>parseFloat(getComputedStyle(x).opacity)>.01).length};
"""
new="""    return {defense:a.filter(x=>!x.classList.contains('ps-batter')&&!x.classList.contains('ps-runner')).length,defenderState:a.filter(x=>!x.classList.contains('ps-batter')&&!x.classList.contains('ps-runner')).map(x=>({id:x.dataset.playerId||'',role:x.dataset.actorRole||x.dataset.pos||'',left:parseFloat(x.style.left)||0,top:parseFloat(x.style.top)||0,opacity:parseFloat(getComputedStyle(x).opacity)||0})),batter:a.filter(x=>x.classList.contains('ps-batter')).length,runners:a.filter(x=>x.classList.contains('ps-runner')).length,visible:a.filter(x=>parseFloat(getComputedStyle(x).opacity)>.01).length};
"""
if old not in s: raise SystemExit('end metadata marker missing')
s=s.replace(old,new,1)
old="""if(metadata.start?.defense!==9||metadata.start?.batter!==1||metadata.start?.visible<10) throw new Error(`v916 actor validation failed: ${JSON.stringify(metadata)}`);
fs.writeFileSync(path.join(outDir,'mlb-gamecast-showcase.json'),JSON.stringify(metadata,null,2));
"""
new="""if(metadata.start?.defense!==9||metadata.start?.batter!==1||metadata.start?.visible<10) throw new Error(`v916 actor validation failed: ${JSON.stringify(metadata)}`);
if(metadata.end?.defense!==9) throw new Error(`v916 defender count changed: ${JSON.stringify(metadata.end)}`);
const startById=new Map((metadata.start?.defenderState||[]).map(x=>[String(x.id),x]));
const misplaced=(metadata.end?.defenderState||[]).filter(x=>{const start=startById.get(String(x.id));return !start||x.opacity<=.01||Math.hypot(x.left-start.left,x.top-start.top)>.75;});
if(misplaced.length) throw new Error(`Defenders left defensive positions after scoring play: ${JSON.stringify(misplaced)}`);
const homeIntruders=(metadata.end?.defenderState||[]).filter(x=>x.role!=='C'&&Math.hypot(x.left-50,x.top-90)<8);
if(homeIntruders.length) throw new Error(`Non-catcher defenders entered home-plate scoring path: ${JSON.stringify(homeIntruders)}`);
metadata.defenderIsolation={passed:true,checked:metadata.end.defenderState.length};
fs.writeFileSync(path.join(outDir,'mlb-gamecast-showcase.json'),JSON.stringify(metadata,null,2));
"""
if old not in s: raise SystemExit('validation marker missing')
s=s.replace(old,new,1)
p.write_text(s)
print('Added defender position guard to MLB v916 simulation')
