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
