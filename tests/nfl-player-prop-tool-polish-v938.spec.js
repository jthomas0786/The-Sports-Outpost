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
  await page.waitForSelector('#nflPlayerPropTool .nfl-ppt-xscroll-v938',{state:'visible',timeout:15000});
}

async function readVisualState(page){
  return page.evaluate(()=>{
    const tool=document.getElementById('nflPlayerPropTool');
    const cells=[...tool.querySelectorAll('tbody tr[data-nfl-ppt-row] > td:first-child')];
    const names=[...tool.querySelectorAll('tbody tr[data-nfl-ppt-row] > td:first-child .nfl-ppt-player b')];
    const metas=[...tool.querySelectorAll('tbody tr[data-nfl-ppt-row] > td:first-child .nfl-ppt-player small')];
    const avatars=[...tool.querySelectorAll('tbody tr[data-nfl-ppt-row] > td:first-child .nfl-ppt-avatar')];
    const wrap=tool.querySelector('.nfl-ppt-table-wrap');
    const bar=tool.querySelector('.nfl-ppt-xscroll-v938');
    const inner=bar?.querySelector('.nfl-ppt-xscroll-inner-v938');
    return {
      css:!!document.getElementById('nfl-player-prop-tool-polish-v938-css'),
      cellCount:cells.length,
      cellBgs:[...new Set(cells.map(cell=>getComputedStyle(cell).backgroundColor))],
      nameColors:[...new Set(names.map(name=>getComputedStyle(name).color))],
      metaColors:[...new Set(metas.map(meta=>getComputedStyle(meta).color))],
      avatarBorderColors:[...new Set(avatars.map(avatar=>getComputedStyle(avatar).borderTopColor))],
      avatarBorderWidths:[...new Set(avatars.map(avatar=>getComputedStyle(avatar).borderTopWidth))],
      barDisplay:bar?getComputedStyle(bar).display:null,
      barOverflowX:bar?getComputedStyle(bar).overflowX:null,
      barHeight:bar?.getBoundingClientRect().height||0,
      barWidth:bar?.clientWidth||0,
      innerWidth:inner?.scrollWidth||inner?.offsetWidth||0,
      wrapOverflowX:wrap?getComputedStyle(wrap).overflowX:null,
      wrapWidth:wrap?.clientWidth||0,
      wrapScrollWidth:wrap?.scrollWidth||0,
      bodyWidth:document.documentElement.scrollWidth,
      viewportWidth:document.documentElement.clientWidth
    };
  });
}

test('every player cell matches Outpost navy theme and desktop scrollbar stays synced',async({page})=>{
  await openTool(page);
  const state=await readVisualState(page);
  expect(state.css).toBe(true);
  expect(state.cellCount).toBeGreaterThan(0);
  expect(state.cellBgs).toEqual([PLAYER_BG]);
  expect(state.nameColors).toEqual([PLAYER_NAME]);
  expect(state.metaColors).toEqual([PLAYER_META]);
  expect(state.avatarBorderColors).toContain('rgba(45, 127, 255, 0.78)');
  expect(state.avatarBorderWidths.some(width=>parseFloat(width)>=1)).toBe(true);
  expect(state.barDisplay).toBe('block');
  expect(state.barOverflowX).toBe('scroll');
  expect(state.barHeight).toBeGreaterThanOrEqual(18);
  expect(state.wrapScrollWidth).toBeGreaterThan(state.wrapWidth);
  expect(state.innerWidth).toBeGreaterThan(state.barWidth);
  expect(state.bodyWidth).toBeLessThanOrEqual(state.viewportWidth+3);

  await page.evaluate(()=>{
    const bar=document.querySelector('#nflPlayerPropTool .nfl-ppt-xscroll-v938');
    bar.scrollLeft=260;
    bar.dispatchEvent(new Event('scroll'));
  });
  await expect.poll(()=>page.evaluate(()=>document.querySelector('#nflPlayerPropTool .nfl-ppt-table-wrap')?.scrollLeft||0)).toBeGreaterThan(200);

  await page.evaluate(()=>{
    const wrap=document.querySelector('#nflPlayerPropTool .nfl-ppt-table-wrap');
    wrap.scrollLeft=420;
    wrap.dispatchEvent(new Event('scroll'));
  });
  await expect.poll(()=>page.evaluate(()=>document.querySelector('#nflPlayerPropTool .nfl-ppt-xscroll-v938')?.scrollLeft||0)).toBeGreaterThan(350);
});

test('player column and horizontal scrolling stay dark and contained on mobile',async({page})=>{
  await openTool(page,{width:390,height:844});
  const state=await readVisualState(page);
  expect(state.cellCount).toBeGreaterThan(0);
  expect(state.cellBgs).toEqual([PLAYER_BG]);
  expect(state.nameColors).toEqual([PLAYER_NAME]);
  expect(state.metaColors).toEqual([PLAYER_META]);
  expect(state.avatarBorderColors).toContain('rgba(45, 127, 255, 0.78)');
  expect(state.barDisplay).toBe('block');
  expect(state.barOverflowX).toBe('scroll');
  expect(state.wrapOverflowX).toBe('auto');
  expect(state.wrapScrollWidth).toBeGreaterThan(state.wrapWidth);
  expect(state.innerWidth).toBeGreaterThan(state.barWidth);
  expect(state.bodyWidth).toBeLessThanOrEqual(state.viewportWidth+3);

  await page.evaluate(()=>{
    const wrap=document.querySelector('#nflPlayerPropTool .nfl-ppt-table-wrap');
    wrap.scrollLeft=180;
    wrap.dispatchEvent(new Event('scroll'));
  });
  await expect.poll(()=>page.evaluate(()=>document.querySelector('#nflPlayerPropTool .nfl-ppt-xscroll-v938')?.scrollLeft||0)).toBeGreaterThan(140);
});
