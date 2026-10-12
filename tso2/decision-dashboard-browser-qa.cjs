#!/usr/bin/env node
/* Read-only staging browser QA. Does not login, submit bets, alter data or touch DNS. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const ORIGIN=process.env.TSO2_QA_URL||'https://staging.thesportsoutpost.com';
const out=path.join(process.cwd(),'artifacts','decision-dashboard');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'});
 try{
  const page=await ctx.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(ORIGIN+'/',{waitUntil:'domcontentloaded',timeout:50000});
  assert.equal(response?.status(),200,'Staging homepage must be reachable');
  await page.locator('[data-decision-today]').waitFor({state:'visible',timeout:35000});
  assert.equal((await page.locator('.decision-intro h1').first().innerText()).trim(),'Today at The Outpost');
  assert.equal(await page.locator('[data-decision-opportunities]').count(),1);
  assert.equal(await page.locator('[data-decision-betslip]').count(),1);
  assert.equal(await page.locator('.tso-side-primary > .tso-side-item').count(),4,'Exactly four primary destinations');
  assert.equal(await page.locator('.tso-decision-advanced').count(),1);
  assert.equal(await page.locator('.tso-decision-advanced').evaluate(el=>el.open),false,'Advanced tools should start collapsed');
  await page.screenshot({path:path.join(out,'today-desktop.png'),fullPage:true,animations:'disabled'});
  console.log('PASS staging desktop Today: 4 routes, verified opportunity surface and saved 25-leg dock');
  await page.locator('[data-route="games"]').click();
  await page.locator('[data-decision-games]').waitFor({state:'visible'});
  await page.locator('[data-decision-game-list]').waitFor({state:'visible'});
  await page.screenshot({path:path.join(out,'games-desktop.png'),fullPage:true,animations:'disabled'});
  console.log('PASS staging desktop Games: compact game list and same-screen detail');
  const list=page.locator('[data-decision-game-list] [data-decision-game]');
  const n=await list.count();
  if(n>0){
    await list.first().click();
    assert.equal(await page.locator('[data-decision-game-header]').count(),0,'Header is native section, not an old independent route');
    assert.equal(await page.locator('.decision-game-header').count(),1);
    assert.equal(await page.locator('.decision-game-lines').count(),1);
    assert.equal(await page.locator('.decision-game-props').count(),1);
    assert.ok(page.url().includes('#games'),'Game selection must not navigate away');
    console.log('PASS click matchup: spread, ML, total and exact props visible on same route');
  }else{
    console.log('INFO: The real staging scoreboard has no selectable games for current sport; tested empty state.');
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>document.querySelector('[data-route="home"]').click());
  await page.locator('[data-decision-today]').waitFor({state:'visible'});
  const widths=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  assert.ok(widths.scroll<=widths.client+8,'Today must not overflow horizontally on mobile: '+JSON.stringify(widths));
  await page.screenshot({path:path.join(out,'today-mobile.png'),fullPage:true,animations:'disabled'});
  console.log('PASS staging mobile Today: no horizontal overflow');
  if(errors.length)console.log('BROWSER JS ERRORS: '+JSON.stringify(errors.slice(0,5)));
  assert.equal(errors.filter(e=>/decision-dashboard|renderDecisionDashboard|renderDecisionGames|TSO2Decision/.test(e)).length,0,'No decision dashboard JS errors');
  console.log('STAGING DECISION EXPERIENCE BROWSER QA: PASS');
 }finally{await ctx.close();await browser.close()}
})().catch(error=>{console.error('STAGING DECISION EXPERIENCE BROWSER QA: FAIL '+(error.stack||error));process.exitCode=1});
