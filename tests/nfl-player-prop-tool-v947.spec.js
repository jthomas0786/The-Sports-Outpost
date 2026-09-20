import{test,expect}from'@playwright/test';

test.setTimeout(180000);
const BASE='http://127.0.0.1:4173/index.html#nfl';
const HEADERS=['PLAYER','CONSENSUS','PICK','PROJ','L10 AVG','COV PROB','EDGE','DEF VS PROP','MATCHUP','SIM DEF','L5','L10','H2H'];
const STYLES=['tsoPick','safest','bestEdge','balanced','aggressive','correlated','longshot'];
const PERIODS=['full','1h','2h','q1','q2','q3','q4'];
const SNAP=['/slates/nfl.json','/slates/nfl-odds.json','/slates/nfl-sim.json','/slates/nfl-research.json'];

async function open(page,viewport={width:1440,height:900}){
  await page.setViewportSize(viewport);
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#nflPlayerPropToolBtn',{state:'visible',timeout:60000});
  await page.locator('#nflPlayerPropToolBtn').click();
  await page.waitForFunction(()=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptVersion==='94.7'&&document.getElementById('nflPlayerPropTool')?.dataset.nflPptSnapshot==='ready',{timeout:90000});
  await expect(page.locator('#nflPlayerPropTool')).toBeVisible();
}
async function heads(page){return page.locator('#nflPlayerPropTool thead tr:nth-child(2) th').allTextContents().then(a=>a.map(x=>x.replace(/[↕↑↓]/g,'').trim()));}
async function visibleRows(page){return page.locator('#nflPlayerPropTool tbody tr:visible');}

test('v94.7 has bordered rows, thin ring, sportsbook image, DEF logo and exact headers',async({page})=>{
  await open(page);
  await expect.poll(()=>heads(page)).toEqual(HEADERS);
  await expect(page.locator('#nflPlayerPropTool thead [data-ppt-sort]')).toHaveCount(13);
  const row=(await visibleRows(page)).first();
  await expect(row).toBeVisible();
  const metrics=await row.evaluate(r=>{
    const td=r.querySelector('td:nth-child(4)'),ring=r.querySelector('.nfl-ppt-ring-v947 .fill'),book=r.querySelector('.nfl-ppt-bookmark img'),def=r.querySelector('.nfl-ppt-def-v947 img');
    return {rowBorder:getComputedStyle(r).borderBottomWidth,cellBorder:getComputedStyle(td).borderBottomWidth,ringWidth:ring?getComputedStyle(ring).strokeWidth:null,bookSrc:book?.getAttribute('src')||'',defSrc:def?.getAttribute('src')||'',defText:r.querySelector('.nfl-ppt-def-v947')?.textContent||''};
  });
  expect(parseFloat(metrics.cellBorder)).toBeGreaterThan(0);
  expect(parseFloat(metrics.ringWidth)).toBeLessThanOrEqual(3);
  expect(metrics.bookSrc).toMatch(/^https:\/\//);
  expect(metrics.defSrc).toContain('teamlogos/nfl');
  expect(metrics.defText).toContain('vs Prop');
});

test('every column sorts both directions without changing the selected Bet Style',async({page})=>{
  await open(page);
  const style=page.locator('#nflPptMode');
  await style.selectOption('safest');
  await expect(style).toHaveValue('safest');
  await expect(page.locator('#nflPlayerPropTool')).toHaveAttribute('data-nfl-ppt-build-style','safest');
  for(const key of ['player','consensus','pick','proj','median','prob','edge','def','matchup','simDef','l5','l10','h2h']){
    const th=page.locator(`#nflPlayerPropTool th[data-col="${key}"]`),btn=th.locator('[data-ppt-sort]');
    await btn.click();
    const first=await th.getAttribute('aria-sort');
    expect(['ascending','descending']).toContain(first);
    await btn.click();
    const second=await th.getAttribute('aria-sort');
    expect(['ascending','descending']).toContain(second);
    expect(second).not.toBe(first);
    await expect(style).toHaveValue('safest');
    await expect(page.locator('#nflPlayerPropTool')).toHaveAttribute('data-nfl-ppt-build-style','safest');
  }
  await page.locator('#nflPlayerPropTool th[data-col="prob"] [data-ppt-sort]').click();
  const desc=await page.locator('#nflPlayerPropTool tbody tr:visible .nfl-ppt-ring-v947 small').allTextContents();
  const nums=desc.map(x=>Number(x.replace('%',''))).filter(Number.isFinite);
  expect(nums.length).toBeGreaterThan(1);
  for(let i=1;i<nums.length;i++)expect(nums[i]).toBeLessThanOrEqual(nums[i-1]+1e-9);
});

test('Bet Styles remain selected and re-key player lines instead of reverting to TSO Pick',async({page})=>{
  await open(page);
  const select=page.locator('#nflPptMode');
  const fingerprints=new Set();
  for(const style of STYLES){
    await select.selectOption(style);
    await expect(select).toHaveValue(style);
    await expect(page.locator('#nflPlayerPropTool')).toHaveAttribute('data-nfl-ppt-build-style',style);
    await page.waitForTimeout(50);
    const rows=await visibleRows(page);
    const count=await rows.count();
    expect(count).toBeGreaterThan(0);
    expect(await rows.evaluateAll((rs,s)=>rs.every(r=>r.dataset.nflPptStyle===s),style)).toBe(true);
    const fp=await rows.first().evaluate(r=>[r.dataset.nflPptRow,r.querySelector('td:nth-child(2) b')?.textContent,r.querySelector('td:nth-child(3)')?.textContent].join('|'));
    fingerprints.add(fp);
    const pair=await rows.first().evaluate(r=>({cons:r.querySelector('td:nth-child(2) b')?.textContent?.trim()||'',pick:r.querySelector('td:nth-child(3) .nfl-ppt-pick-number b')?.textContent?.trim()||''}));
    expect(pair.pick).toContain(pair.cons);
  }
  expect(fingerprints.size).toBeGreaterThan(1);
});

test('Game and Prop filters keep valid rows instead of blanking the table',async({page})=>{
  await open(page);
  const game=page.locator('#nflPptGame');
  const games=await game.locator('option').evaluateAll(o=>o.map(x=>x.value).filter(v=>v!=='ALL'));
  expect(games.length).toBeGreaterThan(0);
  await game.selectOption(games[0]);
  await expect(game).toHaveValue(games[0]);
  let rows=await visibleRows(page);
  expect(await rows.count()).toBeGreaterThan(0);
  expect(await rows.evaluateAll((rs,g)=>rs.every(r=>r.dataset.nflPptGame===g),games[0])).toBe(true);
  const prop=page.locator('#nflPptMarket');
  const props=await prop.locator('option').evaluateAll(o=>o.map(x=>x.value).filter(v=>v!=='ALL'));
  expect(props.length).toBeGreaterThan(0);
  await prop.selectOption(props[0]);
  await expect(prop).toHaveValue(props[0]);
  rows=await visibleRows(page);
  expect(await rows.count()).toBeGreaterThan(0);
  expect(await rows.evaluateAll((rs,p)=>rs.every(r=>r.dataset.nflPptMarket===p),props[0])).toBe(true);
});

test('style period filters and sorting stay inside the frozen four-file snapshot',async({page})=>{
  let toolRequests=0;
  page.on('request',r=>{try{const u=new URL(r.url());if(SNAP.includes(u.pathname)&&(u.searchParams.get('v')||'').startsWith('94.7-'))toolRequests++;}catch{}});
  await open(page);
  await expect.poll(()=>toolRequests,{timeout:15000}).toBe(4);
  const baseline=toolRequests;
  for(const style of STYLES){await page.locator('#nflPptMode').selectOption(style);await expect(page.locator('#nflPptMode')).toHaveValue(style);}
  for(const p of PERIODS){const b=page.locator(`#nflPlayerPropTool .nfl-ppt-periodbar-v947 [data-nfl-ppt-period="${p}"]`);await b.click();await expect(page.locator('#nflPlayerPropTool')).toHaveAttribute('data-nfl-ppt-period',p);}
  await page.locator('#nflPlayerPropTool th[data-col="edge"] [data-ppt-sort]').click();
  const game=page.locator('#nflPptGame');const gv=await game.locator('option').nth(1).getAttribute('value');if(gv)await game.selectOption(gv);
  await page.waitForTimeout(300);
  expect(toolRequests).toBe(baseline);
});

test('player name opens the actual modern NFL player modal and returns to the same Prop Tool',async({page})=>{
  await open(page);
  const wrap=page.locator('#nflPlayerPropTool .nfl-ppt-table-wrap');
  await wrap.evaluate(el=>el.scrollLeft=180);
  await page.evaluate(()=>window.scrollTo(0,220));
  const before=await page.evaluate(()=>({y:window.scrollY,x:document.querySelector('#nflPlayerPropTool .nfl-ppt-table-wrap')?.scrollLeft||0}));
  await page.locator('#nflPlayerPropTool tbody tr:visible [data-nfl-tool-player]').first().click();
  await expect(page.locator('#nflView .tso-nfl-player-card-v72')).toBeVisible({timeout:30000});
  expect(await page.locator('#nflView .ms-modal:not(:has(.tso-nfl-player-card-v72))').filter({visible:true}).count().catch(()=>0)).toBe(0);
  await page.locator('#nflView .tso-nfl-player-card-v72 .modal-close').click();
  await page.waitForFunction(()=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptVersion==='94.7',{timeout:30000});
  await expect(page.locator('#nflPlayerPropTool')).toBeVisible();
  const after=await page.evaluate(()=>({y:window.scrollY,x:document.querySelector('#nflPlayerPropTool .nfl-ppt-table-wrap')?.scrollLeft||0}));
  expect(Math.abs(after.x-before.x)).toBeLessThanOrEqual(3);
  expect(Math.abs(after.y-before.y)).toBeLessThanOrEqual(6);
});

test('mobile table scrolls internally without widening the page',async({page})=>{
  await open(page,{width:390,height:844});
  const state=await page.evaluate(()=>{const d=document.documentElement,w=document.querySelector('#nflPlayerPropTool .nfl-ppt-table-wrap');return{body:d.scrollWidth-d.clientWidth,internal:w.scrollWidth>w.clientWidth,scrollbar:getComputedStyle(w).scrollbarWidth}});
  expect(state.body).toBeLessThanOrEqual(3);
  expect(state.internal).toBe(true);
  expect(state.scrollbar).toBe('none');
});
