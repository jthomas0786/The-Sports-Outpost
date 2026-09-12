# NFL historical replay

The simulation replay evaluates the current model with inputs archived at each
historical moment. It is not a recreation of the model version deployed then,
and it is not yet a performance backtest or proof of predictive accuracy.

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
costs, or grade a strategy. Those belong to the next backtesting stage.

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
