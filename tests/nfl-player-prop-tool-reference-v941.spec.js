import {test,expect} from '@playwright/test';

test.setTimeout(120000);
const BASE='http://127.0.0.1:4173/index.html#nfl';
const HEADERS=['PLAYER','CONSENSUS','PICK','PROJ','L10 AVG','COV PROB','EDGE','DEF VS PROP','MATCHUP','SIM DEF','L5','L10','H2H'];
const GROUPS=['','PROJECTIONS + VALUE','TSO INSIGHTS + DATA','HIT RATES'];

async function openTool(page,viewport={width:1440,height:900}){
  await page.setViewportSize(viewport);
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#nflView',{state:'visible',timeout:45000});
  await page.waitForFunction(()=>document.querySelectorAll('#nflView [data-nfl-player]').length>0,{timeout:45000});
  await page.evaluate(()=>document.getElementById('nflPlayerPropToolBtn')?.click());
  await page.waitForSelector('#nflPlayerPropTool',{state:'visible',timeout:45000});
  await page.waitForFunction(()=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptSnapshot==='ready',{timeout:90000});
  await page.waitForFunction(()=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptReferenceLayout==='94.1',{timeout:45000});
}

async function visualState(page){
  return page.evaluate(()=>{
    const root=document.getElementById('nflPlayerPropTool');
    const rows=[...root.querySelectorAll('tbody tr[data-nfl-ppt-row]:not([hidden])')];
    return {
      headers:[...root.querySelectorAll('.nfl-ppt-table thead tr:nth-child(2) th')].map(x=>x.textContent.trim()),
      groups:[...root.querySelectorAll('.nfl-ppt-groups th')].map(x=>x.textContent.trim()),
      rowCount:rows.length,
      allReference:rows.every(r=>r.dataset.nflPptReferenceV941==='94.1'),
      all50k:rows.every(r=>Number(r.dataset.nflPptSimIterations||50000)>=50000||r.dataset.nflPptPeriodCandidate==='1'),
      examples:rows.slice(0,6).map(r=>({
        proj:r.children[3]?.textContent.trim(),
        l10avg:r.children[4]?.textContent.trim(),
        cov:r.children[5]?.textContent.trim(),
        edge:r.children[6]?.textContent.trim(),
        def:r.children[7]?.textContent.trim(),
        matchup:r.children[8]?.textContent.trim(),
        simdef:r.children[9]?.textContent.trim(),
        l5:r.children[10]?.textContent.trim(),
        l10:r.children[11]?.textContent.trim(),
        h2h:r.children[12]?.textContent.trim()
      })),
      bodyWidth:document.documentElement.scrollWidth,
      viewportWidth:document.documentElement.clientWidth
    };
  });
}

test('reference-image stat categories render from the frozen 50K simulation snapshot',async({page})=>{
  await openTool(page);
  const s=await visualState(page);
  expect(s.headers).toEqual(HEADERS);
  expect(s.groups).toEqual(GROUPS);
  expect(s.rowCount).toBeGreaterThan(0);
  expect(s.allReference).toBe(true);
  expect(s.all50k).toBe(true);
  expect(s.examples.every(x=>x.proj&&x.l10avg&&x.cov&&x.edge&&x.def&&x.matchup&&x.simdef&&x.l5&&x.l10&&x.h2h)).toBe(true);
  expect(s.examples.some(x=>/SIM vs Prop/i.test(x.def))).toBe(true);
  expect(s.examples.some(x=>/(GREAT|GOOD|FAIR|POOR)/.test(x.matchup))).toBe(true);
  expect(s.examples.some(x=>/\/5/.test(x.l5)&&/\/10/.test(x.l10)&&/\/1/.test(x.h2h))).toBe(true);
  await page.locator('#nflPptGuide').click();
  await expect(page.locator('#nflPlayerPropGuide')).toContainText('simulation analogs');
  await expect(page.locator('#nflPlayerPropGuide')).toContainText('50,000 simulated worlds');
});

test('Bet Style and compact Full/1H/2H/Q1-Q4 controls mount reliably when tool opens',async({page})=>{
  await openTool(page);
  const mode=page.locator('#nflPptMode[data-nfl-ppt-build-style="94.2"]');
  await expect(mode).toBeVisible();
  await expect(mode.locator('option')).toHaveText(['TSO Pick','Safest','Best Edge','Balanced','Aggressive','Correlated','Longshot']);
  await expect(mode.locator('xpath=..').locator(':scope > span')).toHaveText('Bet Style');
  const labels=await page.locator('[data-nfl-ppt-period]').allTextContents();
  expect(labels.map(x=>x.trim())).toEqual(['Full','1H','2H','Q1','Q2','Q3','Q4']);
  const bar=await page.locator('.nfl-ppt-periodbar-v940').boundingBox();
  expect(bar?.height||999).toBeLessThan(50);
});

test('period views keep the same categories and use 50K period simulation rows',async({page})=>{
  await openTool(page);
  const oneH=page.locator('[data-nfl-ppt-period="1h"]');
  await oneH.click();
  await page.waitForFunction(()=>{
    const root=document.getElementById('nflPlayerPropTool');
    const visible=[...root.querySelectorAll('tbody tr[data-nfl-ppt-row]:not([hidden])')];
    return root?.dataset.nflPptPeriod==='1h'&&visible.some(r=>r.dataset.nflPptPeriodCandidate==='1')&&root.dataset.nflPptReferenceLayout==='94.1';
  },{timeout:45000});
  await page.waitForTimeout(80);
  let s=await visualState(page);
  expect(s.headers).toEqual(HEADERS);
  expect(s.groups).toEqual(GROUPS);
  expect(s.rowCount).toBeGreaterThan(0);
  expect(s.examples.some(x=>/SIM VS 50%/i.test(x.edge))).toBe(true);

  await page.locator('[data-nfl-ppt-period="q1"]').click();
  await page.waitForFunction(()=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptPeriod==='q1',{timeout:45000});
  await page.waitForTimeout(80);
  s=await visualState(page);
  expect(s.headers).toEqual(HEADERS);
  expect(s.rowCount).toBeGreaterThan(0);
});

test('mobile keeps the reference categories contained without body overflow',async({page})=>{
  await openTool(page,{width:390,height:844});
  const s=await visualState(page);
  expect(s.headers).toEqual(HEADERS);
  expect(s.bodyWidth).toBeLessThanOrEqual(s.viewportWidth+3);
  const period=page.locator('.nfl-ppt-period-segments-v940');
  const geo=await period.evaluate(el=>({clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,height:el.getBoundingClientRect().height,overflowX:getComputedStyle(el).overflowX}));
  expect(geo.height).toBeLessThan(40);
  expect(['auto','scroll']).toContain(geo.overflowX);
  expect(geo.scrollWidth).toBeGreaterThanOrEqual(geo.clientWidth);
});