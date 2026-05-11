alter table public.saved_leads
  add column if not exists crm_status text not null default 'new',
  add column if not exists crm_priority text not null default 'normal',
  add column if not exists crm_notes text not null default '',
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists crm_updated_at timestamptz not null default now();

alter table public.saved_leads
  drop constraint if exists saved_leads_crm_status_check,
  add constraint saved_leads_crm_status_check
    check (crm_status in ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost'));

alter table public.saved_leads
  drop constraint if exists saved_leads_crm_priority_check,
  add constraint saved_leads_crm_priority_check
    check (crm_priority in ('low', 'normal', 'high'));

drop policy if exists "Users can update own saved leads CRM" on public.saved_leads;
create policy "Users can update own saved leads CRM"
  on public.saved_leads for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_saved_leads_user_crm_status
  on public.saved_leads(user_id, crm_status, created_at desc);

create index if not exists idx_saved_leads_user_next_follow_up
  on public.saved_leads(user_id, next_follow_up_at)
  where next_follow_up_at is not null;
