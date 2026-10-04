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
      return `
      <section class="live-page broadcast-destination">
        <section class="destination-hero live-destination-hero">
          <div>
            <span class="destination-kicker"><i></i> LIVE CENTER · ${leagueName(league)}</span>
            <h1>Everything happening now.</h1>
            <p>Scores, live win probability, model movement and market signals — organized around the games that matter.</p>
          </div>
          <div class="destination-actions">
            <button class="button secondary">Save view</button>
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
          <div class="live-filter-meta"><span class="live-pulse"></span><b>3 LIVE</b><span>·</span><small>Updated 12 sec ago</small></div>
        </section>

        <section class="live-command-grid">
          <article class="live-gamecast-hero">
            <div class="live-gamecast-energy live-gamecast-energy--blue"></div>
            <div class="live-gamecast-energy live-gamecast-energy--orange"></div>
            <div class="live-gamecast-top">
              <span class="live-state-chip"><i></i> LIVE · 2ND 12:34</span>
              <span>NHL · GAMECAST</span>
            </div>
            <div class="live-matchup-stage">
              <div class="live-team">
                <span>PIT</span>
                <strong>2</strong>
                <small>Pittsburgh</small>
              </div>
              <div class="live-center-mark"><b>VS</b><span>PRIME TIME</span></div>
              <div class="live-team live-team--away">
                <span>PHI</span>
                <strong>1</strong>
                <small>Philadelphia</small>
              </div>
            </div>
            <div class="live-stat-strip">
              <div><span>WIN PROB</span><b>PIT 68%</b></div>
              <div><span>SHOTS</span><b>21–14</b></div>
              <div><span>xG</span><b>1.94–1.12</b></div>
              <div><span>NEXT GOAL</span><b>PIT 61%</b></div>
            </div>
            <div class="live-gamecast-footer">
              <div><span>OUTPOST LIVE LEAN</span><b>PIT next goal</b><strong>+142</strong></div>
              <button class="broadcast-cta">OPEN GAMECAST →</button>
            </div>
          </article>

          <aside class="live-signal-board">
            <div class="live-signal-head">
              <div><span class="orange-kicker">LIVE SIGNALS</span><h2>What moved</h2></div>
              <span>NOW</span>
            </div>
            <div class="live-signal-row">
              <span class="signal-rank">01</span>
              <div><b>Sidney Crosby</b><small>Anytime Goal · PIT</small></div>
              <span class="signal-metric"><small>MODEL</small><b>34.8%</b></span>
              <strong class="positive">+7.0%</strong>
            </div>
            <div class="live-signal-row">
              <span class="signal-rank">02</span>
              <div><b>CeeDee Lamb</b><small>100+ Receiving · DAL</small></div>
              <span class="signal-metric"><small>MODEL</small><b>57%</b></span>
              <strong class="positive">+16%</strong>
            </div>
            <div class="live-signal-row">
              <span class="signal-rank">03</span>
              <div><b>Connor McDavid</b><small>Shots O 3.5 · EDM</small></div>
              <span class="signal-metric"><small>PRICE</small><b>-105</b></span>
              <strong class="signal-up">▲</strong>
            </div>
            <div class="live-signal-footer"><span>42 markets tracked</span><b>2 high-edge moves</b></div>
          </aside>
        </section>

        <section class="destination-section live-games-section">
          <div class="destination-section-head">
            <div><span class="gold-kicker">LIVE SCOREBOARD</span><h2>Games in progress</h2></div>
            <button>FULL SCOREBOARD →</button>
          </div>
          <div class="live-score-board">
            <button class="live-score-row is-featured">
              <span class="live-score-state"><i></i>2ND 12:34</span>
              <span class="live-score-matchup"><b>PIT</b><strong>2</strong><em>VS</em><strong>1</strong><b>PHI</b></span>
              <span class="live-score-context"><small>WIN PROB</small><b>PIT 68%</b></span>
              <span class="live-score-context"><small>NEXT GOAL</small><b>PIT 61%</b></span>
              <span class="live-score-action">GAMECAST →</span>
            </button>
            <button class="live-score-row">
              <span class="live-score-state"><i></i>Q3 6:41</span>
              <span class="live-score-matchup"><b>DAL</b><strong>17</strong><em>VS</em><strong>10</strong><b>NYG</b></span>
              <span class="live-score-context"><small>WIN PROB</small><b>DAL 74%</b></span>
              <span class="live-score-context"><small>NEXT SCORE</small><b>DAL 57%</b></span>
              <span class="live-score-action">GAMECAST →</span>
            </button>
            <button class="live-score-row">
              <span class="live-score-state"><i></i>3RD 8:12</span>
              <span class="live-score-matchup"><b>TOR</b><strong>3</strong><em>VS</em><strong>3</strong><b>MTL</b></span>
              <span class="live-score-context"><small>WIN PROB</small><b>TOR 54%</b></span>
              <span class="live-score-context"><small>NEXT GOAL</small><b>TOR 52%</b></span>
              <span class="live-score-action">GAMECAST →</span>
            </button>
          </div>
        </section>

        <section class="destination-section">
          <div class="destination-section-head">
            <div><span class="violet-kicker">MODEL MOVEMENT</span><h2>Live probabilities changing</h2></div>
            <button data-route-jump="models">OPEN MODELS →</button>
          </div>
          <div class="live-model-grid">
            <article class="live-model-card live-model-card--violet">
              <div class="live-model-top"><span>NHL · ANYTIME GOAL</span><b>HIGH CONF</b></div>
              <div class="live-model-player"><div><h3>Sidney Crosby</h3><small>PIT · C · vs PHI</small></div><span class="live-model-badge"><small>MODEL</small><strong>34.8%</strong></span></div>
              <div class="live-model-shift"><span><small>PREGAME</small><b>28.0%</b></span><i>→</i><span><small>LIVE</small><b>34.8%</b></span><strong class="positive">+6.8%</strong></div>
              <div class="live-model-reason">4 shots · 2 high-danger chances · offensive-zone time rising</div>
            </article>
            <article class="live-model-card live-model-card--gold">
              <div class="live-model-top"><span>NFL · RECEIVING</span><b>FAST MOVE</b></div>
              <div class="live-model-player"><div><h3>CeeDee Lamb</h3><small>DAL · WR · at NYG</small></div><span class="live-model-badge"><small>MODEL</small><strong>57%</strong></span></div>
              <div class="live-model-shift"><span><small>PREGAME</small><b>41%</b></span><i>→</i><span><small>LIVE</small><b>57%</b></span><strong class="positive">+16%</strong></div>
              <div class="live-model-reason">38% target share · game script holding · route volume intact</div>
            </article>
            <article class="live-model-card live-model-card--orange">
              <div class="live-model-top"><span>NHL · SHOTS</span><b>PRICE MOVE</b></div>
              <div class="live-model-player"><div><h3>Connor McDavid</h3><small>EDM · C · vs CGY</small></div><span class="live-model-badge"><small>PRICE</small><strong>-105</strong></span></div>
              <div class="live-model-shift"><span><small>OPEN</small><b>+115</b></span><i>→</i><span><small>NOW</small><b>-105</b></span><strong class="signal-up">▲ 20¢</strong></div>
              <div class="live-model-reason">Market following volume · model remains ahead of current price</div>
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
              <span class="research-avatar">97</span>
              <div><b>Connor McDavid</b><small>Shots · Points · Anytime Goal</small></div>
              <span class="research-opens">12.4k</span>
            </button>
            <button class="research-player-row">
              <span class="research-player-rank">02</span>
              <span class="research-avatar">26</span>
              <div><b>Saquon Barkley</b><small>Rushing · Receiving · Anytime TD</small></div>
              <span class="research-opens">9.8k</span>
            </button>
            <button class="research-player-row">
              <span class="research-player-rank">03</span>
              <span class="research-avatar">20</span>
              <div><b>Pete Alonso</b><small>Home Run · Total Bases · Hits</small></div>
              <span class="research-opens">8.1k</span>
            </button>
            <button class="research-player-row">
              <span class="research-player-rank">04</span>
              <span class="research-avatar">87</span>
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
              <div class="research-signal-player"><div><h3>Connor McDavid</h3><small>EDM · C · vs CGY</small></div><span class="research-score-badge"><small>MODEL</small><strong>67%</strong></span></div>
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
              <div class="research-signal-player"><div><h3>Travis Kelce</h3><small>KC · TE · at BUF</small></div><span class="research-score-badge"><small>MODEL</small><strong>61%</strong></span></div>
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
              <div class="research-signal-player"><div><h3>Pete Alonso</h3><small>BAL · 1B · at NYY</small></div><span class="research-score-badge"><small>MODEL</small><strong>29.4%</strong></span></div>
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
      <section class="models-page broadcast-destination">
        <section class="destination-hero models-destination-hero">
          <div class="models-hero-copy">
            <div class="models-title-lockup">
              <img class="models-hero-icon" src="/brand/production/tso2-product-models-approved.webp" alt="" />
              <span class="destination-kicker models-kicker">MODEL COMMAND CENTER · ${leagueName(league)}</span>
            </div>
            <h1>Where the numbers become a decision.</h1>
            <p>Every TSO model in one command center — probabilities, market gaps, confidence, price movement and the signals driving the projection.</p>
          </div>
          <div class="destination-actions">
            <button class="button secondary">MODEL HISTORY</button>
            <button class="button primary">RUN MODEL BOARD →</button>
          </div>
        </section>

        <section class="models-status-strip">
          <div><span class="model-live-dot"></span><b>MODEL FEED LIVE</b><small>All engines online</small></div>
          <span class="models-status-divider"></span>
          <div><b>4 SPORTS</b><small>One scoring language</small></div>
          <span class="models-status-divider"></span>
          <div><b>6 ENGINES</b><small>Scoring · props · games · live</small></div>
          <span class="models-status-divider"></span>
          <div><b>42 SEC</b><small>Since latest refresh</small></div>
        </section>

        <section class="models-engine-tabs">
          <button class="models-engine-tab is-active">
            <span class="models-engine-mark models-engine-mark--violet">◎</span>
            <div><b>SCORING</b><small>Goal · TD · HR</small></div>
            <i>27 EDGES</i>
          </button>
          <button class="models-engine-tab">
            <span class="models-engine-mark models-engine-mark--blue">◫</span>
            <div><b>PLAYER PROPS</b><small>Volume · yards · shots</small></div>
            <i>84 EDGES</i>
          </button>
          <button class="models-engine-tab">
            <span class="models-engine-mark models-engine-mark--gold">⌁</span>
            <div><b>GAME MODELS</b><small>Moneyline · spread · total</small></div>
            <i>19 EDGES</i>
          </button>
          <button class="models-engine-tab">
            <span class="models-engine-mark models-engine-mark--orange">✦</span>
            <div><b>LIVE MODELS</b><small>Next score · live props</small></div>
            <i>11 ACTIVE</i>
          </button>
        </section>

        <section class="models-command-grid">
          <article class="model-spotlight-card">
            <div class="model-spotlight-glow"></div>
            <div class="model-spotlight-top">
              <span>NHL · ANYTIME GOAL</span>
              <b>HIGH CONFIDENCE</b>
            </div>

            <div class="model-spotlight-main">
              <div class="model-spotlight-player">
                <span class="model-player-number">87</span>
                <div>
                  <small>PIT · C · vs PHI</small>
                  <h2>Sidney Crosby</h2>
                  <p>Anytime Goal</p>
                </div>
              </div>

              <div class="model-probability-ring">
                <div><small>MODEL</small><strong>34.8%</strong><span>probability</span></div>
              </div>
            </div>

            <div class="model-score-line">
              <div><span>MARKET</span><b>27.2%</b></div>
              <div><span>EDGE</span><b class="positive">+7.6%</b></div>
              <div><span>CONFIDENCE</span><b>88 / 100</b></div>
              <div><span>BEST PRICE</span><b>+268 <small>DK</small></b></div>
            </div>

            <div class="model-confidence-band">
              <div><span>OUTPOST CONFIDENCE</span><b>VERY HIGH</b></div>
              <div class="model-confidence-track"><i style="width:88%"></i></div>
            </div>

            <div class="model-driver-grid">
              <div><span>SHOT VOLUME</span><b>↑ STRONG</b><small>4.1 SOG projection</small></div>
              <div><span>GOALIE MATCHUP</span><b>+ FAVORABLE</b><small>HD save-rate edge</small></div>
              <div><span>POWER PLAY</span><b>TOP UNIT</b><small>PP1 role intact</small></div>
              <div><span>MARKET GAP</span><b class="positive">+7.6%</b><small>Model ahead of price</small></div>
            </div>

            <div class="model-spotlight-footer">
              <div><span>OUTPOST READ</span><b>Volume + matchup + price are aligned.</b><small>The current market still trails the model projection.</small></div>
              <button class="broadcast-cta">OPEN FULL MODEL →</button>
            </div>
          </article>

          <aside class="model-edge-board">
            <div class="model-edge-head">
              <div><span class="violet-kicker">EDGE BOARD</span><h2>Best gaps right now</h2></div>
              <span>LIVE</span>
            </div>
            <button class="model-edge-row is-featured">
              <span class="model-edge-rank">01</span>
              <div><b>Sidney Crosby</b><small>NHL · Anytime Goal</small></div>
              <span><small>MODEL</small><b>34.8%</b></span>
              <strong class="positive">+7.6%</strong>
            </button>
            <button class="model-edge-row">
              <span class="model-edge-rank">02</span>
              <div><b>Saquon Barkley</b><small>NFL · Anytime TD</small></div>
              <span><small>MODEL</small><b>63.1%</b></span>
              <strong class="positive">+7.7%</strong>
            </button>
            <button class="model-edge-row">
              <span class="model-edge-rank">03</span>
              <div><b>Pete Alonso</b><small>MLB · Home Run</small></div>
              <span><small>MODEL</small><b>29.4%</b></span>
              <strong class="positive">+7.7%</strong>
            </button>
            <button class="model-edge-row">
              <span class="model-edge-rank">04</span>
              <div><b>Connor McDavid</b><small>NHL · O 3.5 Shots</small></div>
              <span><small>MODEL</small><b>67.0%</b></span>
              <strong class="positive">+8.2%</strong>
            </button>
            <button class="model-edge-row">
              <span class="model-edge-rank">05</span>
              <div><b>Travis Kelce</b><small>NFL · O 67.5 Rec Yds</small></div>
              <span><small>MODEL</small><b>61.0%</b></span>
              <strong class="positive">+5.8%</strong>
            </button>
            <div class="model-edge-footer"><span>Sorted by model-vs-market edge</span><button>FULL BOARD →</button></div>
          </aside>
        </section>

        <section class="destination-section">
          <div class="destination-section-head">
            <div><span class="violet-kicker">MODEL ENGINES</span><h2>Purpose-built models. One system.</h2></div>
            <button>MODEL METHODOLOGY →</button>
          </div>
          <div class="model-engine-grid">
            <article class="model-engine-card model-engine-card--violet">
              <div class="model-engine-top"><span>NHL</span><b>SCORING</b></div>
              <h3>First Goal</h3>
              <p>Opening-score probability using role, shot generation, line deployment, matchup and game environment.</p>
              <div><span>TOP SIGNAL</span><b>Crosby · 8.7%</b></div>
              <button>OPEN ENGINE →</button>
            </article>
            <article class="model-engine-card model-engine-card--purple">
              <div class="model-engine-top"><span>NHL</span><b>SCORING</b></div>
              <h3>Anytime Goal</h3>
              <p>Full-game scoring probability built around usage, expected chances, matchup quality and goalie context.</p>
              <div><span>TOP SIGNAL</span><b>Crosby · 34.8%</b></div>
              <button>OPEN ENGINE →</button>
            </article>
            <article class="model-engine-card model-engine-card--blue">
              <div class="model-engine-top"><span>NFL</span><b>SCORING</b></div>
              <h3>Anytime TD</h3>
              <p>Touchdown probability driven by red-zone role, opportunity share, game script and defensive matchup.</p>
              <div><span>TOP SIGNAL</span><b>Barkley · 63.1%</b></div>
              <button>OPEN ENGINE →</button>
            </article>
            <article class="model-engine-card model-engine-card--gold">
              <div class="model-engine-top"><span>MLB</span><b>POWER</b></div>
              <h3>Home Run</h3>
              <p>Power probability blending contact quality, pitcher profile, park, weather and expected plate appearances.</p>
              <div><span>TOP SIGNAL</span><b>Alonso · 29.4%</b></div>
              <button>OPEN ENGINE →</button>
            </article>
            <article class="model-engine-card model-engine-card--cyan">
              <div class="model-engine-top"><span>ALL SPORTS</span><b>PROPS</b></div>
              <h3>Player Props</h3>
              <p>Exact-line projections for shots, yards, receptions, points, bases and other volume markets.</p>
              <div><span>TOP SIGNAL</span><b>McDavid O3.5 · 67%</b></div>
              <button>OPEN ENGINE →</button>
            </article>
            <article class="model-engine-card model-engine-card--orange">
              <div class="model-engine-top"><span>ALL SPORTS</span><b>GAME</b></div>
              <h3>Game Models</h3>
              <p>Win probability, spreads and totals with consistent context across NHL, NFL, MLB and NBA.</p>
              <div><span>TOP SIGNAL</span><b>PIT ML · 68%</b></div>
              <button>OPEN ENGINE →</button>
            </article>
          </div>
        </section>

        <section class="destination-section">
          <div class="destination-section-head">
            <div><span class="gold-kicker">MODEL BOARD</span><h2>Every projection, ranked.</h2></div>
            <div class="models-board-actions"><button>EDGE 3%+</button><button>CONF 70+</button></div>
          </div>
          <div class="models-board">
            <div class="models-board-head">
              <span>PLAYER / MARKET</span><span>MODEL</span><span>MARKET</span><span>EDGE</span><span>CONF</span><span>BEST</span><span>MOVE</span>
            </div>
            <button class="models-board-row">
              <span class="models-board-player"><i>NHL</i><span><b>Sidney Crosby</b><small>Anytime Goal · PIT vs PHI</small></span></span>
              <strong>34.8%</strong><strong>27.2%</strong><strong class="positive">+7.6%</strong><span class="models-conf models-conf--high">88</span><span class="models-price"><b>+268</b><small>DK</small></span><span class="models-move up">▲ 12¢</span>
            </button>
            <button class="models-board-row">
              <span class="models-board-player"><i>NFL</i><span><b>Saquon Barkley</b><small>Anytime TD · PHI vs DAL</small></span></span>
              <strong>63.1%</strong><strong>55.4%</strong><strong class="positive">+7.7%</strong><span class="models-conf models-conf--high">84</span><span class="models-price"><b>-124</b><small>FD</small></span><span class="models-move flat">→ 2¢</span>
            </button>
            <button class="models-board-row">
              <span class="models-board-player"><i>MLB</i><span><b>Pete Alonso</b><small>Home Run · BAL at NYY</small></span></span>
              <strong>29.4%</strong><strong>21.7%</strong><strong class="positive">+7.7%</strong><span class="models-conf models-conf--mid">81</span><span class="models-price"><b>+360</b><small>365</small></span><span class="models-move up">▲ 15¢</span>
            </button>
            <button class="models-board-row">
              <span class="models-board-player"><i>NHL</i><span><b>Connor McDavid</b><small>Over 3.5 Shots · EDM vs CGY</small></span></span>
              <strong>67.0%</strong><strong>58.8%</strong><strong class="positive">+8.2%</strong><span class="models-conf models-conf--high">90</span><span class="models-price"><b>-105</b><small>DK</small></span><span class="models-move up">▲ 20¢</span>
            </button>
          </div>
        </section>

        <section class="models-intelligence-grid">
          <article class="models-framework-card">
            <div class="models-framework-head"><span class="violet-kicker">CONFIDENCE FRAMEWORK</span><h2>Same language everywhere</h2></div>
            <div class="models-confidence-scale">
              <div><span>VERY HIGH</span><b>85%+</b><i style="width:96%"></i></div>
              <div><span>HIGH</span><b>70–84%</b><i style="width:80%"></i></div>
              <div><span>MEDIUM</span><b>55–69%</b><i style="width:64%"></i></div>
              <div><span>LOW</span><b>&lt;55%</b><i style="width:44%"></i></div>
            </div>
          </article>

          <article class="models-framework-card">
            <div class="models-framework-head"><span class="gold-kicker">WHAT FEEDS THE MODEL</span><h2>Context, not one stat</h2></div>
            <div class="models-input-grid">
              <span><i>01</i><b>Recent Form</b><small>Usage + production trend</small></span>
              <span><i>02</i><b>Matchup</b><small>Opponent-specific context</small></span>
              <span><i>03</i><b>Environment</b><small>Pace · venue · weather</small></span>
              <span><i>04</i><b>Market</b><small>Price + line movement</small></span>
            </div>
          </article>

          <article class="models-framework-card models-run-card">
            <div class="models-framework-head"><span class="orange-kicker">LATEST RUN</span><h2>Model pulse</h2></div>
            <div class="models-run-stat"><span>ENGINES</span><b>6 / 6</b><small>online</small></div>
            <div class="models-run-stat"><span>HIGH-EDGE SIGNALS</span><b>18</b><small>across current board</small></div>
            <div class="models-run-footer"><span class="model-live-dot"></span> Next automatic refresh active</div>
          </article>
        </section>
      </section>`;
    },

    props(league){
      return `
      <section class="props-page broadcast-destination">
        <section class="destination-hero props-destination-hero">
          <div>
            <div class="props-title-lockup">
              <img class="props-hero-icon" src="/brand/production/tso2-product-props-approved.webp" alt="" />
              <span class="destination-kicker props-kicker">PROP INTELLIGENCE · ${leagueName(league)}</span>
            </div>
            <h1>Find the line before the market catches up.</h1>
            <p>Exact player props, model probability, market probability, best price, line movement and sportsbook comparison — one board, one exact selection.</p>
          </div>
          <div class="destination-actions">
            <button class="button secondary">SAVED PROPS</button>
            <button class="button primary">BUILD FROM PROPS →</button>
          </div>
        </section>

        <section class="props-status-strip">
          <div><span class="props-live-dot"></span><b>PROP FEED LIVE</b></div>
          <span class="props-status-divider"></span>
          <div><b>1,284</b><small>markets tracked</small></div>
          <span class="props-status-divider"></span>
          <div><b>86</b><small>model edges 3%+</small></div>
          <span class="props-status-divider"></span>
          <div><b>11</b><small>steam moves</small></div>
          <span class="props-status-divider"></span>
          <div><b>18 SEC</b><small>latest refresh</small></div>
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
            <input placeholder="Search player, team or exact market..." />
            <kbd>ENTER</kbd>
          </label>
          <div class="props-filter-actions">
            <button>MARKET: ALL⌄</button>
            <button>BOOK: ALL⌄</button>
            <button>EDGE 3%+⌄</button>
          </div>
        </section>

        <section class="props-market-tabs">
          <button class="is-active"><span>✦</span><div><b>TOP EDGES</b><small>86 active</small></div></button>
          <button><span>◎</span><div><b>SCORING</b><small>Goals · TD · HR</small></div></button>
          <button><span>↗</span><div><b>VOLUME</b><small>Shots · Yards · Attempts</small></div></button>
          <button><span>▦</span><div><b>COMBOS</b><small>Points · PRA · SGP</small></div></button>
          <button><span>≋</span><div><b>MOVERS</b><small>Steam · stale lines</small></div></button>
        </section>

        <section class="props-command-grid">
          <article class="prop-spotlight">
            <div class="prop-spotlight-glow"></div>
            <div class="prop-spotlight-top">
              <span>FEATURED PROP · NHL SHOTS</span>
              <b>HIGH EDGE</b>
            </div>
            <div class="prop-spotlight-main">
              <div class="prop-spotlight-player">
                <div class="prop-player-number">97</div>
                <div>
                  <small>EDM · C · vs CGY</small>
                  <h2>Connor McDavid</h2>
                  <p>Shots on Goal · <strong>Over 3.5</strong></p>
                </div>
              </div>
              <div class="prop-edge-ring">
                <div><small>MODEL</small><strong>67%</strong><span>probability</span></div>
              </div>
            </div>
            <div class="prop-score-line">
              <div><span>EXACT LINE</span><b>O 3.5</b></div>
              <div><span>MARKET</span><b>58.8%</b></div>
              <div><span>EDGE</span><b class="positive">+8.2%</b></div>
              <div><span>CONFIDENCE</span><b>86 / 100</b></div>
            </div>
            <div class="prop-best-price">
              <div>
                <span>BEST AVAILABLE PRICE</span>
                <strong>-105</strong>
                <small>DraftKings · exact O 3.5 selection</small>
              </div>
              <div class="prop-line-lock"><i>✓</i><span><b>EXACT LINE LOCKED</b><small>No nearby-line substitution</small></span></div>
            </div>
            <div class="prop-book-strip">
              <div class="is-best"><span>DK</span><b>-105</b><small>BEST</small></div>
              <div><span>FD</span><b>-110</b><small>O 3.5</small></div>
              <div><span>365</span><b>-115</b><small>O 3.5</small></div>
              <div><span>MGM</span><b>-120</b><small>O 3.5</small></div>
            </div>
            <div class="prop-spotlight-footer">
              <div><span>OUTPOST READ</span><b>Volume is holding while the best price still trails model value.</b><small>Recent attempt rate + matchup pace keep the Over ahead of market.</small></div>
              <button class="broadcast-cta">OPEN PROP ANALYSIS →</button>
            </div>
          </article>

          <aside class="props-movers-board">
            <div class="props-movers-head">
              <div><span class="orange-kicker">MARKET WATCH</span><h2>Fastest movers</h2></div>
              <span>LIVE</span>
            </div>
            <button class="props-mover-row is-steam prop-row">
              <span class="props-mover-tag">STEAM</span>
              <div><b>McDavid O 3.5 Shots</b><small>EDM · exact line</small></div>
              <span><small>OPEN</small><b>+115</b></span>
              <strong>-105</strong>
            </button>
            <button class="props-mover-row is-value prop-row">
              <span class="props-mover-tag">VALUE</span>
              <div><b>Barkley Anytime TD</b><small>PHI · Yes</small></div>
              <span><small>MODEL</small><b>63.1%</b></span>
              <strong class="positive">+7.7%</strong>
            </button>
            <button class="props-mover-row is-stale prop-row">
              <span class="props-mover-tag">STALE</span>
              <div><b>Alonso Home Run</b><small>BAL · Yes</small></div>
              <span><small>BEST</small><b>+360</b></span>
              <strong>+15¢</strong>
            </button>
            <button class="props-mover-row is-value prop-row">
              <span class="props-mover-tag">VALUE</span>
              <div><b>Kelce O 67.5 Rec Yds</b><small>KC · exact line</small></div>
              <span><small>MODEL</small><b>61.0%</b></span>
              <strong class="positive">+5.8%</strong>
            </button>
            <button class="props-mover-row is-steam prop-row">
              <span class="props-mover-tag">STEAM</span>
              <div><b>Crosby Anytime Goal</b><small>PIT · Yes</small></div>
              <span><small>OPEN</small><b>+290</b></span>
              <strong>+268</strong>
            </button>
            <div class="props-movers-footer"><span>11 steam moves detected</span><button>ALL MOVERS →</button></div>
          </aside>
        </section>

        <section class="destination-section props-board-section">
          <div class="destination-section-head">
            <div><span class="gold-kicker">PROP BOARD</span><h2>Best model-to-market gaps</h2></div>
            <div class="props-board-actions"><button>CONFIDENCE⌄</button><button>EDGE⌄</button></div>
          </div>
          <div class="props-board">
            <div class="props-board-head">
              <span>PLAYER / MARKET</span><span>LINE</span><span>MODEL</span><span>MARKET</span><span>EDGE</span><span>CONF</span><span>BEST PRICE</span><span>MOVE</span><span>FLAG</span>
            </div>
            <button class="props-board-row prop-row">
              <span class="props-board-player"><i>NHL</i><span><b>Connor McDavid</b><small>EDM · Shots on Goal</small></span></span>
              <strong>O 3.5</strong><strong>67.0%</strong><strong>58.8%</strong><strong class="positive">+8.2%</strong>
              <span class="props-conf props-conf--high">86</span><span class="props-price"><b>-105</b><small>DK</small></span><span class="props-move up">▲ 20¢</span><span class="props-flag props-flag--steam">STEAM</span>
            </button>
            <button class="props-board-row prop-row">
              <span class="props-board-player"><i>NFL</i><span><b>Saquon Barkley</b><small>PHI · Anytime TD</small></span></span>
              <strong>YES</strong><strong>63.1%</strong><strong>55.4%</strong><strong class="positive">+7.7%</strong>
              <span class="props-conf props-conf--high">88</span><span class="props-price"><b>-124</b><small>FD</small></span><span class="props-move flat">→ 2¢</span><span class="props-flag props-flag--value">VALUE</span>
            </button>
            <button class="props-board-row prop-row">
              <span class="props-board-player"><i>MLB</i><span><b>Pete Alonso</b><small>BAL · Home Run</small></span></span>
              <strong>YES</strong><strong>29.4%</strong><strong>21.7%</strong><strong class="positive">+7.7%</strong>
              <span class="props-conf props-conf--high">84</span><span class="props-price"><b>+360</b><small>365</small></span><span class="props-move up">▲ 15¢</span><span class="props-flag props-flag--stale">STALE</span>
            </button>
            <button class="props-board-row prop-row">
              <span class="props-board-player"><i>NHL</i><span><b>Sidney Crosby</b><small>PIT · Anytime Goal</small></span></span>
              <strong>YES</strong><strong>34.8%</strong><strong>27.2%</strong><strong class="positive">+7.6%</strong>
              <span class="props-conf props-conf--high">88</span><span class="props-price"><b>+268</b><small>DK</small></span><span class="props-move up">▲ 12¢</span><span class="props-flag props-flag--value">VALUE</span>
            </button>
            <button class="props-board-row prop-row">
              <span class="props-board-player"><i>NFL</i><span><b>Travis Kelce</b><small>KC · Receiving Yards</small></span></span>
              <strong>O 67.5</strong><strong>61.0%</strong><strong>55.2%</strong><strong class="positive">+5.8%</strong>
              <span class="props-conf props-conf--mid">79</span><span class="props-price"><b>-118</b><small>MGM</small></span><span class="props-move up">▲ 8¢</span><span class="props-flag props-flag--value">VALUE</span>
            </button>
          </div>
          <div class="props-exact-note"><span>✓</span><div><b>EXACT-SELECTION PROTECTION</b><small>Every displayed sportsbook price is tied to the line shown on that row. TSO does not present a nearby threshold as if it were the exact prop.</small></div></div>
        </section>

        <section class="destination-section">
          <div class="destination-section-head">
            <div><span class="violet-kicker">MARKET INTELLIGENCE</span><h2>How the board is reading tonight</h2></div>
            <button data-route-jump="models">OPEN MODELS →</button>
          </div>
          <div class="props-intelligence-grid">
            <article class="props-intel-card">
              <span class="orange-kicker">STEAM</span>
              <h3>11 fast price moves</h3>
              <p>Markets where the same exact selection is moving quickly across multiple books.</p>
              <div><span>McDavid O 3.5 Shots</span><b>+115 → -105</b></div>
              <div><span>Crosby Anytime Goal</span><b>+290 → +268</b></div>
            </article>
            <article class="props-intel-card">
              <span class="gold-kicker">VALUE GAPS</span>
              <h3>86 edges above 3%</h3>
              <p>Model probability compared with the implied probability of the best exact-line price.</p>
              <div><span>High confidence</span><b>18</b></div>
              <div><span>Very high confidence</span><b>7</b></div>
            </article>
            <article class="props-intel-card">
              <span class="violet-kicker">STALE LINES</span>
              <h3>6 books lagging market</h3>
              <p>Exact thresholds where one sportsbook has not yet followed broader price movement.</p>
              <div><span>Largest gap</span><b>15¢</b></div>
              <div><span>Markets watched</span><b>1,284</b></div>
            </article>
          </div>
        </section>
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