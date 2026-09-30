import {test,expect} from '@playwright/test';

test.setTimeout(90000);
const BASE='http://127.0.0.1:4173/index.html#nhl';

async function openNhl(page,viewport){
 await page.setViewportSize(viewport);
 await page.goto(BASE,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof window.DW_openNhlTab==='function',{timeout:30000});
 await page.waitForSelector('#nhlView .hk-matchup',{timeout:30000});
 await expect.poll(()=>page.locator('#nhlView .hk-matchup').count(),{timeout:30000}).toBeGreaterThan(0);
}
async function tab(page,id){
 await page.evaluate(id=>window.DW_openNhlTab(id),id);
 await page.waitForTimeout(150);
}
async function visiblePropCount(page){return page.locator('#nhlView .hk-prop-card:visible').count();}
async function clearProps(page){
 await page.locator('#hkLaunchClear').click();
 await expect(page.locator('#hkLaunchSearch')).toHaveValue('');
 for(const id of ['hkLaunchTeam','hkLaunchPos','hkLaunchGame'])await expect(page.locator('#'+id)).toHaveValue('ALL');
 await expect(page.locator('#hkLaunchSort')).toHaveValue('model');
 await expect.poll(()=>visiblePropCount(page)).toBeGreaterThan(0);
}
async function firstSpecificOption(page,id){return page.locator('#'+id+' option').evaluateAll(opts=>opts.map(o=>o.value).find(v=>v&&v!=='ALL')||'');}

test('NHL daily launch + Puck Line Jesus work in Chromium',async({page})=>{
 await openNhl(page,{width:1440,height:1000});
 const audit=await page.evaluate(async()=>{
   const [s,plj]=await Promise.all([
     fetch('./slates/nhl.json?v=browserqa-audit').then(r=>r.json()),
     fetch('./slates/nhl-puck-lines.json?v=browserqa-audit').then(r=>r.json())
   ]);
   const dates=[...new Set((s.games||[]).map(g=>g.slateDate))];
   const seen=new Set(),dupes=[];
   for(const g of s.games||[])for(const p of g.players||[]){
     if(p.propsEligible===false)continue;
     const key=String(p.id||p.name||'').toLowerCase();if(!key)continue;
     if(seen.has(key))dupes.push(p.name);else seen.add(key);
   }
   return {date:s.date,dates,games:(s.games||[]).length,dupes,puckLines:(plj.games||[]).filter(g=>g.puckLine).length};
 });
 expect(audit.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
 expect(audit.dates).toEqual([audit.date]);
 expect(audit.games).toBeGreaterThan(0);
 expect(await page.locator('#nhlView .hk-matchup').count()).toBe(audit.games);
 expect(audit.dupes).toEqual([]);
 expect(audit.puckLines).toBeGreaterThan(0);
 await expect(page.locator('#nhlView')).toContainText('NHL Slate');

 const firstMatch=page.locator('#nhlView .hk-matchup').first();
 await expect(firstMatch.locator('[data-hk-launch-details]')).toBeVisible();
 await firstMatch.locator('[data-hk-launch-details]').click();
 await expect(page.locator('#hkLaunchGameModal')).toBeVisible();
 await expect(page.locator('#hkLaunchGameModal [data-hk-launch-close]').first()).toBeVisible();
 await page.locator('#hkLaunchGameModal [data-hk-launch-close]').first().click();

 // Puck Line Jesus must mount from the real NHL header and use the verified sportsbook snapshot.
 const pljButton=page.locator('#hkPuckLineJesusBtn');
 await expect(pljButton).toBeVisible();
 await pljButton.click();
 await expect(page.locator('#hkPuckLineJesusPanel')).toBeVisible();
 await expect(page.locator('#hkPuckLineJesusPanel')).toContainText('Puck Line Jesus');
 await expect(page.locator('#hkPuckLineJesusPanel')).toContainText('Pregame PLJ Candidates');
 await expect(page.locator('#hkPuckLineJesusPanel')).toContainText('not a win probability');
 await expect.poll(()=>page.locator('#hkPuckLineJesusPanel .plj-card').count()).toBeGreaterThan(0);
 const candidateCount=await page.locator('#hkPuckLineJesusPanel .plj-candidate-grade').count();
 if(candidateCount>0)await expect(page.locator('#hkPuckLineJesusPanel .plj-candidate-grade').first()).toContainText(/Grade [ABC]/);
 const panelGeometry=await page.locator('#hkPuckLineJesusPanel').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));
 expect(panelGeometry.scroll).toBeLessThanOrEqual(panelGeometry.client+2);

 // A PLJ card must route to the exact NHL Gamecast matchup, not an arbitrary game/player row.
 const route=await page.locator('#hkPuckLineJesusPanel [data-plj-game]').first().evaluate(async el=>{
   const id=String(el.dataset.pljGame||'');
   const s=await fetch('./slates/nhl.json?v=plj-route').then(r=>r.json());
   const g=(s.games||[]).find(x=>String(x.id)===id);
   return {id,away:g?.away?.abbr||'',home:g?.home?.abbr||''};
 });
 expect(route.id).toBeTruthy();
 await page.locator('#hkPuckLineJesusPanel [data-plj-game]').first().click();
 await expect(page.locator('#hkPuckLineJesusPanel')).toHaveCount(0);
 await expect(page.locator('#nhlView .hk-live-toolbar')).toBeVisible();
 await expect(page.locator('#nhlView .hk-live-scorebar')).toContainText(route.away);
 await expect(page.locator('#nhlView .hk-live-scorebar')).toContainText(route.home);

 await tab(page,'props');
 await expect(page.locator('#hkLaunchPropsControls')).toBeVisible();
 expect(await page.locator('#hkLaunchPropsControls [data-hk-launch-market]').count()).toBe(6);
 for(const id of ['hkLaunchSearch','hkLaunchTeam','hkLaunchPos','hkLaunchGame','hkLaunchSort','hkLaunchClear'])await expect(page.locator('#'+id)).toBeVisible();
 for(const market of ['atg','sog','points','assists','blocks','saves']){
   const button=page.locator(`[data-hk-launch-market="${market}"]`);await button.click();
   await expect(page.locator('#nhlView #hk-market')).toHaveValue(market);
   await expect.poll(()=>page.locator('#nhlView .hk-prop-card').count()).toBeGreaterThan(0);
 }
 await page.locator('[data-hk-launch-market="sog"]').click();
 await expect.poll(()=>page.locator('#nhlView .hk-prop-card').count()).toBeGreaterThan(50);
 const cards=page.locator('#nhlView .hk-prop-card'),totalCards=await cards.count();
 const firstName=(await cards.first().locator('.hk-prop-name b').textContent())?.trim();
 expect(firstName).toBeTruthy();
 await page.locator('#hkLaunchSearch').fill(firstName.split(' ')[0]);
 await expect.poll(()=>visiblePropCount(page)).toBeGreaterThan(0);
 expect(await visiblePropCount(page)).toBeLessThan(totalCards);
 await clearProps(page);
 const team=await firstSpecificOption(page,'hkLaunchTeam');expect(team).toBeTruthy();
 await page.locator('#hkLaunchTeam').selectOption(team);await expect.poll(()=>visiblePropCount(page)).toBeGreaterThan(0);await clearProps(page);
 const pos=await firstSpecificOption(page,'hkLaunchPos');expect(pos).toBeTruthy();
 await page.locator('#hkLaunchPos').selectOption(pos);await expect.poll(()=>visiblePropCount(page)).toBeGreaterThan(0);await clearProps(page);
 const game=await firstSpecificOption(page,'hkLaunchGame');expect(game).toBeTruthy();
 await page.locator('#hkLaunchGame').selectOption(game);await expect.poll(()=>visiblePropCount(page)).toBeGreaterThan(0);await clearProps(page);
 await page.locator('#hkLaunchSort').selectOption('name');
 const names=await page.locator('#nhlView .hk-prop-card:visible .hk-prop-name b').evaluateAll(els=>els.slice(0,20).map(el=>(el.textContent||'').trim()));
 expect(names).toEqual([...names].sort((a,b)=>a.localeCompare(b)));

 await tab(page,'live');
 await expect(page.locator('#nhlView .hk-live-toolbar')).toBeVisible();
 expect(await page.locator('#nhlView [data-hk-gc-tab]').count()).toBe(3);
 await page.locator('#nhlView [data-hk-gc-tab="box"]').click();await expect(page.locator('#nhlView .hk-gc-body')).toBeVisible();
 await page.locator('#nhlView [data-hk-gc-tab="pbp"]').click();await expect(page.locator('#nhlView .hk-gc-body')).toBeVisible();
 await page.locator('#nhlView [data-hk-gc-tab="game"]').click();await expect(page.locator('#nhlView [data-hk-gamecast]')).toBeVisible();

 await tab(page,'feed');
 await expect(page.locator('#nhlView .hk-feed')).toBeVisible();
});

for(const viewport of [{width:390,height:844},{width:768,height:1024},{width:1440,height:1000}]){
 test(`NHL + Puck Line Jesus are readable without horizontal overflow at ${viewport.width}px`,async({page})=>{
   await openNhl(page,viewport);
   const button=page.locator('#hkPuckLineJesusBtn');await expect(button).toBeVisible();await button.click();
   await expect(page.locator('#hkPuckLineJesusPanel')).toBeVisible();
   const plj=await page.evaluate(()=>{const p=document.getElementById('hkPuckLineJesusPanel');return {scroll:p?.scrollWidth||0,client:p?.clientWidth||0};});
   expect(plj.scroll).toBeLessThanOrEqual(plj.client+2);
   await page.locator('#hkPuckLineJesusPanel [data-plj-close]').click();
   await tab(page,'props');await expect(page.locator('#hkLaunchPropsControls')).toBeVisible();
   const geometry=await page.evaluate(()=>{const v=document.getElementById('nhlView'),search=document.getElementById('hkLaunchSearch'),card=document.querySelector('#nhlView .hk-prop-card'),name=card?.querySelector('.hk-prop-name b');return {scroll:v?.scrollWidth||0,client:v?.clientWidth||0,searchH:search?.getBoundingClientRect().height||0,nameSize:parseFloat(getComputedStyle(name).fontSize)||0};});
   expect(geometry.scroll).toBeLessThanOrEqual(geometry.client+2);expect(geometry.searchH).toBeGreaterThanOrEqual(36);expect(geometry.nameSize).toBeGreaterThanOrEqual(viewport.width<=620?16:14);
   await tab(page,'live');const liveGeometry=await page.evaluate(()=>{const v=document.getElementById('nhlView');return {scroll:v.scrollWidth,client:v.clientWidth};});expect(liveGeometry.scroll).toBeLessThanOrEqual(liveGeometry.client+2);
 });
}