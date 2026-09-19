import {test,expect} from '@playwright/test';

test.setTimeout(120000);
const BASE='http://127.0.0.1:4173/index.html#nfl';

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

test('player column matches Outpost navy theme and top horizontal scrollbar stays synced',async({page})=>{
  await openTool(page);
  const state=await page.evaluate(()=>{
    const tool=document.getElementById('nflPlayerPropTool');
    const row=tool.querySelector('tbody tr[data-nfl-ppt-row]');
    const cell=row?.querySelector('td:first-child');
    const wrap=tool.querySelector('.nfl-ppt-table-wrap');
    const bar=tool.querySelector('.nfl-ppt-xscroll-v938');
    const inner=bar?.querySelector('.nfl-ppt-xscroll-inner-v938');
    return {
      css:!!document.getElementById('nfl-player-prop-tool-polish-v938-css'),
      cellBg:cell?getComputedStyle(cell).backgroundColor:null,
      cellColor:cell?getComputedStyle(cell).color:null,
      barOverflowX:bar?getComputedStyle(bar).overflowX:null,
      barWidth:bar?.clientWidth||0,
      innerWidth:inner?.scrollWidth||inner?.offsetWidth||0,
      wrapWidth:wrap?.clientWidth||0,
      wrapScrollWidth:wrap?.scrollWidth||0
    };
  });
  expect(state.css).toBe(true);
  expect(state.cellBg).toBe('rgb(8, 20, 38)');
  expect(state.cellColor).not.toBe('rgb(7, 21, 42)');
  expect(state.barOverflowX).toBe('scroll');
  expect(state.wrapScrollWidth).toBeGreaterThan(state.wrapWidth);
  expect(state.innerWidth).toBeGreaterThan(state.barWidth);

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
