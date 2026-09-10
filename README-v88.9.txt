TSO v88.9 — Native Field Geometry + Endzone Perspective Fix

This pass removes the v88.8 whole-stage 3D warp and returns the Gamecast field
to the exact 1672x415 perspective plane that the transparent stadium shell was
authored against. That keeps the field, LOS/line-to-gain, routes, players and
stadium aperture on one coordinate system.

Endzone corrections:
- PATRIOTS and SEAHAWKS now follow the true endzone centerline angle (~63.4°),
  rather than being forced to vertical 90° text.
- Team logos are moved into the upper third of each endzone and given a subtle
  perspective-aware cant.
- The v88.8 hard-coded lower endzone placements are explicitly removed on hot
  reload so a full browser restart is not required.

Player/animation behavior:
- Keeps the v88.8 role-aware player refinement.
- requestAnimationFrame enhancement scheduling remains in place.
- Prevents the old base sprite from flashing before the refined player is ready.

Run: npm run nfl:v88.9:test