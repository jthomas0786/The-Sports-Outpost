TSO v88.3 Install (GitHub Codespaces)
=====================================

1) Put the ZIP in the repo root, then run:

unzip -o TSO-v88.3-NFL-Smooth-Gamecast-Drive-Tracker.zip
node apply-v883.mjs
npm run nfl:v88.3:test

2) Run the app and inspect NFL Live / Gamecast.

3) Commit / push:

git add .
git commit -m "v88.3: add smooth NFL drive tracker and possession pill"
git pull --rebase origin main
git push origin main

If rebase pauses for conflicts, resolve them, then run:

git add .
git rebase --continue
