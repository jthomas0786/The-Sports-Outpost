# NFL historical replay

The simulation replay evaluates the current model with inputs archived at each
historical moment. It is not a recreation of the model version deployed then,
and its descriptive accuracy scores are not proof of general predictive accuracy.

## Run

From the repository root:

```sh
# Read bot snapshots from Git history; no network requests or production writes.
node scripts/nfl-replay-sim.mjs --game 401872657 --ref origin/main --limit 100

# Replay a previously exported archive.
node scripts/nfl-replay-sim.mjs --archive artifacts/nfl-replay/401872657-archive.json

# Small diagnostic run (explicitly marked as test iterations in the report).
node scripts/nfl-replay-sim.mjs --archive artifacts/nfl-replay/401872657-archive.json --iterations 500

node scripts/nfl-replay-selftest.mjs
```

Default counts are 50,000 pregame, 15,000 live, and 50,000 at halftime.
Final frames record observations and do not generate predictions. Seeds are
repeatable; `--seed` defaults to 8922, with the frame index added per simulation.
The existing correlated simulator and injury calibration layer run unchanged.

All output must be inside `artifacts/nfl-replay/`, which is ignored by Git.
The exporter writes an archive and the runner writes a report with input hashes,
source commits, available times, phase coverage, and excluded-frame reasons.
No bot data in `slates/` is modified. Missing periods remain gaps: the tool does
not interpolate player box scores or invent halftime snapshots.

## Archive contract

A version 1 archive has `game`, `frames`, `research`, and `odds` fields:

- `game`: gameId, kickoff time, home/away identities. Other game fields, including
  final scores and player projections, are excluded from simulation inputs.
- `frames`: chronological `{at, source, liveGame}` captures of the actual live
  feed. `at` is an ISO timestamp or Unix milliseconds. Each live frame needs its
  historical clock, score, and playerStats. Final box scores are not substitutes.
- `research` and `odds`: `{availableAt, source, data}` records. `availableAt` means
  when that exact document became available, not when it was later reconstructed.
  The latest record available at the frame is selected. Research is required for
  predictive frames; absent odds remain absent. Current files are never fallbacks.

Records must come from trustworthy captures. Timestamp checks cannot detect a
final document that someone has falsely relabeled with an earlier timestamp.
The Git exporter therefore records original file commits and only uses input
revisions already committed before the live observation. It never reads current
research or odds into a historical frame. Embedded future fetch/generation times
and future offer timestamps are rejected as an additional check.

Historical odds are model comparison inputs, not a claim that a quote was still
tradable. This runner does not calculate betting returns, apply transaction
costs, or grade a strategy. The separate accuracy scorer below evaluates forecasts.

## Visual summary replay

```sh
node scripts/nfl-replay.mjs --file path/to/espn-summary.json --delay 0
```

The older ESPN-summary script is now explicitly visual-only and writes
`artifacts/nfl-replay/nfl-live.json`. It exposes only plays through the selected
frame, uses that play's end state for field position/down/distance, and hides
final player/team box scores and completed-drive totals/results. Its frames
are marked incomplete and cannot enter the historical simulation runner.

A completed ESPN summary alone cannot establish which player statistics,
injuries, research priors, or sportsbook quotes were known at every past moment.
Use recorded snapshots for predictive evaluation.

## Accuracy scoring

Grade saved forecasts after a final observation is available, without rerunning
or modifying the forecasts:

```sh
node scripts/nfl-replay-accuracy.mjs --reports artifacts/nfl-replay/401872657-report.json
node scripts/nfl-replay-accuracy-selftest.mjs
```

`--reports` accepts comma-separated report paths. Different games can be pooled
only when both their model-code and configuration hashes are present and match.
Duplicate games are rejected. Diagnostic iteration overrides require an explicit
`--allow-test`, and the resulting accuracy output remains marked as test data.

The scorer uses the latest recorded final correction as the outcome, but excludes
any forecast at or after the first final observation. It checks game and team
identity, matches players by ESPN ID or an unambiguous team/name match, and never
fills a missing player or stat field with zero. Explicit zero values are graded.
Final data flows into the scorer only; it never goes back into the simulator.

Metrics, grouped by stat rather than mixing yards and counts:

- MAE: average absolute error of the simulated mean, in that stat's units.
- RMSE: square root of average squared error; larger misses receive more weight.
- Bias: mean prediction minus actual. Positive means overprojection.
- Median MAE: absolute error using the simulated median.
- 80% interval coverage: fraction of actual results inside inclusive p10–p90.
  Discrete outcomes mean nominal and observed coverage need not match exactly.
- ATD Brier: average `(probability - outcome)^2`, ranging from 0 to 1; lower is
  better. Passing TDs do not count. Already-scored ATD events are skipped. A
  positive rushing/receiving TD establishes a hit; a miss requires explicit zero
  for both fields. Missing TD categories therefore reduce eligible coverage.
- Prop Over Brier: same binary score, with pushes excluded and probabilities
  conditioned on no push: `pOver / (pOver + pUnder)`. Both simulation sides at
  the same recorded line are required. Already-reached count thresholds are
  skipped. Yardage can decrease, so yardage markets are not treated as settled.
- Winner Brier: sum of squared errors across away win, home win, and tie; range
  0–2, so do not directly compare it with binary Brier scores. Published rounded
  probabilities are normalized to sum to one.
- Probability bins: ten ranges with sample count, average predicted probability,
  and observed hit rate. Sparse bins are descriptive, not evidence of calibration.

All valid forecasts remain in `frames` for inspection. Phase summaries use only
the earliest captured forecast per game and phase/live quarter, so frequent
polling does not give a game more weight. Pregame, halftime, and each live quarter
are separate. `gameCount` is shown separately from player/stat observations,
which are correlated and are not independent games. Missing rows/fields, settled
events, and pushes have exclusion counts on each frame.

The first validation game had 3 usable forecasts: pregame and two Q3 snapshots.
The summary uses pregame and the first Q3 snapshot; there was no real halftime
capture. The comparison and coverage counts are in `nfl-accuracy-validation.json`.
This is a functionality and descriptive-error check on one game, not evidence
of general accuracy, a tuned model, or a profitable betting strategy. Broader
archived game coverage and a separate holdout set are required before tuning.

## Batch discovery and coverage

```sh
# Audit the latest 100 live-file commits; export eligible archives, no simulations.
node scripts/nfl-replay-corpus.mjs --ref origin/main --limit 100

# Evaluate every eligible completed game at production simulation counts.
node scripts/nfl-replay-corpus.mjs --ref origin/main --limit 100 --run

# Diagnostic execution only; output is marked testIterations.
node scripts/nfl-replay-corpus.mjs --run --iterations 100
```

The batch tool discovers game IDs from committed live snapshots. It pins the
entire run to one Git commit, so bot updates arriving during a batch cannot mix
source histories. Games without a recorded final are listed as ineligible,
not silently dropped or assigned fabricated outcomes.

For completed games it validates every archived frame against its available
research and odds. It selects the earliest eligible pregame, halftime, and each
live-quarter forecast, plus the latest valid final correction. Invalid early
frames do not prevent selection of a later valid frame in the same phase.
Forecasts after the first recorded final cannot enter the selected sample.
Missing phases remain explicit gaps, including games with only pregame coverage.

The individual replay CLI supports the same selection with `--representative`.
It retains the original archive index for each simulation seed; it does not
renumber a trimmed archive. Omitting the flag continues to simulate all frames.

Outputs in `artifacts/nfl-replay/corpus/`:

- `coverage.json`: pinned source head, all discovered games, readiness and phase
  gaps, rejected-frame/import reasons, execution failures, and scored game count.
- `<gameId>-archive.json`: the captured inputs for each ready game.
- `<gameId>-report.json`: selected forecasts generated with the current model.
- `accuracy.json`: pooled accuracy with separate game counts for every phase.

Reports are generated afresh within a batch rather than pooling incompatible
old reports. A simulation failure produces a recorded reason and a nonzero exit
status; successful games can still have their accuracy results written. There
are no changes to bot-owned production data or user-facing Command Center UI.

The initial repository-wide inventory contained 16 games: two had recorded
finals and fourteen had only pregame states. Both completed games had a valid
pregame forecast; only one had live Q3 snapshots. Neither had a halftime capture.
`nfl-corpus-validation.json` records the production-count batch validation.
Two games are still insufficient for model tuning or a meaningful holdout study.

## Ongoing live capture

The `NFL Historical Capture` workflow runs independently on the five-minute
GitHub Actions schedule. It performs no simulations or paid sportsbook requests.
It polls ESPN through the existing live poller into a temporary file, then saves
current game inputs under `history/nfl/`. The normal production poller's output
path and idle behavior remain the default; capture mode explicitly opts into a
temporary path and an up-to-date idle/pregame observation.

Captures cover the last three pregame hours, live regulation/overtime, halftime,
and finals. Unchanged pregame inputs are checkpointed at 15-minute intervals;
changed live state or input documents produce new captures. Unchanged halftime
and final states deduplicate. Final corrections produce new captures. A failed
summary fetch or an observation older than two minutes is excluded rather than
saved as a complete box score.

Each frame stores its observed clock, score, possession, field position,
player/team stats and scoring plays, plus references to the research, odds and
cached live-odds documents present at capture time. Research/odds are filtered to
the game, stored once by content hash, and shared by frames. Cached live odds
are preserved for later evaluation; this does not imply quote freshness or
tradability, and the current replay model continues to use its archived ordinary
odds input. Missing research may be archived as missing evidence, but predictive
replay will reject frames without a usable historical roster.

Files are append-only: an existing capture is never overwritten. The archive
job stages only `history/nfl/`, and push retries rebase onto the latest branch
without force-pushing. It cannot replace bot-owned live, odds or simulation
outputs. It does not cancel a running capture when a newer schedule is queued.
The regular live simulation and user-facing Command Center workflows are unchanged.

Git discovery and replay import both the older live-file history and these
explicit captures. The timestamp on a referenced input means it was available
when that frame was captured; later input revisions cannot rewrite earlier frames.

A five-minute GitHub schedule is not a real-time guarantee: scheduler delays,
API outages or a short halftime can still leave gaps. The coverage report remains
the authority on what was actually captured. No missing historical halftime is
backfilled with final statistics. The first new workflow run validates publishing;
real halftime coverage can only be verified when an actual halftime is observed.
