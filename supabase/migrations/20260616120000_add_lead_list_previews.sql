create table if not exists public.lead_list_previews (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  description text not null default '',
  search_config jsonb not null default '{}'::jsonb,
  leads jsonb not null default '[]'::jsonb,
  lead_count integer not null default 0,
  is_public boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

grant select on public.lead_list_previews to anon;
grant select, insert, update, delete on public.lead_list_previews to authenticated;
grant select, insert, update, delete on public.lead_list_previews to service_role;

alter table public.lead_list_previews enable row level security;

drop policy if exists "Anyone can read public lead list previews" on public.lead_list_previews;
create policy "Anyone can read public lead list previews"
  on public.lead_list_previews for select
  using (is_public = true and (expires_at is null or expires_at > now()));

drop policy if exists "Users can create own lead list previews" on public.lead_list_previews;
create policy "Users can create own lead list previews"
  on public.lead_list_previews for insert
  to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "Users can update own lead list previews" on public.lead_list_previews;
create policy "Users can update own lead list previews"
  on public.lead_list_previews for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

drop policy if exists "Users can delete own lead list previews" on public.lead_list_previews;
create policy "Users can delete own lead list previews"
  on public.lead_list_previews for delete
  to authenticated
  using (auth.uid() = created_by);

create index if not exists idx_lead_list_previews_token
  on public.lead_list_previews(token);

create index if not exists idx_lead_list_previews_created_by
  on public.lead_list_previews(created_by, created_at desc);
