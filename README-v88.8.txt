TSO v88.8 — NFL Gamecast Refinement

Targets:
- Better field angle / stage perspective without changing v88.6e coordinate math.
- Cleaner endzone team names and logos.
- More realistic on-field player sprites, closer to the approved concept.
- Smoother enhancement refresh behavior via requestAnimationFrame scheduling.

Files:
- sports/nfl-preview-v888.js
- sports/nfl/gamecast-v888-enhancer.js
- sports/nfl/gamecast-v888-styles.js
- sports/router.js
- scripts/nfl-v888-selftest.mjs
- package.json

Workflow:
1. Unzip this package at the repository root.
2. Run: npm run nfl:v88.8:test
3. Commit and push.
