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


## Current game and research-data hardening — October 22, 2026

All six league slates now use ESPNs sport-specific scoreboard API with individual daily date requests, merged event IDs, six-date look-ahead, freshness metadata, and date filtering. The direct ESPN API no longer accepts date ranges (HTTP 400). Real preview verification at 2026-10-22 11:05 UTC returned NFL 14, NBA 49, MLB 3, NHL 36, WNBA 3, and CFB 53 current-window game records. These are six-day-window counts, not games occurring today.

Current final scores and live status now display in matchup cards, and the ESPN last-checked time appears in the UI. NBA research labels historical game samples and their last refresh. NBA sportsbook quotes must be source-fresh and match an official ESPN event, its two teams and scheduled tip time. During browser QA the research view contained 90 player rows from this mornings refreshed historical source but zero current verified odds lines; that absence is deliberate when quote snapshots fail freshness or event-matching requirements.

The official ESPN current-game summary route and new live-boxscore.js present player/team game statistics, away on the left and home on the right. Isolated integration tests passed for event identity, scores and player stats. Full live browser verification of the boxscore view was blocked by Cloudflare browser-rendering rate limits and remains pending.

Remaining issues: fix/verify frequent ParlayAPI sportsbook snapshots and provider-to-ESPN event identity, add genuinely streaming in-progress player research updates instead of scheduled history, and provide independent current stats/providers across the remaining sport-specific research modules. No main/production/TSO 2.0 code changes were made.


## Verified NFL advanced research — October 22, 2026 (TSO 3.0 preview only)

Newly deployed and browser-verified in the independent TSO 3.0 Cloudflare preview:

- NFL Player Props: current ParlayAPI Over quotes joined to ESPN official games and team identity; 2026-only observed L5/L10 hit rates with actual game counts; separately sourced NFL 50,000-simulation Over probabilities joined by exact game, player, market, Over side, and literal sportsbook line. During browser QA, 791 exact model-matched current sportsbook selections were found and 90 model values appeared on the first page. Markets supported by the existing simulation: passing yards, passing touchdowns, completions, rushing yards, receiving yards and receptions. Anytime TD uses the game-model ATD output. Models for a different line or category stay blank. Table sorts by model only when an exact model exists, otherwise by historical L5 without mixing unlike measures.
- NFL Touchdown Opportunities: TSO regressed anytime TD model, game-specific 50K simulation ATD and 2+ TD frequencies are shown independently; disagreement size in percentage points, flags at 12+ / 20+ points, and interactive sorting and comparison-only filter. The thresholds are *visual comparison flags, not calibrated risk metrics*. A real first-page example was Derrick Henry 80.0% TSO vs 52.8% simulation (27.2-pp difference). Model source dates, 2025 baseline red-zone counts and actual 2026 L5 snap/target shares are distinct.
- NFL Defense vs Position: verified 2026 nflverse/ESPN opponent positional yards, targets, touchdowns, and source-game counts, compared with an independently deduplicated 28-defense source reference (not claimed to represent all 32 defenses). Live page QA rendered 90 first-page rows and percentage differences. Individual defender coverage assignments/man-vs-zone splits are **not** sourced or inferred.
- NFL Offensive Line Matchups: published a truthful alternative *defensive allowance matchup proxy* with passing/rushing yards allowed by each opponent in current 2026 logs (13 game rows visually verified). A test row showed away-QB/home-defense, home-QB/away-defense, away-RB/home-defense and home-RB/away-defense columns, with sample games and explicit "OL grades not connected". These are **not** blocking win rates, pressure rates or true offensive line ratings.
- NFL Game Strength Indicators (Power Ratings page): ESPN team records and verifiable game-specific 50K win percentages and simulated point differences; *not* falsely labeled as a calibrated season-long team power rating.
- Current ESPN NFL injury report is in its own verified endpoint. The touchdown and exact-prop model display suppresses modeled probabilities for players listed Out, Injured Reserve, Inactive or Suspended by the current feed; other injury statuses are displayed with proper caution, not falsely interpreted as official final inactives.
- All NFL research multi-select matchups, markets and positions now persist over the automatic site data-refresh cycle; game IDs that leave the slate are dropped. The Worker coalesces concurrent ESPN schedule requests and caches them at most 45 seconds per league.
- Code compilation and controlled source-level tests passed for 2026 positional reference arithmetic, exact-line mismatch rejection and persistent selections. Live-browser checks passed for NFL Player Props, TD Opportunities, Defense vs Position and Offensive Line Matchups.

**Still incomplete:** independent license/connection for real NFL man/zone/coverage matchup and specific CB assignments; actual offensive-line pressure/block grades; independent weather forecasts; observed 2026 within-20/inside-five rushing and target counts (existing red-zone inputs use a 2025 baseline); archival backtesting/calibration of touchdown-model probabilities; calibration of full team power ratings; genuinely live streaming sportsbook lines (available prices are timestamped snapshots). No source or graphics from paid PropFinder screens have been copied. `main`, TSO 2.0, and production remain untouched.


## NFL Game-Day Weather — October 22, 2026 (TSO 3.0 independent preview)

- Live ESPN 2026 scoreboard games and ESPN stadium metadata (name, city, country and indoor/outdoor designation) now feed a `/api/nfl-weather` route. Outdoor U.S. stadium coordinates are matched by **exact venue name** to open NFL venue-location records; missing match => missing forecast, not an estimated location.
- Open **NOAA/NWS hourly kickoff forecasts** are retrieved by `/points/{lat},{lon}` followed by the verified `forecastHourly` URL at `api.weather.gov`. NWS data is open for commercial use subject to rate limits. Requests are parallelized in small batches with 15-minute forecasts and 12-hour stadium-coordinate caching. Forecast source timestamps, kickoff validity window and unknown fields are retained.
- Current live QA returned 13 upcoming NFL games: **6 outdoor NWS kickoff forecasts**, **6 ESPN-confirmed indoor venues**, and **1 France international game flagged outside NOAA coverage**; zero inaccurate fallback forecasts. An outdoor Nashville kickoff forecast returned 71°F, 0 mph wind, 0% precipitation and Sunny at the time of testing. These are timestamped forecasts, not guaranteed or observed game conditions.
- The NFL Weather Impact page now renders 13 matching game rows, each with official kickoff, verified stadium, roof, kickoff temperature, hourly wind, gusts if supplied, precipitation probability and conditions. Each row opens the verified weather detail, with valid-from/to and forecast issued timestamps. Multi-game matchup checkbox filtering continues to work. No provider forecast means dashes, not fabricated zeros.
- Weather is **loaded lazily only on the NFL weather page**, rather than delaying all other sports or NFL models. Only the 3.0 branch and standalone worker preview were modified; no TSO 2.0, main or production changes.

**Limitations:** NOAA/NWS coverage is U.S.-only. International games remain unavailable, and NWS can return partial/missing gusts. Dynamic/retractable roof schedules are not independently verified; the indoor flag reflects ESPN's venue designation. Weather is not currently a numerical factor in calibrated NFL player simulations, so do not present it as a probability adjustment.


## NFL Coverage Matchups — October 22, 2026

The independent TSO 3.0 preview now has a dedicated, table-first Receiver vs Pass Defense research page under NFL > Coverage Matchups. It uses current ESPN game identities, the 2026 NFL research feed (ESPN rosters and nflverse player logs), team position-group defensive receiving allowances, ESPN injury statuses, current verified ParlayAPI Over lines, and the existing TSO 50K model when the specific market and sportsbook line match.

- Receivers WR/TE/RB are filtered to current scheduled games and 2026 observed logs. Each player is joined to the **actual opposing defense**, by official game and team. WR receiving allowances are opponent-vs-WR group averages, not an individual's cornerback assignment. Group source games are displayed.
- The table includes 2026 L5/L10 sample averages and counts, target share, snap share, opposing group allowed per game, current book Over line, L5 hit rate versus that exact line and the exact-line 50K Over estimate with inline progress bar. One row per player and upcoming game.
- Receiving Yards, Receptions and Targets are switchable markets, with game/position multi-select and sort choices (verified model, L5 form, defense allowed, or target share). Tracking-only stats (shadow CB, man vs zone, route/slot alignments) are **not asserted** without a provider.
- Player details show 2026 receiving statistics, L5/L10 hit rates versus the current line, game-by-game bar chart/log, 2026 opponent allowed receiving to the position group, and opposing DB roster/injury context explicitly labeled as **not a confirmed 1-on-1 assignment**.
- Multiple sportsbooks' odds are compared **only at the same exact line**, never by comparing e.g. Over 55.5 versus Over 65.5 prices. When different alternate lines are present, the prevalent verified line is selected, favoring a matching model line on ties. Strictly requires same game/player/market/line and pregame source eligibility; no missing model values are fabricated.
- Controlled tests passed for the opponent-group join, 2026-only logs, multi-line bookmaker comparison, suppression of mismatched 50K estimates, switching receiving markets, defensive roster labels and persisted filters.
- Cloudflare browser QA after final v5.5 preview deployment rendered **90 first-page player rows**; all 90 shown had current verified receiving-yards Over quotes and exact-line 50K model values as of the snapshot. Live results may fluctuate with odds/model refresh. Multiselect game filters, market controls and sort controls rendered correctly.
- All work is committed to `tso-3.0` branch and bundled to `tso3-preview` worker only. Main, TSO 2.0 and live production untouched.

**Remaining tracking-data gaps:** actual CB/slot/shadow matchup assignments, coverage scheme breakdown (man/zone), routes run, average separation and route participation; avoid displaying inferred values for these.


## NFL model validation — October 22, 2026

Published new `NFL → Model Validation` view and `/api/nfl-validation` endpoint on isolated TSO 3.0 preview, revision `5.6-validation`. Code was committed only to `tso-3.0`; no changes to `main`, TSO 2.0 or production.

**Evidence 1 — First touchdown heuristic (NOT Anytime TD):**
- Read-only source: `main/tso2/data/nfl-first-td-backtest.json` (published Oct 8, 2026). Original historical first-scoring-player heuristic uses nflverse play-by-play, chronologically held-out games.
- 126 held-out NFL games: 94 from 2025 and 32 from 2026. Multiclass Brier: heuristic `0.93111` vs historical baseline `0.95770`. Multiclass log loss: `3.03294` vs `3.65012`.
- The source explicitly has `eligibleForLive=false`, selected player-probability-mass scale `1.0`, `publishCalibratedFirstTd=false`. Do not treat as a live calibration or an anytime TD backtest.

**Evidence 2 — 50K simulation historical replay:**
- Read-only source: `main/docs/nfl-accuracy-validation.json`, scoring game `401872657`.
- Exactly **one scored game**, 3 archived forecast frames across separate phases; earliest archived pregame frame is selected independently of Q3. Pregame observed player counts: passYds n=3 MAE 42.88, rushYds n=9 MAE 14.22, recYds n=17 MAE 13.25, receptions n=17 MAE 1.30. Pregame ATD Brier 0.44661 on **7 correlated player observations within the same single game**. Winner n=1. The replay uses current model with historically archived inputs, *not* the original model version at that moment.
- Missing player fields excluded rather than imputed; pushes excluded. Live-Q3 phase is **not** combined with pregame scoring.

**Displayed validation gates:**
- Current regressed Anytime TD: **UNVALIDATED**. The archival first-TD heuristic is different and the simulation replay does not establish current model calibration.
- Current 50K pregame simulation: **INSUFFICIENT**; only 1 completed game in replay.
- Current exact sportsbook-line Over probabilities: **UNVALIDATED**; no multi-game immutable pre-kickoff forecasts + settled outcomes.
- Historical first-TD heuristic: **EXPERIMENTAL ONLY**, not approved for live calibration.

Frontend features: model-scope tabs, source timestamps, heldout Brier/log loss vs baseline, pregame-only error metrics and interval coverage, small-sample warnings, methodology steps for immutable pregame snapshots and future official final outcomes. Page contains **no invented win rate, ROI, calibrated reliability curve, or cross-model accuracy grade**.

Live Cloudflare Browser Rendering QA: `/api/nfl-validation` returned valid archive data with all four status gates; render at `#/nfl/cheatsheets/model-validation` displayed 126, 0.93111, 0.95770, 4 audit cards and distinct historical pregame stats. Module compilation and Worker deployment HTTP 200 succeeded.

**Open blocker before genuine live calibration:** Durable timestamped/model-versioned snapshots of before-kickoff predictions, exact sportsbook lines, and independently recorded final outcomes across many distinct games. Do not fabricate historic pregame forecasts from current model output or label retrospective replay as out-of-sample live predictions.


## NFL automatic pregame prediction archiving — October 22, 2026

Built an **isolated TSO 3.0-only** Cloudflare D1 append-only pregame prediction archive `tso3-nfl-pregame-archive`. Configured `NFL_ARCHIVE` D1 Worker binding and scheduled Worker trigger `*/30 * * * *`. Schema and operational instructions: `tso3/db/nfl-prediction-archive.sql` and `tso3/NFL_ARCHIVE_SETUP.md`.

Worker runtime captures only official ESPN-verified future games and source-fresh NFL sportsbook Over/ATD quotes when the **published** TSO 50K and/or historical regressed ATD model truly matches game/player/team/market/side/**exact line**. Stores immutable original model and sportsbook timestamps, model iteration counts, original engine version where supplied, SHA-256 source fingerprints, model probability and actual quoted book/price. Old snapshots are never overwritten; source-equal reruns are `INSERT OR IGNORE` no-ops. A separate table is reserved for officially scored final-game outcomes, so the forecast record cannot be retroactively edited.

A real preview-only manual capture test (temporary unpublished route removed immediately) was performed using current pregame verified sources. D1 verification found:
- **786 real snapshots across 13 games**; 442 exact-line 50K Over and 344 50K ATD.
- **0** captured after kickoff, **0** sources time-stamped later than capture, **786 unique IDs**.
- Fresh regressed ATD unavailable at capture time; **0** of that model archived, deliberately.
- The archive currently has **0 settled outcomes**. This is NOT model calibration, win rate or betting ROI.
- The Worker `/api/nfl-archive-status` and NFL Model Validation dashboard show real saved counts, game coverage and latest run status.
- Scheduled Worker cron installed every 30 minutes, but its independent firing must still be checked after an actual cron event. The successful manual capture proves the live storage and source matching, not cron reliability.
- Controlled tests also passed for exact-line mismatch rejection and idempotent duplicate source captures.

No modifications were made to `main`, TSO 2.0 or production. Preserve the D1 binding on every subsequent preview Worker upload.
