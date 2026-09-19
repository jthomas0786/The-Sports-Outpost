import {test,expect} from '@playwright/test';

test.setTimeout(180000);
const BASE='http://127.0.0.1:4173/index.html#nfl';

async function openTool(page,viewport={width:1440,height:900}){
  await page.setViewportSize(viewport);
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#nflView',{state:'visible',timeout:45000});
  await page.waitForFunction(()=>document.querySelectorAll('#nflView [data-nfl-player]').length>0,{timeout:45000});
  await page.evaluate(()=>document.getElementById('nflPlayerPropToolBtn')?.click());
  await page.waitForSelector('#nflPlayerPropTool',{state:'visible',timeout:45000});
  await page.waitForFunction(()=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptSnapshot==='ready',{timeout:90000});
  await page.waitForFunction(()=>document.querySelector('#nflPlayerPropTool .nfl-ppt-table')?.dataset.nflPptSimV939==='93.9',{timeout:45000});
  await page.waitForSelector('#nflPptMode[data-nfl-ppt-build-style="94.3"]',{timeout:30000});
  await page.waitForFunction(()=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptOddsStyleBoard==='ready',{timeout:45000});
}

async function visibleState(page){
  return page.evaluate(()=>{
    const tool=document.getElementById('nflPlayerPropTool');
    const rows=[...tool.querySelectorAll('tbody tr[data-nfl-ppt-row]:not([hidden])')];
    return {
      count:rows.length,
      countLabel:tool.querySelector('.nfl-ppt-head-stat b')?.textContent?.trim()||'',
      style:tool.dataset.nflPptBuildStyle||'',
      mode:document.getElementById('nflPptMode')?.value||'',
      prop:document.getElementById('nflPptMarket')?.value||'',
      rows:rows.map(row=>{
        const consensus=Number(row.children[1]?.querySelector('b')?.textContent);
        const pickText=String(row.children[2]?.querySelector('b')?.textContent||'').trim();
        const pickLine=Number(pickText.replace(/^[OU]\s*/,'').trim());
        return {
          name:String(row.querySelector('.nfl-ppt-player b')?.textContent||'').replace('↗','').trim(),
          snapshotMarket:row.dataset.snapshotMarket||'',
          simMarket:row.dataset.nflPptSimMarket||'',
          rowStyle:row.dataset.nflPptBuildStyle||'',
          consensus,pickLine,pickText,
        };
      })
    };
  });
}

async function waitForFilteredStyle(page,prop,style){
  await page.waitForFunction(({prop,style})=>{
    const tool=document.getElementById('nflPlayerPropTool');
    if(!tool||tool.dataset.nflPptBuildStyle!==style)return false;
    const rows=[...tool.querySelectorAll('tbody tr[data-nfl-ppt-row]:not([hidden])')];
    return rows.length>0&&rows.every(r=>r.dataset.snapshotMarket===prop&&r.dataset.nflPptSimMarket===prop&&r.dataset.nflPptBuildStyle===style);
  },{prop,style},{timeout:45000});
}

async function assertConsensusMatchesSelectedProp(page,prop,style){
  const state=await visibleState(page);
  expect(state.count).toBeGreaterThan(0);
  expect(state.countLabel).toBe(String(state.count));
  expect(state.prop).toBe(prop);
  expect(state.mode).toBe(style);
  expect(state.style).toBe(style);
  expect(new Set(state.rows.map(r=>r.snapshotMarket))).toEqual(new Set([prop]));
  expect(new Set(state.rows.map(r=>r.simMarket))).toEqual(new Set([prop]));
  expect(new Set(state.rows.map(r=>r.rowStyle))).toEqual(new Set([style]));
  for(const row of state.rows){
    expect(Number.isFinite(row.consensus)).toBe(true);
    expect(Number.isFinite(row.pickLine)).toBe(true);
    expect(Math.abs(row.consensus-row.pickLine)).toBeLessThan(.001);
  }
  return state;
}

test('video regression: Receptions remains stable and Bet Style really changes the board',async({page})=>{
  await openTool(page);
  const values=await page.locator('#nflPptMarket option').evaluateAll(opts=>opts.map(o=>o.value));
  expect(values).toContain('receptions');

  await page.locator('#nflPptMarket').selectOption('receptions');
  await waitForFilteredStyle(page,'receptions','tsoPick');
  await assertConsensusMatchesSelectedProp(page,'receptions','tsoPick');

  // Reproduce the user's video: after the Prop change, the count must not
  // oscillate full-slate -> zero -> full-slate while no control is changing.
  const samples=[];
  for(let i=0;i<10;i++){
    samples.push((await visibleState(page)).count);
    await page.waitForTimeout(200);
  }
  expect(samples[0]).toBeGreaterThan(0);
  expect(new Set(samples).size).toBe(1);

  for(const style of ['safest','bestEdge','balanced']){
    await page.locator('#nflPptMode').selectOption(style);
    await waitForFilteredStyle(page,'receptions',style);
    await assertConsensusMatchesSelectedProp(page,'receptions',style);
  }
});

test('video regression: Prop changes remain authoritative after multiple Bet Style changes',async({page})=>{
  await openTool(page,{width:390,height:844});
  const available=await page.locator('#nflPptMarket option').evaluateAll(opts=>opts.map(o=>o.value));
  const props=['receptions','passTds','recYds'].filter(x=>available.includes(x));
  expect(props.length).toBeGreaterThan(0);

  for(const prop of props){
    await page.locator('#nflPptMarket').selectOption(prop);
    await waitForFilteredStyle(page,prop,'tsoPick');
    await assertConsensusMatchesSelectedProp(page,prop,'tsoPick');
    await page.locator('#nflPptMode').selectOption('safest');
    await waitForFilteredStyle(page,prop,'safest');
    await assertConsensusMatchesSelectedProp(page,prop,'safest');
    await page.locator('#nflPptMode').selectOption('tsoPick');
    await waitForFilteredStyle(page,prop,'tsoPick');
  }

  const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.client+3);
});
