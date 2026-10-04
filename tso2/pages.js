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