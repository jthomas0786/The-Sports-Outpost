# TSO 3.0 — PropFinder public-product audit and feature parity

**Audited:** October 21, 2026  
**Development branch:** tso-3.0  
**Protected:** tso-2.0-restructure and main / production (no changes)

## Scope and audit limitations

This is a public-information audit, **not an authenticated inspection of every paid PropFinder page**. Verified sources:
- https://propfinder.app/ — marketing feature descriptions, supported sports, game projections, player dashboards
- https://propfinder.app/tutorials — 20 listed tool tutorials
- https://play.google.com/store/apps/details?id=app.propfinder.prod — feature overview of prop research, sportsbook comparison, line movement, saving/export, injuries and game logs
- https://apps.apple.com/us/app/propfinder-prop-research/id6773949831 — L5/L10/L20, home/away, opponents, price and game logs
- https://propfinder.app/pricing — sport and feature plan coverage
- https://propfinder.app/nfl and https://propfinder.app/cfb — login redirects on unauthenticated access
- https://propfinder.app/cfb/trends — one connected-browser page snapshot (not a site-wide crawl)
- https://blog.propfinder.app/ — public details of research workflow and ratings, not proprietary scoring formula

**Not verified:** all account-only routes, paywalled pages, admin screens, private data contracts, calculations behind proprietary ratings. Do not promise exact parity until authenticated inspection and separately licensed/authorized data integrations are complete.

## Verified sport coverage: six leagues

| Sport | Publicly confirmed tools or capabilities | TSO 3.0 planned research workspace |
|---|---|---|
| NFL | Passing, receiving, rushing, snaps/target share, TDs, defensive coverage, alignment, power ratings, QB rankings, spread/total game projections and weather | Passing, rushing, receiving, TDs, coverage, line matchups, red zone, QB, team power ratings, weather, projections |
| CFB | FBS passing/rushing/receiving, matchup/positional ranks, game projections, conference filters, trend and power ratings | CFB Games, Props, Trends, Conference/Team Ratings, QB rankings, TD matchups, Projections |
| MLB | HR matchups, exit velocity, team vs pitcher, team vs pitch mix, weather/park, pitcher summaries, stolen bases, bullpen usage and strikeouts | HR, Hits/TB/RBI, Statcast, pitch mix, pitcher matchups, stolen bases, strikeouts, bullpen, weather/park |
| NHL | Team statistics, skater statistics, goal-scorer matchups; prop research and game projections | Anytime/First Goal, Shots on Goal, Skater Stats, Team Stats, Goalie and power play matchups |
| NBA | Player-dashboard stats and game logs, odds, injury context and alt player props | Points, Rebounds, Assists, 3PM, PRA, minutes, pace, opponent matchup and First Basket |
| WNBA | Sport and player prop research supported; exact private menu not inspected | Player Props, Trends, Minutes, Usage, Pace, Team Stats, Injuries, Game Projections |

### Tutorial catalogue: publicly listed modules

**Football:** QB Rankings & Power Ratings, Game Projections, Alignment, Market Grades, Touchdown Matchups, NFL Research.

**MLB:** Strikeout Matchups, Stolen Bases, Bullpen Usage, Pitcher Summary, Weather & Park Factors, Team vs Pitch Mix, Team vs Pitcher, Exit Velocity, Enhanced Home Run Matchups.

**NHL:** Team Stats, Skater Stats, Goal Scorer Matchups.

The tutorial listing contains 20 video items; repeated NHL goal-scorer titles and separate football ratings topics may account for the count. Exact private page variants still need verification.

## Connected browser observation — CFB Trends

This one page showed: window controls (Today / 3 days / This week); subject filters (All / Players / Teams); side (All / Over / Under); minimum sample (Any / 5+ / 10+ / 15+); max juice thresholds; sorting by group score or hit rate; selectable games and markets; search; filters for home/away, national TV, H2H, short week, off bye, last ten and season; and supporting vs conflicting trend records with sportsbook quotes. TSO must calculate its own trend grades, label evidence and expose contradictory records rather than inventing or copying PropFinder's score.

## Original TSO 3.0 design contract

1. Fixed six-sport selector and consistent section navigation.
2. Overview, Games, Player Props, Trends, Cheatsheets, Power Ratings, Projections, Injuries and Saved Research views.
3. Filters: player/team search, market, sportsbook, L5/L10/L20/season and sorting.
4. One-click matchup cards and player research drawers; avoid jumping across three unrelated screens.
5. Player row: exact prop line, honest TSO signal, observed hits, exact model percent, book/quote, save action.
6. Verified history chart only when distinct game-level observations exist.
7. Sport-specific tool catalogs with status explicitly shown. Do not use invented stat lines or generate fictitious ratings.
8. Prefer Over/Yes research (consistent with TSO owner preferences). Keep moneyline, spread and totals as separate game research.
9. Model probability, implied sportsbook probability and historical hit percentage are not interchangeable.
10. TSO-owned visuals and math, not PropFinder proprietary UI/code/artwork/data.

## Build status

| TSO page | Foundation implemented | Remaining work for parity |
|---|---|---|
| Overview | All six sports, tool cards, data states, games and props | More feed depth |
| Games | Game cards and selected matchup with team context and props | Sport-specific defense and projection pipelines |
| Props | Verified-feed selection, exact lines, price, book, filter/search, sort | Licensed multi-book/alternate markets and robust normalization |
| Trends | Calculates L5/L10/L20/season when verified game logs accompany a selection | Separate logs pipeline where currently absent |
| Cheatsheets | Sport-specific tool inventory, panel navigation and source states | Fill each advanced cheatsheet with licensed/authorized data |
| Power Ratings | Dedicated page and integrity checks | New independent rating models/data |
| Projections | Strict model and exact-line gate | Broader six-sport calibrated models |
| Injuries | Dedicated page, clear unavailable state | Official injuries and starting lineups |
| Saved | Local browser shortlist with recorded quote | Account sync, line alerts and Parlay Ping betslip integration |

**Existing TSO source reuse:** TSO 2.0 staging scoreboard/props feeds, with independent ESPN CFB and WNBA schedule ingestion added to the 3.0 preview. NBA Games also reuses the independently deployed verified First Basket / Opening Tip play-by-play service. NHL goal research, NFL Monte Carlo and MLB models remain available in 2.0 and must be individually integrated and validated before claiming full parity. Exact-market model verification prevents misleading percentages.

**Missing/blocked:** CFB and WNBA full props/history/ratings ingestion (their game schedules are integrated), licensed advanced football matchup and MLB pitch-level sources, team ratings for six leagues, lineup/injury provider, historic game logs across all markets, authorized multi-book line histories.

## Launch checks

- [ ] Preview Worker URL homepage, JS/CSS and live API tested in actual browser
- [ ] Every sport displays real and appropriate events, or an honest empty state
- [ ] Home/away and player/team/market IDs validated across feeds
- [ ] Line-specific hit rates checked against individual completed game logs
- [ ] Model predictions validated on exact player/market/side/line and source date
- [ ] Sportsbook prices are current, source-timestamped and not silently rebranded as model confidence
- [ ] Keyboard, mobile, and responsive QA
- [ ] Each planned cheat sheet has verified input and sample-size coverage
- [ ] Authorized review of paywalled pages if comprehensive competitive parity is required
- [ ] Explicit approval before touching existing TSO 2.0 staging, release, production or main

## Independent preview

Cloudflare Worker named **tso3-preview** points at branch tso-3.0 / folder tso3. Worker enabled at the workers.dev subdomain. External browser smoke test not yet confirmed by available tools, so this is **a staged prototype**, not a production-ready 3.0 replacement.

**Never represent this audit as 100% of all PropFinder pages.**

## NBA Player Form and Matchup milestone — October 21, 2026

Both NBA cheatsheets are implemented on the isolated TSO 3.0 branch and deployed to the independent Cloudflare preview. Each opens directly to a research table (not a second landing screen), supports opponent/game/position/market filters, sample thresholds, a maximum juice filter, sorting and searching, and opens historical-game charts and individual logs.

The data path includes the TSO ESPN-derived NBA history dataset (154 player records observed in production-preview QA); verified NBA scoreboards from ESPN in the browser; TSO-owned source-timestamped NBA odds snapshots (966 eligible records in the backend source, and 181 exact line selections after default juice filtering in final browser QA); and descriptive defense-by-position comparisons against the league positional allowance benchmark.

The 3.0 preview now serves an immutable bundle of the checked-in HTML and JavaScript to avoid stale GitHub raw CDN assets. Real-browser QA verified 90 Player Form rows, 90 priced first-page selections, correct -500 juice filtering, 90 Matchup vs Position rows, opponent names and nonempty verified defensive-ratio rankings.

Not yet complete: the existing NBA regression service is unavailable, so regression probabilities deliberately remain blank. The old universal staging scoreboard and props APIs were unavailable during QA, but the NBA-specific ESPN scoreboard and verified TSO odds snapshot were confirmed. Authenticated paid PropFinder screens were not comprehensively inspected and no proprietary ratings, artwork or code were copied. Other sports require their own deep cheatsheet/data implementation. No main, release or production changes were made.


## Matchup multi-select / schedule labels — October 22, 2026

Updated the NBA Player Form and Matchup vs Position game picker and the shared six-sport research toolbar to allow independent checkboxes for multiple games. All Matchups resets the filter. Each option includes verified team abbreviations and a day/time label (for example, Thurs 8:30pm), formatted in America/Chicago time. The menu remains open while selecting more games. Direct tests passed for choosing two games and resetting all; live TSO 3.0 preview browser rendering verified the NBA game labels/times and the presence of 22 NBA matchup options at the time of inspection. Development branch and separate preview only; no production or main changes.
