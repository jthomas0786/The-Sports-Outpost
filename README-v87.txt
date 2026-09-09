The Sports Outpost — v87 NFL Live/Halftime Orchestration + Gambly Bridge
============================================================================

NFL HALFTIME
------------
• Keeps v86's automatic 50,000 halftime simulations.
• Adds a halftime-only ParlayAPI prop refresh. It spends no paid prop credits
  when no NFL game is at halftime.
• Uses a 6-hour backward event window so games that began long before the
  workflow wakes can still be mapped correctly.
• Fresh live sportsbook prop data is stored in slates/nfl-live-odds.json.
• The 50K run keeps private same-world samples in memory only long enough to:
    - evaluate available live prop lines,
    - calculate model probability,
    - de-vig two-way sportsbook implied probability when possible,
    - calculate TSO edge,
    - reject weak/stale candidates,
    - calculate exact same-world pair joint probabilities,
    - flag positive correlations and conflicts,
    - rank Safest / Best Edge / Balanced / Longshot / TSO Pick candidates.
• Private Monte Carlo samples are NOT committed to the repo.
• Compact output is slates/nfl-halftime.json.
• If halftime odds are not ready, v87 can retry up to three 50K halftime runs
  rather than permanently marking an empty candidate board complete.

GAMBLY
------
TSO's current betslip now has the requested two-stage UX:

  Generate on Gambly
       ↓
  server creates Gambly share-bet
       ↓
  button becomes Place Bet
       ↓
  opens Gambly share-bet
       ↓
  user chooses sportsbook on Gambly

Important: Gambly's public site does not currently publish a supported public
API contract for programmatically creating share-bet slips. v87 does NOT
reverse-engineer a private Gambly endpoint.

The new Supabase Edge Function:
  supabase/functions/gambly-slip/index.ts

is a secure server-side adapter for approved Gambly partner access. Until these
Supabase secrets are supplied by an approved Gambly integration:
  GAMBLY_GENERATE_URL
  GAMBLY_API_TOKEN

the primary button fails closed and tells the user that direct integration is
pending; GamblyBot Fallback remains available. No partner token is exposed in
the browser.

DEPLOY EDGE FUNCTION
--------------------
supabase functions deploy gambly-slip

Once Gambly supplies an approved endpoint/token:
supabase secrets set GAMBLY_GENERATE_URL="APPROVED_URL" GAMBLY_API_TOKEN="APPROVED_TOKEN"

Do not invent or scrape a private endpoint.

TEST
----
node --check sports/nfl/sim/halftime.js
node --check scripts/nfl-halftime-odds-refresh.mjs
node --check scripts/nfl-sim-auto.mjs
node --check sports/nfl/sim/auto.js
node --check social.js
node scripts/nfl-v87-selftest.mjs
npm run nfl:sim:test

FILES ADDED
-----------
sports/nfl/sim/halftime.js
scripts/nfl-halftime-odds-refresh.mjs
scripts/nfl-v87-selftest.mjs
supabase/functions/gambly-slip/index.ts
README-v87.txt

FILES MODIFIED BY INSTALLER
---------------------------
sports/nfl/sim/auto.js
scripts/nfl-sim-auto.mjs
sports/nfl/sim/config.json
package.json
.github/workflows/nfl-live.yml
social.js
index.html
