TSO v83 — NFL Slate Repair + ATD Wager Fix + Parlay Pricing

Changed files:
- index.html
- sports/nfl-preview.js
- sports/nfl-research-ui.js
- sports/router.js
- scripts/nfl-gameday-check.mjs
- supabase/functions/place-wager-validated/index.ts
- supabase/migrations/20260909045500_fix_nfl_atd_parlay_pricing.sql

Key fixes:
- Repairs NFL Slate player-row layout (no more rings/TSO Edge dropping below cards).
- Fixes ATD legs added from the NFL player modal by inheriting canonical game/player/date metadata from the active NFL slate, even when sportsbook odds are not posted.
- Adds player_name to NFL ATD wager legs for database/validator consistency.
- Fixes multi-leg NFL ATD point-parlay payout preview: house edge applies once to the joint ATD probability instead of compounding once per leg.
- Adds matching server-side place_wager migration so preview and actual wager payout use the same math.
- Preserves correlation_adjustment through place-wager-validated for existing MLB HR wagering.
- Bumps NFL browser module cache to v83.

Deployment after unzip:
1) Run normal JS syntax checks.
2) Run supabase/migrations/20260909045500_fix_nfl_atd_parlay_pricing.sql in the Supabase SQL Editor.
3) Deploy place-wager-validated with JWT verification enabled:
   npx supabase functions deploy place-wager-validated --project-ref hjhfbhpuuxnrexddplxd
   (do NOT use --no-verify-jwt)
