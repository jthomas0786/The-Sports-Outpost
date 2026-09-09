TSO v81 — NFL Gameday Odds + ATD Wagering

What v81 fixes
---------------
• Replaces Slate "Game Context" with a themed Game Odds grid (Spread / Total / ML).
• Kickoff header shows viewer-local weekday/date, time + timezone abbreviation,
  broadcast, then venue. This automatically respects the visitor's device timezone
  and daylight-saving time.
• Filters DFS/exchange/prediction-market player quotes out of sportsbook display.
  Novig +953 can no longer be promoted as a sportsbook ATD price.
• Merges duplicate ParlayAPI player labels such as "Player" and "Player (TEAM)".
• Requests game odds in American format and defensively converts any legacy cached
  decimal odds before display.
• Removes the old TD-grade circle styling underneath the MLB-style progress ring.
• Centers TSO Edge.
• NFL Props uses the same market dropdown control style as MLB.
• Adds ATD Add-to-Slip controls to NFL Slate / Props and makes the NFL player-modal
  ATD leg wager-ready.
• Enables NFL Anytime TD in the no-cash-value TSO points wager system.
• ATD point wagering closes at kickoff.
• Settlement supports MLB HR + NFL ATD.
• Gameday preflight checks for Novig/DFS leakage and decimal game-price leakage.

Install
-------
1. Unzip into repository root.
2. Run:
     node scripts/apply-v81-nfl-atd-wager-ui.mjs
     rm scripts/apply-v81-nfl-atd-wager-ui.mjs
3. Syntax checks:
     node --check sports/nfl-preview.js
     node --check sports/nfl-research-ui.js
     node --check sports/router.js
     node --check scripts/nfl-odds-refresh.mjs
     node --check scripts/nfl-gameday-check.mjs
     node --check settle-wagers.js

Supabase
--------
Run the SQL in:
  supabase/migrations/20260909033000_enable_nfl_atd_wagers.sql
against the production project, then deploy:
  npx supabase functions deploy place-wager-validated \
    --project-ref hjhfbhpuuxnrexddplxd

Do NOT use --no-verify-jwt for place-wager-validated; point wager placement
must require the signed-in user's JWT.

After pushing v81
-----------------
Run the GitHub Actions "NFL Odds Refresh" workflow manually with force=true.
This rebuilds slates/nfl-odds.json using the corrected sportsbook-only parser.
Then pull main and run:
  node scripts/nfl-gameday-check.mjs --date 2026-09-09
