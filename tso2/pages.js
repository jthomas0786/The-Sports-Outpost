(() => {
  const leagueName = league => league === 'all' ? 'All Sports' : league.toUpperCase();
  const header = (eyebrow,title,desc,league,action='') => `
    <section class="page-header">
      <div>
        <div class="eyebrow">${eyebrow} · ${leagueName(league)}</div>
        <h1>${title}</h1>
        <p>${desc}</p>
      </div>
      <div class="page-header-actions">
        <button class="button secondary">Save view</button>
        ${action ? `<button class="button primary">${action}</button>` : ''}
      </div>
    </section>`;

  const filterBar = (league, extras='') => `
    <section class="filter-bar">
      <div class="segmented">
        <button class="${league==='all'?'is-active':''}" data-inline-league="all">All</button>
        <button class="${league==='nhl'?'is-active':''}" data-inline-league="nhl">NHL</button>
        <button class="${league==='nfl'?'is-active':''}" data-inline-league="nfl">NFL</button>
        <button class="${league==='mlb'?'is-active':''}" data-inline-league="mlb">MLB</button>
        <button class="${league==='nba'?'is-active':''}" data-inline-league="nba">NBA</button>
      </div>
      <div class="filter-actions">
        ${extras}
        <button class="filter-button">☷ Filters</button>
      </div>
    </section>`;

  const modelCard = (league,market,name,meta,model,marketPct,edge,confidence,odds,book,badge='VALUE') => `
    <article class="model-card">
      <div class="card-top"><div><span class="league-badge">${league}</span><span class="status-badge ${badge==='HIGH EDGE'?'strong':''}">${badge}</span></div><button class="more-btn">•••</button></div>
      <div class="entity-row"><div class="entity-avatar">${name.split(' ').map(p=>p[0]).join('').slice(0,2)}</div><div><small>${market}</small><h3>${name}</h3><p>${meta}</p></div></div>
      <div class="metric-row"><div><span>MODEL</span><strong>${model}%</strong></div><div><span>MARKET</span><strong>${marketPct}%</strong></div><div><span>EDGE</span><strong class="positive">+${edge}%</strong></div></div>
      <div class="confidence"><div><span>Outpost Confidence</span><b>${confidence}</b></div><div class="confidence-track"><i style="width:${confidence}%"></i></div></div>
      <div class="card-footer"><div class="best-odds"><small>BEST PRICE</small><b>${odds}</b><span>${book}</span></div><button class="button compact">View analysis</button></div>
    </article>`;

  const pages = {
    live(league){
      return header('LIVE CENTER','Everything happening now','Scores, gamecasts, win probability, model movement and live opportunities in one place.',league,'Open Multi-Game View') +
      filterBar(league,'<button class="filter-button active-filter">● Live only</button>') +
      `<section class="live-layout">
        <div class="live-board panel">
          <div class="section-heading compact-heading"><div><span class="eyebrow">IN PROGRESS</span><h2>Live games</h2></div><span class="data-freshness">Updated 12 sec ago</span></div>
          <div class="game-table">
            <button class="game-row featured-game">
              <span class="game-state live-tag"><i></i>2ND 12:34</span>
              <span class="game-teams"><b><i class="team-badge">PIT</i> Pittsburgh</b><b><i class="team-badge">PHI</i> Philadelphia</b></span>
              <span class="game-score"><b>2</b><b>1</b></span>
              <span class="game-model"><small>WIN PROB</small><b>PIT 68%</b></span>
              <span class="game-arrow">›</span>
            </button>
            <button class="game-row">
              <span class="game-state live-tag"><i></i>Q3 6:41</span>
              <span class="game-teams"><b><i class="team-badge">DAL</i> Dallas</b><b><i class="team-badge">NYG</i> New York</b></span>
              <span class="game-score"><b>17</b><b>10</b></span>
              <span class="game-model"><small>NEXT SCORE</small><b>DAL 57%</b></span>
              <span class="game-arrow">›</span>
            </button>
            <button class="game-row">
              <span class="game-state live-tag"><i></i>3RD 8:12</span>
              <span class="game-teams"><b><i class="team-badge">TOR</i> Toronto</b><b><i class="team-badge">MTL</i> Montreal</b></span>
              <span class="game-score"><b>3</b><b>3</b></span>
              <span class="game-model"><small>WIN PROB</small><b>TOR 54%</b></span>
              <span class="game-arrow">›</span>
            </button>
          </div>
        </div>
        <aside class="live-focus panel">
          <div class="eyebrow">LIVE FOCUS</div><h2>PIT @ PHI</h2>
          <div class="focus-score"><span>PIT</span><b>2</b><em>12:34 · 2ND</em><b>1</b><span>PHI</span></div>
          <div class="focus-grid">
            <div><span>Shots</span><b>21–14</b></div><div><span>xG</span><b>1.94–1.12</b></div><div><span>PP</span><b>1/2–0/1</b></div>
          </div>
          <div class="insight-callout"><span>OUTPOST LIVE LEAN</span><b>PIT next goal · 61%</b><small>Shot share and offensive-zone time are both accelerating.</small></div>
          <button class="button primary full">Open Gamecast</button>
        </aside>
      </section>
      <section class="section-block">
        <div class="section-heading"><div><span class="eyebrow">LIVE MODEL MOVES</span><h2>What changed since puck/kickoff</h2></div></div>
        <div class="movement-board">
          <div class="movement-item"><span class="league-badge">NHL</span><div><b>Sidney Crosby · Anytime Goal</b><small>Model probability climbed after 4 shots / 2 high-danger chances.</small></div><strong>28% → 35%</strong><i>+7%</i></div>
          <div class="movement-item"><span class="league-badge">NFL</span><div><b>CeeDee Lamb · 100+ Receiving</b><small>Target share up to 38% through three quarters.</small></div><strong>41% → 57%</strong><i>+16%</i></div>
        </div>
      </section>`;
    },

    research(league){
      return header('RESEARCH','Find the why behind the number','One research workspace for players, teams and matchups across every sport.',league,'Compare Players') +
      filterBar(league,'<button class="filter-button">Last 10</button><button class="filter-button">Tonight</button>') +
      `<section class="research-search panel">
        <div class="research-search-copy"><span class="eyebrow">UNIVERSAL RESEARCH</span><h2>Player, team or matchup</h2><p>Search once. TSO assembles form, opportunity, opponent context, market data and model signals.</p></div>
        <div class="research-input"><span>⌕</span><input placeholder="Try Connor McDavid, DAL @ NYG, Pete Alonso..." /><kbd>ENTER</kbd></div>
      </section>
      <section class="split-section research-panels">
        <div class="panel">
          <div class="section-heading compact-heading"><div><span class="eyebrow">TRENDING RESEARCH</span><h2>What users are opening</h2></div></div>
          <div class="research-list">
            <button><span class="watch-avatar">97</span><div><b>Connor McDavid</b><small>Shots · Points · Anytime Goal</small></div><i>12.4k</i></button>
            <button><span class="watch-avatar">26</span><div><b>Saquon Barkley</b><small>Rushing · Receiving · Anytime TD</small></div><i>9.8k</i></button>
            <button><span class="watch-avatar">20</span><div><b>Pete Alonso</b><small>Home Run · Total Bases · Hits</small></div><i>8.1k</i></button>
          </div>
        </div>
        <div class="panel">
          <div class="section-heading compact-heading"><div><span class="eyebrow">MATCHUP RADAR</span><h2>Research flags</h2></div></div>
          <div class="flag-grid">
            <div class="flag-card"><span>PACE</span><b>DAL @ NYG</b><strong>↑ Fast</strong><small>Projected 8% above league average.</small></div>
            <div class="flag-card"><span>GOALIE</span><b>PIT @ PHI</b><strong>Edge PIT</strong><small>High-danger save rate mismatch.</small></div>
            <div class="flag-card"><span>WIND</span><b>BAL @ NYY</b><strong>+9 mph out</strong><small>HR carry environment improving.</small></div>
            <div class="flag-card"><span>USAGE</span><b>KC @ BUF</b><strong>Kelce ↑</strong><small>Route participation + target share.</small></div>
          </div>
        </div>
      </section>`;
    },

    models(league){
      return header('MODEL HUB','One model language. Every sport.','Compare probabilities, market expectations and Outpost confidence without relearning the interface.',league,'Run Model Board') +
      filterBar(league,'<button class="filter-button">Sort: Edge</button><button class="filter-button">Confidence 75+</button>') +
      `<section class="model-family-grid">
        <button class="family-card active-family"><span>◎</span><b>Scoring</b><small>Goal · TD · HR · points</small><i>27 edges</i></button>
        <button class="family-card"><span>◫</span><b>Player Props</b><small>Volume · yards · shots</small><i>84 edges</i></button>
        <button class="family-card"><span>⌁</span><b>Game Models</b><small>Moneyline · totals · spreads</small><i>19 edges</i></button>
        <button class="family-card"><span>✦</span><b>Live Models</b><small>Next score · live props</small><i>11 active</i></button>
      </section>
      <section class="section-block">
        <div class="section-heading"><div><span class="eyebrow">TOP EDGES</span><h2>Best model-vs-market gaps</h2></div><span class="data-freshness">Model board refreshed 1 min ago</span></div>
        <div class="model-grid">
          ${modelCard('NHL','ANYTIME GOAL','Sidney Crosby','PIT · C · vs PHI','34.8','27.2','7.6','88','+268','DK','HIGH EDGE')}
          ${modelCard('NFL','ANYTIME TD','Saquon Barkley','PHI · RB · vs DAL','63.1','55.4','7.7','84','-124','FD','HIGH EDGE')}
          ${modelCard('MLB','HOME RUN','Pete Alonso','BAL · 1B · vs NYY','29.4','21.7','7.7','81','+360','365','VALUE')}
        </div>
      </section>
      <section class="panel model-explainer">
        <div><span class="eyebrow">CONSISTENT MODEL LANGUAGE</span><h2>Same scorecard everywhere</h2><p>Every sport uses Model %, Market %, Edge, Outpost Confidence and Best Price in the same locations. Sport-specific inputs live inside analysis, not in a completely different UI.</p></div>
        <div class="model-key"><span><i class="key-blue"></i>Model probability</span><span><i class="key-green"></i>Positive edge</span><span><i class="key-line"></i>Market baseline</span></div>
      </section>`;
    },

    props(league){
      return header('PROP CENTER','Every exact line. One clean board.','Search player props, compare books, track movement and open deeper model context without leaving the board.',league,'Build From Props') +
      filterBar(league,'<button class="filter-button">Market: All</button><button class="filter-button">Best edge</button>') +
      `<section class="prop-toolbar panel">
        <div class="prop-search"><span>⌕</span><input placeholder="Search player or market" /></div>
        <button class="filter-button">Game</button><button class="filter-button">Market</button><button class="filter-button">Book</button><button class="filter-button">Edge 3%+</button>
      </section>
      <section class="prop-table panel">
        <div class="prop-head"><span>PLAYER / MARKET</span><span>LINE</span><span>MODEL</span><span>EDGE</span><span>BEST ODDS</span><span>MOVE</span><span></span></div>
        <button class="prop-row"><span class="prop-player"><i class="watch-avatar">97</i><span><b>Connor McDavid</b><small>EDM · Shots on Goal</small></span></span><strong>O 3.5</strong><strong>67%</strong><strong class="positive">+8.2%</strong><span class="odds-cell"><b>-105</b><small>DK</small></span><span class="move-up">↑ 20¢</span><i>›</i></button>
        <button class="prop-row"><span class="prop-player"><i class="watch-avatar">87</i><span><b>Sidney Crosby</b><small>PIT · Anytime Goal</small></span></span><strong>Yes</strong><strong>34.8%</strong><strong class="positive">+7.6%</strong><span class="odds-cell"><b>+268</b><small>DK</small></span><span class="move-up">↑ 12¢</span><i>›</i></button>
        <button class="prop-row"><span class="prop-player"><i class="watch-avatar">26</i><span><b>Saquon Barkley</b><small>PHI · Anytime TD</small></span></span><strong>Yes</strong><strong>63.1%</strong><strong class="positive">+7.7%</strong><span class="odds-cell"><b>-124</b><small>FD</small></span><span class="move-flat">→ 2¢</span><i>›</i></button>
        <button class="prop-row"><span class="prop-player"><i class="watch-avatar">20</i><span><b>Pete Alonso</b><small>BAL · Home Run</small></span></span><strong>Yes</strong><strong>29.4%</strong><strong class="positive">+7.7%</strong><span class="odds-cell"><b>+360</b><small>365</small></span><span class="move-up">↑ 15¢</span><i>›</i></button>
      </section>`;
    },

    parlays(league){
      return header('PARLAY LAB','Build with context, not guesswork','One workspace for pregame, quarter, halftime and live combinations with transparent correlation and model context.',league,'New Parlay') +
      filterBar(league,'<button class="filter-button active-filter">Builder</button><button class="filter-button">Saved</button>') +
      `<section class="parlay-layout">
        <div class="panel parlay-builder">
          <div class="section-heading compact-heading"><div><span class="eyebrow">BUILD</span><h2>Current slip</h2></div><button class="text-action">Clear</button></div>
          <div class="leg-card"><span class="leg-num">1</span><div><b>Sidney Crosby · Anytime Goal</b><small>PIT vs PHI · +268</small></div><span class="leg-edge">+7.6%</span><button>×</button></div>
          <div class="leg-card"><span class="leg-num">2</span><div><b>Saquon Barkley · Anytime TD</b><small>PHI vs DAL · -124</small></div><span class="leg-edge">+7.7%</span><button>×</button></div>
          <div class="leg-card"><span class="leg-num">3</span><div><b>McDavid · Over 3.5 Shots</b><small>EDM vs CGY · -105</small></div><span class="leg-edge">+8.2%</span><button>×</button></div>
          <button class="add-leg">＋ Add another leg</button>
        </div>
        <aside class="panel parlay-summary">
          <span class="eyebrow">OUTPOST CHECK</span><h2>3-leg build</h2>
          <div class="summary-metrics"><div><span>COMBINED</span><b>+1280</b></div><div><span>MODEL</span><b>9.4%</b></div><div><span>MARKET</span><b>7.2%</b></div></div>
          <div class="health-score"><div><span>Build quality</span><b>86 / 100</b></div><div class="confidence-track"><i style="width:86%"></i></div></div>
          <div class="correlation-note good"><b>✓ Correlation check passed</b><small>No major negative dependency detected.</small></div>
          <button class="button primary full">Save & Track Parlay</button>
        </aside>
      </section>
      <section class="section-block"><div class="section-heading"><div><span class="eyebrow">SMART SUGGESTIONS</span><h2>Compatible legs with edge</h2></div></div>
        <div class="suggestion-grid">
          <button class="suggestion-card"><span class="league-badge">NFL</span><b>Travis Kelce O 67.5 Rec Yds</b><small>Model edge +5.8%</small><strong>+102</strong><i>＋</i></button>
          <button class="suggestion-card"><span class="league-badge">NHL</span><b>Auston Matthews Anytime Goal</b><small>Model edge +5.1%</small><strong>+118</strong><i>＋</i></button>
          <button class="suggestion-card"><span class="league-badge">MLB</span><b>Judge 2+ Total Bases</b><small>Model edge +4.7%</small><strong>+130</strong><i>＋</i></button>
        </div>
      </section>`;
    },

    community(league){
      return header('COMMUNITY','The Outpost is better with people in it','Follow bettors, share picks, react to models and talk inside sport-aware rooms without losing your research context.',league,'Create Post') +
      filterBar(league,'<button class="filter-button active-filter">Following</button><button class="filter-button">Trending</button>') +
      `<section class="community-layout">
        <div class="feed">
          <article class="post-card panel"><div class="post-head"><span class="avatar">JT</span><div><b>justcallme_jt</b><small>2 min · NHL</small></div><button>•••</button></div><p>Crosby is still my favorite goal look tonight. Model climbed again after the latest line/goalie inputs.</p><div class="shared-pick"><span class="league-badge">NHL</span><div><b>Sidney Crosby · Anytime Goal</b><small>Outpost 34.8% · Market 27.2%</small></div><strong>+268</strong></div><div class="post-actions"><button>🔥 42</button><button>💬 11</button><button>＋ Track</button><button>↗ Share</button></div></article>
          <article class="post-card panel"><div class="post-head"><span class="avatar">AK</span><div><b>AnalyticsKing</b><small>8 min · NFL</small></div><button>•••</button></div><p>Barkley's red-zone role + Dallas front is the exact profile I want. Watching the price before kickoff.</p><div class="post-actions"><button>🔥 31</button><button>💬 8</button><button>＋ Track</button><button>↗ Share</button></div></article>
        </div>
        <aside class="panel room-card"><span class="eyebrow">LIVE ROOM</span><h2>NHL Tonight</h2><p>1,284 members · 183 online</p><div class="mini-chat"><div><b>@goalhunter</b><span>PHI goalie confirmed.</span></div><div><b>@iceedge</b><span>Crosby price moved again.</span></div><div><b>@justcallme_jt</b><span>Model still likes it.</span></div></div><button class="button primary full">Enter room</button></aside>
      </section>`;
    },

    leaderboard(league){
      return header('LEADERBOARD','Performance you can actually inspect','Rankings based on tracked picks and points with transparent records, streaks and sport filters.',league,'My Ranking') +
      filterBar(league,'<button class="filter-button">This week</button><button class="filter-button">All markets</button>') +
      `<section class="podium">
        <article><span>2</span><div class="podium-avatar">AK</div><b>AnalyticsKing</b><small>71% · +28.4 pts</small></article>
        <article class="winner"><span>1</span><div class="podium-avatar">JP</div><b>JPicks</b><small>74% · +34.8 pts</small></article>
        <article><span>3</span><div class="podium-avatar">JT</div><b>justcallme_jt</b><small>68% · +24.1 pts</small></article>
      </section>
      <section class="leader-table panel">
        <div class="leader-head"><span>RANK</span><span>USER</span><span>RECORD</span><span>WIN %</span><span>POINTS</span><span>STREAK</span></div>
        <div class="leader-row"><b>4</b><span><i class="avatar">ME</i><strong>ModelEdge</strong></span><em>42–23</em><em>64.6%</em><strong class="positive">+21.7</strong><span class="streak">W4</span></div>
        <div class="leader-row"><b>5</b><span><i class="avatar">SR</i><strong>SharpRoom</strong></span><em>38–22</em><em>63.3%</em><strong class="positive">+19.9</strong><span class="streak">W2</span></div>
        <div class="leader-row"><b>6</b><span><i class="avatar">PH</i><strong>PropHunter</strong></span><em>51–32</em><em>61.4%</em><strong class="positive">+18.6</strong><span class="streak">L1</span></div>
      </section>`;
    },

    profile(league){
      return header('MY OUTPOST','Your history, alerts and edge profile','Everything you track, save and follow in one persistent account view.',league,'Edit Profile') +
      `<section class="profile-hero panel"><div class="profile-avatar">JT</div><div><span class="eyebrow">MEMBER</span><h2>justcallme_jt</h2><p>Tracking NHL · NFL · MLB</p></div><div class="profile-stats"><div><span>RECORD</span><b>68–32</b></div><div><span>WIN RATE</span><b>68%</b></div><div><span>POINTS</span><b class="positive">+34.1</b></div><div><span>STREAK</span><b>W5</b></div></div></section>
      <section class="split-section">
        <div class="panel"><div class="section-heading compact-heading"><div><span class="eyebrow">ACTIVE</span><h2>Tracked picks</h2></div><button class="text-action">View all</button></div>
          <div class="tracked-list"><div><span class="league-badge">NHL</span><div><b>Crosby anytime goal</b><small>+268 · PIT vs PHI</small></div><span class="tracked-status live">LIVE</span></div><div><span class="league-badge">NFL</span><div><b>Barkley anytime TD</b><small>-124 · PHI vs DAL</small></div><span class="tracked-status">8:20 PM</span></div></div>
        </div>
        <div class="panel"><div class="section-heading compact-heading"><div><span class="eyebrow">ALERTS</span><h2>Watching for you</h2></div><button class="text-action">Manage</button></div>
          <div class="alert-list"><div><span>↗</span><div><b>Price move alerts</b><small>4 active markets</small></div><i>ON</i></div><div><span>◎</span><div><b>Model jump alerts</b><small>Confidence +5 or more</small></div><i>ON</i></div><div><span>●</span><div><b>Scoring alerts</b><small>Tracked players</small></div><i>ON</i></div></div>
        </div>
      </section>`;
    }
  };

  window.TSO2Pages = pages;
})();