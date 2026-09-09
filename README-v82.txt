TSO v82 — NFL Odds Diagnostics + Slate Repair

Slate repair
------------
v81 added sportsbook odds + an ATD wager button as a fourth content lane inside
each NFL Slate player row, but the older Slate CSS was still hard-coded for only
three rows and a ~70px card height. That caused player information/odds to crowd
or overlap and made the two-column board fragile at smaller widths.

v82:
- lets the player identity lane size naturally
- gives odds/wager content its own protected height
- keeps grade rings and TSO Edge vertically centered
- allows badges/odds to wrap safely
- stacks team threat boards sooner at medium widths
- tightens the mobile layout without clipping
- improves the Game Odds tile at narrow widths
- bumps the NFL module cache to v82

Odds diagnostics
----------------
The paid ParlayAPI response is now summarized per game and per requested market.
For each market v82 records/logs:
- raw rows returned
- rows from accepted sportsbooks
- rows rejected as exchange/DFS/non-sportsbook
- accepted source names/counts
- excluded source names/counts

The gameday checker now distinguishes:
1. zero rows returned by ParlayAPI
2. rows returned only by excluded sources
3. sportsbook rows returned but lost by our parser (this is treated as a failure)

This does NOT invent or substitute stale/fake ATD/pass-yards prices when standard
sportsbooks have not posted a fresh row.

Changed files
-------------
sports/nfl-preview.js
sports/router.js
scripts/nfl-odds-refresh.mjs
scripts/nfl-gameday-check.mjs
