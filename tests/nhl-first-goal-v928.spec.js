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
 expect(audit.model).toBe('FGS-Hazard Ensemble v3');
 expect(audit.games.length).toBeGreaterThan(0);
 for(const g of audit.games){expect(g.awayFg).toBe(3);expect(g.homeFg).toBe(3);expect(g.awayAtg).toBe(3);expect(g.homeAtg).toBe(3);expect(g.ar&&g.hr&&g.aar&&g.har).toBe(true);}
 const first=page.locator('#hkFirstGoalPanel .fgs-game').first();
 await expect(first.locator('.fgs-player')).toHaveCount(8);
 await expect(first.locator('.fgs-player.risky')).toHaveCount(2);
 await expect(first).toContainText('RISKY VALUE');
 await expect(first.locator('.fgs-prob').first()).toContainText('%');
 await expect(first.locator('.fgs-odds').first()).not.toContainText('Odds pending');
 await expect(first.locator('.fgs-odds').first()).toContainText(/FAIR|[+-]\\d+/);
 await expect(first.locator('.fgs-matchup-note').first()).toContainText(/matchup/i);
 await expect(first.locator('[data-fgs-share]')).toContainText('First Goal');
 await page.locator('#hkFirstGoalPanel .fgs-market-slot [data-fgs-market="atg"]').click();
 await expect(first.locator('.fgs-player')).toHaveCount(8);
 await expect(first.locator('.fgs-player.risky')).toHaveCount(2);
 await expect(first.locator('[data-fgs-share]')).toContainText('Anytime Goal');
});

test('NHL scorer market toggle belongs to the model hero and preserves state while scrolling',async({page})=>{
 await openModel(page,1440,800);
 const panel=page.locator('#hkFirstGoalPanel');
 const hero=panel.locator('.fgs-hero');
 const slot=hero.locator(':scope > .fgs-market-slot');
 const control=slot.locator(':scope > .fgs-market-control');
 await expect(control).toBeVisible();
 await expect(control.locator('.fgs-market-tabs')).toHaveCount(1);
 expect(await slot.evaluate(el=>!!el.parentElement?.classList.contains('fgs-hero'))).toBe(true);
 expect(await panel.locator('.fgs-meta').evaluate(el=>!!el.nextElementSibling?.classList.contains('fgs-market-slot'))).toBe(true);
 await expect(panel.locator('.fgs-sticky-market')).toHaveCount(0);
 await expect(page.locator('#nhlView .hk-head [data-fgs-market]')).toHaveCount(0);
 expect(await control.evaluate(el=>getComputedStyle(el).position)).toBe('static');
 await control.locator('[data-fgs-market="atg"]').click();
 await expect(control.locator('[data-fgs-market="atg"]')).toHaveAttribute('aria-selected','true');
 await expect(panel.locator('.fgs-game').first().locator('[data-fgs-share]')).toContainText('Anytime Goal');
 await page.evaluate(()=>document.querySelector('#hkFirstGoalPanel .fgs-game:last-child')?.scrollIntoView({block:'start'}));
 await page.waitForTimeout(150);
 await expect(control.locator('[data-fgs-market="atg"]')).toHaveAttribute('aria-selected','true');
 await expect(control).not.toHaveClass(/is-mobile-pinned/);
 await expect(panel.locator('.fgs-game').first().locator('[data-fgs-share]')).toContainText('Anytime Goal');
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

for(const width of [390,768,1440])test(`NHL scorer model toggle stays usable at ${width}px`,async({page})=>{
 await openModel(page,width,width===390?844:1000);
 const control=page.locator('#hkFirstGoalPanel .fgs-market-slot > .fgs-market-control');
 await expect(control).toBeVisible();
 const geometry=await page.evaluate(()=>{const p=document.getElementById('hkFirstGoalPanel');const el=document.querySelector('#hkFirstGoalPanel .fgs-market-slot > .fgs-market-control');const c=el?.getBoundingClientRect();const style=el?getComputedStyle(el):null;return {scroll:p?.scrollWidth||0,client:p?.clientWidth||0,controlLeft:c?.left||0,controlRight:c?.right||0,viewport:innerWidth,position:style?.position||'',top:style?.top||''};});
 expect(geometry.scroll).toBeLessThanOrEqual(geometry.client+2);
 expect(geometry.controlLeft).toBeGreaterThanOrEqual(-1);
 expect(geometry.controlRight).toBeLessThanOrEqual(geometry.viewport+1);
 expect(geometry.position).toBe('static');
 expect(geometry.top).toBe('auto');
 await control.locator('[data-fgs-market="atg"]').click();
 const after=await page.evaluate(()=>{const p=document.getElementById('hkFirstGoalPanel');return {scroll:p?.scrollWidth||0,client:p?.clientWidth||0};});
 expect(after.scroll).toBeLessThanOrEqual(after.client+2);
 if(width<=840){
  await page.evaluate(()=>document.querySelector('#hkFirstGoalPanel .fgs-game:last-child')?.scrollIntoView({block:'start'}));
  await expect(control).toHaveClass(/is-mobile-pinned/,{timeout:5000});
  await expect(control).toBeVisible();
  const pinned=await page.evaluate(()=>{const el=document.querySelector('#hkFirstGoalPanel .fgs-market-slot > .fgs-market-control');const header=document.querySelector('.topbar,[role="banner"]');const e=el?.getBoundingClientRect(),h=header?.getBoundingClientRect();return {position:el?getComputedStyle(el).position:'',top:e?.top??-1,headerBottom:Math.max(0,h?.bottom??0)};});
  expect(pinned.position).toBe('fixed');
  expect(pinned.top).toBeGreaterThanOrEqual(pinned.headerBottom);
  expect(pinned.top-pinned.headerBottom).toBeLessThanOrEqual(12);
  await control.locator('[data-fgs-market="fgs"]').click();
  await expect(control.locator('[data-fgs-market="fgs"]')).toHaveAttribute('aria-selected','true');
  await page.evaluate(()=>window.scrollTo(0,0));
  await expect(control).not.toHaveClass(/is-mobile-pinned/,{timeout:5000});
  expect(await control.evaluate(el=>getComputedStyle(el).position)).toBe('static');
 }else{
  await page.evaluate(()=>document.querySelector('#hkFirstGoalPanel .fgs-game:last-child')?.scrollIntoView({block:'start'}));
  await page.waitForTimeout(150);
  await expect(control).not.toHaveClass(/is-mobile-pinned/);
  expect(await control.evaluate(el=>getComputedStyle(el).position)).toBe('static');
 }
});
