# NFL Gamecast Chibi Asset Library

Production asset root for The Sports Outpost NFL Gamecast.

## Directory contract

`<TEAM>/<player-slug>/actions/<action>/`

Each action directory is reserved for:
- `sprite.webp` or `sprite.png` for a single still/state
- `frame-001.webp ... frame-N.webp` for frame animation
- `animation.webm` for the production clip when available
- `animation.json` for timing, anchors, loop behavior, and event triggers

Team-level `roster.json` is the source of truth for:
- current 53-man snapshot
- jersey number / position
- action inventory
- appearance-reference policy
- verified signature celebrations

## Visual rules

- Realistic 3D chibi style, consistent league-wide.
- Transparent backgrounds for production actor assets.
- Skin tone should be matched to the player's current official headshot as closely as practical.
- Never infer appearance from a player's name.
- Player number and position must match the roster snapshot.
- Keep camera, lighting, scale and foot anchor consistent so Gamecast can swap actors without layout jumps.
- Primary stars get player-specific signature celebrations. Everyone else begins with position archetype animations and can be upgraded individually.

## Dallas pilot

DAL is the first production team and defines the quality bar for the other 31 NFL teams.
