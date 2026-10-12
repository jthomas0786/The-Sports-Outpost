/* TSO 2.0 decision-first presentation.
 * Receives only existing, verified scores, props, models and game-line caches.
 * No independent betting forecasts or invented data are produced here. */
(()=>{
  'use strict';
  const E=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const sport=value=>String(value||'').toLowerCase();
  const team=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const number=value=>value===null||value===undefined||value===''?null:(Number.isFinite(Number(value))?Number(value):null);
  const pct=value=>{const n=number(value);return n===null?'—':n.toFixed(1)+'%';};
  const odds=value=>{const n=number(value);return n===null?'—':n>0?'+'+Math.round(n):String(Math.round(n));};
  const edge=value=>{const n=number(value);return n===null?'—':(n>0?'+':'')+n.toFixed(1)+' pp';};
  const state={selectedGameId:null};
  function filters(league){
    return '<div class="decision-filters" role="group" aria-label="Sport">'
      +['all','nfl','nba','nhl','mlb'].map(s=>'<button type="button" class="'+(league===s?'is-active':'')+'" data-decision-league="'+s+'">'+s.toUpperCase()+'</button>').join('')
      +'</div>';
  }
  function todayHTML(league){
    return '<section class="decision-page decision-today" data-decision-today>'
      +'<header class="decision-intro"><div><span>THE SPORTS OUTPOST · DECISION DASHBOARD</span><h1>Today at The Outpost</h1><p>Verified opportunities, live games and your betslip. Everything important on one screen.</p></div>'
      +'<div class="decision-intro-actions"><button type="button" class="decision-outline-btn" data-decision-route="games">ALL GAMES →</button></div></header>'
      +filters(league)
      +'<div class="decision-summary" data-decision-summary><div class="decision-stat"><small>LIVE GAMES</small><strong>—</strong><em>Connecting scoreboard</em></div><div class="decision-stat"><small>POSITIVE MODEL EDGES</small><strong>—</strong><em>Exact verified rows</em></div><div class="decision-stat"><small>MY BETSLIP</small><strong>—</strong><em>Up to 25 legs</em></div></div>'
      +'<section><div class="decision-section-title"><div><small>QUICK DECISIONS · VERIFIED MODELS</small><h2>Top opportunities</h2><p>Model, sportsbook-implied probability and edge — no guessing.</p></div></div>'
      +'<div class="decision-opportunities" data-decision-opportunities><div class="decision-empty">Connecting verified model data…</div></div></section>'
      +'<section class="decision-today-grid"><div class="decision-panel decision-panel-pad"><div class="decision-section-title"><div><small>LIVE & UPCOMING</small><h2>Today’s games</h2><p>Click any matchup for one-screen analysis.</p></div><button class="decision-outline-btn" type="button" data-decision-route="games">ALL GAMES →</button></div>'
      +'<div class="decision-mini-games" data-decision-home-games><div class="decision-empty">Connecting live scores…</div></div></div>'
      +'<aside class="decision-panel decision-panel-pad"><div class="decision-section-title"><div><small>HOW TO READ IT</small><h2>Three numbers, one decision</h2></div></div>'
      +'<div class="decision-empty"><b>MODEL</b>Verified TSO probability for the exact selection.</div>'
      +'<div class="decision-empty"><b>MARKET</b>Implied probability of its sportsbook quote.</div>'
      +'<div class="decision-empty"><b>EDGE</b>Model minus market. A positive number is not a guarantee.</div></aside></section>'
      +'<div class="decision-parlay-dock" data-decision-betslip></div></section>';
  }
  function gamesHTML(league){
    return '<section class="decision-page decision-games" data-decision-games>'
      +'<header class="decision-intro"><div><span>THE SPORTS OUTPOST · ONE-SCREEN GAME HUB</span><h1>Games</h1><p>Spread, moneyline, total, player props and explanations — one matchup, one screen.</p></div>'
      +'<div class="decision-intro-actions"><button type="button" class="decision-outline-btn" data-decision-route="home">← TODAY</button></div></header>'
      +filters(league)
      +'<div class="decision-game-columns"><aside class="decision-panel decision-game-list"><div class="decision-section-title"><div><small>SCHEDULE</small><h2>Select a game</h2></div></div><div class="decision-mini-games" data-decision-game-list><div class="decision-empty">Connecting scoreboard…</div></div></aside>'
      +'<div class="decision-game-detail" data-decision-game-detail><div class="decision-empty">Choose a game to see your complete decision view.</div></div></div>'
      +'<div class="decision-parlay-dock" data-decision-betslip></div></section>';
  }
  function exactReason(row){
    const v=row?.model?.reason||row?.model?.explanation||row?.reason;
    if(typeof v==='string'&&v.trim())return v.trim().slice(0,600);
    return 'TSO matched the exact player, side, market and threshold to a verified sportsbook selection. A matchup-specific model explanation is not available from this source.';
  }
  function selection(row){
    if(row?.selection)return String(row.selection);
    const line=number(row?.line),side=row?.side==='under'?'Under':'Over';
    if(['atd','fgs','hr','atg'].includes(sport(row.market)))return 'Yes';
    return line===null?side:side+' '+line;
  }
  function gameStatus(g){
    if(g?.state==='in')return String(g.detail||'LIVE');
    if(g?.state==='post')return 'FINAL';
    const t=Date.parse(g?.startTime||'');
    return Number.isFinite(t)?new Intl.DateTimeFormat(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'}).format(new Date(t)):'UPCOMING';
  }
  function gameRow(game,active=false){
    const score=game.state==='pre'?'':(' · '+E(game.away?.score??0)+'–'+E(game.home?.score??0));
    return '<button type="button" class="decision-mini-game '+(active?'is-current':'')+'" data-decision-game="'+E(game.id)+'">'
      +'<span><b>'+E(game.away?.abbr||'Away')+' @ '+E(game.home?.abbr||'Home')+score+'</b>'
      +'<small>'+E(String(game.league||'').toUpperCase())+' · '+E(gameStatus(game))+'</small></span><strong>VIEW →</strong></button>';
  }
  function metrics(row){
    const m=row.model||{},n=number(m.edgePct);
    return '<div class="decision-opportunity-metrics"><div><small>MODEL</small><strong>'+pct(m.probabilityPct)+'</strong></div>'
      +'<div><small>MARKET</small><strong>'+pct(row.impliedPct)+'</strong></div>'
      +'<div><small>EDGE</small><strong class="'+(n!==null&&n>0?'positive':'')+'">'+edge(n)+'</strong></div></div>';
  }
  function matchedRows(rows,g){
    const away=new Set([team(g.away?.abbr),team(g.away?.name)].filter(Boolean));
    const home=new Set([team(g.home?.abbr),team(g.home?.name)].filter(Boolean));
    return rows.filter(r=>{
      if(sport(r.sport)!==sport(g.league))return false;
      if(!r.awayTeam||!r.homeTeam||!away.has(team(r.awayTeam))||!home.has(team(r.homeTeam)))return false;
      const a=Date.parse(r.startTimeUTC||r.startTime||'');
      const b=Date.parse(g.startTimeUTC||g.startTime||'');
      if(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)>12*3600*1000)return false;
      return true;
    });
  }
  function ranked(rows){return [...rows].sort((a,b)=>(number(b.model?.edgePct)??-999)-(number(a.model?.edgePct)??-999));}
  function makeActions(root,ctx,games){
    root.querySelectorAll('[data-decision-league]').forEach(b=>b.onclick=()=>ctx.selectLeague(b.dataset.decisionLeague));
    root.querySelectorAll('[data-decision-route]').forEach(b=>b.onclick=()=>ctx.navigate(b.dataset.decisionRoute));
    root.querySelectorAll('[data-decision-game]').forEach(b=>b.onclick=()=>{
      const game=games.find(g=>String(g.id)===b.dataset.decisionGame);
      if(game){state.selectedGameId=String(game.id);ctx.openGame(game);}
    });
    root.querySelectorAll('[data-decision-add]').forEach(b=>b.onclick=()=>{
      const row=ctx.rows.find(r=>String(r.key)===b.dataset.decisionAdd);
      if(row)ctx.addProp(row);
    });
    root.querySelectorAll('[data-decision-live]').forEach(b=>b.onclick=()=>{
      const g=games.find(g=>String(g.id)===b.dataset.decisionLive);
      if(g)ctx.openLive(g);
    });
    root.querySelectorAll('[data-decision-props]').forEach(b=>b.onclick=()=>ctx.navigate('props'));
    root.querySelectorAll('[data-decision-open-parlay]').forEach(b=>b.onclick=()=>ctx.navigate('parlays'));
  }
  function renderDock(root,ctx){
    const dock=root.querySelector('[data-decision-betslip]');if(!dock)return;
    const keys=ctx.draftKeys||[];
    const rows=keys.slice(-3).map(k=>ctx.rows.find(r=>String(r.key)===k)).filter(Boolean);
    dock.innerHTML='<div><strong>PARLAY PING · '+keys.length+' / 25 LEGS</strong><br><span>'
      +(keys.length?'Selections stay saved while you compare games.':'Add verified props without leaving the game.')
      +'</span></div><span class="decision-dock-preview">'+E(rows.map(r=>r.player+' '+selection(r)).join(' · ')||'Your betslip is ready')+'</span>'
      +'<button type="button" data-decision-open-parlay>OPEN BETSLIP →</button>';
  }
  function renderToday(root,ctx){
    const games=ctx.games||[];
    const modeled=ranked(ctx.rows.filter(row=>
      (ctx.league==='all'||sport(row.sport)===ctx.league)&&row.model&&number(row.model.probabilityPct)!==null
      &&number(row.model.edgePct)!==null&&Number(row.model.edgePct)>0
    ));
    root.querySelector('[data-decision-summary]').innerHTML=
      '<div class="decision-stat"><small>LIVE GAMES</small><strong>'+(ctx.liveReady?games.filter(g=>g.state==='in').length:'—')+'</strong><em>'+E(ctx.liveReady?games.length+' games in filter':'Connecting scoreboard')+'</em></div>'
      +'<div class="decision-stat"><small>POSITIVE MODEL EDGES</small><strong>'+(ctx.propsReady?modeled.length:'—')+'</strong><em>Exact matches only</em></div>'
      +'<div class="decision-stat"><small>MY BETSLIP</small><strong>'+ctx.draftKeys.length+' / 25</strong><em>Saved to your TSO account</em></div>';
    root.querySelector('[data-decision-opportunities]').innerHTML=!ctx.propsReady
      ?'<div class="decision-empty"><b>Connecting real model data.</b>No preview predictions will be substituted.</div>'
      :modeled.length?modeled.slice(0,5).map(r=>
        '<article class="decision-opportunity"><div class="decision-opportunity-name"><small>'+E(String(r.sport||'').toUpperCase())+' · '+E(r.book||'Verified book')+' · '+E(odds(r.price))+'</small>'
          +'<strong>'+E(r.player||'Player')+'</strong><span>'+E(r.marketLabel||r.market||'Market')+' · '+E(selection(r))+' · '+E(r.awayTeam||'')+' @ '+E(r.homeTeam||'')+'</span></div>'
        +metrics(r)+'<div class="decision-opportunity-actions"><button type="button" class="decision-primary-btn" data-decision-add="'+E(r.key)+'">+ PARLAY</button></div>'
        +'<details class="decision-opportunity-details"><summary>WHY? · '+E(r.model?.sourceLabel||r.model?.source||'TSO MODEL')+'</summary><p>'+E(exactReason(r))+'</p>'
        +'<p class="decision-opportunity-source">Exact sportsbook: '+E(r.book||'Verified quote')+' '+E(odds(r.price))+'</p></details></article>'
        ).join('')
      :'<div class="decision-empty"><b>No verified positive model edges right now.</b>Try another sport or browse all games. TSO will not manufacture recommendations.</div>';
    root.querySelector('[data-decision-home-games]').innerHTML=!ctx.liveReady
      ?'<div class="decision-empty">Connecting scoreboard…</div>'
      :games.length?games.slice(0,10).map(g=>gameRow(g)).join('')
      :'<div class="decision-empty"><b>No scheduled games for this filter.</b>Try another sport.</div>';
    renderDock(root,ctx);
  }
  function renderGames(root,ctx){
    const games=ctx.games||[];
    const selected=games.find(g=>String(g.id)===String(state.selectedGameId||ctx.selectedGameId))
      ||games.find(g=>g.state==='in')||games.find(g=>g.state==='pre')||games[0];
    if(selected)state.selectedGameId=String(selected.id);
    root.querySelector('[data-decision-game-list]').innerHTML=!ctx.liveReady
      ?'<div class="decision-empty">Connecting real scoreboard…</div>'
      :games.length?games.map(g=>gameRow(g,String(g.id)===String(selected?.id))).join('')
      :'<div class="decision-empty"><b>No games in this sport right now.</b>Change the filter above.</div>';
    const detail=root.querySelector('[data-decision-game-detail]');
    if(!selected){
      detail.innerHTML='<div class="decision-empty"><b>Waiting for an actual game.</b>No invented game data will be displayed.</div>';
      renderDock(root,ctx);return;
    }
    const cache=ctx.linesBySport?.get?.(selected.league);
    const cg=cache?.games?.find(g=>String(g.id)===String(selected.id)||
      (team(g.away?.abbr)===team(selected.away?.abbr)&&team(g.home?.abbr)===team(selected.home?.abbr)));
    const lines=selected.league==='nhl'
      ?cache?.linesById?.[String(cg?.id||selected.id)]
      :(cg?.gameLines||selected.gameLines||null);
    if(!cache)ctx.ensureLines(selected.league);
    const matched=matchedRows(ctx.rows,selected);
    const intelligence=window.TSO2Matchup;
    let marketMarkup='';
    if(lines){
      try{marketMarkup=ctx.renderMarkets(cg||selected,lines);}catch(error){
        console.warn('Game Hub market cards unavailable',error);
      }
    }
    if(!marketMarkup)marketMarkup='<div class="decision-empty"><b>Verified game lines pending.</b>Spread, moneyline and total need valid current sportsbook data. No simulated percentages.</div>';
    detail.innerHTML='<section class="decision-panel decision-game-header"><small>'+E(String(selected.league||'').toUpperCase())+' · '+E(gameStatus(selected))+'</small>'
      +'<h2>'+E(selected.away?.name||selected.away?.abbr||'Away')+' @ '+E(selected.home?.name||selected.home?.abbr||'Home')+'</h2>'
      +'<p>'+E(selected.venue||'Venue unavailable')+' · '+E(selected.state==='in'?'Live':selected.state==='post'?'Final':'Upcoming')+'</p>'
      +'<div class="decision-game-header-actions"><button type="button" class="decision-outline-btn" data-decision-live="'+E(selected.id)+'">PLAY BY PLAY & BOX SCORE →</button></div></section>'
      +'<section class="decision-panel decision-game-lines"><div class="decision-section-title"><div><small>GAME EDGE · VERIFIED ODDS</small><h2>Spread · Moneyline · Total</h2><p>Three decisions with the market explanation immediately below.</p></div></div>'
      +'<div class="edge2-markets">'+marketMarkup+'</div></section>'
      +'<section class="decision-panel decision-game-props mi-embedded">'
      +(intelligence?intelligence.listing(selected,matched):
        '<div class="decision-empty">Player scouting is connecting. Exact props and probabilities will appear when verified.</div>')
      +'</section><details class="decision-deep-detail"><summary>ADVANCED DETAILS · OPTIONAL</summary>'
      +'<p>The full play-by-play and all prop markets remain available if you want to dig deeper.</p>'
      +'<button type="button" class="decision-outline-btn" data-decision-live="'+E(selected.id)+'">PLAY BY PLAY →</button>'
      +'<button type="button" class="decision-outline-btn" data-decision-props>FULL PROP BOARD →</button></details>';
    if(intelligence)intelligence.bind(detail,{
      game:selected,
      rows:matched,
      addProp:ctx.addProp,
      research:ctx.research,
      history:ctx.history,
      refresh:()=>renderGames(root,ctx)
    });
    renderDock(root,ctx);
  }
  function render(ctx){
    const root=document.querySelector(ctx.route==='home'?'[data-decision-today]':'[data-decision-games]');
    if(!root)return;
    if(ctx.route==='home')renderToday(root,ctx);
    else if(ctx.route==='games')renderGames(root,ctx);
    makeActions(root,ctx,ctx.games||[]);
  }
  window.TSO2Decision={todayHTML,gamesHTML,render,state,matchedRows,exactReason};
})();
