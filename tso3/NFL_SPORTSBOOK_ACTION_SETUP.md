# TSO 3.0 — NFL sportsbook participation / void evidence

**Scope:** `tso-3.0` branch and ONLY the Cloudflare `tso3-preview` Worker + independent D1 `tso3-nfl-pregame-archive`. No updates to main, TSO 2.0, production or user-state D1.

## Why this exists

A zero on the postgame stats page is not always a losing player prop. A player can be **inactive, DNP, active without ever taking a play**, or have an incomplete ESPN stat record. The automated model-quality dashboard must not grade unknown participation as a loss or quietly treat every absent player as a void.

This pipeline stores **participation and rule evidence, not sportsbook-paid betting ticket settlement.** It does not make claims about profit, win-rate, or payouts.

## Verified source-specific book rules and scope

- **FanDuel USA NFL player props:** generally at least one snap for action; explicit DNP/inactive evidence can justify a potential void. Standard individual Anytime TD scorer selection does **not** count a TD made while on the defensive unit; individual offensive or special-teams scores may qualify. Source: https://www.fanduel.com/fanduel-sportsbook-house-rules-in and https://fanduelgroup.my.site.com/hc/s/article/Betting-football-with-FanDuel .
- **DraftKings USA NFL player props:** player must participate in at least one play, including special teams; officially inactive / did-not-play selections are void. Source: https://help.draftkings.com/hc/en-us/articles/28021813230483-How-will-my-bet-be-settled-if-a-player-doesn-t-start-or-is-removed-from-a-game-US .
- **All other books** (including BetMGM, bet365, Caesars, Fanatics, Parx, Pinnacle, BetRivers and Bovada): **no automatic book-specific void classification** until the correct house rules, market and jurisdiction are mapped. Positive verified in-game player evidence is tracked as participation only. Do not infer a legally binding sportsbook ticket grade or return.

**Jurisdiction and market exceptions remain:** these two mapped rule sets are baseline published US football rules, not a binding adjudication for every customer and region.

## Implementation

- `tso3/db/nfl-sportsbook-action.sql` migration: `sportsbook_action_observations`, separate from `prediction_snapshots`, `settled_outcomes`, and `outcome_observations`. Each distinct decision has an immutable SHA-based evidence fingerprint. Repeating the same source observation makes zero new records.
- Every final postgame reconciliation pass stores an `action_confirmed`, `void_evidence`, or `review_required` observation by original sportsbook snapshot, player, game and market.
- `action_confirmed`: final ESPN athlete identity (team, player ID) matches and evidence of play exists: explicit `didNotPlay === false`, verified nonzero player production/attempts/receptions, or an individually reconciled scoring touchdown. An active roster flag alone is **not** proof.
- `void_evidence`: only where a supported book's one-snap/one-play rule applies and official final ESPN player record explicitly states `didNotPlay === true`, or inactive flag **with an explicit inactive/DNP reason**. This is potential void evidence—not confirmation of a sportsbook payment status.
- `review_required`: missing athlete, mismatched ID, zero-only stat row, participation-record contradiction, DNP at an unmapped sportsbook, unsupported rule or incomplete final boxscore. A player absent from the boxscore is **not** automatically a DNP.
- Exact-player/market statistical grades now require confirmed participation. Unverified action is NOT treated as a losing over.
- Generic FanDuel individual ATD ignores defensive-unit touchdowns; DraftKings and other unmapped defensive-touchdown handling stays unresolved when the player is a defensive TD scorer.
- Model validation requires a matching later ESPN outcome recheck and a matching current action-confirmation observation. All earlier pregame prediction and initial settlement rows remain immutable.

## UI and operational checks

Read-only `GET /api/nfl-archive-status` includes `sportsbookAction.byState` and `sportsbookAction.byBook`. NFL Model Validation displays action confirmations, DNP/void evidence, and cases needing review separately.

Routine checks:

```sql
SELECT COUNT(*) AS snapshots FROM prediction_snapshots;
SELECT COUNT(*) AS settled FROM settled_outcomes;
SELECT COUNT(*) AS participation_records FROM sportsbook_action_observations;
SELECT sportsbook, action_state, COUNT(*) FROM sportsbook_action_observations
 GROUP BY sportsbook, action_state ORDER BY sportsbook, action_state;
```

## Validation and remaining requirements

- 20 synthetic grading and sportsbook-action cases passed, including confirmed receiver/runner TD, complete non-scorer, explicit FanDuel and DraftKings DNP, unmapped sportsbook, mismatched ID, zero-only player row, inactive flag without reliable reason and defensive touchdown coverage.
- A real final-game result from the newly archived slate is **not yet available** (first archived kickoff is October 25, 2026). The automated job and final ESPN source parsing still require a successful real-game observation.
- ESPN postgame team/player summaries are one provider, not independent cross-provider certification. To label any bet actually paid, void, refunded or settled by a sportsbook requires the actual sportsbook ticket or audited settlement feed.
