TSO v88.3b — NFL 3D Gamecast + Halftime Lab Visibility Fix
===========================================================

Purpose
-------
Correct the v88.3a Gamecast field and make the Halftime Parlay Lab reliably
visible from BOTH NFL Live and the open Gamecast.

Gamecast corrections
--------------------
- Replaces the flat Game View field with a 3D/perspective field.
- Keeps away and home end zones as separate regions.
- Maps LOS, first-down line, ball marker, and play path ONLY inside the
  100-yard playable field, so overlays cannot render inside an end zone.
- Aligns the Gamecast body border to the same horizontal width as the existing
  scoreboard header.
- Keeps the existing 2-second incremental live-patch path from v88.3a.
- Suppresses/removes the old floating "NE ball" style possession pill.
- Keeps possession as a tiny football emoji INSIDE the team name only.
- Preserves the v88.3a TD Feed styling and player/odds work.

Halftime Parlay Lab corrections
-------------------------------
- Halftime visibility no longer depends on slates/nfl-halftime.json already
  existing. The UI detects halftime from the live game state first.
- NFL Live immediately shows "Halftime Model Calculating" at halftime.
- The open Gamecast also shows a compact halftime status bar directly beneath
  the unchanged score header.
- When the candidate board becomes ready, the status changes automatically to
  "HALFTIME PARLAY LAB READY" with a Build Parlay button.
- Halftime board polling is reduced from 30 seconds to 5 seconds.
- Entering/leaving halftime triggers one full Gamecast render so the halftime
  CTA appears/disappears; normal play updates remain smooth DOM patches.

Backend reliability
-------------------
- The 50K halftime simulation waits until a real halftime sportsbook prop board
  is available. Missing odds no longer burns the 3 simulation retry attempts.
- A temporary halftime odds-refresh failure no longer prevents the rest of the
  five-minute NFL heartbeat from running.

Important diagnostic
--------------------
At package-build time, GitHub main did NOT contain either:
  slates/nfl-live-odds.json
  slates/nfl-halftime.json
That is why the current v88 UI can remain completely invisible at halftime:
its old banner logic required the halftime JSON before it would render anything.
This package fixes that UI failure and makes the backend waiting state explicit.

No Supabase function code is changed by v88.3b. If you have not yet deployed the
v88.3a nfl-live Edge Function, use npx Supabase as described in the install file.
