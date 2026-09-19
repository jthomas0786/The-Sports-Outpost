import {test,expect} from '@playwright/test';

test.setTimeout(120000);
const BASE='http://127.0.0.1:4173/index.html#nfl';

async function openTool(page,viewport={width:1440,height:900}){
  await page.setViewportSize(viewport);
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#nflView',{state:'visible',timeout:45000});
  await page.waitForFunction(()=>document.querySelectorAll('#nflView [data-nfl-player]').length>0,{timeout:45000});
  await page.evaluate(()=>document.getElementById('nflPlayerPropToolBtn')?.click());
  await page.waitForSelector('#nflPlayerPropTool',{state:'visible',timeout:45000});
  await page.waitForFunction(()=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptSnapshot==='ready',{timeout:90000});
  await page.waitForFunction(()=>{
    const root=document.getElementById('nflPlayerPropTool');
    return root?.dataset.nflPptSimAuthority==='nfl-sim'&&root.querySelector('.nfl-ppt-table')?.dataset.nflPptSimV939==='93.9';
  },{timeout:30000});
}

test('NFL Player Prop Tool value metrics are authoritative 50K simulation outputs',async({page})=>{
  await openTool(page);
  const state=await page.evaluate(()=>{
    const root=document.getElementById('nflPlayerPropTool');
    const heads=[...root.querySelectorAll('.nfl-ppt-table thead tr:nth-child(2) th')].map(x=>x.textContent.trim());
    const groups=[...root.querySelectorAll('.nfl-ppt-groups th')].map(x=>x.textContent.trim());
    const rows=[...root.querySelectorAll('tbody tr[data-nfl-ppt-row]')];
    const simRows=rows.filter(r=>r.dataset.nflPptSimSource==='nfl-sim');
    const pendingRows=rows.filter(r=>r.dataset.nflPptSimSource==='pending');
    const visible=[...root.querySelectorAll('tbody tr[data-nfl-ppt-row]:not([hidden])')];
    return {
      authority:root.dataset.nflPptSimAuthority,
      pregameIterations:Number(root.dataset.nflPptSimPregameIterations||0),
      simRows:simRows.length,
      pendingRows:pendingRows.length,
      simIterations:[...new Set(simRows.map(r=>Number(r.dataset.nflPptSimIterations||0)))],
      visibleSources:[...new Set(visible.map(r=>r.dataset.nflPptSimSource))],
      visibleEdges:visible.map(r=>Number(r.dataset.snapshotEdge)),
      visibleProbs:visible.map(r=>Number(r.dataset.snapshotProb)),
      minProb:Number(document.getElementById('nflPptMin')?.value||.52),
      heads,groups,
      badge:root.querySelector('.nfl-ppt-snapshot-badge')?.textContent.trim()||'',
      hasHistoricalLabels:['L10 AVG','DEF VS PROP','MATCHUP','SIM DEF','L5','L10','H2H'].some(label=>heads.includes(label)),
      pendingProjectionText:pendingRows[0]?.children?.[3]?.textContent.trim()||''
    };
  });

  expect(state.authority).toBe('nfl-sim');
  expect(state.pregameIterations).toBe(50000);
  expect(state.simRows).toBeGreaterThan(0);
  expect(state.simIterations).toEqual([50000]);
  expect(state.groups).toEqual(['','50K SIM PROJECTION + VALUE','SIM DISTRIBUTION','SIM RANGE + SAMPLE']);
  expect(state.heads).toEqual(['PLAYER','CONSENSUS','PICK','SIM MEAN','SIM MED','SIM PROB','SIM EDGE','P10','P25','P75','P90','RANGE','RUNS']);
  expect(state.badge).toContain('50K SIM SNAPSHOT');
  expect(state.hasHistoricalLabels).toBe(false);
  expect(state.visibleSources).toEqual(['nfl-sim']);
  expect(state.visibleEdges.every(v=>Number.isFinite(v)&&v>=0)).toBe(true);
  expect(state.visibleProbs.every(v=>Number.isFinite(v)&&v>=state.minProb)).toBe(true);
  if(state.pendingRows)expect(state.pendingProjectionText).toContain('SIM MEAN');
});

test('simulation authority survives in-memory filters without rebuilding or refetching the table',async({page})=>{
  await openTool(page,{width:390,height:844});
  const before=await page.evaluate(()=>{
    window.__simTable=document.querySelector('#nflPlayerPropTool .nfl-ppt-table');
    return {
      rows:document.querySelectorAll('#nflPlayerPropTool tbody tr[data-nfl-ppt-row]').length,
      simRows:document.querySelectorAll('#nflPlayerPropTool tbody tr[data-nfl-ppt-sim-source="nfl-sim"]').length,
      bodyWidth:document.documentElement.scrollWidth,
      viewportWidth:document.documentElement.clientWidth
    };
  });
  expect(before.rows).toBeGreaterThan(0);
  expect(before.simRows).toBeGreaterThan(0);
  expect(before.bodyWidth).toBeLessThanOrEqual(before.viewportWidth+3);

  await page.locator('#nflPptMarket').selectOption('recYds');
  await page.locator('#nflPlayerPropTool th[data-sort="prob"]').click();
  const after=await page.evaluate(()=>({
    sameTable:window.__simTable===document.querySelector('#nflPlayerPropTool .nfl-ppt-table'),
    authority:document.getElementById('nflPlayerPropTool')?.dataset.nflPptSimAuthority,
    visible:[...document.querySelectorAll('#nflPlayerPropTool tbody tr[data-nfl-ppt-row]:not([hidden])')].map(r=>({source:r.dataset.nflPptSimSource,market:r.dataset.nflPptSimMarket}))
  }));
  expect(after.sameTable).toBe(true);
  expect(after.authority).toBe('nfl-sim');
  expect(after.visible.every(r=>r.source==='nfl-sim'&&r.market==='recYds')).toBe(true);

  await page.locator('#nflPptGuide').click();
  await expect(page.locator('#nflPlayerPropGuide')).toContainText('Mean and median outcomes from the game simulation distribution');
  await expect(page.locator('#nflPlayerPropGuide')).toContainText('Historical L5/L10/H2H and defensive-average fallbacks are not used');
});