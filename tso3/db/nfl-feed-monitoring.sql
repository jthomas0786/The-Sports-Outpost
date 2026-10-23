-- TSO 3.0 ONLY: observable sportsbook odds source checks, append-only.
-- Does not alter prediction_snapshots, capture_runs or the sportsbook refresh workflow.
CREATE TABLE IF NOT EXISTS nfl_feed_checks (
  run_id TEXT PRIMARY KEY REFERENCES capture_runs(run_id),
  checked_at TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('fresh','stale','unavailable','invalid','no_matching_games','no_model_matches')),
  source_snapshot_at TEXT,
  source_age_minutes REAL,
  eligible_quote_rows INTEGER NOT NULL DEFAULT 0,
  verified_games INTEGER NOT NULL DEFAULT 0,
  games_rejected_for_age INTEGER NOT NULL DEFAULT 0,
  earliest_kickoff_at TEXT,
  reason TEXT NOT NULL,
  observed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_nfl_feed_checks_time ON nfl_feed_checks(checked_at DESC);
