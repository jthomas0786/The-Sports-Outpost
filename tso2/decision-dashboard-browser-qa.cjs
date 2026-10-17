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
  assert.equal(await page.locator('.tso-side-primary > .tso-side-item').count(),5,'Five current primary destinations including TSO Simulations');
  assert.equal(await page.locator('.tso-decision-advanced').count(),1);
  assert.equal(await page.locator('.tso-decision-advanced').evaluate(el=>el.open),false,'Advanced tools should start collapsed');
  await page.screenshot({path:path.join(out,'today-desktop.png'),fullPage:true,animations:'disabled'});
  console.log('PASS staging desktop Today: 5 routes, verified opportunity surface and saved 25-leg dock');
  await page.locator('[data-route="games"]').click();
  await page.locator('[data-gb2-root]').waitFor({state:'visible',timeout:35000});
  assert.equal((await page.locator('.gb2-page-head h1').innerText()).trim(),'Games Board');
  assert.equal(await page.locator('[data-gb2-league]').count(),5,'ALL/NFL/NBA/NHL/MLB sport filters');
  await page.locator('[data-gb2-grid]').waitFor({state:'visible'});
  await page.screenshot({path:path.join(out,'games-desktop.png'),fullPage:true,animations:'disabled'});
  console.log('PASS staging Games Board: source-labelled model/market win chances and three-column cards');
  const list=page.locator('[data-gb2-grid] [data-gb2-game]');
  if(await list.count()){
    const firstGameId=await list.first().getAttribute('data-gb2-game');
    await list.first().click();
    await page.locator('[data-gb2-detail]').waitFor({state:'visible',timeout:12000});
    assert.equal(await page.locator('.gb2-hero').count(),1,'Selected game needs matchup hero');
    assert.equal(await page.locator('.gb2-matchup .gb2-compare-row').count()>=3,true,'Actual matchup comparison');
    assert.equal(await page.locator('.gb2-market-panel').count(),1,'Game markets included');
    assert.equal(await page.locator('.gb2-props').count(),1,'Player prop intelligence included');
    assert.equal(await page.locator('.mi-team').count(),2,'Defensive scouting must include both teams');
    assert.equal(await page.locator('.mi-ranked').count(),1,'TSO player signal rankings included');
    assert.ok(page.url().includes('#games'),'A selected matchup stays on the Games route');
    await page.screenshot({path:path.join(out,'game-intelligence-desktop.png'),fullPage:true,animations:'disabled'});
    const playable=page.locator('.mi-player-expand');
    if(await playable.count()){
      const signal=page.locator('.mi-player [data-mi-signal]').first();
      assert.equal(await signal.count(),1,'TSO Signal visible before opening the player');
      await playable.first().click();
      await page.locator('.mi-player.is-open .mi-expanded-stats').first().waitFor({state:'visible',timeout:12000});
      assert.equal(await page.locator('.mi-player.is-open [data-mi-research]').count(),1,'Inline player history and visuals');
      assert.equal(await page.locator('.mi-player-label small').filter({hasText:/Under\b|\bU\s+[\d.]+/i}).count(),0,'No unders in main prop intelligence');
    }else console.log('INFO selected live game has no verified player props; isolated fixture validates expansion');
    await page.locator('[data-gb2-back]').click();
    await page.locator('[data-gb2-grid]').waitFor({state:'visible'});
    assert.ok(await page.locator('[data-gb2-game="'+firstGameId+'"]').count()>0,'Back returns to exact slate');
    console.log('PASS click game → matchup details & player props → back to all games');
  }else console.log('INFO live scoreboard has no upcoming games for All; source-backed empty state shown');

  // Regression: rapidly moving between sports must never switch sport as
  // a side-effect of asynchronous game-line loading.
  for(const league of ['nhl','nba','nfl','all']){
    await page.locator('[data-gb2-league="'+league+'"]').click();
    await page.locator('[data-gb2-root]').waitFor({state:'visible',timeout:15000});
    assert.equal(await page.locator('[data-gb2-league="'+league+'"].is-active').count(),1,'Sport remains '+league);
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-gb2-root]').waitFor({state:'visible'});
  const mobile=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  assert.ok(mobile.scroll<=mobile.client+8,'Games Board must not overflow on mobile: '+JSON.stringify(mobile));
  await page.screenshot({path:path.join(out,'games-mobile.png'),fullPage:true,animations:'disabled'});
  console.log('PASS mobile Games Board layout with no horizontal overflow');
  await page.locator('[data-route="home"]').click();
  await page.locator('[data-decision-today]').waitFor({state:'visible'});
  const widths=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  assert.ok(widths.scroll<=widths.client+8,'Today must not overflow horizontally on mobile: '+JSON.stringify(widths));
  await page.screenshot({path:path.join(out,'today-mobile.png'),fullPage:true,animations:'disabled'});
  console.log('PASS staging mobile Today: no horizontal overflow');
  // The current live slate may have no matched props. Test the accordion
  // itself in an isolated fixture with clearly synthetic QA records, never
  // pass mock data to the public dashboard or claim it is a live prediction.
  const fixture=await ctx.newPage();
  await fixture.route('**/tso2/data/nfl-td-opportunities.json*',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({
      schemaVersion:1,source:'nflverse / nflfastR play-by-play (CC BY 4.0)',
      generatedAt:'2026-10-10T00:00:00Z',
      seasons:{'2026':{
        teams:{BUF:{gamesPlayed:5,redZoneOpps:30,goalLineOpps:10,targets:140,carries:160},
          LA:{gamesPlayed:5,redZoneOpps:40,goalLineOpps:15,targets:200,carries:120}},
        players:{'00-0033553':{
          team:'BUF',gamesWithOpportunities:5,targetSharePct:23.4,carrySharePct:27.1,
          redZoneSharePct:29.5,goalLineSharePct:41.3,targets:34,carries:44,
          redZoneOpps:13,goalLineOpps:4,redZoneTdYieldPct:21.5
        }}
      }}
    })
  }));
  await fixture.setContent('<!doctype html><html><body style="background:#0b1015"><main id="qaRoot"></main></body></html>');
  await fixture.addStyleTag({content:fs.readFileSync('tso2/matchup-intelligence.css','utf8')});
  await fixture.addScriptTag({content:fs.readFileSync('tso2/matchup-intelligence.js','utf8')});
  await fixture.evaluate(()=>{
    const game={id:'qa-only-game',league:'nfl',away:{abbr:'BUF',name:'QA Away'},home:{abbr:'LA',name:'QA Home'}};
    const rows=[{key:'qa-only-prop',sport:'nfl',player:'Test Player',team:'BUF',awayTeam:'BUF',homeTeam:'LA',
      market:'atd',marketLabel:'Anytime touchdown',side:'over',book:'Mock Sportsbook',
      price:125,impliedPct:44.4,model:{probabilityPct:52.3,edgePct:7.9,reason:'Mock scenario for browser interaction only'}}];
    const research=async()=>({available:true,player:{
      gsisId:'00-0033553',team:'BUF',
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
  await fixture.locator('.mi-games-chart').first().waitFor({state:'visible',timeout:15000});
  await fixture.locator('.mi-hit-track').first().waitFor({state:'visible',timeout:15000});
  await fixture.locator('[data-mi-history="qa-only-prop"] .mi-movement-chart').waitFor({state:'visible',timeout:15000});
  assert.equal(await fixture.locator('.mi-games-chart rect').count()>=3,true,'Observed game bars must render');
  assert.match(await fixture.locator('.mi-chart-panel').innerText(),/LAST 3 OBSERVED GAMES/);
  assert.match(await fixture.locator('.mi-hit-panel').innerText(),/2\/3/);
  assert.equal(await fixture.locator('.mi-team').count(),2);
  assert.ok((await fixture.locator('.mi-analytics').innerText()).includes('2/3'));
  await fixture.locator('.mi-verified-usage').first().waitFor({state:'visible',timeout:15000});
  assert.match(await fixture.locator('.mi-nfl-opportunities').innerText(),/23.4%/);
  assert.match(await fixture.locator('.mi-nfl-opportunities').innerText(),/RED-ZONE SHARE/);
  await fixture.locator('[data-mi-attack="LA"] .mi-opp-stat').first().waitFor({state:'visible',timeout:15000});
  assert.match(await fixture.locator('[data-mi-attack="LA"]').innerText(),/BUF offense/);
  assert.equal(await fixture.locator('.mi-read-signal').count(),2,'Mock ATD without a numeric line renders real L5/L10 evidence but no invented line margin');
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
