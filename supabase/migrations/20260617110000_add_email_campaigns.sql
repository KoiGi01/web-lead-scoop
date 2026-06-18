create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  subject text not null,
  body text not null,
  from_name text not null default 'GlobaLeads22',
  reply_to text,
  status text not null default 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_campaigns_status_check check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed', 'paused'))
);

create table if not exists public.email_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.saved_leads(id) on delete set null,
  recipient_email text not null,
  recipient_name text,
  company_name text,
  status text not null default 'queued',
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint email_campaign_recipients_status_check check (status in ('queued', 'sending', 'sent', 'failed', 'skipped'))
);

grant select, insert, update, delete on public.email_campaigns to authenticated;
grant select, insert, update, delete on public.email_campaign_recipients to authenticated;
grant select, insert, update, delete on public.email_campaigns to service_role;
grant select, insert, update, delete on public.email_campaign_recipients to service_role;

alter table public.email_campaigns enable row level security;
alter table public.email_campaign_recipients enable row level security;

drop policy if exists "Users can manage own email campaigns" on public.email_campaigns;
create policy "Users can manage own email campaigns"
  on public.email_campaigns for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own email campaign recipients" on public.email_campaign_recipients;
create policy "Users can manage own email campaign recipients"
  on public.email_campaign_recipients for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_email_campaigns_user_created
  on public.email_campaigns(user_id, created_at desc);

create index if not exists idx_email_campaigns_status_scheduled
  on public.email_campaigns(status, scheduled_at)
  where status in ('scheduled', 'sending');

create index if not exists idx_email_campaign_recipients_campaign
  on public.email_campaign_recipients(campaign_id, status);
