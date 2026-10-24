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
