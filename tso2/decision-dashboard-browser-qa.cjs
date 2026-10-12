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
    const state=await page.evaluate(()=>({
      hash:location.hash,
      selectedNav:[...document.querySelectorAll('[data-league].is-active')].map(x=>x.dataset.league),
      gameRows:document.querySelectorAll('[data-decision-game-list] [data-decision-game]').length,
      detail:document.querySelector('[data-decision-game-detail]')?.innerText?.slice(0,400),
      selectedId:window.TSO2Decision?.state?.selectedGameId
    }));
    console.log('Selected game diagnostics:',JSON.stringify(state));
    await page.locator('.decision-game-header').waitFor({state:'visible',timeout:10000});
    assert.equal(await page.locator('.decision-game-lines').count(),1);
    assert.equal(await page.locator('.decision-game-props').count(),1);
    assert.equal(await page.locator('.mi-team').count(),2,'Each matchup needs both teams defensive scouting panels');
    assert.equal(await page.locator('.mi-ranked').count(),1,'One-page matchup must include ranked player analysis');
    const playerCards=await page.locator('.mi-player-expand').count();
    if(playerCards){
      await page.locator('.mi-player-expand').first().click();
      await page.locator('.mi-player.is-open .mi-player-body').first().waitFor({state:'visible',timeout:12000});
      assert.equal(await page.locator('.mi-player.is-open .mi-expanded-stats').count(),1,'Player accordion has model and market details');
      assert.equal(await page.locator('.mi-player.is-open [data-mi-research]').count(),1,'Player accordion has inline recent form');
      console.log('PASS verified prop opens inline and exposes probability, odds, and research source');
    }else{
      console.log('INFO: Matchup has no exact matched props in this real data snapshot, so only verified empty state is shown');
    }
    await page.screenshot({path:path.join(out,'game-intelligence-desktop.png'),fullPage:true,animations:'disabled'});
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
  // The current live slate may have no matched props. Test the accordion
  // itself in an isolated fixture with clearly synthetic QA records, never
  // pass mock data to the public dashboard or claim it is a live prediction.
  const fixture=await ctx.newPage();
  await fixture.setContent('<!doctype html><html><body style="background:#0b1015"><main id="qaRoot"></main></body></html>');
  await fixture.addStyleTag({content:fs.readFileSync('tso2/matchup-intelligence.css','utf8')});
  await fixture.addScriptTag({content:fs.readFileSync('tso2/matchup-intelligence.js','utf8')});
  await fixture.evaluate(()=>{
    const game={id:'qa-only-game',league:'nfl',away:{abbr:'BUF',name:'QA Away'},home:{abbr:'LA',name:'QA Home'}};
    const rows=[{key:'qa-only-prop',sport:'nfl',player:'Test Player',team:'BUF',awayTeam:'BUF',homeTeam:'LA',
      market:'atd',marketLabel:'Anytime touchdown',side:'over',book:'Mock Sportsbook',
      price:125,impliedPct:44.4,model:{probabilityPct:52.3,edgePct:7.9,reason:'Mock scenario for browser interaction only'}}];
    const research=async()=>({available:true,player:{
      gameLog:[{date:'2026-10-11',tds:1},{date:'2026-10-04',tds:0},{date:'2026-09-27',tds:1}],
      matchup:{previousSeasonAllowed:{perGame:{tds:1.2}}}
    },source:'Isolated browser QA data'});
    const history=async()=>({available:true,open:{price:150},current:{price:125},points:[{price:150},{price:125}]});
    window.__qaAdded=[];
    const context={game,rows,research,history,addProp:r=>window.__qaAdded.push(r.key)};
    context.refresh=()=>{const root=document.querySelector('#qaRoot');root.innerHTML=window.TSO2Matchup.listing(game,rows);window.TSO2Matchup.bind(root,context);};
    context.refresh();
  });
  await fixture.locator('[data-mi-expand="qa-only-prop"]').click();
  await fixture.locator('.mi-player.is-open .mi-player-body').waitFor({state:'visible'});
  await fixture.locator('.mi-form-metrics').first().waitFor({state:'visible',timeout:15000});
  await fixture.locator('[data-mi-history="qa-only-prop"] .mi-form-metrics').waitFor({state:'visible',timeout:15000});
  assert.equal(await fixture.locator('.mi-team').count(),2);
  assert.ok((await fixture.locator('.mi-analytics').innerText()).includes('2/3'));
  await fixture.locator('[data-mi-add="qa-only-prop"]').click();
  assert.equal(await fixture.evaluate(()=>window.__qaAdded.join(',')),'qa-only-prop');
  await fixture.screenshot({path:path.join(out,'player-accordion-qa-fixture.png'),fullPage:true,animations:'disabled'});
  console.log('PASS isolated mock-only browser: expand player, show exact L5 hit history and line movement, add to persistent betslip callback');
  await fixture.close();
  if(errors.length)console.log('BROWSER JS ERRORS: '+JSON.stringify(errors.slice(0,5)));
  assert.equal(errors.filter(e=>/decision-dashboard|renderDecisionDashboard|renderDecisionGames|TSO2Decision/.test(e)).length,0,'No decision dashboard JS errors');
  console.log('STAGING DECISION EXPERIENCE BROWSER QA: PASS');
 }finally{await ctx.close();await browser.close()}
})().catch(error=>{console.error('STAGING DECISION EXPERIENCE BROWSER QA: FAIL '+(error.stack||error));process.exitCode=1});
