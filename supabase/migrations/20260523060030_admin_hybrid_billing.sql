alter table public.user_profiles
  add column if not exists company_name text;

alter table public.user_credits
  add column if not exists subscription_status text not null default 'none',
  add column if not exists stripe_subscription_id text,
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz,
  add column if not exists included_monthly_credits integer not null default 30,
  add column if not exists monthly_credits_reset_at timestamptz,
  add column if not exists plan_source text not null default 'manual',
  add column if not exists organization_id uuid;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'pro',
  seat_limit integer not null default 3,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  before_data jsonb not null default '{}'::jsonb,
  after_data jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.stripe_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

alter table public.user_credits
  drop constraint if exists user_credits_organization_id_fkey,
  add constraint user_credits_organization_id_fkey
    foreign key (organization_id) references public.organizations(id) on delete set null;

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.stripe_events enable row level security;

grant select, insert, update on public.organizations to authenticated;
grant select, insert, update on public.organization_memberships to authenticated;
grant select on public.admin_audit_log to authenticated;
grant select on public.stripe_events to authenticated;

drop policy if exists "Organizations visible to owners and members" on public.organizations;
drop policy if exists "Organization memberships visible to members" on public.organization_memberships;
drop policy if exists "Admins can read audit log" on public.admin_audit_log;
drop policy if exists "Admins can read stripe events" on public.stripe_events;

create policy "Organizations visible to owners and members"
  on public.organizations for select
  using (
    owner_user_id = auth.uid()
    or exists (
      select 1
      from public.organization_memberships m
      where m.organization_id = organizations.id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
    or exists (select 1 from public.admin_users where user_id = auth.uid())
  );

create policy "Organization memberships visible to members"
  on public.organization_memberships for select
  using (
    user_id = auth.uid()
    or exists (select 1 from public.admin_users where user_id = auth.uid())
  );

create policy "Admins can read audit log"
  on public.admin_audit_log for select
  using (exists (select 1 from public.admin_users where user_id = auth.uid()));

create policy "Admins can read stripe events"
  on public.stripe_events for select
  using (exists (select 1 from public.admin_users where user_id = auth.uid()));

create index if not exists idx_user_credits_plan_status on public.user_credits(plan, subscription_status);
create index if not exists idx_user_credits_stripe_subscription on public.user_credits(stripe_subscription_id);
create index if not exists idx_organizations_owner on public.organizations(owner_user_id);
create index if not exists idx_organization_memberships_user on public.organization_memberships(user_id, status);
create index if not exists idx_organization_memberships_org on public.organization_memberships(organization_id, status);
create index if not exists idx_admin_audit_log_target_created on public.admin_audit_log(target_user_id, created_at desc);

insert into public.admin_audit_log (action, metadata)
values ('migration_admin_hybrid_billing', jsonb_build_object('plans', array['free', 'starter', 'growth', 'pro']))
on conflict do nothing;
