import {test,expect} from '@playwright/test';

test.setTimeout(120000);
const BASE='http://127.0.0.1:4173/index.html#nfl';

async function openTool(page,viewport={width:1440,height:1000}){
  await page.setViewportSize(viewport);
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#nflView',{state:'visible',timeout:45000});
  await page.waitForFunction(()=>document.querySelectorAll('#nflView [data-nfl-player]').length>0,{timeout:45000});
  await page.waitForSelector('#nflPlayerPropToolBtn',{state:'attached',timeout:45000});
  await page.evaluate(()=>document.getElementById('nflPlayerPropToolBtn')?.click());
  await page.waitForSelector('#nflPlayerPropTool',{state:'visible',timeout:45000});
  await page.waitForFunction(()=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptSnapshot==='ready',{timeout:90000});
}

test('NFL Player Prop Tool renders the Sports Outpost dark navy blue cyan theme',async({page})=>{
  await openTool(page);

  const theme=await page.evaluate(()=>{
    const root=document.getElementById('nflPlayerPropTool');
    const vars=getComputedStyle(root);
    const tableWrap=root.querySelector('.nfl-ppt-table-wrap');
    const row=root.querySelector('tbody tr[data-nfl-ppt-row]');
    const header=root.querySelector('.nfl-ppt-table thead tr:nth-child(2) th');
    const group=root.querySelector('.nfl-ppt-table .nfl-ppt-groups th');
    const select=root.querySelector('.nfl-ppt-selects select');
    const h1=root.querySelector('.nfl-ppt-head h1');
    return {
      stylesheet:!!document.getElementById('nfl-player-prop-tool-theme-v936-css'),
      blue:vars.getPropertyValue('--ppt-blue').trim(),
      cyan:vars.getPropertyValue('--ppt-cyan').trim(),
      panel:vars.getPropertyValue('--ppt-panel').trim(),
      colorScheme:vars.colorScheme,
      tableBg:getComputedStyle(tableWrap).backgroundColor,
      rowBg:getComputedStyle(row).backgroundColor,
      headerBg:getComputedStyle(header).backgroundColor,
      groupColor:getComputedStyle(group).color,
      selectBg:getComputedStyle(select).backgroundColor,
      titleColor:getComputedStyle(h1).color,
      bodyWidth:document.documentElement.scrollWidth,
      viewportWidth:document.documentElement.clientWidth,
      rowDisplay:getComputedStyle(row).display,
      rowContentVisibility:getComputedStyle(row).contentVisibility
    };
  });

  expect(theme.stylesheet).toBe(true);
  expect(theme.blue).toBe('#2d7fff');
  expect(theme.cyan).toBe('#6edcff');
  expect(theme.panel).toBe('#0a1730');
  expect(theme.colorScheme).toBe('dark');
  expect(theme.tableBg).toBe('rgb(7, 16, 31)');
  expect(theme.rowBg).toBe('rgb(8, 20, 38)');
  expect(theme.headerBg).toBe('rgb(13, 28, 52)');
  expect(theme.groupColor).toBe('rgb(110, 220, 255)');
  expect(theme.selectBg).toBe('rgb(8, 22, 44)');
  expect(theme.titleColor).toBe('rgb(255, 255, 255)');
  expect(theme.bodyWidth).toBeLessThanOrEqual(theme.viewportWidth+3);
  expect(theme.rowDisplay).toBe('grid');
  expect(theme.rowContentVisibility).toBe('auto');
});

test('NFL Player Prop Tool keeps the Outpost theme on mobile without changing snapshot geometry',async({page})=>{
  await openTool(page,{width:390,height:844});
  const mobile=await page.evaluate(()=>{
    const root=document.getElementById('nflPlayerPropTool');
    const wrap=root.querySelector('.nfl-ppt-table-wrap');
    const row=root.querySelector('tbody tr[data-nfl-ppt-row]');
    return {
      stylesheet:!!document.getElementById('nfl-player-prop-tool-theme-v936-css'),
      tableBg:getComputedStyle(wrap).backgroundColor,
      rowBg:getComputedStyle(row).backgroundColor,
      rowHeight:row.getBoundingClientRect().height,
      tableWidth:root.querySelector('.nfl-ppt-table').getBoundingClientRect().width,
      bodyWidth:document.documentElement.scrollWidth,
      viewportWidth:document.documentElement.clientWidth
    };
  });
  expect(mobile.stylesheet).toBe(true);
  expect(mobile.tableBg).toBe('rgb(7, 16, 31)');
  expect(mobile.rowBg).toBe('rgb(8, 20, 38)');
  expect(mobile.rowHeight).toBeGreaterThanOrEqual(82);
  expect(mobile.tableWidth).toBeGreaterThanOrEqual(1510);
  expect(mobile.tableWidth).toBeLessThanOrEqual(1550);
  expect(mobile.bodyWidth).toBeLessThanOrEqual(mobile.viewportWidth+3);
});
