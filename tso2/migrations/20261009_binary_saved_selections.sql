-- Isolated TSO 2.0 saved YES/NO selections. No TSO 1.0 tables modified.
-- Immutable selections: members may insert, read, or remove only their own.
create table if not exists public.tso2_saved_selections (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  sport text not null check (sport in ('nfl','nhl','nba','mlb')),
  player text not null check (char_length(player) between 1 and 160),
  team text,
  prop_key text not null check (char_length(prop_key) between 1 and 450),
  market text not null check (market in ('atd','atg','fgs','hr')),
  selection text not null check (selection in ('yes','no')),
  source_side text check (source_side in ('yes','no','over','under')),
  source_line text,
  event_id text,
  sportsbook text,
  american_price integer,
  slate_date date not null,
  date_source text not null default 'saved' check (date_source in ('event','saved')),
  state text not null default 'saved' check (state in ('saved')),
  created_at timestamptz not null default now(),
  constraint tso2_saved_selections_exact_unique unique (user_id,prop_key,slate_date)
);
create index if not exists tso2_saved_selections_by_user_recent
  on public.tso2_saved_selections (user_id,created_at desc);
alter table public.tso2_saved_selections enable row level security;
revoke all on public.tso2_saved_selections from public,anon;
grant select,insert,delete on public.tso2_saved_selections to authenticated;
drop policy if exists "tso2_save_binary_own_select" on public.tso2_saved_selections;
create policy "tso2_save_binary_own_select" on public.tso2_saved_selections
 for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "tso2_save_binary_own_insert" on public.tso2_saved_selections;
create policy "tso2_save_binary_own_insert" on public.tso2_saved_selections
 for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "tso2_save_binary_own_delete" on public.tso2_saved_selections;
create policy "tso2_save_binary_own_delete" on public.tso2_saved_selections
 for delete to authenticated using ((select auth.uid())=user_id);
comment on table public.tso2_saved_selections is
 'TSO 2.0-only immutable exact Yes/No player prop saves; never represents a sportsbook bet, graded result, or push subscription.';
