# NFL Research + Live Engine (v68)

## Pregame research

Run:

```bash
node scripts/nfl-research.mjs
```

This builds `slates/nfl-research.json` from current ESPN roster/depth/injury information, nflverse player IDs and historical/current player production, plus the existing `slates/nfl.json` TSO model fields.

The browser matches research data back to Slate players by ESPN ID, GSIS ID, or team + normalized player name. The research feed enriches the TSO model; it does not replace TSO ATD probability, TD Grade, or TSO Edge.

Player Modals now expose a Gameday Research section with current depth/status, previous/current-season production, last-five form, and TSO role context.

## Live Gamecast

Run:

```bash
node scripts/nfl-live-poller.mjs
```

This builds `slates/nfl-live.json` with normalized live fields:

- score
- quarter and clock
- possession
- field position
- down and distance
- red-zone state
- current drive plays/yards/time
- recent play-by-play
- live player box stats
- team stats
- quarter linescores
- scoring plays

The redesigned NFL Gamecast consumes these fields when present. TSO Scoring Chance remains model-derived. Player dots/routes remain illustrative unless a player-tracking feed is connected.

## Automation

`.github/workflows/nfl-research.yml` refreshes research every 6 hours and can also be run manually.

`.github/workflows/nfl-live.yml` refreshes the static live snapshot every 5 minutes. That is useful as a fallback on a static site, but it is not low-latency enough for the final gameday experience.

For near-real-time updates, deploy `workers/nfl-live-worker.js` (or an equivalent server endpoint) and set this before the NFL module loads:

```js
window.DW_NFL_LIVE_ENDPOINT = 'https://YOUR-WORKER.example/nfl-live';
```

The browser will try that endpoint first and fall back to `slates/nfl-live.json` if the endpoint is unavailable. For backward compatibility, `window.TSO_NFL_LIVE_URL` is also accepted.

## Replay / QA mode

Use a completed ESPN game to exercise the production Gamecast one play at a time:

```bash
node scripts/nfl-replay.mjs --event ESPN_EVENT_ID --delay 2500
```

Or replay from a previously saved ESPN summary JSON:

```bash
node scripts/nfl-replay.mjs --file fixtures/espn-summary.json --delay 1500
```

The replay writes the same `slates/nfl-live.json` schema consumed by the real Gamecast, so score changes, possession changes, drives and play-by-play can be tested before opening day.

## First run

1. Add the v68 files to the repository.
2. Keep the existing `slates/nfl.json` in place.
3. Run **NFL Research Refresh** manually once.
4. Confirm `slates/nfl-research.json` appears in the repo.
5. Open NFL Slate and click players to verify the Gameday Research section.
6. Keep the Test Game on NFL Live for visual QA.
7. For data QA, use Replay Mode with a completed game.
8. Before the first regular-season game, deploy the optional live worker (or another 10–15 second server endpoint) and set `window.DW_NFL_LIVE_ENDPOINT`.

## Attribution

nflverse data is distributed under CC BY 4.0. Keep nflverse attribution in project/source documentation when publishing derived research data.
