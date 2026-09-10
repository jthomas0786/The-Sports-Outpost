TSO v88.7 — NFL Gamecast Player + Field Overlay Refinement

GOAL
Move the live Game View closer to the approved concept without touching the
working v88.6e data pipeline, simulation wiring, lower information panels, or
regulation-field coordinate model.

PLAYERS
- Replaces the v88.6e on-field SVG presentation at runtime with taller,
  football-proportioned vector athletes.
- Role-aware silhouettes for QB, OL, RB/TE/WR, DL, LB, and DB positions.
- More realistic helmet shell, dark visor/opening, facemask, shoulder pads,
  jersey depth, pants, limbs, cleats, shadows, and QB football.
- Preserves team colors and existing helmet logo URLs extracted from the
  live v88.6e sprite, so every matchup stays dynamic.
- Keeps the original live coordinate/formation positions and focus-ring logic.
- Route ghosts remain neutral and translucent rather than team-colored clones.

FIELD OVERLAY
- Deepens turf with a clipped broadcast texture/vignette while preserving the
  exact 120-yard regulation geometry underneath.
- Rebalances z-order: turf FX -> down lines -> stadium shell -> scrim/routes -> players.
- Strengthens the cyan LOS and yellow line-to-gain into cleaner broadcast beams.
- Keeps beams below players so they never cut across bodies.
- Tightens the pass-route treatment and preserves the football-shaped live ball.

ARCHITECTURE
- sports/nfl-preview-v887.js wraps the proven v88.6e preview module.
- sports/nfl/gamecast-v887-enhancer.js enhances every v88.6e PlayStage after render
  and watches for live DOM refreshes with MutationObserver.
- sports/nfl/gamecast-v887-styles.js contains only v88.7 overrides.
- sports/router.js now loads nfl-preview-v887.js?v=88.7.

This approach is deliberately low-risk: v88.6e remains the source of truth for
live data, field positions, Gamecast panels, simulation output, and play updates.
