TSO v88.3 — NFL Smooth Gamecast Drive Tracker
==============================================

Goal
----
Replace the old center-field presentation on NFL Live/Gamecast with a cleaner
ESPN-style current-drive tracker in TSO's theme, while preserving the existing
score header.

What's included
---------------
1) New TSO-styled current-drive panel:
   - current drive summary
   - play type/title
   - down & distance
   - ball-on field position
   - line of scrimmage
   - first-down line
   - animated ball marker
   - play path indicator
   - last play / win % card
   - featured player summary card

2) Possession indicator in the existing header:
   - small football pill
   - updates to show which team has the ball

3) Smoother updates:
   - preserves the existing top score header
   - incremental DOM updates for the drive panel
   - animated field marker movement instead of jumpy snapping

Notes
-----
- The module mounts beneath the existing score header and leaves the score
  header untouched.
- It attempts to hide older legacy field containers when they match common
  legacy selector names.
- It gracefully degrades when some live feed fields are missing.

Files included
--------------
- sports/nfl/gamecast-live-upgrade.js (new)
- scripts/nfl-v883-selftest.mjs (new)
- apply-v883.mjs
- README-v88.3.txt
- README-v88.3-INSTALL.txt
