-- TSO 3.0 preview-only NFL sportsbook action evidence.
-- This table does NOT assert sportsbook-settled wins, losses or payouts.
CREATE TABLE IF NOT EXISTS sportsbook_action_observations (
 observation_id TEXT PRIMARY KEY,
 snapshot_id TEXT NOT NULL REFERENCES prediction_snapshots(id),
 game_id TEXT NOT NULL,
 sportsbook TEXT NOT NULL,
 action_state TEXT NOT NULL CHECK(action_state IN ('action_confirmed','void_evidence','review_required')),
 evidence_code TEXT NOT NULL,
 policy_code TEXT NOT NULL,
 observed_at TEXT NOT NULL,
 source TEXT NOT NULL,
 evidence_fingerprint TEXT NOT NULL,
 UNIQUE(snapshot_id,evidence_fingerprint)
);
CREATE INDEX IF NOT EXISTS idx_sportsbook_action_snapshot ON sportsbook_action_observations(snapshot_id,observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sportsbook_action_game ON sportsbook_action_observations(game_id,observed_at DESC);
