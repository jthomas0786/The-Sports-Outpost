TSO v88.3c — Emergency Halftime Module Export Repair
====================================================

Fixes the NFL page import crash:
  halftime-ui.js does not provide an export named ensureHalftimeLabStyles

Cause:
v88.3b added new halftime helpers but accidentally dropped the existing
ensureHalftimeLabStyles function/export from sports/nfl/halftime-ui.js.
Because nfl-preview imports that symbol at module-load time, the entire NFL
preview failed before any tab could render.

This repair:
- restores ensureHalftimeLabStyles and the Halftime Parlay Lab drawer styles
- keeps the v88.3b halftime/live-state changes
- cache-busts halftime-ui.js to v88.3c
- cache-busts nfl-preview.js to v88.3c
