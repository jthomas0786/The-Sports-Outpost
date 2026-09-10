TSO v88.4 — Gamecast Polish + Rolling Halftime Parlay Lab
=========================================================

GAMECAST
--------
- Existing score header remains structurally unchanged.
- Possession is shown by ONE small football emoji beside the team name that has the ball:
  away team -> football on the inside/right side of the name
  home team -> football on the inside/left side of the name
- Team-color end zones.
- Team name runs horizontally across each end zone.
- Team logo remains a subtle watermark behind the end-zone name.
- Stronger 3D/perspective field treatment.
- Line of scrimmage and first-down line remain clipped to the playable 100-yard field.
- Ball marker uses a visual-safe clamp so it cannot disappear beneath end-zone art at either goal line.
- Gamecast body gutter/border aligns with the existing 16px score-header gutter.

HALFTIME PARLAY LAB
-------------------
- UI appears at 2:00 or less in Q2 as "Halftime Parlay Lab Warming Up".
- Backend sportsbook prefetch begins at <=5:00 in Q2 because the GitHub heartbeat runs every five minutes.
- Full 50,000-world simulation still waits for official halftime.
- Simulation will NOT burn 50K runs while staged live sportsbook props are missing.
- Rolling Sunday window supports every simultaneous Q2/halftime game.
- No arbitrary max-games control.
- No arbitrary 6-leg cap.
- User can choose any leg count up to the currently qualified candidate pool.
- "Use every selected READY game" is ON by default, guaranteeing at least one leg per selected ready game when mathematically possible.
- Same-game legs still use exact same-world masks; separate games are combined only after each game's exact joint is known.
- Warmup, halftime-calculating, and ready games can coexist in the same drawer.
- Select All / Clear controls included.

FILES ADDED
-----------
sports/nfl/gamecast-v884-styles.js
sports/nfl/halftime-ui-v884.js
sports/nfl/halftime-optimizer-v884.js
scripts/nfl-halftime-window-refresh.mjs
scripts/nfl-v884-selftest.mjs
README-v88.4.txt

FILES MODIFIED BY INSTALLER
---------------------------
sports/nfl-preview.js
sports/nfl/sim/auto.js
scripts/nfl-sim-auto.mjs
.github/workflows/nfl-live.yml
sports/router.js
index.html
package.json

NOTES
-----
The prior v88/v88.3 halftime modules are intentionally left in place for rollback/history.
Production NFL imports v88.4 after installation.
No Supabase function change is required for v88.4.
