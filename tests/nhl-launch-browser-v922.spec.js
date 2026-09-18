import {test,expect} from '@playwright/test';

const BASE='http://127.0.0.1:4173/index.html#nhl';

async function openNhl(page,viewport){
 await page.setViewportSize(viewport);
 await page.goto(BASE,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof window.DW_openNhlTab==='function',{timeout:30000});
 await page.waitForSelector('#nhlView .hk-matchup',{timeout:30000});
 await page.waitForFunction(()=>document.querySelectorAll('#nhlView .hk-matchup').length===7,{timeout:30000});
}
async function tab(page,id){
 await page.evaluate(id=>window.DW_openNhlTab(id),id);
 await page.waitForTimeout(120);
}
async function visiblePropCount(page){
 return page.locator('#nhlView .hk-prop-card:visible').count();
}
async function clearProps(page){
 await page.locator('#hkLaunchClear').click();
 await expect(page.locator('#hkLaunchSearch')).toHaveValue('');
 for(const id of ['hkLaunchTeam','hkLaunchPos','hkLaunchGame'])await expect(page.locator('#'+id)).toHaveValue('ALL');
 await expect(page.locator('#hkLaunchSort')).toHaveValue('model');
 await expect.poll(()=>visiblePropCount(page)).toBeGreaterThan(0);
}
async function firstSpecificOption(page,id){
 return page.locator('#'+id+' option').evaluateAll(opts=>opts.map(o=>o.value).find(v=>v&&v!=='ALL')||'');
}

test('NHL launch surfaces work in Chromium',async({page})=>{
 await openNhl(page,{width:1440,height:1000});
 expect(await page.locator('#nhlView .hk-matchup').count()).toBe(7);
 await expect(page.locator('#nhlView')).toContainText('NHL Slate');
 await expect(page.locator('#nhlView')).toContainText('Split squad');
 await expect(page.locator('#nhlView')).toContainText('Neutral site');

 const slateAudit=await page.evaluate(async()=>{
   const s=await fetch('./slates/nhl.json?v=browserqa-audit').then(r=>r.json());
   const dates=[...new Set((s.games||[]).map(g=>g.slateDate))];
   const seen=new Set(),dupes=[];
   for(const g of s.games||[])for(const p of g.players||[]){
     if(p.propsEligible===false)continue;
     const key=String(p.id||p.name||'').toLowerCase();
     if(!key)continue;
     if(seen.has(key))dupes.push(p.name);else seen.add(key);
   }
   return {date:s.date,dates,games:(s.games||[]).length,dupes,split:(s.games||[]).filter(g=>g.splitSquad).length};
 });
 expect(slateAudit.date).toBe('2026-09-19');
 expect(slateAudit.dates).toEqual(['2026-09-19']);
 expect(slateAudit.games).toBe(7);
 expect(slateAudit.dupes).toEqual([]);
 expect(slateAudit.split).toBe(2);

 const nonSplit=page.locator('#nhlView .hk-matchup').filter({hasText:'DAL'}).first();
 await nonSplit.locator('[data-hk-launch-details]').click();
 await expect(page.locator('#hkLaunchGameModal')).toBeVisible();
 await expect(page.locator('#hkLaunchGameModal')).toContainText('DAL');
 await expect(page.locator('#hkLaunchGameModal')).toContainText('STL');
 const modalPlayer=page.locator('#hkLaunchGameModal [data-hk-launch-player]').first();
 await expect(modalPlayer).toBeVisible();
 await modalPlayer.click();
 await expect(page.locator('.tso-nhl-modal-backdrop')).toBeVisible();
 await expect(page.locator('.tso-nhl-player-card-v911')).toBeVisible();
 await page.locator('.tso-nhl-modal-backdrop .modal-close').click();

 await tab(page,'props');
 await expect(page.locator('#hkLaunchPropsControls')).toBeVisible();
 expect(await page.locator('#hkLaunchPropsControls [data-hk-launch-market]').count()).toBe(6);
 for(const id of ['hkLaunchSearch','hkLaunchTeam','hkLaunchPos','hkLaunchGame','hkLaunchSort','hkLaunchClear'])await expect(page.locator('#'+id)).toBeVisible();

 for(const market of ['atg','sog','points','assists','blocks','saves']){
   const button=page.locator(`[data-hk-launch-market="${market}"]`);
   await button.click();
   await expect(page.locator('#nhlView #hk-market')).toHaveValue(market);
   await expect(button).toHaveClass(/active/);
   await expect.poll(()=>page.locator('#nhlView .hk-prop-card').count()).toBeGreaterThan(0);
 }
 await page.locator('[data-hk-launch-market="sog"]').click();
 await expect(page.locator('#nhlView #hk-market')).toHaveValue('sog');
 await expect.poll(()=>page.locator('#nhlView .hk-prop-card').count()).toBeGreaterThan(100);

 const duplicateCards=await page.locator('#nhlView .hk-prop-card').evaluateAll(cards=>{
   const seen=new Set(),dupes=[];
   for(const card of cards){
     const name=card.querySelector('.hk-prop-name b')?.textContent?.trim()||'';
     const team=(card.querySelector('.hk-prop-name span')?.textContent||'').split('·')[0].trim();
     const key=(name+'|'+team).toLowerCase();
     if(!name)continue;
     if(seen.has(key))dupes.push(key);else seen.add(key);
   }
   return dupes;
 });
 expect(duplicateCards).toEqual([]);

 const cards=page.locator('#nhlView .hk-prop-card');
 const totalCards=await cards.count();
 const firstName=(await cards.first().locator('.hk-prop-name b').textContent())?.trim();
 expect(firstName).toBeTruthy();
 await page.locator('#hkLaunchSearch').fill(firstName.split(' ')[0]);
 await expect.poll(()=>visiblePropCount(page)).toBeGreaterThan(0);
 expect(await visiblePropCount(page)).toBeLessThan(totalCards);
 await clearProps(page);

 const team=await firstSpecificOption(page,'hkLaunchTeam');expect(team).toBeTruthy();
 await page.locator('#hkLaunchTeam').selectOption(team);
 await expect.poll(()=>visiblePropCount(page)).toBeGreaterThan(0);
 expect(await page.locator('#nhlView .hk-prop-card:visible .hk-prop-name span').evaluateAll((els,t)=>els.every(el=>(el.textContent||'').split('·')[0].trim()===t),team)).toBe(true);
 await clearProps(page);

 const pos=await firstSpecificOption(page,'hkLaunchPos');expect(pos).toBeTruthy();
 await page.locator('#hkLaunchPos').selectOption(pos);
 await expect.poll(()=>visiblePropCount(page)).toBeGreaterThan(0);
 expect(await page.locator('#nhlView .hk-prop-card:visible .hk-prop-name span').evaluateAll((els,p)=>els.every(el=>(el.textContent||'').split('·')[1]?.trim()===p),pos)).toBe(true);
 await clearProps(page);

 const game=await firstSpecificOption(page,'hkLaunchGame');expect(game).toBeTruthy();
 await page.locator('#hkLaunchGame').selectOption(game);
 await expect.poll(()=>visiblePropCount(page)).toBeGreaterThan(0);
 expect(await page.locator('#nhlView .hk-prop-card:visible .hk-prop-match').evaluateAll((els,g)=>els.every(el=>(el.textContent||'').split('·')[0].trim()===g),game)).toBe(true);
 await clearProps(page);

 await page.locator('#hkLaunchSort').selectOption('name');
 const names=await page.locator('#nhlView .hk-prop-card:visible .hk-prop-name b').evaluateAll(els=>els.slice(0,20).map(el=>(el.textContent||'').trim()));
 expect(names).toEqual([...names].sort((a,b)=>a.localeCompare(b)));
 await expect(page.locator('#hkLaunchPropCount')).toContainText('players');
 await clearProps(page);
 await cards.first().click();
 await expect(page.locator('.tso-nhl-modal-backdrop')).toBeVisible();
 await page.locator('.tso-nhl-modal-backdrop .modal-close').click();

 await tab(page,'live');
 await expect(page.locator('#nhlView .hk-live-toolbar')).toBeVisible();
 expect(await page.locator('#nhlView [data-hk-gc-tab]').count()).toBe(3);
 await page.locator('#nhlView [data-hk-gc-tab="box"]').click();
 await expect(page.locator('#nhlView .hk-gc-body')).toBeVisible();
 await page.locator('#nhlView [data-hk-gc-tab="pbp"]').click();
 await expect(page.locator('#nhlView .hk-gc-body')).toBeVisible();
 await page.locator('#nhlView [data-hk-gc-tab="game"]').click();
 await expect(page.locator('#nhlView [data-hk-gamecast]')).toBeVisible();
 await page.waitForTimeout(10500);
 await expect(page.locator('#nhlView .hk-live-toolbar')).toBeVisible();
 await expect(page.locator('#nhlView [data-hk-gamecast]')).toBeVisible();

 await tab(page,'feed');
 await expect(page.locator('#nhlView .hk-feed')).toBeVisible();
 const eligible=await page.evaluate(async()=>{
   const s=await fetch('./slates/nhl.json?v=browserqa').then(r=>r.json());
   for(const g of s.games||[])for(const p of g.players||[])if(p.propsEligible!==false&&p.position!=='G')return {name:p.name,team:p.team};
   return null;
 });
 expect(eligible).toBeTruthy();
 await page.evaluate(p=>{
   const host=document.querySelector('#nhlView .hk-feed');
   const c=document.createElement('article');c.className='hk-feed-card';
   c.innerHTML=`<div class="hk-feed-time">P1<br>19:01</div><div class="hk-feed-main"><div class="hk-feed-name"><b>${p.name}</b><span>${p.team} · GOAL</span></div><p>Browser QA goal</p><div class="hk-feed-score">QA 1 · TEST 0</div></div>`;
   host.appendChild(c);
 },eligible);
 await expect(page.locator('.hk-launch-goal-toast')).toBeVisible({timeout:5000});
 await expect(page.locator('#nhlView .hk-feed-card[role="button"]')).toBeVisible();

 await page.evaluate(()=>{
   const b=document.getElementById('ccGlobalTrigger');if(b)b.click();
 });
 await page.locator('#ccBackdrop .cc-tab[data-tab="hockey"]').click({force:true});
 await expect(page.locator('#ccHockeyCol')).toContainText('Hockey');
 await expect(page.locator('#ccHockeyCol .hk-launch-cc-extra')).toBeVisible({timeout:5000});
 await expect(page.locator('#ccHockeyCol')).toContainText('Launch Slate');
 await expect(page.locator('#ccHockeyCol')).toContainText('Top Goal Threats');
 const ccDetails=page.locator('#ccHockeyCol [data-hk-launch-details]').first();
 await expect(ccDetails).toBeVisible();
 await ccDetails.click();
 await expect(page.locator('#hkLaunchGameModal')).toBeVisible();
 await page.locator('#hkLaunchGameModal [data-hk-launch-close]').first().click();
});

for(const viewport of [{width:390,height:844},{width:768,height:1024},{width:1440,height:1000}]){
 test(`NHL launch is readable without horizontal overflow at ${viewport.width}px`,async({page})=>{
   await openNhl(page,viewport);
   await tab(page,'props');
   await expect(page.locator('#hkLaunchPropsControls')).toBeVisible();
   const geometry=await page.evaluate(()=>{
     const v=document.getElementById('nhlView');
     const search=document.getElementById('hkLaunchSearch');
     const card=document.querySelector('#nhlView .hk-prop-card');
     const name=card?.querySelector('.hk-prop-name b');
     return {scroll:v?.scrollWidth||0,client:v?.clientWidth||0,searchH:search?.getBoundingClientRect().height||0,nameSize:parseFloat(getComputedStyle(name).fontSize)||0};
   });
   expect(geometry.scroll).toBeLessThanOrEqual(geometry.client+2);
   expect(geometry.searchH).toBeGreaterThanOrEqual(36);
   expect(geometry.nameSize).toBeGreaterThanOrEqual(viewport.width<=620?16:14);
   await tab(page,'live');
   const liveGeometry=await page.evaluate(()=>{const v=document.getElementById('nhlView');return {scroll:v.scrollWidth,client:v.clientWidth};});
   expect(liveGeometry.scroll).toBeLessThanOrEqual(liveGeometry.client+2);
 });
}
