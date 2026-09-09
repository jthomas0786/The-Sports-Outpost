The Sports Outpost — v86 NFL Automatic Simulation + Probability Integration
=========================================================================== 

WHAT v86 ADDS
-------------
1. Automatic simulation orchestration is attached to the existing 5-minute
   NFL Live Snapshot heartbeat. There is no second 24/7 scheduled workflow.
2. Important pregame simulation runs are 50,000 worlds per game:
      • first time slate + research + real sportsbook odds are ready
      • ~180 minutes before kickoff
      • ~90 minutes before kickoff
      • ~15 minutes before kickoff
      • after a material slate/research/odds input change (10-minute throttle)
3. Halftime automatically runs 50,000 correlated remainder-of-game worlds.
4. Other live-state changes run 15,000 worlds (5-minute heartbeat / 4-minute
   minimum rerun interval) so the cache can evolve with the game.
5. slates/nfl-sim.json is the public simulation cache. The automation state is
   stored in slates/nfl-sim-state.json so checkpoints do not repeat.
6. NFL prop cards now read nfl-sim.json and blend the latest matching-line
   simulation probability with the existing TSO model/research probability.
   Initial v86 blend: 70% simulation / 30% existing TSO model.
7. Numeric player props only consume a simulation probability when the
   sportsbook line exactly matches the line used by the simulation (0.01
   tolerance). This prevents a stale simulated probability from being shown
   against a newly moved line.
8. ATD uses the correlated simulation TD result directly in the same 70/30
   blend. First-TD remains a separate TSO first-score model, but it becomes
   indirectly sim-informed through the blended ATD probability.
9. Manual recovery/force workflow: “NFL Simulation Manual Run”.

AUTOMATIC SCHEDULE
------------------
The existing .github/workflows/nfl-live.yml already wakes every five minutes.
v86 adds scripts/nfl-sim-auto.mjs to that same job. Most invocations are cheap
no-ops. A 50K job only executes when the scheduler says it is needed.

Pregame:
  First ready       50,000
  T-180 minutes     50,000
  T-90 minutes      50,000
  T-15 minutes      50,000
  Material change   50,000 (10-minute throttle)

Live:
  Normal changed state   15,000
  Halftime               50,000
  Final                   no new simulation

HALFTIME BEHAVIOR
-----------------
At halftime the simulator preserves the real first-half score and player box
stats, then simulates the remaining 50% of the game. Final player prop
probabilities therefore represent actual first-half production + simulated
second-half outcomes.

Important: v86 uses the sportsbook lines currently present in
slates/nfl-odds.json. The dedicated halftime live-line pull / parlay optimizer
is the next layer (v87+). The simulation engine itself is now ready for it.

PROBABILITY BLEND
-----------------
Initial v86 production blend:
  70% latest matching-line Monte Carlo probability
  30% existing TSO model/research probability

This is intentionally configurable in sports/nfl/sim/config.json. Once enough
completed games exist, calibrate the weight separately for pass yards, rush
yards, receiving yards, receptions, passing TDs, ATD, etc. Do not assume 70/30
is permanently optimal.

FILES CHANGED / ADDED
---------------------
.github/workflows/nfl-live.yml
.github/workflows/nfl-sim.yml
package.json
scripts/nfl-simulate.mjs
scripts/nfl-sim-auto.mjs
scripts/nfl-sim-auto-selftest.mjs
sports/nfl/sim/auto.js
sports/nfl/sim/config.json
sports/nfl/sim/engine.js
sports/nfl/sim/index.js
sports/nfl-preview.js
sports/router.js
README-v86.txt

TESTS
-----
npm run nfl:sim:test

Expected ending:
  ✓ NFL simulation self-test passed
  ✓ NFL automatic simulation scheduler self-test passed

Manual scheduler dry run (does not write cache):
  npm run nfl:sim:auto -- --dry-run

Manual force of a single game:
  NFL_SIM_FORCE=1 npm run nfl:sim:auto -- --game NE-SEA

Manual normal 50K pregame run:
  npm run nfl:sim -- --game NE-SEA --no-live

GITHUB CODESPACES INSTALL
-------------------------
From /workspaces/The-Sports-Outpost:

  git pull --rebase origin main
  unzip -o TSO-v86-NFL-Automatic-Simulation-Probability-Integration-CHANGED-FILES-ONLY.zip -d .
  npm run nfl:sim:test
  git status
  git add .github/workflows/nfl-live.yml .github/workflows/nfl-sim.yml package.json README-v86.txt scripts/nfl-simulate.mjs scripts/nfl-sim-auto.mjs scripts/nfl-sim-auto-selftest.mjs sports/nfl/sim/auto.js sports/nfl/sim/config.json sports/nfl/sim/engine.js sports/nfl/sim/index.js sports/nfl-preview.js sports/router.js
  git commit -m "v86: automate NFL simulations and blend prop probabilities"
  git push origin main
  git status

If push is rejected because another bot/workflow pushed first:

  git pull --rebase origin main
  git push origin main

AUTOMATION AFTER PUSH
---------------------
Once v86 is on main, the existing NFL Live Snapshot workflow will check the
simulation scheduler every five minutes automatically. No manual command is
required for the T-180 / T-90 / T-15 / halftime runs.
