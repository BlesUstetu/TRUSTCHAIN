-- Trustchain security audit remediation.
-- Apply after migrations 0001-0004 on the dedicated Trustchain Supabase project.

-- A project can only remain in, or move to, an organization where the caller
-- has an owner/admin role. This closes the cross-tenant organization_id update.
drop policy if exists "admins can update projects" on public.projects;
create policy "admins can update projects" on public.projects
for update to authenticated
using (
  exists (
    select 1
    from public.organization_members as m
    where m.organization_id = projects.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.organization_members as m
    where m.organization_id = projects.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
  )
);

-- Server-only SIWE nonce registry. Raw nonces are never stored in the database.
create table if not exists public.siwe_nonces (
  nonce_hash text primary key
    check (nonce_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists siwe_nonces_expiry_idx
  on public.siwe_nonces (expires_at);

alter table public.siwe_nonces enable row level security;
revoke all on table public.siwe_nonces from anon, authenticated;
grant all on table public.siwe_nonces to service_role;

comment on table public.siwe_nonces is
  'Server-only, hashed, short-lived, single-use SIWE nonces. Never expose through client APIs.';
