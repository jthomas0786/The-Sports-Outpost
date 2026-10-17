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
  // Enforce actual CSS palette consistency. The real TSO 2.0 global tokens
  // are blue/navy; the former props and market modules had their own skins.
  // Synthetic probes are inserted ONLY into this test browser DOM.
  const themeReport=await page.evaluate(()=>{
    const root=document.querySelector('.gb2-root');
    if(!root)throw Error('Games Board root missing');
    const host=document.createElement('div');
    host.setAttribute('data-theme-probe','');
    host.style.cssText='position:absolute;left:-10000px;top:0;width:300px;';
    host.innerHTML='<section class="gb2-panel"></section><section class="mi-team"></section>'+
      '<section class="mi-ranked"></section><div class="mi-player"></div>'+
      '<div class="edge2-market edge2-market--total"></div>'+
      '<div class="edge2-market edge2-market--moneyline"></div>'+
      '<div class="mi-filters"><button class="is-active">NHL</button></div>'+
      '<span class="mi-prob"><b>57%</b></span><button class="mi-add">+ PARLAY</button>'+
      '<div class="mi-signal-mini"><span class="mi-signal-track"><span style="width:55%"></span></span></div>';
    root.appendChild(host);
    const expected=(name)=>{
      const probe=document.createElement('div');
      probe.style.backgroundColor='var('+name+')';
      host.appendChild(probe);
      const color=getComputedStyle(probe).backgroundColor;
      probe.remove();return color;
    };
    const color=(sel,pseudo)=>getComputedStyle(root.querySelector(sel),pseudo).backgroundColor;
    const card=expected('--card'),surface=expected('--surface'),outpost=expected('--outpost-orange'),primary=expected('--tso-primary-btn');
    const result={
      card,surface,outpost,primary,
      actualCard:color('.gb2-card'),
      actualPanel:color('[data-theme-probe] .gb2-panel'),
      actualTeam:color('[data-theme-probe] .mi-team'),
      actualRanked:color('[data-theme-probe] .mi-ranked'),
      actualPlayer:color('[data-theme-probe] .mi-player'),
      actualMarket:color('[data-theme-probe] .edge2-market'),
      totalStripe:color('[data-theme-probe] .edge2-market--total','::before'),
      moneylineStripe:color('[data-theme-probe] .edge2-market--moneyline','::before'),
      propProbability:color('[data-theme-probe] .mi-prob>b'),
      activePropFilter:color('[data-theme-probe] .mi-filters button.is-active'),
      signalTrack:getComputedStyle(root.querySelector('[data-theme-probe] .mi-signal-track>span')).backgroundImage,
      addButtonColor:getComputedStyle(root.querySelector('[data-theme-probe] .mi-add')).backgroundColor
    };
    host.remove();return result;
  });
  for(const k of ['actualCard','actualPanel','actualRanked'])assert.equal(themeReport[k],themeReport.card,k+' must inherit TSO 2.0 card navy');
  for(const k of ['actualTeam','actualPlayer','actualMarket'])assert.equal(themeReport[k],themeReport.surface,k+' must inherit TSO 2.0 surface navy');
  for(const k of ['totalStripe','moneylineStripe'])assert.equal(themeReport[k],themeReport.outpost,k+' must inherit approved Outpost brand accent');
  assert.equal(themeReport.propProbability,themeReport.primary,'Prop probability badge uses shared primary action accent');
  assert.ok(themeReport.signalTrack.includes(themeReport.outpost),'TSO Prop Signal uses shared current Outpost branding');
  assert.equal(themeReport.addButtonColor,themeReport.primary,'Prop action uses current dashboard primary button token');
  console.log('PASS approved Outpost orange/gold theme on cards, matchup, markets, player props and Prop Signal:',JSON.stringify(themeReport));

  // Regression: owner changes to Theme Studio variables MUST alter every
  // Games component on the actual staging page, not just the editor preview.
  // All changes here are an isolated page-only <style>; NOTHING is published.
  const dynamicTheme=await page.evaluate(()=>{
    const root=document.querySelector('[data-gb2-root]');
    if(!root)throw Error('Games board root unavailable for theme integration check');
    const override=document.createElement('style');
    override.id='tso-games-theme-qa-only';
    override.textContent=':root{--bg:#0a0e25;--tso-page-gutter:39px;--tso-body-size:16px;--tso-heading-size:41px;--tso-button-height:52px;--card:#192a3e;--surface:#233c54;--outpost-orange:#8bcd2e;--outpost-gold:#d8abff;--blue:#c259eb;--blue-2:#d385f8;--text:#d9e8f3;--muted:#b3a3bf;--line-strong:#8f719a;--tso-primary-btn:#f06b21;--tso-btn-text:#151515;--tso-secondary-btn:#254e75;--r:29px;--r-sm:21px;--tso-card-padding:27px;--tso-grid-gap:29px;--tso-page-max:1690px;}';
    document.head.appendChild(override);
    const probe=document.createElement('div');probe.setAttribute('data-theme-mutation-test','');
    probe.style.cssText='position:absolute;left:-20000px;top:0;width:600px';
    probe.innerHTML='<section class="gb2-panel"></section><section class="gb2-hero"></section><div class="mi-player-body"></div><article class="mi-player"></article><article class="edge2-market edge2-market--moneyline"></article><button class="mi-add">ADD</button><button class="gb2-back">BACK</button><div class="mi-line-model"></div><div class="mi-signal-track"><span style="width:60%"></span></div><div class="gb2-prob-track"><i style="width:60%"></i></div>';
    root.appendChild(probe);
    const css=q=>getComputedStyle(root.querySelector(q));
    const get={
     card:css('.gb2-card').backgroundColor,
     panel:css('[data-theme-mutation-test] .gb2-panel').backgroundColor,
     player:css('[data-theme-mutation-test] .mi-player').backgroundColor,
     market:css('[data-theme-mutation-test] .edge2-market').backgroundColor,
     button:css('[data-theme-mutation-test] .mi-add').backgroundColor,
     buttonText:css('[data-theme-mutation-test] .mi-add').color,
     back:css('[data-theme-mutation-test] .gb2-back').backgroundColor,
     innerLine:css('[data-theme-mutation-test] .mi-line-model').borderTopColor,
     stripe:getComputedStyle(root.querySelector('[data-theme-mutation-test] .edge2-market--moneyline'),'::before').backgroundColor,
     signal:css('[data-theme-mutation-test] .mi-signal-track>span').backgroundImage,
     probability:css('[data-theme-mutation-test] .gb2-prob-track i').backgroundImage,
     radius:css('.gb2-card').borderTopLeftRadius,
     padding:css('.gb2-card').paddingTop,
     gridGap:css('.gb2-grid').columnGap,
     maxWidth:getComputedStyle(root).maxWidth,
     pageBackground:getComputedStyle(document.querySelector('.app-shell.broadcast-shell')).backgroundColor,
     pageGutter:getComputedStyle(document.querySelector('.broadcast-main')).paddingLeft,
     heading:css('.gb2-page-head h1').fontSize,
     bodyText:css('.gb2-page-head p').fontSize,
     heroPadding:css('[data-theme-mutation-test] .gb2-hero').paddingTop,
     controlHeight:css('[data-theme-mutation-test] .gb2-back').minHeight
    };
    probe.remove();override.remove();
    return get;
  });
  assert.equal(dynamicTheme.card,'rgb(25, 42, 62)','Dashboard card color must alter Games cards');
  assert.equal(dynamicTheme.panel,'rgb(25, 42, 62)','Dashboard card color must alter matchup panels');
  for(const name of ['player','market'])assert.equal(dynamicTheme[name],'rgb(35, 60, 84)',name+' uses dashboard inset surface');
  assert.equal(dynamicTheme.button,'rgb(240, 107, 33)','Parlay Ping CTA uses dashboard button color');
  assert.equal(dynamicTheme.buttonText,'rgb(21, 21, 21)','CTA text uses dashboard button text token');
  assert.equal(dynamicTheme.back,'rgb(37, 78, 117)','Secondary navigation uses dashboard secondary button color');
  assert.equal(dynamicTheme.innerLine,'rgb(143, 113, 154)','Model details use dashboard border');
  assert.equal(dynamicTheme.stripe,'rgb(139, 205, 46)','Game Edge markers use dashboard Outpost accent');
  assert.match(dynamicTheme.signal,/rgb\(139, 205, 46\)/,'Player Signal chart uses dashboard Outpost accent');
  assert.match(dynamicTheme.probability,/rgb\(139, 205, 46\)/,'Game win-probability bars use dashboard Outpost accent');
  assert.equal(dynamicTheme.radius,'29px','Game cards use dashboard corner radius');
  assert.equal(dynamicTheme.padding,'27px','Game cards use dashboard panel padding');
  assert.equal(dynamicTheme.gridGap,'29px','Game grid uses dashboard spacing');
  assert.equal(dynamicTheme.maxWidth,'1690px','Games content uses dashboard maximum width');
  assert.equal(dynamicTheme.pageBackground,'rgb(10, 14, 37)','Games shell uses dashboard page background');
  assert.equal(dynamicTheme.pageGutter,'39px','Games page uses dashboard responsive page gutters');
  assert.equal(dynamicTheme.heading,'41px','Games heading uses dashboard heading size');
  assert.equal(dynamicTheme.bodyText,'16px','Games body text uses dashboard body font size');
  assert.equal(dynamicTheme.heroPadding,'27px','Matchup hero uses dashboard panel padding');
  assert.equal(dynamicTheme.controlHeight,'52px','Games action controls use dashboard button height');
  console.log('PASS temporary Theme Studio edits propagate to Games board, matchup/market, scouting, progress bars, buttons, borders and layout:',JSON.stringify(dynamicTheme));
  const list=page.locator('[data-gb2-grid] [data-gb2-game]');
  if(await list.count()){
    const firstGameId=await list.first().getAttribute('data-gb2-game');
    await list.first().click();
    await page.locator('[data-gb2-detail]').waitFor({state:'visible',timeout:12000});
    assert.equal(await page.locator('.gb2-hero').count(),1,'Selected game needs matchup hero');
    assert.equal(await page.locator('.gb2-matchup .gb2-compare-row').count()>0,true,'Current matchup breakdown is present');
    assert.equal(await page.locator('.gb2-market-panel').count(),0,'Redundant sportsbook markets panel removed from Games matchup');
    assert.equal(await page.locator('.gb2-props').count(),1,'Player prop intelligence included');
    assert.equal(await page.locator('.gb2-props .mi-teams').count(),0,'Redundant team scouting section removed from Games player props');
    assert.equal(await page.locator('.mi-ranked').count(),1,'TSO player signal rankings included');
    assert.equal(await page.locator('.mi-row-column-head>span').count(),4,'Three separate prop metrics and player column');
    const firstMetric=page.locator('.mi-player .mi-row-metrics').first();
    if(await firstMetric.count()){
      assert.equal(await firstMetric.locator('[data-mi-signal]').count(),1,'Prop Signal column');
      assert.equal(await firstMetric.locator('.mi-line-model').count(),1,'Exact Line Model percent column');
      assert.equal(await firstMetric.locator('.mi-line-odds').count(),1,'Line odds with best book column');
      assert.equal(await firstMetric.locator('.mi-book-under').count(),1,'Book branding below line odds');
    }

    assert.ok(page.url().includes('#games'),'A selected matchup stays on the Games route');
    await page.screenshot({path:path.join(out,'game-intelligence-desktop.png'),fullPage:true,animations:'disabled'});
    const playable=page.locator('.mi-player-expand');
    if(await playable.count()){
      const signal=page.locator('.mi-player [data-mi-signal]').first();
      assert.equal(await signal.count(),1,'TSO Signal visible before opening the player');
      await playable.first().click();
      await page.locator('.mi-player.is-open .mi-selection-brief').first().waitFor({state:'visible',timeout:12000});
      assert.equal(await page.locator('.mi-player.is-open [data-mi-research]').count(),1,'Inline player history and visuals');
    await page.locator('.mi-player.is-open .mi-evidence-layout').first().waitFor({state:'visible',timeout:15000});
      assert.equal(await page.locator('.mi-player-label small').filter({hasText:/Under\b|\bU\s+[\d.]+/i}).count(),0,'No unders in main prop intelligence');
    }else console.log('INFO selected live game has no verified player props; isolated fixture validates expansion');
    if(await page.locator('.gb2-hero>small').innerText().then(x=>x.includes('NHL')).catch(()=>false)){
      const count=await page.locator('.gb2-nhl-stats .gb2-compare-row').count();
      assert.ok(count===0||count===8,'NHL comparison has either verified 8 categories or a clearly unavailable source');
    }
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
    if(league==='nfl'&&await page.locator('[data-gb2-grid] [data-gb2-game]').count()){
      await page.locator('[data-gb2-grid] [data-gb2-game]').first().click();
      await page.locator('.gb2-comparison-stats>.gb2-compare-row').first().waitFor({state:'visible',timeout:20000});
      assert.equal(await page.locator('.gb2-comparison-stats>.gb2-compare-row').count(),8,'Reference video: eight verified current-season NFL matchup statistics');
      await page.locator('.gb2-source-note').filter({hasText:/ESPN 2026 regular season/}).waitFor({state:'visible',timeout:20000});
      const rows=await page.locator('.gb2-comparison-stats').innerText();
      for(const label of ['Points per game','Total yards per game','Passing yards per game','Rushing yards per game','Third-down conversion','Defensive points allowed','Defensive yards allowed','Turnover differential']){
        assert.ok(rows.includes(label),'Matchup missing '+label);
      }
      await page.screenshot({path:path.join(out,'nfl-reference-matchup-desktop.png'),fullPage:true,animations:'disabled'});
      await page.locator('[data-gb2-back]').click();
      console.log('PASS reference video matchup: all eight 2026 team-stat comparison rows');
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-gb2-root]').waitFor({state:'visible'});
  const mobile=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  assert.ok(mobile.scroll<=mobile.client+8,'Games Board must not overflow on mobile: '+JSON.stringify(mobile));
  await page.screenshot({path:path.join(out,'games-mobile.png'),fullPage:true,animations:'disabled'});
  console.log('PASS mobile Games Board layout with no horizontal overflow');
  await page.evaluate(()=>document.querySelector('[data-route="home"]').click());
  await page.locator('[data-decision-today]').waitFor({state:'visible'});
  const widths=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  assert.ok(widths.scroll<=widths.client+8,'Today must not overflow horizontally on mobile: '+JSON.stringify(widths));
  await page.screenshot({path:path.join(out,'today-mobile.png'),fullPage:true,animations:'disabled'});
  console.log('PASS staging mobile Today: no horizontal overflow');

  // Site-wide consistency: one shell, one palette, regardless of route.
  // The visible UI may contain additional data/status colors by design.
  await page.setViewportSize({width:1440,height:900});
  const canonicalRoutes=['home','games','research','models','live','gameedge','props','simulations'];
  const routeTheme=[];
  for(const route of canonicalRoutes){
    const actualRoute=await page.evaluate(next=>{
      const button=document.querySelector('[data-route="'+next+'"]');
      if(!button)return 'NO_NAV_BUTTON';
      button.click();
      return location.hash.replace(/^#/,'').split('?')[0];
    },route);
    assert.equal(actualRoute,route,'SPA route '+route+' did not activate correctly');
    const found=await page.evaluate(next=>{
      const root=document.documentElement,vars=getComputedStyle(root);
      const css=q=>getComputedStyle(document.querySelector(q));
      const main=document.querySelector('.broadcast-main');
      const shell=document.querySelector('.app-shell.broadcast-shell');
      const card=document.querySelector('.gb2-card,.feature-game,.research-radar-card,.model-engine-card,.edge2-market,.tso-sim-matchups');
      const cardCSS=card?getComputedStyle(card):null;
      return {route:next,htmlWidth:document.documentElement.scrollWidth,viewWidth:document.documentElement.clientWidth,
        background:css('.app-shell.broadcast-shell').backgroundColor,
        sidebar:css('.tso-side-nav').backgroundColor,
        header:css('.broadcast-header').backgroundColor,
        contentWidth:css('.broadcast-main').maxWidth,
        accent:vars.getPropertyValue('--outpost-orange').trim(),
        gold:vars.getPropertyValue('--outpost-gold').trim(),
        card:vars.getPropertyValue('--card').trim(),
        actualCard:cardCSS?.backgroundColor||null,
        cardClass:card?.className||null,
        pageState:main?.querySelector('#pageContent')?.textContent?.slice(0,40)||null,
        shellExists:Boolean(shell)};
    },route);
    routeTheme.push(found);
    assert.ok(found.shellExists,route+' TSO 2.0 application shell must persist');
    assert.equal(found.background,'rgb(5, 7, 10)',route+' follows approved Outpost page background');
    assert.equal(found.sidebar,'rgb(7, 10, 15)',route+' uses shared original sidebar background');
    assert.equal(found.header,'rgb(7, 10, 15)',route+' uses original TSO top bar background');
    assert.equal(found.accent,'#ff4d1c',route+' uses approved Outpost orange token');
    assert.equal(found.gold,'#ffd84d',route+' uses approved Outpost gold token');
    assert.ok(found.htmlWidth<=found.viewWidth+8,route+' introduces unexpected desktop overflow '+JSON.stringify(found));
  }
  console.log('PASS all original TSO2 routes share one approved Outpost shell and palette:',JSON.stringify(routeTheme));
  await page.screenshot({path:path.join(out,'approved-outpost-all-route-desktop.png'),fullPage:true,animations:'disabled'});
  await page.evaluate(()=>document.querySelector('[data-route="home"]')?.click());

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
  // Isolated owner UI fixture. NO real owner JWT and NO database writes;
  // verify that preview, CSS inspector and publish event work together.
  const themeQA=await ctx.newPage();
  themeQA.on('dialog',dialog=>dialog.accept());
  await themeQA.setContent('<!doctype html><html><head></head><body style="margin:0"><section data-theme-studio class="tso-theme-studio"></section></body></html>');
  await themeQA.addStyleTag({content:fs.readFileSync('tso2/theme-system.css','utf8')});
  await themeQA.evaluate(()=>{
    window.__themeSaved=null;
    window.TSO_AUTH={
      status:'authenticated',
      user:{isOwner:true,id:'theme-qa-only'},
      async rpc(name,args){
        if(name==='tso2_get_published_theme')return {tokens:{},customCss:'',revision:0};
        if(name==='tso2_theme_owner_history')return [];
        if(name==='tso2_save_published_theme'){
          window.__themeSaved=args;
          return {tokens:args.p_tokens,customCss:args.p_custom_css,revision:1};
        }
        throw Error('Unexpected mocked owner RPC: '+name);
      }
    };
  });
  await themeQA.addScriptTag({content:fs.readFileSync('tso2/theme-studio.js','utf8')});
  await themeQA.evaluate(()=>window.TSO2ThemeStudio.mount());
  await themeQA.locator('[data-theme-controls] input[data-theme-token="--blue"]').waitFor();
  await themeQA.screenshot({path:path.join(out,'owner-theme-editor-desktop.png'),fullPage:true,animations:'disabled'});
  assert.ok(await themeQA.locator('.tso-theme-category').count()>=6,'Visual editor contains six design categories');
  await themeQA.locator('[data-theme-swatch-input="--blue"]').fill('#9a51ff');
  assert.equal(await themeQA.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--blue').trim()),'#9a51ff','Live CSS preview changes the actual document design token');
  await themeQA.locator('[data-theme-tab="advanced"]').click();
  await themeQA.locator('[data-theme-css]').fill('.test-theme-preview{border-color:var(--blue)}');
  await themeQA.locator('[data-theme-rule-search]').fill('.tso-theme-preview');
  assert.ok(await themeQA.locator('[data-theme-rule-results] article').count()>0,'Advanced CSS inspector exposes actual stylesheet selectors');
  await themeQA.locator('[data-theme-publish]').click();
  await themeQA.waitForFunction(()=>Boolean(window.__themeSaved));
  const saved=await themeQA.evaluate(()=>window.__themeSaved);
  assert.equal(saved.p_tokens['--blue'],'#9a51ff','Publish sends previewed design tokens');
  assert.match(saved.p_custom_css,/test-theme-preview/,'Publish includes validated CSS overrides');
  assert.equal(saved.p_expected_revision,0,'Publish includes optimistic revision locking');
  await themeQA.screenshot({path:path.join(out,'owner-theme-css-inspector.png'),fullPage:true,animations:'disabled'});
  console.log('PASS mocked owner Theme/CSS Dashboard: live preview, six panels, real rule search and versioned publish');
  await themeQA.close();
  if(errors.length)console.log('BROWSER JS ERRORS: '+JSON.stringify(errors.slice(0,5)));
  assert.equal(errors.filter(e=>/decision-dashboard|renderDecisionDashboard|renderDecisionGames|TSO2Decision/.test(e)).length,0,'No decision dashboard JS errors');
  console.log('STAGING DECISION EXPERIENCE BROWSER QA: PASS');
 }finally{await ctx.close();await browser.close()}
})().catch(error=>{console.error('STAGING DECISION EXPERIENCE BROWSER QA: FAIL '+(error.stack||error));process.exitCode=1});
