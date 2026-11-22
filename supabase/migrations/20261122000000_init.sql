-- NRL Tipping: initial schema
-- Tables: teams, profiles, fixtures, tips, competitions, competition_members
-- Scoring is computed on read (no stored points), so correcting a result
-- automatically re-scores everyone.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Teams
-- ---------------------------------------------------------------------------
create table public.teams (
  id text primary key,                 -- slug, e.g. 'broncos'
  name text not null,                  -- 'Brisbane Broncos'
  short_name text not null,            -- 'Broncos'
  abbreviation text not null,          -- 'BRI'
  primary_color text not null,         -- hex, used for badges (no official logos)
  secondary_color text not null
);

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 2 and 30),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- display_name lives in auth user_metadata (so the proxy can check onboarding
-- without a DB round trip) and is mirrored here for joins.
create function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '');
begin
  if v_name is not null then
    v_name := left(v_name, 30);
  end if;
  insert into public.profiles (id, display_name)
  values (new.id, v_name)
  on conflict (id) do update set display_name = excluded.display_name;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.sync_profile_from_auth();

create trigger on_auth_user_metadata_updated
  after update of raw_user_meta_data on auth.users
  for each row execute function public.sync_profile_from_auth();

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- Fixtures
-- Round numbers: 1..27 regular season, 28+ finals (label via round_label).
-- ---------------------------------------------------------------------------
create table public.fixtures (
  id bigint generated always as identity primary key,
  season int not null,
  round int not null check (round > 0),
  round_label text,                    -- e.g. 'Finals Week 1'; null = 'Round N'
  home_team_id text not null references public.teams (id),
  away_team_id text not null references public.teams (id),
  kickoff_at timestamptz not null,
  venue text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'completed', 'postponed')),
  home_score int check (home_score >= 0),
  away_score int check (away_score >= 0),
  external_id text unique,             -- id from a data provider, for upserts
  check (home_team_id <> away_team_id),
  check (status <> 'completed' or (home_score is not null and away_score is not null)),
  unique (season, round, home_team_id, away_team_id)
);

create index fixtures_season_round_idx on public.fixtures (season, round, kickoff_at);

-- ---------------------------------------------------------------------------
-- Tips: one tip per user per fixture, shared across every competition.
-- margin is only scored on each round's "margin game" (first kickoff).
-- ---------------------------------------------------------------------------
create table public.tips (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  fixture_id bigint not null references public.fixtures (id) on delete cascade,
  team_id text not null references public.teams (id),
  margin int check (margin between 1 and 99),
  updated_at timestamptz not null default now(),
  primary key (user_id, fixture_id)
);

create index tips_fixture_idx on public.tips (fixture_id);

-- Lockout + validity are enforced in the database, not just the UI.
create function public.validate_tip()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  f public.fixtures;
begin
  select * into f from public.fixtures where id = new.fixture_id;
  if f.id is null then
    raise exception 'Fixture not found';
  end if;
  if now() >= f.kickoff_at or f.status <> 'scheduled' then
    raise exception 'Tipping for this match has closed' using errcode = 'P0001';
  end if;
  if new.team_id not in (f.home_team_id, f.away_team_id) then
    raise exception 'Team is not playing in this match';
  end if;
  if tg_op = 'UPDATE' and (new.user_id <> old.user_id or new.fixture_id <> old.fixture_id) then
    raise exception 'Cannot move a tip';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger tips_validate
  before insert or update on public.tips
  for each row execute function public.validate_tip();

-- ---------------------------------------------------------------------------
-- Competitions (private, invite-code based). The public ladder is implicit:
-- every player is on it.
-- ---------------------------------------------------------------------------
create function public.generate_invite_code()
returns text
language sql
volatile
as $$
  -- 8 chars from an unambiguous alphabet (no 0/O/1/I/L)
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, 8);
$$;

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 3 and 40),
  season int not null,
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  invite_code text not null unique default public.generate_invite_code(),
  -- Optional buy-in, in cents. The app never holds or moves money: the
  -- organiser collects it privately and pays the winner. Capped deliberately.
  buy_in_cents int check (buy_in_cents is null or buy_in_cents between 100 and 50000),
  payment_instructions text check (payment_instructions is null or char_length(payment_instructions) <= 200),
  organiser_ack_at timestamptz,        -- organiser accepted buy-in terms
  max_members int not null default 100 check (max_members between 2 and 500),
  created_at timestamptz not null default now(),
  check (buy_in_cents is null or organiser_ack_at is not null)
);

create table public.competition_members (
  competition_id uuid not null references public.competitions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  has_paid boolean not null default false,
  adult_confirmed_at timestamptz,      -- required to join a buy-in comp
  joined_at timestamptz not null default now(),
  primary key (competition_id, user_id)
);

create index competition_members_user_idx on public.competition_members (user_id);

create function public.is_competition_member(p_competition_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.competition_members
    where competition_id = p_competition_id and user_id = auth.uid()
  );
$$;

create function public.is_competition_owner(p_competition_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.competitions
    where id = p_competition_id and owner_id = auth.uid()
  );
$$;

-- Owner automatically becomes a member.
create function public.add_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.competition_members (competition_id, user_id, role, adult_confirmed_at)
  values (new.id, new.owner_id, 'owner', case when new.buy_in_cents is not null then now() end);
  return new;
end;
$$;

create trigger competitions_add_owner
  after insert on public.competitions
  for each row execute function public.add_owner_membership();

-- Look up a competition by invite code before joining.
create function public.preview_competition(p_code text)
returns table (
  id uuid,
  name text,
  season int,
  owner_name text,
  buy_in_cents int,
  member_count int,
  max_members int,
  already_member boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.season, p.display_name, c.buy_in_cents,
         (select count(*)::int from public.competition_members m where m.competition_id = c.id),
         c.max_members,
         exists (select 1 from public.competition_members m
                 where m.competition_id = c.id and m.user_id = auth.uid())
  from public.competitions c
  join public.profiles p on p.id = c.owner_id
  where c.invite_code = upper(btrim(p_code))
    and auth.uid() is not null;
$$;

create function public.join_competition(p_code text, p_confirm_adult boolean default false)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.competitions;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select * into c from public.competitions where invite_code = upper(btrim(p_code));
  if c.id is null then
    raise exception 'Invite code not found' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.competition_members
             where competition_id = c.id and user_id = auth.uid()) then
    return c.id;
  end if;

  if c.buy_in_cents is not null and not coalesce(p_confirm_adult, false) then
    raise exception 'You must confirm you are 18 or over to join a buy-in competition';
  end if;

  select count(*) into v_count from public.competition_members where competition_id = c.id;
  if v_count >= c.max_members then
    raise exception 'This competition is full';
  end if;

  insert into public.competition_members (competition_id, user_id, adult_confirmed_at)
  values (c.id, auth.uid(), case when c.buy_in_cents is not null then now() end);

  return c.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Scoring
--   * 1 point per correct tip. A draw gives everyone who tipped the match 1.
--   * No tip = 0 points.
--   * Tiebreaker: total margin error on each round's margin game (first
--     kickoff of the round). error = |tipped margin - actual margin from the
--     tipped team's point of view|. A missing tip/margin on a completed margin
--     game adds a flat 50.
-- ---------------------------------------------------------------------------
create view public.margin_games
with (security_invoker = true) as
select distinct on (season, round) id as fixture_id, season, round
from public.fixtures
where status <> 'postponed'
order by season, round, kickoff_at, id;

create function public.ladder(p_season int, p_competition_id uuid default null)
returns table (
  user_id uuid,
  display_name text,
  points int,
  margin_error int,
  tips_made int,
  last_round_points int,
  rank int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_last_round int;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if p_competition_id is not null and not public.is_competition_member(p_competition_id) then
    raise exception 'Not a member of this competition';
  end if;

  select max(f.round) into v_last_round
  from public.fixtures f
  where f.season = p_season and f.status = 'completed';

  return query
  with players as (
    select p.id, p.display_name
    from public.profiles p
    where p.display_name is not null
      and (p_competition_id is null or exists (
        select 1 from public.competition_members m
        where m.competition_id = p_competition_id and m.user_id = p.id))
  ),
  completed as (
    select f.*,
           (f.home_score - f.away_score) as home_margin,
           mg.fixture_id is not null as is_margin_game
    from public.fixtures f
    left join public.margin_games mg on mg.fixture_id = f.id
    where f.season = p_season and f.status = 'completed'
  ),
  scored as (
    select pl.id as uid,
           c.round,
           c.is_margin_game,
           t.team_id is not null as tipped,
           case
             when t.team_id is null then 0
             when c.home_score = c.away_score then 1
             when (c.home_margin > 0 and t.team_id = c.home_team_id)
               or (c.home_margin < 0 and t.team_id = c.away_team_id) then 1
             else 0
           end as pts,
           case
             when not c.is_margin_game then 0
             when t.team_id is null or t.margin is null then 50
             else abs(t.margin - case when t.team_id = c.home_team_id
                                      then c.home_margin else -c.home_margin end)
           end as err
    from players pl
    cross join completed c
    left join public.tips t on t.user_id = pl.id and t.fixture_id = c.id
  ),
  totals as (
    select pl.id as uid,
           pl.display_name as dname,
           coalesce(sum(s.pts), 0)::int as pts,
           coalesce(sum(s.err), 0)::int as err,
           coalesce(sum(case when s.tipped then 1 else 0 end), 0)::int as made,
           coalesce(sum(case when s.round = v_last_round then s.pts else 0 end), 0)::int as last_pts
    from players pl
    left join scored s on s.uid = pl.id
    group by pl.id, pl.display_name
  )
  select t.uid, t.dname, t.pts, t.err, t.made, t.last_pts,
         (rank() over (order by t.pts desc, t.err asc))::int
  from totals t
  order by 7, t.dname;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.fixtures enable row level security;
alter table public.tips enable row level security;
alter table public.competitions enable row level security;
alter table public.competition_members enable row level security;

-- Teams & fixtures: readable by signed-in users; writable by admins only.
create policy "teams readable" on public.teams
  for select to authenticated using (true);

create policy "fixtures readable" on public.fixtures
  for select to authenticated using (true);
create policy "admins insert fixtures" on public.fixtures
  for insert to authenticated with check (public.is_admin());
create policy "admins update fixtures" on public.fixtures
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete fixtures" on public.fixtures
  for delete to authenticated using (public.is_admin());

-- Profiles: everyone can see display names; only the trigger writes them.
create policy "profiles readable" on public.profiles
  for select to authenticated using (true);

-- Tips: your own always; other people's only once the match has kicked off
-- (no copying). Writes are own-row only, and the trigger enforces lockout.
create policy "read own tips or locked tips" on public.tips
  for select to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.fixtures f
               where f.id = fixture_id and (f.kickoff_at <= now() or f.status <> 'scheduled'))
  );
create policy "insert own tips" on public.tips
  for insert to authenticated with check (user_id = auth.uid());
create policy "update own tips" on public.tips
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own unlocked tips" on public.tips
  for delete to authenticated using (
    user_id = auth.uid()
    and exists (select 1 from public.fixtures f
                where f.id = fixture_id and f.kickoff_at > now() and f.status = 'scheduled')
  );

-- Competitions: members can read; anyone signed in can create their own;
-- the owner can rename/edit payment instructions or delete. Buy-in amount is
-- fixed at creation (no bait-and-switch after people join).
create policy "members read competitions" on public.competitions
  for select to authenticated using (public.is_competition_member(id) or owner_id = auth.uid());
create policy "create own competitions" on public.competitions
  for insert to authenticated with check (owner_id = auth.uid());
create policy "owner updates competition" on public.competitions
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner deletes competition" on public.competitions
  for delete to authenticated using (owner_id = auth.uid());

-- Members: visible to fellow members. Joining goes through join_competition().
-- Owner can mark paid / remove members; members can leave (owner cannot).
create policy "members read members" on public.competition_members
  for select to authenticated using (public.is_competition_member(competition_id));
create policy "owner updates members" on public.competition_members
  for update to authenticated
  using (public.is_competition_owner(competition_id))
  with check (public.is_competition_owner(competition_id));
create policy "leave or remove members" on public.competition_members
  for delete to authenticated using (
    role <> 'owner'
    and (user_id = auth.uid() or public.is_competition_owner(competition_id))
  );

-- ---------------------------------------------------------------------------
-- Table privileges. Nothing is granted to anon: every page requires sign-in.
-- (RLS policies above further restrict which rows each role can touch.)
-- ---------------------------------------------------------------------------
revoke all on public.teams, public.profiles, public.fixtures, public.tips,
  public.competitions, public.competition_members, public.margin_games from anon, authenticated;

grant select on public.teams, public.profiles, public.margin_games to authenticated;
grant select, insert, update, delete on public.fixtures to authenticated;    -- admin-only via RLS
grant select, insert, update, delete on public.tips to authenticated;
grant select, insert, delete on public.competitions to authenticated;
grant update (name, payment_instructions) on public.competitions to authenticated;
grant select, delete on public.competition_members to authenticated;
grant update (has_paid) on public.competition_members to authenticated;

grant all on public.teams, public.profiles, public.fixtures, public.tips,
  public.competitions, public.competition_members to service_role;
grant select on public.margin_games to service_role;

-- Functions callable by signed-in users only.
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.ladder(int, uuid) from public, anon;
revoke execute on function public.join_competition(text, boolean) from public, anon;
revoke execute on function public.preview_competition(text) from public, anon;
grant execute on function public.ladder(int, uuid) to authenticated;
grant execute on function public.join_competition(text, boolean) to authenticated;
grant execute on function public.preview_competition(text) to authenticated;
