from pathlib import Path

p=Path('scripts/mlb-v916-simulation.mjs')
s=p.read_text()

def rep(old,new,label):
    global s
    if old not in s:
        raise SystemExit(f'{label}: marker missing')
    s=s.replace(old,new,1)

rep("const harness=path.join(root,'mlb-v916-simulation.html');","const harness=path.join(root,'mlb-v917-simulation.html');",'harness')
s=s.replace('?v=sim916','?v=sim917')
rep("import {installMlbPlaystageConceptV916} from '/sports/mlb/playstage-concept-v916.js?v=sim917';\ninstallMlbPlaystageV901();installMlbPlaystageConceptV904();installMlbPlaystageConceptV905();installMlbPlaystageConceptV906();installMlbPlaystageConceptV907();installMlbPlaystageConceptV908();installMlbPlaystageConceptV909();installMlbPlaystageConceptV910();installMlbPlaystageConceptV911();installMlbPlaystageConceptV912();installMlbPlaystageConceptV913();installMlbPlaystageConceptV914();installMlbPlaystageConceptV915();installMlbPlaystageConceptV916();",
"import {installMlbPlaystageConceptV916} from '/sports/mlb/playstage-concept-v916.js?v=sim917';\nimport {installMlbPlaystageConceptV917} from '/sports/mlb/playstage-concept-v917.js?v=sim917';\ninstallMlbPlaystageV901();installMlbPlaystageConceptV904();installMlbPlaystageConceptV905();installMlbPlaystageConceptV906();installMlbPlaystageConceptV907();installMlbPlaystageConceptV908();installMlbPlaystageConceptV909();installMlbPlaystageConceptV910();installMlbPlaystageConceptV911();installMlbPlaystageConceptV912();installMlbPlaystageConceptV913();installMlbPlaystageConceptV914();installMlbPlaystageConceptV915();installMlbPlaystageConceptV916();installMlbPlaystageConceptV917();",'v917 import')
rep("const videoDir=path.join('/tmp','tso-mlb-v916-sim');","const videoDir=path.join('/tmp','tso-mlb-v917-sim');",'video dir')
rep("let metadata={gamePk:picked.gamePk,selectedRunnerCount:picked.runnerCount};","let metadata={simulationVersion:'v917',gamePk:picked.gamePk,selectedRunnerCount:picked.runnerCount};",'metadata version')
rep("await page.goto('http://127.0.0.1:4173/mlb-v916-simulation.html',{waitUntil:'domcontentloaded'});\n  await page.waitForSelector('.tso-mlb-concept-v916',{timeout:30000});",
"await page.goto('http://127.0.0.1:4173/mlb-v917-simulation.html',{waitUntil:'domcontentloaded'});\n  await page.waitForSelector('.tso-mlb-concept-v917',{timeout:30000});",'page v917')

start=s.find("  await page.waitForFunction(()=>{")
end=s.find("  await page.waitForTimeout(7800);",start)
if start<0 or end<0: raise SystemExit('capture start block missing')
new_block="""  await page.waitForFunction(()=>{
    const root=document.querySelector('.tso-mlb-playstage-v901');
    const actors=[...document.querySelectorAll('.ps-chibi')];
    const defense=actors.filter(x=>x.dataset.actorKind==='defender');
    const runners=actors.filter(x=>x.dataset.actorKind==='runner');
    const batter=actors.filter(x=>x.dataset.actorKind==='batter');
    return root?.dataset?.actorRoles==='v917'&&defense.length===9&&batter.length===1&&runners.length===2;
  },{timeout:30000});
  metadata.start=await page.evaluate(()=>{
    const a=[...document.querySelectorAll('.ps-chibi')],take=x=>({id:x.dataset.playerId||'',kind:x.dataset.actorKind||'',role:x.dataset.actorRole||'',team:x.dataset.team||'',base:x.dataset.base||'',left:parseFloat(x.style.left)||0,top:parseFloat(x.style.top)||0,opacity:parseFloat(getComputedStyle(x).opacity)||0,c1:getComputedStyle(x).getPropertyValue('--c1').trim(),c2:getComputedStyle(x).getPropertyValue('--c2').trim()});
    const defenders=a.filter(x=>x.dataset.actorKind==='defender'),runners=a.filter(x=>x.dataset.actorKind==='runner'),batters=a.filter(x=>x.dataset.actorKind==='batter');
    return {
      defense:defenders.length,defenderState:defenders.map(take),
      batter:batters.length,batterState:batters.map(take),
      runners:runners.length,runnerState:runners.map(take),
      offensiveActors:runners.length+batters.length,
      visible:a.filter(x=>parseFloat(getComputedStyle(x).opacity)>.01).length,
      labels:a.map(x=>(x.querySelector('.ps-actor-label b')?.textContent||'').trim()),
      teams:[...new Set(a.map(x=>x.dataset.team).filter(Boolean))],
      headline:(document.querySelector('.ps-play-banner b')?.textContent||'').trim(),
      description:(document.querySelector('.ps-play-banner span:last-child')?.textContent||'').trim(),
      metrics:[...document.querySelectorAll('.ps-metric b')].map(x=>(x.textContent||'').trim())
    };
  });
"""
s=s[:start]+new_block+s[end:]

start=s.find("  metadata.end=await page.evaluate(()=>{")
end=s.find("  const video=page.video();",start)
if start<0 or end<0: raise SystemExit('capture end block missing')
end_block="""  metadata.end=await page.evaluate(()=>{
    const a=[...document.querySelectorAll('.ps-chibi')],take=x=>({id:x.dataset.playerId||'',kind:x.dataset.actorKind||'',role:x.dataset.actorRole||'',team:x.dataset.team||'',left:parseFloat(x.style.left)||0,top:parseFloat(x.style.top)||0,opacity:parseFloat(getComputedStyle(x).opacity)||0});
    const defenders=a.filter(x=>x.dataset.actorKind==='defender'),runners=a.filter(x=>x.dataset.actorKind==='runner'),batters=a.filter(x=>x.dataset.actorKind==='batter');
    return {defense:defenders.length,defenderState:defenders.map(take),batter:batters.length,batterState:batters.map(take),runners:runners.length,runnerState:runners.map(take),visible:a.filter(x=>parseFloat(getComputedStyle(x).opacity)>.01).length};
  });
"""
s=s[:start]+end_block+s[end:]

start=s.find("if(metadata.start?.defense!==9")
end=s.find("fs.writeFileSync(path.join(outDir,'mlb-gamecast-showcase.json')",start)
if start<0 or end<0: raise SystemExit('validation block missing')
validation="""if(metadata.start?.defense!==9||metadata.start?.batter!==1||metadata.start?.runners!==2||metadata.start?.offensiveActors!==3) throw new Error(`v917 actor validation failed: ${JSON.stringify(metadata.start)}`);
if(metadata.start.labels.filter(x=>x==='2B').length!==1) throw new Error(`Expected exactly one defensive 2B label: ${JSON.stringify(metadata.start.labels)}`);
if(metadata.start.labels.filter(x=>x==='RUN').length!==2||metadata.start.labels.filter(x=>x==='BAT').length!==1) throw new Error(`Offensive labels must be RUN/RUN/BAT: ${JSON.stringify(metadata.start.labels)}`);
if(metadata.start.teams.length!==2) throw new Error(`Expected two team identities: ${JSON.stringify(metadata.start.teams)}`);
const defColors=new Set((metadata.start.defenderState||[]).map(x=>`${x.c1}|${x.c2}`));
const offColors=new Set([...(metadata.start.runnerState||[]),...(metadata.start.batterState||[])].map(x=>`${x.c1}|${x.c2}`));
if(defColors.size!==1||offColors.size!==1||[...defColors][0]===[...offColors][0]) throw new Error(`Offense/defense team colors are not distinct: ${JSON.stringify({def:[...defColors],off:[...offColors]})}`);
if(metadata.end?.defense!==9) throw new Error(`v917 defender count changed: ${JSON.stringify(metadata.end)}`);
const startByRole=new Map((metadata.start?.defenderState||[]).map(x=>[String(x.role),x]));
const misplaced=(metadata.end?.defenderState||[]).filter(x=>{const start=startByRole.get(String(x.role));return !start||x.opacity<=.01||Math.hypot(x.left-start.left,x.top-start.top)>.75;});
if(misplaced.length) throw new Error(`Defenders left defensive positions after scoring play: ${JSON.stringify(misplaced)}`);
const homeIntruders=(metadata.end?.defenderState||[]).filter(x=>x.role!=='C'&&Math.hypot(x.left-50,x.top-90)<8);
if(homeIntruders.length) throw new Error(`Non-catcher defenders entered home-plate scoring path: ${JSON.stringify(homeIntruders)}`);
metadata.actorRoleIsolation={passed:true,defendersChecked:metadata.end.defenderState.length,offensiveRunners:metadata.start.runners,batter:metadata.start.batter,expectedScorers:3};
metadata.teamColorSeparation={passed:true,defense:[...defColors][0],offense:[...offColors][0]};
"""
s=s[:start]+validation+s[end:]
s=s.replace("console.log('MLB v916 simulation complete',metadata);","console.log('MLB v917 simulation complete',metadata);")
p.write_text(s)
print('Upgraded MLB simulation recorder to v917 actor-role and team-color QA')
