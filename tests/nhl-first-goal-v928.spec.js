import {test,expect} from '@playwright/test';

const BASE='http://127.0.0.1:4173/index.html#nhl';
test.setTimeout(90000);

async function openModel(page,width=1440,height=1000){
 await page.setViewportSize({width,height});
 await page.goto(BASE,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof window.DW_openNhlFirstGoal==='function',{timeout:30000});
 await page.locator('#hkFirstGoalBtn').click();
 await expect(page.locator('#hkFirstGoalPanel')).toBeVisible({timeout:30000});
 await expect.poll(()=>page.locator('#hkFirstGoalPanel .fgs-game').count(),{timeout:30000}).toBeGreaterThan(0);
}

test('NHL First Goal Model renders 3+Risky per team for FGS and ATG',async({page})=>{
 await openModel(page);
 const audit=await page.evaluate(async()=>{
  const d=await fetch('./slates/nhl-first-goal.json?v=browserqa').then(r=>r.json());
  return {model:d.model,games:d.games.map(g=>({id:g.gameId,awayFg:g.away?.players?.length,homeFg:g.home?.players?.length,awayAtg:g.away?.atgPlayers?.length,homeAtg:g.home?.atgPlayers?.length,ar:!!g.away?.riskyFirstGoal,hr:!!g.home?.riskyFirstGoal,aar:!!g.away?.riskyAtg,har:!!g.home?.riskyAtg}))};
 });
 expect(audit.model).toBe('FGS-Hazard Ensemble v1');
 expect(audit.games.length).toBeGreaterThan(0);
 for(const g of audit.games){expect(g.awayFg).toBe(3);expect(g.homeFg).toBe(3);expect(g.awayAtg).toBe(3);expect(g.homeAtg).toBe(3);expect(g.ar&&g.hr&&g.aar&&g.har).toBe(true);}
 const first=page.locator('#hkFirstGoalPanel .fgs-game').first();
 await expect(first.locator('.fgs-player')).toHaveCount(8);
 await expect(first.locator('.fgs-player.risky')).toHaveCount(2);
 await expect(first).toContainText('RISKY VALUE');
 await expect(first.locator('.fgs-prob').first()).toContainText('%');
 await expect(first.locator('[data-fgs-share]')).toContainText('First Goal');
 await page.locator('[data-fgs-market="atg"]').click();
 await expect(first.locator('.fgs-player')).toHaveCount(8);
 await expect(first.locator('.fgs-player.risky')).toHaveCount(2);
 await expect(first.locator('[data-fgs-share]')).toContainText('Anytime Goal');
});

test('NHL scorer market toggle stays visible while scrolling',async({page})=>{
 await openModel(page,1440,800);
 const dock=page.locator('#hkFirstGoalPanel .fgs-sticky-market');
 await expect(dock).toBeVisible();
 expect(await dock.evaluate(el=>getComputedStyle(el).position)).toBe('sticky');
 await page.evaluate(()=>document.querySelector('#hkFirstGoalPanel .fgs-game:last-child')?.scrollIntoView({block:'start'}));
 await page.waitForTimeout(150);
 const box=await dock.boundingBox();
 expect(box).not.toBeNull();
 expect(box.y).toBeGreaterThanOrEqual(0);
 expect(box.y).toBeLessThanOrEqual(35);
 await dock.locator('[data-fgs-market="atg"]').click();
 await expect(dock.locator('[data-fgs-market="atg"]')).toHaveAttribute('aria-selected','true');
 await expect(page.locator('#hkFirstGoalPanel .fgs-game').first().locator('[data-fgs-share]')).toContainText('Anytime Goal');
});

test('NHL scorer model is a direct side-nav item',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('http://127.0.0.1:4173/index.html#mlb',{waitUntil:'domcontentloaded'});
 const nhlHead=page.locator('#sbSportAccordion .sb-sport-head[data-sport="nhl"]');
 const item=page.locator('#sbSportAccordion .sb-sub-item[data-nhl-first-goal]');
 await expect(item).toHaveCount(1,{timeout:30000});
 await nhlHead.click();
 await expect(item).toBeVisible();
 await expect(item).toHaveText('First Goal Model');
 await item.click();
 await expect.poll(()=>page.evaluate(()=>location.hash),{timeout:30000}).toBe('#nhl');
 await expect(page.locator('#hkFirstGoalPanel')).toBeVisible({timeout:30000});
 await expect(item).toHaveClass(/is-active/);
});

test('NHL FGS and ATG share cards preserve image ratios and render real PNG blobs',async({page})=>{
 await openModel(page);
 const result=await page.evaluate(async()=>{
  const d=await fetch('./slates/nhl-first-goal.json?v=cardqa').then(r=>r.json());
  const mod=await import('./sports/nhl/first-goal-share-v928.js?v=cardqa-ratio');
  const game=d.games[0];
  const a=await mod.scorerCardBlob(game,'fgs'),b=await mod.scorerCardBlob(game,'atg');
  const cover=mod.__SCORER_CARD_TEST__.aspectBox(600,400,94,94,'cover');
  const contain=mod.__SCORER_CARD_TEST__.aspectBox(600,400,94,94,'contain');
  return {fgs:[a?.type||'',a?.size||0],atg:[b?.type||'',b?.size||0],cover,contain};
 });
 expect(result.fgs[0]).toBe('image/png');expect(result.atg[0]).toBe('image/png');
 expect(result.fgs[1]).toBeGreaterThan(5000);expect(result.atg[1]).toBeGreaterThan(5000);
 expect(result.cover.dw/result.cover.dh).toBeCloseTo(1.5,5);
 expect(result.cover.dh).toBeCloseTo(94,5);
 expect(result.cover.dw).toBeGreaterThan(94);
 expect(result.contain.dw/result.contain.dh).toBeCloseTo(1.5,5);
 expect(result.contain.dw).toBeCloseTo(94,5);
 expect(result.contain.dh).toBeLessThan(94);
});

for(const width of [390,768,1440])test(`NHL scorer model has no horizontal overflow at ${width}px`,async({page})=>{
 await openModel(page,width,width===390?844:1000);
 const geometry=await page.evaluate(()=>{const p=document.getElementById('hkFirstGoalPanel');return {scroll:p?.scrollWidth||0,client:p?.clientWidth||0};});
 expect(geometry.scroll).toBeLessThanOrEqual(geometry.client+2);
 await page.locator('[data-fgs-market="atg"]').click();
 const after=await page.evaluate(()=>{const p=document.getElementById('hkFirstGoalPanel');return {scroll:p?.scrollWidth||0,client:p?.clientWidth||0};});
 expect(after.scroll).toBeLessThanOrEqual(after.client+2);
});
