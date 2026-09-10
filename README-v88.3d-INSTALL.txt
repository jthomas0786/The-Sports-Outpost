TSO v88.3d Install — GitHub Codespaces
======================================

cd /workspaces/The-Sports-Outpost
git pull --rebase origin main

unzip -o TSO-v88.3d-NFL-Import-Cache-EMERGENCY-FIX.zip -d .
node apply-v883d.mjs

node --check sports/nfl/halftime-ui.js
node --check sports/nfl-preview.js
node --check sports/router.js
npm run nfl:v88.3d:test

git add index.html sports/router.js sports/nfl-preview.js sports/nfl/halftime-ui.js package.json scripts/nfl-v883d-selftest.mjs README-v88.3d.txt
git commit -m "v88.3d: force fresh NFL halftime import chain"
git push origin main
git status
