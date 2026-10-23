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

## Postgame settlement now deployed in preview (Oct 23, 2026)

Scheduled `runNflSettlement` is installed, independently verified at 03:30 UTC, and reads ESPN finalized game summaries. It writes idempotent grades into `settled_outcomes` and activity into `settlement_runs` (separate migration `tso3/db/nfl-settlement.sql`). The 13 upcoming archived games have not completed; there are zero real graded outcomes. Details, limitations, and operator queries: `tso3/NFL_SETTLEMENT_SETUP.md`.

## Original validation design note (archival history)

The archive initially saves forward-only before-kickoff predictions. This is **not** a calibration or ROI measure. No final outcome is inferred or filled in by this capture. The dedicated settlement pass now uses ESPN-reported final player box scores. It grades confirmed Over wins/losses and pushes, but cannot infer sportsbook-specific voids and leaves unmatched or absent athletes unresolved rather than guessing losses. Metrics must avoid treating correlated same-game player bets or repeated pregame snapshots as independent observations.

## Operational inspection

- `/api/nfl-archive-status` is read-only and reports total snapshots, games, model families, latest cron status, and count of settled outcomes.
- Worker schedules: Cloudflare GET `/accounts/{account_id}/workers/scripts/tso3-preview/schedules`.
- Worker binding: Cloudflare GET `/accounts/{account_id}/workers/scripts/tso3-preview/settings`.
- D1 query `SELECT COUNT(*) FROM prediction_snapshots;` and `SELECT * FROM capture_runs ORDER BY started_at DESC LIMIT 3;`.
- The first confirmed snapshot count may remain zero until the scheduled Worker has successfully captured fresh matched odds and models; the existence of a cron schedule is **not** proof of a successful capture.


## First real capture verification — October 22, 2026 Chicago / October 23 UTC

The one-time privately scoped test route (deployed only in-memory to the isolated preview Worker) performed a genuine before-kickoff archive capture, then was removed immediately by redeploying the unmodified `tso-3.0` source code. No permanent manual write endpoint exists.

- First capture: `2026-10-23T02:38:32.932Z`.
- **786** inserted, **786** distinct SHA-256 snapshot IDs across **13** official upcoming NFL games.
- `50k_exact_over`: **442**; `50k_atd`: **344**; `tso_regressed_atd`: **0** because the relevant source was not eligible for fresh capture.
- Verified D1 SQL: **0** captured at or after kickoff; **0** model/odds source timestamps after capture.
- Source example: original model version `v89.18.0` plus prediction-source SHA-256 fingerprint. Book and model source timestamps are preserved independently.
- Live source test: 786 eligible, 786 inserted, status `saved`; one-time source-level test replay demonstrated deterministic IDs, mismatched-line rejection and zero re-inserts when source snapshots were unchanged.
- Cron restored to `*/30 * * * *` and D1 binding verified. **A successful private capture does not yet prove the recurring cron job has run.** Verify `capture_runs` after the scheduled trigger.
- No calibration or outcome-settlement claims are made. Current `settled_outcomes` count is zero.

**Deployment warning:** Every future Worker multipart upload must include the `NFL_ARCHIVE` D1 binding. Do not paste older unbound deployment recipes; doing so disconnects the archive.
