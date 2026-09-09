The Sports Outpost — v88.1 NFL Weekly Odds Hotfix
==================================================

WHY THIS WAS NEEDED
-------------------
The NFL Props product became Tuesday->Monday weekly, but nfl-odds-refresh.mjs
still discovered only the next 24 hours. That meant Sunday/Monday players could
exist in the modeled Props list while their games were outside the odds window.

There was also a stale-refresh problem close to kickoff:
  >6 hours away used a 4-hour paid refresh threshold.
At roughly 8 hours before NE @ SEA, the site could therefore keep a several-hour
old odds file even though new sportsbook markets had appeared.

WHAT CHANGES
------------
• Active NFL odds window = Tuesday 3:00 AM Central -> next Tuesday 3:00 AM.
• Free /events discovery covers that entire window.
• All currently published sportsbook prop rows for the sport are requested in
  one /props call.
• DFS/exchange sources are excluded at request time to save response capacity
  and prevent Novig/etc. from being labeled sportsbook pricing.
• Game h2h/spread/total request uses the entire weekly window.
• Refresh cadence:
    >12h to next kickoff: every 4h
    <=12h: hourly
    <=3h: every 30m
    <=90m: every 20m
• GitHub's free gate runs at :07, :27 and :47 each hour; paid calls remain gated.
• First run after this hotfix MUST rebuild because old 24h output lacks the
  weekly metadata key.
• Props UI wording changes "Not posted" -> "Sportsbook pending".

IMPORTANT
---------
This cannot manufacture a sportsbook price that ParlayAPI does not have.
If ParlayAPI returns only Novig/exchange rows for ATD/pass-yards, TSO will still
show Sportsbook pending rather than mislabeling an exchange quote as a sportsbook.

FILES ADDED
-----------
scripts/nfl-week-window.mjs
scripts/nfl-v881-selftest.mjs
README-v88.1.txt

FILES MODIFIED
--------------
scripts/nfl-odds-refresh.mjs
.github/workflows/nfl-odds.yml
sports/nfl-preview.js
package.json
