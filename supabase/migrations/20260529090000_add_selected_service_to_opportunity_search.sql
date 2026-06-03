alter table public.search_sessions
add column if not exists selected_service text;

alter table public.saved_leads
add column if not exists selected_service text;
