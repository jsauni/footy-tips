-- Buy-in payments (money still never touches the app):
--   * organiser's PayID + account name on the comp
--   * each member gets a unique payment reference (e.g. TIPS-7K3Q)
--   * member taps "I've paid" (claimed) → organiser confirms (paid) or rejects
--   * organiser records when the prize has been paid out

alter table public.competitions
  add column payid text
    check (payid is null or char_length(btrim(payid)) between 3 and 100),
  add column payee_name text
    check (payee_name is null or char_length(btrim(payee_name)) between 2 and 60),
  add column prize_paid_out_at timestamptz;

alter table public.competition_members
  add column payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'claimed', 'paid')),
  add column payment_reference text,
  add column payment_claimed_at timestamptz,
  add column payment_confirmed_at timestamptz;

update public.competition_members
set payment_status = 'paid', payment_confirmed_at = now()
where has_paid;

drop policy if exists "owner updates members" on public.competition_members;
alter table public.competition_members drop column has_paid;
alter table public.competition_members
  add column has_paid boolean generated always as (payment_status = 'paid') stored;

-- Unique-per-competition payment references -------------------------------
create function public.new_payment_reference(p_competition_id uuid)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v text;
begin
  loop
    v := 'TIPS-' || (
      select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
      from generate_series(1, 4)
    );
    exit when not exists (
      select 1 from public.competition_members
      where competition_id = p_competition_id and payment_reference = v
    );
  end loop;
  return v;
end;
$$;

create function public.assign_payment_reference()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.payment_reference is null then
    new.payment_reference := public.new_payment_reference(new.competition_id);
  end if;
  return new;
end;
$$;

create trigger competition_members_payment_reference
  before insert on public.competition_members
  for each row execute function public.assign_payment_reference();

do $$
declare
  r record;
begin
  for r in select competition_id, user_id from public.competition_members where payment_reference is null loop
    update public.competition_members
    set payment_reference = public.new_payment_reference(r.competition_id)
    where competition_id = r.competition_id and user_id = r.user_id;
  end loop;
end;
$$;

alter table public.competition_members
  alter column payment_reference set not null,
  add constraint competition_members_payment_reference_key unique (competition_id, payment_reference);

-- Member: "I've paid" / undo ----------------------------------------------
create function public.claim_payment(p_competition_id uuid, p_claimed boolean default true)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v text;
begin
  update public.competition_members m
  set payment_status = case when p_claimed then 'claimed' else 'unpaid' end,
      payment_claimed_at = case when p_claimed then now() end
  where m.competition_id = p_competition_id
    and m.user_id = auth.uid()
    and m.payment_status <> 'paid'
    and exists (select 1 from public.competitions c
                where c.id = p_competition_id and c.buy_in_cents is not null)
  returning m.payment_status into v;

  if v is null then
    raise exception 'No payment to update (already confirmed, or no buy-in)';
  end if;
  return v;
end;
$$;

-- Organiser: confirm / reject / mark paid in cash / undo ---------------------
create function public.set_payment_status(p_competition_id uuid, p_user_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_competition_owner(p_competition_id) then
    raise exception 'Only the organiser can confirm payments';
  end if;
  if p_status not in ('unpaid', 'claimed', 'paid') then
    raise exception 'Invalid payment status';
  end if;

  update public.competition_members
  set payment_status = p_status,
      payment_confirmed_at = case when p_status = 'paid' then now() end,
      payment_claimed_at = case when p_status = 'unpaid' then null else payment_claimed_at end
  where competition_id = p_competition_id and user_id = p_user_id;

  if not found then
    raise exception 'Member not found';
  end if;
end;
$$;

-- Privileges ----------------------------------------------------------------
-- Members rows are only changed through the functions above.
revoke update on public.competition_members from authenticated;
grant update (name, payment_instructions, payid, payee_name, prize_paid_out_at)
  on public.competitions to authenticated;   -- owner-only via RLS

revoke execute on function public.claim_payment(uuid, boolean) from public, anon;
revoke execute on function public.set_payment_status(uuid, uuid, text) from public, anon;
revoke execute on function public.new_payment_reference(uuid) from public, anon, authenticated;
grant execute on function public.claim_payment(uuid, boolean) to authenticated;
grant execute on function public.set_payment_status(uuid, uuid, text) to authenticated;
