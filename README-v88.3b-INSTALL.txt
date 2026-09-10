TSO v88.3b Install — GitHub Codespaces
======================================

This package is intended to be applied after v88.3a.

1) Repo root

cd /workspaces/The-Sports-Outpost

2) Unzip / apply / test

unzip -o TSO-v88.3b-NFL-Gamecast-3D-Field-Halftime-Lab-CORRECTED.zip -d .
node apply-v883b.mjs

node --check sports/nfl-preview.js
node --check sports/nfl/halftime-ui.js
node --check sports/nfl/gamecast-v883b-styles.js
node --check scripts/nfl-sim-auto.mjs
node --check scripts/nfl-v883b-selftest.mjs
npm run nfl:v88.3b:test

3) If v88.3a nfl-live Edge Function has NOT been deployed yet

npx supabase@latest functions deploy nfl-live \
  --project-ref hjhfbhpuuxnrexddplxd \
  --no-verify-jwt

4) Check whether the ParlayAPI secret exists in GitHub Actions

gh secret list | grep PARLAY_API_KEY

If that prints nothing, the live halftime sportsbook refresh cannot build the
actual candidate board until PARLAY_API_KEY is added to the repository secrets.
Do not put the key in source code.

5) Review

git diff --stat
git status

6) Commit / rebase / push

git add \
  sports/nfl-preview.js \
  sports/nfl/halftime-ui.js \
  sports/nfl/gamecast-v883b-styles.js \
  scripts/nfl-sim-auto.mjs \
  scripts/nfl-v883b-selftest.mjs \
  .github/workflows/nfl-live.yml \
  sports/router.js \
  package.json \
  README-v88.3b.txt

git commit -m "v88.3b: fix 3D Gamecast and halftime lab visibility"
git pull --rebase origin main
git push origin main
git status

If push is rejected:

git pull --rebase origin main
git push origin main
