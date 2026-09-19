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
  await page.waitForSelector('#nflPptMode[data-nfl-ppt-build-style="94.2"]',{timeout:30000});
  await page.waitForSelector('.nfl-ppt-periodbar-v940',{timeout:30000});
  await page.waitForFunction(()=>['ready','preparing'].includes(document.getElementById('nflPlayerPropTool')?.dataset.nflPptOddsStyleBoard||''),{timeout:30000});
}

async function expectedFullStyle(page,style){
  return page.evaluate(async style=>{
    const sim=await (await fetch('./slates/nfl-sim.json',{cache:'no-store'})).json();
    const out=[];
    for(const game of sim.games||[]){
      const gameId=String(game?.game?.gameId||game?.gameId||'');
      const board=game?.propStyles;if(!board)continue;
      const byId=new Map((board.candidates||[]).map(c=>[String(c.id),c]));
      for(const id of board.rankings?.[style]||[]){const c=byId.get(String(id));if(c)out.push({gameId,...c});}
    }
    return out;
  },style);
}

async function assertVisibleRowsMatchStyle(page,style){
  const expected=await expectedFullStyle(page,style);
  const result=await page.evaluate(expected=>{
    const norm=v=>String(v||'').toLowerCase().replace(/\./g,'').replace(/['’]/g,'').replace(/\s+(jr|sr|ii|iii|iv|v)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
    const exp=expected;
    const rows=[...document.querySelectorAll('#nflPlayerPropTool tbody tr[data-nfl-ppt-row]:not([hidden])')];
    const mismatches=[];
    for(const row of rows){
      const gameId=String(row.dataset.nflPptRow||'').split('|')[0]||'';
      const pid=row.querySelector('[data-nfl-tool-player]')?.getAttribute('data-nfl-tool-player')||'';
      const name=String(row.querySelector('.nfl-ppt-player b')?.textContent||'').replace('↗','').trim();
      const meta=String(row.querySelector('.nfl-ppt-player small')?.textContent||'');
      const team=(meta.match(/^\s*([A-Z0-9]+)\s+vs\s+/i)?.[1]||'').toUpperCase();
      const market=row.dataset.nflPptSimMarket||row.dataset.snapshotMarket||'';
      const c=exp.find(x=>x.gameId===gameId&&x.market===market&&([x.playerId,x.espnId,x.gsisId].filter(Boolean).map(String).includes(String(pid))||(String(x.team||'').toUpperCase()===team&&norm(x.name)===norm(name))));
      if(!c){mismatches.push({name,gameId,market,reason:'no expected candidate'});continue;}
      const consensus=Number(row.children[1]?.querySelector('b')?.textContent);
      const pickText=String(row.children[2]?.querySelector('b')?.textContent||'');
      const priceText=String(row.children[2]?.querySelector('span')?.textContent||'');
      const book=String(row.children[2]?.querySelector('small')?.textContent||'');
      const side=pickText.trim().startsWith('U')?'under':'over';
      const line=Number(pickText.replace(/^[OU]\s*/,'').trim());
      const price=Number(priceText.replace('+',''));
      if(Math.abs(consensus-Number(c.line))>.001||Math.abs(line-Number(c.line))>.001||side!==c.side||price!==Number(c.price)||book!==String(c.book||'BEST'))mismatches.push({name,gameId,market,consensus,pickText,priceText,book,c});
    }
    return {rows:rows.length,mismatches,styleRows:rows.filter(r=>r.dataset.nflPptStyleCandidate==='1').length,runs:[...new Set(rows.map(r=>Number(r.dataset.nflPptSimIterations||0)))]};
  },expected);
  expect(result.rows).toBeGreaterThan(0);
  expect(result.styleRows).toBe(result.rows);
  expect(result.mismatches).toEqual([]);
  expect(result.runs.every(n=>n>=50000)).toBe(true);
}

test('Bet Style replaces View and Full uses exact 50K sportsbook-backed candidates',async({page})=>{
  await openTool(page);
  const state=await page.evaluate(()=>{
    const select=document.getElementById('nflPptMode'),label=select.closest('label')?.querySelector(':scope > span');
    const bar=document.querySelector('.nfl-ppt-periodbar-v940'),seg=document.querySelector('.nfl-ppt-period-segments-v940'),buttons=[...bar.querySelectorAll('[data-nfl-ppt-period]')];
    const r=bar.getBoundingClientRect(),s=seg.getBoundingClientRect();
    return {label:label?.textContent.trim(),options:[...select.options].map(o=>o.textContent.trim()),values:[...select.options].map(o=>o.value),periods:buttons.map(b=>b.textContent.trim()),active:buttons.filter(b=>b.classList.contains('active')).map(b=>b.textContent.trim()),barHeight:r.height,segmentsWidth:s.width,bodyWidth:document.documentElement.scrollWidth,viewportWidth:document.documentElement.clientWidth,status:document.querySelector('.nfl-ppt-period-status-v940')?.textContent||''};
  });
  expect(state.label).toBe('Bet Style');
  expect(state.options).toEqual(['TSO Pick','Safest','Best Edge','Balanced','Aggressive','Correlated','Longshot']);
  expect(state.values).toEqual(['tsoPick','safest','bestEdge','balanced','aggressive','correlated','longshot']);
  expect(state.periods).toEqual(['Full','1H','2H','Q1','Q2','Q3','Q4']);
  expect(state.active).toEqual(['Full']);
  expect(state.barHeight).toBeLessThanOrEqual(42);
  expect(state.segmentsWidth).toBeLessThan(420);
  expect(state.bodyWidth).toBeLessThanOrEqual(state.viewportWidth+3);
  await assertVisibleRowsMatchStyle(page,'tsoPick');

  await page.evaluate(()=>{window.__v942Table=document.querySelector('#nflPlayerPropTool .nfl-ppt-table');});
  for(const style of ['safest','bestEdge','balanced']){
    const expected=await expectedFullStyle(page,style);
    if(!expected.length)continue;
    await page.locator('#nflPptMode').selectOption(style);
    await page.waitForFunction(s=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptBuildStyle===s,style);
    await page.waitForFunction(()=>document.querySelectorAll('#nflPlayerPropTool tbody tr[data-nfl-ppt-row]:not([hidden])').length>0);
    await assertVisibleRowsMatchStyle(page,style);
    expect(await page.evaluate(()=>window.__v942Table===document.querySelector('#nflPlayerPropTool .nfl-ppt-table'))).toBe(true);
  }
});

test('Game and prop filters stay authoritative when Bet Style changes',async({page})=>{
  await openTool(page);
  const game=await page.locator('#nflPptGame option').evaluateAll(opts=>opts.map(o=>o.value).find(v=>v&&v!=='ALL')||null);
  if(game){
    await page.locator('#nflPptGame').selectOption(game);
    await page.waitForTimeout(120);
    await page.locator('#nflPptMode').selectOption('safest');
    await page.waitForFunction(s=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptBuildStyle===s,'safest');
    const games=await page.locator('#nflPlayerPropTool tbody tr[data-nfl-ppt-row]:not([hidden])').evaluateAll(rows=>[...new Set(rows.map(r=>String(r.dataset.nflPptRow||'').split('|')[0]))]);
    expect(games.every(x=>x===game)).toBe(true);
  }
  await page.locator('#nflPptGame').selectOption('ALL');
  const market=await page.locator('#nflPptMarket option').evaluateAll(opts=>opts.map(o=>o.value).find(v=>v&&v!=='ALL')||null);
  if(market){
    await page.locator('#nflPptMarket').selectOption(market);
    await page.waitForTimeout(120);
    await page.locator('#nflPptMode').selectOption('bestEdge');
    await page.waitForFunction(s=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptBuildStyle===s,'bestEdge');
    const markets=await page.locator('#nflPlayerPropTool tbody tr[data-nfl-ppt-row]:not([hidden])').evaluateAll(rows=>[...new Set(rows.map(r=>r.dataset.nflPptSimMarket||r.dataset.snapshotMarket||''))]);
    expect(markets.every(x=>x===market)).toBe(true);
  }
});

test('1H and quarter filters retain exact 50K period candidates without rebuilding the table',async({page})=>{
  await openTool(page);
  await page.evaluate(()=>{window.__v942Table=document.querySelector('#nflPlayerPropTool .nfl-ppt-table');});
  for(const [value,label] of [['1h','1H'],['q1','Q1'],['q4','Q4']]){
    await page.locator(`[data-nfl-ppt-period="${value}"]`).click();
    await page.waitForFunction(v=>document.querySelector('#nflPlayerPropTool .nfl-ppt-table')?.dataset.nflPptPeriod===v,value,{timeout:30000});
    const state=await page.evaluate(()=>{
      const root=document.getElementById('nflPlayerPropTool'),rows=[...root.querySelectorAll('tbody tr[data-nfl-ppt-row]:not([hidden])')],heads=[...root.querySelectorAll('thead tr:nth-child(2) th')].map(x=>x.textContent.trim());
      return {sameTable:window.__v942Table===root.querySelector('.nfl-ppt-table'),rows:rows.length,period:root.dataset.nflPptPeriod,periodRows:rows.filter(r=>r.dataset.nflPptPeriodCandidate==='1').length,runs:[...new Set(rows.map(r=>r.children[12]?.querySelector('b')?.textContent.trim()))],heads,status:root.querySelector('.nfl-ppt-period-status-v940')?.textContent.trim()||''};
    });
    expect(state.sameTable).toBe(true);expect(state.period).toBe(value);expect(state.rows).toBeGreaterThan(0);expect(state.periodRows).toBe(state.rows);expect(state.runs).toEqual(['50K']);expect(state.status).toContain(label);
  }
});

test('mobile Bet Style + period selector stay compact with no body overflow',async({page})=>{
  await openTool(page,{width:390,height:844});
  const state=await page.evaluate(()=>{
    const seg=document.querySelector('.nfl-ppt-period-segments-v940'),bar=document.querySelector('.nfl-ppt-periodbar-v940'),select=document.getElementById('nflPptMode');
    const sb=seg.getBoundingClientRect(),bb=bar.getBoundingClientRect();
    return {label:select.closest('label')?.querySelector(':scope > span')?.textContent.trim(),bodyWidth:document.documentElement.scrollWidth,viewportWidth:document.documentElement.clientWidth,segWidth:sb.width,barWidth:bb.width,barHeight:bb.height,labels:[...seg.querySelectorAll('button')].map(b=>b.textContent.trim())};
  });
  expect(state.label).toBe('Bet Style');expect(state.labels).toEqual(['Full','1H','2H','Q1','Q2','Q3','Q4']);expect(state.bodyWidth).toBeLessThanOrEqual(state.viewportWidth+3);expect(state.segWidth).toBeLessThanOrEqual(state.viewportWidth);expect(state.barWidth).toBeLessThanOrEqual(state.viewportWidth);expect(state.barHeight).toBeLessThanOrEqual(38);
});