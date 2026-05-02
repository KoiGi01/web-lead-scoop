create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists public.api_usage_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  search_session_id uuid references public.search_sessions(id) on delete set null,
  lead_id uuid references public.saved_leads(id) on delete set null,
  depth text,
  enrich_mode boolean not null default false,
  usage_type text not null default 'customer',
  provider text not null,
  operation text not null,
  endpoint text,
  status_code integer,
  success boolean not null default false,
  latency_ms integer,
  billable_units numeric not null default 0,
  estimated_cost_usd numeric not null default 0,
  credits_charged_to_user integer not null default 0,
  request_fingerprint text,
  result_count integer not null default 0,
  error_code text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  search_session_id uuid references public.search_sessions(id) on delete set null,
  type text not null,
  amount integer not null,
  balance_after integer,
  usage_type text not null default 'customer',
  description text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.stripe_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  checkout_session_id text unique,
  payment_intent_id text,
  stripe_customer_id text,
  bundle_key text,
  gross_usd numeric not null default 0,
  stripe_fee_estimated_usd numeric not null default 0,
  net_usd numeric not null default 0,
  credits_granted integer not null default 0,
  currency text not null default 'usd',
  metadata jsonb not null default '{}'::jsonb
);

alter table public.search_sessions
  add column if not exists depth text,
  add column if not exists enrich_mode boolean not null default false,
  add column if not exists usage_type text not null default 'customer',
  add column if not exists status text not null default 'completed',
  add column if not exists estimated_cost_usd numeric not null default 0;

alter table public.user_credits
  add column if not exists stripe_customer_id text;

alter table public.admin_users enable row level security;
alter table public.api_usage_events enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.stripe_payments enable row level security;

drop policy if exists "Users can read their admin role" on public.admin_users;
drop policy if exists "Users can read own usage events" on public.api_usage_events;
drop policy if exists "Users can read own credit transactions" on public.credit_transactions;
drop policy if exists "Users can insert own credit transactions" on public.credit_transactions;
drop policy if exists "Users can read own stripe payments" on public.stripe_payments;
drop policy if exists "Admins can read all search sessions" on public.search_sessions;
drop policy if exists "Users can update own search sessions for accounting" on public.search_sessions;

create policy "Users can read their admin role"
  on public.admin_users for select
  using (auth.uid() = user_id);

create policy "Users can read own usage events"
  on public.api_usage_events for select
  using (auth.uid() = user_id or exists (select 1 from public.admin_users where user_id = auth.uid()));

create policy "Users can read own credit transactions"
  on public.credit_transactions for select
  using (auth.uid() = user_id or exists (select 1 from public.admin_users where user_id = auth.uid()));

create policy "Users can insert own credit transactions"
  on public.credit_transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can read own stripe payments"
  on public.stripe_payments for select
  using (auth.uid() = user_id or exists (select 1 from public.admin_users where user_id = auth.uid()));

create policy "Admins can read all search sessions"
  on public.search_sessions for select
  using (exists (select 1 from public.admin_users where user_id = auth.uid()));

create policy "Users can update own search sessions for accounting"
  on public.search_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_api_usage_events_user_created on public.api_usage_events(user_id, created_at desc);
create index if not exists idx_api_usage_events_session on public.api_usage_events(search_session_id);
create index if not exists idx_credit_transactions_user_created on public.credit_transactions(user_id, created_at desc);
create index if not exists idx_stripe_payments_user_created on public.stripe_payments(user_id, created_at desc);
