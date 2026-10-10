(() => {
  const leagueName = league => league === 'all' ? 'All Sports' : league.toUpperCase();

  const PLAYER_MEDIA = {
    'Sidney Crosby':{sport:'nhl',src:'https://a.espncdn.com/i/headshots/nhl/players/full/3114.png'},
    'Connor McDavid':{sport:'nhl',src:'https://a.espncdn.com/i/headshots/nhl/players/full/3895074.png'},
    'Auston Matthews':{sport:'nhl',src:'https://a.espncdn.com/i/headshots/nhl/players/full/4024123.png'},
    'Saquon Barkley':{sport:'nfl',src:'https://a.espncdn.com/i/headshots/nfl/players/full/3929630.png'},
    'Travis Kelce':{sport:'nfl',src:'https://a.espncdn.com/i/headshots/nfl/players/full/15847.png'},
    'Pete Alonso':{sport:'mlb',src:'https://a.espncdn.com/i/headshots/mlb/players/full/37498.png'},
    'Aaron Judge':{sport:'mlb',src:'https://a.espncdn.com/i/headshots/mlb/players/full/33192.png'},
    'Darius Garland':{sport:'nba',src:'https://a.espncdn.com/i/headshots/nba/players/full/4396907.png'},
    'Stephen Curry':{sport:'nba',src:'https://a.espncdn.com/i/headshots/nba/players/full/3975.png'}
  };

  const playerInitials = name => String(name||'Player').split(/\s+/).filter(Boolean).map(p=>p[0]).join('').slice(0,2).toUpperCase();
  const playerHeadshot = (name,className='') => {
    const media=PLAYER_MEDIA[name]||{};
    const src=media.src||'';
    const sport=media.sport||'generic';
    const initials=playerInitials(name);
    return `<span class="player-headshot player-sport--${sport} ${className}" title="${name}">
      <span class="player-headshot-fallback">${initials}</span>
      ${src?`<img data-player-headshot src="${src}" alt="${name}" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.add('is-missing')" />`:''}
    </span>`;
  };
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
      <div class="entity-row">${playerHeadshot(name,'entity-avatar entity-headshot')}<div><small>${market}</small><h3>${name}</h3><p>${meta}</p></div></div>
      <div class="metric-row"><div><span>MODEL</span><strong>${model}%</strong></div><div><span>MARKET</span><strong>${marketPct}%</strong></div><div><span>EDGE</span><strong class="positive">+${edge}%</strong></div></div>
      <div class="confidence"><div><span>Outpost Confidence</span><b>${confidence}</b></div><div class="confidence-track"><i style="width:${confidence}%"></i></div></div>
      <div class="card-footer"><div class="best-odds"><small>BEST PRICE</small><b>${odds}</b><span>${book}</span></div><button class="button compact">View analysis</button></div>
    </article>`;

  const pages = {
    live(league){
      return `
      <section class="live-page broadcast-destination" data-live-route="${league}">
        <section class="destination-hero live-destination-hero">
          <div>
            <span class="destination-kicker"><i></i> LIVE CENTER · ${leagueName(league)}</span>
            <h1>Everything happening now.</h1>
            <p>Real games, scores, clocks and game state from the live scoreboard feed, with current verified TSO model and sportsbook signals in the same view.</p>
          </div>
          <div class="destination-actions">
            <span class="live-data-badge" data-live-feed-badge><i></i> CONNECTING</span>
            <button class="button primary" type="button" data-live-multi> MULTI-GAME VIEW →</button>
          </div>
        </section>

        <section class="live-filter-strip">
          <div class="segmented destination-segmented">
            <button class="${league==='all'?'is-active':''}" data-inline-league="all">ALL</button>
            <button class="${league==='nhl'?'is-active':''}" data-inline-league="nhl">NHL</button>
            <button class="${league==='nfl'?'is-active':''}" data-inline-league="nfl">NFL</button>
            <button class="${league==='mlb'?'is-active':''}" data-inline-league="mlb">MLB</button>
            <button class="${league==='nba'?'is-active':''}" data-inline-league="nba">NBA</button>
          </div>
          <div class="live-filter-meta" data-live-filter-meta><span class="live-pulse"></span><b>CONNECTING</b><span>·</span><small>Waiting for scoreboard</small></div>
        </section>

        <section class="live-command-grid">
          <div class="live-feature-stack">
            <div class="live-selected-game-top">
              <article class="live-gamecast-hero live-feed-loading" data-live-feature>
                <div class="live-feed-empty">
                  <span class="live-feed-spinner"></span>
                  <div><b>Connecting to live scoreboard…</b><small>NHL · NFL · MLB · NBA</small></div>
                </div>
              </article>

              <aside class="live-player-watch live-player-watch--loading" data-live-player-watch aria-label="Player to watch">
                <div class="live-player-watch-loading">
                  <span class="live-feed-spinner"></span>
                  <div><b>Finding player to watch…</b><small>Live stats from the selected game</small></div>
                </div>
              </aside>
            </div>

            <section class="live-game-detail" data-live-game-detail aria-label="Selected game detail">
              <div class="live-game-detail-head">
                <div>
                  <span class="live-detail-kicker">GAME DETAIL</span>
                  <h2 data-live-detail-title>Play by play</h2>
                </div>
                <div class="live-detail-tabs" role="tablist" aria-label="Selected game detail view">
                  <button type="button" class="is-active" role="tab" aria-selected="true" data-live-detail-tab="plays">PLAY BY PLAY</button>
                  <button type="button" role="tab" aria-selected="false" data-live-detail-tab="box">BOX SCORE</button>
                </div>
              </div>
              <div class="live-detail-subbar" data-live-play-controls>
                <div class="live-play-filters" role="group" aria-label="Play by play filter">
                  <button type="button" class="is-active" data-live-play-filter="all">ALL PLAYS <span data-live-play-count="all"></span></button>
                  <button type="button" data-live-play-filter="scoring">SCORING <span data-live-play-count="scoring"></span></button>
                </div>
                <div class="live-detail-freshness" data-live-detail-freshness>
                  <span class="live-pulse"></span>
                  <b>LIVE</b>
                  <small>Waiting for feed</small>
                </div>
              </div>
              <div class="live-current-situation" data-live-current-situation hidden></div>
              <div class="live-detail-body" data-live-detail-body>
                <div class="live-detail-loading"><span class="live-feed-spinner"></span><b>Waiting for selected game…</b></div>
              </div>
            </section>
          </div>
        </section>

        <section class="destination-section live-games-section">
          <div class="destination-section-head">
            <div><span class="gold-kicker">LIVE SCOREBOARD</span><h2 data-live-board-title>Today’s games</h2></div>
            <span class="live-source-label">SOURCE · LIVE SCOREBOARD</span>
          </div>
          <div class="live-score-board" data-live-score-board>
            <div class="live-board-loading"><span class="live-feed-spinner"></span><b>Loading today’s slate…</b></div>
          </div>
        </section>

        <section class="destination-section live-model-pulse-section">
          <div class="destination-section-head">
            <div><span class="violet-kicker">MODEL / MARKET PULSE · REAL DATA</span><h2 data-live-model-title>Current TSO signals</h2></div>
            <button data-route-jump="models">OPEN MODELS →</button>
          </div>
          <div class="live-model-source-state" data-live-model-source>
            <span class="live-pulse"></span>
            <div><b>CONNECTING VERIFIED MODEL FEED</b><small>Exact model-to-market rows only</small></div>
          </div>
          <div class="live-model-grid" data-live-model-grid>
            <div class="live-board-loading home-model-empty--wide"><span class="live-feed-spinner"></span><div><b>Loading real model signals…</b><small>No preview cards will be substituted.</small></div></div>
          </div>
        </section>
      </section>`;
    },

    research(league){
      return '<section class="rg2-page broadcast-destination" data-research-route aria-label="TSO 2.0 all-sports Research Lab">'
        +'<div class="rg2-empty"><span class="live-feed-spinner"></span><b>Connecting verified '+leagueName(league)+' research feeds…</b></div>'
        +'</section>';
    },

    models(league){
      return `
      <section class="models-page broadcast-destination" data-models-route="${league}">
        <section class="destination-hero models-destination-hero">
          <div class="models-hero-copy">
            <div class="models-title-lockup">
              <img class="models-hero-icon" src="/brand/production/tso2-product-models-approved.webp" alt="" />
              <span class="destination-kicker models-kicker">MODEL COMMAND CENTER · ${leagueName(league)}</span>
            </div>
            <h1>Real model outputs. Ranked against the exact market.</h1>
            <p>TSO only ranks a selection here when the sportsbook row matches the real model on player, market, side and exact line. No model match means no invented probability, edge or confidence.</p>
          </div>
          <div class="destination-actions">
            <span class="props-feed-badge" data-models-feed-badge><i></i> CONNECTING MODELS</span>
            ${(league==='nhl'||league==='all')?'<button class="button secondary" data-route-jump="gameedge">GAME EDGE →</button>':''}
            <button class="button primary" data-models-refresh>REFRESH MODELS ↻</button>
          </div>
        </section>

        <section class="models-status-strip" data-models-status>
          <div><span class="model-live-dot"></span><b>CONNECTING MODEL FEED</b><small>Exact model matches only</small></div>
          <span class="models-status-divider"></span>
          <div><b>—</b><small>model matches</small></div>
          <span class="models-status-divider"></span>
          <div><b>—</b><small>modeled sports</small></div>
          <span class="models-status-divider"></span>
          <div><b>—</b><small>model sources</small></div>
          <span class="models-status-divider"></span>
          <div><b>—</b><small>source freshness</small></div>
        </section>

        <section class="models-engine-tabs" data-models-sport-summary>
          <button class="models-engine-tab is-active">
            <span class="models-engine-mark models-engine-mark--violet">◎</span>
            <div><b>LOADING MODELS</b><small>NHL · NFL · MLB · NBA market status</small></div>
            <i>CONNECTING</i>
          </button>
        </section>

        ${(league==='nhl'||league==='all')?`
        <section class="nhl-scorer-command" data-nhl-scorer-shell>
          <div class="nhl-scorer-hero">
            <div class="nhl-scorer-title">
              <span class="nhl-scorer-target">◎</span>
              <div>
                <span class="violet-kicker">NHL SCORER MODEL · TSO 1.0 ENGINE</span>
                <h2>First Goal / Anytime Goal Scorer</h2>
                <p>Same FGS-Hazard Ensemble v3 used in TSO 1.0 — rebuilt inside the 2.0 command-center layout.</p>
              </div>
            </div>
            <div class="nhl-scorer-meta" data-nhl-scorer-meta>
              <span><b>FGS-Hazard Ensemble v3</b><small>competing scoring hazards</small></span>
              <span><b>TOP 3 + RISKY VALUE</b><small>per team</small></span>
              <span><b>MARKET ANCHORED</b><small>verified scorer prices</small></span>
              <span><b>MATCHUP ADJUSTED</b><small>form · defense · goalie · rest</small></span>
            </div>
            <div class="nhl-scorer-market">
              <span>SCORER MARKET</span>
              <div>
                <button class="is-active" data-nhl-scorer-market="fgs">FIRST GOAL</button>
                <button data-nhl-scorer-market="atg">ANYTIME GOAL</button>
              </div>
            </div>
            <div class="nhl-scorer-owner-actions" data-owner-only hidden aria-hidden="true">
              <div><span>OWNER SHARE STUDIO</span><small>Build one card containing every team on the current scorer slate.</small></div>
              <div>
                <button data-nhl-scorer-slate-share="fgs">SHARE FIRST GOAL SLATE</button>
                <button data-nhl-scorer-slate-share="atg">SHARE ANYTIME GOAL SLATE</button>
              </div>
            </div>
          </div>
          <div class="nhl-scorer-body" data-nhl-scorer-body>
            <div class="live-board-loading"><span class="live-feed-spinner"></span><div><b>Loading the real NHL scorer model…</b><small>Same generated board used by TSO 1.0.</small></div></div>
          </div>
          <div class="nhl-scorer-note">
            <span>MODEL SOURCE · FGS-HAZARD ENSEMBLE V3</span>
            <small>Sportsbook scorer markets remain the anchor. When no live scorer price exists, TSO shows the model FAIR price instead of inventing a sportsbook quote.</small>
          </div>
        </section>
        `:''}

        <section class="models-command-grid">
          <article class="model-spotlight-card live-feed-loading" data-models-feature>
            <div class="live-feed-empty">
              <span class="live-feed-spinner"></span>
              <div><b>Loading exact model matches…</b><small>Real TSO probability + exact sportsbook market only.</small></div>
            </div>
          </article>

          <aside class="model-edge-board" data-models-edge-board>
            <div class="model-edge-head">
              <div><span class="violet-kicker">EDGE BOARD</span><h2>Best model gaps right now</h2></div>
              <span>REAL DATA</span>
            </div>
            <div class="live-feed-side-loading">
              <span class="live-feed-spinner"></span>
              <div><b>Ranking exact matches</b><small>Sorted by model-vs-market edge.</small></div>
            </div>
          </aside>
        </section>

        <section class="destination-section props-board-section">
          <div class="destination-section-head">
            <div><span class="gold-kicker">LIVE MODEL RANKINGS</span><h2 data-models-board-title>Exact model-to-market matches</h2></div>
            <span class="props-live-source">SOURCE · REAL TSO MODELS + VERIFIED ODDS</span>
          </div>
          <div class="props-board props-board-live">
            <div class="props-board-head props-board-head-live">
              <span>PLAYER / MARKET</span><span>EXACT</span><span>MODEL</span><span>MARKET</span><span>EDGE</span><span>MODEL TAG</span><span>BEST PRICE</span><span>BOOK</span><span>UPDATED</span><span>LINK</span>
            </div>
            <div data-models-board>
              <div class="live-board-loading"><span class="live-feed-spinner"></span><b>Loading ranked model matches…</b></div>
            </div>
          </div>
          <div class="props-exact-note">
            <span>✓</span>
            <div><b>STRICT MODEL MATCHING</b><small>Same player + market + side + exact line. NHL uses the real First Goal / Anytime Goal models; NFL uses the real pregame Monte Carlo exact-line outputs; MLB uses the real daily 10,000-run model; NBA uses Regression v1 from verified ESPN history and matchup context.</small></div>
          </div>
        </section>

        <section class="destination-section">
          <div class="destination-section-head">
            <div><span class="violet-kicker">MODEL ENGINES</span><h2>What is actually modeled</h2></div>
            <span class="props-live-source">NO SYNTHETIC PROBABILITIES</span>
          </div>
          <div class="model-engine-grid model-engine-grid--live">
            <article class="model-engine-card model-engine-card--violet">
              <div class="model-engine-top"><span>NHL</span><b>LIVE MODEL</b></div>
              <h3>First Goal + Anytime Goal</h3>
              <p>Real TSO hockey scoring outputs matched to the exact verified sportsbook selection.</p>
              <div><span>CURRENT MATCHES</span><b data-model-count="nhl">—</b></div>
              <button data-models-league="nhl">OPEN NHL →</button>
            </article>
            <article class="model-engine-card model-engine-card--blue">
              <div class="model-engine-top"><span>NFL</span><b>LIVE MODEL</b></div>
              <h3>Monte Carlo Player Props</h3>
              <p>Exact-line pregame model outputs compared only with verified pregame sportsbook prices.</p>
              <div><span>CURRENT MATCHES</span><b data-model-count="nfl">—</b></div>
              <button data-models-league="nfl">OPEN NFL →</button>
            </article>
            <article class="model-engine-card model-engine-card--gold">
              <div class="model-engine-top"><span>MLB</span><b>LIVE MODEL</b></div>
              <h3>Daily 10,000-Run Model</h3>
              <p>Home Run, Hits, Total Bases, RBI, H+R+RBI and Stolen Bases exact-line outputs.</p>
              <div><span>CURRENT MATCHES</span><b data-model-count="mlb">—</b></div>
              <button data-models-league="mlb">OPEN MLB →</button>
            </article>
            <article class="model-engine-card model-engine-card--orange">
              <div class="model-engine-top"><span>NBA</span><b>REGRESSION v1</b></div>
              <h3>History + Matchup Regression</h3>
              <p>NBA prices can exist in Props, but this Model Command Center will not manufacture a probability or edge.</p>
              <div><span>CURRENT MATCHES</span><b data-model-count="nba">0 BY DESIGN</b></div>
              <button data-models-league="nba">VIEW NBA STATUS →</button>
            </article>
          </div>
        </section>

        <section class="models-framework-grid">
          <article class="models-framework-card">
            <div class="models-framework-head"><span class="violet-kicker">RANKING RULE</span><h2>Edge first, exactness always</h2></div>
            <div class="models-input-grid">
              <span><i>01</i><b>Exact Player</b><small>No name-neighbor matching</small></span>
              <span><i>02</i><b>Exact Market</b><small>Correct prop family</small></span>
              <span><i>03</i><b>Exact Side + Line</b><small>No nearby threshold substitution</small></span>
              <span><i>04</i><b>Verified Price</b><small>Market probability from the exact quote</small></span>
            </div>
          </article>

          <article class="models-framework-card">
            <div class="models-framework-head"><span class="gold-kicker">MODEL SOURCE</span><h2>One board, real engines</h2></div>
            <div class="models-input-grid">
              <span><i>NHL</i><b>Scoring Models</b><small>First Goal · Anytime Goal</small></span>
              <span><i>NFL</i><b>Monte Carlo</b><small>Pregame exact-line props</small></span>
              <span><i>MLB</i><b>10,000 Runs</b><small>Daily hitter prop simulations</small></span>
              <span><i>NBA</i><b>Regression v1</b><small>History · minutes · usage · matchup · pace</small></span>
            </div>
          </article>

          <article class="models-framework-card models-run-card">
            <div class="models-framework-head"><span class="orange-kicker">LATEST RUN</span><h2>Live model pulse</h2></div>
            <div class="models-run-stat"><span>EXACT MODEL MATCHES</span><b data-models-pulse-count>—</b><small>current filter</small></div>
            <div class="models-run-stat"><span>TOP EDGE</span><b data-models-pulse-edge>—</b><small>model vs market</small></div>
            <div class="models-run-footer"><span class="model-live-dot"></span> <span data-models-pulse-age>Waiting for verified snapshot</span></div>
          </article>
        </section>
      </section>`;
    },

    gameedge(league){
      return `
      <section class="edge2-page broadcast-destination" data-game-edge-route="${league}">
        <section class="destination-hero edge2-hero">
          <div class="edge2-hero-copy">
            <div class="edge2-title-lockup">
              <span class="edge2-mark" aria-hidden="true">◎</span>
              <span class="destination-kicker edge2-kicker">GAME EDGE · ${leagueName(league)}</span>
            </div>
            <h1>The game market in one decision view.</h1>
            <p>Spread, Moneyline and Total sit side by side for every matchup. Each bar shows the current market lean, followed by a matchup-specific reason using the team, opponent, venue, available record context and the actual line.</p>
          </div>
          <div class="destination-actions">
            <span class="edge2-feed-badge" data-game-edge-feed-badge><i></i> CONNECTING MARKET</span>
            <button class="button primary" data-game-edge-refresh>REFRESH EDGE ↻</button>
          </div>
        </section>

        <section class="edge2-status-strip">
          <div><span class="edge2-live-dot"></span><b data-game-edge-status>CONNECTING</b><small>verified two-sided game market</small></div>
          <span class="edge2-status-divider"></span>
          <div><b data-game-edge-game-count>—</b><small>games on slate</small></div>
          <span class="edge2-status-divider"></span>
          <div><b>3 CORE MARKETS</b><small>Spread · Moneyline · Total</small></div>
          <span class="edge2-status-divider"></span>
          <div><b>MATCHUP READ</b><small>context behind the lean</small></div>
        </section>

        <section class="edge2-league-deck" aria-label="Game Edge sport">
          <button class="edge2-league-tab ${league==='nhl'?'is-active':''}" data-inline-league="nhl">
            <span class="edge2-league-code">NHL</span><div><b>HOCKEY</b><small>${league==='nhl'?'LIVE GAME MARKET':'Open Game Edge'}</small></div><i>${league==='nhl'?'LIVE':'→'}</i>
          </button>
          <button class="edge2-league-tab ${league==='nfl'?'is-active':''}" data-inline-league="nfl">
            <span class="edge2-league-code">NFL</span><div><b>FOOTBALL</b><small>${league==='nfl'?'CURRENT VIEW':'GAME EDGE READY'}</small></div><i>→</i>
          </button>
          <button class="edge2-league-tab ${league==='mlb'?'is-active':''}" data-inline-league="mlb">
            <span class="edge2-league-code">MLB</span><div><b>BASEBALL</b><small>${league==='mlb'?'CURRENT VIEW':'GAME EDGE READY'}</small></div><i>→</i>
          </button>
          <button class="edge2-league-tab ${league==='nba'?'is-active':''}" data-inline-league="nba">
            <span class="edge2-league-code">NBA</span><div><b>BASKETBALL</b><small>${league==='nba'?'CURRENT VIEW':'GAME EDGE READY'}</small></div><i>→</i>
          </button>
        </section>

        <section class="destination-section edge2-board-section">
          <div class="destination-section-head">
            <div><span class="edge2-kicker">CORE GAME MARKETS</span><h2 data-game-edge-market-title>${league==='nhl'?'NHL Game Edge':'Game Edge'}</h2></div>
            <span class="edge2-freshness" data-game-edge-freshness>Spread · Moneyline · Total</span>
          </div>
          <div class="edge2-board" data-game-edge-board>
            <div class="live-board-loading edge2-loading"><span class="live-feed-spinner"></span><div><b>Loading Game Edge…</b><small>Building the current three-market decision view.</small></div></div>
          </div>
        </section>

        <section class="edge2-read-band">
          <div><span>01</span><b>READ THE BAR</b><small>The larger side is the stronger current market lean.</small></div>
          <div><span>02</span><b>CHECK THE PRICE</b><small>Each side keeps its current verified line and American price.</small></div>
          <div><span>03</span><b>READ THE WHY</b><small>A matchup-specific sentence explains why that side or total gets the edge.</small></div>
        </section>
      </section>`;
    },

    props(league){
      return `
      <section class="props-page broadcast-destination" data-props-route="${league}">
        <section class="destination-hero props-destination-hero">
          <div>
            <div class="props-title-lockup">
              <img class="props-hero-icon" src="/brand/production/tso2-product-props-approved.webp" alt="" />
              <span class="destination-kicker props-kicker">PROP INTELLIGENCE · ${leagueName(league)}</span>
            </div>
            <h1>Exact lines. Real model-to-market edges.</h1>
            <p>Verified sportsbook snapshots matched to real TSO model outputs only when player, market, side and exact threshold agree. No nearby-line substitutions and no invented model probabilities.</p>
          </div>
          <div class="destination-actions">
            <span class="props-feed-badge" data-props-feed-badge><i></i> CONNECTING ODDS</span>
            <button class="button primary" data-route-jump="parlays">BUILD FROM PROPS →</button>
          </div>
        </section>

        <section class="props-status-strip" data-props-status>
          <div><span class="props-live-dot"></span><b>CONNECTING VERIFIED FEED</b></div>
          <span class="props-status-divider"></span>
          <div><b>—</b><small>exact selections</small></div>
          <span class="props-status-divider"></span>
          <div><b>—</b><small>model matched</small></div>
          <span class="props-status-divider"></span>
          <div><b>—</b><small>sportsbooks</small></div>
          <span class="props-status-divider"></span>
          <div><b>—</b><small>source freshness</small></div>
        </section>

        <section class="props-control-deck props-control-deck--pro">
          <div class="segmented props-sport-tabs">
            <button class="${league==='all'?'is-active':''}" data-inline-league="all">ALL</button>
            <button class="${league==='nhl'?'is-active':''}" data-inline-league="nhl">NHL</button>
            <button class="${league==='nfl'?'is-active':''}" data-inline-league="nfl">NFL</button>
            <button class="${league==='mlb'?'is-active':''}" data-inline-league="mlb">MLB</button>
            <button class="${league==='nba'?'is-active':''}" data-inline-league="nba">NBA</button>
          </div>
          <label class="props-command-search">
            <span>⌕</span>
            <input data-props-search placeholder="Search player, team, matchup or exact line..." autocomplete="off" />
            <kbd>LIVE</kbd>
          </label>
          <div class="props-filter-actions props-filter-actions--pro">
            <select data-props-market-filter aria-label="Filter prop market"><option value="">MARKET: ALL</option></select>
            <select data-props-book-filter aria-label="Filter sportsbook"><option value="">BOOK: ALL</option></select>
            <select data-props-side-filter aria-label="Filter side">
              <option value="">SIDE: ALL</option>
              <option value="over">OVER / YES</option>
              <option value="under">UNDER / NO</option>
            </select>
            <select data-props-model-filter aria-label="Filter model coverage">
              <option value="">DATA: ALL</option>
              <option value="modeled">MODELED ONLY</option>
              <option value="market">MARKET ONLY</option>
            </select>
            <select data-props-sort aria-label="Sort player props">
              <option value="edge">SORT: MODEL EDGE</option>
              <option value="model">SORT: MODEL PROB</option>
              <option value="books">SORT: BOOK COVERAGE</option>
              <option value="price">SORT: BEST PRICE</option>
              <option value="fresh">SORT: FRESHEST</option>
              <option value="player">SORT: PLAYER A–Z</option>
            </select>
            <button data-props-refresh>REFRESH ODDS ↻</button>
          </div>
        </section>

        <section class="props-market-rail-shell">
          <div class="props-market-rail-head">
            <div><span class="violet-kicker">MARKET COMMAND</span><h2>Jump straight to a prop family</h2></div>
            <span data-props-filter-summary>Building live market index…</span>
          </div>
          <div class="props-market-rail" data-props-market-rail>
            <div class="live-feed-side-loading"><span class="live-feed-spinner"></span><div><b>Indexing verified markets…</b></div></div>
          </div>
        </section>

        <section class="props-command-grid">
          <article class="prop-spotlight props-live-feature live-feed-loading" data-props-feature>
            <div class="live-feed-empty">
              <span class="live-feed-spinner"></span>
              <div><b>Loading verified sportsbook markets…</b><small>Exact lines and prices only.</small></div>
            </div>
          </article>

          <aside class="props-movers-board props-live-books" data-props-books>
            <div class="props-movers-head">
              <div><span class="orange-kicker">SPORTSBOOK COVERAGE</span><h2>Exact-line books</h2></div>
              <span>REAL DATA</span>
            </div>
            <div class="live-feed-side-loading">
              <span class="live-feed-spinner"></span>
              <div><b>Loading books</b><small>Coverage for the current exact selections.</small></div>
            </div>
          </aside>
        </section>

        <section class="destination-section props-board-section">
          <div class="destination-section-head">
            <div><span class="gold-kicker">REAL PROP BOARD</span><h2 data-props-board-title>Verified sportsbook selections</h2></div>
            <span class="props-live-source">SOURCE · TSO ODDS SNAPSHOTS</span>
          </div>
          <div class="props-board props-board-live">
            <div class="props-board-head props-board-head-live props-board-head-pro">
              <span>PLAYER / MARKET</span><span>EXACT</span><span>MODEL</span><span>MARKET</span><span>EDGE</span><span>MODEL TAG</span><span>PRICE</span><span>BOOK</span><span>UPDATED</span><span>ACTIONS</span>
            </div>
            <div data-props-board>
              <div class="live-board-loading"><span class="live-feed-spinner"></span><b>Loading exact selections…</b></div>
            </div>
          </div>
          <div class="props-exact-note"><span>✓</span><div><b>EXACT-SELECTION PROTECTION</b><small>Every displayed price belongs to the exact line and side shown. Selecting a sportsbook re-prices that exact selection and recalculates market probability / edge for that book instead of continuing to show another book's price.</small></div></div>
          <div class="props-exact-note props-account-save-note"><span>★</span><div><b>SAVE YOUR PICKS & FOLLOW PLAYERS</b><small>Sign in to save exact Over/Under selections or follow players with verified IDs. Saved items appear under Profile and persist across devices. Anytime TD, First Goal, Anytime Goal and Home Run YES/NO picks are saved separately in your TSO 2.0 account without changing their sportsbook meaning. Verified event results and hit alerts are still being built.</small></div></div>
        </section>

        <section class="destination-section">
          <div class="destination-section-head">
            <div><span class="violet-kicker">FEED INTEGRITY</span><h2>What is real right now</h2></div>
            <button data-route-jump="models">OPEN MODELS →</button>
          </div>
          <div class="props-intelligence-grid" data-props-integrity>
            <article class="props-intel-card">
              <span class="gold-kicker">VERIFIED PRICES</span>
              <h3>Real sportsbook snapshots</h3>
              <p>Prices come from the existing TSO ParlayAPI-backed odds files. Sample rows are rejected from this view.</p>
              <div><span>Selection policy</span><b>Exact only</b></div>
              <div><span>Nearby substitutions</span><b>Never</b></div>
            </article>
            <article class="props-intel-card">
              <span class="orange-kicker">FRESHNESS</span>
              <h3 data-props-freshness-title>Checking source age</h3>
              <p data-props-freshness-copy>The page labels source freshness from the verified snapshot timestamp instead of pretending old prices are live.</p>
              <div><span>Auto refresh</span><b>60 sec</b></div>
              <div><span>Preserved rows</span><b data-props-preserved>—</b></div>
            </article>
            <article class="props-intel-card">
              <span class="violet-kicker">MODEL LAYER</span>
              <h3 data-props-model-title>Connecting exact model matches</h3>
              <p>TSO probabilities attach only when the model and sportsbook row agree on the same player, market, side and exact threshold.</p>
              <div><span>NHL / NFL / MLB</span><b data-props-model-coverage>CONNECTING</b></div>
              <div><span>NBA</span><b>REGRESSION v1</b></div>
            </article>
          </div>
        </section>
      </section>`;
    },

    parlays(league){
      // Parlay Ping runs on its original Render backend; every functional page
      // now lives inside this TSO 2.0 workspace instead of external landing links.
      return `
      <section class="parlayping-workspace" data-parlayping-workspace>
        <header class="parlayping-workspace-head">
          <img class="parlayping-workspace-icon" src="https://parlayping.thesportsoutpost.com/parlayping-approved-hero.webp" alt="" />
          <div class="parlayping-workspace-heading">
            <small>THE SPORTS OUTPOST / PARLAY PING</small>
            <h1>Parlay Ping</h1>
            <p>Powered by The Sports Outpost <span aria-hidden="true">·</span> Tag it. Track it. Tail what's left.</p>
          </div>
          <span class="parlayping-workspace-connected"><i aria-hidden="true"></i> RENDER ENGINE</span>
        </header>
        <nav class="parlayping-workspace-nav" aria-label="Parlay Ping features" data-parlayping-nav>
          <button class="is-active" type="button" data-parlayping-page="/" aria-current="page">BUILD & ANALYZE</button>
          <button type="button" data-parlayping-page="/submit">UPLOAD SLIP</button>
          <button type="button" data-parlayping-page="/profile">MY PARLAYS</button>
          <button type="button" data-parlayping-page="/trending">EXPLORE</button>
          <button type="button" data-parlayping-page="/profile?tab=community">COMMUNITY</button>
          <button type="button" data-parlayping-page="/profile?tab=dev">DEVELOPER API</button>
          <button type="button" data-parlayping-page="/account.html">ACCOUNT</button>
        </nav>
        <div class="parlayping-workspace-frame-shell">
          <div class="parlayping-workspace-loader" data-parlayping-loading role="status">Loading Parlay Ping tools…</div>
          <iframe
            data-parlayping-frame
            title="Parlay Ping — live builder, tracking, community and developer API"
            src="https://parlayping.thesportsoutpost.com/?tso_embed=1"
            loading="eager"
            referrerpolicy="strict-origin-when-cross-origin"
            allow="clipboard-read; clipboard-write"
          ></iframe>
        </div>
        <p class="parlayping-workspace-footnote">Parlay Ping features run against the existing secured Render backend and Parlay Ping account. Your tracked slips, shares, plans and API keys remain in their original service.</p>
      </section>`;
    },

    community(league){
      return `
      <section class="community-page broadcast-destination" data-community-route>
        <section class="destination-hero community-destination-hero">
          <div>
            <span class="destination-kicker">COMMUNITY · ${leagueName(league)}</span>
            <h1>The social layer starts with real signals.</h1>
            <p>Until member accounts, posts, reactions and rooms have a real persistence layer, TSO shows a data-backed Model Pulse instead of invented community activity.</p>
          </div>
          <div class="destination-actions">
            <button class="button secondary" data-community-refresh>REFRESH PULSE</button>
            <button class="button primary" data-community-post disabled>CREATE POST · COMING SOON</button>
          </div>
        </section>

        <section class="community-live-strip" data-community-status>
          <div><span class="props-live-dot"></span><b>CONNECTING MODEL PULSE</b><small>Real TSO model feed</small></div>
          <span class="props-status-divider"></span>
          <div><b>NO FAKE MEMBERS</b><small>accounts not connected</small></div>
          <span class="props-status-divider"></span>
          <div><b>NO FAKE REACTIONS</b><small>engagement not simulated</small></div>
          <span class="props-status-divider"></span>
          <div><b>SPORT AWARE</b><small>${leagueName(league)}</small></div>
        </section>

        <section class="community-layout">
          <div class="feed" data-community-feed>
            <div class="live-board-loading community-feed-loading"><span class="live-feed-spinner"></span><div><b>Loading real Outpost signals…</b><small>Top exact model-to-market edges will appear here.</small></div></div>
          </div>

          <aside class="panel room-card community-launch-card">
            <span class="violet-kicker">COMMUNITY LAUNCH STATE</span>
            <h2>Member activity is not connected yet.</h2>
            <p>TSO will not manufacture usernames, online counts, comments, reactions, records or chat messages.</p>
            <div class="community-launch-list">
              <div><span>✓</span><div><b>Real model sharing surface</b><small>Model Pulse is live now.</small></div></div>
              <div><span>○</span><div><b>Member posts</b><small>Needs persistent account/post storage.</small></div></div>
              <div><span>○</span><div><b>Reactions + comments</b><small>Needs real engagement records.</small></div></div>
              <div><span>○</span><div><b>Live sport rooms</b><small>Needs real presence and messaging.</small></div></div>
            </div>
            <button class="button secondary full" data-route-jump="models">OPEN LIVE MODELS</button>
          </aside>
        </section>
      </section>`;
    },

    leaderboard(league){
      return `
      <section class="rankings-page broadcast-destination" data-leaderboard-route>
        <section class="destination-hero rankings-destination-hero">
          <div>
            <span class="destination-kicker">RANKINGS · ${leagueName(league)}</span>
            <h1>Rank what is actually measurable.</h1>
            <p>User records, win rates, streaks and points stay offline until TSO has verified tracked-pick history. The live ranking below is the real model board — clearly labeled as model ranking, not member performance.</p>
          </div>
          <div class="destination-actions">
            <button class="button secondary" data-rankings-refresh>REFRESH DATA</button>
            <button class="button primary" data-route-jump="models">OPEN MODELS →</button>
          </div>
        </section>

        <section class="community-live-strip rankings-live-strip" data-rankings-status>
          <div><span class="props-live-dot"></span><b>CONNECTING REAL RANKINGS</b><small>Exact model matches</small></div>
          <span class="props-status-divider"></span>
          <div><b>USER LEADERBOARD</b><small>awaiting verified history</small></div>
          <span class="props-status-divider"></span>
          <div><b>MODEL RANKING</b><small>live by exact edge</small></div>
          <span class="props-status-divider"></span>
          <div><b>NO FAKE RECORDS</b><small>win rates not simulated</small></div>
        </section>

        <section class="rankings-integrity panel">
          <div>
            <span class="gold-kicker">USER LEADERBOARD · DATA INTEGRITY</span>
            <h2>Standings activate after tracked picks have real outcomes.</h2>
            <p>TSO needs persisted user picks, settlement results and the final points rules before a member can honestly have a record, win rate, streak or leaderboard rank.</p>
          </div>
          <div class="rankings-readiness">
            <span><small>MEMBER RECORDS</small><b>NOT CONNECTED</b></span>
            <span><small>SETTLED PICKS</small><b>NOT CONNECTED</b></span>
            <span><small>POINTS LEDGER</small><b>NOT CONNECTED</b></span>
          </div>
        </section>

        <section class="destination-section rankings-model-section">
          <div class="destination-section-head">
            <div><span class="violet-kicker">LIVE MODEL RANKING · NOT USER STANDINGS</span><h2 data-rankings-title>Loading exact model edges…</h2></div>
            <button data-route-jump="models">FULL MODEL BOARD →</button>
          </div>

          <div class="podium rankings-model-podium" data-rankings-podium>
            <div class="live-board-loading home-model-empty--wide"><span class="live-feed-spinner"></span><div><b>Ranking real model rows…</b></div></div>
          </div>

          <section class="leader-table panel rankings-model-table">
            <div class="leader-head rankings-model-head"><span>RANK</span><span>PLAYER</span><span>SPORT</span><span>EXACT</span><span>MODEL</span><span>EDGE</span></div>
            <div data-rankings-board>
              <div class="live-board-loading"><span class="live-feed-spinner"></span><div><b>Loading exact model rankings…</b></div></div>
            </div>
          </section>
        </section>
      </section>`;
    },

    admin(){
      if(window.TSO_AUTH?.user?.isOwner!==true){
        return '<section class="tso-admin-locked"><span>OWNER ACCESS</span><h1>Private administration</h1><p>This area is reserved for the verified Sports Outpost owner.</p><button class="button secondary" data-route-jump="home">RETURN HOME</button></section>';
      }
      return `
      <section class="tso-admin-page" data-admin-dashboard>
        <div class="tso-admin-hero">
          <div><span class="eyebrow">THE SPORTS OUTPOST · PRIVATE OWNER AREA</span><h1>Outpost Control Room</h1><p>Manage launch notices, monitor live data, and review account activity. Only the verified owner can read or save this information.</p></div>
          <div class="tso-admin-hero-actions"><span class="tso-admin-private">OWNER ONLY</span><button type="button" class="button secondary" data-admin-refresh>↻ REFRESH REPORTS</button></div>
        </div>
        <div class="tso-admin-message" data-admin-message role="status" aria-live="polite">Verifying access and loading reports…</div>
        <section class="tso-admin-stats" aria-label="Account and activity statistics">
          <article><span>REGISTERED USERS</span><b data-admin-metric="accountsTotal">—</b><small>Verified account profiles</small></article>
          <article><span>NEW USERS · 7 DAYS</span><b data-admin-metric="accountsLast7Days">—</b><small>Recent registrations</small></article>
          <article><span>ACTIVE LOGINS · 7 DAYS</span><b data-admin-metric="signedInLast7Days">—</b><small>Accounts signed in recently</small></article>
          <article><span>COMMUNITY POSTS</span><b data-admin-metric="postsTotal">—</b><small>Database total</small></article>
          <article><span>TRACKED PICKS</span><b data-admin-metric="picksTotal">—</b><small>Database total</small></article>
          <article><span>PUSH SUBSCRIPTIONS</span><b data-admin-metric="pushSubscriptionsTotal">—</b><small>Registered devices</small></article>
        </section>
        <div class="tso-admin-grid">
          <section class="tso-admin-panel">
            <div class="tso-admin-panel-heading"><div><span>LIVE DATA HEALTH</span><h2>Sports feed reports</h2><p>Checks the same API sources visitors use. This is not a Cloudflare billing report.</p></div><span data-admin-feed-state>CONNECTING</span></div>
            <div class="tso-admin-feed-summary" data-admin-feed-summary>Loading live score and player prop feeds…</div>
            <div class="tso-admin-table-wrap">
              <table class="tso-admin-table"><thead><tr><th>SPORT</th><th>GAMES</th><th>LIVE</th><th>PROP ROWS</th><th>MODEL MATCHES</th></tr></thead>
                <tbody data-admin-feed-table><tr><td colspan="5">Checking feeds…</td></tr></tbody></table>
            </div>
            <p class="tso-admin-subline" data-admin-nfl-source>NFL model source: checking…</p>
          </section>
          <section class="tso-admin-panel">
            <div class="tso-admin-panel-heading"><div><span>QUICK ACCESS</span><h2>Owner shortcuts</h2><p>Open operational tools without changing your deployment.</p></div></div>
            <div class="tso-admin-shortcuts">
              <a href="https://github.com/jthomas0786/The-Sports-Outpost/actions" target="_blank" rel="noopener noreferrer">GitHub Actions <small>Model builds & validation runs ↗</small></a>
              <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer">Cloudflare Dashboard <small>Worker status, DNS & usage ↗</small></a>
              <a href="https://supabase.com/dashboard/project/hjhfbhpuuxnrexddplxd" target="_blank" rel="noopener noreferrer">Supabase <small>Users & database ↗</small></a>
              <a href="/brand-lab" data-owner-only target="_blank" rel="noopener noreferrer">Brand Lab <small>Approved assets & share design ↗</small></a>
            </div>
            <p class="tso-admin-subline">Changes to production hosting, user roles, odds calculations and model releases are deliberately not available as one-click actions here.</p>
          </section>
        </div>
        <div class="tso-admin-grid">
          <section class="tso-admin-panel">
            <div class="tso-admin-panel-heading"><div><span>SITE SETTINGS</span><h2>Public announcement</h2><p>Post an update above the live ticker without editing GitHub. This setting affects the TSO 2.0 site only.</p></div></div>
            <form data-admin-settings-form class="tso-admin-settings-form">
              <label for="tso-admin-announcement">Announcement text (240 characters)</label>
              <textarea id="tso-admin-announcement" name="announcement" rows="3" maxlength="240" placeholder="Example: NHL models are being refreshed tonight."></textarea>
              <label class="tso-admin-checkbox"><input name="enabled" type="checkbox"> Show announcement to visitors</label>
              <label for="tso-admin-notes">Private owner notes (not public)</label>
              <textarea id="tso-admin-notes" name="notes" rows="4" maxlength="1000" placeholder="Launch checklist, reminders, future changes…"></textarea>
              <div class="tso-admin-form-bottom"><small data-admin-updated>Not loaded</small><button type="submit" class="button primary" data-admin-save>SAVE SETTINGS</button></div>
            </form>
          </section>
          <section class="tso-admin-panel">
            <div class="tso-admin-panel-heading"><div><span>AUDIT TRAIL</span><h2>Recent admin changes</h2><p>Read-only record of settings saves, showing the latest eight changes.</p></div></div>
            <div data-admin-audit class="tso-admin-audit"><p>Loading change history…</p></div>
          </section>
        </div>
      </section>`;
    },

    profile(league){
      return `
      <section class="profile-page broadcast-destination" data-profile-route>
        <section class="destination-hero profile-destination-hero">
          <div>
            <span class="destination-kicker">MY OUTPOST · ${leagueName(league)}</span>
            <h1>Your Outpost account.</h1>
            <p>View your verified profile, saved point-wager activity, player watchlist, saved picks and notifications from the existing Outpost account. Background device push and new 2.0 pick tracking are still being built.</p>
          </div>
          <div class="destination-actions">
            <button class="button secondary" data-profile-refresh>REFRESH DATA</button>
            <button class="button primary" data-profile-edit disabled>EDIT PROFILE · COMING SOON</button>
          </div>
        </section>

        <section class="profile-hero panel profile-hero--live">
          <div class="profile-avatar" data-profile-avatar>?</div>
          <div class="profile-identity">
            <span class="eyebrow" data-profile-role>ACCOUNT</span>
            <h2 data-profile-handle>@guest</h2>
            <p data-profile-context>Reading current session identity…</p>
          </div>
          <div class="profile-stats profile-stats--real">
            <div><span>VERIFIED PROPS</span><b data-profile-props>—</b></div>
            <div><span>MODEL MATCHES</span><b data-profile-models>—</b></div>
            <div><span>SPORTSBOOKS</span><b data-profile-books>—</b></div>
            <div><span>TODAY'S GAMES</span><b data-profile-games>—</b></div>
          </div>
        </section>

        <section class="profile-integrity-strip" data-profile-status>
          <div><span class="props-live-dot"></span><b>CONNECTING ACCOUNT VIEW</b><small>Real feed metrics only</small></div>
          <span class="props-status-divider"></span>
          <div><b>ACCOUNT HISTORY</b><small data-profile-history-state>sign in to load</small></div>
          <span class="props-status-divider"></span>
          <div><b>POINTS</b><small data-profile-points-state>sign in to load</small></div>
          <span class="props-status-divider"></span>
          <div><b>NOTIFICATIONS</b><small>in-app active · push pending</small></div>
        </section>

        <section class="split-section profile-state-grid">
          <article class="panel profile-state-card">
            <div class="section-heading compact-heading">
              <div><span class="gold-kicker">MY SAVED ACTIVITY</span><h2>Real account history.</h2></div>
              <span class="profile-state-badge" data-profile-activity-badge>SIGN IN</span>
            </div>
            <div class="profile-empty-state" data-profile-activity>
              <span>◎</span>
              <div><b>Sign in to view your saved picks, point wagers and watchlist.</b><small>Only your account's existing records will be displayed. No example results are inserted.</small></div>
            </div>
          </article>

          <article class="panel profile-state-card">
            <div class="section-heading compact-heading">
              <div><span class="violet-kicker">NOTIFICATIONS</span><h2>Current TSO alerts are active.</h2></div>
              <span class="profile-state-badge is-active">IN-APP ACTIVE</span>
            </div>
            <div class="profile-empty-state profile-notification-state">
              <span>♢</span>
              <div><b>Live games, model signals and system/data-health warnings now appear in the top Notification Center.</b><small>Saved alert preferences and background/device push are still pending the persisted account + delivery layer.</small></div>
            </div>
          </article>
        </section>

        <section class="profile-readiness panel">
          <div>
            <span class="orange-kicker">ACCOUNT DATA READINESS</span>
            <h2>Verified account data.</h2>
            <p>Saved history is read from your account using Supabase row-level security. Live sports signals are shown separately from your personal activity.</p>
          </div>
          <div class="profile-readiness-grid">
            <span><small>SESSION IDENTITY</small><b data-profile-identity-state>SIGNED OUT</b></span>
            <span><small>LIVE SPORTS DATA</small><b data-profile-feed-state>CONNECTING</b></span>
            <span><small>SAVED HISTORY</small><b data-profile-history-ready>SIGN IN</b></span>
            <span><small>POINTS BALANCE</small><b data-profile-points-ready>SIGN IN</b></span>
              <span><small>IN-APP NOTIFICATIONS</small><b>ACTIVE</b></span>
              <span><small>BACKGROUND PUSH</small><b class="is-offline">NOT CONNECTED</b></span>
          </div>
        </section>

        <section class="destination-section profile-signals-section">
          <div class="destination-section-head">
            <div><span class="gold-kicker">CURRENT OUTPOST SIGNALS · NOT YOUR PICK HISTORY</span><h2 data-profile-signals-title>Loading real model signals…</h2></div>
            <button data-route-jump="models">OPEN MODELS →</button>
          </div>
          <div class="profile-signal-grid" data-profile-signals>
            <div class="live-board-loading home-model-empty--wide"><span class="live-feed-spinner"></span><div><b>Loading exact model matches…</b></div></div>
          </div>
        </section>
      </section>`;
    }

  };

  window.TSO2Pages = pages;
})();