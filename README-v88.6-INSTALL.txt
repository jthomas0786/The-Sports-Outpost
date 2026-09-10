TSO v88.6 — Cinematic PlayStage Gamecast

WHAT THIS DOES
- upgrades NFL Gamecast to a cinematic PlayStage presentation
- adds stadium background, light towers, goal posts, team-color end zones
- removes the floating end-zone logos and uses cleaner end-zone wordmarks
- adds mini cartoon-style football players instead of dots/coins
- keeps the existing score header and places the possession football inside the active team name
- keeps the bottom analytics cards in the approved concept style

GITHUB CODESPACES — UNZIP / APPLY / CHECK / COMMIT / PUSH

1) unzip the package in your repo root:
unzip -o /mnt/data/TSO-v88.6-NFL-Cinematic-PlayStage-Gamecast.zip -d .

2) apply the patch:
node apply-v886.mjs

3) run a quick selftest:
node scripts/nfl-v886-selftest.mjs

4) inspect changes:
git status

5) if push is behind remote, do this safe flow:
git add sports/nfl-preview.js sports/nfl/gamecast-v886-styles.js sports/nfl/playstage-v886.js scripts/nfl-v886-selftest.mjs apply-v886.mjs README-v88.6-INSTALL.txt
git commit -m "v88.6: add cinematic NFL PlayStage gamecast"
git pull --rebase origin main
git push origin main

6) if you get 'cannot pull with rebase: You have unstaged changes', run this instead:
git add sports/nfl-preview.js sports/nfl/gamecast-v886-styles.js sports/nfl/playstage-v886.js scripts/nfl-v886-selftest.mjs apply-v886.mjs README-v88.6-INSTALL.txt
git commit -m "v88.6: add cinematic NFL PlayStage gamecast"
git pull --rebase origin main
git push origin main

NOTES
- the possession football is rendered only inside the active team name area.
- the new field uses mini player figures and a route path, not the old dot board.
- this is the visual/cinematic pass. if you want, the next pass can focus on smoother frame-to-frame tweening and expanded play-type templates.
