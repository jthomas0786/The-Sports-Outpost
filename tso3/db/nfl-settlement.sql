-- TSO 3.0 isolated postgame settlement audit. Predictions and settled grades are immutable.
-- Run against ONLY the tso3-nfl-pregame-archive D1 binding.
CREATE TABLE IF NOT EXISTS settlement_runs (
 run_id TEXT PRIMARY KEY,
 started_at TEXT NOT NULL,
 completed_at TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('settled','nothing_final','partial','failed')),
 checked_games INTEGER NOT NULL DEFAULT 0,
 final_games INTEGER NOT NULL DEFAULT 0,
 eligible_predictions INTEGER NOT NULL DEFAULT 0,
 inserted_outcomes INTEGER NOT NULL DEFAULT 0,
 unresolved_predictions INTEGER NOT NULL DEFAULT 0,
 error TEXT,
 reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_settlement_runs_started ON settlement_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_settled_outcomes_grade ON settled_outcomes(outcome, settled_at);