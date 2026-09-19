import {test,expect} from '@playwright/test';

const BASE='http://127.0.0.1:4173/index.html#nfl';

async function openNfl(page,viewport={width:1440,height:1000}){
  await page.setViewportSize(viewport);
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#nflView',{state:'visible',timeout:30000});
  await page.waitForFunction(()=>document.querySelectorAll('#nflView [data-nfl-player]').length>20,{timeout:30000});
  await page.waitForSelector('#nflPlayerPropToolBtn',{state:'attached',timeout:30000});
}

async function openTool(page){
  await page.evaluate(()=>document.getElementById('nflPlayerPropToolBtn')?.click());
  await page.waitForSelector('#nflPlayerPropTool',{state:'visible',timeout:30000});
  await page.waitForSelector('#nflPptMode',{state:'visible',timeout:30000});
  await page.locator('#nflPptMode').selectOption('all');
  await page.waitForFunction(()=>document.querySelectorAll('#nflPlayerPropTool tbody tr').length>0,{timeout:30000});
}

test('NFL Player Prop Tool loads real rows, filters, and opens the existing Player Modal',async({page})=>{
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
  for(const label of ['PLAYER','CONSENSUS','PICK','PROJ','L10 AVG','MODEL PROB','EDGE','DEF VS PROP','MATCHUP','SIM DEF','L5','L10','H2H']){
    await expect(page.locator('#nflPlayerPropTool thead')).toContainText(label);
  }
  for(const pos of ['QB','RB','WR','TE'])await expect(page.locator(`[data-nfl-ppt-pos="${pos}"]`)).toBeVisible();

  await page.locator('#nflPptFilters').click();
  await expect(page.locator('#nflPptFilterPanel')).toBeVisible();
  const firstName=((await page.locator('#nflPlayerPropTool .nfl-ppt-player b').first().textContent())||'').replace('↗','').trim();
  expect(firstName).toBeTruthy();
  await page.locator('#nflPptSearch').fill(firstName.split(' ')[0]);
  await page.waitForTimeout(100);
  const filteredCount=await page.locator('#nflPlayerPropTool tbody tr').count();
  expect(filteredCount).toBeGreaterThan(0);
  expect(filteredCount).toBeLessThanOrEqual(initialCount);

  const market=page.locator('#nflPptMarket');
  const marketOptions=await market.locator('option').count();
  expect(marketOptions).toBeGreaterThan(2);
  await market.selectOption('ALL');
  await page.locator('#nflPptClear').click();
  await page.waitForTimeout(100);
  expect(await page.locator('#nflPlayerPropTool tbody tr').count()).toBeGreaterThan(0);

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
  await expect(modal).toBeVisible({timeout:10000});
  await expect(modal).toContainText(clickedName.split(' ')[0]);
  await expect(page.locator('[data-nfl-close-modal]').first()).toBeVisible();
  await page.locator('[data-nfl-close-modal]').first().click();
  await page.waitForSelector('#nflPlayerPropTool',{state:'visible',timeout:10000});
  expect(await page.locator('#nflPlayerPropTool tbody tr').count()).toBeGreaterThan(0);
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
    expect(geometry.playerHeight).toBeGreaterThanOrEqual(40);
  });
}
