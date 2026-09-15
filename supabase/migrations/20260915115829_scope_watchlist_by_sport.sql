alter table public.watchlist add column if not exists sport text not null default 'mlb';
update public.watchlist set sport='mlb' where sport is null or btrim(sport)='';
alter table public.watchlist drop constraint if exists watchlist_sport_check;
alter table public.watchlist add constraint watchlist_sport_check check (sport in ('mlb','nfl','nhl','nba'));
alter table public.watchlist drop constraint if exists watchlist_user_id_player_id_slate_date_key;
alter table public.watchlist add constraint watchlist_user_id_sport_player_id_slate_date_key unique (user_id, sport, player_id, slate_date);
