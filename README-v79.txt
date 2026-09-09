TSO v79 — NFL Odds + Gameday Preflight

Files:
- scripts/nfl-odds-refresh.mjs
- .github/workflows/nfl-odds.yml
- scripts/nfl-gameday-check.mjs
- scripts/apply-v79-nfl-prop-odds-ui.mjs (one-time installer; run then remove)

Install:
1) unzip package at repository root
2) node scripts/apply-v79-nfl-prop-odds-ui.mjs
3) rm scripts/apply-v79-nfl-prop-odds-ui.mjs
4) node --check scripts/nfl-odds-refresh.mjs
5) node --check scripts/nfl-gameday-check.mjs
6) node --check sports/nfl-research-ui.js
7) node --check sports/router.js

Secret:
  gh secret set PARLAY_API_KEY
Never commit or paste the key into source.

First forced refresh:
  gh workflow run "NFL Odds Refresh" -f force=true

Gameday check after odds workflow finishes:
  node scripts/nfl-gameday-check.mjs --date 2026-09-09
