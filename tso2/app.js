(() => {
  const shell = document.querySelector('.app-shell');
  const toast = document.querySelector('.route-toast');
  const pageContent = document.getElementById('pageContent');
  const homeHTML = pageContent.innerHTML;
  const profileMenu = document.querySelector('.profile-menu');
  const profileButton = profileMenu?.querySelector('.profile-pill');
  const profileDropdown = profileMenu?.querySelector('.profile-dropdown');
  const OWNER_HANDLE = 'justcallme_jt';
  let currentRoute = 'home';
  let currentLeague = 'all';
  let liveFeedCache = null;
  let liveFeedFetchedAt = 0;
  let liveFeedInFlight = null;
  let propsFeedCache = null;
  let propsFeedFetchedAt = 0;
  let propsFeedInFlight = null;
  const LIVE_FEED_TTL = 12000;
  const LIVE_POLL_MS = 30000;
  const PROPS_FEED_TTL = 30000;
  const PROPS_POLL_MS = 60000;

  const normalizeHandle = value => String(value || '').trim().replace(/^@/, '').toLowerCase();
  const currentUserHandle = () => normalizeHandle(
    window.TSO_CURRENT_USER?.username ||
    window.TSO_CURRENT_USER?.handle ||
    document.querySelector('.app-shell')?.dataset.userHandle ||
    profileMenu?.dataset.userHandle ||
    ''
  );
  const isOwner = () => currentUserHandle() === OWNER_HANDLE;

  function syncOwnerTools(){
    document.querySelectorAll('[data-owner-only]').forEach(item => {
      item.hidden = !isOwner();
      item.setAttribute('aria-hidden', String(!isOwner()));
    });
  }

  function closeProfileMenu(){
    if(!profileMenu || !profileDropdown || !profileButton) return;
    profileMenu.classList.remove('is-open');
    profileDropdown.hidden = true;
    profileButton.setAttribute('aria-expanded','false');
  }

  function toggleProfileMenu(){
    if(!profileMenu || !profileDropdown || !profileButton) return;
    const opening = profileDropdown.hidden;
    profileMenu.classList.toggle('is-open', opening);
    profileDropdown.hidden = !opening;
    profileButton.setAttribute('aria-expanded', String(opening));
  }

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  const localDateKey = () => {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('');
  };

  const leagueLabel = value => String(value || '').toUpperCase();
  const stateRank = state => state === 'in' ? 0 : state === 'pre' ? 1 : 2;

  function sortedGames(games=[]){
    return [...games].sort((a,b) => {
      const rank = stateRank(a.state) - stateRank(b.state);
      if(rank) return rank;
      const at = Date.parse(a.startTime || '') || 0;
      const bt = Date.parse(b.startTime || '') || 0;
      return a.state === 'post' ? bt-at : at-bt;
    });
  }

  function gameStatusText(game){
    if(game.state === 'post') return game.detail || 'FINAL';
    if(game.state === 'in') return game.detail || [game.period ? 'P'+game.period : '', game.clock || ''].filter(Boolean).join(' · ') || 'LIVE';
    const dt = Date.parse(game.startTime || '');
    if(!Number.isFinite(dt)) return game.detail || 'UPCOMING';
    return new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(new Date(dt));
  }

  function gameShortState(game){
    if(game.state === 'post') return 'FINAL';
    if(game.state === 'in') return game.detail || 'LIVE';
    return gameStatusText(game);
  }

  function currentFeedGames(){
    const all = sortedGames(liveFeedCache?.games || []);
    return currentLeague === 'all' ? all : all.filter(g => g.league === currentLeague);
  }

  function feedUpdatedText(){
    const when = Date.parse(liveFeedCache?.generatedAt || '');
    if(!Number.isFinite(when)) return 'Live scoreboard';
    const seconds = Math.max(0,Math.round((Date.now()-when)/1000));
    if(seconds < 10) return 'Updated just now';
    if(seconds < 60) return 'Updated '+seconds+' sec ago';
    return 'Updated '+Math.floor(seconds/60)+' min ago';
  }

  function teamLogoMarkup(team,className=''){
    const abbr = esc(team?.abbr || 'TEAM');
    if(!team?.logo) return '<span class="team-logo-fallback '+esc(className)+'">'+abbr.slice(0,2)+'</span>';
    return '<span class="team-logo-shell '+esc(className)+'"><span class="team-logo-fallback-text">'+abbr.slice(0,2)+'</span><img data-team-logo src="'+esc(team.logo)+'" alt="'+abbr+' logo" loading="lazy" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'is-missing\')" /></span>';
  }

  function liveTileMarkup(game){
    const awayScore = game.state === 'pre' ? '' : '<em>'+esc(game.away?.score ?? 0)+'</em>';
    const homeScore = game.state === 'pre' ? '' : '<em>'+esc(game.home?.score ?? 0)+'</em>';
    return '<button class="score-tile '+(game.state==='in'?'hot-game':'')+'" data-live-open="'+esc(game.id)+'">'
      +'<span class="league-chip">'+esc(leagueLabel(game.league))+'</span>'
      +'<strong class="score-team-line">'+teamLogoMarkup(game.away,'score-team-logo')+'<span>'+esc(game.away?.abbr || 'AWAY')+'</span> '+awayScore+'</strong>'
      +'<strong class="score-team-line">'+teamLogoMarkup(game.home,'score-team-logo')+'<span>'+esc(game.home?.abbr || 'HOME')+'</span> '+homeScore+'</strong>'
      +'<small>'+esc(gameStatusText(game))+'</small>'
      +'</button>';
  }

  function bindLiveGeneratedActions(){
    document.querySelectorAll('[data-live-open]').forEach(btn => {
      btn.onclick = () => setRoute('live');
    });
    document.querySelectorAll('[data-live-refresh]').forEach(btn => {
      btn.onclick = () => refreshLiveData(true);
    });
    bindMediaFallbacks();
  }

  function renderGlobalScoreStrip(){
    const strip = document.querySelector('.broadcast-score-strip');
    if(!strip || !liveFeedCache) return;
    const games = sortedGames(liveFeedCache.games || []);
    const liveCount = games.filter(g => g.state === 'in').length;
    const visible = games.slice(0,6);
    const label = liveCount
      ? '<div class="score-strip-label"><span class="pulse"></span>'+liveCount+' LIVE</div>'
      : '<div class="score-strip-label"><span class="pulse is-idle"></span>TODAY</div>';
    const tiles = visible.length
      ? visible.map(liveTileMarkup).join('')
      : '<div class="score-strip-empty">No games returned for today.</div>';
    strip.innerHTML = label + tiles + '<button class="score-more" data-route-jump="live">FULL SCOREBOARD →</button>';
    strip.querySelector('[data-route-jump="live"]')?.addEventListener('click',()=>setRoute('live'));
    bindLiveGeneratedActions();
  }

  function featureGameMarkup(game,home=false){
    if(!game) return '<div class="live-feed-empty"><div><b>No games on the current slate.</b><small>The live feed is connected; there is simply nothing scheduled for this filter.</small></div></div>';
    const awayScore = game.state === 'pre' ? '—' : esc(game.away?.score ?? 0);
    const homeScore = game.state === 'pre' ? '—' : esc(game.home?.score ?? 0);
    const stateText = game.state === 'in' ? 'LIVE · '+gameShortState(game) : gameShortState(game);
    const start = gameStatusText(game);
    const venue = game.venue || 'Venue pending';
    if(home){
      return '<div class="feature-game-bg"></div>'
        +'<div class="matchup-energy matchup-energy--left"></div><div class="matchup-energy matchup-energy--right"></div>'
        +'<div class="feature-topline"><span class="feature-live '+(game.state==='in'?'':'is-upcoming')+'"><i></i>'+esc(stateText)+'</span><span>'+esc(leagueLabel(game.league))+' · LIVE SCOREBOARD</span></div>'
        +'<div class="matchup-stage">'
          +'<div class="matchup-side matchup-side--home">'+teamLogoMarkup(game.away,'feature-team-logo')+'<span class="matchup-team-code">'+esc(game.away?.abbr)+'</span><strong>'+awayScore+'</strong><small>'+esc(game.away?.name)+'</small></div>'
          +'<div class="matchup-center"><span>VS</span><b>'+esc(game.state==='in'?'LIVE NOW':'TODAY')+'</b></div>'
          +'<div class="matchup-side matchup-side--away">'+teamLogoMarkup(game.home,'feature-team-logo')+'<span class="matchup-team-code">'+esc(game.home?.abbr)+'</span><strong>'+homeScore+'</strong><small>'+esc(game.home?.name)+'</small></div>'
        +'</div>'
        +'<div class="feature-stats concept-matchup-stats">'
          +'<span><small>STATUS</small><b>'+esc(gameShortState(game))+'</b></span>'
          +'<span><small>PERIOD</small><b>'+esc(game.period || '—')+'</b></span>'
          +'<span><small>CLOCK</small><b>'+esc(game.clock || '—')+'</b></span>'
          +'<span><small>VENUE</small><b>'+esc(venue)+'</b></span>'
        +'</div>'
        +'<div class="feature-footer"><div><span>LIVE SCORE FEED</span><b>'+esc(game.away?.abbr)+' @ '+esc(game.home?.abbr)+'</b><strong>'+esc(start)+'</strong></div><button class="broadcast-cta" data-route-jump="live">OPEN LIVE CENTER →</button></div>';
    }
    return '<div class="live-gamecast-energy live-gamecast-energy--blue"></div><div class="live-gamecast-energy live-gamecast-energy--orange"></div>'
      +'<div class="live-gamecast-top"><span class="live-state-chip '+(game.state==='in'?'':'is-upcoming')+'"><i></i>'+esc(stateText)+'</span><span>'+esc(leagueLabel(game.league))+' · SCOREBOARD</span></div>'
      +'<div class="live-matchup-stage">'
        +'<div class="live-team">'+teamLogoMarkup(game.away,'live-hero-team-logo')+'<span>'+esc(game.away?.abbr)+'</span><strong>'+awayScore+'</strong><small>'+esc(game.away?.name)+'</small></div>'
        +'<div class="live-center-mark"><b>VS</b><span>'+esc(game.state==='in'?'LIVE NOW':'TODAY')+'</span></div>'
        +'<div class="live-team live-team--away">'+teamLogoMarkup(game.home,'live-hero-team-logo')+'<span>'+esc(game.home?.abbr)+'</span><strong>'+homeScore+'</strong><small>'+esc(game.home?.name)+'</small></div>'
      +'</div>'
      +'<div class="live-stat-strip">'
        +'<div><span>STATUS</span><b>'+esc(gameShortState(game))+'</b></div>'
        +'<div><span>PERIOD</span><b>'+esc(game.period || '—')+'</b></div>'
        +'<div><span>CLOCK</span><b>'+esc(game.clock || '—')+'</b></div>'
        +'<div><span>START</span><b>'+esc(start)+'</b></div>'
      +'</div>'
      +'<div class="live-gamecast-footer"><div><span>LIVE SCORE FEED</span><b>'+esc(venue)+'</b><strong>'+esc(feedUpdatedText())+'</strong></div><button class="broadcast-cta" data-live-refresh>REFRESH SCORES →</button></div>';
  }

  function renderHomeLiveData(){
    if(currentRoute !== 'home' || !liveFeedCache) return;
    const games = sortedGames(liveFeedCache.games || []);
    const feature = games.find(g => g.state === 'in') || games.find(g => g.state === 'pre') || games[0];
    const hero = document.querySelector('.feature-game.concept-matchup');
    if(hero) hero.innerHTML = featureGameMarkup(feature,true);

    const kicker = document.querySelector('.broadcast-title .broadcast-kicker');
    if(kicker){
      const d = new Date();
      kicker.textContent = new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'}).format(d).toUpperCase();
    }

    const board = document.querySelector('.concept-slate-board');
    if(board){
      const head = board.querySelector('.concept-slate-head')?.outerHTML || '';
      const rows = games.slice(0,8).map(game => {
        const awayScore = game.state === 'pre' ? '—' : esc(game.away?.score ?? 0);
        const homeScore = game.state === 'pre' ? '—' : esc(game.home?.score ?? 0);
        return '<button class="concept-slate-row '+(game.state==='in'?'concept-slate-row--live':'')+'" data-live-open="'+esc(game.id)+'">'
          +'<span class="slate-time '+(game.state==='in'?'live-state':'')+'">'+esc(gameShortState(game))+' · '+esc(leagueLabel(game.league))+'</span>'
          +'<span class="slate-matchup"><b class="slate-team">'+teamLogoMarkup(game.away,'slate-team-logo')+'<span>'+esc(game.away?.abbr)+'</span></b><i>'+awayScore+'</i><em>VS</em><i>'+homeScore+'</i><b class="slate-team">'+teamLogoMarkup(game.home,'slate-team-logo')+'<span>'+esc(game.home?.abbr)+'</span></b></span>'
          +'<span class="slate-signal"><small>LIVE SCOREBOARD</small><b>'+esc(game.venue || feedUpdatedText())+'</b></span>'
          +'<span class="slate-action">'+(game.state==='in'?'LIVE':'VIEW')+' →</span>'
          +'</button>';
      }).join('');
      board.innerHTML = head + (rows || '<div class="live-board-loading"><b>No games returned for today.</b></div>');
    }

    document.querySelectorAll('[data-route-jump="live"]').forEach(btn => btn.onclick=()=>setRoute('live'));
    bindLiveGeneratedActions();
  }

  function renderLiveCenter(){
    const root = document.querySelector('[data-live-route]');
    if(currentRoute !== 'live' || !root || !liveFeedCache) return;
    const games = currentFeedGames();
    const liveCount = games.filter(g => g.state === 'in').length;
    const upcomingCount = games.filter(g => g.state === 'pre').length;
    const feature = games.find(g => g.state === 'in') || games.find(g => g.state === 'pre') || games[0];

    const badge = root.querySelector('[data-live-feed-badge]');
    if(badge){
      badge.innerHTML = '<i></i> LIVE SCORE FEED';
      badge.classList.add('is-connected');
    }
    const meta = root.querySelector('[data-live-filter-meta]');
    if(meta) meta.innerHTML = '<span class="live-pulse '+(liveCount?'':'is-idle')+'"></span><b>'+liveCount+' LIVE</b><span>·</span><small>'+upcomingCount+' upcoming · '+esc(feedUpdatedText())+'</small>';

    const featureNode = root.querySelector('[data-live-feature]');
    if(featureNode){
      featureNode.classList.remove('live-feed-loading');
      featureNode.innerHTML = featureGameMarkup(feature,false);
    }

    const nowBoard = root.querySelector('[data-live-now-board]');
    if(nowBoard){
      const focus = games.slice(0,5);
      nowBoard.innerHTML = '<div class="live-signal-head"><div><span class="orange-kicker">LIVE NOW</span><h2>Scoreboard feed</h2></div><span>REAL DATA</span></div>'
        +(focus.length ? focus.map((game,i) => '<button class="live-signal-row" data-live-open="'+esc(game.id)+'">'
          +'<span class="signal-rank">'+String(i+1).padStart(2,'0')+'</span>'
          +'<div class="live-signal-matchup"><span class="live-signal-teams">'+teamLogoMarkup(game.away,'live-row-team-logo')+teamLogoMarkup(game.home,'live-row-team-logo')+'</span><span><b>'+esc(game.away?.abbr)+' @ '+esc(game.home?.abbr)+'</b><small>'+esc(leagueLabel(game.league))+' · '+esc(gameStatusText(game))+'</small></span></div>'
          +'<span class="signal-metric"><small>STATUS</small><b>'+esc(game.state==='in'?'LIVE':game.state==='post'?'FINAL':'NEXT')+'</b></span>'
          +'<strong class="'+(game.state==='in'?'positive':'')+'">'+esc(game.state==='pre'?gameStatusText(game):(game.away?.score ?? 0)+'-'+(game.home?.score ?? 0))+'</strong>'
        +'</button>').join('') : '<div class="live-feed-side-loading"><div><b>No games for this filter.</b><small>The feed is connected.</small></div></div>')
        +'<div class="live-signal-footer"><span>'+games.length+' games on slate</span><b>'+esc(feedUpdatedText())+'</b></div>';
    }

    const board = root.querySelector('[data-live-score-board]');
    if(board){
      board.innerHTML = games.length ? games.map(game => '<button class="live-score-row '+(game.state==='in'?'is-featured':'')+'" data-live-open="'+esc(game.id)+'">'
        +'<span class="live-score-state"><i></i>'+esc(gameShortState(game))+'</span>'
        +'<span class="live-score-matchup"><b class="live-score-team">'+teamLogoMarkup(game.away,'live-score-team-logo')+'<span>'+esc(game.away?.abbr)+'</span></b><strong>'+esc(game.state==='pre'?'—':game.away?.score ?? 0)+'</strong><em>VS</em><strong>'+esc(game.state==='pre'?'—':game.home?.score ?? 0)+'</strong><b class="live-score-team">'+teamLogoMarkup(game.home,'live-score-team-logo')+'<span>'+esc(game.home?.abbr)+'</span></b></span>'
        +'<span class="live-score-context"><small>LEAGUE</small><b>'+esc(leagueLabel(game.league))+'</b></span>'
        +'<span class="live-score-context"><small>VENUE</small><b>'+esc(game.venue || '—')+'</b></span>'
        +'<span class="live-score-action">'+(game.state==='in'?'LIVE':'DETAILS')+' →</span>'
      +'</button>').join('') : '<div class="live-board-loading"><b>No games returned for this sport today.</b></div>';
    }
    const title = root.querySelector('[data-live-board-title]');
    if(title) title.textContent = currentLeague === 'all' ? 'Today’s games' : leagueLabel(currentLeague)+' games today';
    bindLiveGeneratedActions();
  }

  function renderLiveFeed(){
    if(!liveFeedCache) return;
    renderGlobalScoreStrip();
    renderHomeLiveData();
    renderLiveCenter();
    const status = document.querySelector('.market-status');
    if(status) status.innerHTML = '<span class="status-dot"></span> LIVE SCORES CONNECTED';
  }

  async function refreshLiveData(force=false){
    if(liveFeedInFlight) return liveFeedInFlight;
    if(!force && liveFeedCache && Date.now()-liveFeedFetchedAt < LIVE_FEED_TTL){
      renderLiveFeed();
      return liveFeedCache;
    }
    liveFeedInFlight = fetch('/api/live?league=all&date='+localDateKey(),{cache:'no-store'})
      .then(async response => {
        if(!response.ok) throw new Error('Live feed HTTP '+response.status);
        const payload = await response.json();
        if(!payload || !Array.isArray(payload.games)) throw new Error('Invalid live feed');
        liveFeedCache = payload;
        liveFeedFetchedAt = Date.now();
        renderLiveFeed();
        return payload;
      })
      .catch(error => {
        console.error('TSO live feed:',error);
        const badge = document.querySelector('[data-live-feed-badge]');
        if(badge){ badge.textContent='SCORE FEED UNAVAILABLE'; badge.classList.add('is-error'); }
        const meta = document.querySelector('[data-live-filter-meta]');
        if(meta) meta.innerHTML='<span class="live-pulse is-idle"></span><b>FEED OFFLINE</b><span>·</span><small>Retrying automatically</small>';
        return null;
      })
      .finally(()=>{ liveFeedInFlight=null; });
    return liveFeedInFlight;
  }

  const americanPrice = value => {
    const n=Number(value);
    if(!Number.isFinite(n)) return '—';
    return n>0 ? '+'+Math.round(n) : String(Math.round(n));
  };

  const pct1 = value => Number.isFinite(Number(value)) ? Number(value).toFixed(1)+'%' : '—';

  const ageText = value => {
    const t=Date.parse(value||'');
    if(!Number.isFinite(t)) return 'Unknown';
    const sec=Math.max(0,Math.round((Date.now()-t)/1000));
    if(sec<60) return sec+' sec';
    const min=Math.floor(sec/60);
    if(min<60) return min+' min';
    const hr=Math.floor(min/60);
    if(hr<24) return hr+'h '+(min%60)+'m';
    return Math.floor(hr/24)+'d '+(hr%24)+'h';
  };

  const freshnessLabel = value => {
    const t=Date.parse(value||'');
    if(!Number.isFinite(t)) return {label:'UNKNOWN AGE',tone:'stale'};
    const min=Math.max(0,(Date.now()-t)/60000);
    if(min<=5) return {label:'LIVE SNAPSHOT',tone:'live'};
    if(min<=30) return {label:'RECENT SNAPSHOT',tone:'recent'};
    return {label:'VERIFIED SNAPSHOT',tone:'stale'};
  };

  const playerInitials = name => String(name||'Player').split(/\s+/).filter(Boolean).map(p=>p[0]).join('').slice(0,2).toUpperCase();

  function propHeadshotMarkup(row,className=''){
    const sport=esc(row?.sport||'generic');
    const name=esc(row?.player||'Player');
    const initials=esc(playerInitials(row?.player));
    if(!row?.headshotUrl){
      return '<span class="player-headshot player-sport--'+sport+' props-feed-headshot '+esc(className)+'"><span class="player-headshot-fallback">'+initials+'</span></span>';
    }
    return '<span class="player-headshot player-sport--'+sport+' props-feed-headshot '+esc(className)+'"><span class="player-headshot-fallback">'+initials+'</span><img data-player-headshot src="'+esc(row.headshotUrl)+'" alt="'+name+'" loading="lazy" /></span>';
  }

  function propSelectionText(row){
    if(row?.selection) return row.selection;
    const market=String(row?.market||'').toLowerCase();
    if(['atd','atg','fgs','hr'].includes(market) && row.side !== 'under') return 'YES';
    const line=Number(row?.line);
    const side=row?.side==='under'?'U':'O';
    return Number.isFinite(line) ? side+' '+line : side;
  }

  function currentPropsRows(){
    const root=document.querySelector('[data-props-route]');
    if(!root || !propsFeedCache) return [];
    const search=String(root.querySelector('[data-props-search]')?.value||'').trim().toLowerCase();
    const market=String(root.querySelector('[data-props-market-filter]')?.value||'');
    const book=String(root.querySelector('[data-props-book-filter]')?.value||'').toLowerCase();
    return (propsFeedCache.rows||[]).filter(row => {
      if(currentLeague!=='all' && row.sport!==currentLeague) return false;
      if(market && row.market!==market) return false;
      if(book){
        const hasBook=(row.books||[{book:row.book}]).some(b=>String(b?.book||'').toLowerCase()===book);
        if(!hasBook) return false;
      }
      if(!search) return true;
      return [row.player,row.team,row.market,row.marketLabel,row.homeTeam,row.awayTeam,row.book,propSelectionText(row)]
        .filter(Boolean).join(' ').toLowerCase().includes(search);
    });
  }

  const edgeText = value => {
    const n=Number(value);
    if(!Number.isFinite(n)) return '—';
    return (n>0?'+':'')+n.toFixed(1)+'%';
  };

  const modelTagText = row => row?.model?.tag || row?.model?.grade || row?.model?.label || 'MODEL';

  const modelTagClass = row => {
    const tag=String(modelTagText(row)).toLowerCase();
    if(/a\+|tso pick|safest|best edge|strong/.test(tag)) return 'is-strong';
    if(/a|b\+|value|model|sim/.test(tag)) return 'is-model';
    return 'is-neutral';
  };

  function sortPropsRows(rows){
    return [...rows].sort((a,b)=>{
      const ae=Number(a?.model?.edgePct),be=Number(b?.model?.edgePct);
      const ah=Number.isFinite(ae),bh=Number.isFinite(be);
      if(ah!==bh) return bh-ah;
      if(ah&&be!==ae) return be-ae;
      const ac=Number(a.bookCount||0),bc=Number(b.bookCount||0);
      if(ac!==bc) return bc-ac;
      return (Date.parse(b.snapshotTime||'')||0)-(Date.parse(a.snapshotTime||'')||0);
    });
  }

  function propsNewestTimestamp(rows){
    let newest=0,iso=null;
    for(const row of rows){
      const t=Date.parse(row.snapshotTime||'');
      if(Number.isFinite(t)&&t>newest){newest=t;iso=row.snapshotTime}
    }
    return iso;
  }

  function allModeledRows(){
    return (propsFeedCache?.rows||[]).filter(row=>Number.isFinite(Number(row?.model?.probabilityPct)));
  }

  function currentModelRows(){
    return allModeledRows().filter(row=>currentLeague==='all'||row.sport===currentLeague);
  }

  const modelSourceText = row => row?.model?.sourceLabel || row?.model?.source || 'TSO MODEL';

  function homeModeledRows(){
    return allModeledRows().filter(row=>currentLeague==='all'||row.sport===currentLeague);
  }

  function homeModelTone(row,index=0){
    if(row?.sport==='nhl') return 'violet';
    if(row?.sport==='nfl') return 'gold';
    if(row?.sport==='mlb') return 'orange';
    return ['violet','gold','orange'][index%3];
  }

  function homeModelCardMarkup(row,index){
    const model=row.model||{};
    const edge=Number(model.edgePct);
    const tone=homeModelTone(row,index);
    const source=modelSourceText(row);
    const tag=modelTagText(row);
    return '<article class="broadcast-model-card concept-model-card '+tone+'-card">'
      +'<div class="concept-card-accent"></div>'
      +'<div class="broadcast-card-top"><span>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+' · '+esc(propSelectionText(row))+'</span><b>'+esc(tag)+'</b></div>'
      +'<div class="concept-model-main"><div class="broadcast-player">'
        +propHeadshotMarkup(row,'player-number home-model-headshot')
        +'<div><h3>'+esc(row.player)+'</h3><small>'+esc(row.team||'PLAYER')+' · '+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+'</small></div>'
      +'</div><div class="model-badge model-badge--'+tone+'"><small>MODEL</small><strong>'+pct1(model.probabilityPct)+'</strong></div></div>'
      +'<div class="broadcast-edge concept-metrics"><span><small>MARKET</small><b>'+pct1(row.impliedPct)+'</b></span><span><small>EDGE</small><b class="'+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</b></span><span><small>ODDS</small><b>'+esc(americanPrice(row.price))+'</b></span></div>'
      +'<div class="concept-confidence home-model-meta"><span>MODEL SOURCE · '+esc(source)+'</span><b>'+esc(row.book||'VERIFIED')+'</b></div>'
      +'<div class="broadcast-price concept-price"><button data-home-open-model>OPEN MODEL →</button></div>'
      +'</article>';
  }

  function renderHomeModels(){
    if(currentRoute!=='home'||!propsFeedCache) return;
    const rows=homeModeledRows();
    const sorted=sortPropsRows(rows);
    const picks=sorted.slice(0,3);
    const newest=propsNewestTimestamp(rows.length?rows:allModeledRows());
    const freshness=freshnessLabel(newest);
    const picksRoot=document.querySelector('[data-home-picks]');
    if(picksRoot){
      if(!rows.length){
        const nba=currentLeague==='nba';
        picksRoot.innerHTML='<div class="concept-picks-head"><div><span class="gold-kicker">♛ TOP OUTPOST PICKS · '+(nba?'MARKET ONLY':'REAL MODELS')+'</span><h2>'+(nba?'NBA model not available yet':'No exact model matches right now')+'</h2></div><button data-route-jump="'+(nba?'props':'models')+'">'+(nba?'OPEN PROPS':'ALL MODELS')+' →</button></div>'
          +'<div class="home-model-empty"><b>'+(nba?'TSO will not invent an NBA model.':'No sportsbook row currently passes the exact model-match rules for this filter.')+'</b><small>'+(nba?'Verified NBA market prices remain available on Props until a real TSO NBA model exists.':'Same player + market + side + exact line is required.')+'</small></div>';
      }else{
        picksRoot.innerHTML='<div class="concept-picks-head"><div><span class="gold-kicker">♛ TOP OUTPOST PICKS · REAL MODELS</span><h2>Best exact edges right now</h2></div><button data-route-jump="models">ALL PICKS →</button></div>'
          +picks.map((row,i)=>{
            const edge=Number(row.model?.edgePct);
            const rankClass=i===0?'pick-rank--gold':i===2?'pick-rank--orange':'';
            return '<button class="concept-pick-row" data-home-open-model>'
              +'<span class="pick-rank '+rankClass+'">'+(i+1)+'</span>'
              +'<span class="pick-name pick-name--with-photo">'+propHeadshotMarkup(row,'home-pick-headshot')+'<span><b>'+esc(row.player)+'</b><small>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+' · '+esc(propSelectionText(row))+'</small></span></span>'
              +'<span class="pick-model"><small>MODEL</small><b>'+pct1(row.model?.probabilityPct)+'</b></span>'
              +'<span class="pick-edge '+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</span>'
              +'</button>';
          }).join('')
          +'<div class="concept-picks-footer"><span>'+rows.length+' exact model match'+(rows.length===1?'':'es')+'</span><b>'+esc(freshness.label)+(newest?' · '+esc(ageText(newest))+' old':'')+'</b></div>';
      }
    }

    const board=document.querySelector('[data-home-model-board]');
    const cards=board?.querySelector('[data-home-model-cards]');
    const title=board?.querySelector('[data-home-model-title]');
    if(cards){
      if(!rows.length){
        cards.innerHTML='<div class="home-model-empty home-model-empty--wide"><b>'+(currentLeague==='nba'?'NBA remains MARKET ONLY.':'No exact model cards for this filter.')+'</b><small>'+(currentLeague==='nba'?'TSO shows no probability or edge until a real NBA model exists.':'No fake fallback cards are displayed.')+'</small></div>';
        if(title) title.textContent=currentLeague==='nba'?'NBA · market prices only':'No exact model matches';
      }else{
        let selected=[];
        if(currentLeague==='all'){
          for(const sport of ['nhl','nfl','mlb']){
            const top=sortPropsRows(rows.filter(row=>row.sport===sport))[0];
            if(top) selected.push(top);
          }
          if(selected.length<3){
            for(const row of sorted){
              if(selected.includes(row)) continue;
              selected.push(row);
              if(selected.length===3) break;
            }
          }
        }else{
          selected=sorted.slice(0,3);
        }
        cards.innerHTML=selected.map(homeModelCardMarkup).join('');
        if(title) title.textContent=currentLeague==='all'?'Top exact match from each live TSO engine':leagueLabel(currentLeague)+' · top exact model matches';
      }
    }

    document.querySelectorAll('[data-home-open-model]').forEach(btn=>btn.onclick=()=>setRoute('models'));
    document.querySelectorAll('[data-route-jump]').forEach(btn=>{
      if(btn.dataset.routeJump) btn.onclick=()=>setRoute(btn.dataset.routeJump);
    });
    bindMediaFallbacks();
  }

  function renderModelsSportSummary(root){
    const node=root.querySelector('[data-models-sport-summary]');
    if(!node) return;
    const modeled=allModeledRows();
    const counts={nhl:0,nfl:0,mlb:0,nba:0};
    modeled.forEach(row=>{ if(Object.prototype.hasOwnProperty.call(counts,row.sport)) counts[row.sport]++; });
    const meta={
      nhl:{mark:'◎',tone:'violet',title:'NHL',copy:'First Goal · Anytime Goal'},
      nfl:{mark:'◫',tone:'blue',title:'NFL',copy:'Monte Carlo · exact-line pregame'},
      mlb:{mark:'⌁',tone:'gold',title:'MLB',copy:'Daily 10,000-run hitter model'},
      nba:{mark:'✦',tone:'orange',title:'NBA',copy:'No TSO model yet · market only'}
    };
    node.innerHTML=['nhl','nfl','mlb','nba'].map(sport=>{
      const item=meta[sport];
      const active=currentLeague===sport;
      const count=sport==='nba'?(counts.nba?counts.nba+' MATCH'+(counts.nba===1?'':'ES'):'MARKET ONLY'):counts[sport]+' MATCH'+(counts[sport]===1?'':'ES');
      return '<button class="models-engine-tab '+(active?'is-active':'')+'" data-models-league="'+sport+'">'
        +'<span class="models-engine-mark models-engine-mark--'+item.tone+'">'+item.mark+'</span>'
        +'<div><b>'+item.title+'</b><small>'+item.copy+'</small></div><i>'+count+'</i></button>';
    }).join('');
    node.querySelectorAll('[data-models-league]').forEach(btn=>btn.addEventListener('click',()=>setLeague(btn.dataset.modelsLeague)));
    root.querySelectorAll('[data-model-count]').forEach(el=>{
      const sport=el.dataset.modelCount;
      el.textContent=sport==='nba'?(counts.nba?String(counts.nba):'0 BY DESIGN'):String(counts[sport]||0);
    });
  }

  function renderModelsFeature(root,rows){
    const node=root.querySelector('[data-models-feature]');
    if(!node) return;
    node.classList.remove('live-feed-loading');
    if(!rows.length){
      const nba=currentLeague==='nba';
      node.innerHTML='<div class="live-feed-empty"><div><b>'+(nba?'NBA is market-only by design.':'No exact model matches for this filter.')+'</b><small>'+(nba?'TSO will not display a model probability or edge until a real NBA model exists.':'The verified odds feed is available, but no row currently passes the strict player + market + side + exact-line model match.')+'</small></div></div>';
      return;
    }
    const row=sortPropsRows(rows)[0];
    const model=row.model||{};
    const edge=Number(model.edgePct);
    const source=modelSourceText(row);
    const phase=String(model.phase||'').trim();
    const selection=propSelectionText(row);
    const tag=modelTagText(row);
    const updated=row.snapshotTime?ageText(row.snapshotTime)+' old':'timestamp unavailable';
    const ringValue=Math.max(0,Math.min(100,Number(model.probabilityPct)||0));
    node.innerHTML=
      '<div class="model-spotlight-glow"></div>'
      +'<div class="model-spotlight-top"><span>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+' · '+esc(selection)+'</span><b>'+esc(tag)+'</b></div>'
      +'<div class="model-spotlight-main"><div class="model-spotlight-player">'
        +propHeadshotMarkup(row,'model-player-number model-player-headshot')
        +'<div><small>'+esc(row.team||'PLAYER')+' · '+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+'</small><h2>'+esc(row.player)+'</h2><p>'+esc(row.marketLabel||row.market)+' · <strong>'+esc(selection)+'</strong></p></div>'
      +'</div><div class="model-probability-ring" style="background:conic-gradient(#7b5cff 0 '+ringValue+'%,rgba(255,255,255,.08) '+ringValue+'% 100%)"><div><small>MODEL</small><strong>'+pct1(model.probabilityPct)+'</strong><span>probability</span></div></div></div>'
      +'<div class="model-score-line"><div><span>MARKET</span><b>'+pct1(row.impliedPct)+'</b></div><div><span>EDGE</span><b class="'+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</b></div><div><span>EXACT LINE</span><b>'+esc(selection)+'</b></div><div><span>BEST PRICE</span><b>'+esc(americanPrice(row.price))+' <small>'+esc(row.book||'—')+'</small></b></div></div>'
      +'<div class="model-driver-grid"><div><span>MODEL SOURCE</span><b>'+esc(source)+'</b><small>Real TSO output</small></div><div><span>PHASE</span><b>'+esc(phase?phase.toUpperCase():'MODEL OUTPUT')+'</b><small>'+(row.sport==='nfl'?'Pregame price comparison enforced':'Exact-selection match')+'</small></div><div><span>SPORTSBOOK</span><b>'+esc(row.book||'—')+'</b><small>'+esc(row.bookCount||1)+' verified book'+((row.bookCount||1)===1?'':'s')+'</small></div><div><span>UPDATED</span><b>'+esc(updated)+'</b><small>Snapshot timestamp preserved</small></div></div>'
      +'<div class="model-spotlight-footer"><div><span>OUTPOST READ</span><b>Exact model-to-market match.</b><small>Same player, market, side and threshold. No nearby-line substitution.</small></div>'
      +(row.link?'<a class="broadcast-cta props-book-link" href="'+esc(row.link)+'" target="_blank" rel="noopener">OPEN SPORTSBOOK →</a>':'<span class="props-link-unavailable">NATIVE LINK NOT SUPPLIED</span>')+'</div>';
  }

  function renderModelsEdgeBoard(root,rows){
    const node=root.querySelector('[data-models-edge-board]');
    if(!node) return;
    const ranked=sortPropsRows(rows).slice(0,8);
    node.innerHTML='<div class="model-edge-head"><div><span class="violet-kicker">EDGE BOARD</span><h2>Best model gaps right now</h2></div><span>REAL DATA</span></div>'
      +(ranked.length?ranked.map((row,i)=>{
        const edge=Number(row.model?.edgePct);
        return '<button class="model-edge-row '+(i===0?'is-featured':'')+'"><span class="model-edge-rank">'+String(i+1).padStart(2,'0')+'</span><div><b>'+esc(row.player)+'</b><small>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+' · '+esc(propSelectionText(row))+'</small></div><span><small>MODEL</small><b>'+pct1(row.model?.probabilityPct)+'</b></span><strong class="'+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</strong></button>';
      }).join(''):'<div class="live-feed-side-loading"><div><b>No model matches for this filter.</b><small>Only exact TSO model-to-market matches appear here.</small></div></div>')
      +'<div class="model-edge-footer"><span>'+ranked.length+' ranked · '+rows.length+' exact model matches</span><button data-route-jump="props">OPEN PROPS →</button></div>';
    node.querySelector('[data-route-jump="props"]')?.addEventListener('click',()=>setRoute('props'));
  }

  function renderModelsBoard(root,rows){
    const board=root.querySelector('[data-models-board]');
    if(!board) return;
    const visible=sortPropsRows(rows).slice(0,160);
    if(!visible.length){
      board.innerHTML='<div class="live-board-loading props-empty-board"><b>'+(currentLeague==='nba'?'NBA has verified market prices but no TSO model by design.':'No exact model matches for this filter.')+'</b></div>';
      return;
    }
    board.innerHTML=visible.map(row=>{
      const model=row.model||{};
      const edge=Number(model.edgePct);
      return '<div class="props-board-row props-board-row-live has-model">'
        +'<span class="props-board-player props-board-player-live">'+propHeadshotMarkup(row,'props-board-headshot')+'<span><b>'+esc(row.player)+'</b><small>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+' · '+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+'</small></span></span>'
        +'<strong>'+esc(propSelectionText(row))+'</strong>'
        +'<strong class="props-model-prob">'+pct1(model.probabilityPct)+'</strong>'
        +'<strong>'+pct1(row.impliedPct)+'</strong>'
        +'<strong class="props-edge-value '+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</strong>'
        +'<span class="props-model-tag '+modelTagClass(row)+'">'+esc(modelTagText(row))+'</span>'
        +'<span class="props-price"><b>'+esc(americanPrice(row.price))+'</b><small>'+esc(row.bookCount||1)+' book'+((row.bookCount||1)===1?'':'s')+'</small></span>'
        +'<strong class="props-book-name">'+esc(row.book||'—')+'</strong>'
        +'<span class="props-snapshot-age">'+esc(ageText(row.snapshotTime))+'</span>'
        +(row.link?'<a class="props-native-link" href="'+esc(row.link)+'" target="_blank" rel="noopener">OPEN →</a>':'<span class="props-no-link">NO LINK</span>')
      +'</div>';
    }).join('');
    bindMediaFallbacks();
  }

  function renderModelsFeed(){
    const root=document.querySelector('[data-models-route]');
    if(currentRoute!=='models'||!root||!propsFeedCache) return;
    const rows=currentModelRows();
    const all=allModeledRows();
    const newest=propsNewestTimestamp(rows.length?rows:all);
    const freshness=freshnessLabel(newest);
    const sports=new Set(all.map(row=>row.sport).filter(Boolean));
    const sources=new Set(all.map(modelSourceText).filter(Boolean));
    const top=sortPropsRows(rows)[0]||null;

    const badge=root.querySelector('[data-models-feed-badge]');
    if(badge){
      if(currentLeague==='nba' && !rows.length){
        badge.className='props-feed-badge is-recent';
        badge.innerHTML='<i></i> NBA · MARKET ONLY';
      }else{
        badge.className='props-feed-badge is-'+freshness.tone;
        badge.innerHTML='<i></i> REAL MODEL FEED · '+esc(freshness.label);
      }
    }

    const status=root.querySelector('[data-models-status]');
    if(status){
      status.innerHTML='<div><span class="model-live-dot"></span><b>REAL TSO MODEL FEED</b><small>Exact model matches only</small></div><span class="models-status-divider"></span><div><b>'+rows.length+'</b><small>model matches</small></div><span class="models-status-divider"></span><div><b>'+sports.size+'</b><small>modeled sports</small></div><span class="models-status-divider"></span><div><b>'+sources.size+'</b><small>model sources</small></div><span class="models-status-divider"></span><div><b>'+esc(newest?ageText(newest):'—')+'</b><small>source freshness</small></div>';
    }

    const title=root.querySelector('[data-models-board-title]');
    if(title) title.textContent=(currentLeague==='all'?'All sports':leagueLabel(currentLeague))+' · '+rows.length+' exact model match'+(rows.length===1?'':'es');

    const pulseCount=root.querySelector('[data-models-pulse-count]');
    if(pulseCount) pulseCount.textContent=String(rows.length);
    const pulseEdge=root.querySelector('[data-models-pulse-edge]');
    if(pulseEdge) pulseEdge.textContent=top?edgeText(top.model?.edgePct):'—';
    const pulseAge=root.querySelector('[data-models-pulse-age]');
    if(pulseAge) pulseAge.textContent=newest?'Verified snapshot '+ageText(newest)+' old':'No modeled snapshot for this filter';

    renderModelsSportSummary(root);
    renderModelsFeature(root,rows);
    renderModelsEdgeBoard(root,rows);
    renderModelsBoard(root,rows);
  }

  function renderPropsFeature(root,rows){
    const node=root.querySelector('[data-props-feature]');
    if(!node) return;
    if(!rows.length){
      node.classList.remove('live-feed-loading');
      node.innerHTML='<div class="live-feed-empty"><div><b>No verified sportsbook rows for this filter.</b><small>The source may be empty, between refresh windows, or have no current player props.</small></div></div>';
      return;
    }
    const row=sortPropsRows(rows)[0];
    const model=row.model||null;
    const hasModel=Number.isFinite(Number(model?.probabilityPct));
    const ringValue=Math.max(0,Math.min(100,hasModel?Number(model.probabilityPct):Number(row.impliedPct)||0));
    const books=Array.isArray(row.books)?row.books.slice(0,4):[];
    const tag=hasModel?modelTagText(row):'MARKET ONLY';
    const edge=hasModel?Number(model.edgePct):null;
    node.classList.remove('live-feed-loading');
    node.innerHTML=
      '<div class="prop-spotlight-glow"></div>'
      +'<div class="prop-spotlight-top"><span>FEATURED PROP · '+esc(leagueLabel(row.sport))+' '+esc(row.marketLabel||row.market)+'</span><b>'+(hasModel?'EXACT MODEL MATCH':'VERIFIED PRICE')+'</b></div>'
      +'<div class="prop-spotlight-main"><div class="prop-spotlight-player">'
        +propHeadshotMarkup(row,'prop-player-number prop-player-headshot')
        +'<div><small>'+esc(row.team||'PLAYER')+' · '+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+'</small><h2>'+esc(row.player)+'</h2><p>'+esc(row.marketLabel||row.market)+' · <strong>'+esc(propSelectionText(row))+'</strong></p></div>'
      +'</div><div class="prop-edge-ring '+(hasModel?'has-model':'')+'" style="background:conic-gradient(var(--prop-gold) 0 '+ringValue+'%,rgba(255,255,255,.08) '+ringValue+'% 100%)"><div><small>'+(hasModel?'MODEL':'IMPLIED')+'</small><strong>'+pct1(hasModel?model.probabilityPct:row.impliedPct)+'</strong><span>'+(hasModel?'probability':'best price')+'</span></div></div></div>'
      +(hasModel
        ?'<div class="prop-score-line"><div><span>MODEL</span><b>'+pct1(model.probabilityPct)+'</b></div><div><span>MARKET</span><b>'+pct1(row.impliedPct)+'</b></div><div><span>EDGE</span><b class="'+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</b></div><div><span>MODEL TAG</span><b>'+esc(tag)+'</b></div></div>'
        :'<div class="prop-score-line"><div><span>EXACT</span><b>'+esc(propSelectionText(row))+'</b></div><div><span>BEST PRICE</span><b>'+esc(americanPrice(row.price))+'</b></div><div><span>BOOKS</span><b>'+esc(row.bookCount||books.length||1)+'</b></div><div><span>MODEL</span><b>MARKET ONLY</b></div></div>')
      +'<div class="prop-best-price"><div><span>BEST VERIFIED PRICE</span><strong>'+esc(americanPrice(row.price))+'</strong><small>'+esc(row.book||'Sportsbook')+' · '+esc(propSelectionText(row))+'</small></div><div class="prop-line-lock"><i>✓</i><span><b>EXACT LINE LOCKED</b><small>No nearby-line substitution</small></span></div></div>'
      +(books.length?'<div class="prop-book-strip">'+books.map((book,i)=>'<div class="'+(i===0?'is-best':'')+'"><span>'+esc(book.book)+'</span><b>'+esc(americanPrice(book.price))+'</b><small>'+(i===0?'BEST':esc(propSelectionText(row)))+'</small></div>').join('')+'</div>':'')
      +'<div class="prop-spotlight-footer"><div><span>'+(hasModel?'MODEL SOURCE':'SNAPSHOT INTEGRITY')+'</span><b>'+esc(hasModel?(model.sourceLabel||model.source||'TSO model'):(row.priceKind||'verified-snapshot'))+'</b><small>'+esc(hasModel?((model.phase?String(model.phase).toUpperCase()+' · ':'')+(model.generatedAt?'model '+ageText(model.generatedAt)+' old':'exact model match')):(row.preserved?'Preserved verified pregame price':'Current verified snapshot row'))+'</small></div>'
      +(row.link?'<a class="broadcast-cta props-book-link" href="'+esc(row.link)+'" target="_blank" rel="noopener">OPEN SPORTSBOOK →</a>':'<span class="props-link-unavailable">NATIVE LINK NOT SUPPLIED</span>')+'</div>';
  }

  function renderPropsBooks(root,rows){
    const node=root.querySelector('[data-props-books]');
    if(!node) return;
    const counts=new Map();
    for(const row of rows){
      for(const book of row.books||[{book:row.book}]){
        if(!book?.book) continue;
        counts.set(book.book,(counts.get(book.book)||0)+1);
      }
    }
    const ranked=[...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);
    const newest=propsNewestTimestamp(rows);
    node.innerHTML='<div class="props-movers-head"><div><span class="orange-kicker">SPORTSBOOK COVERAGE</span><h2>Exact-line books</h2></div><span>REAL DATA</span></div>'
      +(ranked.length?ranked.map(([book,count],i)=>'<div class="props-mover-row props-book-coverage-row"><span class="signal-rank">'+String(i+1).padStart(2,'0')+'</span><div><b>'+esc(book)+'</b><small>exact selections currently represented</small></div><span><small>ROWS</small><b>'+count+'</b></span><strong>'+Math.round((count/Math.max(1,rows.length))*100)+'%</strong></div>').join(''):'<div class="live-feed-side-loading"><div><b>No book coverage for this filter.</b><small>The source returned no exact selections.</small></div></div>')
      +'<div class="props-movers-footer"><span>'+rows.length+' exact selections</span><b>'+esc(newest?ageText(newest)+' old':'No timestamp')+'</b></div>';
  }

  function renderPropsBoard(root,rows){
    const board=root.querySelector('[data-props-board]');
    if(!board) return;
    const visible=sortPropsRows(rows).slice(0,160);
    if(!visible.length){
      board.innerHTML='<div class="live-board-loading props-empty-board"><b>No verified sportsbook selections for '+esc(currentLeague==='all'?'this filter':leagueLabel(currentLeague))+'.</b></div>';
      return;
    }
    board.innerHTML=visible.map(row => {
      const model=row.model||null;
      const hasModel=Number.isFinite(Number(model?.probabilityPct));
      const edge=hasModel?Number(model.edgePct):null;
      return '<div class="props-board-row props-board-row-live '+(hasModel?'has-model':'is-market-only')+'">'
        +'<span class="props-board-player props-board-player-live">'+propHeadshotMarkup(row,'props-board-headshot')+'<span><b>'+esc(row.player)+'</b><small>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+' · '+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+'</small></span></span>'
        +'<strong>'+esc(propSelectionText(row))+'</strong>'
        +'<strong class="'+(hasModel?'props-model-prob':'props-model-empty')+'">'+(hasModel?pct1(model.probabilityPct):'—')+'</strong>'
        +'<strong>'+esc(pct1(row.impliedPct))+'</strong>'
        +'<strong class="props-edge-value '+(hasModel?(edge>=0?'positive':'negative'):'')+'">'+(hasModel?edgeText(edge):'—')+'</strong>'
        +'<span class="props-model-tag '+(hasModel?modelTagClass(row):'is-market-only')+'">'+esc(hasModel?modelTagText(row):'MARKET ONLY')+'</span>'
        +'<span class="props-price"><b>'+esc(americanPrice(row.price))+'</b><small>'+esc(row.bookCount||1)+' book'+((row.bookCount||1)===1?'':'s')+'</small></span>'
        +'<strong class="props-book-name">'+esc(row.book||'—')+'</strong>'
        +'<span class="props-snapshot-age">'+esc(ageText(row.snapshotTime))+'</span>'
        +(row.link?'<a class="props-native-link" href="'+esc(row.link)+'" target="_blank" rel="noopener">OPEN →</a>':'<span class="props-no-link">NO LINK</span>')
      +'</div>';
    }).join('');
    bindMediaFallbacks();
  }

  function syncPropsFilterOptions(root){
    const leagueRows=(propsFeedCache?.rows||[]).filter(row=>currentLeague==='all'||row.sport===currentLeague);
    const marketSelect=root.querySelector('[data-props-market-filter]');
    const bookSelect=root.querySelector('[data-props-book-filter]');
    if(marketSelect){
      const previous=marketSelect.value;
      const markets=[...new Map(leagueRows.map(r=>[r.market,r.marketLabel||r.market])).entries()].sort((a,b)=>String(a[1]).localeCompare(String(b[1])));
      marketSelect.innerHTML='<option value="">MARKET: ALL</option>'+markets.map(([value,label])=>'<option value="'+esc(value)+'">'+esc(String(label).toUpperCase())+'</option>').join('');
      if(markets.some(([value])=>value===previous)) marketSelect.value=previous;
    }
    if(bookSelect){
      const previous=bookSelect.value.toLowerCase();
      const books=[...new Set(leagueRows.flatMap(row=>(row.books||[{book:row.book}]).map(b=>String(b?.book||'')).filter(Boolean)))].sort((a,b)=>a.localeCompare(b));
      bookSelect.innerHTML='<option value="">BOOK: ALL</option>'+books.map(book=>'<option value="'+esc(book.toLowerCase())+'">'+esc(book.toUpperCase())+'</option>').join('');
      if(books.some(book=>book.toLowerCase()===previous)) bookSelect.value=previous;
    }
  }

  function renderPropsFeed(){
    const root=document.querySelector('[data-props-route]');
    if(currentRoute!=='props' || !root || !propsFeedCache) return;
    syncPropsFilterOptions(root);
    const rows=currentPropsRows();
    const newest=propsNewestTimestamp(rows);
    const freshness=freshnessLabel(newest);
    const books=new Set();
    rows.forEach(row=>(row.books||[{book:row.book}]).forEach(b=>{if(b?.book)books.add(b.book)}));
    const preserved=rows.filter(row=>row.preserved).length;

    const badge=root.querySelector('[data-props-feed-badge]');
    if(badge){
      badge.className='props-feed-badge is-'+freshness.tone;
      badge.innerHTML='<i></i> '+esc(freshness.label);
    }
    const modelMatched=rows.filter(row=>Number.isFinite(Number(row?.model?.probabilityPct))).length;
    const status=root.querySelector('[data-props-status]');
    if(status){
      status.innerHTML='<div><span class="props-live-dot"></span><b>VERIFIED SPORTSBOOK + MODEL DATA</b></div><span class="props-status-divider"></span><div><b>'+rows.length+'</b><small>exact selections</small></div><span class="props-status-divider"></span><div><b>'+modelMatched+'</b><small>model matched</small></div><span class="props-status-divider"></span><div><b>'+books.size+'</b><small>sportsbooks</small></div><span class="props-status-divider"></span><div><b>'+esc(newest?ageText(newest):'—')+'</b><small>source freshness</small></div>';
    }
    const title=root.querySelector('[data-props-board-title]');
    if(title) title.textContent=(currentLeague==='all'?'All sports':leagueLabel(currentLeague))+' · '+rows.length+' verified · '+modelMatched+' exact model matches';
    const modelTitle=root.querySelector('[data-props-model-title]');
    if(modelTitle) modelTitle.textContent=modelMatched+' exact model match'+(modelMatched===1?'':'es');
    const modelCoverage=root.querySelector('[data-props-model-coverage]');
    if(modelCoverage) modelCoverage.textContent=rows.length?Math.round(modelMatched/rows.length*100)+'% OF FILTER':'0%';
    const freshTitle=root.querySelector('[data-props-freshness-title]');
    if(freshTitle) freshTitle.textContent=freshness.label;
    const freshCopy=root.querySelector('[data-props-freshness-copy]');
    if(freshCopy) freshCopy.textContent=newest?'Newest exact-selection snapshot is '+ageText(newest)+' old. TSO keeps the timestamp visible instead of relabeling an older quote as live.':'No verified timestamp is available for this filter.';
    const preservedNode=root.querySelector('[data-props-preserved]');
    if(preservedNode) preservedNode.textContent=String(preserved);

    renderPropsFeature(root,rows);
    renderPropsBooks(root,rows);
    renderPropsBoard(root,rows);
  }

  async function refreshPropsData(force=false){
    if(propsFeedInFlight) return propsFeedInFlight;
    if(!force && propsFeedCache && Date.now()-propsFeedFetchedAt < PROPS_FEED_TTL){
      renderPropsFeed();
      renderModelsFeed();
      renderHomeModels();
      return propsFeedCache;
    }
    propsFeedInFlight=fetch('/api/props?league=all',{cache:'no-store'})
      .then(async response=>{
        if(!response.ok) throw new Error('Props feed HTTP '+response.status);
        const payload=await response.json();
        if(!payload || !Array.isArray(payload.rows)) throw new Error('Invalid props feed');
        propsFeedCache=payload;
        propsFeedFetchedAt=Date.now();
        renderPropsFeed();
        renderModelsFeed();
        renderHomeModels();
        return payload;
      })
      .catch(error=>{
        console.error('TSO props feed:',error);
        const root=document.querySelector('[data-props-route]');
        const badge=root?.querySelector('[data-props-feed-badge]');
        if(badge){badge.className='props-feed-badge is-error';badge.innerHTML='<i></i> ODDS FEED UNAVAILABLE';}
        const board=root?.querySelector('[data-props-board]');
        if(board) board.innerHTML='<div class="live-board-loading props-empty-board"><b>Verified sportsbook feed unavailable. Retrying automatically.</b></div>';
        const modelsRoot=document.querySelector('[data-models-route]');
        const modelsBadge=modelsRoot?.querySelector('[data-models-feed-badge]');
        if(modelsBadge){modelsBadge.className='props-feed-badge is-error';modelsBadge.innerHTML='<i></i> MODEL FEED UNAVAILABLE';}
        const modelsBoard=modelsRoot?.querySelector('[data-models-board]');
        if(modelsBoard) modelsBoard.innerHTML='<div class="live-board-loading props-empty-board"><b>Real model feed unavailable because the verified Props source could not be loaded. Retrying automatically.</b></div>';
        const modelsFeature=modelsRoot?.querySelector('[data-models-feature]');
        if(modelsFeature){modelsFeature.classList.remove('live-feed-loading');modelsFeature.innerHTML='<div class="live-feed-empty"><div><b>Model feed unavailable.</b><small>TSO will not substitute preview values while the real source is unavailable.</small></div></div>';}
        const homePicks=document.querySelector('[data-home-picks]');
        if(currentRoute==='home'&&homePicks) homePicks.innerHTML='<div class="concept-picks-head"><div><span class="gold-kicker">♛ TOP OUTPOST PICKS</span><h2>Model feed unavailable</h2></div></div><div class="home-model-empty"><b>Real model data could not be loaded.</b><small>TSO will not fall back to preview picks.</small></div>';
        const homeCards=document.querySelector('[data-home-model-cards]');
        if(currentRoute==='home'&&homeCards) homeCards.innerHTML='<div class="home-model-empty home-model-empty--wide"><b>Real model cards unavailable.</b><small>Retrying automatically.</small></div>';
        return null;
      })
      .finally(()=>{propsFeedInFlight=null});
    return propsFeedInFlight;
  }

  const labels = {
    home:'Home', live:'Live Center', research:'Research', models:'Models',
    props:'Player Props', parlays:'Parlay Lab', community:'Community',
    leaderboard:'Leaderboard', profile:'Profile'
  };

  function notify(message){
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.__tso2Toast);
    window.__tso2Toast = setTimeout(() => toast.classList.remove('show'), 1700);
  }

  function bindMediaFallbacks(){
    document.querySelectorAll('img[data-player-headshot],img[data-team-logo]').forEach(img => {
      if(img.dataset.mediaBound) return;
      img.dataset.mediaBound='1';
      img.addEventListener('error',() => {
        img.style.display='none';
        img.parentElement?.classList.add('is-missing');
      });
    });
  }

  function bindDynamic(){
    document.querySelectorAll('[data-route-jump]').forEach(btn => btn.addEventListener('click', () => setRoute(btn.dataset.routeJump)));
    document.querySelectorAll('[data-inline-league]').forEach(btn => btn.addEventListener('click', () => setLeague(btn.dataset.inlineLeague)));
    document.querySelectorAll('.model-card .button,.prop-row,.game-row').forEach(btn => btn.addEventListener('click', () => {
      notify('Shared detail drawer pattern — same interaction across every sport.');
    }));

    document.querySelectorAll('.parlays-mode-tabs button').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('.parlays-mode-tabs button').forEach(x => x.classList.toggle('is-active', x === btn));
      notify(btn.querySelector('b')?.textContent + ' builder selected.');
    }));

    document.querySelectorAll('.parlay-leg-count button').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('.parlay-leg-count button').forEach(x => x.classList.toggle('is-active', x === btn));
      notify(btn.textContent.trim() + '-leg target selected.');
    }));

    document.querySelectorAll('.parlay-add-leg,.parlay-suggestion-card').forEach(btn => btn.addEventListener('click', () => {
      notify('Leg picker will use exact selections from the live Props feed.');
    }));

    document.querySelectorAll('.parlay-replacement-card').forEach(btn => btn.addEventListener('click', () => {
      notify('Replacement preview selected — exact-line recalculation will run here.');
    }));

    document.querySelectorAll('.parlay-book-row button').forEach(btn => btn.addEventListener('click', () => {
      notify('Sportsbook handoff will use the exact selection links supplied by the odds feed.');
    }));

    document.querySelectorAll('.parlay-leg-remove').forEach(btn => btn.addEventListener('click', () => {
      notify('Preview interaction only — live builder state comes with the data migration.');
    }));
    document.querySelector('[data-props-refresh]')?.addEventListener('click', () => refreshPropsData(true));
    document.querySelector('[data-models-refresh]')?.addEventListener('click', () => refreshPropsData(true));
    document.querySelectorAll('[data-models-league]').forEach(btn => btn.addEventListener('click', () => setLeague(btn.dataset.modelsLeague)));
    document.querySelector('[data-props-search]')?.addEventListener('input', () => renderPropsFeed());
    document.querySelector('[data-props-market-filter]')?.addEventListener('change', () => renderPropsFeed());
    document.querySelector('[data-props-book-filter]')?.addEventListener('change', () => renderPropsFeed());
    bindMediaFallbacks();
  }

  function renderRoute(){
    if(currentRoute === 'home') pageContent.innerHTML = homeHTML;
    else if(window.TSO2Pages?.[currentRoute]) pageContent.innerHTML = window.TSO2Pages[currentRoute](currentLeague);
    bindDynamic();
    refreshLiveData(false);
    refreshPropsData(false);
    window.scrollTo({top:0,behavior:'instant'});
  }

  function syncNav(){
    document.querySelectorAll('[data-route]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.route === currentRoute));
    document.querySelectorAll('[data-league]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.league === currentLeague));
  }

  function setRoute(route){
    if(!labels[route]) return;
    closeProfileMenu();
    currentRoute = route;
    syncNav();
    renderRoute();
    history.replaceState(null, '', '#' + route);
  }

  function setLeague(league){
    closeProfileMenu();
    currentLeague = league;
    shell.dataset.league = league;
    syncNav();
    renderRoute();
    const label = league === 'all' ? 'All Sports' : league.toUpperCase();
    notify('Sport context: ' + label + ' — layout stays consistent.');
  }

  document.querySelectorAll('[data-route]').forEach(btn => btn.addEventListener('click', () => setRoute(btn.dataset.route)));
  document.querySelectorAll('[data-league]').forEach(btn => btn.addEventListener('click', () => setLeague(btn.dataset.league)));

  document.querySelector('.search-trigger')?.addEventListener('click', () => {
    notify('Global command search: players, teams, games, props and models.');
  });

  profileButton?.addEventListener('click', event => {
    event.stopPropagation();
    toggleProfileMenu();
  });

  profileDropdown?.addEventListener('click', event => event.stopPropagation());

  document.querySelector('[data-profile-route="profile"]')?.addEventListener('click', () => {
    closeProfileMenu();
    setRoute('profile');
  });

  document.querySelectorAll('[data-owner-only]').forEach(item => {
    item.addEventListener('click', event => {
      if(isOwner()) return;
      event.preventDefault();
      closeProfileMenu();
      notify('Brand Lab is available to the owner account only.');
    });
  });

  document.addEventListener('click', event => {
    if(profileMenu && !profileMenu.contains(event.target)) closeProfileMenu();
  });

  document.addEventListener('keydown', event => {
    if(event.key === 'Escape') closeProfileMenu();
  });

  syncOwnerTools();

  const initialRoute = location.hash.replace('#','');
  currentRoute = labels[initialRoute] ? initialRoute : 'home';
  syncNav();
  renderRoute();
  refreshLiveData(true);
  refreshPropsData(true);
  window.setInterval(() => refreshLiveData(true), LIVE_POLL_MS);
  window.setInterval(() => refreshPropsData(true), PROPS_POLL_MS);
})();