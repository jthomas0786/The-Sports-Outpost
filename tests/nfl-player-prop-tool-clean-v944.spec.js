import {test,expect} from '@playwright/test';

test.setTimeout(180000);
const BASE='http://127.0.0.1:4173/index.html#nfl';
const FULL_HEADERS=['PLAYER','CONSENSUS','PICK','SIM MEAN','SIM MED','SIM PROB','SIM EDGE','P10','P25','P75','P90','RANGE','RUNS'];
const PERIOD_HEADERS=['PLAYER','TSO LINE','SIM LEAN','SIM MEAN','SIM MED','SIM PROB','SIM EDGE','P10','P25','P75','P90','RANGE','RUNS'];
const LEGACY_HEADERS=['CONS.','PROJ','L10 AVG','COV PROB','DEF VS PROP','MATCHUP','SIM DEF','L5','L10','H2H'];

async function openTool(page,viewport={width:1440,height:900}){
  await page.setViewportSize(viewport);
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#nflView',{state:'visible',timeout:45000});
  await page.waitForFunction(()=>document.querySelectorAll('#nflView [data-nfl-player]').length>0,{timeout:45000});
  await page.evaluate(()=>document.getElementById('nflPlayerPropToolBtn')?.click());
  await page.waitForSelector('#nflPlayerPropTool',{state:'visible',timeout:45000});
  await page.waitForFunction(()=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptSnapshot==='ready',{timeout:90000});
  await page.waitForFunction(()=>document.querySelector('#nflPlayerPropTool .nfl-ppt-table')?.dataset.nflPptSimV939==='93.9',{timeout:45000});
  await page.waitForSelector('#nflPptMode[data-nfl-ppt-build-style="94.4"]',{timeout:45000});
  await page.waitForFunction(()=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptOddsStyleBoard==='ready',{timeout:45000});
}

async function state(page){
  return page.evaluate(()=>{
    const tool=document.getElementById('nflPlayerPropTool');
    const table=tool?.querySelector('.nfl-ppt-table');
    const rows=[...tool.querySelectorAll('tbody tr[data-nfl-ppt-row]:not([hidden])')];
    return {
      headers:[...table.querySelectorAll('thead tr:nth-child(2) th')].map(x=>x.textContent.trim()),
      count:rows.length,
      countLabel:tool.querySelector('.nfl-ppt-head-stat b')?.textContent?.trim()||'',
      prop:document.getElementById('nflPptMarket')?.value||'',
      style:document.getElementById('nflPptMode')?.value||'',
      toolStyle:tool.dataset.nflPptBuildStyle||'',
      period:tool.dataset.nflPptPeriod||'',
      legacyReference:!!window.__TSO_NFL_PROP_REFERENCE_V941__,
      rowMarkets:[...new Set(rows.map(r=>r.dataset.snapshotMarket||''))],
      rowSimMarkets:[...new Set(rows.map(r=>r.dataset.nflPptSimMarket||''))],
      rowStyles:[...new Set(rows.map(r=>r.dataset.nflPptBuildStyle||''))],
      bodyWidth:document.documentElement.scrollWidth,
      viewportWidth:document.documentElement.clientWidth,
    };
  });
}

function expectNoLegacyHeaders(headers){
  expect(headers).toEqual(FULL_HEADERS);
  for(const label of LEGACY_HEADERS)expect(headers).not.toContain(label);
}

async function waitForFull(page,prop,style){
  await page.waitForFunction(({prop,style,headers})=>{
    const tool=document.getElementById('nflPlayerPropTool');
    const table=tool?.querySelector('.nfl-ppt-table');
    if(!tool||!table||tool.dataset.nflPptPeriod!=='full'||tool.dataset.nflPptBuildStyle!==style)return false;
    const actual=[...table.querySelectorAll('thead tr:nth-child(2) th')].map(x=>x.textContent.trim());
    if(JSON.stringify(actual)!==JSON.stringify(headers))return false;
    const rows=[...tool.querySelectorAll('tbody tr[data-nfl-ppt-row]:not([hidden])')];
    return rows.length>0&&rows.every(r=>r.dataset.snapshotMarket===prop&&r.dataset.nflPptSimMarket===prop&&r.dataset.nflPptBuildStyle===style);
  },{prop,style,headers:FULL_HEADERS},{timeout:45000});
}

test('old reference columns are gone and cannot return after clicks or Bet Style changes',async({page})=>{
  await openTool(page);
  let s=await state(page);
  expectNoLegacyHeaders(s.headers);
  expect(s.legacyReference).toBe(false);

  const options=await page.locator('#nflPptMarket option').evaluateAll(opts=>opts.map(o=>o.value));
  const prop=options.includes('receptions')?'receptions':options.find(v=>v&&v!=='ALL');
  expect(prop).toBeTruthy();
  await page.locator('#nflPptMarket').selectOption(prop);
  await waitForFull(page,prop,'tsoPick');

  for(const style of ['safest','bestEdge','balanced','tsoPick']){
    await page.locator('#nflPptMode').selectOption(style);
    await waitForFull(page,prop,style);
    for(let i=0;i<8;i++){
      s=await state(page);
      expectNoLegacyHeaders(s.headers);
      expect(s.prop).toBe(prop);
      expect(s.style).toBe(style);
      expect(s.toolStyle).toBe(style);
      expect(s.rowMarkets).toEqual([prop]);
      expect(s.rowSimMarkets).toEqual([prop]);
      expect(s.rowStyles).toEqual([style]);
      expect(s.count).toBeGreaterThan(0);
      expect(s.countLabel).toBe(String(s.count));
      await page.waitForTimeout(125);
    }
    await page.locator('#nflPlayerPropTool tbody tr:not([hidden]) td:nth-child(4)').first().click();
    await page.waitForTimeout(500);
    expectNoLegacyHeaders((await state(page)).headers);
  }
});

test('period switching has one authoritative header set and Full restores only modern columns',async({page})=>{
  await openTool(page,{width:390,height:844});
  const options=await page.locator('#nflPptMarket option').evaluateAll(opts=>opts.map(o=>o.value));
  const prop=options.includes('receptions')?'receptions':options.find(v=>v&&v!=='ALL');
  expect(prop).toBeTruthy();
  await page.locator('#nflPptMarket').selectOption(prop);
  await waitForFull(page,prop,'tsoPick');

  const oneHalf=page.locator('[data-nfl-ppt-period="1h"]');
  if(await oneHalf.count()){
    await oneHalf.click();
    await page.waitForFunction(headers=>JSON.stringify([...document.querySelectorAll('#nflPlayerPropTool .nfl-ppt-table thead tr:nth-child(2) th')].map(x=>x.textContent.trim()))===JSON.stringify(headers),PERIOD_HEADERS,{timeout:45000});
    expect((await state(page)).headers).toEqual(PERIOD_HEADERS);
    await page.locator('[data-nfl-ppt-period="full"]').click();
    await waitForFull(page,prop,'tsoPick');
  }

  const final=await state(page);
  expectNoLegacyHeaders(final.headers);
  expect(final.legacyReference).toBe(false);
  expect(final.bodyWidth).toBeLessThanOrEqual(final.viewportWidth+3);
});
