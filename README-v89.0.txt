TSO v89.0 — Clean Field Layer Architecture
STATUS: COMPLETE

This pass restructures the NFL Gamecast around one clean visible field surface while preserving the existing live Gamecast geometry engine underneath it.

LAYER ORDER
1. Approved 1672×415 clean stadium/field artwork — reconstructed once from cached AVIF base64 chunks.
2. Dynamic away/home team logos — placed in the reserved blank end-zone logo areas from the current matchup.
3. Live line of scrimmage / line-to-gain overlay.
4. Route / pass overlay.
5. Players, focus rings, labels and live football.

IMPORTANT
- The original v88.6e SVG field stays mounted but is hidden. It remains the gameplay coordinate/data source.
- The old stadium-shell image with baked players is disabled.
- The approved clean artwork contains static Sports Outpost end-zone branding and TSO midfield mark, with no baked-in players or team-specific logos.
- Dynamic team logos are extracted from live game data so each matchup changes automatically.
- v88.9/v88.8 player refinement remains in place.
- Older field warp / scrim experiments are removed so there is only one visible field plane.
- The field artwork is stored as gamecast-field-v890.b64.00–06 and reconstructed client-side into the approved AVIF image; chunks are browser-cached.

TEST
npm run nfl:v89.0:test
