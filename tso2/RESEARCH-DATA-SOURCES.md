# TSO 2.0 Research — verified data inventory

The Research UI is **game cards → selected game → video-inspired columns**.
This file documents the meaning and source of each metric. A dash must
**never** be replaced by invented values, a nearby sportsbook market, or the
original video's proprietary estimates.

## NFL TD Lab source coverage

| Column | Actual TSO definition | Source / present status |
| --- | --- | --- |
| ROLE | Position and verified depth rank | Existing TSO NFL / ESPN + nflverse research snapshot via \`/api/research-detail\` |
| ANYTIME % | Exact modeled anytime TD probability | Existing validated prop model matched to selection and game; dash when unavailable |
| FIRST % | Exact modeled first TD scorer probability | **Model work outstanding**. Historical first-TD frequency is **not** a forward probability |
| 2025 1ST | Games with first touchdown scored / previous-season games played | New nflverse PBP first-TD event attribution + existing season games (e.g. 3/16). Excludes postseason, doesn't invent defensive/ST player credit |
| 2025 TDs | Season rushing plus receiving TD total | nflverse 2025 player-season snapshot |
| 2026 TDs | This-season rushing plus receiving TD total | nflverse 2026 player-season snapshot |
| FORM | Recent TDs/game minus season TDs/game, or verified explicit model form | Existing NFL recent and season stats. Unit is TDs/game delta; not an opaque score |
| YIELD | Red-zone TDs / red-zone carries+targets (%) | New nflverse play-by-play TSO calculation; NOT the reference app's proprietary yield |
| GL % | Player carries+targets at/inside opponent 5 / team equivalents (%) | New nflverse 2026 PBP |
| CARRY % | Player rush attempts / team rush attempts (%) | New nflverse 2026 PBP |
| TGT % | Verified target share (%) | Existing nflverse player-season target share |
| RZ % | Player carries+targets at/inside opponent 20 / team equivalents (%) | New nflverse 2026 PBP |
| PURITY | Proprietary/undefined metric in reference | **Definition and validated TSO-owned model needed**; no manufactured rank/score |

**2025 1ST** is historical first-TD hit count, not a model probability.
**YIELD, GL %, CARRY %, RZ %** are independently defined TSO ratios; their
values will not necessarily match the reference video. They are computed
using regular-season PBP, matched through GSIS player IDs. For traded players
with multiple teams in the same season, team-share ratios are suppressed
rather than combining mismatched team denominators.

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

1. Decide and document a TSO-specific **First TD predictive model**. Train
   and validate it on multiple seasons of first TD and team-scoring context;
   show uncertainty and avoid mixing backward hit rates with forecasts.
2. Define a transparent TSO-specific **Purity** or **Research Confidence**
   score using verified inputs and test calibration; do not reproduce an
   undocumented third-party metric.
3. Provide separately validated and sourced opportunity/usage data for
   markets where the current research source lacks it, with licensing
   checks before using paid or restricted providers.
4. Add a branch-isolated scheduled refresh method for the NFL PBP output,
   with production cutover kept gated behind owner approval.
