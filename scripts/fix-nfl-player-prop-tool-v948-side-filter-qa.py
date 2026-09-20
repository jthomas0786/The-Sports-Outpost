from pathlib import Path

p = Path('tests/nfl-player-prop-tool-v947.spec.js')
s = p.read_text()

old = """  await page.locator('#nflPptMode').selectOption('safest');await assertOver();
  const game=page.locator('#nflPptGame');
  const gv=await game.locator('option').nth(1).getAttribute('value');if(gv){await game.selectOption(gv);await assertOver();}
  const prop=page.locator('#nflPptMarket');
  const pv=await prop.locator('option').nth(1).getAttribute('value');if(pv){await prop.selectOption(pv);await assertOver();}

  if(await page.locator('#nflPlayerPropTool tbody tr:visible').count()){
    const activeRowId=await page.locator('#nflPlayerPropTool tbody tr:visible').first().getAttribute('data-nfl-ppt-row');
    const activePos=await page.evaluate(id=>(window.__TSO_NFL_PLAYER_PROP_V947__?.buildRows?.()||[]).find(r=>r.id===id)?.position||'',activeRowId);
    const alternate=['QB','RB','WR','TE'].find(p=>p!==activePos);
    if(alternate){await page.locator(`[data-nfl-ppt-pos=\"${alternate}\"]`).click();await assertOver();}
  }

  await page.locator('#nflPptFilters').click();
  if(await page.locator('#nflPlayerPropTool tbody tr:visible [data-nfl-tool-player] b').count()){
    const playerName=await page.locator('#nflPlayerPropTool tbody tr:visible [data-nfl-tool-player] b').first().textContent();
    if(playerName){await page.locator('#nflPptSearch').fill(playerName.replace('↗','').trim().split(/\\s+/)[0]);await assertOver();await page.locator('#nflPptSearch').fill('');}
  }
  const team=page.locator('#nflPptTeam');
  const tv=await team.locator('option').nth(1).getAttribute('value');if(tv){await team.selectOption(tv);await assertOver();await team.selectOption('ALL');}
  await page.locator('#nflPptMin').selectOption('0.50');await assertOver();

  await game.selectOption('ALL');await prop.selectOption('ALL');
  await page.locator('#nflPptMin').selectOption('0.40');
  for(const p of ['1h','q1','full']){await page.locator(`[data-nfl-ppt-period=\"${p}\"]`).click();await assertOver();}
"""

new = """  await page.locator('#nflPptMode').selectOption('safest');await assertOver();
  const nonAllValue=async select=>{
    const values=await select.locator('option').evaluateAll(opts=>opts.map(o=>o.value).filter(v=>v&&v!=='ALL'));
    return values[0]||null;
  };

  // Exercise Game and Prop independently. A selected game can legitimately have
  // no second Prop option after all other filters are applied, so do not wait on
  // option:nth(1). Each filter still gets a real non-ALL selection and side check.
  const game=page.locator('#nflPptGame');
  const gv=await nonAllValue(game);expect(gv).not.toBeNull();
  await game.selectOption(gv);await assertOver();
  await game.selectOption('ALL');await assertOver();

  const prop=page.locator('#nflPptMarket');
  const pv=await nonAllValue(prop);expect(pv).not.toBeNull();
  await prop.selectOption(pv);await assertOver();
  await prop.selectOption('ALL');await assertOver();

  if(await page.locator('#nflPlayerPropTool tbody tr:visible').count()){
    const activeRowId=await page.locator('#nflPlayerPropTool tbody tr:visible').first().getAttribute('data-nfl-ppt-row');
    const activePos=await page.evaluate(id=>(window.__TSO_NFL_PLAYER_PROP_V947__?.buildRows?.()||[]).find(r=>r.id===id)?.position||'',activeRowId);
    const alternate=['QB','RB','WR','TE'].find(p=>p!==activePos);
    if(alternate){
      const pos=page.locator(`[data-nfl-ppt-pos=\"${alternate}\"]`);
      await pos.click();await assertOver();
      await pos.click();await assertOver();
    }
  }

  await page.locator('#nflPptFilters').click();
  if(await page.locator('#nflPlayerPropTool tbody tr:visible [data-nfl-tool-player] b').count()){
    const playerName=await page.locator('#nflPlayerPropTool tbody tr:visible [data-nfl-tool-player] b').first().textContent();
    if(playerName){
      const search=page.locator('#nflPptSearch');
      await search.fill(playerName.replace('↗','').trim().split(/\\s+/)[0]);await assertOver();
      await search.fill('');await assertOver();
    }
  }
  const team=page.locator('#nflPptTeam');
  const tv=await nonAllValue(team);expect(tv).not.toBeNull();
  await team.selectOption(tv);await assertOver();
  await team.selectOption('ALL');await assertOver();

  await page.locator('#nflPptMin').selectOption('0.50');await assertOver();
  await page.locator('#nflPptMin').selectOption('0.40');await assertOver();
  for(const p of ['1h','q1','full']){await page.locator(`[data-nfl-ppt-period=\"${p}\"]`).click();await assertOver();}
"""

if new not in s:
    if old not in s:
        raise SystemExit('side-filter QA source marker missing')
    s = s.replace(old, new, 1)

p.write_text(s)
print('NFL Player Prop Tool v94.8 cross-filter side QA made deterministic')
