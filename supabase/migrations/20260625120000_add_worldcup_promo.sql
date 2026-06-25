create table if not exists public.worldcup_matches (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  home_team text not null,
  away_team text not null,
  home_flag text,
  away_flag text,
  kickoff_at timestamptz not null,
  status text not null default 'upcoming',
  home_score int,
  away_score int,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worldcup_matches_status_check check (status in ('upcoming', 'locked', 'finished'))
);

create table if not exists public.worldcup_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid not null references public.worldcup_matches(id) on delete cascade,
  pred_home int not null,
  pred_away int not null,
  is_winner boolean not null default false,
  promo_code text,
  rewarded_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint worldcup_predictions_unique_user_match unique (user_id, match_id),
  constraint worldcup_predictions_score_nonneg check (pred_home >= 0 and pred_away >= 0)
);

-- Only one featured match at a time.
create unique index if not exists idx_worldcup_one_featured
  on public.worldcup_matches((is_featured))
  where is_featured = true;

create index if not exists idx_worldcup_predictions_match
  on public.worldcup_predictions(match_id);

grant select on public.worldcup_matches to authenticated, anon;
grant select, insert on public.worldcup_predictions to authenticated;
grant select, insert, update, delete on public.worldcup_matches to service_role;
grant select, insert, update, delete on public.worldcup_predictions to service_role;

alter table public.worldcup_matches enable row level security;
alter table public.worldcup_predictions enable row level security;

-- Matches are world-readable (needed to render the featured match, including on the public teaser).
drop policy if exists "Anyone can read worldcup matches" on public.worldcup_matches;
create policy "Anyone can read worldcup matches"
  on public.worldcup_matches for select
  to authenticated, anon
  using (true);

-- Users can read only their own predictions.
drop policy if exists "Users can read own predictions" on public.worldcup_predictions;
create policy "Users can read own predictions"
  on public.worldcup_predictions for select
  to authenticated
  using (auth.uid() = user_id);

-- Users can insert their own prediction only while the match is still 'upcoming'
-- and kickoff is in the future. No update/delete (predictions are final).
drop policy if exists "Users can insert own prediction before lock" on public.worldcup_predictions;
create policy "Users can insert own prediction before lock"
  on public.worldcup_predictions for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.worldcup_matches m
      where m.id = match_id
        and m.status = 'upcoming'
        and m.kickoff_at > now()
    )
  );
