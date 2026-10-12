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
          <div class="parlayping-workspace-title">
            <img class="parlayping-workspace-icon" src="https://parlayping.thesportsoutpost.com/parlayping-approved-hero.webp" alt="" />
            <div class="parlayping-workspace-heading">
              <small>THE SPORTS OUTPOST <span aria-hidden="true">/</span> PARLAY PING</small>
              <h1>Parlay Ping</h1>
              <p>Build from verified TSO player props or upload a screenshot. Compare sportsbooks, then track with your TSO account.</p>
            </div>
          </div>
          <span class="parlayping-workspace-connected"><i aria-hidden="true"></i> TOOLS CONNECTED</span>
        </header>
        <nav class="parlayping-workspace-nav" aria-label="Parlay Ping tools" data-parlayping-nav>
          <button class="is-active" type="button" data-parlayping-page="/submit" aria-current="page">BETSLIP BUILDER</button>
          <button type="button" data-parlayping-page="/profile">MY PARLAYS</button>
        </nav>
        <div class="parlayping-workspace-frame-shell">
          <div class="parlayping-workspace-loader" data-parlayping-loading role="status">Loading Parlay Ping tools…</div>
          <iframe
            data-parlayping-frame
            title="Parlay Ping — TSO 2.0 betslip tools"
            src="https://parlayping.thesportsoutpost.com/submit?tso_embed=1"
            loading="eager"
            scrolling="no"
            referrerpolicy="strict-origin-when-cross-origin"
            allow="clipboard-read; clipboard-write"
          ></iframe>
        </div>
        <p class="parlayping-workspace-footnote">Parlay Ping tools are powered by The Sports Outpost. Your saved betslips remain private to your TSO account.</p>
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

/* TSO2_DECISION_BUNDLE_START 20261012-decision-bundled-v1 -- staging Worker allows existing pages.js, not new asset paths. */
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

/* TSO2_DECISION_BUNDLE_END */


/* TSO2_MATCHUP_INTELLIGENCE_BUNDLE_START 20261012 */
/* TSO 2.0 Matchup Intelligence — game-first ranked player prop analysis.
 * Uses the existing /api/props, /api/research-detail and /api/prop-history.
 * Source-backed stats only; missing fields remain unavailable. */
(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const n=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const pct=v=>n(v)===null?'—':n(v).toFixed(1)+'%';
const amount=(v,suffix='')=>n(v)===null?'—':n(v).toFixed(1).replace(/\.0$/,'')+suffix;
const odds=v=>n(v)===null?'—':n(v)>0?'+'+Math.round(n(v)):String(Math.round(n(v)));
const marketGroup=row=>{
 const m=String(row?.market||'').toLowerCase();
 if(['atd','fgs','atg','firsttd','hr','homerun','goals'].includes(m))return 'SCORERS';
 if(/yards|reception|completion|strikeout|sog|save/.test(m))return 'YARDS / VOLUME';
 return 'OTHER PROPS';
};
const eventMarkets=new Set(['atd','fgs','atg','firsttd','hr','homerun']);
const state={expanded:new Set(),cached:new Map(),pending:new Map(),scouting:new Map(),activeFilter:'ALL',showAll:false,activeGame:''};
function key(row){return String(row?.key||'');}
function exactSelection(row){
 if(row?.selection)return String(row.selection);
 if(eventMarkets.has(String(row.market||'').toLowerCase()))return 'Yes';
 const line=n(row.line),side=row.side==='under'?'Under':'Over';
 return line===null?side:side+' '+amount(line);
}
function signEdge(value){return n(value)===null?'—':(n(value)>0?'+':'')+n(value).toFixed(1)+' pp';}
function rowBadge(row){
 const m=row?.model||{};
 if(n(m.probabilityPct)!==null)return '<span class="mi-prob"><b>'+pct(m.probabilityPct)+'</b><small>MODEL %</small></span>';
 return '<span class="mi-prob mi-prob--market"><b>'+odds(row.price)+'</b><small>MARKET ONLY</small></span>';
}
function playerMarkup(row,i){
 const id=key(row),open=state.expanded.has(id);
 const model=row?.model||{};
 const src=String(row.headshotUrl||'');
 const photo=src&&/^https:\/\//i.test(src)?'<img src="'+esc(src)+'" alt="" loading="lazy">':'<span aria-hidden="true">'+esc(String(row.player||'P').split(' ').slice(0,2).map(s=>s[0]||'').join('').toUpperCase())+'</span>';
 const score=n(model.score??model.rating);
 const details='<div class="mi-expanded-stats">'
   +'<div><small>MODEL PROBABILITY</small><strong>'+pct(model.probabilityPct)+'</strong></div>'
   +'<div><small>MARKET IMPLIED</small><strong>'+pct(row.impliedPct)+'</strong></div>'
   +'<div><small>MODEL EDGE</small><strong>'+signEdge(model.edgePct)+'</strong></div>'
   +'<div><small>SPORTSBOOK PRICE</small><strong>'+odds(row.price)+'</strong></div>'
   +'</div>'
   +'<div class="mi-reason"><b>WHY THIS PROP?</b><p>'+esc(model.reason||model.explanation||row.reason||'The exact market quote is verified; a matchup-specific explanation is not available in this source.')+'</p></div>'
   +'<div data-mi-research="'+esc(id)+'" class="mi-analytics">'+(state.cached.has(id)?renderResearch(state.cached.get(id),row):'<div class="mi-loading">Open to load verified recent form, matchup and line history.</div>')+'</div>'
   +'<div class="mi-actions"><button type="button" class="mi-add" data-mi-add="'+esc(id)+'">+ PARLAY PING</button><small>Exact player · market · side · line · book</small></div>';
 return '<article class="mi-player '+(open?'is-open':'')+'" data-mi-key="'+esc(id)+'">'
   +'<div class="mi-player-head"><button type="button" class="mi-player-expand" data-mi-expand="'+esc(id)+'" aria-expanded="'+open+'">'
   +'<span class="mi-rank">'+(i+1)+'</span><span class="mi-photo">'+photo+'</span>'
   +'<span class="mi-player-label"><b>'+esc(row.player||'Player')+'</b><small>'+esc(row.marketLabel||row.market||'Prop')+' · '+esc(exactSelection(row))+' · '+esc(row.team||'')+'</small>'
   +'<em>'+esc(row.book||'Verified book')+' '+odds(row.price)+(score!==null?' · Rating '+amount(score):'')+'</em></span>'
   +rowBadge(row)+'<span class="mi-chevron">'+(open?'▴':'▾')+'</span>'
   +'</button></div><div class="mi-player-body" '+(open?'':'hidden')+'>'+details+'</div></article>';
}
function filterRows(rows){
 const active=state.activeFilter;
 return active==='ALL'?rows:rows.filter(r=>marketGroup(r)===active);
}
function listing(game,rows){
 const id=String(game?.league||'')+':'+String(game?.id||'');
 if(state.activeGame!==id){state.activeGame=id;state.activeFilter='ALL';state.showAll=false;state.expanded.clear();}
 const all=rows.filter(r=>r&&r.key&&r.player);
 // One card per exact side and threshold; the authoritative best quote is
 // carried by the original row, never fabricated or reconstructed.
 const unique=[...new Map(all.map(r=>[key(r),r])).values()];
 const ranked=unique.sort((a,b)=>{
   const ae=n(a.model?.edgePct),be=n(b.model?.edgePct);
   if(ae!==null&&be!==null)return be-ae;
   if(ae!==null)return -1;if(be!==null)return 1;
   return (n(b.model?.probabilityPct)??-1)-(n(a.model?.probabilityPct)??-1);
 });
 const filtered=filterRows(ranked),shown=state.showAll?filtered:filtered.slice(0,7);
 const filters=['ALL','SCORERS','YARDS / VOLUME','OTHER PROPS'].filter(x=>x==='ALL'||ranked.some(r=>marketGroup(r)===x));
 return '<section class="mi-game-vault" aria-label="Matchup scouting and ranked prop opportunities">'
   +'<header class="mi-game-vault-header"><div><small>MATCHUP INTELLIGENCE · VERIFIED TSO DATA</small><h2>Game scouting</h2><p>Compare the matchup first, then open a player for the numbers behind the selection.</p></div></header>'
   +'<div class="mi-teams">'
   +[game.away,game.home].map((t,i)=>{
     const opp=i===0?game.home:game.away;
     const abbr=String(t?.abbr||'TEAM');
     const logo=t?.logo&&/^https:\/\//i.test(t.logo)?'<img src="'+esc(t.logo)+'" alt="" loading="lazy">':'';
     const record=String(t?.record||'');
     return '<div class="mi-team" data-mi-defender="'+esc(abbr)+'"><div class="mi-team-title">'+logo+'<div><small>'+esc(abbr)+' DEFENSE</small><h3>What '+esc(abbr)+' gives up</h3></div></div>'
       +'<p>Against '+esc(String(opp?.abbr||'the opponent'))+(record?' · '+esc(record):'')+'</p>'
       +'<div class="mi-team-scout" data-mi-scout="'+esc(abbr)+'">Loading source-backed opponent tendencies when available…</div></div>';
   }).join('')
   +'</div>'
   +'<div class="mi-ranked"><div class="mi-ranked-head"><div><small>PLAYER PROP INTELLIGENCE</small><h2>Players to watch</h2><p>'+unique.length+' exact selection'+(unique.length===1?'':'s')+' · ranked by verified model edge where available</p></div></div>'
   +'<div class="mi-filters" role="group" aria-label="Prop markets">'+filters.map(f=>'<button type="button" class="'+(state.activeFilter===f?'is-active':'')+'" data-mi-filter="'+esc(f)+'">'+esc(f==='YARDS / VOLUME'?'YARDS / STATS':f)+'</button>').join('')+'</div>'
   +'<div class="mi-player-list">'+(shown.length?shown.map(playerMarkup).join('')
      :'<div class="mi-empty">No exact verified player selections match this filter. No example players or probabilities are shown.</div>')+'</div>'
   +(filtered.length>7?'<button type="button" class="mi-show-all" data-mi-all>'+(state.showAll?'Show fewer':'Show all '+filtered.length+' selections')+'</button>':'')
   +'</div></section>';
}
function seriesFromResearch(data,row){
 if(!data?.available)return[];
 const m=String(row.market||'');
 const p=data.player||{},s=String(row.sport||'').toLowerCase();
 const out=[];
 const nflField={rushYds:'rushYds',recYds:'recYds',receptions:'receptions',passYds:'passYds',passTds:'passTds',completions:'completions',atd:'tds'}[m];
 const nbaField=m;
 for(const g of s==='nfl'?(m==='firstTd'?p.periodGameLog||[]:p.gameLog||[]):s==='mlb'?p.gameLog||[]:p.recentGames||[]){
   let v=null;
   if(s==='nfl')v=n(m==='firstTd'?g.firstTd:g[nflField]);
   if(s==='nba')v=n(g.stats?.[nbaField]);
   if(s==='nhl')v=n(m==='fgs'?g.firstGoal?1:0:m==='atg'?g.stats?.goals:g.stats?.[m]);
   if(s==='mlb'){
     const f={hr:'hr',homeRun:'hr',hits:'h',totalBases:'totalBases',rbi:'rbi',runs:'r',singles:'singles',doubles:'doubles',triples:'triples',walks:'walks',batterStrikeouts:'strikeouts',stolenBases:'stolenBases'}[m];
     v=n(g[f]);
     if(m==='hrr')v=[g.h,g.r,g.rbi].map(n).every(x=>x!==null)?Number(g.h)+Number(g.r)+Number(g.rbi):null;
   }
   if(v!==null)out.push({value:v,date:g.date,opponent:g.opponent,source:g.source||''});
 }
 return out.sort((a,b)=>(Date.parse(b.date||'')||0)-(Date.parse(a.date||'')||0));
}
function hit(value,row){
 const m=String(row.market||'').toLowerCase();
 if(eventMarkets.has(m))return value>0?'hit':'miss';
 const line=n(row.line);if(line===null)return null;
 if(Math.abs(value-line)<1e-8)return'push';
 return row.side==='under'?(value<line?'hit':'miss'):(value>line?'hit':'miss');
}
function lastStats(series,row,count){
 const window=series.slice(0,count);
 const decisions=window.map(g=>hit(g.value,row)).filter(v=>v==='hit'||v==='miss');
 const won=decisions.filter(x=>x==='hit').length;
 return {label:'L'+count,display:decisions.length?won+'/'+decisions.length:'—',rate:decisions.length?Math.round(100*won/decisions.length):null,games:window.length};
}
function researchNotes(data,row){
 const notes=[];
 const p=data?.player||{},sport=String(row.sport||'').toLowerCase();
 if(sport==='nfl'){
   if(p.position)notes.push('Position: '+p.position);
   const perf=p.matchup?.previousSeasonAllowed?.perGame||{};
   for(const [name,key,suffix] of [['Opponent TDs allowed','tds',' per game'],['Opponent rush yards allowed','rushYds',' / game'],['Opponent receiving yards allowed','recYds',' / game']]){
     if(n(perf[key])!==null)notes.push('Previous-season '+name.toLowerCase()+': '+amount(perf[key])+suffix);
   }
   if(n(p?.snapTrend?.last3AvgPct)!==null)notes.push('Snap share (last 3): '+pct(p.snapTrend.last3AvgPct));
 }
 if(sport==='nba'){
   if(n(data.matchup?.teamPace)!==null)notes.push('Team pace: '+amount(data.matchup.teamPace));
   if(n(data.matchup?.opponentPace)!==null)notes.push('Opponent pace: '+amount(data.matchup.opponentPace));
   if(p.position)notes.push('Position: '+p.position);
 }
 if(sport==='nhl'){
   if(n(p.recentAverages?.shotsOnGoal)!==null)notes.push('Recent SOG/game: '+amount(p.recentAverages.shotsOnGoal));
   if(n(p.shootingPct)!==null)notes.push('Shooting %: '+pct(p.shootingPct));
 }
 if(sport==='mlb'){
   if(p.battingOrder!=null)notes.push('Batting order: '+String(p.battingOrder));
   if(n(data.opponent?.pitcher?.era)!==null)notes.push('Opposing starter ERA: '+amount(data.opponent.pitcher.era));
 }
 return notes;
}
function renderResearch(data,row){
 if(!data?.available)return '<div class="mi-research-unavailable">Detailed historical context unavailable: '+esc(data?.reason||'No verified research snapshot.')+'</div>';
 const series=seriesFromResearch(data,row);
 const form=series.length
   ?'<div class="mi-form-metrics">'+[lastStats(series,row,5),lastStats(series,row,10)].map(x=>
      '<div><small>'+x.label+' EXACT LINE</small><b>'+x.display+'</b><span>'+(x.rate!==null?x.rate+'%':'Insufficient data')+'</span></div>').join('')
      +'<div><small>L5 AVERAGE</small><b>'+amount(series.slice(0,5).reduce((a,b)=>a+b.value,0)/Math.min(5,series.length))+'</b><span>Observed games</span></div></div>'
     +'<div class="mi-recent-log"><b>RECENT GAMES · EXACT SELECTION</b><div>'+series.slice(0,10).map(g=>
        '<span class="is-'+esc(hit(g.value,row)||'unknown')+'" title="'+esc((g.date||'')+' '+(g.opponent||''))+'">'+esc(amount(g.value))+'</span>').join('')+'</div>'
        +'<small>'+esc(series[0].source||data?.sources?.player||data?.source||'Verified game log')+' · '+series.length+' observed games available</small></div>'
   :'<div class="mi-research-unavailable">Exact-market game-log hit rate unavailable for this player and prop. No proxy metric is substituted.</div>';
 const notes=researchNotes(data,row);
 const source=String(data.sources?.player||data.source||data?.player?.recentSource||'TSO verified research snapshot');
 return '<div class="mi-section"><h4>Recent form</h4>'+form+'</div>'
   +'<div class="mi-section"><h4>Matchup & role</h4>'
   +(notes.length?'<div class="mi-research-notes">'+notes.map(v=>'<span>'+esc(v)+'</span>').join('')+'</div>':'<p class="mi-muted">Specific role or opponent-defense statistics are not available in this player snapshot.</p>')
   +'<small class="mi-muted">Source: '+esc(source)+'</small></div>'
   +'<div class="mi-section"><h4>Sportsbook line movement</h4><div data-mi-history="'+esc(key(row))+'">Loading committed sportsbook history…</div></div>';
}
function scoutingFromResult(data,against,game){
 if(!data?.available)return null;
 const sport=String(game.league||'').toLowerCase();
 if(sport==='nfl'){
   const per=data?.player?.matchup?.previousSeasonAllowed?.perGame||{};
   const names=[['tds','TDs allowed / game'],['rushYds','Rush yards / game'],['recYds','Receiving yards / game']];
   const metrics=names.filter(([k])=>n(per[k])!==null).map(([k,label])=>'<span><b>'+amount(per[k])+'</b><small>'+label+'</small></span>');
   if(metrics.length)return '<b>Previous-season opponent allowance</b><div class="mi-scout-metrics">'+metrics.join('')+'</div><small>Player research context; not a current-week defensive ranking.</small>';
 }
 if(sport==='nba'){
   const pace=n(data?.matchup?.opponentPace);
   if(pace!==null)return '<b>Verified opponent pace context</b><div class="mi-scout-metrics"><span><b>'+amount(pace)+'</b><small>Possessions estimate / game</small></span></div>';
 }
 if(sport==='mlb'){
   const era=n(data?.opponent?.pitcher?.era);
   if(era!==null)return '<b>Projected opponent starter</b><div class="mi-scout-metrics"><span><b>'+amount(era)+'</b><small>ERA</small></span></div>';
 }
 return null;
}
function getResearch(row,ctx){
 const id=key(row);if(state.cached.has(id))return Promise.resolve(state.cached.get(id));
 if(state.pending.has(id))return state.pending.get(id);
 const task=Promise.resolve().then(()=>ctx.research(row)).then(data=>{
   state.cached.set(id,data);return data;
 }).finally(()=>state.pending.delete(id));
 state.pending.set(id,task);return task;
}
function updatePlayer(row,root,ctx){
 const node=root.querySelector('[data-mi-research="'+CSS.escape(key(row))+'"]');
 if(!node)return;
 if(state.cached.has(key(row)))return updateResearchNode(node,row,state.cached.get(key(row)),ctx);
 node.innerHTML='<div class="mi-loading">Loading verified player game logs and opponent context…</div>';
 getResearch(row,ctx).then(data=>{
   if(!node.isConnected||node.closest('[data-mi-key]')?.dataset.miKey!==key(row))return;
   updateResearchNode(node,row,data,ctx);
   updateScouting(root,ctx);
 }).catch(e=>{
   if(node.isConnected)node.innerHTML='<div class="mi-research-unavailable">Detailed research temporarily unavailable. '+esc(e?.message||String(e))+'</div>';
 });
}
function updateResearchNode(node,row,data,ctx){
 node.innerHTML=renderResearch(data,row);
 const hist=node.querySelector('[data-mi-history]');
 if(hist&&typeof ctx.history==='function'){
   Promise.resolve().then(()=>ctx.history(row,row.book)).then(doc=>{
     if(!hist.isConnected)return;
     if(!doc?.available||!doc.open||!doc.current){
       hist.innerHTML='<p class="mi-muted">Exact quote history is not currently available for this book and line.</p>';return;
     }
     hist.innerHTML='<div class="mi-form-metrics">'
       +'<div><small>FIRST OBSERVED</small><b>'+odds(doc.open.price)+'</b><span>Committed snapshot</span></div>'
       +'<div><small>CURRENT</small><b>'+odds(doc.current.price)+'</b><span>'+esc(row.book||'Exact book')+'</span></div>'
       +'<div><small>OBSERVATIONS</small><b>'+String(doc.points?.length||0)+'</b><span>Verified snapshots</span></div></div>';
   }).catch(()=>{if(hist.isConnected)hist.innerHTML='<p class="mi-muted">Sportsbook movement unavailable at this time.</p>';});
 }
}
function updateScouting(root,ctx){
 const game=ctx.game,rows=ctx.rows;
 if(!game)return;
 for(const t of [game.away,game.home]){
   const opp=String(t?.abbr||'');
   const node=[...root.querySelectorAll('[data-mi-scout]')].find(x=>x.dataset.miScout===opp);
   if(!node)continue;
   const row=rows.find(r=>String(r.team||'').toLowerCase()!==opp.toLowerCase());
   if(!row){node.textContent='No verified opponent research for this matchup yet.';continue;}
   const memo=state.cached.get(key(row));
   if(memo){node.innerHTML=scoutingFromResult(memo,opp,game)||'<span>Opponent positional allowance data is not available from the verified source yet.</span>';continue;}
   node.textContent='Checking verified opponent-defense data…';
   getResearch(row,ctx).then(data=>{
     if(node.isConnected)node.innerHTML=scoutingFromResult(data,opp,game)||'<span>Source-backed opponent allowance data is unavailable for this matchup.</span>';
   }).catch(()=>{if(node.isConnected)node.textContent='Opponent scouting feed is currently unavailable.';});
 }
}
function bind(root,ctx){
 const game=ctx.game,rows=ctx.rows||[];
 root.querySelectorAll('[data-mi-expand]').forEach(b=>b.onclick=()=>{
   const k=b.dataset.miExpand;
   if(state.expanded.has(k))state.expanded.delete(k);else state.expanded.add(k);
   const card=b.closest('.mi-player'),opened=state.expanded.has(k),body=card?.querySelector('.mi-player-body');
   if(!card||!body)return;
   card.classList.toggle('is-open',opened);
   body.hidden=!opened;b.setAttribute('aria-expanded',String(opened));
   const arrow=b.querySelector('.mi-chevron');if(arrow)arrow.textContent=opened?'▴':'▾';
   if(opened){const row=rows.find(x=>key(x)===k);if(row)updatePlayer(row,root,ctx);}
 });
 root.querySelectorAll('[data-mi-add]').forEach(b=>b.onclick=()=>{
   const row=rows.find(x=>key(x)===b.dataset.miAdd);if(row)ctx.addProp(row);
 });
 root.querySelectorAll('[data-mi-filter]').forEach(b=>b.onclick=()=>{
   state.activeFilter=b.dataset.miFilter;state.showAll=false;ctx.refresh();
 });
 root.querySelector('[data-mi-all]')?.addEventListener('click',()=>{state.showAll=!state.showAll;ctx.refresh();});
 for(const k of state.expanded){const row=rows.find(x=>key(x)===k);if(row)updatePlayer(row,root,ctx);}
 updateScouting(root,ctx);
}
window.TSO2Matchup={listing,bind,matchedStats:seriesFromResearch};
})();
/* TSO2_MATCHUP_INTELLIGENCE_BUNDLE_END */
