TSO v88.6a — PlayStage EXACT-CONCEPT PASS

This pass is specifically aimed at getting much closer to the approved concept image:
- stronger stadium background
- better field depth / perspective
- corrected goal posts
- cleaner end zones with team-color fills and vertical names only
- mini football-player figures instead of coins/dots
- possession football placed in the active team name area inside the header/root
- bottom cards kept in the approved concept layout

GITHUB CODESPACES COMMANDS

1) unzip
unzip -o /mnt/data/TSO-v88.6a-NFL-PlayStage-Exact-Concept-Pass.zip -d .

2) apply
node apply-v886a.mjs

3) selftest
node scripts/nfl-v886a-selftest.mjs

4) check git status
git status

5) commit + push
git add sports/nfl-preview.js sports/nfl/gamecast-v886a-styles.js sports/nfl/playstage-v886a.js scripts/nfl-v886a-selftest.mjs apply-v886a.mjs README-v88.6a-INSTALL.txt
git commit -m "v88.6a: refine NFL playstage toward exact approved concept"
git pull --rebase origin main
git push origin main

If git says you cannot pull with rebase because of unstaged changes, just add/commit first, then run the same pull --rebase and push.
