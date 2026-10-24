# TSO 3.0 NFL odds freshness monitor — isolated preview

**Scope:** `tso-3.0` branch, `tso3-preview` Cloudflare Worker and independent D1 `tso3-nfl-pregame-archive` only. No changes to `main`, TSO 2.0, production, shared sportsbook publisher, or billing.

## Root-cause finding, October 23, 2026

The last five overnight `no_fresh_sources` records were intermittent, **not a permanent outage**. At 16:00 UTC the scheduled preview capture accepted 696 genuinely new, exact-line forecasts; at 16:30 UTC it found 696 unchanged, inserted zero duplicate rows.

The published odds live on `main/slates/nfl-odds.json` and are refreshed by the **existing main workflow** `.github/workflows/nfl-odds.yml` using `scripts/nfl-odds-refresh-v891.mjs`.

That upstream workflow is scheduled every five minutes, **but it has an adaptive paid provider gate**. Its documented intended paid cadence is 2h beyond 48h until kickoff, 1h within 48h, 30m within 12h, 15m inside 3h, and 5m inside 90m. A cron execution every five minutes does **not** mean a new ParlayAPI snapshot is published every five minutes. Git commit timestamps for `slates/nfl-odds.json` showed approximately 11:28 UTC → 15:53 UTC on October 23, an interval over four hours. This explains TSO3 source-age rejects while kickoff-specific limits were stricter. The underlying reason for that publisher interval—provider gating, unavailable data, errors, workflow concurrency, or GitHub Actions scheduling—requires upstream workflow run logs and cannot be established from published-file commit timestamps alone.

**Do not bypass the actual odds-source timestamp by setting it to the current capture time. Do not backfill or broaden the existing age limits.** The preview archive intentionally rejects stale snapshots rather than pretending they are current sportsbook odds.

## TSO3-only improvement

Migration `tso3/db/nfl-feed-monitoring.sql` adds **append-only** `nfl_feed_checks`, keyed to `capture_runs.run_id`. Each existing 30-minute cron run now stores:

- Published source observation timestamp and age in minutes, *not* the moment we fetched it.
- Fresh eligible quote rows, number of current ESPN-verified NFL games, and games rejected by per-kickoff freshness thresholds.
- Exact failure class: `fresh`, `stale`, `unavailable`, `invalid`, `no_matching_games`, or `no_model_matches`.
- Brief truthful provider/validation reason, without secrets or customer/private sportsbook data.

`GET /api/nfl-archive-status` remains read-only and now returns `feedHealth.latest`, `feedHealth.recentStates` (last 12 checks), and `feedHealth.history` (last eight checks). On the NFL Model Validation dashboard a new **Pregame sportsbook source health** panel shows the actual source age, eligible quotes, rejected games, and recent failure reasons. This makes real failures distinguishable from an entirely valid capture that inserts zero **unchanged** snapshots.

No extra paid provider requests, credentials, billing changes, public capture endpoints, or upstream mutations.

## Source-age policy remains identical

The upstream NFL odds file remains a ParlayAPI-produced, non-sample JSON snapshot (`meta.source='parlayapi'`, `meta.sample=false`). Exact ESPN game identity and kickoff are mandatory. Current limits, in minutes:

| Time before kickoff | Maximum quote age |
| --- | ---: |
| 90 minutes or less | 12 |
| 90 minutes–3 hours | 25 |
| 3–12 hours | 45 |
| 12–48 hours | 75 |
| More than 48 hours | 150 |

The global source-age bound is 240 minutes. The archive also requires kickoff more than 15 minutes ahead and no future-dated odds/model generation, plus exact player/team/market/side/line match and fresh 50K model source. No model/market approximation is substituted when matches fail.

## Operator checks

```sql
SELECT COUNT(*) FROM prediction_snapshots;
SELECT started_at,status,eligible_predictions,inserted_predictions,reason
FROM capture_runs ORDER BY started_at DESC LIMIT 12;
SELECT checked_at,status,source_snapshot_at,source_age_minutes,eligible_quote_rows,
 verified_games,games_rejected_for_age,reason
FROM nfl_feed_checks ORDER BY checked_at DESC LIMIT 12;
```

Regression: `node --test tso3/tests/nfl-feed-freshness.test.mjs`.

## Remaining upstream issue

If new `stale` checks recur, inspect logs for `nfl-odds.yml` and `scripts/nfl-odds-refresh-v891.mjs` and the ParlayAPI refresh gate. Repairs to `main` and its paid sportsbook refresh scheduling require a **separately approved deployment scope**. TSO3 is not allowed to quietly spend API credits, change published sportsbook quotes, or edit production/main.

The source diagnostic cron **has independently run**, with a series of persisted `nfl_feed_checks` from October 23. For example, at 00:30 and 01:00 UTC October 24 it found source-fresh quotes in **only 1 of 13 archived games**; at 01:30 UTC it found 13/13. The new per-game capture-readiness calculation was deployed later and must still be checked against its first new scheduled run.


## Sunday archived-slate readiness (October 23 preview update)

Read-only `GET /api/nfl-archive-status` now includes `slateReadiness`:
`status`, `expectedGames`, `readyGames`, `sourceMatchedGames`, and a per-game breakdown.

Previously, `nfl_feed_checks.status='fresh'` meant **at least one game had a valid quote**—even when 12 of 13 games had expired source lines. The original append-only checks are not rewritten; the dashboard now calls partial historical source checks “Partial · games age-gated” and adds a stronger, separately calculated pregame readiness result.

`READY_FOR_CAPTURE` requires all of the following for **each already-archived upcoming game**:

1. Recent source-monitor run within 45 minutes, valid published odds timestamp no later than now and no older than the absolute four-hour bound.
2. A quote captured under that same **most recent published source timestamp**; the quote must still obey the time-to-kickoff-specific cap (12/25/45/75/150 minutes). Do not substitute `captured_at` for `odds_snapshot_at`.
3. **Both** 50K model families (Anytime TD and exact-line Over) must have at least one archived quote under the latest published source timestamp.
4. Each model family must have a model-generation timestamp no older than 48 hours and not from the future.
5. Every upcoming game already in the archived universe passes these checks. A single game with a valid quote is explicitly `PARTIAL_COVERAGE`, not `READY_FOR_CAPTURE`.

A status of `CHECK_DELAYED` or `SOURCE_UNAVAILABLE` takes precedence over apparently complete cached selections. A status of `NO_UPCOMING_ARCHIVED_GAMES` does not invent a slate.

**Limits:** the expected-game denominator is the set of upcoming **previously archived** ESPN game IDs, not a separately certified league schedule. One current exact-line and one ATD selection per game does not establish complete player/market/book coverage. Capture readiness does not mean verified model accuracy or profitable bets.

The SQL uses only the same isolated D1 `prediction_snapshots` plus the append-only feed-health evidence; it creates no new odds, sends no paid API calls, changes no capture timestamps, and does not alter upstream `main`. Regression checks: `node --test tso3/tests/nfl-slate-readiness.test.mjs` (eight synthetic scenarios). The D1 aggregation returned 13 upcoming archived games with the two model families. Cloudflare Worker version `55b881cd-76e8-4607-861a-264800c11b52` was deployed to preview at 100%, preserving the nine UI assets and `*/30 * * * *` cron.
