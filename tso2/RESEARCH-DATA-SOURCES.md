# TSO 2.0 Research — verified data inventory

The Research UI is **game cards → selected game → video-inspired columns**.
This file documents the meaning and source of each metric. A dash must
**never** be replaced by invented values, a nearby sportsbook market, or the
original video's proprietary estimates.

## NFL TD Lab source coverage

| Column | Actual TSO definition | Source / present status |
| --- | --- | --- |
| Player subtitle | Verified position and depth rank, e.g. RB1 - DAL | Under player name in the same cell; the separate Role column is removed across every sport |
| ANYTIME % | Exact modeled anytime TD probability | Existing validated prop model matched to selection and game; dash when unavailable |
| FIRST % | TSO two-stage model of player scoring the first offensive game TD | Experimental and uncalibrated; marked EST. and prefixed ~; exact validated market model always takes priority when present |
| 2025 1ST | Games with first touchdown scored / previous-season games played | New nflverse PBP first-TD event attribution + existing season games (e.g. 3/16). Excludes postseason, doesn't invent defensive/ST player credit |
| 2025 TDs | Season rushing plus receiving TD total | nflverse 2025 player-season snapshot |
| 2026 TDs | This-season rushing plus receiving TD total | nflverse 2026 player-season snapshot |
| FORM | Recent TDs/game minus season TDs/game, or verified explicit model form | Existing NFL recent and season stats. Unit is TDs/game delta; not an opaque score |
| YIELD | Red-zone TDs / red-zone carries+targets (%) | New nflverse play-by-play TSO calculation; NOT the reference app's proprietary yield |
| GL % | Player carries+targets at/inside opponent 5 / team equivalents (%) | New nflverse 2026 PBP |
| CARRY % | Player rush attempts / team rush attempts (%) | New nflverse 2026 PBP |
| TGT % | Verified target share (%) | Existing nflverse player-season target share |
| RZ % | Player carries+targets at/inside opponent 20 / team equivalents (%) | New nflverse 2026 PBP |
| TSO PURITY | Original TSO opportunity-quality index, 0–100 | Experimental 2026 usage/TD conversion composite; NOT probability, hit rate, or the reference site's proprietary score |

**2025 1ST** is historical first-TD hit count, not a model probability.
**YIELD, GL %, CARRY %, RZ %** are independently defined TSO ratios; their
values will not necessarily match the reference video. They are computed
using regular-season PBP, matched through GSIS player IDs. For traded players
with multiple teams in the same season, team-share ratios are suppressed
rather than combining mismatched team denominators.

## How the new models work (NFL only)

### First touchdown forecast — experimental, not calibrated

The new TSO v0.1 first-touchdown model uses two linked questions:
which offense scores the first touchdown, and which verified player
on that team is credited with it? Defensive scores, special teams and
no-touchdown games retain a portion of the total probability.

**Team portion.** Calculate each team's first-offensive-TD rate from
2026 game counts plus 60% of 2025 game counts, with a half-success
and half-failure Bayesian smoothing prior. Normalize the two teams'
rates, and scale them by the observed league share of first TD events
that were offensive rushing or receiving TDs.

**Player portion.** Score verified GSIS-identified players on that team:

    W = 0.015 + 0.75 * 2026FirstTDCount
        + 0.35 * 2025FirstTDCount
        + 2.50 * currentRedZoneOpportunityShare
        + 1.50 * currentGoalLineOpportunityShare
        + 0.45 * currentTotalOpportunityShare

The shares in this expression are fractions from 0 to 1, not
percentages. Divide the player's weight by the sum of all eligible
current-season player weights **plus 0.8** reserved for other players;
multiply by that team's first-offensive-TD portion. Cap the resulting
estimate at the existing modeled anytime-TD probability, when one
is present. No current-season player data or no reliable GSIS match
means the model displays a dash.

This is an **experimental heuristic** using real source features
and deliberately simple, disclosed weights. The **full player-level
model** has not yet been backtested or probability calibrated.
Estimates are marked EST. and shown with a leading approximation
symbol; they are not sportsbook lines or validated win probabilities.
The FIRST % estimate and TSO Purity are withheld if the source
snapshot is more than ten days old.

### Full player-level first TD historical validation — 2026-10-08

2024 nflverse PBP is the prior for 2025; 2025 is the prior for
early 2026. The next week is evaluated using **completed prior
weeks only**, without looking ahead. Model adjustment is selected
from 2025 weeks 7–12 (85 games) and then scored on **126
unseen games**: 94 from later 2025 and 32 from early 2026.

The actual first-TD player was in the eligible modeled set for
111/126 holdout games; all other outcomes had a separate OTHER class.

| Held-out model | Multiclass log loss | Multiclass Brier |
| --- | ---: | ---: |
| Simplified historical scorer baseline | 3.65012 | 0.95770 |
| TSO opportunity-weighted model | **3.03294** | **0.93111** |
| Scaled-calibration candidate | 3.03294 | 0.93111 |

Lower is better. Calibration selected **scale 1.0** (no change).
The automatic production promotion gate stayed **false**. These
results support additional testing, not a claim of calibrated
probabilities. The evaluation excludes historical pregame
ATD probability caps because reliable historical, timestamped
model data is unavailable.

Report: tso2/data/nfl-first-td-backtest.json.
Source script: tso2/backtest-nfl-first-td.py.
Workflow: .github/workflows/tso2-first-td-backtest.yml.
The live site retains EST. and ~ labels.

### Preliminary 2025-to-2026 holdout: team component only

Using 2025 team offensive-first-touchdown rates to forecast the
first four weeks of 2026 (32 teams, 128 team-game observations),
the simple prior produced a **0.2456 Brier score** versus **0.2495**
from a constant 2025 league-average first-TD team rate (1.55%
relative improvement). This is a small early-season holdout of the
*team propensity component only*. It does not validate the full
two-team normalized model or any player's first-touchdown likelihood.
Player-level temporal backtesting and calibration are still required.

### TSO Purity — experimental opportunity-quality index

TSO Purity is a completely separate 0–100 index:

    S = 0.30 * GLsharePct
        + 0.30 * RZsharePct
        + 0.20 * roleOpportunitySharePct
        + 0.20 * RZtouchdownYieldPct

    Purity = round(S * (0.7 + 0.3 * min(gamesWithOpportunities / 8, 1)))

RB/FB use the share of team rushing attempts for role opportunity;
WR/TE use the share of team targets; other roles use the higher
of those two shares. The sample factor discounts small four-game
samples. Every input must be source-verified, with two or more
2026 games with player opportunities. It is **not a 0–100% chance
of scoring**, and weights still require out-of-sample outcome validation.
NBA, NHL, and MLB now have separate **experimental, market-specific** Purity calculations. Missing verified data or fewer than five matching game logs retain a dash.

## NBA, NHL and MLB Purity v0.1 (experimental)

Every score below is an original TSO **0–100 descriptive index**, not a
probability, calibrated player forecast, or third-party rating. All
formulas use the exact sportsbook **selected line and side**, and
verified game logs returned by the existing sport-specific deep
research feed. Pushes are omitted from recent hit-rate denominators.

**Sample factor for every sport:** 0.65 + 0.35 × (min(validGames,10)/10).
All require five or more exact-market game results, with up to 10
used in scoring. Values remain unavailable if mandatory source
inputs are missing.

### NBA formula

Purity = sampleFactor × (45% last-10 exact-line hit rate
+ 35% production consistency + 20% playing-time index).

Production consistency = 100/(1+stddev(stat)/max(1,mean(stat))).
Playing-time index = min(100,mean(minutes)/36×100).
Requires five verified NBA box-score stats and minute observations.

### NHL formula

Purity = sampleFactor × (45% last-10 exact-line hit rate
+ 35% production consistency + 20% time-on-ice consistency).

Time-on-ice consistency = 100/(1+stddev(TOImin)/max(1,mean(TOImin))).
Requires five verified NHL game stats and five time-on-ice values.

### MLB hitters formula

Purity = sampleFactor × (45% last-10 exact-line hit rate
+ 30% verified Statcast hard-hit % + 25% barrel reference index).

Barrel reference index = min(100,barrelPct/20×100).
The 20% value is a TSO indexing scale, **not an assertion about
the league average**. Requires five verified hitting game logs,
plus actual Statcast hard-hit and barrel percentages. Does not
substitute unsupported pitches/guessed probabilities.

Scores depend on the **selected market**: they may differ for a
player's points vs rebounds, or goals vs shots. A dash remains when
a source has no eligible logs.

## Other sports

| Sport | Data available now | Still requires work / feed |
| --- | --- | --- |
| NBA | Exact sportsbook/model rows; verified game logs from ESPN; exact-line L5/L10 hit rates; recent average minutes; player role, matchup and pace context | True usage percentage requires possessions and verified usage inputs; calibrated market projections/edges are market-dependent |
| NHL | First/anytime scorer models where exact match exists; ESPN event logs; exact-line L5/L10 hit rates; verified skater TOI when available | Player first-goal probabilities need an exact game/market identity; missing model/shot distributions are not inferred from historical hit rates |
| MLB | Exact market rows, home-run model probability when matched; MLB Stats API verified game logs and exact-line hit rates; seasonal Statcast barrel and hard-hit percentages | Current slate is needed for player/game identity; incomplete Statcast/game logs and unsupported markets stay unavailable |
| NFL | Regular season player research, exact-line modeled props, and new 2025/2026 PBP share/first-TD data | First-TD predictive model, Purity definition, other unavailable deep situational data |

The site uses the best actual sportsbook quote for that exact market; odds
availability does not imply a calibrated TSO model exists for that selection.
Historical hit rate is not a betting probability.

## Source-backed NFL PBP pipeline

**Code:** \`tso2/build-nfl-td-opportunities.py\`

**GitHub Actions:** \`.github/workflows/tso2-nfl-td-opportunities.yml\`
(only \`tso-2.0-restructure\`, never \`main\`)

**Output:** \`tso2/data/nfl-td-opportunities.json\`

**Source:** nflverse / nflfastR PBP, CC BY 4.0:
\`https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{season}.csv.gz\`.

Run pipeline using the TSO 2.0 workflow's manual dispatch, or update its
builder/workflow file to run its branch-scoped push trigger. Currently
**no automatic time-based refresh is configured** because GitHub Actions
schedule triggers only on a repository's default branch, and we must keep
TSO 1.0 (\`main\`) isolated until the cutover is approved.

The pipeline validates nonempty seasons, checks that every computed
share is in 0–100, and publishes source/definition metadata with
a compact GSIS-ID-indexed output. TSO's browser may cache this file
for up to five minutes. The Research Lab consumes this only for the
specific GSIS-matched player. Unmapped identities are not guessed.

### What to develop next

1. Backtest and calibrate the TSO First TD v0.1 experimental heuristic against later held-out games; validate against market implied probabilities. Train
   and validate it on multiple seasons of first TD and team-scoring context;
   show uncertainty and avoid mixing backward hit rates with forecasts.
2. Evaluate the transparent TSO Purity v0.1 index out of sample (not equivalent to Research Confidence)
   score using verified inputs and test calibration; do not reproduce an
   undocumented third-party metric.
3. Provide separately validated and sourced opportunity/usage data for
   markets where the current research source lacks it, with licensing
   checks before using paid or restricted providers.
4. Add a branch-isolated scheduled refresh method for the NFL PBP output,
   with production cutover kept gated behind owner approval.
