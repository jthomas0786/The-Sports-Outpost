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
            scrolling="auto"
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
      +'<div class="decision-empty"><b>EDGE (PP)</b>Model probability minus market implied probability, in percentage points. A positive number is not a guarantee.</div></aside></section>'
      +'<div class="decision-parlay-dock" data-decision-betslip></div></section>';
  }
  function gamesHTML(league){
    return '<section class="decision-page decision-games" data-decision-games>'
      +'<header class="decision-intro"><div><span>THE SPORTS OUTPOST · ONE-SCREEN GAME HUB</span><h1>Games</h1><p>Spread, moneyline, total, player props and explanations — one matchup, one screen.</p></div>'
      +'<div class="decision-intro-actions"><button type="button" class="decision-outline-btn" data-decision-route="home">← TODAY</button></div></header>'
      +filters(league)
      +'<section class="decision-panel decision-game-chooser"><div class="decision-chooser-title"><div><small>LIVE & UPCOMING MATCHUPS</small><h2>Pick a game</h2></div><span>Scroll to browse →</span></div>'
      +'<div class="decision-game-strip" data-decision-game-list><div class="decision-empty">Connecting scoreboard…</div></div>'
      +'<details class="decision-game-results" data-decision-final-results hidden><summary>FINAL RESULTS <span data-decision-final-count></span> <span aria-hidden="true">⌄</span></summary><div class="decision-game-strip decision-game-strip--results" data-decision-game-results></div></details></section>'
      +'<div class="decision-game-detail" data-decision-game-detail><div class="decision-empty">Choose a game to see your complete decision view.</div></div>'
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
      +'<div><small title="Model probability minus sportsbook implied probability, measured in percentage points. Not a guarantee.">EDGE (PP)</small><strong class="'+(n!==null&&n>0?'positive':'')+'">'+edge(n)+'</strong></div></div>';
  }
  function matchedRows(rows,g){
    const gameId=String(g.id||g.gameId||'').trim();
    const away=new Set([team(g.away?.abbr),team(g.away?.name)].filter(Boolean));
    const home=new Set([team(g.home?.abbr),team(g.home?.name)].filter(Boolean));
    // Sportsbooks and ESPN use different local abbreviations (e.g. LA/LAR).
    // An exact provider event ID is the strongest link. When it is absent,
    // match both teams and the game start; do not match by player or league.
    const equivalents={lar:'la',la:'lar',nyg:'ny',ny:'nyg',gs:'gsw',gsw:'gs',sa:'sas',sas:'sa',no:'nop',nop:'no'};
    for(const set of [away,home])for(const t of [...set])if(equivalents[t])set.add(equivalents[t]);
    return rows.filter(r=>{
      if(sport(r.sport)!==sport(g.league))return false;
      const eventId=String(r.eventId||r.gameId||'').trim();
      // Different providers assign different IDs to the same game.
      if(eventId&&gameId&&eventId===gameId)return true;
      // Never conflate two distinct ESPN games.
      const isEspn=id=>/^40[0-9]{7,}$/.test(id);
      if(eventId&&gameId&&isEspn(eventId)&&isEspn(gameId))return false;
      // Cross-provider matches require BOTH teams and a near-identical start.
      if(!r.awayTeam||!r.homeTeam||!away.has(team(r.awayTeam))||!home.has(team(r.homeTeam)))return false;
      const a=Date.parse(r.commenceTime||r.startTimeUTC||r.startTime||'');
      const b=Date.parse(g.startTime||g.startTimeUTC||'');
      if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a-b)>2*3600*1000)return false;
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
      (ctx.league==='all'||sport(row.sport)===ctx.league)&&window.TSO2Matchup?.eligibleOver(row)&&row.model&&number(row.model.probabilityPct)!==null
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
    const upcoming=games.filter(g=>g.state!=='post');
    const finals=games.filter(g=>g.state==='post');
    const activeList=upcoming.length?upcoming:(finals.length?finals.slice(0,3):[]);
    const extraFinals=upcoming.length?finals:finals.slice(3);
    root.querySelector('[data-decision-game-list]').innerHTML=!ctx.liveReady
      ?'<div class="decision-empty">Connecting real scoreboard…</div>'
      :activeList.length?activeList.map(g=>gameRow(g,String(g.id)===String(selected?.id))).join('')
      :'<div class="decision-empty"><b>No games in this sport right now.</b>Change the filter above.</div>';
    const finalDetails=root.querySelector('[data-decision-final-results]');
    if(finalDetails){
      finalDetails.hidden=!extraFinals.length;
      finalDetails.querySelector('[data-decision-final-count]').textContent='('+extraFinals.length+')';
      finalDetails.querySelector('[data-decision-game-results]').innerHTML=extraFinals.map(g=>gameRow(g,String(g.id)===String(selected?.id))).join('');
    }
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
const marketNames={
 nfl:{atd:'Anytime TD',firstTd:'First TD',passYds:'Passing Yards',passTds:'Passing TDs',recYds:'Receiving Yards',receptions:'Receptions',rushYds:'Rushing Yards',completions:'Completions',longestReception:'Longest Reception',rushAtt:'Rushing Attempts'},
 nba:{points:'Points',rebounds:'Rebounds',assists:'Assists',threes:'3-Pointers Made',pra:'PRA',pr:'Points + Rebounds',pa:'Points + Assists',ra:'Rebounds + Assists',steals:'Steals',blocks:'Blocks'},
 mlb:{hr:'Home Runs',hits:'Hits',totalBases:'Total Bases',rbi:'RBI',runs:'Runs',pitcherStrikeouts:'Pitcher Strikeouts',strikeouts:'Strikeouts',stolenBases:'Stolen Bases',walks:'Walks'},
 nhl:{atg:'Anytime Goal',fgs:'First Goal',sog:'Shots on Goal',points:'Points',assists:'Assists',goals:'Goals',saves:'Goalie Saves',blocks:'Blocked Shots'}
};
const orderedMarkets={
 nfl:['atd','firstTd','passYds','passTds','recYds','receptions','rushYds','rushAtt','completions','longestReception'],
 nba:['points','rebounds','assists','threes','pra','pr','pa','ra','steals','blocks'],
 mlb:['hr','hits','totalBases','rbi','runs','pitcherStrikeouts','strikeouts','stolenBases','walks'],
 nhl:['atg','fgs','sog','points','assists','goals','saves','blocks']
};
const eventMarkets=new Set(['atd','fgs','atg','firsttd','firstTd','hr','homerun','homeRun']);
const marketName=row=>marketNames[String(row?.sport||'').toLowerCase()]?.[String(row?.market||'')]||String(row?.marketLabel||row?.market||'Other Props');
function eligibleOver(row){
 if(!row||!row.key||!row.player||row.researchRosterRow)return false;
 const side=String(row.side||'').trim().toLowerCase();
 const pick=String(row.selection||'').trim().toLowerCase();
 if(['under','no','false'].includes(side)||/^(?:under\b|u\s+\d|no\b)/i.test(pick))return false;
 if(['over','yes','true'].includes(side))return true;
 // Yes-only binary scorer markets may omit a side; never infer an Over from
 // missing selection on a normal total / counting market.
 return eventMarkets.has(String(row.market||''))&&(/^(yes|over)\b/i.test(pick));
}
function orderedMarketKeys(rows,sport){
 const present=[...new Set(rows.map(r=>String(r.market||'')))];
 const order=orderedMarkets[String(sport||'').toLowerCase()]||[];
 return present.sort((a,b)=>{
  const ai=order.indexOf(a),bi=order.indexOf(b);
  if(ai!==-1&&bi!==-1)return ai-bi;
  if(ai!==-1)return -1;if(bi!==-1)return 1;
  return marketName({sport,market:a}).localeCompare(marketName({sport,market:b}));
 });
}
const state={expanded:new Set(),cached:new Map(),pending:new Map(),scouting:new Map(),activeFilter:'ALL PROPS',showAll:false,activeGame:'',signalDoc:null,ranking:null};
function key(row){return String(row?.key||'');}
function exactSelection(row){
 if(row?.selection)return String(row.selection);
 if(eventMarkets.has(String(row.market||'').toLowerCase()))return 'Yes';
 const line=n(row.line),side='Over';
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
   +'<span class="mi-player-label"><b>'+esc(row.player||'Player')+'</b><small>'+esc(marketName(row))+' · '+esc(exactSelection(row))+' · '+esc(row.team||'')+'</small>'
   +'<em>'+esc(row.book||'Verified book')+' '+odds(row.price)+'</em></span>'
   +'<span class="mi-signal-mini" data-mi-signal="'+esc(id)+'">'+signalMini(row,state.cached.get(id),state.signalDoc)+'</span>'
   +rowBadge(row)+'<span class="mi-chevron">'+(open?'▴':'▾')+'</span>'
   +'</button></div><div class="mi-player-body" '+(open?'':'hidden')+'>'+details+'</div></article>';
}
function filterRows(rows){
 return state.activeFilter==='ALL PROPS'?rows:rows.filter(r=>String(r.market||'')===state.activeFilter);
}
// Rank using the TSO-exclusive score (never raw model %, price, or edge).
// Missing scores have NO rank, and are always placed last.
function rankRowsBySignal(rows,cache=state.cached,doc=state.signalDoc){
 const result=new Map(rows.map(r=>[key(r),signalScore(r,cache.get(key(r)),doc)]));
 return [...rows].sort((a,b)=>{
  const sa=result.get(key(a)),sb=result.get(key(b)),an=n(sa?.score),bn=n(sb?.score);
  if(an===null&&bn!==null)return 1;
  if(an!==null&&bn===null)return -1;
  if(an!==null&&bn!==null&&an!==bn)return bn-an;
  if(an!==null&&bn!==null&&sa.modeled!==sb.modeled)return sa.modeled?-1:1;
  return String(a.player||'').localeCompare(String(b.player||''))||
   String(a.market||'').localeCompare(String(b.market||''))||
   String(a.line??'').localeCompare(String(b.line??''))||
   key(a).localeCompare(key(b));
 });
}
function rankingSignature(game,rows){
 return [String(game?.league||''),String(game?.id||''),...rows.filter(eligibleOver).map(r=>
  [key(r),r.market,r.line,r.side,r.model?.probabilityPct,r.model?.edgePct].join(':')).sort()].join('|');
}
function rankingStatus(game,rows){
 const job=state.ranking;
 if(!job||job.signature!==rankingSignature(game,rows))
  return 'Verifying TSO Prop Signals · temporary order while checking all players';
 if(job.done)return 'TSO Prop Signal · highest to lowest · ungraded last';
 return 'Verifying TSO Prop Signals · '+job.completed+'/'+job.total+' player profiles · order provisional';
}
function listing(game,rows){
 const id=String(game?.league||'')+':'+String(game?.id||'');
 if(state.activeGame!==id){state.activeGame=id;state.activeFilter='ALL PROPS';state.showAll=false;state.expanded.clear();state.ranking=null;}
 const all=rows.filter(eligibleOver);
 // One card per exact side and threshold; the authoritative best quote is
 // carried by the original row, never fabricated or reconstructed.
 const unique=[...new Map(all.map(r=>[key(r),r])).values()];
 // Ranked by the TSO Prop Signal for every market category and All Props.
 const ranked=rankRowsBySignal(unique);
 const filtered=filterRows(ranked),shown=state.showAll?filtered:filtered.slice(0,7);
 const filters=['ALL PROPS',...orderedMarketKeys(ranked,game.league)];
 return '<section class="mi-game-vault" aria-label="Matchup scouting and ranked prop opportunities">'
   +'<header class="mi-game-vault-header"><div><small>MATCHUP INTELLIGENCE · VERIFIED TSO DATA</small><h2>Game scouting</h2><p>Compare the matchup first, then open a player for the numbers behind the selection.</p></div></header>'
   +'<div class="mi-teams">'
   +[game.away,game.home].map((t,i)=>{
     const opp=i===0?game.home:game.away;
     const abbr=String(t?.abbr||'TEAM');
     const logo=t?.logo&&/^https:\/\//i.test(t.logo)?'<img src="'+esc(t.logo)+'" alt="" loading="lazy">':'';
     const record=String(t?.record||'');
     return '<div class="mi-team" data-mi-defender="'+esc(abbr)+'"><div class="mi-team-title">'+logo+'<div><small>'+esc(abbr)+' MATCHUP</small><h3>'+esc(abbr)+' defense vs '+esc(String(opp?.abbr||'opponent'))+' offense</h3></div></div>'
       +'<p>Facing '+esc(String(opp?.abbr||'the opposing team'))+(record?' · '+esc(record):'')+'</p>'
       +'<div class="mi-team-scout" data-mi-scout="'+esc(abbr)+'">Checking opponent defensive data…</div>'
       +'<div class="mi-opposing-attack" data-mi-attack="'+esc(abbr)+'">Checking verified opponent offensive opportunity data…</div></div>';
   }).join('')
   +'</div>'
   +'<div class="mi-ranked"><div class="mi-ranked-head"><div><small>PLAYER PROP INTELLIGENCE · OVERS & YES ONLY</small><h2>Players to watch</h2><p>'+unique.length+' Over/Yes selection'+(unique.length===1?'':'s')+' · ranked by TSO Prop Signal · choose an exact market below</p></div></div>'
   +'<p class="mi-ranking-status" data-mi-ranking-status aria-live="polite">'+esc(rankingStatus(game,rows))+'</p>'
   +'<div class="mi-filters" role="group" aria-label="Prop markets">'+filters.map(f=>'<button type="button" class="'+(state.activeFilter===f?'is-active':'')+'" data-mi-filter="'+esc(f)+'">'+esc(f==='ALL PROPS'?f:marketName({sport:game.league,market:f}))+' <span class="mi-filter-count">'+(f==='ALL PROPS'?ranked.length:ranked.filter(r=>String(r.market||'')===f).length)+'</span></button>').join('')+'</div>'
   +'<div class="mi-player-list">'+(shown.length?shown.map(playerMarkup).join('')
      :'<div class="mi-empty">No verified Over/Yes selections in this market. Choose a different prop category. Unders remain available in Advanced Props.</div>')+'</div>'
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

const clamp=(value,lo,hi)=>Math.max(lo,Math.min(hi,value));
function marketThreshold(row){
 return eventMarkets.has(String(row.market||''))?0.5:n(row.line);
}
function hitRateVisual(series,row,count){
 const stat=lastStats(series,row,count);
 const percentage=stat.rate===null?null:clamp(stat.rate,0,100);
 return '<div class="mi-hit-visual"><div class="mi-hit-visual-header"><strong>'+stat.label+'</strong><span>'+stat.display+' '+(percentage===null?'':'· '+percentage+'%')+'</span></div>'
    +'<div class="mi-hit-track" role="progressbar" aria-label="'+stat.label+' exact-line hit rate" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+(percentage??0)+'" aria-valuetext="'+esc(percentage===null?'No verified exact-line observations':stat.display+' hits, '+percentage+' percent')+'">'
    +(percentage===null?'':'<span style="width:'+percentage+'%"></span>')+'</div></div>';
}
function recentGamesChart(series,row){
 const values=series.slice(0,10).reverse();
 const target=marketThreshold(row);
 if(!values.length||target===null)return '<p class="mi-muted">A chart needs verified individual game results and an exact sportsbook threshold.</p>';
 // Chart coordinates use only source game-log values (no interpolation of games).
 const max=Math.max(1,target,...values.map(g=>g.value));
 const top=Math.max(1,Math.ceil(max*1.13*10)/10);
 const left=42,right=658,topY=22,bottom=214,w=right-left,height=bottom-topY;
 const y=value=>bottom-clamp(value/top,0,1)*height;
 const slot=w/values.length,barW=clamp(slot*.57,18,47);
 const targetY=y(target);
 const ticks=[0,top*.5,top];
 const grid=ticks.map(v=>'<line x1="'+left+'" x2="'+right+'" y1="'+y(v).toFixed(1)+'" y2="'+y(v).toFixed(1)+'" stroke="#35433f" stroke-dasharray="3 6"/><text x="34" y="'+(y(v)+4).toFixed(1)+'" fill="#8fa6a4" text-anchor="end" font-size="12">'+esc(amount(v))+'</text>').join('');
 const bars=values.map((g,i)=>{
   const x=left+slot*i+(slot-barW)/2;
   const res=hit(g.value,row),barH=Math.max(3,bottom-y(g.value));
   const fill=res==='hit'?'#58d8a0':res==='push'?'#f0bc6d':'#ff775d';
   const label=g.date&&Number.isFinite(Date.parse(g.date))?
     new Date(g.date).toLocaleDateString('en-US',{month:'numeric',day:'numeric',timeZone:'UTC'}):'G'+(i+1);
   return '<g><title>'+esc((g.date||'Game '+(i+1))+' · '+amount(g.value)+' · '+(res||'unrated'))+'</title>'
     +'<rect x="'+x.toFixed(1)+'" y="'+(bottom-barH).toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+barH.toFixed(1)+'" rx="4" fill="'+fill+'" opacity=".96"/>'
     +'<text x="'+(x+barW/2).toFixed(1)+'" y="'+Math.max(13,bottom-barH-7).toFixed(1)+'" text-anchor="middle" fill="#e2eee8" font-size="12" font-weight="750">'+esc(amount(g.value))+'</text>'
     +'<text x="'+(x+barW/2).toFixed(1)+'" y="235" text-anchor="middle" fill="#9bada9" font-size="11">'+esc(label)+'</text></g>';
 }).join('');
 return '<div class="mi-chart-topline"><span>LAST '+values.length+' OBSERVED GAMES</span><span class="mi-chart-key"><i class="mi-key-hit"></i> HIT <i class="mi-key-miss"></i> MISS</span></div>'
   +'<div class="mi-chart-container"><svg class="mi-games-chart" viewBox="0 0 680 250" role="img" aria-label="'+esc('Last '+values.length+' verified games for '+row.player+', threshold '+amount(target))+ '" preserveAspectRatio="xMidYMid meet">'
   +grid+bars
   +'<line x1="'+left+'" x2="'+right+'" y1="'+targetY.toFixed(1)+'" y2="'+targetY.toFixed(1)+'" stroke="#ffd277" stroke-width="2" stroke-dasharray="7 5"/>'
   +'<rect x="486" y="'+Math.max(2,targetY-24).toFixed(1)+'" width="165" height="20" rx="3" fill="#362a17" stroke="#70562b"/>'
   +'<text x="644" y="'+Math.max(16,targetY-10).toFixed(1)+'" text-anchor="end" fill="#ffe3a0" font-size="11" font-weight="800">PROP LINE '+esc(eventMarkets.has(String(row.market||''))?'YES':amount(target))+'</text>'
   +'</svg></div>';
}
function usageMeter(label,value,note){
 const actual=n(value);
 if(actual===null||actual<0||actual>100)return '';
 return '<div class="mi-usage-row"><div><strong>'+esc(label)+'</strong><span>'+pct(actual)+'</span></div>'
  +'<div class="mi-usage-track"><span style="width:'+clamp(actual,0,100)+'%"></span></div>'
  +(note?'<small>'+esc(note)+'</small>':'')+'</div>';
}
function roleVisual(data,row){
 if(!data?.available)return '';
 const p=data.player||{};
 const sport=String(row.sport||'').toLowerCase();
 const role=[];
 if(sport==='nfl'){
   const snap=p.snapTrend||{};
   const average=snap.avgOffensePct??snap.last3AvgPct;
   if(n(average)!==null)role.push(usageMeter('Offensive snap share',average,'Verified observed snap percentage'));
   const ts=n(p.targetSharePct??p.targetShare?.pct??p.targetShare);
   if(ts!==null)role.push(usageMeter('Target share',ts,'Observed player share'));
   const last=p.last5?.avg||{};
   const targets=n(last.targets),carries=n(last.carries);
   if(targets!==null&&carries!==null&&targets+carries>0){
      const share=targets/(targets+carries)*100;
      role.push('<div class="mi-opportunity-split"><div class="mi-opportunity-legend"><b>Recent touches & targets</b><span>'+amount(targets)+' targets · '+amount(carries)+' carries/game</span></div>'
        +'<div class="mi-opportunity-track"><span style="width:'+share.toFixed(2)+'%"></span></div><small>Orange: targets · Dark: carries (L5 average)</small></div>');
   }
 }
 if(sport==='nba'){
   const min=n(p.recentAverages?.minutes??p.last5?.avg?.minutes);
   if(min!==null)role.push('<div class="mi-role-stat"><b>'+amount(min)+'</b><small>Recent minutes / game</small></div>');
   const use=n(p.usagePct??p.recentAverages?.usagePct);
   if(use!==null)role.push(usageMeter('Usage rate',use));
 }
 if(sport==='nhl'&&n(p.recentAverages?.shotsOnGoal)!==null)
   role.push('<div class="mi-role-stat"><b>'+amount(p.recentAverages.shotsOnGoal)+'</b><small>Recent shots on goal / game</small></div>');
 if(sport==='mlb'&&n(p.battingOrder)!==null)
   role.push('<div class="mi-role-stat"><b>#'+Math.round(n(p.battingOrder))+'</b><small>Verified batting-order slot</small></div>');
 return role.filter(Boolean).length?'<div class="mi-usage-visual">'+role.join('')+'</div>':'<p class="mi-muted">No verified usage percentages or role charts for this player yet.</p>';
}
function lineMovementChart(doc,row){
 if(!doc?.available||!doc.open||!doc.current)return '<p class="mi-muted">Verified sportsbook line movement is not available for this exact market and book.</p>';
 const points=(Array.isArray(doc.points)?doc.points:[]).filter(p=>n(p?.price??p?.odds)!==null).slice(-40);
 const labels='<div class="mi-move-labels"><span><small>OPEN</small><strong>'+odds(doc.open.price)+'</strong></span>'
  +'<span><small>CURRENT</small><strong>'+odds(doc.current.price)+'</strong></span>'
  +'<span><small>SNAPSHOTS</small><strong>'+points.length+'</strong></span></div>';
 if(points.length<2)return labels+'<p class="mi-muted">A trend chart needs at least two saved price observations. No movement is inferred from one snapshot.</p>';
 // Convert American odds into implied market probability; raw negative/positive
 // odds cross zero discontinuously, so plotting their numbers is misleading.
 const implied=american=>{
   const x=n(american);if(x===null||x===0)return null;
   return x<0?100*(-x)/((-x)+100):100*100/(x+100);
 };
 const values=points.map(p=>implied(p.price??p.odds));
 if(values.some(v=>v===null))return labels+'<p class="mi-muted">Price history contains an invalid implied-probability value.</p>';
 const low=Math.max(0,Math.min(...values)-3),high=Math.min(100,Math.max(...values)+3);
 const y=v=>20+(100-20)*(1-(v-low)/Math.max(1,high-low));
 const x=i=>18+i*(604/Math.max(1,values.length-1));
 const pts=values.map((v,i)=>x(i).toFixed(1)+','+y(v).toFixed(1)).join(' ');
 const dots=values.map((v,i)=>'<circle cx="'+x(i).toFixed(1)+'" cy="'+y(v).toFixed(1)+'" r="'+(i===values.length-1?5:3)+'" fill="#ffd379"><title>'+esc('Snapshot '+(i+1)+': '+odds(points[i].price??points[i].odds)+' ('+pct(v)+' implied)')+'</title></circle>').join('');
 return labels+'<div class="mi-chart-container"><svg class="mi-movement-chart" viewBox="0 0 640 130" role="img" aria-label="'+esc('Verified sportsbook quote history, '+values.length+' observations')+'">'
   +'<line x1="18" x2="622" y1="100" y2="100" stroke="#39443d" stroke-dasharray="3 6"/>'
   +'<polyline points="'+pts+'" fill="none" stroke="#ffd379" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"/>'+dots
   +'<text x="18" y="123" font-size="11" fill="#91aaa0">First observed</text><text x="622" y="123" font-size="11" fill="#91aaa0" text-anchor="end">Latest saved</text>'
   +'</svg></div><small class="mi-muted">Trend shows the implied probability of the saved American prices, not a model projection.</small>';
}
// The Research page already publishes verified nflverse PBP usage shares. The
// Game Hub must reuse these exact GSIS-keyed observations, never join by name.
const NFL_PBP_SOURCE='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/tso-2.0-restructure/tso2/data/nfl-td-opportunities.json';
let nflPbpPromise=null;
function loadNflPbp(){
 if(!nflPbpPromise){
   nflPbpPromise=fetch(NFL_PBP_SOURCE,{cache:'no-store',headers:{accept:'application/json'}}).then(async response=>{
     if(!response.ok)throw Error('NFL play-by-play source HTTP '+response.status);
     const doc=await response.json();
     if(doc?.schemaVersion!==1||!String(doc.source||'').includes('nflverse')||
       !doc.seasons?.['2026']?.players||!doc.generatedAt)
       throw Error('Unverified NFL opportunity dataset');
     const generated=Date.parse(doc.generatedAt);
     if(!Number.isFinite(generated)||generated>Date.now()+3600000)
       throw Error('Invalid NFL source date');
     return doc;
   }).catch(error=>{
     nflPbpPromise=null;
     throw error;
   });
 }
 return nflPbpPromise;
}
const nflTeamCode=value=>({LAR:'LA',JAC:'JAX',WSH:'WAS'}[String(value||'').toUpperCase()]||String(value||'').toUpperCase());
function opportunityForPlayer(doc,research,row){
 if(!doc?.seasons?.['2026']||!research?.available||String(row?.sport||'').toLowerCase()!=='nfl')
   return null;
 const p=research.player||{},gsis=String(p.gsisId||'').trim(),team=nflTeamCode(row.team);
 if(!/^00-\d{7}$/.test(gsis)||!team||nflTeamCode(p.team)!==team)return null;
 const stat=doc.seasons['2026'].players?.[gsis];
 if(!stat||nflTeamCode(stat.team)!==team||Number(stat.gamesWithOpportunities||0)<1)return null;
 return stat;
}
function opportunityEvidence(doc,research,row){
 if(!doc)return '<p class="mi-muted">Verified play-by-play opportunity data is unavailable.</p>';
 const stat=opportunityForPlayer(doc,research,row);
 if(!stat)return '<p class="mi-muted">No exact GSIS player-and-team match in the NFL opportunity snapshot. Usage is not inferred from another player.</p>';
 const stamp=String(doc.generatedAt||'').slice(0,10);
 const age=Date.now()-Date.parse(doc.generatedAt);
 const outdated=Number.isFinite(age)&&age>10*86400000;
 const sample=n(stat.gamesWithOpportunities);
 const metrics=[['TARGET SHARE',stat.targetSharePct,'Share of team targets'],['CARRY SHARE',stat.carrySharePct,'Share of team carries'],
   ['RED-ZONE SHARE',stat.redZoneSharePct,'Share of team carries + targets inside the 20'],
   ['GOAL-LINE SHARE',stat.goalLineSharePct,'Share of team carries + targets inside the 5']]
   .filter(([,value])=>n(value)!==null&&n(value)>=0&&n(value)<=100);
 const bars=metrics.map(([name,value,note])=>
   '<div class="mi-verified-usage"><div><b>'+esc(name)+'</b><strong>'+pct(value)+'</strong></div>'
   +'<div class="mi-verified-usage-track"><span style="width:'+Math.max(0,Math.min(100,n(value)))+'%"></span></div>'
   +'<small>'+esc(note)+'</small></div>').join('');
 const counts=[['TARGETS',stat.targets],['CARRIES',stat.carries],['RED-ZONE CHANCES',stat.redZoneOpps],['GOAL-LINE CHANCES',stat.goalLineOpps],['RZ TD YIELD',stat.redZoneTdYieldPct,'percent']]
   .filter(([,value])=>n(value)!==null).map(([title,value,type])=>
    '<div class="mi-pbp-count"><span>'+esc(title)+'</span><strong>'+esc(amount(value,type==='percent'?'%':''))+'</strong></div>').join('');
 return '<div class="mi-nfl-opportunity-head"><div><b>WHERE THE OPPORTUNITIES COME FROM</b>'
   +'<small>2026 nflverse play-by-play · updated '+esc(stamp)
   +(outdated?' · AGED SOURCE, REFRESH NEEDED':'')+'</small></div>'
   +'<strong>'+esc(sample??'—')+' games</strong></div>'
   +'<div class="mi-opportunity-layout"><div class="mi-opportunity-bars">'+(bars||'<p class="mi-muted">No verified share denominators.</p>')+'</div>'
   +'<div class="mi-pbp-counts">'+counts+'</div></div>'
   +'<p class="mi-evidence-note">Percentages are a player’s share of observed team opportunities, not his probability of hitting this prop. '
   +'Touchdown yield is observed red-zone conversion, not a forecast.</p>';
}
function decisionEvidence(data,row){
 const series=seriesFromResearch(data,row);
 const line=eventMarkets.has(String(row.market||''))?null:marketThreshold(row),l5=lastStats(series,row,5),l10=lastStats(series,row,10);
 const sample5=series.slice(0,5);
 const average=sample5.length?sample5.reduce((sum,g)=>sum+g.value,0)/sample5.length:null;
 const avgDelta=average!==null&&line!==null?average-line:null;
 const model=n(row?.model?.probabilityPct);
 const gap=l10.rate!==null&&model!==null?model-l10.rate:null;
 const conflict=gap!==null&&Math.abs(gap)>=15&&l10.games>=5;
 const display=(name,value,detail,stateLabel)=>'<div class="mi-read-signal '+(stateLabel||'')+'"><small>'+esc(name)+'</small>'
   +'<strong>'+esc(value)+'</strong><span>'+esc(detail)+'</span></div>';
 let signals=[
   display('LAST 5 VS THIS LINE',l5.display,l5.rate===null?'Not enough observed results':l5.rate+'% historical hits'),
   display('LAST 10 VS THIS LINE',l10.display,l10.rate===null?'Not enough observed results':l10.rate+'% historical hits')
 ];
 if(avgDelta!==null){
   signals.push(display('RECENT AVG MINUS LINE',(avgDelta>0?'+':'')+amount(avgDelta),
     'L5 avg '+amount(average)+' versus line '+amount(line),avgDelta>=0?'mi-read-positive':'mi-read-negative'));
 }
 let reading='';
 if(conflict){
   reading='<div class="mi-read-caution"><b>MODEL AND RECENT RESULTS DIFFER</b> The model shows '+pct(model)
   +' while the last '+Math.min(10,series.length)+' observed games hit '+pct(l10.rate)
   +'. These measure different things. Check matchup, opportunity and sample size before using this selection.</div>';
 }else if(model!==null&&l10.rate!==null){
   reading='<p class="mi-evidence-note">Model probability ('+pct(model)+') and observed hit rate ('+pct(l10.rate)
   +') are different measures; historical results are not an independent prediction.</p>';
 }
 return '<section class="mi-decision-read"><div class="mi-read-title"><b>THE QUICK READ</b><span>Exact selection · real observations</span></div>'
   +'<div class="mi-read-grid">'+signals.join('')+'</div>'+reading+'</section>';
}
/* TSO Prop Signal v1: original line-specific strength index, NOT a betting probability.
 * Uses only authenticated research, exact market history and verified PBP.
 * No invented defense-versus-position or injury numbers. */
function observedForm(series,row,count){
 const results=series.slice(0,count).map(g=>hit(g.value,row)).filter(x=>x==='hit'||x==='miss');
 if(!results.length)return null;
 const wins=results.filter(x=>x==='hit').length;
 return {value:100*(wins+2)/(results.length+4),wins,count:results.length};
}
function propRole(data,doc,row){
 if(String(row.sport||'')!=='nfl'||!doc)return null;
 const date=Date.parse(doc.generatedAt||'');
 if(!Number.isFinite(date)||Date.now()-date>10*86400000||date>Date.now()+3600000)return null;
 const p=opportunityForPlayer(doc,data,row);
 if(!p||n(p.gamesWithOpportunities)<3)return null;
 const m=String(row.market||''),parts=[];
 function use(field,label,scale){
  const v=n(p[field]);
  if(v!==null&&v>=0&&v<=100)parts.push({value:clamp(25+v*scale,0,100),detail:label+' '+pct(v)});
 }
 if(['recYds','receptions','longestReception'].includes(m)&&n(p.targets)>=3)use('targetSharePct','Target share',2.1);
 if(['rushYds','rushAtt'].includes(m)&&n(p.carries)>=3)use('carrySharePct','Carry share',1.15);
 if(m==='atd'&&n(p.redZoneOpps)>=3){
  use('redZoneSharePct','Red-zone share',1.5);
  use('goalLineSharePct','Goal-line share',1.6);
 }
 if(!parts.length)return null;
 return {value:parts.reduce((s,v)=>s+v.value,0)/parts.length,detail:parts.map(v=>v.detail).join(' · ')+' · '+p.gamesWithOpportunities+' observed games'};
}
function signalScore(row,data,doc){
 const model=n(row?.model?.probabilityPct),modeled=model!==null&&model>=0&&model<=100;
 const series=seriesFromResearch(data,row),decisions=series.slice(0,10).map(g=>hit(g.value,row)).filter(v=>v==='hit'||v==='miss');
 if(decisions.length<5)return {score:null,reason:'Need 5 verified '+marketName(row)+' results ('+decisions.length+'/5)',modeled};
 const l5=observedForm(series,row,5),l10=observedForm(series,row,10);
 if(!l5||!l10)return {score:null,reason:'Verified game history unavailable',modeled};
 const factors=[];
 if(modeled)factors.push({label:'Model support',value:model,weight:28,note:'Exact-market forecast '+pct(model)});
 factors.push({label:'Recent exact-line form',value:.55*l5.value+.45*l10.value,weight:modeled?32:55,
  note:'L5 '+l5.wins+'/'+l5.count+' · L10 '+l10.wins+'/'+l10.count+' · smoothed sample'});
 const line=marketThreshold(row);
 if(line!==null){
  const arr=series.slice(0,5).map(g=>g.value).sort((a,b)=>a-b);
  const median=arr.length%2?arr[(arr.length-1)/2]:(arr[arr.length/2-1]+arr[arr.length/2])/2;
  factors.push({label:'Margin over line',value:clamp(50+40*(median-line)/Math.max(1,Math.abs(line)*.25),0,100),
   weight:modeled?12:25,note:'Recent median '+amount(median)+' versus exact line '+amount(line)});
 }
 const implied=n(row?.impliedPct),direct=n(row?.model?.edgePct);
 const edge=modeled?(direct!==null?direct:implied!==null&&implied>=0&&implied<=100?model-implied:null):null;
 if(edge!==null&&Math.abs(edge)<=100)
  factors.push({label:'Price value',value:clamp(50+edge*4,0,100),weight:13,note:'Model vs market '+signEdge(edge)});
 const role=propRole(data,doc,row);
 if(role)factors.push({label:'Verified role',value:role.value,weight:modeled?15:20,note:role.detail});
 const coverage=factors.reduce((s,f)=>s+f.weight,0);
 let score=Math.round(factors.reduce((s,f)=>s+f.weight*f.value,0)/coverage);
 if(decisions.length<10)score=Math.min(score,modeled?87:72);
 if(modeled){
  if(factors.length<4)score=Math.min(score,82);
  if(row.sport==='nfl'&&!role)score=Math.min(score,89);
 }else score=Math.min(score,74);
 return {score,tier:modeled?(score>=85?'ELITE':score>=75?'STRONG':score>=60?'WATCH':'CAUTION'):'FORM ONLY',
  modeled,factors,coverage,games:decisions.length};
}
function signalMini(row,data,doc){
 const s=signalScore(row,data,doc);
 if(s.score===null)return '<span class="mi-signal-kicker">TSO PROP SIGNAL</span><small class="mi-signal-pending">'+esc(s.reason)+'</small><div class="mi-signal-track"></div>';
 return '<span class="mi-signal-kicker">TSO PROP SIGNAL</span><span class="mi-signal-reading"><strong>'+s.score+'<small>/100</small></strong><b class="mi-signal-'+s.tier.toLowerCase().replace(/\s+/g,'-')+'">'+s.tier+'</b></span>'
  +'<div class="mi-signal-track'+(s.modeled?'':' is-form-only')+'" role="progressbar" aria-label="TSO Prop Signal evidence score" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+s.score+'"><span style="width:'+s.score+'%"></span></div>';
}
function signalDetail(row,data,doc){
 const s=signalScore(row,data,doc);
 const header='<div class="mi-signal-detail-head"><div><small>THE SPORTS OUTPOST EXCLUSIVE</small><h4>TSO Prop Signal</h4><p>Verified factors behind this exact player prop.</p></div><small>v1</small></div>';
 if(s.score===null)return '<section class="mi-signal-detail">'+header+'<p class="mi-muted">'+esc(s.reason)+'. TSO does not invent missing ratings.</p></section>';
 const factors=s.factors.map(f=>'<div class="mi-signal-factor"><div><b>'+esc(f.label)+'</b><span>'+f.weight+'% · '+Math.round(f.value)+'/100</span></div>'
  +'<div class="mi-signal-track"><span style="width:'+clamp(f.value,0,100)+'%"></span></div><small>'+esc(f.note)+'</small></div>').join('');
 return '<section class="mi-signal-detail">'+header+'<div class="mi-signal-big"><strong>'+s.score+'<small>/100</small></strong><div><b class="mi-signal-'+s.tier.toLowerCase().replace(/\s+/g,'-')+'">'+s.tier+'</b><small>'+s.games+' exact-line games · '+s.coverage+'% verified factor coverage</small></div></div>'
  +'<div class="mi-signal-track mi-signal-large'+(s.modeled?'':' is-form-only')+'" role="progressbar" aria-label="TSO Prop Signal evidence score" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+s.score+'"><span style="width:'+s.score+'%"></span></div>'
  +'<div class="mi-signal-factor-grid">'+factors+'</div><p class="mi-evidence-note">TSO Prop Signal is NOT a probability of winning. FORM ONLY is historical performance, not a verified forecast. Defense vs position and injuries remain excluded until verified.</p></section>';
}
function updateSignalView(root,row,data){
 for(const el of root.querySelectorAll('[data-mi-signal]'))if(el.dataset.miSignal===key(row))el.innerHTML=signalMini(row,data,state.signalDoc);
 for(const el of root.querySelectorAll('[data-mi-signal-detail]'))if(el.dataset.miSignalDetail===key(row))el.innerHTML=signalDetail(row,data,state.signalDoc);
}
// Fetch enough verified information to rank ALL players, not merely seven
// visible cards. Share requests per athlete/game and limit concurrent work.
function hydrateSignals(root,ctx){
 const candidates=[...new Map((ctx.rows||[]).filter(eligibleOver).map(row=>[key(row),row])).values()];
 const signature=rankingSignature(ctx.game,ctx.rows||[]);
 let job=state.ranking;
 if(job&&job.signature===signature){
  // Filtering a prop category replaces the DOM; retain the active root.
  job.root=root;job.refresh=ctx.refresh;
  for(const row of candidates)if(state.cached.has(key(row)))
   updateSignalView(root,row,state.cached.get(key(row)));
  return;
 }
 const grouped=new Map();
 for(const row of candidates){
  const identity=[row.sport,row.eventId||ctx.game?.id||'',
   row.playerId||'',String(row.player||'').toLowerCase(),nflTeamCode(row.team)].join('|');
  if(!grouped.has(identity))grouped.set(identity,[]);
  grouped.get(identity).push(row);
 }
 const queue=[...grouped.values()];
 job={signature,completed:0,total:queue.length,done:!queue.length,root,refresh:ctx.refresh};
 state.ranking=job;
 const progress=()=>{
  const status=job.root?.querySelector?.('[data-mi-ranking-status]');
  if(status)status.textContent=rankingStatus(ctx.game,ctx.rows||[]);
 };
 if(!queue.length){progress();return;}
 const pbp=String(ctx.game?.league||'')==='nfl'
  ?loadNflPbp().then(doc=>{if(state.ranking===job)state.signalDoc=doc;}).catch(()=>{})
  :Promise.resolve();
 async function work(){
  while(queue.length&&state.ranking===job){
   const group=queue.shift();
   try{
    const data=await getResearch(group[0],ctx);
    if(state.ranking!==job)return;
    for(const row of group){
     state.cached.set(key(row),data);
     if(job.root?.isConnected)updateSignalView(job.root,row,data);
    }
   }catch{
    // Missing source evidence remains ungraded, never a fabricated 0.
   }
   job.completed++;
   progress();
  }
 }
 Promise.allSettled([...Array(Math.min(6,queue.length))].map(()=>work()).concat([pbp])).then(()=>{
  if(state.ranking!==job)return;
  job.done=true;progress();
  if(job.root?.isConnected&&typeof job.refresh==='function')job.refresh();
 });
}

function renderResearch(data,row){
 if(!data?.available)return '<div class="mi-research-unavailable">Detailed historical context unavailable: '+esc(data?.reason||'No verified research snapshot.')+'</div>';
 const series=seriesFromResearch(data,row);
 const stats=[lastStats(series,row,5),lastStats(series,row,10)];
 const form=series.length
   ?'<div class="mi-visual-grid"><div class="mi-chart-panel"><h5>RECENT GAME RESULTS</h5>'+recentGamesChart(series,row)+'</div>'
     +'<div class="mi-hit-panel"><h5>EXACT LINE HIT RATE</h5>'+stats.map(x=>hitRateVisual(series,row,Number(x.label.slice(1)))).join('')
       +'<div class="mi-l5-avg"><small>LAST 5 AVERAGE</small><strong>'+amount(series.slice(0,5).reduce((a,b)=>a+b.value,0)/Math.min(5,series.length))+'</strong></div>'
       +'<small class="mi-muted">Pushes are excluded from the hit-rate denominator.</small></div></div>'
     +'<p class="mi-source-note">'+esc(series[0].source||data?.sources?.player||data?.source||'Verified game logs')+' · '+series.length+' observed games available</p>'
   :'<div class="mi-research-unavailable">Exact-market game-log hit rate unavailable. No substitute chart or percentage is generated.</div>';
 const notes=researchNotes(data,row);
 const source=String(data.sources?.player||data.source||data?.player?.recentSource||'TSO verified research snapshot');
 return '<div data-mi-signal-detail="'+esc(key(row))+'">'+signalDetail(row,data,state.signalDoc)+'</div>'
  +decisionEvidence(data,row)+'<div class="mi-section mi-section--visual"><h4>Recent form & performance</h4>'+form+'</div>'
   +'<div class="mi-section"><h4>Role & matchup</h4>'+roleVisual(data,row)
   +(notes.length?'<div class="mi-research-notes">'+notes.map(v=>'<span>'+esc(v)+'</span>').join('')+'</div>':'<p class="mi-muted">Detailed opponent-defense statistics are unavailable for this player.</p>')
   +(String(row.sport).toLowerCase()==='nfl'?'<div class="mi-nfl-opportunities" data-mi-nfl-opportunities="'+esc(key(row))+'"><p class="mi-muted">Loading verified NFL opportunity and red-zone shares…</p></div>':'')
   +'<small class="mi-muted">Source: '+esc(source)+'</small></div>'
   +'<div class="mi-section mi-section--movement"><h4>Sportsbook odds movement</h4><div data-mi-history="'+esc(key(row))+'"><p class="mi-muted">Checking verified line history…</p></div></div>';
}
function verifiedDefensiveMatchup(data,defense,offense){
 if(!data?.available||data.sport!=='nfl')return null;
 const p=data.player||{},m=p.matchup||{},v=m.previousSeasonAllowed||{};
 const pos=String(m.positionGroup||'').toUpperCase();
 if(nflTeamCode(p.team)!==nflTeamCode(offense)||nflTeamCode(m.opponent)!==nflTeamCode(defense)||
  !['QB','RB','WR','TE'].includes(pos)||String(v.position||'').toUpperCase()!==pos||
  !Number.isInteger(Number(v.games))||Number(v.games)<5)return null;
 const columns=pos==='QB'?[['passYds','Passing yards'],['passTds','Passing TDs']]:
  pos==='RB'?[['rushYds','Rushing yards'],['recYds','Receiving yards']]:
  [['recYds','Receiving yards'],['receptions','Receptions']];
 const values=columns.filter(([k])=>n(v.perGame?.[k])!==null&&n(v.perGame?.[k])>=0)
  .map(([k,label])=>'<span><b>'+amount(v.perGame[k])+'</b><small>'+esc(label)+' / game</small></span>');
 if(!values.length)return null;
 return {pos,html:'<div class="mi-scout-pos"><b>'+esc(defense)+' defense vs '+pos+' · 2025</b>'
  +'<div class="mi-scout-metrics">'+values.join('')+'</div><small>Against all '+pos+'s combined · '+v.games+' observed games · prior season</small></div>'};
}
function scoutingFromResult(data,defense,game){
 if(!data?.available)return null;
 if(game.league==='nfl'){
  const offense=nflTeamCode(nflTeamCode(game.away?.abbr)===nflTeamCode(defense)?game.home?.abbr:game.away?.abbr);
  return verifiedDefensiveMatchup(data,defense,offense)?.html||null;
 }
 if(game.league==='nba'&&n(data?.matchup?.opponentPace)!==null)
  return '<b>Verified opponent pace</b><div class="mi-scout-metrics"><span><b>'+amount(data.matchup.opponentPace)+'</b><small>Possessions estimate / game</small></span></div>';
 if(game.league==='mlb'&&n(data?.opponent?.pitcher?.era)!==null)
  return '<b>Projected opposing starter</b><div class="mi-scout-metrics"><span><b>'+amount(data.opponent.pitcher.era)+'</b><small>ERA</small></span></div>';
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
 updateSignalView(node.closest('.mi-game-vault')||node,row,data);
 const opportunity=node.querySelector('[data-mi-nfl-opportunities]');
 if(opportunity&&data?.available){
   loadNflPbp().then(doc=>{
     if(opportunity.isConnected)opportunity.innerHTML=opportunityEvidence(doc,data,row);
    state.signalDoc=doc;
    if(node.isConnected)updateSignalView(node.closest('.mi-game-vault')||node,row,data);
   }).catch(error=>{
     if(opportunity.isConnected)opportunity.innerHTML='<p class="mi-muted">Verified opportunity data temporarily unavailable: '+esc(error.message||'Network error')+'</p>';
   });
 }
 const hist=node.querySelector('[data-mi-history]');
 if(hist&&typeof ctx.history==='function'){
   Promise.resolve().then(()=>ctx.history(row,row.book)).then(doc=>{
     if(!hist.isConnected)return;
     hist.innerHTML=lineMovementChart(doc,row);
   }).catch(()=>{if(hist.isConnected)hist.innerHTML='<p class="mi-muted">Sportsbook movement unavailable at this time.</p>';});
 }
}
function opposingOffenseEvidence(doc,defenseSide,game){
 if(game?.league!=='nfl'||!doc?.seasons?.['2026']?.teams)return '';
 const opponent=nflTeamCode(String(game.away?.abbr||'').toUpperCase()===String(defenseSide||'').toUpperCase()
   ?game.home?.abbr:game.away?.abbr);
 const teamData=doc.seasons['2026'].teams?.[opponent];
 const count=n(teamData?.gamesPlayed);
 if(!opponent||!teamData||count===null||count<2)return '';
 const rz=n(teamData.redZoneOpps),gl=n(teamData.goalLineOpps);
 const targets=n(teamData.targets),carries=n(teamData.carries);
 const sourceDate=String(doc.generatedAt||'').slice(0,10);
 const stat=(label,value,note)=>'<div class="mi-opp-stat"><b>'+esc(value)+'</b><span>'+esc(label)+'</span><small>'+esc(note)+'</small></div>';
 const values=[];
 if(rz!==null)values.push(stat('Red-zone opp / game',amount(rz/count),'Opponent offense · 2026'));
 if(gl!==null)values.push(stat('Goal-line opp / game',amount(gl/count),'Opponent offense · 2026'));
 const whole=targets!==null&&carries!==null?targets+carries:null;
 const passShare=whole?Math.round(100*targets/whole):null;
 const split=passShare===null?'':'<div class="mi-opp-split"><div><b>Offensive target / carry mix</b><span>'+passShare+'% targets · '+(100-passShare)+'% carries</span></div>'
    +'<div class="mi-opportunity-track"><span style="width:'+passShare+'%"></span></div></div>';
 return '<div class="mi-opp-offense-title"><b>'+esc(opponent)+' offense · observed opportunities</b><small>2026 nflverse through '+esc(sourceDate)+'</small></div>'
   +'<div class="mi-opp-stats">'+values.join('')+'</div>'+split
   +'<small class="mi-evidence-note">These are offensive opportunities *facing* '+esc(defenseSide)+', not defensive yards allowed or a game forecast.</small>';
}
function updateScouting(root,ctx){
 const game=ctx.game,rows=ctx.rows;
 if(!game)return;
 if(game.league==='nfl'){
   loadNflPbp().then(doc=>{
     for(const defender of [game.away,game.home]){
       const target=[...root.querySelectorAll('[data-mi-attack]')].find(el=>el.dataset.miAttack===defender?.abbr);
       if(target?.isConnected)target.innerHTML=opposingOffenseEvidence(doc,defender?.abbr,game)
         ||'<span class="mi-muted">Verified current-season opposing offense opportunity history unavailable.</span>';
     }
   }).catch(()=>{
     for(const el of root.querySelectorAll('[data-mi-attack]'))if(el.isConnected)el.textContent='Opponent offensive opportunity feed unavailable.';
   });
 }else{
   for(const el of root.querySelectorAll('[data-mi-attack]'))el.textContent='Opponent offensive opportunity comparison requires a verified sport-specific source.';
 }
 for(const t of [game.away,game.home]){
  const defense=nflTeamCode(t?.abbr||'');
  const node=[...root.querySelectorAll('[data-mi-scout]')].find(e=>nflTeamCode(e.dataset.miScout)===defense);
  if(!node)continue;
  const offense=nflTeamCode(nflTeamCode(game.away?.abbr)===defense?game.home?.abbr:game.away?.abbr);
  const pool=rows.filter(row=>nflTeamCode(row.team)===offense);
  if(game.league!=='nfl'){
   const row=pool[0];if(!row){node.textContent='Verified opponent data unavailable.';continue;}
   getResearch(row,ctx).then(data=>{
    if(node.isConnected)node.innerHTML=scoutingFromResult(data,defense,game)||'<span>Matchup data unavailable.</span>';
   }).catch(()=>{if(node.isConnected)node.textContent='Matchup data unavailable.';});
   continue;
  }
  const markets=['passYds','completions','rushYds','rushAtt','recYds','receptions','atd'];
  const candidates=[...new Map(markets.flatMap(m=>pool.filter(r=>r.market===m).slice(0,4))
    .map(r=>[String(r.player||'').toLowerCase(),r])).values()].slice(0,12);
  if(!candidates.length){node.textContent='No verified defense-vs-position observations.';continue;}
  node.textContent='Verifying positional defensive records…';
  Promise.allSettled(candidates.map(r=>getResearch(r,ctx))).then(results=>{
   if(!node.isConnected)return;
   const profiles=new Map();
   for(const item of results){
    const match=item.status==='fulfilled'?verifiedDefensiveMatchup(item.value,defense,offense):null;
    if(match&&!profiles.has(match.pos))profiles.set(match.pos,match.html);
   }
   node.innerHTML=profiles.size?'<b>Verified 2025 defense vs position</b><div class="mi-scout-pos-grid">'
    +['QB','RB','WR','TE'].filter(p=>profiles.has(p)).map(p=>profiles.get(p)).join('')+'</div>'
    +'<small>Previous-season positional allowance; not current-week defensive rankings.</small>'
    :'<span class="mi-muted">Position-specific defensive numbers unavailable for '+esc(defense)+'. No unrelated opponent data substituted.</span>';
  });
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
 hydrateSignals(root,ctx);
}
window.TSO2Matchup={listing,bind,matchedStats:seriesFromResearch,eligibleOver,marketName,recentGamesChart,lineMovementChart,hitRateVisual,decisionEvidence,signalScore,signalMini,signalDetail,rankRowsBySignal,verifiedDefensiveMatchup,opportunityForPlayer,opportunityEvidence,opposingOffenseEvidence};
})();
/* TSO2_MATCHUP_INTELLIGENCE_BUNDLE_END */
