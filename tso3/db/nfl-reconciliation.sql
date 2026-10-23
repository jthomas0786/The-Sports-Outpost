-- TSO 3.0 NFL reconciliation v1: preserve every distinct postgame grading observation.
-- Original prediction_snapshots and initial settled_outcomes are never updated or deleted.
CREATE TABLE IF NOT EXISTS reconciliation_runs (
 run_id TEXT PRIMARY KEY,
 started_at TEXT NOT NULL,
 completed_at TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('checked','nothing_eligible','partial','failed')),
 checked_games INTEGER NOT NULL DEFAULT 0,
 final_games INTEGER NOT NULL DEFAULT 0,
 examined_predictions INTEGER NOT NULL DEFAULT 0,
 new_observations INTEGER NOT NULL DEFAULT 0,
 conflicts INTEGER NOT NULL DEFAULT 0,
 unresolved INTEGER NOT NULL DEFAULT 0,
 error TEXT,
 reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_reconciliation_runs_started ON reconciliation_runs(started_at DESC);
CREATE TABLE IF NOT EXISTS outcome_observations (
 observation_id TEXT PRIMARY KEY,
 snapshot_id TEXT NOT NULL REFERENCES prediction_snapshots(id),
 game_id TEXT NOT NULL,
 observed_at TEXT NOT NULL,
 source TEXT NOT NULL,
 source_fingerprint TEXT NOT NULL,
 observed_outcome TEXT NOT NULL CHECK(observed_outcome IN ('win','loss','push','unknown')),
 realized_stat REAL,
 reason TEXT NOT NULL,
 UNIQUE(snapshot_id,source_fingerprint)
);
CREATE INDEX IF NOT EXISTS idx_outcome_observations_snapshot ON outcome_observations(snapshot_id,observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_outcome_observations_game ON outcome_observations(game_id,observed_at DESC);
