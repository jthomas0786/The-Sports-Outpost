The Sports Outpost — v88 Halftime Parlay Lab
=============================================

LOCATION
--------
NFL > Live.

When one or more games reach halftime, a compact "TSO Halftime Parlay Lab"
banner appears ABOVE the Live Games rail. It never covers the Gamecast field.

Desktop:
  right-side slide-out lab

Mobile:
  full-width bottom sheet

CONTROLS
--------
• 2–6 legs
• Max 1–3 games
• Manual game selection
• Modes:
    TSO Pick
    Safest
    Best Edge
    Balanced
    Longshot
    Correlated
• Regenerate returns a different qualifying combination WITHOUT rerunning 50K.

EXACT SAME-WORLD MATH
---------------------
v88 extends each v87 candidate with a packed hit/miss mask from the same 50,000
simulation worlds. A 50K mask uses only 6,250 bytes before base64.

This means any same-game 2–6 leg parlay chosen by the user is evaluated by
bitwise intersection of the ACTUAL same simulation worlds. It does not multiply
the individual leg probabilities.

For cross-game parlays:
  exact same-world joint probability is calculated inside each game,
  then independent game-level joints are multiplied across separate games.

The private raw per-player simulated stat arrays are still NOT published.

QUALITY / CONFLICT RULES
------------------------
• Uses v87 qualified candidate pool only.
• Direct contradictory player/market sides are rejected.
• v87 negative-correlation conflict pairs are rejected.
• Correlated mode rewards positive same-game lift.
• Regenerate excludes the prior generated signature.

RESULT CARD
-----------
Shows:
• each leg
• American sportsbook price
• TSO sim probability
• sportsbook fair/implied probability
• TSO edge
• grade
• positive-correlation badges
• joint sim probability
• independent product
• correlation advantage
• TSO parlay edge
• market-price parlay estimate
• TSO fair American odds

BETSLIP
-------
"Add Entire Parlay to Betslip" inserts all legs in one tap.

Live halftime props are marked sportsbook-only, so the TSO Point Wager button is
disabled for a slip containing those live props.

Gambly text handoff now preserves OVER / UNDER correctly and renders ATD as
"anytime touchdown".

FILES ADDED
-----------
sports/nfl/halftime-optimizer.js
sports/nfl/halftime-ui.js
scripts/nfl-v88-selftest.mjs
README-v88.txt

FILES MODIFIED
--------------
sports/nfl/sim/halftime.js
sports/nfl-preview.js
sports/router.js
index.html
package.json
