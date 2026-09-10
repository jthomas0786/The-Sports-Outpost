TSO v88.3a — GitHub Codespaces install
======================================

cd /workspaces/The-Sports-Outpost

git status

unzip -o TSO-v88.3a-NFL-Gamecast-TD-Feed-CORRECTED.zip -d .
node apply-v883a.mjs

node --check sports/nfl-preview.js
node --check sports/nfl/live.js
node --check sports/nfl/gamecast-v883a-styles.js
node --check scripts/nfl-live-poller.mjs
node --check scripts/nfl-v883a-selftest.mjs
npm run nfl:v88.3a:test

Deploy updated low-latency NFL endpoint:

supabase functions deploy nfl-live

Review:

git diff --stat
git status

Commit only product files:

git add \
  sports/nfl-preview.js \
  sports/nfl/live.js \
  sports/nfl/gamecast-v883a-styles.js \
  sports/nfl/gamecast-live-upgrade.js \
  scripts/nfl-live-poller.mjs \
  scripts/nfl-v883a-selftest.mjs \
  supabase/functions/nfl-live/index.ts \
  sports/router.js \
  package.json \
  README-v88.3a.txt

git commit -m "v88.3a: correct NFL Gamecast field and TD Feed"
git pull --rebase origin main
git push origin main
git status

If git add warns that sports/nfl/gamecast-live-upgrade.js no longer exists, use:

git add -u sports/nfl/gamecast-live-upgrade.js

then rerun the remaining git add paths and commit.
