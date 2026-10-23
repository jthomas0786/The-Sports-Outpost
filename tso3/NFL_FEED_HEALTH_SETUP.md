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

The new per-source diagnostic cron has **not yet independently run** immediately after its deployment; verify the first row in `nfl_feed_checks` at the next scheduled half-hour. Do not claim the new monitor has proven its recurring execution until that row exists.
