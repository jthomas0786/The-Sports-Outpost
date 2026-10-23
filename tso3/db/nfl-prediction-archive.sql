-- TSO 3.0 NFL standalone prediction archive v1.
-- NEVER store a forecast after kickoff; predictions are immutable.
-- Future final scores/outcomes belong in a separate outcome table, never this table.
CREATE TABLE IF NOT EXISTS prediction_snapshots (
 id TEXT PRIMARY KEY,
 captured_at TEXT NOT NULL,
 game_id TEXT NOT NULL,
 kickoff_at TEXT NOT NULL,
 player_id TEXT,
 player_name TEXT NOT NULL,
 team TEXT NOT NULL,
 market TEXT NOT NULL,
 side TEXT NOT NULL CHECK(side IN ('over','yes')),
 line REAL NOT NULL,
 sportsbook TEXT NOT NULL,
 book_price INTEGER NOT NULL,
 probability REAL NOT NULL CHECK(probability BETWEEN 0 AND 1),
 model_kind TEXT NOT NULL CHECK(model_kind IN ('50k_exact_over','50k_atd','tso_regressed_atd')),
 model_generated_at TEXT NOT NULL,
 model_version TEXT NOT NULL,
 odds_snapshot_at TEXT NOT NULL,
 model_iterations INTEGER,
 verified_game_source TEXT NOT NULL DEFAULT 'ESPN',
 created_by TEXT NOT NULL DEFAULT 'tso3-preview-scheduled',
 CHECK(captured_at < kickoff_at),
 CHECK(model_generated_at <= captured_at),
 CHECK(odds_snapshot_at <= captured_at)
);
CREATE INDEX IF NOT EXISTS idx_prediction_snapshots_game ON prediction_snapshots(game_id,market,model_kind);
CREATE INDEX IF NOT EXISTS idx_prediction_snapshots_kickoff ON prediction_snapshots(kickoff_at);
CREATE INDEX IF NOT EXISTS idx_prediction_snapshots_capture ON prediction_snapshots(captured_at DESC);
CREATE TABLE IF NOT EXISTS capture_runs (
 run_id TEXT PRIMARY KEY,
 started_at TEXT NOT NULL,
 completed_at TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('saved','no_fresh_sources','failed')),
 forecast_games INTEGER NOT NULL DEFAULT 0,
 eligible_predictions INTEGER NOT NULL DEFAULT 0,
 inserted_predictions INTEGER NOT NULL DEFAULT 0,
 error TEXT,
 reason TEXT
);
CREATE TABLE IF NOT EXISTS settled_outcomes (
 snapshot_id TEXT PRIMARY KEY REFERENCES prediction_snapshots(id),
 outcome TEXT NOT NULL CHECK(outcome IN ('win','loss','push','void','unknown')),
 realized_stat REAL,
 final_game_state TEXT NOT NULL,
 source TEXT NOT NULL,
 source_snapshot_at TEXT NOT NULL,
 settled_at TEXT NOT NULL,
 CHECK(final_game_state = 'post')
);
