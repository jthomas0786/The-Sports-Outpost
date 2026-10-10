-- TSO 2.0: device-scoped push choices; applies to the existing shared Web Push table.
-- Existing devices keep MLB HR, NFL TD/watchlist, NHL goal/PLJ, and NBA
-- player milestone notifications on. Model notifications remain OFF until a
-- server-verified model trigger exists. No client has service-role access.
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS alert_preferences jsonb NOT NULL
  DEFAULT '{"mlb":{"home_runs":true,"multi_homer":true,"model_alerts":false},"nfl":{"touchdowns":true,"watchlist":true,"model_alerts":false},"nhl":{"goals":true,"hat_tricks":true,"game_edge":true,"model_alerts":false},"nba":{"milestones":true,"model_alerts":false}}'::jsonb;
ALTER TABLE public.push_subscriptions
  DROP CONSTRAINT IF EXISTS push_alert_prefs_object;
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_alert_prefs_object
  CHECK (jsonb_typeof(alert_preferences)='object' AND pg_column_size(alert_preferences)<=2048);
-- Existing RLS owner policies apply to this column without a new public endpoint.
