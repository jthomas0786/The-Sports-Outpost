TSO v88.5 install

1) unzip this package at the repository root
2) run: node apply-v885.mjs
3) run checks:
   node --check sports/nfl/gamecast-v885-styles.js
   node --check sports/nfl/playstage-v885.js
   node --check sports/nfl-preview.js
   node scripts/nfl-v885-selftest.mjs

Then review git diff, commit, pull --rebase, and push.
Hard refresh the browser after deploy so the import-chain cache bust to v88.5 loads.
