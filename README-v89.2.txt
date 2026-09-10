The Sports Outpost — v89.2 NFL Alternate Prop Betslip Bridge
============================================================

WHAT CHANGED
------------
• Selecting an alternate NFL prop line now rewrites the Player Modal Add-to-Slip CTA.
• The CTA label reflects the selected side + line (example: Add Over 39.5 Receiving Yards to Slip).
• The wager payload now uses the selected alternate line, sportsbook price, book, side, and alternate-line TSO probability.
• Under alternates receive a distinct wager ID so Over/Under selections cannot collide in the betslip.
• The selected alternate remains synchronized after modal rerenders (chart filters / DOM refreshes).
• Existing main-line behavior remains unchanged when the selected alternate is the primary Over line.

FILES
-----
sports/nfl-alt-props-v892.js
sports/router.js
scripts/nfl-v892-selftest.mjs
package.json
README-v89.2.txt

TEST
----
npm run nfl:v89.2:test
