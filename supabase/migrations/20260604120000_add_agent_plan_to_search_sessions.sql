alter table public.search_sessions
  add column if not exists agent_plan jsonb;
