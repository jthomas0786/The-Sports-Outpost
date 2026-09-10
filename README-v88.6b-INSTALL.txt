TSO v88.6b — NFL PlayStage Exact-Concept Rebuild

This pass pushes harder toward the approved PlayStage concept:
- stronger cinematic stadium boards and lighting
- deeper field perspective
- corrected end zones with team-color fills + vertical team names
- proper goal posts
- mini football-player figures instead of flat dots/coins
- possession football attached to the active team name inside the score header/root
- concept-style lower analytics cards and halftime callout

GITHUB CODESPACES COMMANDS

1) unzip
unzip -o /mnt/data/TSO-v88.6b-NFL-PlayStage-Exact-Concept-Rebuild.zip -d .

2) apply
node apply-v886b.mjs

3) selftest
node scripts/nfl-v886b-selftest.mjs

4) check status
git status

5) commit + push
git add sports/nfl-preview.js sports/nfl/gamecast-v886b-styles.js sports/nfl/playstage-v886b.js scripts/nfl-v886b-selftest.mjs apply-v886b.mjs README-v88.6b-INSTALL.txt
git commit -m "v88.6b: rebuild NFL playstage closer to approved concept"
git pull --rebase origin main
git push origin main

If Git says you have unstaged changes before pull --rebase, commit first, then rerun the pull --rebase and push steps.
