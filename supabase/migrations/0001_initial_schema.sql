-- Trustchain initial schema
-- Apply to a new Supabase project. All tenant-owned tables use organization_id.
-- Public passport access is intentionally not enabled in this initial migration.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','analyst','member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  website_url text,
  logo_url text,
  chain_id bigint not null default 8453,
  token_address text,
  visibility text not null default 'private' check (visibility in ('private','unlisted','public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.project_contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  chain_id bigint not null,
  contract_address text not null,
  contract_label text,
  contract_type text,
  is_proxy boolean,
  created_at timestamptz not null default now(),
  unique (chain_id, contract_address)
);

create table if not exists public.project_wallets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  chain_id bigint not null,
  wallet_address text not null,
  wallet_label text not null,
  attribution text not null default 'project_reported'
    check (attribution in ('project_reported','independently_verified','third_party')),
  created_at timestamptz not null default now(),
  unique (project_id, chain_id, wallet_address)
);

create table if not exists public.evidence_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  claim_type text not null,
  claim_text text not null,
  submitted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.evidence_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  claim_id uuid references public.evidence_claims(id) on delete set null,
  source_type text not null check (source_type in ('onchain_observed','project_reported','third_party')),
  status text not null check (status in ('verified','observed','reported','unverified','stale','alert')),
  title text not null,
  description text,
  source_uri text,
  transaction_hash text,
  chain_id bigint,
  block_number bigint,
  payload jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.chain_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  chain_id bigint not null,
  block_number bigint not null,
  block_hash text not null,
  transaction_hash text not null,
  log_index integer not null,
  contract_address text not null,
  event_name text,
  decoded_data jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  unique (chain_id, transaction_hash, log_index)
);

create table if not exists public.monitoring_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  rule_type text not null,
  configuration jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  rule_id uuid references public.monitoring_rules(id) on delete set null,
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  title text not null,
  description text,
  event_reference text,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.verification_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  subject_type text not null,
  subject_id uuid,
  check_name text not null,
  result text not null,
  details jsonb not null default '{}'::jsonb,
  source_uri text,
  checked_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','starter','growth','business','enterprise')),
  status text not null default 'trialing' check (status in ('trialing','active','past_due','canceled','incomplete')),
  billing_provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  metric_name text not null,
  quantity bigint not null default 1,
  period_start date not null default current_date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists projects_org_idx on public.projects(organization_id);
create index if not exists evidence_project_observed_idx on public.evidence_records(project_id, observed_at desc);
create index if not exists events_project_block_idx on public.chain_events(project_id, block_number desc);
create index if not exists alerts_org_created_idx on public.alerts(organization_id, created_at desc);
create index if not exists verification_project_checked_idx on public.verification_history(project_id, checked_at desc);

-- Helper: current user's membership in an organization.
create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_contracts enable row level security;
alter table public.project_wallets enable row level security;
alter table public.evidence_claims enable row level security;
alter table public.evidence_records enable row level security;
alter table public.chain_events enable row level security;
alter table public.monitoring_rules enable row level security;
alter table public.alerts enable row level security;
alter table public.verification_history enable row level security;
alter table public.subscriptions enable row level security;
alter table public.api_keys enable row level security;
alter table public.usage_metrics enable row level security;

create policy "members can read their organizations" on public.organizations
for select to authenticated using (public.is_org_member(id));

create policy "members can read organization membership" on public.organization_members
for select to authenticated using (public.is_org_member(organization_id));

create policy "members can read projects" on public.projects
for select to authenticated using (public.is_org_member(organization_id));
create policy "admins can insert projects" on public.projects
for insert to authenticated with check (
  exists (select 1 from public.organization_members m
    where m.organization_id = projects.organization_id and m.user_id = auth.uid()
      and m.role in ('owner','admin'))
);
create policy "admins can update projects" on public.projects
for update to authenticated using (
  exists (select 1 from public.organization_members m
    where m.organization_id = organization_id and m.user_id = auth.uid()
      and m.role in ('owner','admin'))
) with check (public.is_org_member(organization_id));

-- Tenant-scoped read/write policies for operational tables.
do $$
declare t text;
begin
  foreach t in array array[
    'project_contracts','project_wallets','evidence_claims','evidence_records',
    'chain_events','monitoring_rules','alerts','verification_history',
    'subscriptions','api_keys','usage_metrics'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.is_org_member(organization_id))', t || '_member_select', t);
  end loop;
end $$;

-- No public passport policies are enabled yet. Public access must be implemented
-- through a deliberately scoped server-side read model, not broad table access.
