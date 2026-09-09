The Sports Outpost — v84 NFL Gamecast Clean-Field / Final-State Fix

Base: v83

CHANGED FILES
- index.html
- sports/router.js
- sports/nfl-preview.js

WHAT v84 FIXES
1. Completed NFL games no longer fall back to the Pregame / HOME 50 situation chip.
   - Regulation finals render FINAL + Game Complete.
   - Overtime finals render FINAL/OT + Overtime Complete.
   - The field status tag also renders FINAL or FINAL / OT.
   - Final/pregame states do not draw fake live line-of-scrimmage / first-down / route / player markers.

2. Gamecast field is now clean by default.
   - The four large scoring/drive/metrics/player overlay boxes were removed from the field surface.
   - Live field, LOS, first-down line, player markers, play path and field legend remain visible during active play.

3. New toggleable GAME INTEL UI.
   DESKTOP:
   - Game Intel button in the Gamecast toolbar.
   - Opens an inline dock below the field, so the field is never covered.
   - One panel at a time: Drive / Scoring / Players / Team.

   MOBILE:
   - Full-width Game Intel launch bar below the scaled Gamecast.
   - Opens a native-size bottom sheet with backdrop.
   - Tabs are thumb-friendly and content scrolls independently.
   - Same data as desktop, different presentation for small screens.

CACHE BUSTING
- index.html now loads sports/router.js?v=84
- sports/router.js now loads sports/nfl-preview.js?v=84

No wager/pricing/Supabase files from v83 were changed.
