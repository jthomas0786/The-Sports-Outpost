import {test,expect} from '@playwright/test';

const BASE='http://127.0.0.1:4173/index.html#nhl';
test.setTimeout(60000);

async function openPlj(page,width=1440,height=1000){
 await page.setViewportSize({width,height});
 await page.goto(BASE,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof window.DW_openNhlTab==='function',{timeout:30000});
 await page.waitForSelector('#hkPuckLineJesusBtn',{timeout:30000});
 await page.locator('#hkPuckLineJesusBtn').click();
 await expect(page.locator('#hkPuckLineJesusPanel')).toBeVisible();
}

test('Puck Line Jesus is a direct NHL side-nav item',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('http://127.0.0.1:4173/index.html#mlb',{waitUntil:'domcontentloaded'});
 const nhlHead=page.locator('#sbSportAccordion .sb-sport-head[data-sport="nhl"]');
 const item=page.locator('#sbSportAccordion .sb-sub-item[data-nhl-plj]');
 await expect(item).toHaveCount(1,{timeout:30000});
 await expect(item).toHaveText('Puck Line Jesus');
 const structure=await item.evaluate(el=>({
  sport:el.closest('.sb-sport-block')?.querySelector('.sb-sport-head')?.dataset.sport||'',
  previous:el.previousElementSibling?.dataset.nhlTab||''
 }));
 expect(structure.sport).toBe('nhl');
 expect(structure.previous).toBe('live');
 await nhlHead.click();
 await expect(item).toBeVisible({timeout:30000});
 await item.click();
 await expect.poll(()=>page.evaluate(()=>location.hash),{timeout:30000}).toBe('#nhl');
 await expect(page.locator('#hkPuckLineJesusPanel')).toBeVisible({timeout:30000});
 await expect(page.locator('#hkPuckLineJesusPanel')).toContainText('Puck Line Jesus');
 await expect(item).toHaveClass(/is-active/);
});

test('Puck Line Jesus alert opt-in and permanent ledger mount',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('tso.plj.alerts.v1','1'));
 await openPlj(page);
 await expect(page.locator('#hkPuckLineJesusAlertToggle')).toBeVisible();
 await expect(page.locator('#hkPuckLineJesusAlertToggle')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#hkPuckLineJesusAlertToggle')).toContainText('Alerts On');
 await expect(page.locator('#hkPuckLineJesusHistory')).toBeVisible();
 await expect(page.locator('#hkPuckLineJesusHistory')).toContainText('PERMANENT LEDGER');
 await expect(page.locator('#hkPuckLineJesusHistory')).toContainText('Puck Line Jesus History');
 const audit=await page.evaluate(async()=>{
  const h=await fetch('./slates/nhl-plj-history.json?v=browserqa').then(r=>r.json());
  return {version:h.version,summary:h.summary,games:Array.isArray(h.games),enabled:window.DW_pljAlerts?.enabled?.()};
 });
 expect(audit.version).toBe(1);expect(audit.games).toBe(true);expect(audit.enabled).toBe(true);
 for(const key of ['tracked','completed','pljLive','pljCashes','backdoors'])expect(Number.isFinite(Number(audit.summary?.[key]||0))).toBe(true);
 await page.locator('#hkPuckLineJesusAlertToggle').click();
 await expect(page.locator('#hkPuckLineJesusAlertToggle')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('#hkPuckLineJesusAlertToggle')).toContainText('Enable Alerts');
 expect(await page.evaluate(()=>localStorage.getItem('tso.plj.alerts.v1'))).toBe('0');
});

for(const width of [390,768,1440])test(`PLJ alert/history UI has no horizontal overflow at ${width}px`,async({page})=>{
 await openPlj(page,width,width===390?844:1000);
 await expect(page.locator('#hkPuckLineJesusAlertToggle')).toBeVisible();
 await expect(page.locator('#hkPuckLineJesusHistory')).toBeVisible();
 const geometry=await page.evaluate(()=>{const p=document.getElementById('hkPuckLineJesusPanel'),h=document.getElementById('hkPuckLineJesusHistory');return {panel:[p?.scrollWidth||0,p?.clientWidth||0],history:[h?.scrollWidth||0,h?.clientWidth||0]};});
 expect(geometry.panel[0]).toBeLessThanOrEqual(geometry.panel[1]+2);expect(geometry.history[0]).toBeLessThanOrEqual(geometry.history[1]+2);
});
