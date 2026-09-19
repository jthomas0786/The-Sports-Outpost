import {test,expect} from '@playwright/test';

test.setTimeout(180000);
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
  await page.waitForFunction(()=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptSnapshot==='ready',{timeout:90000});
  await page.waitForSelector('#nflPptMode',{state:'visible',timeout:15000});
  await page.locator('#nflPptMode').selectOption('all');
  await page.waitForFunction(()=>document.querySelectorAll('#nflPlayerPropTool tbody tr[data-nfl-ppt-row]').length>0,{timeout:15000});
  await page.waitForFunction(()=>{
    const rings=[...document.querySelectorAll('#nflPlayerPropTool .nfl-ppt-prob:not(.empty)')];
    return !rings.length||rings.every(r=>r.querySelector('svg')&&r.querySelector('.nfl-ppt-ring-label'));
  },{timeout:15000});
}

async function rememberSnapshot(page){
  return page.evaluate(()=>{
    window.__pptToolRef=document.getElementById('nflPlayerPropTool');
    window.__pptTableRef=window.__pptToolRef?.querySelector('.nfl-ppt-table');
    window.__pptFirstRowRef=window.__pptTableRef?.querySelector('tbody tr[data-nfl-ppt-row]');
    window.__pptTotalRows=window.__pptTableRef?.querySelectorAll('tbody tr[data-nfl-ppt-row]').length||0;
    return window.__pptTotalRows;
  });
}

async function expectSameSnapshot(page){
  const identity=await page.evaluate(()=>({
    tool:window.__pptToolRef===document.getElementById('nflPlayerPropTool'),
    table:window.__pptTableRef===document.querySelector('#nflPlayerPropTool .nfl-ppt-table'),
    first:window.__pptFirstRowRef===document.querySelector('#nflPlayerPropTool tbody tr[data-nfl-ppt-row]')||document.body.contains(window.__pptFirstRowRef),
    total:document.querySelectorAll('#nflPlayerPropTool tbody tr[data-nfl-ppt-row]').length,
    expected:window.__pptTotalRows
  }));
  expect(identity.tool).toBe(true);
  expect(identity.table).toBe(true);
  expect(identity.first).toBe(true);
  expect(identity.total).toBe(identity.expected);
}

test('NFL Player Prop Tool is a static snapshot until Refresh and preserves the existing Player Modal flow',async({page})=>{
  await openNfl(page);
  await openTool(page);

  const tool=page.locator('#nflPlayerPropTool');
  await expect(tool).toContainText('PLAYER PROP TOOL');
  await expect(tool).toContainText('STATIC SNAPSHOT · REFRESH TO UPDATE');
  await expect(tool).toContainText('PROJECTIONS + VALUE');
  await expect(tool).toContainText('TSO INSIGHTS + DATA');
  await expect(tool).toContainText('HIT RATES');
  await expect(page.locator('#nflPlayerPropToolBtn')).toHaveClass(/is-active/);
  await expect(page.locator('#nflPptMore')).toHaveCount(0);

  const initialCount=await rememberSnapshot(page);
  expect(initialCount).toBeGreaterThan(0);
  expect(await page.locator('#nflPlayerPropTool .nfl-ppt-player').count()).toBe(initialCount);

  const headerText=await page.locator('#nflPlayerPropTool thead').innerText();
  for(const label of ['PLAYER','CONSENSUS','PICK','PROJ','L10 AVG','MODEL PROB','EDGE','DEF VS PROP','MATCHUP','SIM DEF','L5','L10','H2H'])expect(headerText).toContain(label);
  for(const pos of ['QB','RB','WR','TE'])await expect(page.locator(`[data-nfl-ppt-pos="${pos}"]`)).toBeVisible();

  await page.locator('#nflPptFilters').click();
  await expect(page.locator('#nflPptFilterPanel')).toBeVisible();
  const firstName=((await page.locator('#nflPlayerPropTool tbody tr:visible .nfl-ppt-player b').first().textContent())||'').replace('↗','').trim();
  expect(firstName).toBeTruthy();
  const searchTerm=firstName.split(' ')[0];
  const inputCost=await page.evaluate(term=>{
    const input=document.getElementById('nflPptSearch');
    const t=performance.now();
    input.value=term;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    return performance.now()-t;
  },searchTerm);
  expect(inputCost).toBeLessThan(100);
  await expect(page.locator('#nflPptSearch')).toHaveValue(searchTerm);
  await expect.poll(()=>page.locator('#nflPlayerPropTool tbody tr:visible').count(),{timeout:5000}).toBeGreaterThan(0);
  await expectSameSnapshot(page);

  await page.locator('#nflPptMarket').selectOption('ALL');
  await page.locator('[data-nfl-ppt-pos="TE"]').click();
  await expectSameSnapshot(page);
  await page.locator('#nflPptClear').click();
  await expectSameSnapshot(page);

  const firstSortable=page.locator('#nflPlayerPropTool th[data-sort="name"]');
  await firstSortable.click();
  const sortIdentity=await page.evaluate(()=>({tool:window.__pptToolRef===document.getElementById('nflPlayerPropTool'),table:window.__pptTableRef===document.querySelector('#nflPlayerPropTool .nfl-ppt-table'),total:document.querySelectorAll('#nflPlayerPropTool tbody tr[data-nfl-ppt-row]').length}));
  expect(sortIdentity.tool).toBe(true);
  expect(sortIdentity.table).toBe(true);
  expect(sortIdentity.total).toBe(initialCount);

  await page.locator('#nflPptGuide').click();
  await expect(page.locator('#nflPlayerPropGuide')).toBeVisible();
  await page.locator('[data-nfl-ppt-guide-close]').click();
  await expect(page.locator('#nflPlayerPropGuide')).toHaveCount(0);
  await expectSameSnapshot(page);

  await page.locator('#nflPptColor').click();
  await expect(tool).toHaveClass(/ppt-color-off/);
  await page.locator('#nflPptColor').click();
  await expect(tool).not.toHaveClass(/ppt-color-off/);
  await expectSameSnapshot(page);

  const clickedName=((await page.locator('#nflPlayerPropTool tbody tr:visible .nfl-ppt-player b').first().textContent())||'').replace('↗','').trim();
  await page.locator('#nflPlayerPropTool tbody tr:visible .nfl-ppt-player').first().click();
  const modal=page.locator('.tso-nfl-player-card-v70,.tso-nfl-player-card-v72,.ms-modal').first();
  await expect(modal).toBeVisible({timeout:15000});
  await expect(modal).toContainText(clickedName.split(' ')[0]);
  await page.locator('[data-nfl-close-modal]').first().click();
  await page.waitForFunction(()=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptSnapshot==='ready',{timeout:15000});
  await expectSameSnapshot(page);
});

test('NFL Player Prop Tool scrolls smoothly without rerendering the snapshot',async({page})=>{
  await openNfl(page,{width:1440,height:800});
  await openTool(page);
  await rememberSnapshot(page);

  const css=await page.evaluate(()=>{
    const wrap=document.querySelector('#nflPlayerPropTool .nfl-ppt-table-wrap');
    const s=getComputedStyle(wrap);
    const row=getComputedStyle(document.querySelector('#nflPlayerPropTool tbody tr[data-nfl-ppt-row]'));
    return {overflowX:s.overflowX,overflowY:s.overflowY,overscrollY:s.overscrollBehaviorY,contain:s.contain,touchAction:s.touchAction,transition:row.transitionDuration,animation:row.animationName};
  });
  expect(css.overflowX).toMatch(/auto|scroll/);
  expect(css.overflowY).toBe('visible');
  expect(css.overscrollY).not.toBe('contain');
  expect(css.contain).toBe('none');
  expect(css.touchAction).toContain('pan');
  expect(css.transition).toMatch(/^0s/);
  expect(css.animation).toBe('none');

  await page.evaluate(()=>window.scrollTo(0,0));
  await page.locator('#nflPlayerPropTool .nfl-ppt-table-wrap').hover();
  await page.mouse.wheel(0,1000);
  await expect.poll(()=>page.evaluate(()=>window.scrollY),{timeout:3000}).toBeGreaterThan(100);
  await expectSameSnapshot(page);

  const horizontal=await page.evaluate(()=>{
    const wrap=document.querySelector('#nflPlayerPropTool .nfl-ppt-table-wrap');
    wrap.scrollLeft=420;
    return {left:wrap.scrollLeft,tool:window.__pptToolRef===document.getElementById('nflPlayerPropTool'),table:window.__pptTableRef===document.querySelector('#nflPlayerPropTool .nfl-ppt-table')};
  });
  expect(horizontal.left).toBeGreaterThan(100);
  expect(horizontal.tool).toBe(true);
  expect(horizontal.table).toBe(true);
});

test('NFL Player Prop Tool only rebuilds the table after explicit Refresh',async({page})=>{
  await openNfl(page);
  await openTool(page);
  await rememberSnapshot(page);

  await page.locator('#nflPptRefresh').click();
  await page.waitForFunction(()=>{
    const tool=document.getElementById('nflPlayerPropTool');
    const table=tool?.querySelector('.nfl-ppt-table');
    return tool?.dataset.nflPptSnapshot==='ready'&&table&&table!==window.__pptTableRef;
  },{timeout:90000});

  const result=await page.evaluate(()=>({
    toolSame:window.__pptToolRef===document.getElementById('nflPlayerPropTool'),
    tableChanged:window.__pptTableRef!==document.querySelector('#nflPlayerPropTool .nfl-ppt-table'),
    rows:document.querySelectorAll('#nflPlayerPropTool tbody tr[data-nfl-ppt-row]').length
  }));
  expect(result.toolSame).toBe(true);
  expect(result.tableChanged).toBe(true);
  expect(result.rows).toBeGreaterThan(0);
});

test('NFL Player Prop Tool uses larger readable columns and centered progress rings',async({page})=>{
  await openNfl(page,{width:1440,height:1000});
  await openTool(page);
  const geometry=await page.evaluate(()=>{
    const tool=document.getElementById('nflPlayerPropTool');
    const table=tool?.querySelector('.nfl-ppt-table');
    const firstRow=table?.querySelector('tbody tr:not([hidden])')||table?.querySelector('tbody tr');
    const ring=firstRow?.querySelector('.nfl-ppt-prob:not(.empty)')||table?.querySelector('.nfl-ppt-prob:not(.empty)');
    const cell=ring?.closest('td');
    const rr=ring?.getBoundingClientRect();
    const cr=cell?.getBoundingClientRect();
    const cells=firstRow?[...firstRow.children].map(td=>td.getBoundingClientRect().width):[];
    const avatar=firstRow?.querySelector('.nfl-ppt-avatar')?.getBoundingClientRect();
    return {
      tableWidth:table?.getBoundingClientRect().width||0,
      rowHeight:firstRow?.getBoundingClientRect().height||0,
      cells,
      avatarWidth:avatar?.width||0,
      ringWidth:rr?.width||0,
      ringHeight:rr?.height||0,
      ringDx:rr&&cr?Math.abs((rr.left+rr.width/2)-(cr.left+cr.width/2)):999,
      ringDy:rr&&cr?Math.abs((rr.top+rr.height/2)-(cr.top+cr.height/2)):999,
      ringSvg:!!ring?.querySelector('svg'),
      ringLabel:!!ring?.querySelector('.nfl-ppt-ring-label'),
      grade:String(ring?.querySelector('.nfl-ppt-ring-label b')?.textContent||'')
    };
  });
  expect(geometry.tableWidth).toBeGreaterThanOrEqual(1510);
  expect(geometry.tableWidth).toBeLessThanOrEqual(1550);
  expect(geometry.rowHeight).toBeGreaterThanOrEqual(82);
  expect(geometry.cells.length).toBe(13);
  expect(geometry.cells[0]).toBeGreaterThanOrEqual(295);
  expect(geometry.cells[0]).toBeLessThanOrEqual(315);
  expect(Math.max(...geometry.cells.slice(1))).toBeLessThanOrEqual(130);
  expect(geometry.avatarWidth).toBeGreaterThanOrEqual(54);
  expect(geometry.ringWidth).toBeGreaterThanOrEqual(62);
  expect(geometry.ringWidth).toBeLessThanOrEqual(66);
  expect(Math.abs(geometry.ringWidth-geometry.ringHeight)).toBeLessThanOrEqual(1);
  expect(geometry.ringDx).toBeLessThanOrEqual(1.5);
  expect(geometry.ringDy).toBeLessThanOrEqual(1.5);
  expect(geometry.ringSvg).toBe(true);
  expect(geometry.ringLabel).toBe(true);
  expect(geometry.grade).toMatch(/^(A\+?|A-|B\+?|B-|C\+?|C)$/);
});

for(const viewport of [{width:390,height:844},{width:768,height:1024},{width:1440,height:1000}]){
  test(`NFL Player Prop Tool static snapshot is usable at ${viewport.width}px`,async({page})=>{
    await openNfl(page,viewport);
    await openTool(page);
    const geometry=await page.evaluate(()=>{
      const tool=document.getElementById('nflPlayerPropTool');
      const wrap=tool?.querySelector('.nfl-ppt-table-wrap');
      const player=tool?.querySelector('tbody tr:not([hidden]) .nfl-ppt-player')||tool?.querySelector('.nfl-ppt-player');
      return {
        bodyScroll:document.documentElement.scrollWidth,
        viewport:document.documentElement.clientWidth,
        toolWidth:tool?.getBoundingClientRect().width||0,
        wrapClient:wrap?.clientWidth||0,
        wrapScroll:wrap?.scrollWidth||0,
        playerHeight:player?.getBoundingClientRect().height||0,
        rowCount:tool?.querySelectorAll('tbody tr[data-nfl-ppt-row]').length||0,
        ready:tool?.dataset.nflPptSnapshot
      };
    });
    expect(geometry.bodyScroll).toBeLessThanOrEqual(geometry.viewport+3);
    expect(geometry.toolWidth).toBeGreaterThan(0);
    expect(geometry.wrapClient).toBeGreaterThan(0);
    expect(geometry.wrapScroll).toBeGreaterThanOrEqual(geometry.wrapClient);
    expect(geometry.wrapScroll).toBeLessThanOrEqual(1570);
    expect(geometry.playerHeight).toBeGreaterThanOrEqual(50);
    expect(geometry.rowCount).toBeGreaterThan(0);
    expect(geometry.ready).toBe('ready');
  });
}
