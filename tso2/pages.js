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
            <p>Real games, real scores, clocks and game state from the live scoreboard feed. Model and odds layers are being migrated into this same view next.</p>
          </div>
          <div class="destination-actions">
            <span class="live-data-badge" data-live-feed-badge><i></i> CONNECTING</span>
            <button class="button primary">MULTI-GAME VIEW →</button>
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
          <article class="live-gamecast-hero live-feed-loading" data-live-feature>
            <div class="live-feed-empty">
              <span class="live-feed-spinner"></span>
              <div><b>Connecting to live scoreboard…</b><small>NHL · NFL · MLB · NBA</small></div>
            </div>
          </article>

          <aside class="live-signal-board" data-live-now-board>
            <div class="live-signal-head">
              <div><span class="orange-kicker">LIVE NOW</span><h2>Scoreboard feed</h2></div>
              <span>REAL DATA</span>
            </div>
            <div class="live-feed-side-loading">
              <span class="live-feed-spinner"></span>
              <div><b>Loading games</b><small>Current scores and game states will appear here.</small></div>
            </div>
          </aside>
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

        <section class="destination-section">
          <div class="destination-section-head">
            <div><span class="violet-kicker">MODEL MOVEMENT · PREVIEW DATA</span><h2>Live probabilities changing</h2></div>
            <button data-route-jump="models">OPEN MODELS →</button>
          </div>
          <div class="live-preview-notice">
            <span>PREVIEW</span>
            <p>The scoreboard above is live. The model movement cards below are still preview examples until the existing TSO model outputs are connected to 2.0.</p>
          </div>
          <div class="live-model-grid">
            <article class="live-model-card live-model-card--violet">
              <div class="live-model-top"><span>NHL · ANYTIME GOAL</span><b>PREVIEW</b></div>
              <div class="live-model-player">${playerHeadshot("Sidney Crosby","live-model-headshot")}<div><h3>Sidney Crosby</h3><small>Example model card</small></div><span class="live-model-badge"><small>MODEL</small><strong>34.8%</strong></span></div>
              <div class="live-model-shift"><span><small>PREGAME</small><b>28.0%</b></span><i>→</i><span><small>LIVE</small><b>34.8%</b></span><strong class="positive">+6.8%</strong></div>
              <div class="live-model-reason">Preview only · real model feed migration is next.</div>
            </article>
            <article class="live-model-card live-model-card--gold">
              <div class="live-model-top"><span>NFL · RECEIVING</span><b>PREVIEW</b></div>
              <div class="live-model-player"><div><h3>Example Receiving Model</h3><small>Preview model card</small></div><span class="live-model-badge"><small>MODEL</small><strong>57%</strong></span></div>
              <div class="live-model-shift"><span><small>PREGAME</small><b>41%</b></span><i>→</i><span><small>LIVE</small><b>57%</b></span><strong class="positive">+16%</strong></div>
              <div class="live-model-reason">Preview only · real model feed migration is next.</div>
            </article>
            <article class="live-model-card live-model-card--orange">
              <div class="live-model-top"><span>MARKET MOVEMENT</span><b>PREVIEW</b></div>
              <div class="live-model-player"><div><h3>Example Price Move</h3><small>Preview market card</small></div><span class="live-model-badge"><small>PRICE</small><strong>-105</strong></span></div>
              <div class="live-model-shift"><span><small>OPEN</small><b>+115</b></span><i>→</i><span><small>NOW</small><b>-105</b></span><strong class="signal-up">▲ 20¢</strong></div>
              <div class="live-model-reason">Preview only · real sportsbook feed migration follows scoreboard wiring.</div>
            </article>
          </div>
        </section>
      </section>`;
    },

    research(league){
      return `
      <section class="research-page broadcast-destination">
        <section class="destination-hero research-destination-hero">
          <div>
            <span class="destination-kicker research-kicker">RESEARCH DESK · ${leagueName(league)}</span>
            <h1>Find the why behind the number.</h1>
            <p>Search players, teams and matchups. TSO pulls form, usage, opponent context, market pricing and model signals into one research view.</p>
          </div>
          <div class="destination-actions">
            <button class="button secondary">RECENT SEARCHES</button>
            <button class="button primary">COMPARE PLAYERS →</button>
          </div>
        </section>

        <section class="research-command-search">
          <div class="research-command-copy">
            <span class="gold-kicker">UNIVERSAL RESEARCH</span>
            <h2>Player, team or matchup</h2>
            <p>One search. Every sport. Same research structure.</p>
          </div>
          <label class="research-command-input">
            <span>⌕</span>
            <input placeholder="Try Connor McDavid, DAL @ NYG, Pete Alonso..." />
            <kbd>ENTER</kbd>
          </label>
          <div class="research-quick-chips">
            <button>Connor McDavid</button>
            <button>DAL @ NYG</button>
            <button>Pete Alonso</button>
            <button>Sidney Crosby</button>
          </div>
        </section>

        <section class="research-grid-primary">
          <article class="research-radar-card">
            <div class="research-card-head">
              <div><span class="orange-kicker">MATCHUP RADAR</span><h2>What stands out tonight</h2></div>
              <button>ALL FLAGS →</button>
            </div>
            <div class="research-radar-list">
              <button class="research-radar-row">
                <span class="radar-tag radar-tag--pace">PACE</span>
                <div><b>DAL @ NYG</b><small>Projected possession / play volume</small></div>
                <span class="radar-value"><strong>+8%</strong><small>vs avg</small></span>
                <span class="radar-arrow">↗</span>
              </button>
              <button class="research-radar-row">
                <span class="radar-tag radar-tag--goalie">GOALIE</span>
                <div><b>PIT @ PHI</b><small>High-danger save-rate mismatch</small></div>
                <span class="radar-value"><strong>PIT</strong><small>edge</small></span>
                <span class="radar-arrow">↗</span>
              </button>
              <button class="research-radar-row">
                <span class="radar-tag radar-tag--weather">WIND</span>
                <div><b>BAL @ NYY</b><small>Carry environment improving</small></div>
                <span class="radar-value"><strong>+9</strong><small>mph out</small></span>
                <span class="radar-arrow">↗</span>
              </button>
              <button class="research-radar-row">
                <span class="radar-tag radar-tag--usage">USAGE</span>
                <div><b>KC @ BUF</b><small>Route participation + target share</small></div>
                <span class="radar-value"><strong>Kelce</strong><small>up</small></span>
                <span class="radar-arrow">↗</span>
              </button>
            </div>
          </article>

          <aside class="research-trending-card">
            <div class="research-card-head">
              <div><span class="violet-kicker">TRENDING</span><h2>Most opened</h2></div>
              <span>TONIGHT</span>
            </div>
            <button class="research-player-row">
              <span class="research-player-rank">01</span>
              ${playerHeadshot("Connor McDavid","research-avatar")}
              <div><b>Connor McDavid</b><small>Shots · Points · Anytime Goal</small></div>
              <span class="research-opens">12.4k</span>
            </button>
            <button class="research-player-row">
              <span class="research-player-rank">02</span>
              ${playerHeadshot("Saquon Barkley","research-avatar")}
              <div><b>Saquon Barkley</b><small>Rushing · Receiving · Anytime TD</small></div>
              <span class="research-opens">9.8k</span>
            </button>
            <button class="research-player-row">
              <span class="research-player-rank">03</span>
              ${playerHeadshot("Pete Alonso","research-avatar")}
              <div><b>Pete Alonso</b><small>Home Run · Total Bases · Hits</small></div>
              <span class="research-opens">8.1k</span>
            </button>
            <button class="research-player-row">
              <span class="research-player-rank">04</span>
              ${playerHeadshot("Sidney Crosby","research-avatar")}
              <div><b>Sidney Crosby</b><small>Goal · Shots · Points</small></div>
              <span class="research-opens">7.6k</span>
            </button>
          </aside>
        </section>

        <section class="destination-section">
          <div class="destination-section-head">
            <div><span class="gold-kicker">RESEARCH CARDS</span><h2>Signals worth opening</h2></div>
            <button>VIEW ALL RESEARCH →</button>
          </div>
          <div class="research-signal-grid">
            <article class="research-signal-card research-signal-card--blue">
              <div class="research-signal-top"><span>NHL · SHOTS</span><b>OPPORTUNITY</b></div>
              <div class="research-signal-player">${playerHeadshot("Connor McDavid","research-signal-headshot")}<div><h3>Connor McDavid</h3><small>EDM · C · vs CGY</small></div><span class="research-score-badge"><small>MODEL</small><strong>67%</strong></span></div>
              <div class="research-stat-grid">
                <span><small>L5 AVG</small><b>4.8</b></span>
                <span><small>TOI</small><b>22:14</b></span>
                <span><small>PP SHARE</small><b>78%</b></span>
              </div>
              <div class="research-insight"><span>OUTPOST READ</span><b>Volume profile remains above the current line.</b><small>Shot attempts and offensive-zone deployment both trend positive.</small></div>
              <button class="research-open-btn">OPEN RESEARCH →</button>
            </article>

            <article class="research-signal-card research-signal-card--gold">
              <div class="research-signal-top"><span>NFL · RECEIVING</span><b>USAGE</b></div>
              <div class="research-signal-player">${playerHeadshot("Travis Kelce","research-signal-headshot")}<div><h3>Travis Kelce</h3><small>KC · TE · at BUF</small></div><span class="research-score-badge"><small>MODEL</small><strong>61%</strong></span></div>
              <div class="research-stat-grid">
                <span><small>ROUTE %</small><b>89%</b></span>
                <span><small>TGT SHARE</small><b>27%</b></span>
                <span><small>RED ZONE</small><b>31%</b></span>
              </div>
              <div class="research-insight"><span>OUTPOST READ</span><b>Role is stronger than the raw yardage line suggests.</b><small>Route participation and red-zone work remain intact.</small></div>
              <button class="research-open-btn">OPEN RESEARCH →</button>
            </article>

            <article class="research-signal-card research-signal-card--orange">
              <div class="research-signal-top"><span>MLB · HOME RUN</span><b>ENVIRONMENT</b></div>
              <div class="research-signal-player">${playerHeadshot("Pete Alonso","research-signal-headshot")}<div><h3>Pete Alonso</h3><small>BAL · 1B · at NYY</small></div><span class="research-score-badge"><small>MODEL</small><strong>29.4%</strong></span></div>
              <div class="research-stat-grid">
                <span><small>BARREL %</small><b>17.1</b></span>
                <span><small>EV</small><b>92.8</b></span>
                <span><small>WIND</small><b>+9 out</b></span>
              </div>
              <div class="research-insight"><span>OUTPOST READ</span><b>Power profile + environment both point the same way.</b><small>Carry conditions and contact quality are aligned.</small></div>
              <button class="research-open-btn">OPEN RESEARCH →</button>
            </article>
          </div>
        </section>

        <section class="research-context-section">
          <div class="research-context-board">
            <div class="research-context-head">
              <div><span class="orange-kicker">SITUATIONAL CONTEXT</span><h2>Quick-read factors</h2></div>
              <span>LAST UPDATED · 1 MIN</span>
            </div>
            <div class="research-context-grid">
              <div><span>PACE</span><b>DAL @ NYG</b><strong class="positive">FAST</strong><small>8% above league baseline</small></div>
              <div><span>GOALIE</span><b>PIT @ PHI</b><strong>PIT EDGE</strong><small>High-danger save mismatch</small></div>
              <div><span>WEATHER</span><b>BAL @ NYY</b><strong>HR BOOST</strong><small>Wind carrying to left-center</small></div>
              <div><span>USAGE</span><b>KC @ BUF</b><strong class="positive">KELCE ↑</strong><small>Route share + target share up</small></div>
            </div>
          </div>

          <aside class="research-recent-card">
            <div class="research-card-head">
              <div><span class="gold-kicker">RECENT</span><h2>Jump back in</h2></div>
            </div>
            <button><span>NHL</span><div><b>Sidney Crosby</b><small>Anytime Goal research</small></div><i>›</i></button>
            <button><span>NFL</span><div><b>DAL @ NYG</b><small>Matchup context</small></div><i>›</i></button>
            <button><span>MLB</span><div><b>Pete Alonso</b><small>Home Run research</small></div><i>›</i></button>
          </aside>
        </section>
      </section>`;
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
            <div><b>STRICT MODEL MATCHING</b><small>Same player + market + side + exact line. NHL uses the real First Goal / Anytime Goal models; NFL uses the real pregame Monte Carlo exact-line outputs; MLB uses the real daily 10,000-run model. NBA remains market-only until a real TSO NBA model exists.</small></div>
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
              <div class="model-engine-top"><span>NBA</span><b>MARKET ONLY</b></div>
              <h3>Market Only Until Modeled</h3>
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
              <span><i>NBA</i><b>Market Only</b><small>Until a real TSO model exists</small></span>
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

        <section class="props-control-deck">
          <div class="segmented props-sport-tabs">
            <button class="${league==='all'?'is-active':''}" data-inline-league="all">ALL</button>
            <button class="${league==='nhl'?'is-active':''}" data-inline-league="nhl">NHL</button>
            <button class="${league==='nfl'?'is-active':''}" data-inline-league="nfl">NFL</button>
            <button class="${league==='mlb'?'is-active':''}" data-inline-league="mlb">MLB</button>
            <button class="${league==='nba'?'is-active':''}" data-inline-league="nba">NBA</button>
          </div>
          <label class="props-command-search">
            <span>⌕</span>
            <input data-props-search placeholder="Search player, team or exact market..." />
            <kbd>ENTER</kbd>
          </label>
          <div class="props-filter-actions">
            <select data-props-market-filter aria-label="Filter prop market"><option value="">MARKET: ALL</option></select>
            <select data-props-book-filter aria-label="Filter sportsbook"><option value="">BOOK: ALL</option></select>
            <button data-props-refresh>REFRESH ODDS ↻</button>
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
            <div class="props-board-head props-board-head-live">
              <span>PLAYER / MARKET</span><span>EXACT</span><span>MODEL</span><span>MARKET</span><span>EDGE</span><span>MODEL TAG</span><span>BEST PRICE</span><span>BOOK</span><span>UPDATED</span><span>LINK</span>
            </div>
            <div data-props-board>
              <div class="live-board-loading"><span class="live-feed-spinner"></span><b>Loading exact selections…</b></div>
            </div>
          </div>
          <div class="props-exact-note"><span>✓</span><div><b>EXACT-SELECTION PROTECTION</b><small>Every displayed price belongs to the exact line and side shown. If a sportsbook does not supply a native selection link, TSO says so instead of inventing one.</small></div></div>
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
              <div><span>NBA</span><b>MARKET ONLY</b></div>
            </article>
          </div>
        </section>
      </section>`;
    },

    parlays(league){
      return `
      <section class="parlays-page broadcast-destination">
        <section class="destination-hero parlays-destination-hero">
          <div>
            <div class="parlays-title-lockup">
              <img class="parlays-hero-icon" src="/brand/production/tso2-product-parlay-lab-approved.webp" alt="" />
              <span class="destination-kicker parlays-kicker">PARLAY COMMAND CENTER · ${leagueName(league)}</span>
            </div>
            <h1>Build the whole ticket with context.</h1>
            <p>Exact selections, model probability, market probability, correlation, weakest-leg detection and sportsbook comparison — before the parlay ever leaves TSO.</p>
          </div>
          <div class="destination-actions">
            <button class="button secondary">SAVED BUILDS</button>
            <button class="button primary">NEW PARLAY →</button>
          </div>
        </section>

        <section class="parlays-preview-strip">
          <div><span class="parlays-preview-dot"></span><b>PREVIEW DATA</b><small>Live feed migration is next</small></div>
          <span class="parlays-status-divider"></span>
          <div><b>EXACT LINES</b><small>selection protected</small></div>
          <span class="parlays-status-divider"></span>
          <div><b>CORRELATION</b><small>checked per build</small></div>
          <span class="parlays-status-divider"></span>
          <div><b>4 SPORTS</b><small>NHL · NFL · MLB · NBA</small></div>
        </section>

        <section class="parlays-mode-tabs">
          <button class="is-active"><span>01</span><div><b>PREGAME</b><small>Build before puck / kick / first pitch</small></div></button>
          <button><span>02</span><div><b>QUARTER</b><small>In-game checkpoints</small></div></button>
          <button><span>03</span><div><b>HALFTIME</b><small>Fresh context at the break</small></div></button>
          <button><span>04</span><div><b>LIVE</b><small>React to current game state</small></div></button>
        </section>

        <section class="parlays-command-grid">
          <article class="parlay-slip">
            <div class="parlay-slip-head">
              <div><span class="gold-kicker">CURRENT BUILD</span><h2>3-leg model parlay</h2></div>
              <div class="parlay-leg-count">
                <button>2</button><button class="is-active">3</button><button>4</button><button>5+</button>
              </div>
            </div>

            <div class="parlay-leg parlay-leg--strong">
              <div class="parlay-leg-index">01</div>
              <div class="parlay-leg-main">
                <div class="parlay-leg-identity">${playerHeadshot("Connor McDavid","parlay-leg-headshot")}<div>
                <div class="parlay-leg-meta"><span>NHL · SHOTS</span><b>HIGH CONF</b></div>
                <h3>Connor McDavid · Over 3.5 Shots</h3>
                <small>EDM vs CGY · exact selection</small></div></div>
                <div class="parlay-leg-metrics">
                  <span><small>MODEL</small><b>67.0%</b></span>
                  <span><small>MARKET</small><b>58.8%</b></span>
                  <span><small>EDGE</small><b class="positive">+8.2%</b></span>
                  <span><small>CONF</small><b>86</b></span>
                </div>
              </div>
              <div class="parlay-leg-price"><span>BEST</span><strong>-105</strong><small>DK</small></div>
              <button class="parlay-leg-remove">×</button>
            </div>

            <div class="parlay-leg parlay-leg--strong">
              <div class="parlay-leg-index">02</div>
              <div class="parlay-leg-main">
                <div class="parlay-leg-identity">${playerHeadshot("Saquon Barkley","parlay-leg-headshot")}<div>
                <div class="parlay-leg-meta"><span>NFL · ANYTIME TD</span><b>HIGH CONF</b></div>
                <h3>Saquon Barkley · Anytime Touchdown</h3>
                <small>PHI vs DAL · Yes</small></div></div>
                <div class="parlay-leg-metrics">
                  <span><small>MODEL</small><b>63.1%</b></span>
                  <span><small>MARKET</small><b>55.4%</b></span>
                  <span><small>EDGE</small><b class="positive">+7.7%</b></span>
                  <span><small>CONF</small><b>88</b></span>
                </div>
              </div>
              <div class="parlay-leg-price"><span>BEST</span><strong>-124</strong><small>FD</small></div>
              <button class="parlay-leg-remove">×</button>
            </div>

            <div class="parlay-leg parlay-leg--weak">
              <div class="parlay-leg-index">03</div>
              <div class="parlay-leg-main">
                <div class="parlay-leg-identity">${playerHeadshot("Sidney Crosby","parlay-leg-headshot")}<div>
                <div class="parlay-leg-meta"><span>NHL · ANYTIME GOAL</span><b>WEAKEST LEG</b></div>
                <h3>Sidney Crosby · Anytime Goal</h3>
                <small>PIT vs PHI · Yes</small></div></div>
                <div class="parlay-leg-metrics">
                  <span><small>MODEL</small><b>34.8%</b></span>
                  <span><small>MARKET</small><b>27.2%</b></span>
                  <span><small>EDGE</small><b class="positive">+7.6%</b></span>
                  <span><small>CONF</small><b>78</b></span>
                </div>
              </div>
              <div class="parlay-leg-price"><span>BEST</span><strong>+268</strong><small>DK</small></div>
              <button class="parlay-leg-remove">×</button>
            </div>

            <button class="parlay-add-leg"><span>＋</span><div><b>ADD ANOTHER LEG</b><small>Pull from Props, Models or smart suggestions</small></div></button>

            <div class="parlay-line-protection"><span>✓</span><div><b>EXACT-SELECTION PROTECTION</b><small>Each leg keeps its exact threshold and side. A nearby sportsbook line is never substituted silently.</small></div></div>
          </article>

          <aside class="parlay-health">
            <div class="parlay-health-head"><span class="violet-kicker">OUTPOST CHECK</span><b>BUILD HEALTH</b></div>
            <div class="parlay-health-score">
              <div class="parlay-health-ring"><div><strong>84</strong><small>/ 100</small></div></div>
              <div><span>QUALITY SCORE</span><h2>Strong build</h2><p>Two high-confidence legs and one leg worth reviewing.</p></div>
            </div>

            <div class="parlay-summary-grid">
              <div><span>COMBINED PRICE</span><b>+1280</b></div>
              <div><span>MODEL PROB</span><b>9.4%</b></div>
              <div><span>MARKET PROB</span><b>7.2%</b></div>
              <div><span>PARLAY EDGE</span><b class="positive">+2.2%</b></div>
            </div>

            <div class="parlay-check-list">
              <div class="is-good"><span>✓</span><div><b>Correlation check</b><small>No major negative dependency detected</small></div></div>
              <div class="is-good"><span>✓</span><div><b>Exact lines verified</b><small>All 3 selections match displayed thresholds</small></div></div>
              <div class="is-warn"><span>!</span><div><b>Weakest leg found</b><small>Crosby goal carries the lowest confidence score</small></div></div>
            </div>

            <div class="parlay-health-actions">
              <button class="button secondary">SAVE BUILD</button>
              <button class="button primary">TRACK PARLAY →</button>
            </div>
          </aside>
        </section>

        <section class="destination-section">
          <div class="destination-section-head">
            <div><span class="orange-kicker">WEAKEST LEG</span><h2>Should you replace it?</h2></div>
            <button data-route-jump="props">OPEN PROP BOARD →</button>
          </div>
          <div class="parlay-replacement-grid">
            <article class="parlay-replace-current">
              <div class="parlay-replace-label">CURRENT LEG</div>
              <span>NHL · ANYTIME GOAL</span>
              ${playerHeadshot("Sidney Crosby","parlay-card-headshot")}
              <h3>Sidney Crosby</h3>
              <p>Anytime Goal · +268</p>
              <div><span>CONFIDENCE</span><b>78</b></div>
              <div><span>EDGE</span><b class="positive">+7.6%</b></div>
            </article>
            <div class="parlay-replace-arrow">→</div>
            <button class="parlay-replacement-card">
              <span class="parlay-replacement-badge">SAFER</span>
              <small>NFL · RECEIVING</small>
              ${playerHeadshot("Travis Kelce","parlay-card-headshot")}
              <h3>Travis Kelce O 67.5 Yds</h3>
              <div><span>CONF</span><b>82</b></div>
              <div><span>EDGE</span><b class="positive">+5.8%</b></div>
              <strong>+102</strong>
              <em>REPLACE LEG →</em>
            </button>
            <button class="parlay-replacement-card">
              <span class="parlay-replacement-badge">MORE EDGE</span>
              <small>MLB · HOME RUN</small>
              ${playerHeadshot("Pete Alonso","parlay-card-headshot")}
              <h3>Pete Alonso · Home Run</h3>
              <div><span>CONF</span><b>84</b></div>
              <div><span>EDGE</span><b class="positive">+7.7%</b></div>
              <strong>+360</strong>
              <em>REPLACE LEG →</em>
            </button>
          </div>
        </section>

        <section class="destination-section">
          <div class="destination-section-head">
            <div><span class="gold-kicker">SMART SUGGESTIONS</span><h2>Compatible legs with model edge</h2></div>
            <button data-route-jump="models">OPEN MODELS →</button>
          </div>
          <div class="parlay-suggestion-grid">
            <button class="parlay-suggestion-card">
              <div><span>NFL</span><b>COMPATIBLE</b></div>
              ${playerHeadshot("Travis Kelce","parlay-suggestion-headshot")}
              <h3>Travis Kelce O 67.5 Receiving Yards</h3>
              <p>KC at BUF · exact O 67.5</p>
              <section><span><small>MODEL</small><b>61%</b></span><span><small>EDGE</small><b class="positive">+5.8%</b></span><span><small>BEST</small><b>+102</b></span></section>
              <i>＋ ADD LEG</i>
            </button>
            <button class="parlay-suggestion-card">
              <div><span>NHL</span><b>COMPATIBLE</b></div>
              ${playerHeadshot("Auston Matthews","parlay-suggestion-headshot")}
              <h3>Auston Matthews · Anytime Goal</h3>
              <p>TOR vs MTL · Yes</p>
              <section><span><small>MODEL</small><b>37%</b></span><span><small>EDGE</small><b class="positive">+5.1%</b></span><span><small>BEST</small><b>+118</b></span></section>
              <i>＋ ADD LEG</i>
            </button>
            <button class="parlay-suggestion-card">
              <div><span>MLB</span><b>COMPATIBLE</b></div>
              ${playerHeadshot("Aaron Judge","parlay-suggestion-headshot")}
              <h3>Aaron Judge · 2+ Total Bases</h3>
              <p>NYY vs BAL · exact 2+</p>
              <section><span><small>MODEL</small><b>49%</b></span><span><small>EDGE</small><b class="positive">+4.7%</b></span><span><small>BEST</small><b>+130</b></span></section>
              <i>＋ ADD LEG</i>
            </button>
          </div>
        </section>

        <section class="destination-section">
          <div class="destination-section-head">
            <div><span class="violet-kicker">BOOK COMPARISON</span><h2>Same exact 3-leg ticket</h2></div>
            <button>ALL BOOKS →</button>
          </div>
          <div class="parlay-book-board">
            <div class="parlay-book-row is-best"><span class="parlay-book-name">DK</span><div><b>DraftKings</b><small>All exact selections available</small></div><strong>+1280</strong><span class="parlay-book-value">BEST PRICE</span><button>OPEN BOOK →</button></div>
            <div class="parlay-book-row"><span class="parlay-book-name">FD</span><div><b>FanDuel</b><small>All exact selections available</small></div><strong>+1225</strong><span>-55 vs best</span><button>OPEN BOOK →</button></div>
            <div class="parlay-book-row"><span class="parlay-book-name">MGM</span><div><b>BetMGM</b><small>McDavid exact line available</small></div><strong>+1190</strong><span>-90 vs best</span><button>OPEN BOOK →</button></div>
          </div>
        </section>
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