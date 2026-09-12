# NHL foundation — v90.0

The NHL view now has a slate, live play-by-play and box score, Goal Feed, player-market browsing, and Hockey Command Center. The adapter reads ESPN scoreboard, summary and roster responses. The default scoreboard can return the next scheduled slate; the UI displays that slate's actual date and marks preseason games.

The scheduled writer owns only `slates/nhl.json`. Browser refreshes use the same normalizer and hide threat alerts after two minutes without fresh game data. Goal attribution uses the `scorer` participant ID. Shootout events are excluded; a shootout winner's official team score can therefore differ from the count of player goals.

Player markets: anytime goal, shots on goal, points, assists, blocked shots, and goalie saves. This release displays reported game stats and roster availability. **Season projections and sportsbook prices are pending**, not fabricated or borrowed from NFL. Roster membership is not confirmation of tonight's lineup or starting goalie.

`sim.js` is a tested, regulation-only simulation foundation. Shots and goals share worlds; assists attach to teammates' goals, and opposing goalie saves equal new shots on goal minus new goals. Current box-score totals are preserved, inactive skaters receive no future volume, and unconfirmed goalies receive no assumed future workload. The module requires explicit season priors. It defaults to 15,000 live worlds and 50,000 pregame/intermission worlds. Its results are deliberately not exposed as full-game sportsbook probabilities.

Next integrations: verified season and recent-game priors, confirmed lines/power-play units and starting goalies, overtime/empty-net rules, sportsbook markets and settlement rules, then calibrated full-game probability/edge UI and goal push notifications. NHL is not yet at feature parity with NFL.

Run `node scripts/nhl-selftest.mjs`. Use `tests/nhl-mobile.html` for phone/tablet viewport checks against the deployed app.

## v90.1

Duplicate page-navigation strips have been removed; sidebar navigation remains. Market and game selectors remain in their pages. `nhl-research.mjs` collects last-completed-season ESPN statistics by explicit field name (not ambiguous labels). Histories are cached for one day, retain their season and sample size, and follow player IDs across team changes. Baselines are labeled historical averages rather than confirmed game projections.

`nhl-odds.mjs` uses the existing server-side ParlayAPI key, free event discovery, and a throttled sportsbook-only props request within 24 hours of a game. Quotes require a unique home/away/time matchup and roster-name match. Stale or ambiguous quotes are hidden. Source reference: https://parlay-api.com/docs.

`full-game.js` adds first-goal-wins overtime to the correlated regulation worlds. Regular-season overtime lasts five minutes; playoff overtime continues in 20-minute periods. Shootouts add no player goals, shots, assists, points or saves. The three-on-three shot-rate multiplier is an initial model assumption requiring calibration. Current goalie confirmation is required; preseason output is withheld because split-squad lineups and exhibition formats are not verified. Reference: https://www.nhl.com/kraken/news/nhl-overtime-shootouts-row-310366008.

The UI displays full-game forecasts only when the simulation matches the live score, clock and box score and is at most two minutes old. Full-game edge calculations, recent-game weighting, empty-net strategy and calibrated performance remain future work.
