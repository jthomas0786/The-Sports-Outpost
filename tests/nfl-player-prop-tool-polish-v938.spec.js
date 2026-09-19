import {test,expect} from '@playwright/test';

test.setTimeout(120000);
const BASE='http://127.0.0.1:4173/index.html#nfl';
const PLAYER_BG='rgb(8, 20, 38)';
const PLAYER_NAME='rgb(247, 251, 255)';
const PLAYER_META='rgb(142, 162, 189)';

async function openTool(page,viewport={width:1440,height:900}){
  await page.setViewportSize(viewport);
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#nflView',{state:'visible',timeout:45000});
  await page.waitForFunction(()=>document.querySelectorAll('#nflView [data-nfl-player]').length>0,{timeout:45000});
  await page.evaluate(()=>document.getElementById('nflPlayerPropToolBtn')?.click());
  await page.waitForSelector('#nflPlayerPropTool',{state:'visible',timeout:45000});
  await page.waitForFunction(()=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptSnapshot==='ready',{timeout:90000});
}

async function readVisualState(page){
  return page.evaluate(()=>{
    const tool=document.getElementById('nflPlayerPropTool');
    const cells=[...tool.querySelectorAll('tbody tr[data-nfl-ppt-row] > td:first-child')];
    const names=[...tool.querySelectorAll('tbody tr[data-nfl-ppt-row] > td:first-child .nfl-ppt-player b')];
    const metas=[...tool.querySelectorAll('tbody tr[data-nfl-ppt-row] > td:first-child .nfl-ppt-player small')];
    const avatars=[...tool.querySelectorAll('tbody tr[data-nfl-ppt-row] > td:first-child .nfl-ppt-avatar')];
    const wrap=tool.querySelector('.nfl-ppt-table-wrap');
    return {
      css:!!document.getElementById('nfl-player-prop-tool-polish-v938-css'),
      cellCount:cells.length,
      cellBgs:[...new Set(cells.map(cell=>getComputedStyle(cell).backgroundColor))],
      nameColors:[...new Set(names.map(name=>getComputedStyle(name).color))],
      metaColors:[...new Set(metas.map(meta=>getComputedStyle(meta).color))],
      avatarBorderColors:[...new Set(avatars.map(avatar=>getComputedStyle(avatar).borderTopColor))],
      avatarBorderWidths:[...new Set(avatars.map(avatar=>getComputedStyle(avatar).borderTopWidth))],
      dedicatedBarCount:tool.querySelectorAll('.nfl-ppt-xscroll-v938').length,
      wrapOverflowX:wrap?getComputedStyle(wrap).overflowX:null,
      wrapScrollbarWidth:wrap?getComputedStyle(wrap).scrollbarWidth:null,
      wrapWidth:wrap?.clientWidth||0,
      wrapScrollWidth:wrap?.scrollWidth||0,
      bodyWidth:document.documentElement.scrollWidth,
      viewportWidth:document.documentElement.clientWidth
    };
  });
}

test('every player cell stays dark and the horizontal scrollbar is removed on desktop',async({page})=>{
  await openTool(page);
  const state=await readVisualState(page);
  expect(state.css).toBe(true);
  expect(state.cellCount).toBeGreaterThan(0);
  expect(state.cellBgs).toEqual([PLAYER_BG]);
  expect(state.nameColors).toEqual([PLAYER_NAME]);
  expect(state.metaColors).toEqual([PLAYER_META]);
  expect(state.avatarBorderColors).toContain('rgba(45, 127, 255, 0.78)');
  expect(state.avatarBorderWidths.some(width=>parseFloat(width)>=1)).toBe(true);
  expect(state.dedicatedBarCount).toBe(0);
  expect(state.wrapOverflowX).toBe('auto');
  expect(state.wrapScrollbarWidth).toBe('none');
  expect(state.wrapScrollWidth).toBeGreaterThan(state.wrapWidth);
  expect(state.bodyWidth).toBeLessThanOrEqual(state.viewportWidth+3);

  await page.evaluate(()=>{document.querySelector('#nflPlayerPropTool .nfl-ppt-table-wrap').scrollLeft=420;});
  await expect.poll(()=>page.evaluate(()=>document.querySelector('#nflPlayerPropTool .nfl-ppt-table-wrap')?.scrollLeft||0)).toBeGreaterThan(350);
});

test('mobile keeps touch-style horizontal table scrolling without a visible scrollbar',async({page})=>{
  await openTool(page,{width:390,height:844});
  const state=await readVisualState(page);
  expect(state.cellCount).toBeGreaterThan(0);
  expect(state.cellBgs).toEqual([PLAYER_BG]);
  expect(state.nameColors).toEqual([PLAYER_NAME]);
  expect(state.metaColors).toEqual([PLAYER_META]);
  expect(state.avatarBorderColors).toContain('rgba(45, 127, 255, 0.78)');
  expect(state.dedicatedBarCount).toBe(0);
  expect(state.wrapOverflowX).toBe('auto');
  expect(state.wrapScrollbarWidth).toBe('none');
  expect(state.wrapScrollWidth).toBeGreaterThan(state.wrapWidth);
  expect(state.bodyWidth).toBeLessThanOrEqual(state.viewportWidth+3);

  await page.evaluate(()=>{document.querySelector('#nflPlayerPropTool .nfl-ppt-table-wrap').scrollLeft=180;});
  await expect.poll(()=>page.evaluate(()=>document.querySelector('#nflPlayerPropTool .nfl-ppt-table-wrap')?.scrollLeft||0)).toBeGreaterThan(140);
});