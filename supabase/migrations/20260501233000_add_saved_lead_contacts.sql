alter table public.saved_leads
add column if not exists contacts jsonb not null default '[]'::jsonb;
