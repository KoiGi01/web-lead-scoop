-- One prediction (entry) per user; extra entries are earned by referring people
-- who themselves predict. An "entrant" row is created on a user's first
-- prediction; referred_by credits the inviter.
create table if not exists public.worldcup_entrants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  referred_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_worldcup_entrants_referrer
  on public.worldcup_entrants(referred_by) where referred_by is not null;

grant select on public.worldcup_entrants to authenticated;
grant select, insert, update, delete on public.worldcup_entrants to service_role;

alter table public.worldcup_entrants enable row level security;

-- A user can see their own entrant row and the rows of people they referred
-- (so the client can count earned entries).
drop policy if exists "Users see own entrant and their referrals" on public.worldcup_entrants;
create policy "Users see own entrant and their referrals"
  on public.worldcup_entrants for select to authenticated
  using (auth.uid() = user_id or auth.uid() = referred_by);

-- Predictions are now created ONLY via the submit-prediction edge function
-- (service role), which enforces the per-user entry allowance. Block direct
-- user inserts so the allowance can't be bypassed.
drop policy if exists "Users can insert own prediction before lock" on public.worldcup_predictions;
revoke insert on public.worldcup_predictions from authenticated;
