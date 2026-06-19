alter table public.user_profiles
  add column if not exists setup_profile jsonb;
