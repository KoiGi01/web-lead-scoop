alter table public.user_profiles
  add column if not exists full_name text,
  add column if not exists role_title text,
  add column if not exists company_website text,
  add column if not exists phone text;

create index if not exists idx_user_profiles_company_name on public.user_profiles(company_name);
