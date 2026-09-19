import {test,expect} from '@playwright/test';

test.setTimeout(150000);
const BASE='http://127.0.0.1:4173/index.html#nfl';

async function openTool(page,viewport={width:1440,height:900}){
  await page.setViewportSize(viewport);
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#nflView',{state:'visible',timeout:45000});
  await page.waitForFunction(()=>document.querySelectorAll('#nflView [data-nfl-player]').length>0,{timeout:45000});
  await page.evaluate(()=>document.getElementById('nflPlayerPropToolBtn')?.click());
  await page.waitForSelector('#nflPlayerPropTool',{state:'visible',timeout:45000});
  await page.waitForFunction(()=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptSnapshot==='ready',{timeout:90000});
  await page.waitForFunction(()=>document.querySelector('#nflPlayerPropTool .nfl-ppt-table')?.dataset.nflPptSimV939==='93.9',{timeout:45000});
  await page.waitForSelector('#nflPptMode[data-nfl-ppt-build-style="94.0"]',{timeout:30000});
  await page.waitForSelector('.nfl-ppt-periodbar-v940',{timeout:30000});
}

test('Build Style lives in View and compact period buttons stay out of the way',async({page})=>{
  await openTool(page);
  const state=await page.evaluate(()=>{
    const select=document.getElementById('nflPptMode');
    const bar=document.querySelector('.nfl-ppt-periodbar-v940');
    const seg=document.querySelector('.nfl-ppt-period-segments-v940');
    const buttons=[...bar.querySelectorAll('[data-nfl-ppt-period]')];
    const r=bar.getBoundingClientRect(),s=seg.getBoundingClientRect();
    return {
      options:[...select.options].map(o=>o.textContent.trim()),
      values:[...select.options].map(o=>o.value),
      periods:buttons.map(b=>b.textContent.trim()),
      active:buttons.filter(b=>b.classList.contains('active')).map(b=>b.textContent.trim()),
      barHeight:r.height,segmentsWidth:s.width,
      bodyWidth:document.documentElement.scrollWidth,viewportWidth:document.documentElement.clientWidth,
      table:document.querySelector('#nflPlayerPropTool .nfl-ppt-table')
    };
  });
  expect(state.options).toEqual(['TSO Pick','Safest','Best Edge','Balanced','Aggressive','Correlated','Longshot']);
  expect(state.values).toEqual(['tsoPick','safest','bestEdge','balanced','aggressive','correlated','longshot']);
  expect(state.periods).toEqual(['Full','1H','2H','Q1','Q2','Q3','Q4']);
  expect(state.active).toEqual(['Full']);
  expect(state.barHeight).toBeLessThanOrEqual(42);
  expect(state.segmentsWidth).toBeLessThan(420);
  expect(state.bodyWidth).toBeLessThanOrEqual(state.viewportWidth+3);

  await page.evaluate(()=>{window.__v940Table=document.querySelector('#nflPlayerPropTool .nfl-ppt-table');});
  await page.locator('#nflPptMode').selectOption('safest');
  await page.waitForFunction(()=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptBuildStyle==='safest');
  expect(await page.evaluate(()=>window.__v940Table===document.querySelector('#nflPlayerPropTool .nfl-ppt-table'))).toBe(true);
});

test('1H and quarter filters render exact 50K simulation period candidates without rebuilding the table',async({page})=>{
  await openTool(page);
  await page.evaluate(()=>{window.__v940Table=document.querySelector('#nflPlayerPropTool .nfl-ppt-table');});

  for(const [value,label] of [['1h','1H'],['q1','Q1'],['q4','Q4']]){
    await page.locator(`[data-nfl-ppt-period="${value}"]`).click();
    await page.waitForFunction(v=>document.querySelector('#nflPlayerPropTool .nfl-ppt-table')?.dataset.nflPptPeriod===v,value,{timeout:30000});
    const state=await page.evaluate(()=>{
      const root=document.getElementById('nflPlayerPropTool');
      const rows=[...root.querySelectorAll('tbody tr[data-nfl-ppt-row]:not([hidden])')];
      const heads=[...root.querySelectorAll('thead tr:nth-child(2) th')].map(x=>x.textContent.trim());
      return {
        sameTable:window.__v940Table===root.querySelector('.nfl-ppt-table'),
        rows:rows.length,
        period:root.dataset.nflPptPeriod,
        periodRows:rows.filter(r=>r.dataset.nflPptPeriodCandidate==='1').length,
        runs:[...new Set(rows.map(r=>r.children[12]?.querySelector('b')?.textContent.trim()))],
        heads,
        status:root.querySelector('.nfl-ppt-period-status-v940')?.textContent.trim()||''
      };
    });
    expect(state.sameTable).toBe(true);
    expect(state.period).toBe(value);
    expect(state.rows).toBeGreaterThan(0);
    expect(state.periodRows).toBe(state.rows);
    expect(state.runs).toEqual(['50K']);
    expect(state.heads.slice(0,7)).toEqual(['PLAYER','TSO LINE','SIM LEAN','SIM MEAN','SIM MED','SIM PROB','SIM EDGE']);
    expect(state.status).toContain(label);
  }

  await page.locator('[data-nfl-ppt-period="full"]').click();
  await page.waitForFunction(()=>document.querySelector('#nflPlayerPropTool .nfl-ppt-table')?.dataset.nflPptPeriod==='full');
  const restored=await page.evaluate(()=>({
    sameTable:window.__v940Table===document.querySelector('#nflPlayerPropTool .nfl-ppt-table'),
    consensus:document.querySelector('#nflPlayerPropTool thead tr:nth-child(2) th:nth-child(2)')?.textContent.trim(),
    source:[...document.querySelectorAll('#nflPlayerPropTool tbody tr[data-nfl-ppt-row]:not([hidden])')].every(r=>r.dataset.nflPptSimSource==='nfl-sim')
  }));
  expect(restored.sameTable).toBe(true);
  expect(restored.consensus).toBe('CONSENSUS');
  expect(restored.source).toBe(true);
});

test('mobile period selector stays compact and never creates body overflow',async({page})=>{
  await openTool(page,{width:390,height:844});
  const state=await page.evaluate(()=>{
    const seg=document.querySelector('.nfl-ppt-period-segments-v940');
    const bar=document.querySelector('.nfl-ppt-periodbar-v940');
    const sb=seg.getBoundingClientRect(),bb=bar.getBoundingClientRect();
    return {
      bodyWidth:document.documentElement.scrollWidth,
      viewportWidth:document.documentElement.clientWidth,
      segWidth:sb.width,barWidth:bb.width,barHeight:bb.height,
      labels:[...seg.querySelectorAll('button')].map(b=>b.textContent.trim())
    };
  });
  expect(state.labels).toEqual(['Full','1H','2H','Q1','Q2','Q3','Q4']);
  expect(state.bodyWidth).toBeLessThanOrEqual(state.viewportWidth+3);
  expect(state.segWidth).toBeLessThanOrEqual(state.viewportWidth);
  expect(state.barWidth).toBeLessThanOrEqual(state.viewportWidth);
  expect(state.barHeight).toBeLessThanOrEqual(38);
});