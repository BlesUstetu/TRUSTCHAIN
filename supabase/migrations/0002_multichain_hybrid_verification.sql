-- Trustchain multi-chain and hybrid verification expansion.
-- Apply AFTER 0001_initial_schema.sql in the dedicated Trustchain Supabase project.
-- RPC URLs and provider secrets must remain in server environment variables.

create table public.chains (
  chain_id bigint primary key,
  name text not null,
  slug text not null unique,
  explorer_base_url text not null,
  native_currency text not null,
  finality_blocks integer not null default 12 check (finality_blocks >= 0),
  enabled boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.chains (chain_id, name, slug, explorer_base_url, native_currency, finality_blocks, enabled)
values
  (1, 'Ethereum', 'ethereum', 'https://etherscan.io', 'ETH', 12, false),
  (10, 'Optimism', 'optimism', 'https://optimistic.etherscan.io', 'ETH', 20, false),
  (56, 'BNB Chain', 'bnb-chain', 'https://bscscan.com', 'BNB', 15, false),
  (137, 'Polygon', 'polygon', 'https://polygonscan.com', 'POL', 128, false),
  (8453, 'Base', 'base', 'https://basescan.org', 'ETH', 20, true),
  (42161, 'Arbitrum One', 'arbitrum-one', 'https://arbiscan.io', 'ETH', 20, false)
on conflict (chain_id) do update set
  name = excluded.name,
  slug = excluded.slug,
  explorer_base_url = excluded.explorer_base_url,
  native_currency = excluded.native_currency;

-- Keep projects.chain_id for backwards compatibility during migration.
-- New multi-chain reads/writes must use project_networks.
create table public.project_networks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  chain_id bigint not null references public.chains(chain_id),
  status text not null default 'pending' check (status in ('pending','active','paused','error')),
  added_at timestamptz not null default now(),
  unique (project_id, chain_id)
);

insert into public.project_networks (organization_id, project_id, chain_id, status)
select p.organization_id, p.id, p.chain_id, 'pending'
from public.projects p
where p.chain_id is not null
on conflict (project_id, chain_id) do nothing;

alter table public.project_contracts
  add constraint project_contracts_chain_fk foreign key (chain_id) references public.chains(chain_id);
alter table public.project_wallets
  add constraint project_wallets_chain_fk foreign key (chain_id) references public.chains(chain_id);
alter table public.chain_events
  add constraint chain_events_chain_fk foreign key (chain_id) references public.chains(chain_id);

alter table public.organization_members drop constraint organization_members_role_check;
alter table public.organization_members add constraint organization_members_role_check
  check (role in ('owner','admin','reviewer','analyst','member'));

create table public.verification_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  chain_id bigint references public.chains(chain_id),
  subject_type text not null check (subject_type in ('project','contract','wallet','token','claim')),
  subject_address text,
  check_type text not null,
  method text not null check (method in ('automated','manual','hybrid')),
  status text not null default 'queued'
    check (status in ('queued','running','passed','failed','needs_review','rejected','error')),
  engine_version text,
  result jsonb not null default '{}'::jsonb,
  error_code text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.verification_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  verification_run_id uuid not null references public.verification_runs(id) on delete cascade,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  decision text not null default 'pending'
    check (decision in ('pending','approved','rejected','request_changes')),
  checklist jsonb not null default '{}'::jsonb,
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.evidence_records
  add column verification_run_id uuid references public.verification_runs(id) on delete set null,
  add column review_status text not null default 'not_required'
    check (review_status in ('not_required','pending','approved','rejected')),
  add column content_hash text,
  add column reviewer_user_id uuid references auth.users(id) on delete set null;

create table public.public_passport_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  public_slug text not null unique,
  payload jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

create table public.indexer_cursors (
  chain_id bigint primary key references public.chains(chain_id),
  worker_name text not null,
  last_scanned_block bigint not null default 0,
  last_finalized_block bigint not null default 0,
  last_block_hash text,
  updated_at timestamptz not null default now(),
  check (last_finalized_block <= last_scanned_block)
);

create table public.monitoring_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  chain_id bigint references public.chains(chain_id),
  job_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued'
    check (status in ('queued','processing','completed','failed','dead_letter')),
  attempts integer not null default 0 check (attempts >= 0),
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  lock_token uuid,
  last_error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index project_networks_org_idx on public.project_networks(organization_id, project_id);
create index verification_runs_project_idx on public.verification_runs(project_id, created_at desc);
create index verification_reviews_queue_idx on public.verification_reviews(organization_id, decision, created_at);
create index passport_slug_published_idx on public.public_passport_snapshots(public_slug) where is_published = true;
create index monitoring_jobs_queue_idx on public.monitoring_jobs(status, run_after) where status in ('queued','failed');
create index audit_logs_org_created_idx on public.audit_logs(organization_id, created_at desc);

alter table public.chains enable row level security;
alter table public.project_networks enable row level security;
alter table public.verification_runs enable row level security;
alter table public.verification_reviews enable row level security;
alter table public.public_passport_snapshots enable row level security;
alter table public.indexer_cursors enable row level security;
alter table public.monitoring_jobs enable row level security;
alter table public.audit_logs enable row level security;

create policy "chains are readable" on public.chains
for select to anon, authenticated using (true);
create policy "members read project networks" on public.project_networks
for select to authenticated using (public.is_org_member(organization_id));
create policy "members read verification runs" on public.verification_runs
for select to authenticated using (public.is_org_member(organization_id));
-- Role-aware helpers run with the function owner's privileges and expose only booleans.
create or replace function public.is_org_admin(target_org uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = (select auth.uid())
      and m.role in ('owner','admin')
  );
$;

create or replace function public.is_org_reviewer(target_org uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = (select auth.uid())
      and m.role in ('owner','admin','reviewer')
  );
$;

create or replace function public.is_public_project(target_project uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $
  select exists (
    select 1 from public.projects p
    where p.id = target_project and p.visibility = 'public'
  );
$;

revoke all on function public.is_org_admin(uuid) from public;
revoke all on function public.is_org_reviewer(uuid) from public;
revoke all on function public.is_public_project(uuid) from public;
grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.is_org_reviewer(uuid) to authenticated;
grant execute on function public.is_public_project(uuid) to anon, authenticated;

drop policy "members read verification reviews" on public.verification_reviews;
create policy "reviewers read verification reviews" on public.verification_reviews
for select to authenticated using (public.is_org_reviewer(organization_id));

drop policy "members read audit logs" on public.audit_logs;
create policy "admins read audit logs" on public.audit_logs
for select to authenticated using (public.is_org_admin(organization_id));

-- API key hashes and billing identifiers must not be readable by ordinary members.
drop policy "api_keys_member_select" on public.api_keys;
create policy "admins read api keys" on public.api_keys
for select to authenticated using (public.is_org_admin(organization_id));

drop policy "subscriptions_member_select" on public.subscriptions;
create policy "admins read subscriptions" on public.subscriptions
for select to authenticated using (public.is_org_admin(organization_id));

drop policy "usage_metrics_member_select" on public.usage_metrics;
create policy "admins read usage metrics" on public.usage_metrics
for select to authenticated using (public.is_org_admin(organization_id));

-- Public reads are restricted to curated snapshots and a public parent project.
create policy "published passport snapshots are public" on public.public_passport_snapshots
for select to anon, authenticated using (
  is_published = true and public.is_public_project(project_id)
);

-- indexer_cursors and monitoring_jobs intentionally have no anon/authenticated policies.
-- Server routes/workers use service role only after authorization and validation.

comment on table public.chains is 'Supported EVM chain registry. RPC credentials are never stored here.';
comment on table public.project_networks is 'Networks enabled for each project; supports multiple EVM chains per project.';
comment on table public.verification_runs is 'Verification execution records; not a safety certification.';
comment on table public.verification_reviews is 'Human review decisions linked to verification runs.';
comment on table public.public_passport_snapshots is 'Curated public projection; only explicitly published snapshots are readable anonymously.';
comment on table public.indexer_cursors is 'Worker checkpoints for reorg-aware chain indexing.';
comment on table public.monitoring_jobs is 'Internal retryable monitoring queue; service role only.';
comment on table public.audit_logs is 'Organization audit trail for sensitive actions.';
