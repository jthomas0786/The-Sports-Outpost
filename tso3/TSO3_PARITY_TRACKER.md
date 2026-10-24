# TSO 3.0 — six-sport functional parity & source-integrity tracker

**Updated:** October 23, 2026 (Central), development only.
**Protected:** main, production and TSO 2.0. No changes permitted without explicit owner approval.
**Preview:** https://tso3-preview.jthomas0786-tso.workers.dev/
**Reference:** PropFinder publicly visible product/categories, plus user-opened NFL Cheatsheets browser tab. Design and data are independently TSO-owned, not copied proprietary assets/formulas.

## Current verifiable implementation

| Feature | Implemented in tso-3.0 preview | Restrictions |
|---|---|---|
| Six leagues | NFL, NBA, MLB, NHL, WNBA, CFB | ESPN game-window verification, never claim that a published odds file is a completed market engine |
| UI | Horizontal six-sport navigation, game list, player props, trends, tools, data-source coverage, research drawer | Sport-specific specialized pages remain partly pending |
| Filters | Checkboxes for multiple games, markets and books; L5/L10/L20/season and sort | Historical hit samples shown only if individual game logs exist |
| Football | ESPN identity, ParlayAPI pregame/alternate Over & ATD lines, exact 50K model matching, injuries, 2026 research, NFL validation/archive | No true defensive player coverage/OL grade inferred from a box score; no postgame grades before first archived games finish |
| NFL Cheatsheets | All 19 publicly visible category titles in navigation | Availability is explicitly gated on underlying TSO source; several categories are still research/data integration required |
| NBA | NBA player/history research, first-basket module, current verified odds | NBA generic market-only selections are not branded as exact-line simulation predictions |
| MLB | TSO published ParlayAPI odds, ESPN event checking, markets including HR, Hits, TB, RBI, H+R+RBI, SB and pitcher props | Full pitch-by-pitch, Statcast, pitcher arsenal and park/weather research needs independent source |
| NHL | ParlayAPI goals, shots, assists and points when source-fresh; TSO first-goal/anytime-goal hazard model and position-versus-defense matchup context | Live verified starting goalie and comprehensive shot/expected-goal logs remain incomplete |
| WNBA | TSO published ParlayAPI player prop prices and verified ESPN matchups | No independent depth-chart/usage/opponent position game-log pipeline for all categories |
| CFB | TSO published NCAAF sportsbook props and ESPN schedule matching | Team scheme, conference, power ratings and independent official player game logs not fully integrated |
| Odds | Six-sport published over/yes markets; multi-book exact-line differences and real alternate thresholds | No invented odds, no unsupported inclusive-milestone-to-Over conversions, no sportsbook booking guarantee |
| Provenance | Dedicated Data Sources & Market Coverage page for each sport | Pending feeds correctly marked unverified |
| Branding | Original SVG TSO target emblem, standalone app-icon SVG, hero art, PWA manifest, inline SVG controls, no emoji icons | Raster home-screen icons and native iOS/Android distribution not verified |
| Quality | Dedicated branch-only six-sport regression workflow; source-level tests for NFL archives, quote-age, TD action, NHL and other-book odds, icons and filters | Browser E2E, visual regression, payment/login, cross-device PWA tests still needed |

## NFL 19-category cheatsheet inventory

The user-opened PropFinder NFL Cheatsheets page displayed **All 19** with these category names: TD Matchups, First TD, Role Matchups, Market Grades, Coverage Matchups, Alignment Matchups, WR vs CB Matchups, Rushing Matchups, Redzone Matchups, Line Matchups, Hit Rate Matrix, Team Share %, Team Defensive Stats, Coverage Matrix, Team Tendencies, Coverage Players, Odds Discrepancies, Receiving Value, Explosive Plays.

TSO includes those categories as discovery/navigation; only TSO independently sourced modules may claim **data available**. A named category does **not** imply that its proprietary formula, provider contract or hidden dataset is available.

## Source admission policy

- Every TSO-owned ParlayAPI sportsbook quote must match a currently pregame ESPN event and bookmaker/original quote timestamp within the sport's kickoff-dependent freshness cap, with a verified American price and literal line.
- Withdrawn/preserved historic rows, invalid provider quotes, inclusive milestone lines disguised as strict Overs, post-kickoff props, sample/unverified snapshots and unmatched events are excluded.
- NFL Monte Carlo model probabilities only join a row on exact game/player/team/market/side/line and source-fresh pregame simulation; NHL goal hazard probabilities only join same game/player/0.5 scorer market and fresh published model.
- Historical hit rate, sportsbook-implied probability and model probability are three different concepts. No model is awarded an accuracy grade without real, source-audited postgame outcomes.
- Different sportsbook quotes on the same selection are correlated, not independent player forecast successes.

## What still blocks 100% functional parity

1. Full independent 2026/27 player histories, position and team defensive opportunity data, lineup/availability, and sport-specific historical matchup engines for all six leagues.
2. Each of the 19 NFL cheatsheets (and complete authenticated feature inventory for five other sports) must have actual statistically backed interactive implementation, not just a menu card.
3. Reliability of the upstream sportsbook publisher workflow on main; Draft PR #42 is still unmerged. Preview cannot force paid provider refresh or edit protected main.
4. Responsive/browser interaction tests, app install/raster icon tests, QA on accessible labels and keyboard controls; separately implemented user auth, mobile-native stores and sharing where required.
5. 2026 NFL real postgame outcomes start with the October 25 archived slate; sportsbook DNP/action and Anytime TD all-type scoring evidence require real completed-game audits before accuracy/ROI claims.
6. Third-party licensed datasets and proprietary formulas unavailable in TSO cannot be silently copied. Functional similarity must be built from verified independent sources.

## QA and deployment isolation

Development branch: `tso-3.0`; Cloudflare Worker: `tso3-preview`; independent D1: `tso3-nfl-pregame-archive` (`b976a673-0fe5-4440-84c7-15b0475758ba`).

Dedicated workflow: `.github/workflows/tso3-six-sport-qa.yml` on pushes to `tso-3.0`, Node 20, no provider requests; checks JavaScript syntax and `node --test tso3/tests/*.test.mjs`. GitHub Actions remote job success is **not claimed** until a run has been inspected.

Bundled original assets: 9 previous UI files + 4 new SVG/PWA files = 13. Cloudflare cron remains `*/30 * * * *` and binding `NFL_ARCHIVE` remains isolated. **Never deploy this branch to production without explicit approval.**

## Development continuation and production gate (October 23–24, 2026)

**Latest isolated Worker build:** `4d18a93a-b701-4475-aa9a-d406383c56a5`, deployed to `tso3-preview` at 100% on October 24 UTC. **NOT LIVE PRODUCTION.** All 13 bundled assets, isolated `NFL_ARCHIVE` D1 binding and `*/30 * * * *` cron retained.

Changes added after original parity tracker:

- Cross-sport ESPN athlete depth: on-demand `/api/athlete-depth` reads recorded athlete gamelogs and season stats for an explicitly identified numeric ESPN player; joins per-category statistic arrays to the original dated game/opponent metadata, handles absent/future data conservatively. Display includes selectable historical stat, original individual game values, L5/L10/L20 observed averages, season stat groups and provenance. In-house synthetic checks passed **8 of 8**.
- Roster identity: `/api/athlete-identity` resolves missing ESPN IDs only when an exact normalized full player name occurs **once** across both teams' successfully loaded ESPN rosters for the verified upcoming fixture. A missing roster, ambiguity, ended event, or no exact match returns unavailable; no name guessing. Client caches an identity for at most 15 minutes. Synthetic checks passed **6 of 6**.
- 6-sport research-first layout: enlarged hero shown on overview only; route-derived toolbar visibility no longer inherits a hidden state from the previously selected page, preserving matchup/market/book filtering between sections.
- In goal-scorer history, an ordinary goals log is not mislabeled first-goal hit frequency; rushing-only or receiving-only TD records are not mislabeled a fully reconciled anytime TD hit.

Observed **browser** QA: October 24 UTC, TSO 3.0 NHL/NFL overview/cheatsheet shell rendered original SVG branding, menu and checkboxes. MLB Props rendered a current official ESPN five-game board including Tampa Bay–Milwaukee but **zero verified pregame sportsbook selections**, so MLB price coverage is **NOT VERIFIED** and cannot be marked complete. The MLB source can expire even while the ESPN schedule is current. Additional full browser QA was throttled by Cloudflare Browser Rendering HTTP 429.

Latest **D1** audit: 9,410 immutable NFL predictions across 13 archived games, zero invalid timestamps, zero real settled outcomes. At 2026-10-24T03:00:44Z the **nfl_feed_checks** monitor recorded `status='fresh'` but only **1/13** upcoming archived games had age-verified quote coverage (112 eligible selections). The new slate-readiness UI is required to distinguish one-game source freshness from all-game coverage. This is a release blocker, not a production pass.

**Production requires affirmative evidence, not just route existence:**

1. For **every supported sport**, official fixture availability and real sportsbook market coverage audited throughout the league's active slate; empty markets properly excluded and documented offseason. All alternate lines, multi-book prices, game-level filters, and sample sizes tested in a browser at desktop/mobile widths.
2. For every publicly listed sport/category, a fully implemented statistics engine with provider or independently calculated evidence, current-roster validation, statistical methodology, data lineage, source age, and missing-data behavior. No cards claiming advanced DvP, player coverage, Statcast, shift-level NHL, or calibrated ratings if only the schedule/odds are supplied.
3. NFL pregame archive and postgame audit require complete ESPN scoring and sportsbook action/DNP evidence before calibrating; verify every independent 30-minute run, not just code presence. Odds source must cover the expected archived games (e.g., 13/13 for the current NFL slate, not 1/13).
4. Browser E2E across all six sports: navigation, props, trends, matchup selectors, multi-market/book checkboxes, history drawer, line comparison, source pages, chart switching, full-site mobile/responsive behavior, PWA installation, and image icons.
5. Source-backed performance/latency/load test and external-provider budget audits, live error telemetry, rollback plan, domain/SSL/auth preservation, production secrets and billing isolation, and owner release acceptance.
6. No copying PropFinder's proprietary database, source code, brand imagery or closed algorithms. Reimplement functional research experiences using original TSO calculations and legally accessible data.

**Go-live status as of this update:** BLOCKED. The user's new authorization permits a release **when the platform genuinely passes these checks**, not a premature migration from 2.0 production. Do not modify `main` or redirect the domain merely to make the release checkbox appear complete.

## ESPN data connection milestone — October 24, 2026 UTC

**Deployed in isolated TSO3 preview, not production.** Release version `8d0d86ab-d08e-446b-b25c-afc4bc95c532` at **100% preview traffic**; 13 web assets, separate D1 archive, and `*/30 * * * *` cron preserved.

### Real roster / game metadata, all six leagues

- `/api/game-roster?league={league}&gameId={ESPN_ID}` retrieves the **exact ESPN event**, then two current official team roster feeds, all tied to numeric ESPN identities and two real teams. A missed dated scoreboard event can be re-verified by `summary?event={exact ID}`; summary data must confirm the same event ID and official team IDs.
- Games page now shows away on the left/home on the right, source-backed roster membership, positions and clickable player season-history drawer **even when odds are 0**. Roster membership is *not* a verified starter/lineup/injury certification.
- Browser tested official MLB World Series matchup **401908042**: 26 rostered Tampa Bay players plus 26 Milwaukee players; exact ESPN scoreboard ID, recent completed game. Prior API failure was resolved by the combined event verification path. No wagers or fake prices were introduced.

### NHL model and independently observed data

- TSO's published `slates/nhl-research.json` (NHL historical research v4) was audited: **936 athletes**, **32 team defensive profiles**, up to **30 actual player game summaries**, current NHL season code `2027`, prior season `2026`, source generated at `2026-10-24T01:36:41.746Z`.
- `/api/nhl-player-research?gameId={ESPN_ID}&playerId={ESPN_ATHLETE_ID}` validates exact team-roster membership, game identity and fresh research. Returns source-backed skater/game results plus position and venue defensive allowances. Browser verified **Anton Frondell** (`5291935`), Chicago vs Montreal NHL game `401892564`: **22 real individual NHL games**, Montreal's **30-game** defensive profile and a real positional allowance rank.
- `/api/nhl-defense` returns observed game-averaged goals/shots allowed overall, recent 10, and **C/LW/RW/D** splits and source-ranked allowances for all 32 NHL defenses. Browser verified `available=true`, 32 teams, 936 researched players, and FLA center goal-allowance rank **11 of 32** over 30 games.
- The preview NHL **Defense Vs Position** screen was tested in a real browser at desktop size: **33 HTML table rows** (header plus all 32 team rows), visible position selector, and Florida defensive profile. **Team Statistics**, **Shots on Goal**, and **Goal Scorer Matchups** share this documented defensive source. They are observed statistics, not TSO model probabilities.
- Regression: `tso3/tests/game-rosters.test.mjs`, `tso3/tests/nhl-research-depth.test.mjs`, `tso3/tests/nhl-defense-matrix.test.mjs`. Manual evaluations additionally tested missing/mismatched athlete ID, ESPN summary fallback, roster failures, 30-game history bounds and stale source quarantine.

### Open release blockers

The existing MLB, NFL, WNBA and college-football sportsbook publishers remain subject to timestamp freshness; a valid ESPN schedule or roster does **not** mean valid bookmaker odds exist. More importantly, other sports still need equivalent full historical player-log depth, matchup defense metrics, lineups, roles, position and advanced/statcast coverage; no TSO3 production cutover until those modules, publisher freshness, browser QA and sportsbook settlement validation pass.

NHL research is built from an approximately **17.7 MB** published source. The isolated preview performs time-bounded caching and returns compact individual/matrix responses. Load/latency testing across multiple concurrent users remains an acceptance test before production.

## Full six-sport Player Dashboard milestone — October 23–24, 2026

**Product acceptance requirement:** match the reference product's **complete player research workflow**, not merely its sport navigation, prop rows or a small expandable drawer. PropFinder publicly describes history charts, full game logs, L5/L10/L20 hit rates, home/away/opponent splits, advanced/season statistics, matchup and injury analysis, live multi-book odds, alternate lines and line-movement research. TSO must independently implement equivalent functionality from lawfully accessible verified data, rather than copy proprietary grades, designs or databases.

**Implemented and deployed to TSO 3.0 isolated preview:**
- All six sports have a dedicated **Player Dashboard** navigation entry. Every ESPN identified athlete can have a shareable `#/SPORT/player/ESPN_ID` page, launched from official game roster rows or exact-match sportsbook research after player identity checks.
- Original TSO research layout, official headshot where ESPN supplies a trusted ESPN CDN URL, athlete team/position/name verified via exact numeric ESPN roster ID; no guessing from a similar player name.
- Five sections: **Overview**, **Game Logs**, **Splits & Trends**, **Odds & Alt Lines**, **Matchup & Advanced**. The rendering module lives in `tso3/player-dashboard.js`, with a responsive card/chart/table system in `styles.css`.
- Live statistical selector, last-five/ten/twenty/season windows, numeric games/average/median/high-low, recorded hit rate and streak **only for a verified actual line/statistic**, bar chart showing literal game results, selectable known home/away and opponent splits, row-by-row full game logs, and independent ESPN full-season split categories.
- Active real sportsbook prices compared across source-verified book, player, market, side and **exact line**, including actual alternate thresholds. No invented line movement or bookmaker availability. Exact TSO model projection is separately labeled and only shown with exact-match evidence.
- Player statistics are sourced from `/api/athlete-depth`. **Important verified connectivity fix:** Cloudflare Worker requests to `site.web.api.espn.com` returned HTTP 403; official ESPN common/v3 endpoints on **`site.api.espn.com` returned HTTP 200**, so the production-safe data reader now uses the latter. A temporary source-probe endpoint was removed after the verification.
- Three upstream official feeds: ESPN **gamelog**, **stats**, and **splits**. Original metadata and typed statistic values are preserved; missing data stays unknown, no fabricated zeros. ESPN roster fallback supplies name/team/headshot for direct athlete links without an `athlete` identity object in the gamelog response.

**Observed end-to-end proof in isolated preview:** `/api/athlete-depth?league=mlb&playerId=40884&season=2026` returned **Bryan Baker, TB, RP**, with official ESPN roster identity, trusted headshot, **42 real 2026 MLB gamelog records**, **4 season-stat categories**, **12 official season split categories** and `providerChecks` = `HTTP_200` for all three. A real browser rendered the five dashboard tabs, observed-game KPIs, bar chart and official 2026 season. The deep-link numeric-ID parsing bug was caught and corrected in a version-checked preview hotfix. Latest verified preview Worker version: `342be407-e63b-4c18-9458-8f6754ea810c` at 100% preview traffic, 14 bundled assets, D1 binding and 30-minute cron preserved.

**Testing:** 14 synthetic dashboard/split tests and 4 exact roster profile tests passed. JavaScript Worker/frontend/module syntax checks passed. Full GitHub Actions run conclusions have **not** been verified because the connector does not expose the required workflow-runs API. Synthetic tests are not a substitute for six-sport real-athlete browser QA.

**Still NOT full parity:** each remaining sport (NFL, NBA, NHL, WNBA, college football) needs recorded real player-profile E2E checks; specialized advanced player statistics, injury/availability evidence, MLB pitch-level Statcast/exit-velocity filters, NHL expected-goal/shifts/goalie confirmations, NFL receiver coverage/role usage, complete defense-vs-position matchup engines, verifiable line-movement archives and reliable all-slate sportsbook freshness remain incomplete. Do not assert 100%, claim calibration or deploy this branch to production.

**Important upstream blocker still active:** the isolated D1 monitor last checked at `2026-10-24T04:00:44Z` and recorded sportsbook source `stale`, `0` age-verified NFL games and `0` eligible quote rows. Archive integrity remains 9,410 immutable predictions across 13 games, with zero invalid original timestamps and no real postgame outcomes. **Production release remains blocked** until odds publishing and the above missing sport research engines are verified.
 
## Six-sport live player-data validation and advanced-stat source integrity — October 23–24, 2026

**All six TSO 3.0 full-player dashboard leagues were verified against real named athletes and ESPN's three public official sources.** These are individual player-source smoke tests, **not** proof of all-league every-player coverage:

| League | Named athlete / ESPN ID | ESPN season | Recorded games | Season-stat groups | Official split groups | Gamelog/Stats/Splits |
|---|---|---|---:|---:|---:|---|
| NFL | Patrick Mahomes / 3139477 | 2026 | 5 | 5 | 16 | All HTTP 200 |
| NBA | Jayson Tatum / 4065648 | 2026–27 (ESPN 2027) | 4 | 3 | 6 | All HTTP 200 |
| MLB | Bryan Baker / 40884 | 2026 | 42 | 4 | 12 | All HTTP 200 |
| NHL | Connor McDavid / 3895074 | 2026–27 (ESPN 2027) | 10 | 1 | 7 | All HTTP 200 |
| WNBA | Caitlin Clark / 4433403 | 2026 | 42 | 3 | 3 | All HTTP 200 |
| College football | Arch Manning / 4870906 | 2026 | 6 | 4 | 1 | All HTTP 200 |

**Player model implementation added and preview-deployed:**

- ESPN publishes combined made/attempted values, e.g. NBA **FG 14–26** or **3PT 3–10**. TSO now preserves the literal source observation while extracting numeric component fields (14 made, 26 attempted; 3 made, 10 attempted), only when the provider-supplied compound field name and numeric components align.
- Derived historical NBA/WNBA P+R+A, P+R, P+A and R+A, MLB H+R+RBI, and NFL combined passing/rushing yards are calculated **only** if every contributing stat is a verified numeric observation in the **same ESPN game**; no missing input is treated as zero. Official `totalRebounds`, `RBI` and related source aliases are handled explicitly.
- Full dashboard source windows now distinguish regular season, postseason and all recorded games. Unknown-season games are not silently assigned to regular or postseason L5/L10/L20. Separately published ESPN season splits retain their own period semantics.
- A prop selection that opens the full dashboard selects the matching observed statistic and literal line when a verified identity, market and threshold match exists.
- NHL's existing **TSO v4 verified opponent-defense dataset** is now wired into the full dashboard **Matchup & Advanced** panel for an official current matchup/athlete pairing: opponent goals and shots allowed/game, recent defensive form and position-specific allowance and ranking where present. It is strictly time-gated (source age no more than 36h); a stale or missing snapshot remains unavailable. This new matchup panel passed 4 synthetic checks; a complete named live player/opponent E2E render has not yet been established.
- **Critical MLB scope protection:** ESPN MLB pitcher game logs may label *hits allowed* simply as `hits` and *runs allowed* as `runs`. The Worker now reads the ESPN `filters.category` field and scopes batting and pitching separately in game logs, season aggregates, and split categories. On official pitching logs, the fields become `hitsAllowed`, `runsAllowed` with the unchanged original ESPN field preserved; the app will not classify these as batter hits, runs, or H+R+RBI. If the source category is missing, ambiguous fields remain unverified. Live verified on Bryan Baker / 40884: scope `pitching`, 42 records, original hit/runs fields present as allowed, **no falsely derived H+R+RBI**.
- Synthetic checks for source components, phase separation, NHL matchup safety, and MLB scope isolation were run on source code; 22/22 previous combined-stat/player checks, 4/4 NHL matchup checks, and 28/28 later combined-regression checks passed. These checks are not presented as official completed browser E2E for all sport-specific markets.
- Latest preview release: Cloudflare Worker `1d67c0e4-213f-4c6f-b84f-f8fcd8d796ca`, 100% of **tso3-preview** traffic, 14 bundled assets; independent `NFL_ARCHIVE` D1 binding and 30-minute cron preserved. **Main, TSO2 staging and production remain unchanged.**

**Still blocking 100% / production:**

1. NFL source monitor checked `2026-10-24T04:30:44.791Z`: `status=stale`, 0 verified active games, 0 eligible bookmaker selections; recurring capture `no_fresh_sources`, reason: "Odds source older than kickoff-specific freshness caps." Archive still **9,410** immutable pregame predictions on 13 games, zero invalid timestamps and zero postgame outcome grades. This is a publisher freshness issue, not resolved by ESPN player-stat connectivity.
2. Comprehensive coverage validation by position/market/player for every sport, every ESPN source category, all current rosters and active fixtures; athlete names, source events and advanced splits need continued game-by-game audits.
3. Proprietary-reference functional equivalents still missing independent advanced verified sources: MLB Statcast/pitch arsenals and park/weather, NFL cornerback/coverage and target-share analyses, NBA on/off and possession-based analytics, WNBA and college-football defensive-role research, real historical sportsbook line-movement snapshots, official active starters, and complete injury availability.
4. Final mobile/tablet real-browser visual QA, PWA install tests, production user auth/payments preservation, source-budget/reliability and rollback verification. Do **not** overwrite production merely because all six sample player histories connect.


## Real six-league ESPN player connection & multi-season dashboard — October 24, 2026

All six athlete-history data connections returned populated **official ESPN** player observations via the isolated `tso3-preview` Worker and the official `site.api.espn.com/apis/common/v3` endpoint. These are point-in-time sample checks, **not** full roster/market acceptance:

| League | ESPN athlete example | Selected season | Actual recorded game logs | ESPN season stat categories | Official split categories | ESPN gamelog / stats / splits status |
|---|---|---:|---:|---:|---:|---|
| NFL | Patrick Mahomes (3139477) | 2026 | 5 | 5 | 16 | HTTP 200 / 200 / 200 |
| NBA | Jayson Tatum (4065648) | 2027 (2026–27) | 4 | 3 | 6 | HTTP 200 / 200 / 200 |
| MLB | Bryan Baker (40884) | 2026 | 42 | 4 | 12 | HTTP 200 / 200 / 200 |
| NHL | Connor McDavid (3895074) | 2027 (2026–27) | 10 | 1 | 7 | HTTP 200 / 200 / 200 |
| WNBA | Caitlin Clark (4433403) | 2026 | 42 | 3 | 3 | HTTP 200 / 200 / 200 |
| CFB | Arch Manning (4870906) | 2026 | 6 | 4 | 1 | HTTP 200 / 200 / 200 |

The player dashboard now supports previous seasons (three seasons shown, explicitly year-labelled), isolated per-sport/athlete/season source-cache keys, historical-window disclaimers and season-sensitive category filters. NBA Jayson Tatum 2026 (2025–26) was directly verified with **22 games / 3 stat categories / 6 splits**, all three HTTP 200. This is especially useful when the current season has a small sample. Multi-season behavior passed 5/5 dedicated deterministic regression checks. `tso3-preview` Cloudflare deployment: `ff5b6c6f-2d97-41e0-a053-abcbbe62ea8b` (100% preview traffic), 14 assets preserved, correct independent NFL D1 binding and `*/30 * * * *` cron intact.

Combined-stat enrichment also deployed after regression: ESPN's original paired made-attempt values are preserved, literal made and attempted fields extracted only with validated source naming and both numbers present. TSO NBA PRA, P+R, P+A and MLB H+R+RBI are calculated only when **all component categories are separately recorded for the same ESPN completed game**; missing components never become zero. These are observed record calculations and cannot substitute for the proprietary independent model probability. Seven dedicated composite regression tests passed.

**Current sportsbook data (not parity-complete):** An October 24 06:32:56Z published WNBA snapshot returned **40 verified current Over/Yes selections** in TSO 3.0 after examining 161 original source quotes; 120 were rejected by quote freshness and 1 invalid price. This proves the sportsbook verification can populate a real game without weakening its freshness checks. NHL/MLB/CFB exact current quote coverage and all-slate coverage still need repeated live checks; Cloudflare Browser Rendering can return HTTP 429 and is **not evidence** of missing sportsbook quotes. Official season data, rosters, verified book prices, and model forecasts each remain separately identified.

**Production status remains BLOCKED:** parity requires the advanced matchup/player-role/weather/coverage/Statcast data pipelines, all-slate verified sportsbook depth and confirmed browser/mobile end-to-end releases across six leagues, not merely six sample athlete connections. Do not modify `main` or production until release acceptance is actually verified.

## NFL cheatsheet data wiring repair — October 24, 2026 (development branch only)

**Observed UI issue:** NFL > Cheatsheets > TD Matchups displayed a generic "Research Source Status / Data connection still needed" placeholder even though an independent NFL Touchdown Opportunities research table already existed. The category catalog did not map its public label to the underlying module.

**Changes committed on `tso-3.0`:**

- Route `#/nfl/cheatsheets/td-matchups` to TSO's existing `touchdown-opportunities` view. The source-backed page supports scheduled matchup/position filters, TSO regressed ATD model when fresh, separately labeled 50K simulated ATD/2+ TD, 2025 red-zone baseline, 2026 observed NFL usage and currently verified sportsbook ATD quotes.
- Route existing `redzone-matchups` to TSO red-zone usage and `team-defensive-stats` to the team/position defensive allowance view. Explicitly disclose their limitations rather than presenting them as new feeds.
- Add 2026 opponent **position-group TD allowed per game** and underlying **defensive game sample count** to touchdown research. The data is drawn from the same-season opponent-position index used by Defense vs Position; require at least 3 observed games; reject conflicting group data; never infer individual man/zone, CB alignment, or inside-20 2026 data. Null and unverified group values remain blank.
- Added `tso3/tests/nfl-td-cheatsheet.test.mjs` covering route mapping, research availability guards, verified defensive group/sample gate and explicit missing-data copy.

**Checks performed:** the newly committed `app.js` and `nfl-lab.js` parsed successfully in a JavaScript compiler; three scoped regression assertions passed in isolated execution. The GitHub Actions workflow is configured to run `node --check` and `node --test tso3/tests/*.test.mjs` on the branch, but **its remote result has not been verified**. All evidence is branch-level, not full-browser integration.

**Deployment:** GitHub commits are **not** Cloudflare deployments. Cloudflare's currently observed active isolated preview deployment was Worker version `ff5b6c6f-2d97-41e0-a053-abcbbe62ea8b` (uploaded earlier October 24 UTC). Its bundle has not been confirmed to contain this route fix. The updated screens **must not** be represented as live preview until the complete 14-asset bundle is safely redeployed and verified, retaining the separate D1 binding and cron. Main/production was not changed.

**Outstanding source requirement:** true receiver alignment/CB-specific coverage, current-season inside-20 play events, fresh all-slate ATD quotes, reconciled injury and lineup status, and model calibration remain open. No claims of PropFinder feature-equivalence or 100% production readiness.

### Follow-up deployment evidence — October 24, 2026 at 16:11 UTC

The previous section accurately described the branch-only state **before** this follow-up. The complete checked-in `tso3/preview-worker.js` plus **all 14** current `tso3` UI assets (including both repaired JS files) were then assembled into a single immutable preview bundle; `app.js`, `nfl-lab.js`, and the bundled Worker script all passed parse checks.

- Cloudflare new Worker **version 83**: `e41b6d58-ce50-4058-8880-1bc50c42dedd`.
- Cloudflare deployment: `abe0c7d0-dd28-4b58-9d8a-66591c0f77bf`; independently read back as **100%** `tso3-preview` traffic.
- Worker handlers independently read back: `fetch` and `scheduled`.
- Independent D1 `NFL_ARCHIVE` binding independently read back as `b976a673-0fe5-4440-84c7-15b0475758ba`.
- Existing Worker cron independently read back as `*/30 * * * *`, unchanged since October 23.
- The modified app route, source data table and source disclosures are bundled, not raw-branch fallbacks.
- This verification covers deployment/configuration, **not** actual end-user browser interactivity or data availability in every upcoming matchup. Cloudflare Browser Rendering was not completed for the repaired route; the manual TD Matchups browser acceptance check remains outstanding.
- Protected production/main and TSO 2.0 remain untouched. All league-wide sportsbook freshness and advanced coverage-feed requirements remain blockers to production.

## NFL TD Matchups missing-field explanations & control repair — October 24, 2026, 17:28 UTC

**Reported by owner:** TD Matchups showed stale regressed TD model and many blank cells; the checkbox for `Disagreements ≥12 pp` was rendered as an oversized square.

**Source-trace:** The TSO regressed TD snapshot in the owner-visible table was generated October 20 and rejected by the Worker's 72-hour model freshness gate; the separately fresh 50K simulation correctly remained usable. The 2026 snap/target fields depend on partial `nfl-research.json` player coverage. The opponent TD-allowed fields depend on present, consistent 2026 defense/position observations with at least three defensive games. The general NFL sportsbook feed's fresh timestamp does **not** imply qualifying same-player/same-team/0.5 Yes anytime-TD prices.

**Fixes pushed only to isolated `tso-3.0`:**

- CSS checkbox sizing explicitly overrides generic input width, minimum dimensions and padding, with accessible square 16px checkbox. Corrected disabled visual state.
- When the regressed ATD model expires, auto-select **50K ATD** sort instead of silently sorting by a fallback under a falsely highlighted `TSO ATD` button; disable model-gap comparisons and `≥12 pp` filter until fresh model is available.
- Show live **field coverage counts** for selected player rows: L5 offensive snaps, current target share, defense TD group, and matched ATD prices. When there are zero source-verified current slate ATD sportsbook offers, show an explanatory warning; do not invent bookmaker prices.
- Tightened book-quote join to exact official NFL game, normalized **player AND team**, `atd` market, `yes` side and `0.5` line.
- Five focused test cases passed isolated checks; checked bundled source parses. No unsupported player stat values introduced.

**Cloudflare isolated preview deployment:** Worker version **84** `4a7991f5-97a4-4c11-b11b-fd16e85ab7f9`, deployment `16154029-3a67-4713-bee5-a739f3695f7a`, read back at **100% preview traffic**. All 14 UI assets bundled. Original D1 `NFL_ARCHIVE` `b976a673-0fe5-4440-84c7-15b0475758ba` and `*/30 * * * *` cron independently confirmed unchanged. Main and production untouched. GitHub Actions and live browser interaction not independently verified.

**Still unresolved:** Upstream TSO regressed ATD publisher needs a **fresh, validated** new run; historical NFL snap/target coverage, position defense records and genuine ParlayAPI ATD quotes must expand. Do not relax age limits or impute missing numbers merely to fill the table.

## NFL ATD source freshness restored — October 24, 2026, 17:42 UTC

**Root-cause repair is deployed to the SHARED source publisher on `main` (not a TSO 3.0 frontend deployment):**
- Reviewed scheduling fix from [PR #43](https://github.com/jthomas0786/The-Sports-Outpost/pull/43), squash merge `e49497416b044bb23132b9fc974391a98b08e87a`. Introduces Thursday/Saturday/Sunday/Monday ATD rebuilds to prevent the Tuesday-generated source from exceeding TSO 3.0's 72-hour TTL before Sunday; retains Tuesday rollover and Sunday injury refresh.
- New integrity gates prevent publishing if `generatedAt` is not newly generated, current roster falls back to 2025, current injury feed cannot be verified, or model player probabilities/grades are malformed.
- [GitHub Actions run 40117277422](https://github.com/jthomas0786/The-Sports-Outpost/actions/runs/40117277422) triggered automatically from the merge; completed **success**. Job logs: model rebuilt 14 weekly fixtures, 703 players graded; 2026 roster source loaded; ESPN injury feed returned 800 entries; weekly slate and synchronized research pushed on first attempt.
- Published `main/slates/nfl.json` independently read back by SHA `56c616ec6f1faba8c3e3438747704c81dbb823db`: `generatedAt=2026-10-24T17:42:24.998Z`, 14 total games, 703 scored players, 2026 roster/depth source, injury source `ok=true`.
- **Independent deployed Worker/browser verification** via Cloudflare Browser Rendering on the existing isolated preview: `/api/nfl-touchdowns` responded HTTP 200 with `modelFresh=true`, matching the new timestamp and actual probabilities/grades. Browser rendering of `#/nfl/cheatsheets/td-matchups` displayed **13 upcoming games**, source timestamp Oct 24 12:42 PM CT, and both TSO ATD percentages and grades; no expired warning; 90 rendered player rows; live data coverage panel visible.
- This was a **shared prediction-data publication on `main`**; no new TSO 3.0 frontend deploy to production. The previous isolated preview Worker version 84 was reused and automatically consumed the new source.
- **Data quality limitation:** 2025 touchdown-rate and red-zone production baseline remains; current NFL injury source categorizes 388 players as `unconfirmed` (alongside 255 active, 42 out, and 18 questionable) in the published slate. The refreshed model is not proven calibrated for 2026; no claim of accuracy improvement. Next phase is an independently validated 2026 performance/role upgrade plus immutable archive-backed settlement and calibration. Do not remove TTL validation.
