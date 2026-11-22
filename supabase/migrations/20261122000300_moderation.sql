-- Moderation and account management:
--   * offensive / reserved name filter for tipping names and comp names
--   * blocked emails (admins can stop a removed player signing up again)
--   * admin player search
--   * account deletion pre-checks
--   * fixture team changes void tips that no longer apply

-- ---------------------------------------------------------------------------
-- Name filter
-- Returns null when the name is fine, otherwise a message to show the user.
-- Normalises leetspeak (f4ck, $hit), spaced-out letters (f u c k) and
-- repeated letters (fuuuck). Short or ambiguous words only match as a whole
-- word so ordinary names (Hancock, Dickson, Cassidy, therapist) still pass.
-- ---------------------------------------------------------------------------
create function public.display_name_problem(p_name text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  -- Blocked anywhere inside a word.
  v_anywhere text[] := array[
    'fuck', 'cunt', 'nigger', 'nigga', 'faggot', 'fagot', 'wank', 'whore', 'slut',
    'twat', 'motherf', 'bitch', 'shit', 'bastard', 'dickhead', 'cocksuck', 'retard',
    'paedo', 'hitler', 'boong', 'spastic', 'jizz', 'porn', 'penis', 'vagina', 'pussy',
    'arsehole', 'asshole', 'bollock', 'tosser', 'rimjob', 'blowjob', 'handjob', 'dildo'
  ];
  -- Blocked only as a whole word (plus a plural -s/-es).
  v_whole text[] := array[
    'ass', 'arse', 'cock', 'dick', 'piss', 'pissed', 'tit', 'nazi', 'kkk', 'coon',
    'chink', 'gook', 'kike', 'wog', 'abo', 'dyke', 'tranny', 'homo', 'fag',
    'rape', 'raped', 'raping', 'rapist', 'pedo', 'cum', 'sex', 'sexy', 'nonce', 'spaz',
    'prick', 'skank', 'jihad'
  ];
  -- Names that could pass for the app's own staff.
  v_reserved text[] := array[
    'admin', 'administrator', 'moderator', 'official', 'support', 'staff', 'system',
    'footytips', 'nrl'
  ];
  v_norm text;
  v_raw_tokens text[];
  v_tokens text[] := '{}';
  v_run text := '';
  t text;
  tc text;
  w text;
  wc text;
begin
  if p_name is null or btrim(p_name) = '' then
    return null;
  end if;

  -- Lower-case and undo common letter substitutions.
  v_norm := translate(lower(p_name), '0134578@$!|', 'oieastbasii');
  v_raw_tokens := regexp_split_to_array(v_norm, '[^a-z]+');

  -- Merge runs of single letters ("f u c k", "f.u.c.k") into one token.
  foreach t in array v_raw_tokens loop
    if t = '' then
      continue;
    elsif length(t) = 1 then
      v_run := v_run || t;
    else
      if length(v_run) > 1 then v_tokens := v_tokens || v_run; end if;
      v_run := '';
      v_tokens := v_tokens || t;
    end if;
  end loop;
  if length(v_run) > 0 then v_tokens := v_tokens || v_run; end if;

  foreach t in array v_tokens loop
    tc := regexp_replace(t, '(.)\1+', '\1', 'g');   -- "fuuuck" -> "fuck"

    foreach w in array v_reserved loop
      if t = w or tc = w then
        return 'That name is reserved. Please choose another.';
      end if;
    end loop;

    foreach w in array v_anywhere loop
      wc := regexp_replace(w, '(.)\1+', '\1', 'g');
      -- Collapsed matching only for words without double letters, so
      -- "boong" doesn't match "billabong".
      if position(w in t) > 0 or (wc = w and position(w in tc) > 0) then
        return 'That name isn’t allowed. Please choose another.';
      end if;
    end loop;

    foreach w in array v_whole loop
      wc := regexp_replace(w, '(.)\1+', '\1', 'g');
      if t ~ ('^' || w || '(s|es)?$') or (wc = w and tc ~ ('^' || w || '(s|es)?$')) then
        return 'That name isn’t allowed. Please choose another.';
      end if;
    end loop;
  end loop;

  return null;
end;
$$;

grant execute on function public.display_name_problem(text) to authenticated, service_role;

-- Enforce it where tipping names are written (user_metadata -> profiles).
create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := nullif(btrim(regexp_replace(new.raw_user_meta_data ->> 'display_name', '\s+', ' ', 'g')), '');
  v_problem text;
begin
  if v_name is not null then
    v_name := left(v_name, 30);
    v_problem := public.display_name_problem(v_name);
    if v_problem is not null then
      raise exception '%', v_problem using errcode = 'P0001';
    end if;
  end if;
  insert into public.profiles (id, display_name)
  values (new.id, v_name)
  on conflict (id) do update set display_name = excluded.display_name;
  return new;
end;
$$;

-- ...and competition names.
create function public.check_competition_name()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_problem text := public.display_name_problem(new.name);
begin
  if v_problem is not null then
    raise exception '%', replace(v_problem, 'That name', 'That competition name') using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger competitions_check_name
  before insert or update of name on public.competitions
  for each row execute function public.check_competition_name();

-- ---------------------------------------------------------------------------
-- Blocked emails. Kept in a schema the API doesn't expose.
-- Emails are stored normalised (lower case, "+tag" removed).
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.normalise_email(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(lower(btrim(p_email)), '\+[^@]*@', '@');
$$;

create table private.blocked_emails (
  email text primary key,
  blocked_at timestamptz not null default now(),
  note text check (note is null or char_length(note) <= 200)
);

create function private.reject_blocked_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null and exists (
    select 1 from private.blocked_emails where email = private.normalise_email(new.email)
  ) then
    raise exception 'This email address can''t be used to sign up' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger on_auth_user_check_blocked
  before insert on auth.users
  for each row execute function private.reject_blocked_email();

create function public.block_email(p_email text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  insert into private.blocked_emails (email, note)
  values (private.normalise_email(p_email), nullif(btrim(p_note), ''))
  on conflict (email) do update set note = excluded.note, blocked_at = now();
end;
$$;

create function public.unblock_email(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  delete from private.blocked_emails where email = private.normalise_email(p_email);
end;
$$;

create function public.list_blocked_emails()
returns table (email text, blocked_at timestamptz, note text)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  return query
  select b.email, b.blocked_at, b.note from private.blocked_emails b order by b.blocked_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: find players (includes email, for support and moderation).
-- ---------------------------------------------------------------------------
create function public.admin_list_players(p_query text default null, p_limit int default 50)
returns table (
  id uuid,
  display_name text,
  email text,
  is_admin boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  owned_comps_with_others int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_q text := nullif(btrim(p_query), '');
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  return query
  select p.id, p.display_name, u.email::text, p.is_admin, p.created_at, u.last_sign_in_at,
         (select count(*)::int from public.competitions c
          where c.owner_id = p.id
            and exists (select 1 from public.competition_members m
                        where m.competition_id = c.id and m.user_id <> p.id))
  from public.profiles p
  join auth.users u on u.id = p.id
  where v_q is null
     or p.display_name ilike '%' || v_q || '%'
     or u.email ilike '%' || v_q || '%'
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;

-- ---------------------------------------------------------------------------
-- Account deletion: comps you run that still have other players. These must
-- be deleted (and any buy-ins refunded) before you can delete your account.
-- ---------------------------------------------------------------------------
create function public.account_deletion_blockers()
returns table (competition_id uuid, name text, other_members int, buy_in_cents int)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name,
         (select count(*)::int from public.competition_members m
          where m.competition_id = c.id and m.user_id <> c.owner_id),
         c.buy_in_cents
  from public.competitions c
  where c.owner_id = auth.uid()
    and exists (select 1 from public.competition_members m
                where m.competition_id = c.id and m.user_id <> c.owner_id)
  order by c.name;
$$;

-- ---------------------------------------------------------------------------
-- Fixtures: if an admin changes the teams in a game, tips on a team that is
-- no longer playing are removed (those players can tip again before kick-off).
-- ---------------------------------------------------------------------------
create function public.void_tips_on_team_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.tips
  where fixture_id = new.id
    and team_id not in (new.home_team_id, new.away_team_id);
  return new;
end;
$$;

create trigger fixtures_void_tips_on_team_change
  after update of home_team_id, away_team_id on public.fixtures
  for each row
  when (old.home_team_id is distinct from new.home_team_id
        or old.away_team_id is distinct from new.away_team_id)
  execute function public.void_tips_on_team_change();

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke execute on function public.block_email(text, text) from public, anon;
revoke execute on function public.unblock_email(text) from public, anon;
revoke execute on function public.list_blocked_emails() from public, anon;
revoke execute on function public.admin_list_players(text, int) from public, anon;
revoke execute on function public.account_deletion_blockers() from public, anon;
revoke execute on function public.display_name_problem(text) from public, anon;
grant execute on function public.block_email(text, text) to authenticated;
grant execute on function public.unblock_email(text) to authenticated;
grant execute on function public.list_blocked_emails() to authenticated;
grant execute on function public.admin_list_players(text, int) to authenticated;
grant execute on function public.account_deletion_blockers() to authenticated;
