TSO v88.3d — Emergency NFL Import/Cache Fix
===========================================

Why this exists
---------------
Production showed:
  halftime-ui.js?v=88.3b does not provide ensureHalftimeLabStyles

Current GitHub main already contains the repaired export and newer v88.3c imports.
The remaining problem is the outer browser import chain: index.html can keep an
older cached sports/router.js URL, which then requests the stale v88.3b graph.

What this hotfix does
---------------------
- cache-busts index.html -> sports/router.js?v=88.3d
- cache-busts router -> nfl-preview.js?v=88.3d
- cache-busts preview -> halftime-ui.js?v=88.3d
- verifies/restores ensureHalftimeLabStyles as a defensive fallback
- does NOT alter Gamecast behavior, simulations, odds, or wager logic
