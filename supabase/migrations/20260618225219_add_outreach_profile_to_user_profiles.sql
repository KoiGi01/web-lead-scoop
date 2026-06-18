alter table public.user_profiles
  add column if not exists outreach_profile jsonb;
