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
  let parlayLegKeys = [];
  let parlayTarget = 3;
  let researchQuery = '';
  const propsFilterState = {
    search:'',
    market:'',
    book:'',
    side:'',
    model:'',
    sort:'edge'
  };
  const deepResearchCache = new Map();
  const propHistoryCache = new Map();
  let nhlScorerCache = null;
  let nhlScorerFetchedAt = 0;
  let nhlScorerInFlight = null;
  let nhlScorerMarket = 'fgs';
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
    renderProfile();
    renderResearch();
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
        renderProfile();
        renderResearch();
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

  function americanImpliedPct(value){
    const n=Number(value);
    if(!Number.isFinite(n)||n===0)return null;
    return n<0?((-n)/((-n)+100))*100:(100/(n+100))*100;
  }

  function propsRepriceToBook(row,bookName){
    if(!bookName)return row;
    const book=(row.books||[]).find(b=>String(b?.book||'').toLowerCase()===String(bookName).toLowerCase());
    if(!book)return null;
    const implied=americanImpliedPct(book.price);
    const model=row.model&&Number.isFinite(Number(row.model.probabilityPct))
      ? {...row.model,marketProbabilityPct:implied,edgePct:Number.isFinite(implied)?Number(row.model.probabilityPct)-implied:null}
      : row.model||null;
    return {...row,book:book.book,price:book.price,link:book.link||null,sid:book.sid||null,snapshotTime:book.snapshotTime||row.snapshotTime,preserved:book.preserved===true,priceKind:book.priceKind||row.priceKind,impliedPct:implied,model};
  }

  function propsSortMode(){
    return String(propsFilterState.sort||'edge');
  }

  function sortPropsToolRows(rows,mode='edge'){
    const copy=[...rows];
    if(mode==='model')return copy.sort((a,b)=>(Number(b?.model?.probabilityPct)||-1)-(Number(a?.model?.probabilityPct)||-1));
    if(mode==='books')return copy.sort((a,b)=>(Number(b.bookCount)||0)-(Number(a.bookCount)||0)||String(a.player||'').localeCompare(String(b.player||'')));
    if(mode==='price')return copy.sort((a,b)=>(Number(b.price)||-999999)-(Number(a.price)||-999999));
    if(mode==='fresh')return copy.sort((a,b)=>(Date.parse(b.snapshotTime||'')||0)-(Date.parse(a.snapshotTime||'')||0));
    if(mode==='player')return copy.sort((a,b)=>String(a.player||'').localeCompare(String(b.player||''))||String(a.marketLabel||a.market||'').localeCompare(String(b.marketLabel||b.market||'')));
    return sortPropsRows(copy);
  }


  function currentPropsRows(){
    if(!propsFeedCache) return [];
    const search=String(propsFilterState.search||'').trim().toLowerCase();
    const market=String(propsFilterState.market||'');
    const book=String(propsFilterState.book||'').toLowerCase();
    const side=String(propsFilterState.side||'');
    const modelFilter=String(propsFilterState.model||'');
    return (propsFeedCache.rows||[]).flatMap(original => {
      if(currentLeague!=='all' && original.sport!==currentLeague) return [];
      if(market && original.market!==market) return [];
      if(side && original.side!==side) return [];
      const hasModel=Number.isFinite(Number(original?.model?.probabilityPct));
      if(modelFilter==='modeled'&&!hasModel) return [];
      if(modelFilter==='market'&&hasModel) return [];
      let row=original;
      if(book){
        row=propsRepriceToBook(original,book);
        if(!row)return [];
      }
      if(search){
        const matches=[row.player,row.team,row.market,row.marketLabel,row.homeTeam,row.awayTeam,row.book,propSelectionText(row),row.line]
          .filter(v=>v!==null&&v!==undefined&&v!=='').join(' ').toLowerCase().includes(search);
        if(!matches)return [];
      }
      return [row];
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

  const NHL_SCORER_TEAM_COLORS={
    ANA:'#fc4c02',BOS:'#ffb81c',BUF:'#003087',CGY:'#d2001c',CAR:'#cc0000',CHI:'#cf0a2c',
    COL:'#6f263d',CBJ:'#002654',DAL:'#006847',DET:'#ce1126',EDM:'#ff4c00',FLA:'#c8102e',
    LA:'#a2aaad',MIN:'#154734',MTL:'#af1e2d',NSH:'#ffb81c',NJ:'#ce1126',NYI:'#00539b',
    NYR:'#0038a8',OTT:'#c52032',PHI:'#f74902',PIT:'#fcb514',SJ:'#006d75',SEA:'#99d9d9',
    STL:'#002f87',TB:'#002868',TOR:'#003e7e',UTA:'#69b3e7',VAN:'#00205b',VGK:'#b4975a',
    WSH:'#041e42',WPG:'#041e42'
  };

  function nhlScorerRgb(hex){
    const h=String(hex||'#7b5cff').replace('#','').padEnd(6,'0').slice(0,6);
    return [parseInt(h.slice(0,2),16)||123,parseInt(h.slice(2,4),16)||92,parseInt(h.slice(4,6),16)||255].join(',');
  }

  function nhlScorerPct(value){
    const n=Number(value);
    if(!Number.isFinite(n))return '—';
    const pct=n*100;
    return pct.toFixed(pct>=10?1:2)+'%';
  }

  function nhlScorerStat(value){
    const n=Number(value);
    return Number.isFinite(n)?n.toFixed(2):'—';
  }

  function nhlScorerLine(p){
    const fgs=nhlScorerMarket==='fgs';
    const probability=fgs?p?.probability:p?.anytimeProbability;
    const odds=fgs?p?.bestOdds:p?.bestAtgOdds;
    const book=fgs?p?.bestBook:p?.bestAtgBook;
    const fair=fgs?p?.fairOdds:p?.fairAtgOdds;
    return {probability,odds,book,fair,live:Number.isFinite(Number(odds))};
  }

  function nhlScorerHeadshot(p){
    const initials=esc(playerInitials(p?.name));
    if(!p?.photo)return '<span class="nhl-scorer-photo is-missing"><span>'+initials+'</span></span>';
    return '<span class="nhl-scorer-photo"><span>'+initials+'</span><img data-player-headshot src="'+esc(p.photo)+'" alt="'+esc(p.name||'NHL player')+'" loading="lazy" /></span>';
  }

  function nhlScorerPlayerMarkup(p,team,risky=false,index=0){
    if(!p)return '';
    const line=nhlScorerLine(p);
    const matchup=p.matchup||{};
    const accent=NHL_SCORER_TEAM_COLORS[String(team?.abbr||p.team||'').toUpperCase()]||'#7b5cff';
    const oddsShown=line.live?americanPrice(line.odds):(Number.isFinite(Number(line.fair))?americanPrice(line.fair):'—');
    const oddsLabel=line.live?(line.book?String(line.book).toUpperCase():'LIVE ODDS'):'FAIR';
    const fairNote=line.live&&Number.isFinite(Number(line.fair))?'FAIR '+americanPrice(line.fair):line.live?'VERIFIED PRICE':'MODEL PRICE';
    const rank=p.teamRank||index+1;
    const details=[
      nhlScorerStat(p.seasonGoalRate)+' G/GP',
      nhlScorerStat(p.seasonSogRate)+' SOG/GP',
      'L10 '+String(p.recentGoals??0)+' G'
    ];
    if(nhlScorerMarket==='fgs')details.push(String(p.recentFirstGoals??0)+' FIRST');
    const matchupText=matchup.detail?((matchup.label||'Neutral')+' · '+matchup.detail):(matchup.label||'Matchup context pending');
    return '<article class="nhl-scorer-player '+(risky?'is-risky':'')+'" style="--scorer-accent:'+esc(accent)+';--scorer-rgb:'+esc(nhlScorerRgb(accent))+'">'
      +'<span class="nhl-scorer-rank">'+(risky?'RISKY VALUE':'#'+esc(rank))+'</span>'
      +nhlScorerHeadshot(p)
      +'<div class="nhl-scorer-player-copy"><small>'+esc(String(p.position||'NHL'))+' · '+esc(String(p.team||team?.abbr||''))+'</small><h4>'+esc(p.name||'Player')+'</h4><p>'+esc(details.join(' · '))+'</p></div>'
      +'<div class="nhl-scorer-player-metrics"><span><small>MODEL</small><b>'+esc(nhlScorerPct(line.probability))+'</b></span><span><small>'+esc(oddsLabel)+'</small><b>'+esc(oddsShown)+'</b><em>'+esc(fairNote)+'</em></span></div>'
      +'<div class="nhl-scorer-matchup"><span>'+esc(matchupText)+'</span>'+(risky&&p.riskyReason?'<strong>'+esc(p.riskyReason)+'</strong>':'')+'</div>'
      +'</article>';
  }

  function nhlScorerTeamMarkup(team){
    const accent=NHL_SCORER_TEAM_COLORS[String(team?.abbr||'').toUpperCase()]||'#7b5cff';
    const players=nhlScorerMarket==='fgs'?(team?.players||[]):(team?.atgPlayers||[]);
    const risky=nhlScorerMarket==='fgs'?team?.riskyFirstGoal:team?.riskyAtg;
    return '<section class="nhl-scorer-team" style="--scorer-accent:'+esc(accent)+';--scorer-rgb:'+esc(nhlScorerRgb(accent))+'">'
      +'<header><div>'+teamLogoMarkup(team,'nhl-scorer-team-logo')+'<span><small>'+esc(team?.abbr||'NHL')+'</small><b>'+esc(team?.name||'Team')+'</b></span></div><strong>'+esc(Number(team?.expectedGoals||0).toFixed(2))+' <small>MODEL GOALS</small></strong></header>'
      +'<div class="nhl-scorer-players">'+players.slice(0,3).map((p,i)=>nhlScorerPlayerMarkup(p,team,false,i)).join('')+(risky?nhlScorerPlayerMarkup(risky,team,true,3):'')+'</div>'
      +'</section>';
  }

  function nhlScorerGameMarkup(game){
    const when=game?.startTime?new Date(game.startTime):null;
    const time=when&&!Number.isNaN(when.getTime())?when.toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'Time pending';
    const status=String(game?.status||'').toUpperCase();
    const marketLabel=nhlScorerMarket==='fgs'?'FIRST GOAL':'ANYTIME GOAL';
    return '<article class="nhl-scorer-game">'
      +'<header class="nhl-scorer-game-head"><div class="nhl-scorer-matchup-title">'+teamLogoMarkup(game?.away,'nhl-scorer-matchup-logo')+'<b>'+esc(game?.away?.abbr||'AWAY')+'</b><span>@</span><b>'+esc(game?.home?.abbr||'HOME')+'</b>'+teamLogoMarkup(game?.home,'nhl-scorer-matchup-logo')+'</div><div><span>'+esc(status||'SCHEDULED')+'</span><b>'+esc(time)+'</b><small>'+esc(game?.venue||'NHL')+'</small></div></header>'
      +'<div class="nhl-scorer-team-grid">'+nhlScorerTeamMarkup(game?.away)+nhlScorerTeamMarkup(game?.home)+'</div>'
      +'<div class="nhl-scorer-game-actions"><span>'+esc(marketLabel)+' SHARE CARD</span><div><button data-nhl-scorer-game-share="'+esc(game?.gameId||'')+'">SHARE CARD</button><button data-nhl-scorer-game-download="'+esc(game?.gameId||'')+'">DOWNLOAD PNG</button></div></div>'
      +'</article>';
  }

  const nhlScorerCanvasImageCache=new Map();

  function nhlScorerCanvasImage(url){
    if(!url)return Promise.resolve(null);
    const key=String(url);
    if(nhlScorerCanvasImageCache.has(key))return nhlScorerCanvasImageCache.get(key);
    const promise=new Promise(resolve=>{
      const img=new Image();
      img.crossOrigin='anonymous';
      let done=false;
      const finish=value=>{if(done)return;done=true;resolve(value);};
      const timer=setTimeout(()=>finish(null),8000);
      img.onload=()=>{clearTimeout(timer);finish(img);};
      img.onerror=()=>{clearTimeout(timer);finish(null);};
      img.src=key;
    });
    nhlScorerCanvasImageCache.set(key,promise);
    return promise;
  }

  function nhlScorerCanvasPath(ctx,x,y,w,h,r=12){
    const rr=Math.max(0,Math.min(r,Math.min(w,h)/2));
    ctx.beginPath();
    ctx.moveTo(x+rr,y);
    ctx.arcTo(x+w,y,x+w,y+h,rr);
    ctx.arcTo(x+w,y+h,x,y+h,rr);
    ctx.arcTo(x,y+h,x,y,rr);
    ctx.arcTo(x,y,x+w,y,rr);
    ctx.closePath();
  }

  function nhlScorerCanvasBox(ctx,x,y,w,h,r,fill,stroke=null,lineWidth=1){
    nhlScorerCanvasPath(ctx,x,y,w,h,r);
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}
  }

  function nhlScorerCanvasFit(ctx,text,maxWidth,size=28,min=12,weight=800,italic=false){
    let n=size;
    do{
      ctx.font=(italic?'italic ':'')+weight+' '+n+'px Inter, Arial, sans-serif';
      if(ctx.measureText(String(text||'')).width<=maxWidth||n<=min)break;
      n--;
    }while(n>min);
    return n;
  }

  function nhlScorerCanvasContain(ctx,img,x,y,w,h){
    if(!img)return;
    const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
    if(!iw||!ih)return;
    const scale=Math.min(w/iw,h/ih),dw=iw*scale,dh=ih*scale;
    ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
  }

  function nhlScorerCanvasCover(ctx,img,x,y,w,h){
    if(!img)return;
    const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
    if(!iw||!ih)return;
    const scale=Math.max(w/iw,h/ih),dw=iw*scale,dh=ih*scale;
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);ctx.restore();
  }

  function nhlScorerCanvasBg(ctx,w,h){
    const bg=ctx.createLinearGradient(0,0,0,h);
    bg.addColorStop(0,'#030712');bg.addColorStop(.52,'#07101d');bg.addColorStop(1,'#02050a');
    ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    const glow=ctx.createRadialGradient(w*.78,80,20,w*.78,80,w*.58);
    glow.addColorStop(0,'rgba(123,92,255,.24)');glow.addColorStop(.42,'rgba(45,127,255,.08)');glow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='rgba(255,255,255,.025)';ctx.lineWidth=1;
    for(let y=170;y<h;y+=54){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  }

  function nhlScorerCanvasLine(p,market){
    const fgs=market==='fgs';
    return {
      probability:fgs?p?.probability:p?.anytimeProbability,
      odds:fgs?p?.bestOdds:p?.bestAtgOdds,
      book:fgs?p?.bestBook:p?.bestAtgBook,
      fair:fgs?p?.fairOdds:p?.fairAtgOdds
    };
  }

  function nhlScorerCanvasPrice(line){
    if(Number.isFinite(Number(line?.odds)))return {label:String(line.book||'ODDS').toUpperCase().slice(0,10),price:americanPrice(line.odds),note:Number.isFinite(Number(line.fair))?'FAIR '+americanPrice(line.fair):'VERIFIED'};
    if(Number.isFinite(Number(line?.fair)))return {label:'FAIR',price:americanPrice(line.fair),note:'MODEL PRICE'};
    return {label:'PRICE',price:'—',note:'NO LIVE PRICE'};
  }

  function nhlScorerCanvasReason(p,market){
    const m=p?.matchup||{},parts=[];
    if(Number.isFinite(Number(m.goalAllowedRank))&&Number.isFinite(Number(m.rankedTeams)))parts.push('#'+m.goalAllowedRank+'/'+m.rankedTeams+' '+String(m.position||p.position||'')+' goals allowed');
    if(Number(m.defenseRestFactor)>=1.025)parts.push('opponent B2B');
    if(Number.isFinite(Number(m.recentDefenseIndex))&&Math.abs(Number(m.recentDefenseIndex)-1)>=.035)parts.push('recent D '+(Number(m.recentDefenseIndex)>=1?'+':'')+Math.round((Number(m.recentDefenseIndex)-1)*100)+'%');
    if(m.goalie?.verified&&m.goalie?.name)parts.push('vs '+m.goalie.name);
    if(!parts.length)parts.push(nhlScorerStat(p?.seasonSogRate)+' SOG/G · L10 '+String(p?.recentGoals??0)+' G');
    if(market==='fgs'&&Number(p?.recentFirstGoals)>0)parts.push('L10 '+p.recentFirstGoals+' first goals');
    return parts.slice(0,3).join(' · ');
  }

  async function nhlScorerDrawBrand(ctx,w){
    const logo=await nhlScorerCanvasImage('/brand/approved/tso2-wordmark-horizontal-approved.webp');
    if(logo){
      nhlScorerCanvasContain(ctx,logo,42,28,560,96);
    }else{
      ctx.textAlign='left';ctx.fillStyle='#f5f8ff';ctx.font='900 36px Inter,Arial,sans-serif';ctx.fillText('THE SPORTS OUTPOST',48,82);
    }
    ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(42,134,w-84,1);
  }

  async function nhlScorerDrawGameTeam(ctx,team,market,x,y,w,h){
    const accent=NHL_SCORER_TEAM_COLORS[String(team?.abbr||'').toUpperCase()]||'#7b5cff';
    const rgb=nhlScorerRgb(accent);
    const logo=await nhlScorerCanvasImage(team?.logo);
    nhlScorerCanvasBox(ctx,x,y,w,h,20,'rgba(4,9,16,.94)','rgba('+rgb+',.48)',2);
    const header=ctx.createLinearGradient(x,y,x+w,y);
    header.addColorStop(0,'rgba('+rgb+',.27)');header.addColorStop(.52,'rgba(8,14,23,.96)');header.addColorStop(1,'rgba(4,8,14,.98)');
    nhlScorerCanvasBox(ctx,x+1,y+1,w-2,82,18,header,'rgba('+rgb+',.18)',1);
    if(logo)nhlScorerCanvasContain(ctx,logo,x+14,y+9,66,64);
    ctx.textAlign='left';ctx.fillStyle='rgba(225,238,250,.64)';ctx.font='800 15px Inter,Arial,sans-serif';ctx.fillText(String(team?.abbr||''),94+x,y+29);
    nhlScorerCanvasFit(ctx,String(team?.name||'TEAM').toUpperCase(),w-270,29,17,900,true);
    ctx.fillStyle='#fff';ctx.fillText(String(team?.name||'TEAM').toUpperCase(),94+x,y+59);
    ctx.textAlign='right';ctx.fillStyle='#d8e7f6';ctx.font='900 27px Inter,Arial,sans-serif';ctx.fillText(Number(team?.expectedGoals||0).toFixed(2),x+w-20,y+42);
    ctx.fillStyle='#697684';ctx.font='800 11px Inter,Arial,sans-serif';ctx.fillText('MODEL GOALS',x+w-20,y+61);

    const players=market==='fgs'?(team?.players||[]):(team?.atgPlayers||[]);
    const risky=market==='fgs'?team?.riskyFirstGoal:team?.riskyAtg;
    const rows=[...players.slice(0,3),...(risky?[risky]:[])];
    const rowH=(h-96)/4;
    for(let i=0;i<rows.length;i++){
      const p=rows[i],isRisk=i===3,line=nhlScorerCanvasLine(p,market),price=nhlScorerCanvasPrice(line);
      const ry=y+91+i*rowH;
      const photo=await nhlScorerCanvasImage(p?.photo);
      nhlScorerCanvasBox(ctx,x+10,ry,w-20,rowH-7,13,isRisk?'rgba('+rgb+',.14)':'rgba(7,13,21,.92)',isRisk?'rgba(255,216,77,.28)':'rgba('+rgb+',.22)',1);
      ctx.fillStyle=isRisk?'#ffd84d':accent;ctx.fillRect(x+10,ry,4,rowH-7);
      ctx.save();ctx.beginPath();ctx.arc(x+54,ry+(rowH-7)/2,29,0,Math.PI*2);ctx.clip();
      if(photo)nhlScorerCanvasCover(ctx,photo,x+25,ry+(rowH-7)/2-29,58,58);
      else{ctx.fillStyle='#111b29';ctx.fillRect(x+25,ry+(rowH-7)/2-29,58,58);}
      ctx.restore();ctx.strokeStyle=isRisk?'#ffd84d':'rgba('+rgb+',.78)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+54,ry+(rowH-7)/2,30,0,Math.PI*2);ctx.stroke();
      ctx.textAlign='left';ctx.fillStyle=isRisk?'#ffd84d':'rgba(214,229,244,.62)';ctx.font='900 10px Inter,Arial,sans-serif';ctx.fillText(isRisk?'RISKY VALUE':'#'+String(p?.teamRank||i+1),x+94,ry+21);
      nhlScorerCanvasFit(ctx,String(p?.name||'PLAYER').toUpperCase(),270,23,15,900,true);ctx.fillStyle='#fff';ctx.fillText(String(p?.name||'PLAYER').toUpperCase(),x+94,ry+46);
      ctx.fillStyle='#7f8b98';ctx.font='700 10px Inter,Arial,sans-serif';ctx.fillText(String(p?.position||'NHL')+' · '+nhlScorerCanvasReason(p,market).toUpperCase().slice(0,72),x+94,ry+66);

      const bx=x+w-226;
      nhlScorerCanvasBox(ctx,bx,ry+12,92,rowH-31,9,'rgba(3,8,14,.95)','rgba('+rgb+',.25)',1);
      ctx.textAlign='center';ctx.fillStyle='#687584';ctx.font='800 9px Inter,Arial,sans-serif';ctx.fillText('MODEL',bx+46,ry+30);
      ctx.fillStyle='#fff';ctx.font='900 20px Inter,Arial,sans-serif';ctx.fillText(nhlScorerPct(line.probability),bx+46,ry+55);

      nhlScorerCanvasBox(ctx,bx+102,ry+12,112,rowH-31,9,'rgba(3,8,14,.95)','rgba('+rgb+',.25)',1);
      ctx.fillStyle='#687584';ctx.font='800 9px Inter,Arial,sans-serif';ctx.fillText(price.label,bx+158,ry+30);
      ctx.fillStyle=Number.isFinite(Number(line.odds))?'#70e8ab':'#edf3f9';ctx.font='900 20px Inter,Arial,sans-serif';ctx.fillText(price.price,bx+158,ry+54);
      ctx.fillStyle='#697684';ctx.font='700 8px Inter,Arial,sans-serif';ctx.fillText(price.note,bx+158,ry+68);
    }
  }

  async function nhlScorerGameCardBlob(game,market){
    const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=900;
    const ctx=canvas.getContext('2d');
    nhlScorerCanvasBg(ctx,1600,900);
    await nhlScorerDrawBrand(ctx,1600);
    ctx.textAlign='right';ctx.fillStyle='#f4f7fb';ctx.font='900 italic 46px Inter,Arial,sans-serif';
    ctx.fillText(market==='fgs'?'FIRST GOAL SCORER':'ANYTIME GOAL SCORER',1555,71);
    ctx.fillStyle='#8878e0';ctx.font='900 14px Inter,Arial,sans-serif';ctx.fillText('TOP 3 PER TEAM + RISKY VALUE',1555,102);

    const awayLogo=await nhlScorerCanvasImage(game?.away?.logo),homeLogo=await nhlScorerCanvasImage(game?.home?.logo);
    if(awayLogo)nhlScorerCanvasContain(ctx,awayLogo,628,147,70,70);
    if(homeLogo)nhlScorerCanvasContain(ctx,homeLogo,902,147,70,70);
    ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='900 italic 34px Inter,Arial,sans-serif';ctx.fillText(String(game?.away?.abbr||'AWAY')+' @ '+String(game?.home?.abbr||'HOME'),800,182);
    const when=game?.startTime?new Date(game.startTime):null;
    ctx.fillStyle='#7d8996';ctx.font='800 13px Inter,Arial,sans-serif';
    ctx.fillText((when&&!Number.isNaN(when.getTime())?when.toLocaleString([],{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'TIME PENDING')+' · '+String(game?.venue||'NHL'),800,207);

    await Promise.all([
      nhlScorerDrawGameTeam(ctx,game?.away,market,38,235,742,590),
      nhlScorerDrawGameTeam(ctx,game?.home,market,820,235,742,590)
    ]);
    ctx.textAlign='left';ctx.fillStyle='#667383';ctx.font='700 11px Inter,Arial,sans-serif';ctx.fillText('FGS-Hazard Ensemble v3 · sportsbook markets remain the anchor',42,872);
    ctx.textAlign='right';ctx.fillText('Model probabilities are estimates, not guarantees · thesportsoutpost.com',1558,872);
    return new Promise(resolve=>canvas.toBlob(resolve,'image/png',.96));
  }

  async function nhlScorerSlateCardBlob(market){
    const games=Array.isArray(nhlScorerCache?.games)?nhlScorerCache.games:[];
    const teams=games.flatMap(g=>[g.away,g.home]).filter(Boolean);
    if(!teams.length)throw new Error('No NHL scorer teams are available.');
    const cols=2,rows=Math.ceil(teams.length/cols),width=1600,panelH=278,top=215,bottom=78,height=top+rows*panelH+bottom;
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');
    nhlScorerCanvasBg(ctx,width,height);await nhlScorerDrawBrand(ctx,width);
    ctx.textAlign='right';ctx.fillStyle='#f4f7fb';ctx.font='900 italic 44px Inter,Arial,sans-serif';
    ctx.fillText(market==='fgs'?'NHL FIRST GOAL — FULL SLATE':'NHL ANYTIME GOAL — FULL SLATE',1555,70);
    ctx.fillStyle='#8f80e4';ctx.font='900 14px Inter,Arial,sans-serif';ctx.fillText('ALL TEAMS · TOP 3 + RISKY VALUE',1555,101);
    ctx.textAlign='left';ctx.fillStyle='#788593';ctx.font='800 12px Inter,Arial,sans-serif';
    ctx.fillText((nhlScorerCache?.model||'FGS-Hazard Ensemble v3')+' · '+teams.length+' teams · generated '+ageText(nhlScorerCache?.generatedAt)+' ago',44,174);

    for(let i=0;i<teams.length;i++){
      const team=teams[i],col=i%2,row=Math.floor(i/2),x=38+col*782,y=top+row*panelH,w=742,h=258;
      const accent=NHL_SCORER_TEAM_COLORS[String(team?.abbr||'').toUpperCase()]||'#7b5cff',rgb=nhlScorerRgb(accent);
      const logo=await nhlScorerCanvasImage(team?.logo);
      nhlScorerCanvasBox(ctx,x,y,w,h,16,'rgba(5,10,17,.95)','rgba('+rgb+',.36)',1.5);
      const grad=ctx.createLinearGradient(x,y,x+w,y);grad.addColorStop(0,'rgba('+rgb+',.24)');grad.addColorStop(.55,'rgba(7,12,20,.94)');grad.addColorStop(1,'rgba(4,8,14,.98)');
      nhlScorerCanvasBox(ctx,x+1,y+1,w-2,54,15,grad,null,0);
      if(logo)nhlScorerCanvasContain(ctx,logo,x+10,y+5,48,44);
      ctx.textAlign='left';ctx.fillStyle='#fff';ctx.font='900 italic 21px Inter,Arial,sans-serif';ctx.fillText(String(team?.name||team?.abbr||'TEAM').toUpperCase(),x+70,y+34);
      ctx.textAlign='right';ctx.fillStyle='#dbe8f4';ctx.font='900 17px Inter,Arial,sans-serif';ctx.fillText(Number(team?.expectedGoals||0).toFixed(2)+' MODEL GOALS',x+w-14,y+33);

      const players=market==='fgs'?(team?.players||[]):(team?.atgPlayers||[]),risky=market==='fgs'?team?.riskyFirstGoal:team?.riskyAtg;
      const entries=[...players.slice(0,3),...(risky?[risky]:[])];
      for(let j=0;j<entries.length;j++){
        const p=entries[j],isRisk=j===3,line=nhlScorerCanvasLine(p,market),price=nhlScorerCanvasPrice(line);
        const ry=y+61+j*46;
        if(j>0){ctx.fillStyle='rgba(255,255,255,.055)';ctx.fillRect(x+12,ry-4,w-24,1);}
        ctx.textAlign='left';ctx.fillStyle=isRisk?'#ffd84d':'#738090';ctx.font='900 10px Inter,Arial,sans-serif';ctx.fillText(isRisk?'RISKY':'#'+String(p?.teamRank||j+1),x+16,ry+18);
        nhlScorerCanvasFit(ctx,String(p?.name||'PLAYER').toUpperCase(),330,18,13,900,true);ctx.fillStyle='#f6f8fb';ctx.fillText(String(p?.name||'PLAYER').toUpperCase(),x+74,ry+19);
        ctx.fillStyle='#6e7a87';ctx.font='700 9px Inter,Arial,sans-serif';ctx.fillText(String(p?.position||'NHL'),x+74,ry+34);
        ctx.textAlign='right';ctx.fillStyle='#a99cff';ctx.font='900 17px Inter,Arial,sans-serif';ctx.fillText(nhlScorerPct(line.probability),x+w-158,ry+20);
        ctx.fillStyle=Number.isFinite(Number(line.odds))?'#70e8ab':'#dce5ef';ctx.fillText(price.price,x+w-18,ry+20);
        ctx.fillStyle='#687482';ctx.font='700 8px Inter,Arial,sans-serif';ctx.fillText(price.label,x+w-18,ry+34);
      }
    }
    ctx.textAlign='left';ctx.fillStyle='#667383';ctx.font='700 11px Inter,Arial,sans-serif';ctx.fillText('Owner slate share · FGS-Hazard Ensemble v3 · sportsbook markets remain the anchor',42,height-31);
    ctx.textAlign='right';ctx.fillText('Model probabilities are estimates, not guarantees · thesportsoutpost.com',1558,height-31);
    return new Promise(resolve=>canvas.toBlob(resolve,'image/png',.96));
  }

  function nhlScorerDownloadBlob(blob,filename){
    if(!blob)throw new Error('Card render failed');
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1800);
  }

  async function nhlScorerShareBlob(blob,filename,title,text){
    if(!blob)throw new Error('Card render failed');
    const file=new File([blob],filename,{type:'image/png'});
    if(navigator.share&&navigator.canShare?.({files:[file]})){
      await navigator.share({title,text,files:[file]});
      return 'shared';
    }
    nhlScorerDownloadBlob(blob,filename);
    notify('Share card downloaded. Attach the PNG to your post.');
    return 'downloaded';
  }

  function nhlScorerGameById(gameId){
    return (nhlScorerCache?.games||[]).find(g=>String(g?.gameId||'')===String(gameId||''))||null;
  }

  async function runNhlScorerGameAction(button,gameId,action){
    const game=nhlScorerGameById(gameId);if(!game)return;
    const old=button.textContent;button.disabled=true;button.textContent='BUILDING CARD…';
    try{
      const blob=await nhlScorerGameCardBlob(game,nhlScorerMarket);
      const marketName=nhlScorerMarket==='fgs'?'First-Goal':'Anytime-Goal';
      const filename='TSO-NHL-'+String(game.away?.abbr||'Away')+'-'+String(game.home?.abbr||'Home')+'-'+marketName+'.png';
      if(action==='share'){
        await nhlScorerShareBlob(blob,filename,'The Sports Outpost NHL Scorer',(nhlScorerMarket==='fgs'?'NHL First Goal Scorer':'NHL Anytime Goal Scorer')+' · '+game.away?.abbr+' @ '+game.home?.abbr+' · Top 3 + Risky Value');
      }else{
        nhlScorerDownloadBlob(blob,filename);notify('Scorer card downloaded.');
      }
    }catch(error){
      console.error('NHL scorer card:',error);notify('Could not build scorer card.');
    }finally{button.disabled=false;button.textContent=old;}
  }

  async function runNhlScorerSlateShare(button,market){
    if(!isOwner()){notify('Slate share cards are available to the owner account only.');return;}
    const old=button.textContent;button.disabled=true;button.textContent='BUILDING FULL SLATE…';
    try{
      const blob=await nhlScorerSlateCardBlob(market);
      const label=market==='fgs'?'First-Goal':'Anytime-Goal';
      await nhlScorerShareBlob(blob,'TSO-NHL-Full-Slate-'+label+'.png','The Sports Outpost NHL Full Slate',(market==='fgs'?'NHL First Goal Scorer':'NHL Anytime Goal Scorer')+' · Full Slate · Top 3 + Risky Value for every team');
    }catch(error){
      console.error('NHL slate share card:',error);notify('Could not build NHL slate card.');
    }finally{button.disabled=false;button.textContent=old;}
  }

  function bindNhlScorerActions(root){
    root?.querySelectorAll('[data-nhl-scorer-market]').forEach(btn=>btn.onclick=()=>{
      const next=String(btn.dataset.nhlScorerMarket||'fgs');
      if(next===nhlScorerMarket)return;
      nhlScorerMarket=next;
      renderNhlScorerModel();
    });
    root?.querySelectorAll('[data-nhl-scorer-game-share]').forEach(btn=>btn.onclick=()=>runNhlScorerGameAction(btn,btn.dataset.nhlScorerGameShare,'share'));
    root?.querySelectorAll('[data-nhl-scorer-game-download]').forEach(btn=>btn.onclick=()=>runNhlScorerGameAction(btn,btn.dataset.nhlScorerGameDownload,'download'));
    root?.querySelectorAll('[data-nhl-scorer-slate-share]').forEach(btn=>btn.onclick=()=>runNhlScorerSlateShare(btn,btn.dataset.nhlScorerSlateShare));
  }

  function renderNhlScorerModel(){
    const root=document.querySelector('[data-nhl-scorer-shell]');
    if(!root)return;
    root.querySelectorAll('[data-nhl-scorer-market]').forEach(btn=>{
      const active=btn.dataset.nhlScorerMarket===nhlScorerMarket;
      btn.classList.toggle('is-active',active);
      btn.setAttribute('aria-pressed',active?'true':'false');
    });
    const body=root.querySelector('[data-nhl-scorer-body]');
    const meta=root.querySelector('[data-nhl-scorer-meta]');
    if(!body)return;
    if(!nhlScorerCache){
      body.innerHTML='<div class="live-board-loading"><span class="live-feed-spinner"></span><div><b>Loading the real NHL scorer model…</b><small>Same generated board used by TSO 1.0.</small></div></div>';
      return;
    }
    const games=Array.isArray(nhlScorerCache.games)?nhlScorerCache.games:[];
    if(meta){
      meta.innerHTML='<span><b>'+esc(nhlScorerCache.model||'FGS-Hazard Ensemble v3')+'</b><small>'+esc(nhlScorerCache.season||'NHL')+' · generated '+esc(ageText(nhlScorerCache.generatedAt))+' ago</small></span>'
        +'<span><b>TOP 3 + RISKY VALUE</b><small>per team</small></span>'
        +'<span><b>'+games.length+' MATCHUPS</b><small>'+esc(nhlScorerMarket==='fgs'?'First Goal':'Anytime Goal')+' board</small></span>'
        +'<span><b>MATCHUP ADJUSTED</b><small>form · defense · goalie · rest</small></span>';
    }
    if(!games.length){
      body.innerHTML='<div class="live-board-loading"><div><b>The scorer model is waiting for the next verified NHL slate.</b><small>No fake candidates will be shown.</small></div></div>';
      return;
    }
    body.innerHTML=games.map(nhlScorerGameMarkup).join('');
    bindNhlScorerActions(root);
    bindMediaFallbacks();
  }

  function refreshNhlScorerData(force=false){
    const root=document.querySelector('[data-nhl-scorer-shell]');
    if(!root)return Promise.resolve(null);
    const now=Date.now();
    if(!force&&nhlScorerCache&&now-nhlScorerFetchedAt<60000){
      renderNhlScorerModel();
      return Promise.resolve(nhlScorerCache);
    }
    if(nhlScorerInFlight)return nhlScorerInFlight;
    nhlScorerInFlight=fetch('/api/nhl-scorer-model',{cache:'no-store'})
      .then(async response=>{
        const payload=await response.json();
        if(!response.ok||payload?.available===false)throw new Error(payload?.error||'NHL scorer model unavailable');
        nhlScorerCache=payload;
        nhlScorerFetchedAt=Date.now();
        renderNhlScorerModel();
        return payload;
      })
      .catch(error=>{
        console.error('TSO NHL scorer model:',error);
        const body=document.querySelector('[data-nhl-scorer-body]');
        if(body)body.innerHTML='<div class="live-board-loading"><div><b>NHL scorer model feed unavailable.</b><small>TSO will not replace it with demo picks.</small></div></div>';
        return null;
      })
      .finally(()=>{nhlScorerInFlight=null;});
    return nhlScorerInFlight;
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
    refreshNhlScorerData(false);
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

  const americanToDecimal = value => {
    const n=Number(value);
    if(!Number.isFinite(n)||n===0) return null;
    return n>0 ? 1+n/100 : 1+100/Math.abs(n);
  };

  const decimalToAmerican = value => {
    const d=Number(value);
    if(!Number.isFinite(d)||d<=1) return null;
    return d>=2 ? Math.round((d-1)*100) : Math.round(-100/(d-1));
  };

  function parlayRows(){
    return (propsFeedCache?.rows||[]).filter(row=>{
      if(currentLeague!=='all'&&row.sport!==currentLeague) return false;
      if(!Number.isFinite(Number(row.price))||Number(row.price)===0)return false;
      if(String(row.sourceFile||'').toLowerCase()==='nfl-live-odds.json')return false;
      const phase=String(row?.model?.phase||'pregame').toLowerCase();
      return phase==='pregame';
    });
  }

  function autoParlayRows(){
    return parlayRows().filter(row=>Number.isFinite(Number(row?.model?.probabilityPct)));
  }

  function parlayRowByKey(key){
    return parlayRows().find(row=>String(row.key)===String(key))||null;
  }

  function parlayLegRows(){
    return parlayLegKeys.map(parlayRowByKey).filter(Boolean);
  }

  function parlayEventKey(row){
    return row?.eventId ? String(row.sport||'')+'|'+String(row.eventId) : '';
  }

  function parlayCandidateRows(excludedKeys=[]){
    const excluded=new Set(excludedKeys.map(String));
    const modeled=autoParlayRows().filter(row=>!excluded.has(String(row.key)));
    const base=modeled.length?modeled:parlayRows().filter(row=>!excluded.has(String(row.key)));
    return sortPropsRows(base);
  }

  function chooseParlayRows(target=3,excludedKeys=[]){
    const candidates=parlayCandidateRows(excludedKeys);
    const chosen=[];
    const players=new Set();
    const events=new Set();
    for(const row of candidates){
      const player=String(row.player||'').toLowerCase();
      const event=parlayEventKey(row);
      if(players.has(player)||(event&&events.has(event))) continue;
      chosen.push(row);
      players.add(player);
      if(event) events.add(event);
      if(chosen.length>=target) return chosen;
    }
    for(const row of candidates){
      if(chosen.some(x=>String(x.key)===String(row.key))) continue;
      chosen.push(row);
      if(chosen.length>=target) break;
    }
    return chosen;
  }

  function resetParlayBuild(){
    parlayLegKeys=chooseParlayRows(parlayTarget).map(row=>String(row.key));
    renderParlayLab();
  }

  function fillParlayToTarget(target=parlayTarget){
    const available=parlayRows();
    const valid=new Set(available.map(row=>String(row.key)));
    parlayLegKeys=parlayLegKeys.filter(key=>valid.has(String(key)));
    if(target<5&&parlayLegKeys.length>target) parlayLegKeys=parlayLegKeys.slice(0,target);
    if(parlayLegKeys.length<target){
      const needed=target-parlayLegKeys.length;
      parlayLegKeys.push(...chooseParlayRows(needed,parlayLegKeys).map(row=>String(row.key)));
    }
  }

  function parlayOverlapInfo(rows){
    let sameEventPairs=0,samePlayerPairs=0;
    for(let i=0;i<rows.length;i++){
      for(let j=i+1;j<rows.length;j++){
        const a=rows[i],b=rows[j];
        if(parlayEventKey(a)&&parlayEventKey(a)===parlayEventKey(b)) sameEventPairs++;
        if(String(a.player||'').toLowerCase()===String(b.player||'').toLowerCase()) samePlayerPairs++;
      }
    }
    return {sameEventPairs,samePlayerPairs,hasOverlap:sameEventPairs>0||samePlayerPairs>0};
  }

  function parlayBookCoverage(rows){
    const coverage=new Map();
    for(const row of rows){
      const seen=new Set();
      for(const book of row.books||[]){
        const key=String(book?.book||'').trim().toLowerCase();
        if(!key||seen.has(key)||!Number.isFinite(Number(book.price))||Number(book.price)===0) continue;
        seen.add(key);
        let item=coverage.get(key);
        if(!item){item={key,name:String(book.book),legs:[],complete:false,combinedDecimal:null,combinedAmerican:null};coverage.set(key,item);}
        item.legs.push({row,book});
      }
    }
    const items=[...coverage.values()];
    for(const item of items){
      item.complete=rows.length>0&&item.legs.length===rows.length;
      if(item.complete){
        let decimal=1;
        for(const leg of item.legs){
          const d=americanToDecimal(leg.book.price);
          if(!d){decimal=null;break;}
          decimal*=d;
        }
        item.combinedDecimal=decimal;
        item.combinedAmerican=decimalToAmerican(decimal);
      }
    }
    return items.sort((a,b)=>{
      if(a.complete!==b.complete) return a.complete?-1:1;
      if(a.complete&&b.complete) return Number(b.combinedDecimal||0)-Number(a.combinedDecimal||0);
      return b.legs.length-a.legs.length;
    });
  }

  function parlayCombinedMath(rows){
    let model=1,market=1;
    let modelValid=rows.length>0,marketValid=rows.length>0;
    for(const row of rows){
      const mp=Number(row?.model?.probabilityPct),ip=Number(row.impliedPct);
      if(Number.isFinite(ip))market*=ip/100;else marketValid=false;
      if(Number.isFinite(mp))model*=mp/100;else modelValid=false;
    }
    const marketPct=marketValid?market*100:null;
    const modelPct=modelValid?model*100:null;
    return {modelPct,marketPct,deltaPct:Number.isFinite(modelPct)&&Number.isFinite(marketPct)?modelPct-marketPct:null};
  }

  function parlayLegMarkup(row,index,weakKey){
    const model=row.model||null;
    const hasModel=Number.isFinite(Number(model?.probabilityPct));
    const edge=hasModel?Number(model.edgePct):null;
    const weak=hasModel&&String(row.key)===String(weakKey);
    return '<div class="parlay-leg '+(weak?'parlay-leg--weak':hasModel?'parlay-leg--strong':'parlay-leg--market')+'" data-parlay-leg-key="'+esc(row.key)+'">'
      +'<div class="parlay-leg-index">'+String(index+1).padStart(2,'0')+'</div>'
      +'<div class="parlay-leg-main"><div class="parlay-leg-identity">'+propHeadshotMarkup(row,'parlay-leg-headshot')+'<div>'
        +'<div class="parlay-leg-meta"><span>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+'</span><b>'+(weak?'WEAKEST EDGE':hasModel?esc(modelTagText(row)):'MARKET ONLY')+'</b></div>'
        +'<h3>'+esc(row.player)+' · '+esc(propSelectionText(row))+'</h3>'
        +'<small>'+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+' · exact selection</small>'
      +'</div></div>'
      +'<div class="parlay-leg-metrics">'
        +'<span><small>MODEL</small><b>'+(hasModel?pct1(model.probabilityPct):'—')+'</b></span>'
        +'<span><small>MARKET</small><b>'+pct1(row.impliedPct)+'</b></span>'
        +'<span><small>EDGE</small><b class="'+(hasModel?(edge>=0?'positive':'negative'):'')+'">'+(hasModel?edgeText(edge):'—')+'</b></span>'
        +'<span><small>BOOKS</small><b>'+esc(row.bookCount||row.books?.length||1)+'</b></span>'
      +'</div></div>'
      +'<div class="parlay-leg-price"><span>BEST</span><strong>'+esc(americanPrice(row.price))+'</strong><small>'+esc(row.book||'BOOK')+'</small></div>'
      +'<button class="parlay-leg-remove" data-parlay-remove="'+esc(row.key)+'" aria-label="Remove '+esc(row.player)+'">×</button>'
    +'</div>';
  }

  function parlaySuggestionMarkup(row,label='COMPATIBLE'){
    const hasModel=Number.isFinite(Number(row?.model?.probabilityPct));
    const edge=hasModel?Number(row.model.edgePct):null;
    return '<button class="parlay-suggestion-card" data-parlay-suggest="'+esc(row.key)+'">'
      +'<div><span>'+esc(leagueLabel(row.sport))+'</span><b>'+esc(hasModel?label:'MARKET ONLY')+'</b></div>'
      +propHeadshotMarkup(row,'parlay-suggestion-headshot')
      +'<h3>'+esc(row.player)+' · '+esc(row.marketLabel||row.market)+' '+esc(propSelectionText(row))+'</h3>'
      +'<p>'+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+' · exact selection</p>'
      +'<section><span><small>MODEL</small><b>'+(hasModel?pct1(row.model.probabilityPct):'—')+'</b></span><span><small>EDGE</small><b class="'+(hasModel?(edge>=0?'positive':'negative'):'')+'">'+(hasModel?edgeText(edge):'—')+'</b></span><span><small>BEST</small><b>'+esc(americanPrice(row.price))+'</b></span></section>'
      +'<i>＋ ADD EXACT LEG</i>'
    +'</button>';
  }

  function renderParlaySuggestions(root,rows){
    const node=root.querySelector('[data-parlay-suggestions]');
    if(!node) return;
    const selectedKeys=rows.map(row=>String(row.key));
    const selectedPlayers=new Set(rows.map(row=>String(row.player||'').toLowerCase()));
    const selectedEvents=new Set(rows.map(parlayEventKey).filter(Boolean));
    const all=parlayCandidateRows(selectedKeys);
    const safe=all.filter(row=>!selectedPlayers.has(String(row.player||'').toLowerCase())&&(!parlayEventKey(row)||!selectedEvents.has(parlayEventKey(row))));
    const visible=(safe.length?safe:all).slice(0,6);
    const modeled=visible.filter(row=>Number.isFinite(Number(row?.model?.probabilityPct))).length;
    node.innerHTML=visible.length ? visible.map(row=>parlaySuggestionMarkup(row,safe.includes(row)?'NO SAME EVENT':'REVIEW OVERLAP')).join('') : '<div class="live-board-loading home-model-empty--wide"><div><b>No additional exact selections for this filter.</b><small>Open Player Props to choose another verified leg.</small></div></div>';
    const title=root.querySelector('[data-parlay-suggestions-title]');
    if(title) title.textContent=visible.length?(modeled===visible.length?visible.length+' exact model suggestions':visible.length+' exact market suggestions'):'No exact suggestions';
  }

  function renderParlayReplacements(root,rows,weakest){
    const node=root.querySelector('[data-parlay-replacements]');
    const title=root.querySelector('[data-parlay-weakest-title]');
    if(!node) return;
    if(!weakest){
      node.innerHTML='<div class="live-board-loading home-model-empty--wide"><div><b>Add at least one modeled leg to compare replacements.</b></div></div>';
      if(title) title.textContent='No leg selected';
      return;
    }
    if(title) title.textContent=weakest.player+' · '+edgeText(weakest.model?.edgePct)+' edge';
    const other=rows.filter(row=>String(row.key)!==String(weakest.key));
    const otherPlayers=new Set(other.map(row=>String(row.player||'').toLowerCase()));
    const otherEvents=new Set(other.map(parlayEventKey).filter(Boolean));
    const candidates=parlayCandidateRows(rows.map(row=>String(row.key))).filter(row=>!otherPlayers.has(String(row.player||'').toLowerCase())&&(!parlayEventKey(row)||!otherEvents.has(parlayEventKey(row))));
    const weakEdge=Number(weakest.model?.edgePct),weakProb=Number(weakest.model?.probabilityPct);
    const safer=candidates.find(row=>Number(row.model?.probabilityPct)>weakProb);
    const moreEdge=candidates.find(row=>Number(row.model?.edgePct)>weakEdge&&String(row.key)!==String(safer?.key));
    const replacements=[safer,moreEdge].filter(Boolean);
    node.innerHTML='<article class="parlay-replace-current"><div class="parlay-replace-label">CURRENT WEAKEST EDGE</div><span>'+esc(leagueLabel(weakest.sport))+' · '+esc(weakest.marketLabel||weakest.market)+'</span>'
      +propHeadshotMarkup(weakest,'parlay-card-headshot')+'<h3>'+esc(weakest.player)+'</h3><p>'+esc(propSelectionText(weakest))+' · '+esc(americanPrice(weakest.price))+' '+esc(weakest.book||'')+'</p>'
      +'<div><span>MODEL</span><b>'+pct1(weakest.model?.probabilityPct)+'</b></div><div><span>EDGE</span><b class="'+(weakEdge>=0?'positive':'negative')+'">'+edgeText(weakEdge)+'</b></div></article>'
      +'<div class="parlay-replace-arrow">→</div>'
      +(replacements.length?replacements.map((row,i)=>{
        const edge=Number(row.model?.edgePct);
        return '<button class="parlay-replacement-card" data-parlay-replace="'+esc(row.key)+'" data-parlay-replace-old="'+esc(weakest.key)+'"><span class="parlay-replacement-badge">'+(i===0?'HIGHER MODEL PROB':'MORE EDGE')+'</span><small>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+'</small>'
          +propHeadshotMarkup(row,'parlay-card-headshot')+'<h3>'+esc(row.player)+' · '+esc(propSelectionText(row))+'</h3>'
          +'<div><span>MODEL</span><b>'+pct1(row.model?.probabilityPct)+'</b></div><div><span>EDGE</span><b class="'+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</b></div>'
          +'<strong>'+esc(americanPrice(row.price))+'</strong><em>REPLACE EXACT LEG →</em></button>';
      }).join(''):'<div class="home-model-empty"><b>No cleaner replacement found.</b><small>Current filter has no unselected candidate with a higher model probability or edge.</small></div>');
  }

  function renderParlayBooks(root,rows){
    const node=root.querySelector('[data-parlay-books]');
    const title=root.querySelector('[data-parlay-book-title]');
    if(!node) return;
    if(rows.length<2){
      node.innerHTML='<div class="live-board-loading"><div><b>Add at least 2 exact legs for sportsbook comparison.</b></div></div>';
      if(title) title.textContent='Exact-leg coverage by sportsbook';
      return;
    }
    const books=parlayBookCoverage(rows);
    const complete=books.filter(x=>x.complete);
    if(title) title.textContent=complete.length ? rows.length+' exact legs · '+complete.length+' complete sportsbook'+(complete.length===1?'':'s') : rows.length+' exact legs · no common sportsbook';
    const visible=(complete.length?complete:books).slice(0,7);
    if(!visible.length){
      node.innerHTML='<div class="live-board-loading"><div><b>No sportsbook coverage returned for these legs.</b></div></div>';
      return;
    }
    node.innerHTML=visible.map((item,i)=>{
      const links=item.legs.map(x=>x.book.link).filter(Boolean);
      const initials=item.name.split(/\s+/).map(x=>x[0]).join('').slice(0,3).toUpperCase();
      const coverage=item.legs.length+'/'+rows.length;
      return '<div class="parlay-book-row '+(item.complete&&i===0?'is-best':'')+'"><span class="parlay-book-name">'+esc(initials)+'</span><div><b>'+esc(item.name)+'</b><small>'+coverage+' exact legs · '+links.length+' native selection link'+(links.length===1?'':'s')+'</small></div>'
        +'<strong>'+(item.complete?esc(americanPrice(item.combinedAmerican)):'—')+'</strong>'
        +'<span class="'+(item.complete&&i===0?'parlay-book-value':'')+'">'+(item.complete?(i===0?'BEST DERIVED PRICE*':'COMPLETE COVERAGE'):'PARTIAL COVERAGE')+'</span>'
        +'<button data-parlay-book-open="'+esc(item.key)+'" '+(!links.length?'disabled':'')+'>'+(links.length?'OPEN EXACT LINKS →':'NO LINKS')+'</button></div>';
    }).join('');
  }

  function bindParlayGeneratedActions(){
    document.querySelectorAll('[data-parlay-remove]').forEach(btn=>btn.onclick=()=>{
      parlayLegKeys=parlayLegKeys.filter(key=>String(key)!==String(btn.dataset.parlayRemove));
      renderParlayLab();
    });
    document.querySelectorAll('[data-parlay-suggest]').forEach(btn=>btn.onclick=()=>{
      const key=String(btn.dataset.parlaySuggest||'');
      if(key&&!parlayLegKeys.includes(key)&&parlayLegKeys.length<8) parlayLegKeys.push(key);
      renderParlayLab();
    });
    document.querySelectorAll('[data-parlay-replace]').forEach(btn=>btn.onclick=()=>{
      const next=String(btn.dataset.parlayReplace||''),old=String(btn.dataset.parlayReplaceOld||'');
      const i=parlayLegKeys.findIndex(key=>String(key)===old);
      if(i>=0&&next) parlayLegKeys[i]=next;
      renderParlayLab();
    });
    document.querySelectorAll('[data-parlay-book-open]').forEach(btn=>btn.onclick=()=>{
      const key=String(btn.dataset.parlayBookOpen||'');
      const item=parlayBookCoverage(parlayLegRows()).find(x=>x.key===key);
      const links=(item?.legs||[]).map(x=>x.book.link).filter(Boolean);
      if(!links.length) return;
      links.forEach(link=>window.open(link,'_blank','noopener'));
      notify('Opened '+links.length+' exact '+item.name+' selection link'+(links.length===1?'':'s')+'.');
    });
    document.querySelectorAll('[data-route-jump]').forEach(btn=>{btn.onclick=()=>setRoute(btn.dataset.routeJump)});
    bindMediaFallbacks();
  }

  function renderParlayLab(){
    const root=document.querySelector('[data-parlays-route]');
    if(currentRoute!=='parlays'||!root||!propsFeedCache) return;
    fillParlayToTarget(parlayTarget);
    const rows=parlayLegRows();
    const sortedWeak=rows.filter(row=>Number.isFinite(Number(row?.model?.edgePct))).sort((a,b)=>Number(a.model?.edgePct)-Number(b.model?.edgePct));
    const weakest=sortedWeak[0]||null;
    const marketOnlyCount=rows.filter(row=>!Number.isFinite(Number(row?.model?.probabilityPct))).length;
    const newest=propsNewestTimestamp(parlayRows());
    const freshness=freshnessLabel(newest);
    const allBooks=new Set();
    parlayRows().forEach(row=>(row.books||[]).forEach(book=>{if(book?.book)allBooks.add(String(book.book))}));

    const status=root.querySelector('[data-parlay-status]');
    if(status) status.innerHTML='<div><span class="parlays-preview-dot"></span><b>REAL EXACT-SELECTION FEED</b><small>'+esc(freshness.label)+(newest?' · '+esc(ageText(newest))+' old':'')+'</small></div><span class="parlays-status-divider"></span><div><b>'+parlayRows().length+' EXACT</b><small>'+autoParlayRows().length+' modeled</small></div><span class="parlays-status-divider"></span><div><b>'+allBooks.size+' BOOKS</b><small>verified exact prices</small></div><span class="parlays-status-divider"></span><div><b>NO SUBSTITUTIONS</b><small>same line + side only</small></div>';

    const legs=root.querySelector('[data-parlay-legs]');
    if(legs) legs.innerHTML=rows.length ? rows.map((row,i)=>parlayLegMarkup(row,i,weakest?.key)).join('') : '<div class="live-board-loading"><div><b>No exact selections in the current build.</b><small>Add verified props from the Player Prop Tool. Model probabilities remain blank for market-only legs.</small></div></div>';
    const buildTitle=root.querySelector('[data-parlay-build-title]');
    if(buildTitle) buildTitle.textContent=rows.length+'-leg exact '+(marketOnlyCount?'selection':'model')+' parlay';

    root.querySelectorAll('[data-parlay-target]').forEach(btn=>btn.classList.toggle('is-active',Number(btn.dataset.parlayTarget)===parlayTarget));

    const math=parlayCombinedMath(rows);
    const overlap=parlayOverlapInfo(rows);
    const coverage=parlayBookCoverage(rows);
    const bestCommon=coverage.find(x=>x.complete)||null;

    const legTotal=root.querySelector('[data-parlay-leg-total]');
    if(legTotal) legTotal.textContent=String(rows.length);
    const ring=root.querySelector('[data-parlay-ring]');
    if(ring){
      const completePct=rows.length?Math.round((rows.filter(row=>(row.books||[]).length>0).length/rows.length)*100):0;
      ring.style.background='conic-gradient(#7b5cff 0 '+completePct+'%,rgba(255,255,255,.07) '+completePct+'% 100%)';
    }
    const combinedPrice=root.querySelector('[data-parlay-combined-price]');
    if(combinedPrice) combinedPrice.textContent=bestCommon?americanPrice(bestCommon.combinedAmerican):'NO COMMON BOOK';
    const modelProb=root.querySelector('[data-parlay-model-prob]');
    if(modelProb) modelProb.textContent=Number.isFinite(math.modelPct)?pct1(math.modelPct):'—';
    const marketProb=root.querySelector('[data-parlay-market-prob]');
    if(marketProb) marketProb.textContent=Number.isFinite(math.marketPct)?pct1(math.marketPct):'—';
    const combinedEdge=root.querySelector('[data-parlay-combined-edge]');
    if(combinedEdge){
      combinedEdge.textContent=Number.isFinite(math.deltaPct)?edgeText(math.deltaPct):'—';
      combinedEdge.className=Number.isFinite(math.deltaPct)?(Number(math.deltaPct)>=0?'positive':'negative'):'';
    }

    const healthTitle=root.querySelector('[data-parlay-health-title]');
    const healthCopy=root.querySelector('[data-parlay-health-copy]');
    if(healthTitle) healthTitle.textContent=!rows.length?'No legs yet':marketOnlyCount?'Exact build · market-only leg'+(marketOnlyCount===1?'':'s'):overlap.hasOverlap?'Exact legs · review overlap':bestCommon?'Exact build ready':'Exact legs · split books';
    if(healthCopy) healthCopy.textContent=!rows.length?'Add exact selections from Player Props.':marketOnlyCount?marketOnlyCount+' leg'+(marketOnlyCount===1?' is':'s are')+' market-only, so TSO leaves combined model probability and model delta blank instead of inventing them.':overlap.hasOverlap?'Same-event or same-player overlap exists. Combined probability remains an unadjusted independent estimate.':bestCommon?'All legs exist exactly at '+bestCommon.name+'. Combined probability is still labeled as an independent-leg estimate.':'The legs are exact, but no single sportsbook currently carries every exact selection.';

    const checks=root.querySelector('[data-parlay-checks]');
    if(checks){
      const exactCount=rows.filter(row=>(row.books||[]).length>0).length;
      checks.innerHTML='<div class="'+(exactCount===rows.length&&rows.length?'is-good':'is-warn')+'"><span>'+(exactCount===rows.length&&rows.length?'✓':'!')+'</span><div><b>Exact lines verified</b><small>'+exactCount+'/'+rows.length+' legs have verified exact sportsbook selections.</small></div></div>'
        +'<div class="'+(overlap.hasOverlap?'is-warn':'is-good')+'"><span>'+(overlap.hasOverlap?'!':'✓')+'</span><div><b>Dependency check</b><small>'+(overlap.hasOverlap?(overlap.sameEventPairs+' same-event pair(s), '+overlap.samePlayerPairs+' same-player pair(s). Review correlation manually.'):'No same-event or same-player overlap detected. This is not a full correlation model.')+'</small></div></div>'
        +'<div class="'+(bestCommon?'is-good':'is-warn')+'"><span>'+(bestCommon?'✓':'!')+'</span><div><b>Common sportsbook</b><small>'+(bestCommon?bestCommon.name+' carries every exact leg at the displayed thresholds.':'No sportsbook in the feed currently carries every exact leg.')+'</small></div></div>'
        +(weakest?'<div class="is-warn"><span>↘</span><div><b>Weakest real edge</b><small>'+esc(weakest.player)+' '+esc(propSelectionText(weakest))+' · '+edgeText(weakest.model?.edgePct)+'</small></div></div>':'');
    }

    renderParlayReplacements(root,rows,weakest);
    renderParlaySuggestions(root,rows);
    renderParlayBooks(root,rows);
    bindParlayGeneratedActions();
  }

  function currentCommunityModelRows(){
    return sortPropsRows(allModeledRows().filter(row=>currentLeague==='all'||row.sport===currentLeague));
  }

  function communityPulseMarkup(row,index){
    const edge=Number(row?.model?.edgePct);
    return '<article class="post-card panel community-pulse-card" data-community-model-key="'+esc(row.key)+'">'
      +'<div class="post-head community-pulse-head"><span class="community-system-avatar">TSO</span><div><b>Outpost Model Pulse</b><small>'+esc(leagueLabel(row.sport))+' · '+esc(ageText(row.snapshotTime))+' snapshot</small></div><span class="community-signal-rank">#'+String(index+1).padStart(2,'0')+'</span></div>'
      +'<p>'+esc(row.player)+' currently has one of the strongest exact model-to-market edges in the '+esc(currentLeague==='all'?'TSO board':leagueLabel(currentLeague)+' board')+'.</p>'
      +'<div class="shared-pick community-real-pick">'
        +'<span class="league-badge">'+esc(leagueLabel(row.sport))+'</span>'
        +'<div><b>'+esc(row.player)+' · '+esc(row.marketLabel||row.market)+' · '+esc(propSelectionText(row))+'</b><small>Model '+pct1(row.model?.probabilityPct)+' · Market '+pct1(row.impliedPct)+' · '+esc(row.book||'verified book')+'</small></div>'
        +'<strong class="'+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</strong>'
      +'</div>'
      +'<div class="community-pulse-meta"><span><small>BEST PRICE</small><b>'+esc(americanPrice(row.price))+'</b></span><span><small>MODEL SOURCE</small><b>'+esc(modelSourceText(row))+'</b></span><span><small>BOOKS</small><b>'+esc(row.bookCount||row.books?.length||1)+'</b></span></div>'
      +'<div class="post-actions community-pulse-actions"><button data-community-open-model>OPEN MODEL →</button><button data-community-open-prop>OPEN PROP BOARD →</button></div>'
    +'</article>';
  }

  function renderCommunity(){
    const root=document.querySelector('[data-community-route]');
    if(currentRoute!=='community'||!root||!propsFeedCache) return;
    const rows=currentCommunityModelRows();
    const newest=propsNewestTimestamp(rows);
    const freshness=freshnessLabel(newest);
    const sports=new Set(rows.map(row=>row.sport));
    const status=root.querySelector('[data-community-status]');
    if(status){
      status.innerHTML='<div><span class="props-live-dot"></span><b>REAL OUTPOST MODEL PULSE</b><small>'+esc(freshness.label)+(newest?' · '+esc(ageText(newest))+' old':'')+'</small></div><span class="props-status-divider"></span><div><b>'+rows.length+' SIGNALS</b><small>exact model matches</small></div><span class="props-status-divider"></span><div><b>'+sports.size+' MODELED SPORTS</b><small>real feed only</small></div><span class="props-status-divider"></span><div><b>MEMBER POSTS OFFLINE</b><small>no simulated activity</small></div>';
    }
    const feed=root.querySelector('[data-community-feed]');
    if(feed){
      feed.innerHTML=rows.length
        ? rows.slice(0,6).map(communityPulseMarkup).join('')
        : '<div class="live-board-loading community-feed-loading panel"><div><b>No exact model signals for this filter.</b><small>TSO will not fill Community with fake member posts.</small></div></div>';
    }
    root.querySelectorAll('[data-community-open-model]').forEach(btn=>btn.onclick=()=>setRoute('models'));
    root.querySelectorAll('[data-community-open-prop]').forEach(btn=>btn.onclick=()=>setRoute('props'));
    root.querySelectorAll('[data-route-jump]').forEach(btn=>{btn.onclick=()=>setRoute(btn.dataset.routeJump)});
    bindMediaFallbacks();
  }

  function rankingsPodiumCard(row,rank){
    if(!row) return '';
    const edge=Number(row?.model?.edgePct);
    return '<article class="'+(rank===1?'winner':'')+'"><span>'+rank+'</span>'
      +propHeadshotMarkup(row,'rankings-podium-headshot')
      +'<b>'+esc(row.player)+'</b>'
      +'<small>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+' · '+esc(propSelectionText(row))+'</small>'
      +'<strong class="rankings-podium-edge '+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</strong>'
    +'</article>';
  }

  function renderLeaderboard(){
    const root=document.querySelector('[data-leaderboard-route]');
    if(currentRoute!=='leaderboard'||!root||!propsFeedCache) return;
    const rows=currentCommunityModelRows();
    const newest=propsNewestTimestamp(rows);
    const freshness=freshnessLabel(newest);
    const status=root.querySelector('[data-rankings-status]');
    if(status){
      status.innerHTML='<div><span class="props-live-dot"></span><b>REAL MODEL RANKING</b><small>'+esc(freshness.label)+(newest?' · '+esc(ageText(newest))+' old':'')+'</small></div><span class="props-status-divider"></span><div><b>'+rows.length+' EXACT MATCHES</b><small>ranked by model edge</small></div><span class="props-status-divider"></span><div><b>USER STANDINGS OFFLINE</b><small>verified history required</small></div><span class="props-status-divider"></span><div><b>NO FAKE RECORDS</b><small>0 simulated users</small></div>';
    }

    const title=root.querySelector('[data-rankings-title]');
    if(title) title.textContent=rows.length?(currentLeague==='all'?'All sports':leagueLabel(currentLeague))+' · '+rows.length+' exact model matches':'No modeled rows for this filter';

    const podium=root.querySelector('[data-rankings-podium]');
    if(podium){
      if(rows.length){
        const first=rows[0],second=rows[1],third=rows[2];
        podium.innerHTML=rankingsPodiumCard(second,2)+rankingsPodiumCard(first,1)+rankingsPodiumCard(third,3);
      }else{
        podium.innerHTML='<div class="live-board-loading home-model-empty--wide"><div><b>No model ranking available for this filter.</b><small>User standings remain offline until real tracked-pick history exists.</small></div></div>';
      }
    }

    const board=root.querySelector('[data-rankings-board]');
    if(board){
      board.innerHTML=rows.length ? rows.slice(0,25).map((row,i)=>{
        const edge=Number(row?.model?.edgePct);
        return '<button class="leader-row rankings-model-row" data-rankings-open-model>'
          +'<b>'+String(i+1).padStart(2,'0')+'</b>'
          +'<span>'+propHeadshotMarkup(row,'rankings-row-headshot')+'<span><strong>'+esc(row.player)+'</strong><small>'+esc(row.marketLabel||row.market)+'</small></span></span>'
          +'<em>'+esc(leagueLabel(row.sport))+'</em>'
          +'<em>'+esc(propSelectionText(row))+'</em>'
          +'<strong>'+pct1(row.model?.probabilityPct)+'</strong>'
          +'<span class="rankings-edge '+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</span>'
        +'</button>';
      }).join('') : '<div class="live-board-loading"><div><b>No exact model rows for this filter.</b></div></div>';
    }
    root.querySelectorAll('[data-rankings-open-model]').forEach(btn=>btn.onclick=()=>setRoute('models'));
    root.querySelectorAll('[data-route-jump]').forEach(btn=>{btn.onclick=()=>setRoute(btn.dataset.routeJump)});
    bindMediaFallbacks();
  }

  function profileRows(){
    return (propsFeedCache?.rows||[]).filter(row=>currentLeague==='all'||row.sport===currentLeague);
  }

  function profileModelRows(){
    return sortPropsRows(profileRows().filter(row=>Number.isFinite(Number(row?.model?.probabilityPct))));
  }

  function profileSignalMarkup(row,index){
    const edge=Number(row?.model?.edgePct);
    const tone=homeModelTone(row,index);
    return '<article class="profile-signal-card '+tone+'-card" data-profile-open-model>'
      +'<div class="concept-card-accent"></div>'
      +'<div class="profile-signal-top"><span>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+'</span><b>'+esc(modelTagText(row))+'</b></div>'
      +'<div class="profile-signal-player">'+propHeadshotMarkup(row,'profile-signal-headshot')+'<div><h3>'+esc(row.player)+'</h3><small>'+esc(propSelectionText(row))+' · '+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+'</small></div></div>'
      +'<div class="profile-signal-metrics"><span><small>MODEL</small><b>'+pct1(row.model?.probabilityPct)+'</b></span><span><small>MARKET</small><b>'+pct1(row.impliedPct)+'</b></span><span><small>EDGE</small><b class="'+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</b></span></div>'
      +'<div class="profile-signal-footer"><span><small>BEST</small><b>'+esc(americanPrice(row.price))+' · '+esc(row.book||'—')+'</b></span><strong>OPEN MODEL →</strong></div>'
    +'</article>';
  }

  function renderProfile(){
    const root=document.querySelector('.profile-page[data-profile-route]');
    if(currentRoute!=='profile'||!root) return;

    const handle=currentUserHandle()||'account';
    const owner=isOwner();
    const initials=owner?'JT':handle.split(/[^a-z0-9]+/i).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'ME';
    const rows=profileRows();
    const modeled=profileModelRows();
    const books=new Set();
    rows.forEach(row=>(row.books||[{book:row.book}]).forEach(book=>{if(book?.book) books.add(String(book.book));}));
    const games=(liveFeedCache?.games||[]).filter(game=>currentLeague==='all'||game.league===currentLeague);
    const newest=propsNewestTimestamp(rows);
    const freshness=freshnessLabel(newest);

    const avatar=root.querySelector('[data-profile-avatar]');
    if(avatar) avatar.textContent=initials;
    const role=root.querySelector('[data-profile-role]');
    if(role) role.textContent=owner?'OWNER ACCOUNT':'MEMBER ACCOUNT';
    const handleNode=root.querySelector('[data-profile-handle]');
    if(handleNode) handleNode.textContent='@'+handle;
    const context=root.querySelector('[data-profile-context]');
    if(context) context.textContent=(currentLeague==='all'?'All Sports':leagueLabel(currentLeague))+' context · session identity present · pick history not connected';

    const setText=(sel,value)=>{const node=root.querySelector(sel);if(node)node.textContent=value;};
    setText('[data-profile-props]',propsFeedCache?String(rows.length):'—');
    setText('[data-profile-models]',propsFeedCache?String(modeled.length):'—');
    setText('[data-profile-books]',propsFeedCache?String(books.size):'—');
    setText('[data-profile-games]',liveFeedCache?String(games.length):'—');

    const status=root.querySelector('[data-profile-status]');
    if(status){
      const feedLabel=propsFeedCache&&liveFeedCache?'SPORTS DATA CONNECTED':propsFeedCache?'PROP DATA CONNECTED':liveFeedCache?'SCORE DATA CONNECTED':'CONNECTING SPORTS DATA';
      status.innerHTML='<div><span class="props-live-dot"></span><b>'+feedLabel+'</b><small>'+(newest?esc(freshness.label)+' · '+esc(ageText(newest))+' old':'waiting for verified snapshots')+'</small></div><span class="props-status-divider"></span><div><b>'+rows.length+' VERIFIED PROPS</b><small>'+modeled.length+' exact model matches</small></div><span class="props-status-divider"></span><div><b>PICK HISTORY OFFLINE</b><small>no fake record or streak</small></div><span class="props-status-divider"></span><div><b>ALERT STATE OFFLINE</b><small>no fake subscriptions</small></div>';
    }

    const identityState=root.querySelector('[data-profile-identity-state]');
    if(identityState) identityState.textContent=handle?'CONNECTED':'UNAVAILABLE';
    const feedState=root.querySelector('[data-profile-feed-state]');
    if(feedState){
      feedState.textContent=propsFeedCache&&liveFeedCache?'CONNECTED':propsFeedCache||liveFeedCache?'PARTIAL':'CONNECTING';
      feedState.classList.toggle('is-partial',Boolean((propsFeedCache||liveFeedCache)&&!(propsFeedCache&&liveFeedCache)));
    }

    const title=root.querySelector('[data-profile-signals-title]');
    if(title) title.textContent=modeled.length?(currentLeague==='all'?'All sports':leagueLabel(currentLeague))+' · top current model edges':'No exact model signals for this filter';
    const signals=root.querySelector('[data-profile-signals]');
    if(signals){
      signals.innerHTML=modeled.length
        ? modeled.slice(0,3).map(profileSignalMarkup).join('')
        : '<div class="live-board-loading home-model-empty--wide"><div><b>No exact model signals for this filter.</b><small>This area does not substitute fake tracked picks.</small></div></div>';
    }
    root.querySelectorAll('[data-profile-open-model]').forEach(btn=>btn.onclick=()=>setRoute('models'));
    root.querySelectorAll('[data-route-jump]').forEach(btn=>{btn.onclick=()=>setRoute(btn.dataset.routeJump)});
    bindMediaFallbacks();
  }

  function researchRowByKey(key){
    return (propsFeedCache?.rows||[]).find(row=>String(row.key)===String(key))||null;
  }

  function researchOpponentForRow(row){
    const team=String(row?.team||'').toUpperCase();
    const home=String(row?.homeTeam||'').toUpperCase();
    const away=String(row?.awayTeam||'').toUpperCase();
    if(team&&team===home)return row.awayTeam||'';
    if(team&&team===away)return row.homeTeam||'';
    return '';
  }

  function researchValue(value,digits=1,suffix=''){
    const n=Number(value);
    if(!Number.isFinite(n))return '—';
    const out=digits===0?Math.round(n).toLocaleString():n.toFixed(digits).replace(/\.0$/,'');
    return out+suffix;
  }

  function researchRate(value,digits=1){
    const n=Number(value);
    return Number.isFinite(n)?researchValue(n,digits):'—';
  }

  function researchAge(value){
    return value?ageText(value)+' old':'timestamp unavailable';
  }

  function researchDetailMetric(label,value,note=''){
    return '<span><small>'+esc(label)+'</small><b>'+esc(value==null||value===''?'—':value)+'</b>'+(note?'<em>'+esc(note)+'</em>':'')+'</span>';
  }

  function nflResearchDetail(data,row){
    const p=data.player||{},last=p.last5?.avg||{},cur=p.currentSeason?.perGame||{},prev=p.previousSeason?.perGame||{};
    const snap=p.snapTrend||{},allowed=p.matchup?.previousSeasonAllowed?.perGame||{};
    const injury=p.injury?.status||p.injury?.detail||null;
    const metrics=[
      ['L5 TARGETS',researchRate(last.targets), 'per game'],
      ['L5 RECEPTIONS',researchRate(last.receptions),'per game'],
      ['L5 REC YDS',researchRate(last.recYds),'per game'],
      ['L5 CARRIES',researchRate(last.carries),'per game'],
      ['L5 RUSH YDS',researchRate(last.rushYds),'per game'],
      ['L5 PASS YDS',researchRate(last.passYds),'per game'],
      ['L5 TD',researchRate(last.tds,2),'per game'],
      ['SNAP SHARE',researchValue(snap.avgOffensePct,1,'%'),'L5 avg']
    ].filter(x=>x[1]!=='—').slice(0,8);
    const season=[
      ['CUR TARGETS',researchRate(cur.targets),'per game'],
      ['CUR REC YDS',researchRate(cur.recYds),'per game'],
      ['CUR RUSH YDS',researchRate(cur.rushYds),'per game'],
      ['CUR PASS YDS',researchRate(cur.passYds),'per game'],
      ['PREV TARGETS',researchRate(prev.targets),'per game'],
      ['PREV REC YDS',researchRate(prev.recYds),'per game'],
      ['PREV RUSH YDS',researchRate(prev.rushYds),'per game'],
      ['PREV PASS YDS',researchRate(prev.passYds),'per game']
    ].filter(x=>x[1]!=='—').slice(0,8);
    const matchup=[
      ['OPP YDS',researchRate(allowed.yards),'pos group / game'],
      ['OPP TARGETS',researchRate(allowed.targets),'pos group / game'],
      ['OPP REC YDS',researchRate(allowed.recYds),'pos group / game'],
      ['OPP RUSH YDS',researchRate(allowed.rushYds),'pos group / game'],
      ['OPP TD',researchRate(allowed.tds,2),'pos group / game'],
      ['LAST SNAP %',researchValue(snap.lastOffensePct,1,'%'),'offense'],
      ['AVG SNAPS',researchRate(snap.avgOffenseSnaps),'L5 offense'],
      ['DEPTH',p.depth?.rank?('#'+p.depth.rank+' '+(p.depth.position||p.position||'')):(p.depth?.position||p.position||'—'),'current']
    ].filter(x=>x[1]!=='—').slice(0,8);
    const games=(p.gameLog||[]).slice(0,8).map(g=>'<div class="research-detail-log-row"><span>'+esc(g.date||('W'+(g.week||'')))+'</span><b>'+esc((g.team||p.team||'')+' vs '+(g.opponent||'—'))+'</b><em>'+esc('TGT '+researchRate(g.targets)+' · REC '+researchRate(g.receptions)+' · '+researchRate(g.recYds,0)+' REC YD · '+researchRate(g.rushYds,0)+' RUSH YD')+'</em></div>').join('');
    return '<section class="research-detail-status"><span class="deep-source-chip">NFLVERSE + ESPN</span><b>'+esc(p.rosterStatus||'Roster status unavailable')+'</b><small>'+esc(injury?('Injury: '+injury):'No current injury status attached')+'</small></section>'
      +'<section class="research-detail-block"><div class="research-detail-block-head"><span>RECENT FORM</span><b>Last five verified games</b></div><div class="research-detail-metrics">'+metrics.map(x=>researchDetailMetric(...x)).join('')+'</div></section>'
      +(season.length?'<section class="research-detail-block"><div class="research-detail-block-head"><span>SEASON PRODUCTION</span><b>Current + previous season</b></div><div class="research-detail-metrics">'+season.map(x=>researchDetailMetric(...x)).join('')+'</div></section>':'')
      +(matchup.length?'<section class="research-detail-block"><div class="research-detail-block-head"><span>ROLE + MATCHUP</span><b>'+esc(p.opponent?('vs '+p.opponent):'Verified context')+'</b></div><div class="research-detail-metrics">'+matchup.map(x=>researchDetailMetric(...x)).join('')+'</div></section>':'')
      +(games?'<section class="research-detail-block"><div class="research-detail-block-head"><span>GAME LOG</span><b>Most recent verified production</b></div><div class="research-detail-log">'+games+'</div></section>':'');
  }

  function nhlWindow(rows,count,key){
    const vals=(rows||[]).slice(0,count).map(g=>Number(g?.stats?.[key])).filter(Number.isFinite);
    return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
  }

  function nhlResearchDetail(data,row){
    const p=data.player||{},games=p.recentGames||[],rates=p.rates||{},d=data.opponentDefense||{};
    const metrics=[
      ['L5 SOG',researchRate(nhlWindow(games,5,'sog')),'per game'],
      ['L10 SOG',researchRate(nhlWindow(games,10,'sog')),'per game'],
      ['L30 SOG',researchRate(nhlWindow(games,30,'sog')),'per game'],
      ['L5 GOALS',researchRate(nhlWindow(games,5,'goals'),2),'per game'],
      ['L10 GOALS',researchRate(nhlWindow(games,10,'goals'),2),'per game'],
      ['L10 POINTS',researchRate(nhlWindow(games,10,'points'),2),'per game'],
      ['SEASON SOG',researchRate(rates.sog),'per game'],
      ['SHOOTING %',Number.isFinite(Number(p.shootingPct))?researchValue(Number(p.shootingPct)*100,1,'%'):'—','regressed rate']
    ].filter(x=>x[1]!=='—');
    const defense=[
      ['OPP GA',researchRate(d.recent10GoalsAllowedPerGame),'recent 10 / game'],
      ['OPP SHOTS',researchRate(d.recent10ShotsAllowedPerGame),'recent 10 / game'],
      ['GOAL INDEX',researchRate(d.recent10OverallIndex,2),'1.00 = league avg'],
      ['SHOT INDEX',researchRate(d.recent10ShotPaceIndex,2),'1.00 = league avg'],
      ['PP INDEX',researchRate(d.ppIndex,2),'1.00 = league avg'],
      ['OPP OFFENSE',researchRate(d.recent10OffenseIndex,2),'1.00 = league avg']
    ].filter(x=>x[1]!=='—');
    const logs=games.slice(0,10).map(g=>'<div class="research-detail-log-row"><span>'+esc(String(g.date||'').slice(0,10))+'</span><b>'+esc((g.team||'')+' '+(g.homeAway==='away'?'@':'vs')+' '+(g.opponent||'—'))+'</b><em>'+esc('SOG '+researchRate(g.stats?.sog,0)+' · G '+researchRate(g.stats?.goals,0)+' · A '+researchRate(g.stats?.assists,0)+' · PTS '+researchRate(g.stats?.points,0)+(g.firstGoal?' · FIRST GOAL':''))+'</em></div>').join('');
    return '<section class="research-detail-status"><span class="deep-source-chip">ESPN VERIFIED HISTORY</span><b>'+esc(games.length+' recent game'+(games.length===1?'':'s')+' loaded')+'</b><small>'+esc('Research snapshot '+researchAge(data.generatedAt))+'</small></section>'
      +'<section class="research-detail-block"><div class="research-detail-block-head"><span>FORM WINDOWS</span><b>L5 · L10 · L30</b></div><div class="research-detail-metrics">'+metrics.map(x=>researchDetailMetric(...x)).join('')+'</div></section>'
      +(defense.length?'<section class="research-detail-block"><div class="research-detail-block-head"><span>OPPONENT DEFENSE</span><b>'+esc(p.opponent||researchOpponentForRow(row)||'Current matchup')+'</b></div><div class="research-detail-metrics">'+defense.map(x=>researchDetailMetric(...x)).join('')+'</div></section>':'')
      +(logs?'<section class="research-detail-block"><div class="research-detail-block-head"><span>GAME LOG</span><b>Verified box-score history</b></div><div class="research-detail-log">'+logs+'</div></section>':'');
  }

  function mlbResearchDetail(data,row){
    const p=data.player||{},game=data.game||{},w=game.weather||{},venue=game.venue||{},opp=data.opponent||{},pitcher=opp.pitcher||{};
    const sc=p.statcast||{},l5=p.statcastL5||{},l10=p.statcastL10||{},bvp=p.vsPitcher||{};
    const weather=[
      ['TEMP',researchValue(w.tempF,0,'°F'),w.indoor?'indoor':'forecast'],
      ['WIND',researchValue(w.windMph,0,' mph'),w.wind?.label||''],
      ['PRECIP',researchValue(w.precipChance,0,'%'),'chance'],
      ['HUMIDITY',researchValue(w.humidity,0,'%'),''],
      ['PARK',venue.name||'—',venue.roof||''],
      ['STARTER',pitcher.name||'—',pitcher.throws?('throws '+pitcher.throws):'']
    ].filter(x=>x[1]!=='—');
    const statcast=[
      ['BARREL %',researchValue(sc.barrelPct,1,'%'),'season'],
      ['EXIT VELO',researchValue(sc.exitVelo,1,' mph'),'season'],
      ['HARD HIT',researchValue(sc.hardHitPct,1,'%'),'season'],
      ['xwOBA',researchRate(sc.xwoba,3),'season'],
      ['xSLG',researchRate(sc.xslg,3),'season'],
      ['SPRINT',researchValue(sc.sprintSpeed,1,' ft/s'),'season'],
      ['L5 BARREL',researchValue(l5.barrelPct,1,'%'),'recent'],
      ['L10 BARREL',researchValue(l10.barrelPct,1,'%'),'recent']
    ].filter(x=>x[1]!=='—');
    const bvpMetrics=[
      ['PA',researchRate(bvp.pa,0),'vs '+(pitcher.name||'starter')],
      ['HITS',researchRate(bvp.h,0),'head-to-head'],
      ['HR',researchRate(bvp.hr,0),'head-to-head'],
      ['AVG',researchRate(bvp.avg,3),'head-to-head'],
      ['OBP',researchRate(bvp.obp,3),'head-to-head'],
      ['SLG',researchRate(bvp.slg,3),'head-to-head']
    ].filter(x=>x[1]!=='—');
    const pitchTypes=Object.entries(p.detail?.pitchTypes||{}).map(([code,v])=>({code,...v})).sort((a,b)=>Number(b.seen||0)-Number(a.seen||0)).slice(0,6);
    const pitchMarkup=pitchTypes.map(pt=>'<div class="research-detail-pitch-row"><b>'+esc(pt.code)+'</b><span>'+esc(researchRate(pt.seen,0)+' seen')+'</span><em>'+esc('AVG '+researchRate(pt.avg,3)+' · EV '+researchRate(pt.ev)+' · WHIFF '+(Number.isFinite(Number(pt.whiffPct))?researchValue(pt.whiffPct,1,'%'):'—')+' · HR '+researchRate(pt.hr,0))+'</em></div>').join('');
    return '<section class="research-detail-status"><span class="deep-source-chip">MLB STATS + SAVANT + OPEN-METEO</span><b>'+esc((p.team||'MLB')+' · '+(p.position||'Player')+(p.battingOrder?' · batting #'+p.battingOrder:''))+'</b><small>'+esc('Slate '+researchAge(data.generatedAt)+(data.statcastEnrichedAt?' · Statcast '+researchAge(data.statcastEnrichedAt):''))+'</small></section>'
      +'<section class="research-detail-block"><div class="research-detail-block-head"><span>GAME ENVIRONMENT</span><b>'+esc(venue.name||'Current park')+'</b></div><div class="research-detail-metrics">'+weather.map(x=>researchDetailMetric(...x)).join('')+'</div></section>'
      +(statcast.length?'<section class="research-detail-block"><div class="research-detail-block-head"><span>STATCAST</span><b>Contact quality + recent windows</b></div><div class="research-detail-metrics">'+statcast.map(x=>researchDetailMetric(...x)).join('')+'</div></section>':'')
      +(bvpMetrics.length?'<section class="research-detail-block"><div class="research-detail-block-head"><span>BATTER VS STARTER</span><b>'+esc(pitcher.name||'Probable starter')+'</b></div><div class="research-detail-metrics">'+bvpMetrics.map(x=>researchDetailMetric(...x)).join('')+'</div></section>':'')
      +(pitchMarkup?'<section class="research-detail-block"><div class="research-detail-block-head"><span>PITCH-TYPE RESULTS</span><b>Recent Savant window</b></div><div class="research-detail-pitch-list">'+pitchMarkup+'</div></section>':'');
  }

  function researchDetailBody(data,row){
    if(!data?.available)return '<div class="research-detail-empty"><b>Deep research not available for this player yet.</b><small>'+esc(data?.reason||data?.error||'No verified detail source returned.')+'</small></div>';
    if(data.sport==='nfl')return nflResearchDetail(data,row);
    if(data.sport==='nhl')return nhlResearchDetail(data,row);
    if(data.sport==='mlb')return mlbResearchDetail(data,row);
    return '<div class="research-detail-empty"><b>Deep research source is not connected for '+esc(String(data.sport||row?.sport||'this sport').toUpperCase())+'.</b></div>';
  }

  function closeResearchDetail(){
    document.querySelector('.research-detail-overlay')?.remove();
    document.body.classList.remove('research-detail-open');
  }

  async function openResearchDetail(row){
    if(!row)return;
    closeResearchDetail();
    const opponent=researchOpponentForRow(row);
    const key=[row.sport,row.playerId||'',row.player,row.team||'',opponent].join('|');
    const overlay=document.createElement('div');
    overlay.className='research-detail-overlay';
    overlay.innerHTML='<div class="research-detail-shell" role="dialog" aria-modal="true">'
      +'<div class="research-detail-hero"><button class="research-detail-close" data-research-detail-close aria-label="Close">×</button>'
      +'<div class="research-detail-player">'+propHeadshotMarkup(row,'research-detail-headshot')+'<div><span>'+esc(leagueLabel(row.sport))+' DEEP RESEARCH</span><h2>'+esc(row.player)+'</h2><p>'+esc(row.marketLabel||row.market)+' · '+esc(propSelectionText(row))+' · '+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+'</p></div></div>'
      +'<div class="research-detail-market"><span><small>MODEL</small><b>'+pct1(row.model?.probabilityPct)+'</b></span><span><small>MARKET</small><b>'+pct1(row.impliedPct)+'</b></span><span><small>BEST</small><b>'+esc(americanPrice(row.price))+'</b><em>'+esc(row.book||'—')+'</em></span></div>'
      +'</div><div class="research-detail-content" data-research-detail-content><div class="live-board-loading research-detail-loading"><span class="live-feed-spinner"></span><div><b>Loading verified deep research…</b><small>TSO is reading the existing sport research feed for this player.</small></div></div></div>'
      +'<div class="research-detail-footer"><span>NO INVENTED CONTEXT · SOURCE-BACKED FIELDS ONLY</span><button data-research-detail-props>OPEN PROP BOARD →</button></div></div>';
    document.body.appendChild(overlay);
    document.body.classList.add('research-detail-open');
    overlay.querySelector('[data-research-detail-close]')?.addEventListener('click',closeResearchDetail);
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeResearchDetail();});
    overlay.querySelector('[data-research-detail-props]')?.addEventListener('click',()=>{closeResearchDetail();setRoute('props');});
    bindMediaFallbacks();

    const content=overlay.querySelector('[data-research-detail-content]');
    try{
      let payload=deepResearchCache.get(key);
      if(!payload){
        const qs=new URLSearchParams({sport:String(row.sport||''),playerId:String(row.playerId||''),name:String(row.player||''),team:String(row.team||''),opponent:String(opponent||''),eventId:String(row.eventId||'')});
        const response=await fetch('/api/research-detail?'+qs.toString(),{cache:'no-store'});
        payload=await response.json();
        if(!response.ok&&!payload?.reason)throw new Error(payload?.error||('Research HTTP '+response.status));
        deepResearchCache.set(key,payload);
      }
      if(content)content.innerHTML=researchDetailBody(payload,row);
    }catch(error){
      if(content)content.innerHTML='<div class="research-detail-empty"><b>Verified deep research could not be loaded.</b><small>'+esc(error?.message||String(error))+'</small></div>';
    }
  }

  function researchPropsRows(){
    return (propsFeedCache?.rows||[]).filter(row=>currentLeague==='all'||row.sport===currentLeague);
  }

  function researchGames(){
    return (liveFeedCache?.games||[]).filter(game=>currentLeague==='all'||game.league===currentLeague);
  }

  function researchSearchMatch(row,query){
    if(!query) return true;
    const haystack=[
      row.player,row.team,row.market,row.marketLabel,row.homeTeam,row.awayTeam,row.book,
      propSelectionText(row),leagueLabel(row.sport)
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(query);
  }

  function researchGameMatch(game,query){
    if(!query) return true;
    const haystack=[
      game.league,game.away?.abbr,game.away?.name,game.home?.abbr,game.home?.name,
      (game.away?.abbr||'')+' @ '+(game.home?.abbr||''),game.venue
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(query);
  }

  function researchPlayerGroups(rows){
    const groups=new Map();
    for(const row of rows){
      const key=String(row.sport)+'|'+String(row.player||'').toLowerCase();
      let g=groups.get(key);
      if(!g){
        g={key,sport:row.sport,player:row.player,headshotUrl:row.headshotUrl,playerId:row.playerId,team:row.team,rows:[],modeled:0,bestEdge:null,books:new Set()};
        groups.set(key,g);
      }
      g.rows.push(row);
      if(Number.isFinite(Number(row?.model?.probabilityPct))){
        g.modeled++;
        const edge=Number(row.model?.edgePct);
        if(Number.isFinite(edge)&&(g.bestEdge===null||edge>g.bestEdge)) g.bestEdge=edge;
      }
      for(const book of row.books||[{book:row.book}]) if(book?.book) g.books.add(String(book.book));
    }
    return [...groups.values()].sort((a,b)=>{
      if(b.modeled!==a.modeled) return b.modeled-a.modeled;
      if((b.bestEdge??-999)!==(a.bestEdge??-999)) return (b.bestEdge??-999)-(a.bestEdge??-999);
      if(b.rows.length!==a.rows.length) return b.rows.length-a.rows.length;
      return String(a.player).localeCompare(String(b.player));
    });
  }

  function researchPlayerMarkup(group,index){
    const row=sortPropsRows(group.rows)[0]||group.rows[0]||{};
    const edge=group.bestEdge;
    return '<button class="research-player-row research-player-row--live" data-research-detail-key="'+esc(row.key||'')+'">'
      +'<span class="research-player-rank">'+String(index+1).padStart(2,'0')+'</span>'
      +propHeadshotMarkup(row,'research-avatar')
      +'<div><b>'+esc(group.player)+'</b><small>'+esc(leagueLabel(group.sport))+' · '+group.rows.length+' exact selection'+(group.rows.length===1?'':'s')+' · '+group.modeled+' modeled</small></div>'
      +'<span class="research-opens research-depth-value">'+(Number.isFinite(edge)?edgeText(edge):group.books.size+' BOOK'+(group.books.size===1?'':'S'))+'</span>'
    +'</button>';
  }

  function researchGameMarkup(game){
    const state=gameShortState(game);
    const live=game.state==='in';
    const awayScore=game.state==='pre'?'—':esc(game.away?.score??0);
    const homeScore=game.state==='pre'?'—':esc(game.home?.score??0);
    return '<button class="research-radar-row research-game-row" data-research-game>'
      +'<span class="radar-tag '+(live?'radar-tag--usage':'radar-tag--pace')+'">'+esc(leagueLabel(game.league))+'</span>'
      +'<div class="research-game-teams"><b>'+teamLogoMarkup(game.away,'research-game-logo')+esc(game.away?.abbr||'AWAY')+' @ '+teamLogoMarkup(game.home,'research-game-logo')+esc(game.home?.abbr||'HOME')+'</b><small>'+esc(state)+' · '+esc(game.venue||'Venue pending')+'</small></div>'
      +'<span class="radar-value"><strong>'+awayScore+'–'+homeScore+'</strong><small>'+esc(gameStatusText(game))+'</small></span>'
      +'<span class="radar-arrow">↗</span>'
    +'</button>';
  }

  function researchResultMarkup(row){
    const model=row.model||null;
    const hasModel=Number.isFinite(Number(model?.probabilityPct));
    const edge=hasModel?Number(model.edgePct):null;
    return '<button class="research-result-row '+(hasModel?'has-model':'is-market-only')+'" data-research-detail-key="'+esc(row.key)+'">'
      +'<span class="research-result-player">'+propHeadshotMarkup(row,'research-result-headshot')+'<span><b>'+esc(row.player)+'</b><small>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+' · '+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+'</small></span></span>'
      +'<strong>'+esc(propSelectionText(row))+'</strong>'
      +'<span><small>MODEL</small><b>'+ (hasModel?pct1(model.probabilityPct):'—') +'</b></span>'
      +'<span><small>MARKET</small><b>'+pct1(row.impliedPct)+'</b></span>'
      +'<span><small>EDGE</small><b class="'+(hasModel?(edge>=0?'positive':'negative'):'')+'">'+(hasModel?edgeText(edge):'—')+'</b></span>'
      +'<span><small>BEST</small><b>'+esc(americanPrice(row.price))+'</b><em>'+esc(row.book||'—')+'</em></span>'
    +'</button>';
  }

  function researchSignalMarkup(row,index){
    const model=row.model||{};
    const edge=Number(model.edgePct);
    const tone=row.sport==='nhl'?'blue':row.sport==='nfl'?'gold':'orange';
    return '<article class="research-signal-card research-signal-card--'+tone+' research-signal-card--real">'
      +'<div class="research-signal-top"><span>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+'</span><b>'+esc(modelTagText(row))+'</b></div>'
      +'<div class="research-signal-player">'+propHeadshotMarkup(row,'research-signal-headshot')+'<div><h3>'+esc(row.player)+'</h3><small>'+esc(row.team||'PLAYER')+' · '+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+'</small></div><span class="research-score-badge"><small>MODEL</small><strong>'+pct1(model.probabilityPct)+'</strong></span></div>'
      +'<div class="research-stat-grid research-stat-grid--real"><span><small>EXACT</small><b>'+esc(propSelectionText(row))+'</b></span><span><small>MARKET</small><b>'+pct1(row.impliedPct)+'</b></span><span><small>EDGE</small><b class="'+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</b></span></div>'
      +'<div class="research-insight"><span>VERIFIED MARKET</span><b>'+esc(americanPrice(row.price))+' · '+esc(row.book||'Sportsbook')+'</b><small>'+esc(modelSourceText(row))+' · '+esc(row.bookCount||row.books?.length||1)+' sportsbook'+((row.bookCount||row.books?.length||1)===1?'':'s')+' on this exact selection.</small></div>'
      +'<button class="research-open-btn" data-research-detail-key="'+esc(row.key)+'">OPEN DEEP RESEARCH →</button>'
    +'</article>';
  }

  function renderResearch(){
    const root=document.querySelector('[data-research-route]');
    if(currentRoute!=='research'||!root) return;

    const query=String(researchQuery||'').trim().toLowerCase();
    const rows=researchPropsRows();
    const filteredRows=rows.filter(row=>researchSearchMatch(row,query));
    const games=researchGames();
    const filteredGames=games.filter(game=>researchGameMatch(game,query));
    const modeled=filteredRows.filter(row=>Number.isFinite(Number(row?.model?.probabilityPct)));
    const allModeled=rows.filter(row=>Number.isFinite(Number(row?.model?.probabilityPct)));
    const playerGroups=researchPlayerGroups(filteredRows);
    const books=new Set();
    filteredRows.forEach(row=>(row.books||[{book:row.book}]).forEach(book=>{if(book?.book)books.add(String(book.book));}));
    const newest=propsNewestTimestamp(filteredRows.length?filteredRows:rows);
    const freshness=freshnessLabel(newest);

    const input=root.querySelector('[data-research-search]');
    if(input&&input.value!==researchQuery) input.value=researchQuery;

    const status=root.querySelector('[data-research-status]');
    if(status){
      const playerCount=researchPlayerGroups(rows).length;
      status.innerHTML='<div><span class="props-live-dot"></span><b>REAL RESEARCH DATA</b><small>'+(newest?esc(freshness.label)+' · '+esc(ageText(newest))+' old':'verified feeds connected')+'</small></div><span class="props-status-divider"></span><div><b>'+playerCount+' PLAYERS</b><small>verified prop coverage</small></div><span class="props-status-divider"></span><div><b>'+games.length+' GAMES</b><small>current score feed</small></div><span class="props-status-divider"></span><div><b>'+allModeled.length+' MODELS</b><small>exact matches only</small></div>';
    }

    const gamesNode=root.querySelector('[data-research-games]');
    const gamesTitle=root.querySelector('[data-research-games-title]');
    if(gamesNode){
      const visible=sortedGames(filteredGames).slice(0,7);
      gamesNode.innerHTML=visible.length ? visible.map(researchGameMarkup).join('') : '<div class="live-board-loading"><div><b>No current games match'+(query?' “'+esc(researchQuery)+'”':' this filter')+'.</b><small>The score feed has no matching matchup.</small></div></div>';
      if(gamesTitle) gamesTitle.textContent=query?'Games matching “'+researchQuery+'”':"Today's verified matchups";
    }

    const playersNode=root.querySelector('[data-research-players]');
    const playerTitle=root.querySelector('[data-research-player-title]');
    if(playersNode){
      const visible=playerGroups.slice(0,7);
      playersNode.innerHTML=visible.length ? visible.map(researchPlayerMarkup).join('') : '<div class="live-board-loading"><div><b>No verified players match this search.</b></div></div>';
      if(playerTitle) playerTitle.textContent=query?'Player coverage matching search':'Strongest data depth';
    }

    const results=root.querySelector('[data-research-results]');
    const resultTitle=root.querySelector('[data-research-results-title]');
    if(results){
      const visible=sortPropsRows(filteredRows).slice(0,30);
      results.innerHTML=visible.length ? visible.map(researchResultMarkup).join('') : '<div class="live-board-loading"><div><b>No verified selections match this search.</b><small>Try a player, team, matchup, market or exact line.</small></div></div>';
      if(resultTitle) resultTitle.textContent=query?visible.length+' verified result'+(visible.length===1?'':'s')+' for “'+researchQuery+'”':'Top verified player-market results';
    }

    const signals=root.querySelector('[data-research-signals]');
    const signalTitle=root.querySelector('[data-research-signals-title]');
    if(signals){
      const visible=sortPropsRows(modeled).slice(0,3);
      signals.innerHTML=visible.length ? visible.map(researchSignalMarkup).join('') : '<div class="live-board-loading home-model-empty--wide"><div><b>No exact model matches for this search.</b><small>Verified market-only selections can still appear above.</small></div></div>';
      if(signalTitle) signalTitle.textContent=visible.length?'Strongest exact model gaps'+(query?' matching search':''):'No modeled signals for this filter';
    }

    const setText=(sel,val)=>{const n=root.querySelector(sel);if(n)n.textContent=val;};
    setText('[data-research-freshness]',newest?'SOURCE · '+ageText(newest).toUpperCase()+' OLD':'SOURCE TIMESTAMP UNAVAILABLE');
    setText('[data-research-selection-count]',String(filteredRows.length));
    setText('[data-research-model-count]',String(modeled.length));
    setText('[data-research-book-count]',String(books.size));

    const depth=root.querySelector('[data-research-sport-depth]');
    if(depth){
      const sportRows=['nhl','nfl','mlb','nba'].map(sport=>{
        const sr=(propsFeedCache?.rows||[]).filter(row=>row.sport===sport);
        const players=researchPlayerGroups(sr).length;
        const models=sr.filter(row=>Number.isFinite(Number(row?.model?.probabilityPct))).length;
        return {sport,selections:sr.length,players,models};
      }).filter(x=>currentLeague==='all'||x.sport===currentLeague);
      depth.innerHTML=sportRows.map(x=>'<button data-research-sport="'+esc(x.sport)+'"><span>'+esc(leagueLabel(x.sport))+'</span><div><b>'+x.selections+' selections</b><small>'+x.players+' players · '+(x.models?x.models+' exact model matches':'MARKET ONLY')+'</small></div><i>›</i></button>').join('');
    }

    root.querySelectorAll('[data-research-detail-key]').forEach(btn=>btn.onclick=event=>{
      event.stopPropagation();
      const row=researchRowByKey(btn.dataset.researchDetailKey);
      if(row)openResearchDetail(row);
    });
    root.querySelectorAll('[data-research-sport]').forEach(btn=>btn.onclick=()=>setLeague(btn.dataset.researchSport));
    root.querySelectorAll('[data-research-game]').forEach(btn=>btn.onclick=()=>setRoute('live'));
    root.querySelectorAll('[data-route-jump]').forEach(btn=>{btn.onclick=()=>setRoute(btn.dataset.routeJump)});
    bindMediaFallbacks();
  }

  function renderPropsMarketRail(root,rows){
    const rail=root.querySelector('[data-props-market-rail]');
    if(!rail)return;
    const all=(propsFeedCache?.rows||[]).filter(row=>currentLeague==='all'||row.sport===currentLeague);
    const counts=new Map();
    for(const row of all){
      const key=String(row.market||'');
      if(!key)continue;
      const item=counts.get(key)||{key,label:row.marketLabel||row.market,count:0,modeled:0};
      item.count++;
      if(Number.isFinite(Number(row?.model?.probabilityPct)))item.modeled++;
      counts.set(key,item);
    }
    const active=String(propsFilterState.market||'');
    const items=[...counts.values()].sort((a,b)=>b.count-a.count||String(a.label).localeCompare(String(b.label)));
    rail.innerHTML='<button class="props-market-chip '+(!active?'is-active':'')+'" data-props-market-chip=""><b>ALL MARKETS</b><span>'+all.length+'</span><small>'+all.filter(r=>Number.isFinite(Number(r?.model?.probabilityPct))).length+' modeled</small></button>'
      +items.map(item=>'<button class="props-market-chip '+(active===item.key?'is-active':'')+'" data-props-market-chip="'+esc(item.key)+'"><b>'+esc(String(item.label).toUpperCase())+'</b><span>'+item.count+'</span><small>'+item.modeled+' modeled</small></button>').join('');
    rail.querySelectorAll('[data-props-market-chip]').forEach(btn=>btn.onclick=()=>{
      propsFilterState.market=String(btn.dataset.propsMarketChip||'');
      renderPropsFeed();
    });
    const summary=root.querySelector('[data-props-filter-summary]');
    if(summary){
      const players=new Set(rows.map(r=>String(r.player||'').toLowerCase())).size;
      summary.textContent=rows.length+' selections · '+players+' players · '+items.length+' market'+(items.length===1?'':'s');
    }
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
    const visible=sortPropsToolRows(rows,propsSortMode(root)).slice(0,200);
    if(!visible.length){
      board.innerHTML='<div class="live-board-loading props-empty-board"><b>No verified sportsbook selections for '+esc(currentLeague==='all'?'this filter':leagueLabel(currentLeague))+'.</b></div>';
      return;
    }
    board.innerHTML=visible.map(row => {
      const model=row.model||null;
      const hasModel=Number.isFinite(Number(model?.probabilityPct));
      const edge=hasModel?Number(model.edgePct):null;
      const hasResearch=['nhl','nfl','mlb'].includes(String(row.sport));
      return '<div class="props-board-row props-board-row-live props-board-row-pro '+(hasModel?'has-model':'is-market-only')+'" data-props-row-key="'+esc(row.key)+'">'
        +'<span class="props-board-player props-board-player-live">'+propHeadshotMarkup(row,'props-board-headshot')+'<span><b>'+esc(row.player)+'</b><small>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+' · '+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+'</small></span></span>'
        +'<strong>'+esc(propSelectionText(row))+'</strong>'
        +'<strong class="'+(hasModel?'props-model-prob':'props-model-empty')+'">'+(hasModel?pct1(model.probabilityPct):'—')+'</strong>'
        +'<strong>'+esc(pct1(row.impliedPct))+'</strong>'
        +'<strong class="props-edge-value '+(hasModel?(edge>=0?'positive':'negative'):'')+'">'+(hasModel?edgeText(edge):'—')+'</strong>'
        +'<span class="props-model-tag '+(hasModel?modelTagClass(row):'is-market-only')+'">'+esc(hasModel?modelTagText(row):'MARKET ONLY')+'</span>'
        +'<span class="props-price"><b>'+esc(americanPrice(row.price))+'</b><small>'+esc(row.bookCount||row.books?.length||1)+' book'+((row.bookCount||row.books?.length||1)===1?'':'s')+'</small></span>'
        +'<strong class="props-book-name">'+esc(row.book||'—')+'</strong>'
        +'<span class="props-snapshot-age">'+esc(ageText(row.snapshotTime))+'</span>'
        +'<span class="props-row-actions">'
          +'<button data-props-compare="'+esc(row.key)+'">INTEL</button>'
          +'<button '+(hasResearch?'':'disabled')+' data-props-research="'+esc(row.key)+'">RESEARCH</button>'
          +'<button class="is-primary" data-props-parlay="'+esc(row.key)+'">+ PARLAY</button>'
        +'</span>'
      +'</div>';
    }).join('');
    bindPropsGeneratedActions();
    bindMediaFallbacks();
  }

  function syncPropsFilterOptions(root){
    const leagueRows=(propsFeedCache?.rows||[]).filter(row=>currentLeague==='all'||row.sport===currentLeague);
    const marketSelect=root.querySelector('[data-props-market-filter]');
    const bookSelect=root.querySelector('[data-props-book-filter]');
    const sideSelect=root.querySelector('[data-props-side-filter]');
    const modelSelect=root.querySelector('[data-props-model-filter]');
    const sortSelect=root.querySelector('[data-props-sort]');
    const searchInput=root.querySelector('[data-props-search]');

    const markets=[...new Map(leagueRows.map(r=>[String(r.market||''),r.marketLabel||r.market])).entries()]
      .filter(([value])=>value)
      .sort((a,b)=>String(a[1]).localeCompare(String(b[1])));
    const books=[...new Set(leagueRows.flatMap(row=>(row.books||[{book:row.book}]).map(b=>String(b?.book||'')).filter(Boolean)))]
      .sort((a,b)=>a.localeCompare(b));

    if(propsFilterState.market && !markets.some(([value])=>value===propsFilterState.market)) propsFilterState.market='';
    if(propsFilterState.book && !books.some(book=>book.toLowerCase()===propsFilterState.book)) propsFilterState.book='';

    if(marketSelect){
      marketSelect.innerHTML='<option value="">MARKET: ALL</option>'+markets.map(([value,label])=>'<option value="'+esc(value)+'">'+esc(String(label).toUpperCase())+'</option>').join('');
      marketSelect.value=propsFilterState.market;
    }
    if(bookSelect){
      bookSelect.innerHTML='<option value="">BOOK: ALL</option>'+books.map(book=>'<option value="'+esc(book.toLowerCase())+'">'+esc(book.toUpperCase())+'</option>').join('');
      bookSelect.value=propsFilterState.book;
    }
    if(sideSelect) sideSelect.value=propsFilterState.side;
    if(modelSelect) modelSelect.value=propsFilterState.model;
    if(sortSelect) sortSelect.value=propsFilterState.sort;
    if(searchInput && searchInput.value!==propsFilterState.search) searchInput.value=propsFilterState.search;
  }

  async function propResearchPayload(row){
    if(!row||!['nfl','nhl','mlb'].includes(String(row.sport)))return {available:false,sport:row?.sport||'',reason:'Verified game-log research is not connected for this sport yet'};
    const opponent=researchOpponentForRow(row);
    const key=['prop-rate',row.sport,row.playerId||'',row.player,row.team||'',opponent].join('|');
    if(deepResearchCache.has(key))return deepResearchCache.get(key);
    const qs=new URLSearchParams({sport:String(row.sport||''),playerId:String(row.playerId||''),name:String(row.player||''),team:String(row.team||''),opponent:String(opponent||''),eventId:String(row.eventId||'')});
    const response=await fetch('/api/research-detail?'+qs.toString(),{cache:'no-store'});
    const payload=await response.json();
    if(!response.ok&&!payload?.reason)throw new Error(payload?.error||('Research HTTP '+response.status));
    deepResearchCache.set(key,payload);
    return payload;
  }

  async function propHistoryPayload(row,book){
    const key=['prop-history',row?.sport,row?.eventId,row?.player,row?.market,row?.line,row?.side,book||''].join('|');
    if(propHistoryCache.has(key))return propHistoryCache.get(key);
    const qs=new URLSearchParams({
      sport:String(row?.sport||''),eventId:String(row?.eventId||''),player:String(row?.player||''),
      market:String(row?.market||''),line:String(row?.line??''),side:String(row?.side||'over'),book:String(book||'')
    });
    const response=await fetch('/api/prop-history?'+qs.toString(),{cache:'no-store'});
    const payload=await response.json();
    if(!response.ok&&!payload?.reason)throw new Error(payload?.error||('History HTTP '+response.status));
    propHistoryCache.set(key,payload);
    return payload;
  }

  function propSeriesForRow(data,row){
    if(!data?.available||!row)return [];
    const sport=String(row.sport||'').toLowerCase(),market=String(row.market||'');
    const out=[];
    if(sport==='nfl'){
      const p=data.player||{};
      if(market==='firstTd'){
        for(const g of p.periodGameLog||[])out.push({date:g.date||null,season:g.season??null,value:Number(g.firstTd||0),source:g.source||'ESPN play-by-play'});
        return out.filter(x=>Number.isFinite(x.value));
      }
      const field={rushYds:'rushYds',recYds:'recYds',receptions:'receptions',passYds:'passYds',passTds:'passTds',completions:'completions',atd:'tds'}[market];
      if(!field)return [];
      for(const g of p.gameLog||[]){
        const value=Number(g?.[field]);
        if(Number.isFinite(value))out.push({date:g.date||null,season:g.season??null,value,source:'nflverse game log'});
      }
      return out;
    }
    if(sport==='nhl'){
      const p=data.player||{};
      for(const g of p.recentGames||[]){
        let value=null;
        if(market==='atg'||market==='goals')value=Number(g?.stats?.goals);
        else if(market==='fgs')value=g?.firstGoal?1:0;
        else if(market==='sog')value=Number(g?.stats?.sog);
        else if(market==='assists')value=Number(g?.stats?.assists);
        else if(market==='points')value=Number(g?.stats?.points);
        else if(market==='blocks')value=Number(g?.stats?.blocks);
        else if(market==='saves')value=Number(g?.stats?.saves);
        if(Number.isFinite(value))out.push({date:g.date||null,season:g.season??null,value,source:g.source||'ESPN game summary'});
      }
      return out;
    }
    if(sport==='mlb'){
      const p=data.player||{};
      for(const g of p.gameLog||[]){
        let value=null;
        if(market==='homeRun'||market==='hr')value=Number(g.hr);
        else if(market==='hits')value=Number(g.h);
        else if(market==='totalBases')value=Number(g.totalBases);
        else if(market==='rbi')value=Number(g.rbi);
        else if(market==='runs')value=Number(g.r);
        else if(market==='hrr')value=Number(g.h)+Number(g.r)+Number(g.rbi);
        else if(market==='singles')value=Number(g.singles);
        else if(market==='doubles')value=Number(g.doubles);
        else if(market==='triples')value=Number(g.triples);
        else if(market==='walks')value=Number(g.walks);
        else if(market==='batterStrikeouts')value=Number(g.strikeouts);
        else if(market==='stolenBases')value=Number(g.stolenBases);
        if(Number.isFinite(value))out.push({date:g.date||null,season:data?.player?.gameLogCoverage?.season??null,value,source:g.source||data?.player?.gameLogCoverage?.source||'MLB Stats API'});
      }
      return out;
    }
    return [];
  }

  function propWindowStats(series,row,count=null){
    const rows=count?series.slice(0,count):series;
    const line=Number(row?.line);
    if(!rows.length||!Number.isFinite(line))return null;
    let hits=0,losses=0,pushes=0,sum=0;
    for(const item of rows){
      const v=Number(item.value);if(!Number.isFinite(v))continue;
      sum+=v;
      if(Math.abs(v-line)<1e-9){pushes++;continue;}
      const hit=row.side==='under'?v<line:v>line;
      if(hit)hits++;else losses++;
    }
    const decisions=hits+losses;
    return {games:rows.length,hits,losses,pushes,rate:decisions?hits/decisions*100:null,avg:rows.length?sum/rows.length:null};
  }

  function propSeasonSeries(series){
    const seasons=series.map(x=>Number(x.season)).filter(Number.isFinite);
    if(!seasons.length)return series;
    const latest=Math.max(...seasons);
    return series.filter(x=>Number(x.season)===latest);
  }

  function propRateCard(label,stats){
    if(!stats||!Number.isFinite(stats.rate))return '<span><small>'+esc(label)+'</small><b>—</b><em>verified sample unavailable</em></span>';
    return '<span><small>'+esc(label)+'</small><b>'+stats.rate.toFixed(0)+'%</b><em>'+stats.hits+'-'+stats.losses+(stats.pushes?' · '+stats.pushes+' push'+(stats.pushes===1?'':'es'):'')+' · avg '+researchRate(stats.avg,1)+'</em></span>';
  }

  function renderPropHitRate(data,row){
    const series=propSeriesForRow(data,row);
    if(!series.length){
      return '<div class="prop-intel-empty"><b>Exact-line hit rate unavailable.</b><small>'+esc(data?.reason||'The verified game log does not expose this market yet. TSO will not infer it from season totals.')+'</small></div>';
    }
    const l5=propWindowStats(series,row,5),l10=propWindowStats(series,row,10),season=propWindowStats(propSeasonSeries(series),row);
    const recent=series.slice(0,10);
    const dots=recent.map(item=>{
      const line=Number(row.line),v=Number(item.value);
      const push=Math.abs(v-line)<1e-9,hit=!push&&(row.side==='under'?v<line:v>line);
      return '<span class="'+(push?'is-push':hit?'is-hit':'is-miss')+'" title="'+esc(String(item.date||''))+' · '+esc(researchRate(v,1))+'">'+esc(researchRate(v,1))+'</span>';
    }).join('');
    const source=series[0]?.source||'verified game log';
    return '<div class="prop-intel-metrics">'+propRateCard('L5',l5)+propRateCard('L10',l10)+propRateCard('SEASON',season)+'</div>'
      +'<div class="prop-hit-sequence"><div><b>LAST '+recent.length+'</b><small>'+esc(propSelectionText(row))+' · exact threshold</small></div><div>'+dots+'</div></div>'
      +'<div class="prop-intel-source">SOURCE · '+esc(source)+' · pushes excluded from hit-rate denominator</div>';
  }

  function renderPropPriceHistory(data,row,book){
    if(!data?.available||!data.current){
      return '<div class="prop-intel-empty"><b>No committed movement history found.</b><small>'+esc(data?.reason||data?.error||'This exact selection has not appeared in the recent committed snapshot window.')+'</small></div>';
    }
    const open=data.open,current=data.current;
    const oi=americanImpliedPct(open.price),ci=americanImpliedPct(current.price);
    const move=Number.isFinite(oi)&&Number.isFinite(ci)?ci-oi:null;
    const tone=Number.isFinite(move)?(move>.15?'is-shorter':move<-.15?'is-drifter':'is-flat'):'is-flat';
    const label=Number.isFinite(move)?(move>.15?'SHORTENED':move<-.15?'DRIFTED':'UNCHANGED'):'OBSERVED';
    const points=(data.points||[]).slice(-12);
    const timeline=points.map((p,index)=>{
      const implied=americanImpliedPct(p.price);
      return '<span class="'+(index===0?'is-open ':'')+(index===points.length-1?'is-current':'')+'"><small>'+esc(new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(new Date(p.snapshotTime||p.commitTime)))+'</small><b>'+esc(americanPrice(p.price))+'</b><em>'+pct1(implied)+'</em></span>';
    }).join('');
    return '<div class="prop-move-summary '+tone+'">'
      +'<span><small>TSO OPEN</small><b>'+esc(americanPrice(open.price))+'</b><em>'+pct1(oi)+'</em></span>'
      +'<span><small>CURRENT</small><b>'+esc(americanPrice(current.price))+'</b><em>'+pct1(ci)+'</em></span>'
      +'<span><small>IMPLIED MOVE</small><b>'+(Number.isFinite(move)?((move>0?'+':'')+move.toFixed(1)+' pp'):'—')+'</b><em>'+label+'</em></span>'
      +'<span><small>SNAPSHOTS</small><b>'+String(data.points?.length||0)+'</b><em>'+esc(book||current.book||'best exact')+'</em></span>'
      +'</div><div class="prop-price-timeline">'+timeline+'</div>'
      +'<div class="prop-intel-source">TSO OPEN = earliest exact quote found in the recent committed TSO snapshot window · '+esc(String(data.commitsChecked||0))+' commits checked</div>';
  }

  async function loadPropIntel(row,overlay,book){
    const rateNode=overlay.querySelector('[data-props-hit-rate]');
    const historyNode=overlay.querySelector('[data-props-price-history]');
    if(rateNode)rateNode.innerHTML='<div class="prop-intel-loading"><span class="live-feed-spinner"></span><b>Calculating exact-line hit rates…</b></div>';
    if(historyNode)historyNode.innerHTML='<div class="prop-intel-loading"><span class="live-feed-spinner"></span><b>Reconstructing committed price history…</b></div>';
    const [researchResult,historyResult]=await Promise.allSettled([propResearchPayload(row),propHistoryPayload(row,book)]);
    if(rateNode){
      rateNode.innerHTML=researchResult.status==='fulfilled'?renderPropHitRate(researchResult.value,row):'<div class="prop-intel-empty"><b>Hit-rate research unavailable.</b><small>'+esc(researchResult.reason?.message||String(researchResult.reason||''))+'</small></div>';
    }
    if(historyNode){
      historyNode.innerHTML=historyResult.status==='fulfilled'?renderPropPriceHistory(historyResult.value,row,book):'<div class="prop-intel-empty"><b>Price history unavailable.</b><small>'+esc(historyResult.reason?.message||String(historyResult.reason||''))+'</small></div>';
    }
  }

  function closePropsCompare(){
    document.querySelector('.props-compare-overlay')?.remove();
    document.body.classList.remove('props-compare-open');
  }

  function addPropToParlay(row){
    if(!row)return;
    const key=String(row.key||'');
    if(!key)return;
    if(!parlayLegKeys.includes(key)){
      if(parlayLegKeys.length>=8){notify('Parlay Lab supports up to 8 exact selections.');return;}
      parlayLegKeys.push(key);
    }
    parlayTarget=Math.max(2,Math.min(5,parlayLegKeys.length));
    closePropsCompare();
    setRoute('parlays');
    notify(row.player+' '+propSelectionText(row)+' added to Parlay Lab.');
  }

  function openPropsCompare(row){
    if(!row)return;
    closePropsCompare();
    const original=(propsFeedCache?.rows||[]).find(x=>String(x.key)===String(row.key))||row;
    const books=[...(original.books||[])].filter(b=>Number.isFinite(Number(b?.price))).sort((a,b)=>Number(b.price)-Number(a.price));
    const hasModel=Number.isFinite(Number(original?.model?.probabilityPct));
    const defaultBook=original.book||books[0]?.book||'';
    const overlay=document.createElement('div');
    overlay.className='props-compare-overlay';
    overlay.innerHTML='<div class="props-compare-shell" role="dialog" aria-modal="true">'
      +'<div class="props-compare-hero"><button class="props-compare-close" data-props-compare-close aria-label="Close">×</button>'
      +'<div class="props-compare-player">'+propHeadshotMarkup(original,'props-compare-headshot')+'<div><span>'+esc(leagueLabel(original.sport))+' · PROP INTELLIGENCE</span><h2>'+esc(original.player)+'</h2><p>'+esc(original.marketLabel||original.market)+' · '+esc(propSelectionText(original))+' · '+esc(original.awayTeam||'')+' @ '+esc(original.homeTeam||'')+'</p></div></div>'
      +'<div class="props-compare-summary"><span><small>BOOKS</small><b>'+books.length+'</b></span><span><small>MODEL</small><b>'+(hasModel?pct1(original.model.probabilityPct):'—')+'</b></span><span><small>BEST</small><b>'+esc(americanPrice(original.price))+'</b></span></div></div>'
      +'<div class="props-compare-table"><div class="props-compare-head"><span>SPORTSBOOK</span><span>PRICE</span><span>IMPLIED</span><span>MODEL EDGE</span><span>UPDATED</span><span>ACTION</span></div>'
      +(books.length?books.map((book,index)=>{
        const implied=americanImpliedPct(book.price);
        const edge=hasModel&&Number.isFinite(implied)?Number(original.model.probabilityPct)-implied:null;
        return '<div class="props-compare-row '+(index===0?'is-best':'')+'"><span><b>'+esc(book.book||'Sportsbook')+'</b><small>'+(index===0?'BEST VERIFIED PRICE':'exact selection')+'</small></span><strong>'+esc(americanPrice(book.price))+'</strong><strong>'+pct1(implied)+'</strong><strong class="'+(Number.isFinite(edge)?(edge>=0?'positive':'negative'):'')+'">'+(Number.isFinite(edge)?edgeText(edge):'—')+'</strong><span>'+esc(ageText(book.snapshotTime||original.snapshotTime))+'</span>'+(book.link?'<a href="'+esc(book.link)+'" target="_blank" rel="noopener">OPEN →</a>':'<em>NO LINK</em>')+'</div>';
      }).join(''):'<div class="research-detail-empty"><b>No exact sportsbook rows are attached to this selection.</b></div>')+'</div>'
      +'<div class="prop-intel-duo">'
        +'<article class="prop-intel-panel"><div class="prop-intel-panel-head"><div><span class="gold-kicker">EXACT-LINE PERFORMANCE</span><h3>How often has this exact side hit?</h3></div><b>'+esc(propSelectionText(original))+'</b></div><div data-props-hit-rate></div></article>'
        +'<article class="prop-intel-panel"><div class="prop-intel-panel-head"><div><span class="violet-kicker">PRICE MOVEMENT</span><h3>TSO open → current</h3></div><select data-props-history-book aria-label="Sportsbook history">'+books.map(b=>'<option value="'+esc(b.book)+'" '+(String(b.book)===String(defaultBook)?'selected':'')+'>'+esc(String(b.book).toUpperCase())+'</option>').join('')+'</select></div><div data-props-price-history></div></article>'
      +'</div>'
      +'<div class="props-compare-footer"><div><span>EXACT PLAYER + MARKET + SIDE + LINE</span><small>'+(hasModel?'Edge recalculated independently for every sportsbook price.':'Market-only selection · no model probability invented.')+'</small></div><div><button data-props-compare-research '+(['nhl','nfl','mlb'].includes(String(original.sport))?'':'disabled')+'>DEEP RESEARCH</button><button class="is-primary" data-props-compare-parlay>+ PARLAY LAB</button></div></div>'
      +'</div>';
    document.body.appendChild(overlay);
    document.body.classList.add('props-compare-open');
    overlay.querySelector('[data-props-compare-close]')?.addEventListener('click',closePropsCompare);
    overlay.addEventListener('click',event=>{if(event.target===overlay)closePropsCompare();});
    overlay.querySelector('[data-props-compare-research]')?.addEventListener('click',()=>{closePropsCompare();openResearchDetail(original);});
    overlay.querySelector('[data-props-compare-parlay]')?.addEventListener('click',()=>addPropToParlay(original));
    const historySelect=overlay.querySelector('[data-props-history-book]');
    historySelect?.addEventListener('change',()=>{
      const node=overlay.querySelector('[data-props-price-history]');
      if(node)node.innerHTML='<div class="prop-intel-loading"><span class="live-feed-spinner"></span><b>Loading '+esc(historySelect.value)+' history…</b></div>';
      propHistoryPayload(original,historySelect.value).then(payload=>{if(node)node.innerHTML=renderPropPriceHistory(payload,original,historySelect.value);}).catch(error=>{if(node)node.innerHTML='<div class="prop-intel-empty"><b>Price history unavailable.</b><small>'+esc(error?.message||String(error))+'</small></div>';});
    });
    bindMediaFallbacks();
    loadPropIntel(original,overlay,defaultBook);
  }

  function bindPropsGeneratedActions(){
    document.querySelectorAll('[data-props-compare]').forEach(btn=>btn.onclick=event=>{
      event.stopPropagation();
      openPropsCompare(researchRowByKey(btn.dataset.propsCompare));
    });
    document.querySelectorAll('[data-props-research]').forEach(btn=>btn.onclick=event=>{
      event.stopPropagation();
      const row=researchRowByKey(btn.dataset.propsResearch);
      if(row)openResearchDetail(row);
    });
    document.querySelectorAll('[data-props-parlay]').forEach(btn=>btn.onclick=event=>{
      event.stopPropagation();
      addPropToParlay(researchRowByKey(btn.dataset.propsParlay));
    });
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
      const players=new Set(rows.map(row=>String(row.player||'').toLowerCase())).size;
      status.innerHTML='<div><span class="props-live-dot"></span><b>UNIVERSAL PROP ENGINE</b><small>exact sportsbook selections</small></div><span class="props-status-divider"></span><div><b>'+rows.length+'</b><small>exact selections</small></div><span class="props-status-divider"></span><div><b>'+players+'</b><small>players</small></div><span class="props-status-divider"></span><div><b>'+modelMatched+'</b><small>model matched</small></div><span class="props-status-divider"></span><div><b>'+books.size+'</b><small>sportsbooks</small></div><span class="props-status-divider"></span><div><b>'+esc(newest?ageText(newest):'—')+'</b><small>source freshness</small></div>';
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

    renderPropsMarketRail(root,rows);
    renderPropsFeature(root,sortPropsToolRows(rows,propsSortMode(root)));
    renderPropsBooks(root,rows);
    renderPropsBoard(root,rows);
  }

  async function refreshPropsData(force=false){
    if(propsFeedInFlight) return propsFeedInFlight;
    if(!force && propsFeedCache && Date.now()-propsFeedFetchedAt < PROPS_FEED_TTL){
      renderPropsFeed();
      renderModelsFeed();
      renderHomeModels();
      renderParlayLab();
      renderCommunity();
      renderLeaderboard();
      renderProfile();
      renderResearch();
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
        renderParlayLab();
        renderCommunity();
        renderLeaderboard();
        renderProfile();
        renderResearch();
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
        const parlayRoot=document.querySelector('[data-parlays-route]');
        if(currentRoute==='parlays'&&parlayRoot){
          const parlayStatus=parlayRoot.querySelector('[data-parlay-status]');
          if(parlayStatus) parlayStatus.innerHTML='<div><span class="parlays-preview-dot"></span><b>PARLAY FEED UNAVAILABLE</b><small>TSO will not substitute demo legs.</small></div>';
          const parlayLegs=parlayRoot.querySelector('[data-parlay-legs]');
          if(parlayLegs) parlayLegs.innerHTML='<div class="live-board-loading"><div><b>Verified Props/model feed unavailable.</b><small>Retrying automatically. No preview parlay is being shown.</small></div></div>';
        }
        const communityFeed=document.querySelector('[data-community-feed]');
        if(currentRoute==='community'&&communityFeed) communityFeed.innerHTML='<div class="live-board-loading panel"><div><b>Model Pulse unavailable.</b><small>No fake Community activity will be substituted.</small></div></div>';
        const rankingsBoard=document.querySelector('[data-rankings-board]');
        if(currentRoute==='leaderboard'&&rankingsBoard) rankingsBoard.innerHTML='<div class="live-board-loading"><div><b>Real model ranking unavailable.</b><small>User standings remain offline.</small></div></div>';
        const profileSignals=document.querySelector('.profile-page [data-profile-signals]');
        if(currentRoute==='profile'&&profileSignals) profileSignals.innerHTML='<div class="live-board-loading home-model-empty--wide"><div><b>Verified model feed unavailable.</b><small>Profile will not substitute fake tracked picks or performance history.</small></div></div>';
        const researchResults=document.querySelector('[data-research-results]');
        if(currentRoute==='research'&&researchResults) researchResults.innerHTML='<div class="live-board-loading"><div><b>Verified prop/model feed unavailable.</b><small>Research will not substitute preview statistics.</small></div></div>';
        renderProfile();
        renderResearch();
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
    document.querySelectorAll('[data-parlay-refresh]').forEach(btn => btn.addEventListener('click', () => refreshPropsData(true)));
    document.querySelectorAll('[data-community-refresh],[data-rankings-refresh]').forEach(btn => btn.addEventListener('click', () => refreshPropsData(true)));
    document.querySelector('[data-profile-refresh]')?.addEventListener('click', () => {
      refreshLiveData(true);
      refreshPropsData(true);
    });
    document.querySelector('[data-research-refresh]')?.addEventListener('click', () => {
      refreshLiveData(true);
      refreshPropsData(true);
    });
    document.querySelector('[data-research-search]')?.addEventListener('input', event => {
      researchQuery=event.target.value;
      renderResearch();
    });
    document.querySelector('[data-research-clear]')?.addEventListener('click', () => {
      researchQuery='';
      renderResearch();
    });
    document.querySelector('[data-parlay-new]')?.addEventListener('click', () => resetParlayBuild());
    document.querySelector('[data-parlay-add]')?.addEventListener('click', () => {
      const next=chooseParlayRows(1,parlayLegKeys)[0];
      if(next&&parlayLegKeys.length<8){
        parlayLegKeys.push(String(next.key));
        if(parlayLegKeys.length>parlayTarget) parlayTarget=Math.min(5,parlayLegKeys.length);
        renderParlayLab();
      }else notify('No additional exact modeled selection is available for this filter.');
    });
    document.querySelectorAll('[data-parlay-target]').forEach(btn => btn.addEventListener('click', () => {
      parlayTarget=Math.max(2,Math.min(5,Number(btn.dataset.parlayTarget)||3));
      fillParlayToTarget(parlayTarget);
      renderParlayLab();
    }));
    document.querySelector('[data-props-refresh]')?.addEventListener('click', () => refreshPropsData(true));
    document.querySelector('[data-models-refresh]')?.addEventListener('click', () => { refreshPropsData(true); refreshNhlScorerData(true); });
    document.querySelectorAll('[data-models-league]').forEach(btn => btn.addEventListener('click', () => setLeague(btn.dataset.modelsLeague)));
    document.querySelector('[data-props-search]')?.addEventListener('input', event => {
      propsFilterState.search=event.target.value;
      renderPropsFeed();
    });
    document.querySelector('[data-props-market-filter]')?.addEventListener('change', event => {
      propsFilterState.market=event.target.value;
      renderPropsFeed();
    });
    document.querySelector('[data-props-book-filter]')?.addEventListener('change', event => {
      propsFilterState.book=String(event.target.value||'').toLowerCase();
      renderPropsFeed();
    });
    document.querySelector('[data-props-side-filter]')?.addEventListener('change', event => {
      propsFilterState.side=event.target.value;
      renderPropsFeed();
    });
    document.querySelector('[data-props-model-filter]')?.addEventListener('change', event => {
      propsFilterState.model=event.target.value;
      renderPropsFeed();
    });
    document.querySelector('[data-props-sort]')?.addEventListener('change', event => {
      propsFilterState.sort=event.target.value||'edge';
      renderPropsFeed();
    });
    bindMediaFallbacks();
  }

  function renderRoute({scrollToTop=false,preserveScroll=false}={}){
    const previousScroll=window.scrollY||document.documentElement.scrollTop||0;
    if(currentRoute === 'home') pageContent.innerHTML = homeHTML;
    else if(window.TSO2Pages?.[currentRoute]) pageContent.innerHTML = window.TSO2Pages[currentRoute](currentLeague);
    bindDynamic();
    syncOwnerTools();
    bindNhlScorerActions(document.querySelector('[data-nhl-scorer-shell]'));
    refreshNhlScorerData(false);
    refreshLiveData(false);
    refreshPropsData(false);
    if(scrollToTop){
      window.scrollTo({top:0,behavior:'instant'});
    }else if(preserveScroll){
      requestAnimationFrame(()=>window.scrollTo({top:previousScroll,behavior:'instant'}));
    }
  }

  function syncNav(){
    document.querySelectorAll('[data-route]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.route === currentRoute));
    document.querySelectorAll('[data-league]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.league === currentLeague));
  }

  function setRoute(route){
    if(!labels[route]) return;
    closeProfileMenu();
    const routeChanged=route!==currentRoute;
    currentRoute = route;
    syncNav();
    renderRoute({scrollToTop:routeChanged});
    history.replaceState(null, '', '#' + route);
  }

  function setLeague(league){
    closeProfileMenu();
    if(league===currentLeague)return;
    currentLeague = league;
    shell.dataset.league = league;
    syncNav();
    renderRoute({preserveScroll:true});
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
    if(event.key === 'Escape'){ closeProfileMenu(); closeResearchDetail(); closePropsCompare(); }
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