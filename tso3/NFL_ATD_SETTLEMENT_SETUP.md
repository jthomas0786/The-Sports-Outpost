# TSO 3.0 — NFL Anytime TD complete-scoring verification (preview only)

**Isolation:** `tso-3.0` branch; `tso3-preview` Cloudflare Worker; D1 `tso3-nfl-pregame-archive`. NEVER update main, TSO 2.0 or production.

## Exact scorer / non-scorer evidence

`nflFinalBoxscore` remains restricted to a confirmed ESPN final game matching official ESPN event ID and archived kickoff. `verifyNflAtdScoringLog` then checks the same final ESPN event summary's entire `scoringPlays` timeline:

1. ESPN two-team final `homeAway` identities and integer final scores must exist; all plays need unique IDs and a monotonic valid score timeline. Every change is checked; the final timeline must equal the official final score. Missing touchdown/field-goal entries cause the score increments to fail.
2. Every play must have an understood scoring classification. Every TD must be explicitly classified by scoring-play type and its credited scorer matched unambiguously to the same team's named ESPN athlete with exactly one ESPN ID and a **positive type-specific TD field**. Passing TDs identify the *receiver*, never the passing quarterback.
3. Type-specific scorer counts must match every known relevant player's final TD count. Unknown type, scorer, team, TD count mismatch, scoring sequence error, data gap, incomplete team box score, or no player participation evidence invalidates **the entire game's negative ATD coverage**.
4. With full-game TD proof, an archived player with verified participation and matching ID earns an ATD **win** if in the scorer ledger or **loss** if absent from all scorers. An explicit positive player TD in an incomplete game can independently establish a winner, but incomplete-game winners must NOT be treated as a complete probability-calibration sample.
5. Existing immutable `prediction_snapshots` and `settled_outcomes` stay intact; reconciliation logs differing postgame observations and excludes mismatches rather than modifying prior grades. The dashboard reports ATD total, verified wins, verified losses, unverified and verified games separately.
6. Calibrated/reconciled ATD Brier calculation includes only first archived exact player/game/market/line/model selection with a later agreeing observation and an official **complete scoring log** reason of `scoring_plays_verified_td` or `zero_from_complete_scoring_log`. No profitability or multiweek accuracy is claimed from one slate.

## Limitations and safeguards

- Conservative safety first: some ESPN games may fail the strict complete-scoring gate. A failed gate means **missing evidence**, not a bad model and not a player losing.
- NFL special-team or defensive scores must be resolved by an ESPN scoring-play scorer with a matching type-specific player final stat. Absent that, non-scorers cannot be certified; this avoids treating return touchdowns as no TD.
- A player absent from the final individual boxscore may have been active with zero usage or DNP. This integration does NOT guess. Full sportsbook-specific DNP/void adjudication requires additional provider evidence.
- The ESPN scoring log and ESPN player boxscore are two views of **the same data provider**. This is cross-table reconciliation, NOT independent provider confirmation.
- Unrecognized ESPN scoring play type naming or player abbreviations may cause false *unresolved* states, but must not produce false graded losses. Expand provider mappings only with real scored-game test fixtures.
- Archived predictions start Sunday October 25, 2026. At implementation time, all 13 games are pending and no real ATD win/loss has been graded. Never confuse 10 synthetic fixtures with completed-game calibration.

## Live monitoring

Read-only: `GET /api/nfl-archive-status` returns `settlement.atdCoverage` and `settlement.byMarket`, plus `reconciliation.unresolvedReasons`. Scheduler `*/30 * * * *`, preserving D1 binding `NFL_ARCHIVE` on every worker upload. No public write endpoints.

Next real-game QA: after the first completed slate, inspect ESPN scoring-play types, full TD classification coverage, player's ID mapping, and verify both wins and losses with manual NFL game books for at least several distinct games before promoting this feature.
