alter table public.search_sessions
  add column if not exists opportunity_signals text[] not null default '{}';
