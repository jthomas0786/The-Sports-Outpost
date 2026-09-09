TSO v88.2 — NFL Demo / Screenshot Mode
======================================

Goal
----
Give you a way to view the real current NFL UI even when no live game is in progress.
This hotfix adds a hidden demo mode for:

1) Live Gamecast preview
2) Halftime Parlay Lab preview
3) Combined mode

What it does
------------
- Adds a hidden client-side query param: `nflDemo`
- Demo modes:
  - `?nflDemo=gamecast`
  - `?nflDemo=halftime`
  - `?nflDemo=all`
- Uses demo fixture state in the browser only
- Does NOT place wagers
- Does NOT spend live halftime build resources
- Does NOT write demo results into production data
- Auto-opens the Halftime Parlay Lab in halftime/all demo mode

Suggested URLs
--------------
Use these while on the NFL experience:

- https://thesportsoutpost.com/?nflDemo=gamecast
- https://thesportsoutpost.com/?nflDemo=halftime
- https://thesportsoutpost.com/?nflDemo=all

Notes
-----
- `gamecast` forces the NFL page into the Live tab and hydrates a live-looking demo game.
- `halftime` forces the NFL page into the Live tab and opens the exact v88 Halftime Parlay Lab with demo halftime boards.
- `all` does both.
- The drawer remains the same real production component from v88.
- This is built so you can finally capture screenshots on demand.

Files included
--------------
- `sports/nfl/demo-mode.js` (new)
- `scripts/nfl-v882-selftest.mjs` (new)
- `apply-v882.mjs`
- `README-v88.2.txt`
- `README-v88.2-INSTALL.txt`
