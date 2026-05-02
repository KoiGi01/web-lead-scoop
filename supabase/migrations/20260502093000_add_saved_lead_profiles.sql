alter table public.saved_leads
add column if not exists linkedin_url text,
add column if not exists social_links jsonb not null default '[]'::jsonb;
