# TSO 3.0 NFL result reconciliation — preview only

**Scope:** `tso-3.0` branch, **only** `tso3-preview` Cloudflare Worker and D1 `tso3-nfl-pregame-archive`. Main / TSO 2.0 / production remain untouched.

## Why we built this

Initial settled results should not be overwritten as if a correction never happened. Official boxscores can change after a game; incomplete boxscores can omit a player or stat. This pipeline re-reads completed NFL events, compares their current stats to the **immutable initial** settlement, logs distinct changes and excludes conflicts from model metrics.

This is an **independent execution of the verification pipeline, not an independent source provider**: source is still ESPN's NFL final event summary. Cross-provider certification (NFL/nflverse finalized stat ledger, where legally and technically available) remains a separate enhancement.

## Tables and migration

Apply `tso3/db/nfl-reconciliation.sql` to **only** the TSO3 archive D1.

- `prediction_snapshots` — immutable original pregame evidence.
- `settled_outcomes` — append-only first postgame grade, no update/delete.
- `outcome_observations` — append-only distinct later result or coverage state, fingerprinted by grade/stat/reason per prediction. Unchanged poll = no new row.
- `reconciliation_runs` — every reconciliation job and its coverage/errors.
- `settlement_runs` and `capture_runs` — independently show initial grading and pregame capture runs.

Reconciliation is scheduled in the same 30-minute Worker cron **after** initial settlement, not concurrently with it. Source is re-requested without a cache TTL when scheduled. Archived games are eligible only from four hours after kickoff and for 14 days thereafter. Poll at normal cadence during the first 72 hours, then at most once per 24 hours per game.

No public write/capture/reconciliation endpoint is exposed.

## Verification rules

1. ESPN event ID and recorded kickoff must agree; status must explicitly be `completed` + `post`. Require two ESPN team entries and a two-team boxscore.
2. Player name, team and ESPN player ID (when archived) must agree. Duplicate/mismatching athletes stay unresolved.
3. Every market requires actual numeric stat, or a corroborated zero: the player appears in a different statistics category **and** the team's final boxscore explicitly covers the missing market. A missing player or missing market coverage is not a zero.
4. Grade Over when actual is greater than archived line, push at equality, loss when lower. Passing TDs are a distinct market from the anytime **scoring** TD market.
5. **ATD non-scorer policy (safety gate):** scorer wins can be recorded from explicit positive TD stats, but non-scorer losses require a comprehensive final scoring-play timeline reconciled against final score, type-specific player TD totals, athlete identity, and participation. Scorer-only incomplete-game observations are excluded from descriptive ATD Brier metrics. See `tso3/NFL_ATD_SETTLEMENT_SETUP.md`.
6. Each distinct ESPN observation becomes an immutable `outcome_observations` event. Any later mismatch against initial settlement outcome or realized stat is a **conflict** and is excluded from the headline accuracy/uncertainty summaries.
7. Model metrics require both an initial archived postgame grade and a later agreeing reconciliation observation. Only first saved pregame quote per exact game/player/market/side/line/model is counted; cross-book duplicates do not multiply observations.
8. Missing/unresolved player rows, corrected outcomes and abnormal odds must not be silently treated as losses or profitable picks. One slate is not enough for reliable calibration.

## Operator queries

```sql
SELECT COUNT(*) FROM prediction_snapshots;
SELECT COUNT(*) FROM settled_outcomes;
SELECT COUNT(*) FROM outcome_observations;
SELECT * FROM reconciliation_runs ORDER BY started_at DESC LIMIT 10;
SELECT reason,COUNT(*) observations FROM outcome_observations GROUP BY reason ORDER BY observations DESC;
```

Read-only `GET /api/nfl-archive-status` includes `reconciliation.lastRun`, `reconciliation.coverage`, `reconciliation.unresolvedReasons`. The NFL validation dashboard surfaces these aggregates but no private write endpoints.

## Verification performed before games completed

- Applied migration to correct D1 successfully; existing forecast records unchanged.
- Preview Worker JavaScript, dashboard JavaScript: **syntax PASS**.
- Eight deterministic synthetic grades PASS (yardage win, parsed completions, push, TD win, unverified TD zero, missing player, mismatched ESPN ID, legitimate zero with complete team category).
- Checked D1 SQL for pending settlements, reconciliation selection and latest-observation metrics.
- Cloudflare preview Worker deployed successfully to 100%, with all nine existing bundled frontend assets retained, schedule `*/30 * * * *`, D1 binding `NFL_ARCHIVE` preserved.
- **No live postgame fixture exists yet**: first archived kickoff Oct 25, 2026, so no actual settled/reconciled grade has been confirmed. Real-game validation is mandatory after the first finalized slate.
- Future provider stat corrections are logged as conflicts for audit, not automatically written back to first settlement. Resolve correction policy explicitly after enough real data.

## Anytime TD complete-scoring verification

A dedicated strict scoring-play cross-check is now installed: event and kickoff, final scoreboard equality with the full scoring timeline, recognized touchdown types, type-specific scorer identity, and final athlete TD totals. It can verify both scorers and **non-scorers** when the entire game passes. Incomplete or special-teams/defensive TD entries without identifiable player totals still remain ungraded. Only later rechecked, complete-ledger ATD wins and losses can contribute to descriptive model metrics. See `tso3/NFL_ATD_SETTLEMENT_SETUP.md` and the regression file `tso3/tests/nfl-atd-settlement.test.mjs`.

## Caveats and future gates

The ESPN source is not a sportsbook's final settlement ledger; book-specific rules around inactive players and voids still need evidence. Rechecks are same-source corroboration and can share correlated errors. Non-ATD market coverage may still have missing zeroes. The model's Brier score and hit rate need sample-size-aware intervals and game-level clustering, along with complete valid losses and nonparticipants, before a calibrated/verified accuracy claim.
