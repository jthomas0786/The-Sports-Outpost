-- TSO2 verified event inbox (independent of legacy notifications).
-- Only the trusted verifier service may INSERT. Members can SELECT and
-- mark READ on their own events; clients can never forge a scoring alert.
create table if not exists public.tso2_verified_hits (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 saved_selection_id bigint not null references public.tso2_saved_selections(id) on delete cascade,
 sport text not null check (sport in ('nfl','nhl','mlb')),
 market text not null check (market in ('atd','atg','fgs','hr')),
 player text not null,
 selection text not null check (selection = 'yes'),
 game_id text not null,
 evidence_key text not null,
 event_at timestamptz not null,
 source_url text not null,
 message text not null,
 read boolean not null default false,
 created_at timestamptz not null default now(),
 constraint tso2_verified_hits_once unique (saved_selection_id,evidence_key)
);
create index if not exists tso2_verified_hits_member_feed
 on public.tso2_verified_hits (user_id,created_at desc);
alter table public.tso2_verified_hits enable row level security;
revoke all on public.tso2_verified_hits from public,anon,authenticated;
grant select on public.tso2_verified_hits to authenticated;
grant update (read) on public.tso2_verified_hits to authenticated;
create policy "tso2_hit_self_read" on public.tso2_verified_hits
 for select to authenticated using ((select auth.uid())=user_id);
create policy "tso2_hit_self_ack" on public.tso2_verified_hits
 for update to authenticated using ((select auth.uid())=user_id)
 with check ((select auth.uid())=user_id);
comment on table public.tso2_verified_hits is
 'Trusted-event verified scoring notifications. INSERT reserved to backend service_role; never auto-grades betting tickets.';
