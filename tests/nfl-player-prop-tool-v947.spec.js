import{test,expect}from'@playwright/test';

test.setTimeout(180000);
const BASE='http://127.0.0.1:4173/index.html#nfl';
const HEADERS=['PLAYER','PROP LINE','PICK','PROJ','L10 AVG','COV PROB','EDGE','DEF VS PROP','MATCHUP','SIM DEF','L5','L10','H2H'];
const STYLES=['tsoPick','safest','bestEdge','balanced','aggressive','correlated','longshot'];
const PERIODS=['full','1h','2h','q1','q2','q3','q4'];
const SNAP=['/slates/nfl.json','/slates/nfl-odds.json','/slates/nfl-sim.json','/slates/nfl-research.json'];

async function open(page,viewport={width:1440,height:900}){
  await page.setViewportSize(viewport);
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#nflPlayerPropToolBtn',{state:'attached',timeout:60000});
  await page.evaluate(()=>document.getElementById('nflPlayerPropToolBtn')?.click());
  await page.waitForFunction(()=>document.getElementById('nflView')?.classList.contains('nfl-ppt-active-v948'),null,{timeout:15000});
  await page.waitForFunction(()=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptVersion==='95.0'&&document.getElementById('nflPlayerPropTool')?.dataset.nflPptSnapshot==='ready',{timeout:90000});
  const visibility=await page.locator('#nflPlayerPropTool').evaluate(el=>{
    const chain=[];let n=el;
    while(n&&n!==document.documentElement){const cs=getComputedStyle(n),r=n.getBoundingClientRect();chain.push({tag:n.tagName,id:n.id,cls:n.className,hidden:n.hasAttribute('hidden'),display:cs.display,visibility:cs.visibility,opacity:cs.opacity,w:r.width,h:r.height});n=n.parentElement;}
    return chain;
  });
  console.log('PROP_TOOL_VISIBILITY '+JSON.stringify(visibility));
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
  expect(metrics.defText).toMatch(/Great|Good|Fair|Poor/);
  expect(metrics.defText).toContain('PREV YR');
});

test('every column sorts both directions without changing the selected Bet Style',async({page})=>{
  await open(page);
  const style=page.locator('#nflPptMode');
  await style.selectOption('safest');
  await expect(style).toHaveValue('safest');
  await expect(page.locator('#nflPlayerPropTool')).toHaveAttribute('data-nfl-ppt-build-style','safest');
  for(const key of ['player','propLine','pick','proj','l10Avg','prob','edge','def','matchup','simDef','l5','l10','h2h']){
    const th=page.locator(`#nflPlayerPropTool th[data-col="${key}"]`),btn=th.locator('[data-ppt-sort]');
    await expect(btn).toHaveCount(1);
    await btn.evaluate(el=>el.click());
    const first=await th.getAttribute('aria-sort');
    expect(['ascending','descending']).toContain(first);
    await btn.evaluate(el=>el.click());
    const second=await th.getAttribute('aria-sort');
    expect(['ascending','descending']).toContain(second);
    expect(second).not.toBe(first);
    await expect(style).toHaveValue('safest');
    await expect(page.locator('#nflPlayerPropTool')).toHaveAttribute('data-nfl-ppt-build-style','safest');
  }
  await page.locator('#nflPlayerPropTool th[data-col="prob"] [data-ppt-sort]').evaluate(el=>el.click());
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
  const options=await game.locator('option').evaluateAll(o=>o.slice(1).map(x=>({value:x.value,label:x.textContent||''})));
  const slateGames=await page.evaluate(async()=>{const d=await fetch('./slates/nfl.json').then(r=>r.json());return(d.games||[]).map(g=>String(g.gameId||g.id||'')).filter(Boolean);});
  expect(options.map(x=>x.value)).toEqual(slateGames);
  expect(options.every(x=>/\d{1,2}:\d{2}\s*(am|pm)/i.test(x.label))).toBe(true);
  const activeGame=await (await visibleRows(page)).first().getAttribute('data-nfl-ppt-game');
  expect(activeGame).toBeTruthy();
  await game.selectOption(activeGame);
  await expect(game).toHaveValue(activeGame);
  let rows=await visibleRows(page);
  expect(await rows.count()).toBeGreaterThan(0);
  expect(await rows.evaluateAll((rs,g)=>rs.every(r=>r.dataset.nflPptGame===g),activeGame)).toBe(true);
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
  page.on('request',r=>{try{const u=new URL(r.url());if(SNAP.includes(u.pathname)&&(u.searchParams.get('v')||'').startsWith('95.0-'))toolRequests++;}catch{}});
  await open(page);
  await expect.poll(()=>toolRequests,{timeout:15000}).toBe(4);
  const baseline=toolRequests;
  for(const style of STYLES){await page.locator('#nflPptMode').selectOption(style);await expect(page.locator('#nflPptMode')).toHaveValue(style);}
  for(const p of PERIODS){const b=page.locator(`#nflPlayerPropTool .nfl-ppt-periodbar-v947 [data-nfl-ppt-period="${p}"]`);await b.click();await expect(page.locator('#nflPlayerPropTool')).toHaveAttribute('data-nfl-ppt-period',p);}
  await page.locator('#nflPlayerPropTool th[data-col="edge"] [data-ppt-sort]').evaluate(el=>el.click());
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
  await page.locator('#nflPlayerPropTool tbody tr:visible [data-nfl-tool-player]').first().evaluate(el=>el.click());
  await expect(page.locator('#nflView .tso-nfl-player-card-v72')).toBeVisible({timeout:30000});
  expect(await page.locator('#nflView .ms-modal').evaluateAll(ms=>ms.filter(m=>m.getClientRects().length&&!m.querySelector('.tso-nfl-player-card-v72')).length)).toBe(0);
  await page.locator('#nflView .tso-nfl-player-card-v72 .modal-close').click();
  await page.waitForFunction(()=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptVersion==='95.0',{timeout:30000});
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


test('v95.0 readability keeps all columns centered with larger Player and historical Matchup cells',async({page})=>{
  await open(page);
  const row=page.locator('#nflPlayerPropTool tbody tr:visible').first();
  const layout=await row.evaluate(r=>({centers:[...r.children].every(td=>getComputedStyle(td).textAlign==='center'),playerWidth:r.children[0].getBoundingClientRect().width,star:r.querySelector('.nfl-ppt-watch-v947')?.getBoundingClientRect().width||0,avatar:r.querySelector('.nfl-ppt-avatar-v947')?.getBoundingClientRect().width||0,matchText:r.querySelector('.nfl-ppt-history-v949')?.textContent||'',matchTitle:r.querySelector('.nfl-ppt-history-v949')?.getAttribute('title')||''}));
  expect(layout.centers).toBe(true);
  expect(layout.playerWidth).toBeGreaterThanOrEqual(189);
  expect(layout.playerWidth).toBeLessThanOrEqual(200);
  expect(layout.star).toBeLessThan(layout.avatar);
  expect(layout.matchText).toMatch(/Great|Good|Fair|Poor/);
  expect(layout.matchTitle).toContain('No simulation data is used');
});


test('simulation columns and actual game-log columns keep strict data ownership',async({page})=>{
  await open(page);
  const all=await page.evaluate(()=>window.__TSO_NFL_PLAYER_PROP_V947__?.buildRows?.()||[]);
  const historical=all.find(r=>Number.isFinite(Number(r.l10Avg))&&r.l5Actual?.total&&r.l10Actual?.total);
  expect(historical).toBeTruthy();
  const row=page.locator('#nflPlayerPropTool tbody tr').filter({has:page.locator(`[data-row-id="${historical.id.replace(/([\"\\])/g,'\\$1')}"]`)}).first();
  if(await row.count()){
    const cells=await row.locator('td').allTextContents();
    expect(cells[3]).toContain('vs line');
    expect(cells[3]).not.toContain('SIM MEAN');
    expect(cells[4]).not.toContain('SIM MED');
    expect(Number((await row.locator('td').nth(4).locator('b').textContent())||NaN)).toBeCloseTo(Number(historical.l10Avg),1);
    expect(cells[10]).toContain(`${historical.l5Actual.hits}/${historical.l5Actual.total}`);
    expect(cells[11]).toContain(`${historical.l10Actual.hits}/${historical.l10Actual.total}`);
    if(historical.h2hActual?.total)expect(cells[12]).toContain(`${historical.h2hActual.hits}/${historical.h2hActual.total}`);
    expect(cells[10]).not.toContain('50K SIM');
    expect(cells[11]).not.toContain('50K SIM');
    expect(cells[12]).not.toContain('50K SIM');
  }
});


test('scrolling is display-only: no Prop Tool refetch or table rebuild',async({page})=>{
  let toolRequests=0;
  page.on('request',r=>{
    try{
      const u=new URL(r.url());
      if(SNAP.includes(u.pathname)&&(u.searchParams.get('v')||'').startsWith('95.0-'))toolRequests++;
    }catch{}
  });
  await open(page,{width:1280,height:800});
  await expect.poll(()=>toolRequests,{timeout:15000}).toBe(4);
  await page.evaluate(()=>{
    const tbody=document.querySelector('#nflPlayerPropTool tbody');
    if(tbody)tbody.dataset.scrollQaToken='stable';
  });
  const wrap=page.locator('#nflPlayerPropTool .nfl-ppt-table-wrap');
  for(let i=0;i<12;i++){
    await page.mouse.wheel(0,420);
    await wrap.evaluate((el,n)=>{el.scrollLeft=(n%2?0:Math.max(0,el.scrollWidth-el.clientWidth));},i);
  }
  await page.waitForTimeout(1200);
  expect(toolRequests).toBe(4);
  await expect(page.locator('#nflPlayerPropTool tbody')).toHaveAttribute('data-scroll-qa-token','stable');
});


test('Over Under segmented switch covers both directions and same-side clear',async({page})=>{
  let toolRequests=0;
  page.on('request',r=>{try{const u=new URL(r.url());if(SNAP.includes(u.pathname)&&(u.searchParams.get('v')||'').startsWith('95.0-'))toolRequests++;}catch{}});
  await open(page);
  await expect.poll(()=>toolRequests,{timeout:15000}).toBe(4);
  const baseline=toolRequests;
  const over=page.locator('[data-nfl-ppt-side="over"]'),under=page.locator('[data-nfl-ppt-side="under"]');
  const sideState=()=>page.evaluate(()=>{
    const rows=[...document.querySelectorAll('#nflPlayerPropTool tbody tr')];
    const visible=rows.map(r=>r.querySelector('.nfl-ppt-pick-v947')?.classList.contains('under')?'under':'over');
    const source=(window.__TSO_NFL_PLAYER_PROP_V947__?.buildRows?.()||[]).map(r=>r.side);
    return {
      side:window.__TSO_NFL_PLAYER_PROP_V947__?.state?.side??null,
      visible,
      source,
      overPressed:document.querySelector('[data-nfl-ppt-side="over"]')?.getAttribute('aria-pressed'),
      underPressed:document.querySelector('[data-nfl-ppt-side="under"]')?.getAttribute('aria-pressed')
    };
  });
  const expectOnly=async(side)=>{
    const st=await sideState();
    expect(st.side).toBe(side);
    expect(st.visible.length).toBeGreaterThan(0);
    expect(new Set(st.visible)).toEqual(new Set([side]));
    expect(st.overPressed).toBe(side==='over'?'true':'false');
    expect(st.underPressed).toBe(side==='under'?'true':'false');
  };
  let st=await sideState();
  expect(st.side).toBeNull();
  expect(st.overPressed).toBe('false');expect(st.underPressed).toBe('false');
  expect(new Set(st.source)).toEqual(new Set(['over','under']));
  expect(new Set(st.visible)).toEqual(new Set(['over','under']));

  await over.click();await expectOnly('over');
  await under.click();await expectOnly('under');
  await over.click();await expectOnly('over');
  await over.click();
  st=await sideState();
  expect(st.side).toBeNull();expect(st.overPressed).toBe('false');expect(st.underPressed).toBe('false');
  expect(new Set(st.visible)).toEqual(new Set(['over','under']));

  await under.click();await expectOnly('under');
  await under.click();
  st=await sideState();
  expect(st.side).toBeNull();expect(new Set(st.visible)).toEqual(new Set(['over','under']));
  await page.waitForTimeout(150);
  expect(toolRequests).toBe(baseline);
});

test('Over Under side selection survives every other Player Prop Tool filter',async({page})=>{
  await open(page);
  const over=page.locator('[data-nfl-ppt-side="over"]');
  await over.click();
  const assertOver=async()=>{
    await expect(over).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('[data-nfl-ppt-side="under"]')).toHaveAttribute('aria-pressed','false');
    expect(await page.evaluate(()=>window.__TSO_NFL_PLAYER_PROP_V947__?.state?.side)).toBe('over');
    const sides=await page.locator('#nflPlayerPropTool tbody tr:visible .nfl-ppt-pick-v947').evaluateAll(nodes=>nodes.map(n=>n.classList.contains('under')?'under':'over'));
    expect(sides.every(x=>x==='over')).toBe(true);
  };
  await assertOver();

  await page.locator('#nflPptMode').selectOption('safest');await assertOver();
  const nonAllValue=async select=>{
    const values=await select.locator('option').evaluateAll(opts=>opts.map(o=>o.value).filter(v=>v&&v!=='ALL'));
    return values[0]||null;
  };

  // Exercise Game and Prop independently. A selected game can legitimately have
  // no second Prop option after all other filters are applied, so do not wait on
  // option:nth(1). Each filter still gets a real non-ALL selection and side check.
  const game=page.locator('#nflPptGame');
  const gv=await nonAllValue(game);expect(gv).not.toBeNull();
  await game.selectOption(gv);await assertOver();
  await game.selectOption('ALL');await assertOver();

  const prop=page.locator('#nflPptMarket');
  const pv=await nonAllValue(prop);expect(pv).not.toBeNull();
  await prop.selectOption(pv);await assertOver();
  await prop.selectOption('ALL');await assertOver();

  if(await page.locator('#nflPlayerPropTool tbody tr:visible').count()){
    const activeRowId=await page.locator('#nflPlayerPropTool tbody tr:visible').first().getAttribute('data-nfl-ppt-row');
    const activePos=await page.evaluate(id=>(window.__TSO_NFL_PLAYER_PROP_V947__?.buildRows?.()||[]).find(r=>r.id===id)?.position||'',activeRowId);
    const alternate=['QB','RB','WR','TE'].find(p=>p!==activePos);
    if(alternate){
      const pos=page.locator(`[data-nfl-ppt-pos="${alternate}"]`);
      await pos.click();await assertOver();
      await pos.click();await assertOver();
    }
  }

  await page.locator('#nflPptFilters').click();
  if(await page.locator('#nflPlayerPropTool tbody tr:visible [data-nfl-tool-player] b').count()){
    const playerName=await page.locator('#nflPlayerPropTool tbody tr:visible [data-nfl-tool-player] b').first().textContent();
    if(playerName){
      const search=page.locator('#nflPptSearch');
      await search.fill(playerName.replace('↗','').trim().split(/\s+/)[0]);await assertOver();
      await search.fill('');await assertOver();
    }
  }
  const team=page.locator('#nflPptTeam');
  const tv=await nonAllValue(team);expect(tv).not.toBeNull();
  await team.selectOption(tv);await assertOver();
  await team.selectOption('ALL');await assertOver();

  await page.locator('#nflPptMin').selectOption('0.50');await assertOver();
  await page.locator('#nflPptMin').selectOption('0.40');await assertOver();
  for(const p of ['1h','q1','full']){await page.locator(`[data-nfl-ppt-period="${p}"]`).click();await assertOver();}
});


test('v95.0 larger text Historical actuals and column-by-column Quick Guide',async({page})=>{
  await open(page);
  await expect(page.locator('#nflPlayerPropTool thead tr:nth-child(2) th').filter({hasText:'MATCHUP'})).toHaveCount(1);
  await expect(page.locator('#nflPlayerPropTool thead tr:nth-child(2) th').filter({hasText:'HISTORICAL'})).toHaveCount(0);

  const history=page.locator('#nflPlayerPropTool tbody tr:visible .nfl-ppt-history-v949');
  await expect(history.first()).toBeVisible();
  const historyTexts=await history.evaluateAll(nodes=>nodes.slice(0,25).map(n=>(n.textContent||'').trim()));
  expect(historyTexts.some(x=>/\d+\/\d+ HIT/.test(x))).toBe(true);
  expect(historyTexts.filter(x=>x!=='—FULL GAME').every(x=>/(Great|Good|Fair|Poor)/.test(x))).toBe(true);
  expect(new Set(historyTexts.map(x=>(x.match(/Great|Good|Fair|Poor/)||[])[0]).filter(Boolean)).size).toBeGreaterThanOrEqual(2);
  const historyTitle=await history.first().getAttribute('title');
  expect(historyTitle||'').toContain('actual recent hit rate');
  expect(historyTitle||'').toContain('No simulation data');

  const defense=page.locator('#nflPlayerPropTool tbody tr:visible .nfl-ppt-def-v947');
  await expect(defense.first()).toBeVisible();
  const defenseTexts=await defense.evaluateAll(nodes=>nodes.slice(0,25).map(n=>(n.textContent||'').trim()));
  expect(defenseTexts.some(x=>/(Great|Good|Fair|Poor)/.test(x))).toBe(true);
  const defenseTitle=await defense.first().getAttribute('title');
  expect(defenseTitle||'').toContain('previous-season actual allowance');
  expect(defenseTitle||'').toContain('No simulation data');

  const fontSizes=await page.evaluate(()=>({
    player:parseFloat(getComputedStyle(document.querySelector('.nfl-ppt-player-v947 b')).fontSize),
    metric:parseFloat(getComputedStyle(document.querySelector('.nfl-ppt-metric-v947 b')).fontSize),
    header:parseFloat(getComputedStyle(document.querySelector('.nfl-ppt-table thead tr:nth-child(2) th button')).fontSize),
    control:parseFloat(getComputedStyle(document.querySelector('.nfl-ppt-selects-v947 select')).fontSize),
  }));
  expect(fontSizes.player).toBeGreaterThanOrEqual(15);
  expect(fontSizes.metric).toBeGreaterThanOrEqual(14);
  expect(fontSizes.header).toBeGreaterThanOrEqual(10.8);
  expect(fontSizes.control).toBeGreaterThanOrEqual(13);

  await page.locator('#nflPptGuide').click();
  const cards=page.locator('#nflPlayerPropGuide .nfl-ppt-guide-grid-v947>div');
  await expect(cards).toHaveCount(13);
  const guideLabels=await cards.locator('b').allTextContents();
  expect(guideLabels).toEqual(['PLAYER','PROP LINE','PICK','PROJ','L10 AVG','COV PROB','EDGE','DEF VS PROP','MATCHUP','SIM DEF','L5','L10','H2H']);
  const guideFont=await cards.locator('p').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  expect(guideFont).toBeGreaterThanOrEqual(11);
  await page.locator('[data-nfl-ppt-guide-close]').click();

  const matchupCell=page.locator('#nflPlayerPropTool tbody td:has(.nfl-ppt-history-v949.great),#nflPlayerPropTool tbody td:has(.nfl-ppt-history-v949.good),#nflPlayerPropTool tbody td:has(.nfl-ppt-history-v949.mid),#nflPlayerPropTool tbody td:has(.nfl-ppt-history-v949.bad)').first();
  await expect(matchupCell).toBeVisible();
  const matchupStyle=await matchupCell.evaluate(td=>({bg:getComputedStyle(td).backgroundColor,text:getComputedStyle(td.querySelector('.nfl-ppt-history-v949 b')).color}));
  expect(matchupStyle.bg).not.toBe('rgba(0, 0, 0, 0)');
  expect(matchupStyle.text).not.toBe('rgb(243, 248, 252)');

  const defCell=page.locator('#nflPlayerPropTool tbody td:has(.nfl-ppt-def-v947.great),#nflPlayerPropTool tbody td:has(.nfl-ppt-def-v947.good),#nflPlayerPropTool tbody td:has(.nfl-ppt-def-v947.mid),#nflPlayerPropTool tbody td:has(.nfl-ppt-def-v947.bad)').first();
  await expect(defCell).toBeVisible();
  const defStyle=await defCell.evaluate(td=>({bg:getComputedStyle(td).backgroundColor,text:getComputedStyle(td.querySelector('.nfl-ppt-def-copy-v949 b')).color}));
  expect(defStyle.bg).not.toBe('rgba(0, 0, 0, 0)');
  expect(defStyle.text).not.toBe('rgb(243, 248, 252)');
});


test('v95.0 keeps the entire Player column frozen during horizontal scrolling',async({page})=>{
  await open(page,{width:900,height:800});
  const wrap=page.locator('#nflPlayerPropTool .nfl-ppt-table-wrap');
  const playerHead=page.locator('#nflPlayerPropTool thead tr:nth-child(2) th[data-col="player"]');
  const firstRow=page.locator('#nflPlayerPropTool tbody tr:visible').first();
  const playerCell=firstRow.locator('td').first();
  const propCell=firstRow.locator('td').nth(1);
  const before=await page.evaluate(()=>{
    const wrap=document.querySelector('#nflPlayerPropTool .nfl-ppt-table-wrap');
    const head=document.querySelector('#nflPlayerPropTool thead tr:nth-child(2) th[data-col="player"]');
    const row=document.querySelector('#nflPlayerPropTool tbody tr:not([hidden])');
    const player=row?.children?.[0],next=row?.children?.[1];
    return {max:wrap?wrap.scrollWidth-wrap.clientWidth:0,headLeft:head?.getBoundingClientRect().left,playerLeft:player?.getBoundingClientRect().left,nextLeft:next?.getBoundingClientRect().left};
  });
  expect(before.max).toBeGreaterThan(100);
  await wrap.evaluate(el=>{el.scrollLeft=Math.min(500,el.scrollWidth-el.clientWidth);});
  await expect.poll(()=>wrap.evaluate(el=>el.scrollLeft)).toBeGreaterThan(100);
  const after=await page.evaluate(()=>{
    const head=document.querySelector('#nflPlayerPropTool thead tr:nth-child(2) th[data-col="player"]');
    const row=document.querySelector('#nflPlayerPropTool tbody tr:not([hidden])');
    const player=row?.children?.[0],next=row?.children?.[1];
    return {headLeft:head?.getBoundingClientRect().left,playerLeft:player?.getBoundingClientRect().left,nextLeft:next?.getBoundingClientRect().left,headPos:head?getComputedStyle(head).position:'',playerPos:player?getComputedStyle(player).position:'',headZ:head?Number(getComputedStyle(head).zIndex):0,playerZ:player?Number(getComputedStyle(player).zIndex):0};
  });
  expect(after.headPos).toBe('sticky');
  expect(after.playerPos).toBe('sticky');
  expect(after.headZ).toBeGreaterThan(after.playerZ);
  expect(Math.abs(after.headLeft-before.headLeft)).toBeLessThanOrEqual(2);
  expect(Math.abs(after.playerLeft-before.playerLeft)).toBeLessThanOrEqual(2);
  expect(after.nextLeft).toBeLessThan(before.nextLeft-100);
  await expect(playerHead).toHaveClass(/nfl-ppt-player-sticky/);
  await expect(playerCell).toHaveClass(/nfl-ppt-player-sticky/);
  await expect(propCell).not.toHaveClass(/nfl-ppt-player-sticky/);
});
