alter table public.user_profiles
  add column if not exists pipeline_stage_prefs jsonb;
