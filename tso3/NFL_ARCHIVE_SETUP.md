# TSO 3.0 NFL prediction archive (preview only)

Scope: **branch `tso-3.0`, Worker `tso3-preview`, database `tso3-nfl-pregame-archive`**. Do not modify main, TSO 2.0 or production.

## Connection and schedule

The preview uses its own US-jurisdiction Cloudflare D1 database `tso3-nfl-pregame-archive` (database ID `b976a673-0fe5-4440-84c7-15b0475758ba`). The Worker binding **MUST** survive every future deployment:

```json
{"type":"d1","name":"NFL_ARCHIVE","database_id":"b976a673-0fe5-4440-84c7-15b0475758ba"}
```

Cloudflare Worker multipart-upload metadata must contain `main_module:"worker.mjs"`, compatibility date and the binding above. Historical upload recipes that omit `bindings` will detach the database and stop captures. The scheduled trigger is `*/30 * * * *` UTC. Whenever deploying to the existing Worker, confirm both the binding and the cron trigger afterwards.

Migration: `tso3/db/nfl-prediction-archive.sql`. Table `prediction_snapshots` is **append-only**; do not update historical predictions. Settlements belong in `settled_outcomes`, with a separately verified final-game outcome. `capture_runs` records each cron attempt, including source-unavailable runs.

Capture runs only within the Worker `scheduled()` handler. There is **no publicly exposed capture trigger**. `GET /api/nfl-archive-status` displays only aggregate counts and job status, not the complete archive.

## Snapshot contract

For each published current pregame sportsbook quote, require:
1. ESPN-verified NFL event ID and start time; kickoff must be >15 minutes away, and the observed source times must be no later than capture and earlier than kickoff.
2. Player name normalized with exact team match and game identity. Side must be `over` or `yes` for ATD, and sportsbook price must be a real quoted nonzero integer.
3. 50K model source run within 48h and >=10,000 iterations; exact `market + side + line` or matching 0.5 anytime TD. For the separate regressed ATD estimate, source must be fresh, with 2025 baseline accurately labeled.
4. Store probability, model source timestamp, source fingerprint (not claimed code commit), sportsbook quote timestamp, sportsbook price, player ID, game and kickoff, capture timestamp.
5. SHA-256 deterministic ID over source identity and original quote/model timestamps. `INSERT OR IGNORE` guarantees repeated cron runs cannot overwrite predictions or multiply unchanged snapshots. Later legitimately changed snapshots create new rows.
6. Missing/stale input is logged as `no_fresh_sources`; never create fake predictions or historical pregame estimates.

## Validation is not active until outcomes are linked

The archive initially saves forward-only before-kickoff predictions. This is **not** a calibration or ROI measure. No final outcome is inferred or filled in by this capture. A future dedicated settlement pass must use official postgame final scores/statistics and separate `settled_outcomes`, marking pushes and voids rather than guessing losses. Metrics must avoid treating correlated same-game player bets or repeated pregame snapshots as independent observations.

## Operational inspection

- `/api/nfl-archive-status` is read-only and reports total snapshots, games, model families, latest cron status, and count of settled outcomes.
- Worker schedules: Cloudflare GET `/accounts/{account_id}/workers/scripts/tso3-preview/schedules`.
- Worker binding: Cloudflare GET `/accounts/{account_id}/workers/scripts/tso3-preview/settings`.
- D1 query `SELECT COUNT(*) FROM prediction_snapshots;` and `SELECT * FROM capture_runs ORDER BY started_at DESC LIMIT 3;`.
- The first confirmed snapshot count may remain zero until the scheduled Worker has successfully captured fresh matched odds and models; the existence of a cron schedule is **not** proof of a successful capture.
