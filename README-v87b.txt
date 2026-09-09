TSO v87b — Scheduler Self-Test Compatibility
=============================================

This does NOT change production simulation logic.

v87 intentionally changed halftime behavior:
  • 50K runs at halftime
  • if fresh sportsbook candidate data is not ready, retry
  • once candidate board is ready, mark that halftime state complete

The older v86 self-test still expected the first halftime run to always stop
future runs. v87b updates that test to validate the new v87 retry semantics.

FILE MODIFIED
-------------
scripts/nfl-sim-auto-selftest.mjs

TEST
----
node scripts/nfl-sim-auto-selftest.mjs
npm run nfl:sim:test
npm run nfl:v87:test
