THE SPORTS OUTPOST — v85 NFL SIMULATION ENGINE CORE
====================================================

WHAT THIS BUILD ADDS
--------------------
1. Correlated NFL Monte Carlo engine under sports/nfl/sim/.
2. Pregame score / winner / spread / total simulation.
3. Player distributions for:
   - passing yards, completions, attempts, pass TDs, interceptions
   - rushing yards, carries, rushing TDs
   - receiving yards, receptions, targets, receiving TDs
   - anytime TD and 2+ TD probability
4. Sportsbook-line comparison when slates/nfl-odds.json contains a line.
5. LIVE-STATE support using the existing Supabase nfl-live endpoint.
   Current box-score stats are added to every world and only the remaining
   game fraction is simulated. This is the foundation for halftime parlays.
6. Same-world correlation hooks. jointProbabilityFromResult() tests multiple
   legs against the SAME simulated worlds instead of multiplying marginals.
7. CLI builder: scripts/nfl-simulate.mjs -> slates/nfl-sim.json.
8. Deterministic self-test: scripts/nfl-sim-selftest.mjs.

IMPORTANT V85 SCOPE
-------------------
This is the engine core, not the final calibrated model and not yet the
Half Time Parlay Generator UI. v85 intentionally builds the data/simulation
foundation first so the parlay generator can rank real same-world joint
probabilities in the next layer.

DATA INPUTS
-----------
- slates/nfl.json          current NFL slate / TSO ATD model / teams
- slates/nfl-research.json player history, last-5, depth, snaps, matchup
- slates/nfl-odds.json     game lines + player prop lines from ParlayAPI
- Supabase nfl-live        live score, clock, situation and player box score

QUICK TEST
----------
npm run nfl:sim:test

RUN ONE GAME
------------
npm run nfl:sim -- --game NE-SEA --iterations 25000

RUN ALL CURRENT SLATE GAMES
---------------------------
npm run nfl:sim -- --iterations 25000

FORCE PREGAME/STATIC MODE (IGNORE LIVE ENDPOINT)
-------------------------------------------------
npm run nfl:sim -- --game NE-SEA --no-live --iterations 25000

HIGHER CONFIDENCE RUN
---------------------
npm run nfl:sim -- --game NE-SEA --iterations 50000

OUTPUT
------
slates/nfl-sim.json

HALFTIME FOUNDATION
-------------------
At halftime the existing nfl-live payload reports period=2, clockMin=0 and
first-half player stats. The engine computes remainingFraction=0.5, preserves
those first-half stats in every simulation world, then simulates the second
half. The resulting final-stat distributions can be compared directly with
live halftime sportsbook lines.

The exported same-world jointProbabilityFromResult() function is specifically
for the upcoming TSO Half Time Parlay Generator. Example logic:
  - simulate 25k-50k second halves
  - score every available live prop leg in each same world
  - reject conflicting / low-edge combinations
  - rank candidate 2/3/4/5/etc. leg parlays by joint probability and edge
  - allow user filters for number of legs and selected games

MODEL NOTE
----------
v85 is deliberately transparent and modular. It uses market-anchored scoring,
game-script-adjusted pass/run rates, player usage history, depth, snap trends,
matchup context and live stats. Calibration/backtesting will tune the weights.
Do not present v85 probabilities as guaranteed outcomes.
