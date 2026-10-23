# TSO 3.0 — isolated NFL postgame settlement

**Scope:** `tso-3.0` branch / `tso3-preview` Cloudflare Worker / **only** D1 `tso3-nfl-pregame-archive`.
Do not deploy to production, `main`, TSO 2.0 or shared user-state databases.

## Completed implementation

- **Deployment:** Preview Worker only. Cron `*/30 * * * *` UTC executes independent capture and settlement jobs.
- **Data:** `prediction_snapshots` is immutable; settlement grades are `INSERT OR IGNORE` in separate `settled_outcomes`. `settlement_runs` records each cron execution.
- **Migration:** `tso3/db/nfl-settlement.sql`, applied to D1 ID `b976a673-0fe5-4440-84c7-15b0475758ba`.
- **Source:** ESPN NFL site v2 completed-game `summary?event={official ESPN game_id}` with validated event identity, official final status, and kickoff time within 90 minutes of archived kickoff.
- **Market grading:** passing yards, passing touchdowns, passing completions, rushing yards, receiving yards and receptions. Anytime TD has scorer and non-scorer settlement gated on a complete official ESPN scoring-play timeline, reconciled to final score and typed athlete TD totals; any incomplete or ambiguous scoring plays keep zero-TD cases unresolved (never count a QB passing TD as ATD). See `tso3/NFL_ATD_SETTLEMENT_SETUP.md`.
- **Rules:** Over wins when the actual stat strictly exceeds the archived line; equality pushes. Anytime TD wins when scorer has >=1 eligible TD. Exact player name + team + event identity, plus numeric player ID when available. The model score is *never* recomputed after kickoff.
- **Missing data / correction audit:** A second scheduled ESPN final recheck records immutable observations and quarantines disagreements from Brier metrics. See `tso3/NFL_RECONCILIATION_SETUP.md`. Final-game status alone does not prove a player participated. Unmatched players / incomplete or ambiguous box scores remain **unresolved**; they are not treated as zeroes, losses, or presumed voids. Book-specific void and stat-correction procedures need separate evidence. Re-run idempotence prevents rewrites to already graded results.
- **Read-only audit:** `GET /api/nfl-archive-status` includes `settlement.lastRun`, `settlement.byMarket`, `reconciliation.lastRun`, `reconciliation.coverage`, and deduplicated Brier metrics **only for later matching verified rechecks and non-ATD markets**.
- **Counting:** The earliest pregame snapshot for each game + player + market + side + line + model is retained for headline metrics. Cross-book duplicates and repeated captures are not independent observations. Exclude pushes / voids / unknowns from binary Brier. Still group/cluster uncertainty by completed game before making calibration claims.

## Verified live on preview (October 23, 2026 UTC)

1. D1 still contains **786** immutable pre-kickoff forecasts across **13** games.
2. Standalone cron capture executed 2026-10-23 03:30 UTC, inserted **0** duplicates.
3. New automatic settlement cron independently executed 2026-10-23 03:30 UTC with `status=nothing_final`, `checked_games=0`, `inserted_outcomes=0`. This is **expected**, as the archived upcoming games have not finished.
4. Cloudflare deploy of `tso3-preview` is at **100%**, database binding `NFL_ARCHIVE` and existing cron schedule were confirmed after upload. Existing nine bundled frontend assets are retained.
5. No successful **real** grade from a completed newly archived game has yet been observed. Verify outcome matching, non-participation handling and source corrections after the first finalized NFL slate before publishing model-performance claims.

## Operator queries

```sql
SELECT COUNT(*) FROM prediction_snapshots;
SELECT started_at,status,inserted_predictions FROM capture_runs ORDER BY started_at DESC LIMIT 3;
SELECT started_at,status,checked_games,final_games,inserted_outcomes,unresolved_predictions,error
FROM settlement_runs ORDER BY started_at DESC LIMIT 5;
SELECT outcome,COUNT(*) FROM settled_outcomes GROUP BY outcome;
```

**Risk note:** ESPN is an external postgame reporting source, not the sportsbook's official settlement ledger. Corrections to official stats or rules around inactive players should be managed through a reviewed, separately audited adjustment workflow; do not alter immutable original forecasts or silently overwrite existing grades. Until enough distinct final games accumulate, any numerical Brier/hit rate is descriptive rather than validated predictive accuracy.
