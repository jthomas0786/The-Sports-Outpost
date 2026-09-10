TSO v88.4 — GitHub Codespaces Install
======================================

IMPORTANT: run from /workspaces/The-Sports-Outpost.

1) Sync first if your tree is clean:
   git status
   git pull --rebase origin main

2) Unzip / apply:
   unzip -o TSO-v88.4-Gamecast-Rolling-Halftime-Lab-CHANGED-FILES-ONLY.zip -d .
   node apply-v884.mjs

3) Syntax + self-test:
   node --check sports/nfl/gamecast-v884-styles.js
   node --check sports/nfl/halftime-ui-v884.js
   node --check sports/nfl/halftime-optimizer-v884.js
   node --check scripts/nfl-halftime-window-refresh.mjs
   node --check scripts/nfl-sim-auto.mjs
   node --check sports/nfl/sim/auto.js
   node --check sports/nfl-preview.js
   npm run nfl:v88.4:test

4) Confirm ParlayAPI secret still exists:
   gh secret list | grep PARLAY_API_KEY

5) Review:
   git diff --stat
   git status

6) Commit / push:
   git add \
     sports/nfl/gamecast-v884-styles.js \
     sports/nfl/halftime-ui-v884.js \
     sports/nfl/halftime-optimizer-v884.js \
     sports/nfl-preview.js \
     sports/nfl/sim/auto.js \
     scripts/nfl-halftime-window-refresh.mjs \
     scripts/nfl-sim-auto.mjs \
     scripts/nfl-v884-selftest.mjs \
     .github/workflows/nfl-live.yml \
     sports/router.js \
     index.html \
     package.json \
     README-v88.4.txt

   git commit -m "v88.4: polish Gamecast and add rolling halftime lab"
   git pull --rebase origin main
   git push origin main
   git status

If the pull/rebase reports a conflict, STOP and inspect the conflict before editing around it.

No Supabase function deploy is required for this version.
