import {test,expect} from '@playwright/test';

test.setTimeout(120000);
const BASE='http://127.0.0.1:4173/index.html#nfl';

async function openNfl(page,viewport={width:1440,height:1000}){
  await page.setViewportSize(viewport);
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#nflView',{state:'visible',timeout:45000});
  await page.waitForFunction(()=>document.querySelectorAll('#nflView [data-nfl-player]').length>0,{timeout:45000});
  await page.waitForSelector('#nflPlayerPropToolBtn',{state:'attached',timeout:45000});
}

async function openTool(page){
  await page.evaluate(()=>document.getElementById('nflPlayerPropToolBtn')?.click());
  await page.waitForSelector('#nflPlayerPropTool',{state:'visible',timeout:45000});
  await page.waitForSelector('#nflPptMode',{state:'visible',timeout:45000});
  await page.locator('#nflPptMode').selectOption('all');
  await page.waitForFunction(()=>document.querySelectorAll('#nflPlayerPropTool tbody tr').length>0,{timeout:45000});
  await page.waitForFunction(()=>{
    const rings=[...document.querySelectorAll('#nflPlayerPropTool .nfl-ppt-prob:not(.empty)')];
    return !rings.length||rings.every(r=>r.dataset.v925Ring==='1');
  },{timeout:15000});
}

test('NFL Player Prop Tool loads real rows, filters quickly, and opens the existing Player Modal',async({page})=>{
  await openNfl(page);
  await openTool(page);

  await expect(page.locator('#nflPlayerPropTool')).toContainText('PLAYER PROP TOOL');
  await expect(page.locator('#nflPlayerPropTool')).toContainText('PROJECTIONS + VALUE');
  await expect(page.locator('#nflPlayerPropTool')).toContainText('TSO INSIGHTS + DATA');
  await expect(page.locator('#nflPlayerPropTool')).toContainText('HIT RATES');
  await expect(page.locator('#nflPlayerPropToolBtn')).toHaveClass(/is-active/);

  const rows=page.locator('#nflPlayerPropTool tbody tr');
  const initialCount=await rows.count();
  expect(initialCount).toBeGreaterThan(0);
  expect(await page.locator('#nflPlayerPropTool .nfl-ppt-player').count()).toBe(initialCount);
  const headerText=await page.locator('#nflPlayerPropTool thead').innerText();
  for(const label of ['PLAYER','CONSENSUS','PICK','PROJ','L10 AVG','MODEL PROB','EDGE','DEF VS PROP','MATCHUP','SIM DEF','L5','L10','H2H'])expect(headerText).toContain(label);
  for(const pos of ['QB','RB','WR','TE'])await expect(page.locator(`[data-nfl-ppt-pos="${pos}"]`)).toBeVisible();

  await page.locator('#nflPptFilters').click();
  await expect(page.locator('#nflPptFilterPanel')).toBeVisible();
  const firstName=((await page.locator('#nflPlayerPropTool .nfl-ppt-player b').first().textContent())||'').replace('↗','').trim();
  expect(firstName).toBeTruthy();
  const searchTerm=firstName.split(' ')[0];
  const inputCost=await page.evaluate(term=>{
    const input=document.getElementById('nflPptSearch');
    const t=performance.now();
    input.value=term;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    return performance.now()-t;
  },searchTerm);
  expect(inputCost).toBeLessThan(150);
  await expect(page.locator('#nflPptSearch')).toHaveValue(searchTerm);
  const filteredVisible=await page.locator('#nflPlayerPropTool tbody tr:visible').count();
  expect(filteredVisible).toBeGreaterThan(0);
  expect(filteredVisible).toBeLessThanOrEqual(initialCount);
  await expect(page.locator('#nflPptFilterPanel')).toBeVisible();

  const market=page.locator('#nflPptMarket');
  const marketOptions=await market.locator('option').count();
  expect(marketOptions).toBeGreaterThan(2);
  await market.selectOption('ALL');
  await page.locator('#nflPptClear').click();
  await page.waitForFunction(()=>document.querySelectorAll('#nflPlayerPropTool tbody tr').length>0,{timeout:10000});

  await page.locator('#nflPptGuide').click();
  await expect(page.locator('#nflPlayerPropGuide')).toBeVisible();
  await page.locator('[data-nfl-ppt-guide-close]').click();
  await expect(page.locator('#nflPlayerPropGuide')).toHaveCount(0);

  await page.locator('#nflPptColor').click();
  await expect(page.locator('#nflPlayerPropTool')).toHaveClass(/ppt-color-off/);
  await page.locator('#nflPptColor').click();
  await expect(page.locator('#nflPlayerPropTool')).not.toHaveClass(/ppt-color-off/);

  const clickedName=((await page.locator('#nflPlayerPropTool .nfl-ppt-player b').first().textContent())||'').replace('↗','').trim();
  await page.locator('#nflPlayerPropTool .nfl-ppt-player').first().click();
  const modal=page.locator('.tso-nfl-player-card-v70,.tso-nfl-player-card-v72').first();
  await expect(modal).toBeVisible({timeout:15000});
  await expect(modal).toContainText(clickedName.split(' ')[0]);
  await expect(page.locator('[data-nfl-close-modal]').first()).toBeVisible();
  await page.locator('[data-nfl-close-modal]').first().click();
  await page.waitForSelector('#nflPlayerPropTool',{state:'visible',timeout:15000});
  expect(await page.locator('#nflPlayerPropTool tbody tr').count()).toBeGreaterThan(0);
});

test('NFL Player Prop Tool uses compact columns and centered NFL-style progress rings',async({page})=>{
  await openNfl(page,{width:1440,height:1000});
  await openTool(page);
  const geometry=await page.evaluate(()=>{
    const tool=document.getElementById('nflPlayerPropTool');
    const table=tool?.querySelector('.nfl-ppt-table');
    const firstRow=table?.querySelector('tbody tr');
    const ring=firstRow?.querySelector('.nfl-ppt-prob:not(.empty)')||table?.querySelector('.nfl-ppt-prob:not(.empty)');
    const cell=ring?.closest('td');
    const rr=ring?.getBoundingClientRect();
    const cr=cell?.getBoundingClientRect();
    const cells=firstRow?[...firstRow.children].map(td=>td.getBoundingClientRect().width):[];
    return {
      tableWidth:table?.getBoundingClientRect().width||0,
      cells,
      ringWidth:rr?.width||0,
      ringHeight:rr?.height||0,
      ringDx:rr&&cr?Math.abs((rr.left+rr.width/2)-(cr.left+cr.width/2)):999,
      ringDy:rr&&cr?Math.abs((rr.top+rr.height/2)-(cr.top+cr.height/2)):999,
      ringSvg:!!ring?.querySelector('svg'),
      ringLabel:!!ring?.querySelector('.nfl-ppt-ring-label'),
      grade:String(ring?.querySelector('.nfl-ppt-ring-label b')?.textContent||'')
    };
  });
  expect(geometry.tableWidth).toBeGreaterThan(950);
  expect(geometry.tableWidth).toBeLessThanOrEqual(1060);
  expect(geometry.cells.length).toBe(13);
  expect(geometry.cells[0]).toBeLessThanOrEqual(220);
  expect(Math.max(...geometry.cells.slice(1))).toBeLessThanOrEqual(90);
  expect(geometry.ringWidth).toBeGreaterThanOrEqual(43);
  expect(geometry.ringWidth).toBeLessThanOrEqual(47);
  expect(Math.abs(geometry.ringWidth-geometry.ringHeight)).toBeLessThanOrEqual(1);
  expect(geometry.ringDx).toBeLessThanOrEqual(1.5);
  expect(geometry.ringDy).toBeLessThanOrEqual(1.5);
  expect(geometry.ringSvg).toBe(true);
  expect(geometry.ringLabel).toBe(true);
  expect(geometry.grade).toMatch(/^(A\+?|A-|B\+?|B-|C\+?|C)$/);
});

for(const viewport of [{width:390,height:844},{width:768,height:1024},{width:1440,height:1000}]){
  test(`NFL Player Prop Tool is usable at ${viewport.width}px`,async({page})=>{
    await openNfl(page,viewport);
    await openTool(page);
    const geometry=await page.evaluate(()=>{
      const tool=document.getElementById('nflPlayerPropTool');
      const wrap=tool?.querySelector('.nfl-ppt-table-wrap');
      const player=tool?.querySelector('.nfl-ppt-player');
      return {
        bodyScroll:document.documentElement.scrollWidth,
        viewport:document.documentElement.clientWidth,
        toolWidth:tool?.getBoundingClientRect().width||0,
        wrapClient:wrap?.clientWidth||0,
        wrapScroll:wrap?.scrollWidth||0,
        playerHeight:player?.getBoundingClientRect().height||0
      };
    });
    expect(geometry.bodyScroll).toBeLessThanOrEqual(geometry.viewport+3);
    expect(geometry.toolWidth).toBeGreaterThan(0);
    expect(geometry.wrapClient).toBeGreaterThan(0);
    expect(geometry.wrapScroll).toBeGreaterThanOrEqual(geometry.wrapClient);
    expect(geometry.wrapScroll).toBeLessThanOrEqual(viewport.width<=700?1045:1060);
    expect(geometry.playerHeight).toBeGreaterThanOrEqual(36);
  });
}
