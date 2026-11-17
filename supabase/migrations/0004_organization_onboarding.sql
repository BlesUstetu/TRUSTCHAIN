-- Trustchain organization onboarding
-- Apply only to the dedicated Trustchain Supabase project, after migration 0003.

create or replace function public.create_initial_organization(
  p_name text,
  p_slug text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_org_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_slug text := lower(btrim(coalesce(p_slug, '')));
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if length(v_name) < 2 or length(v_name) > 80 then
    raise exception 'Organization name must be between 2 and 80 characters' using errcode = '22023';
  end if;

  if length(v_slug) < 2 or length(v_slug) > 40 or v_slug !~ '^[a-z0-9]+([a-z0-9-]{0,38}[a-z0-9])?
    raise exception 'Use a 2-40 character slug with lowercase letters, numbers, and internal hyphens' using errcode = '22023';
  end if;

  -- Serialize simultaneous setup attempts for the same account.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  -- This endpoint is for first-time setup only. Additional organizations
  -- require a separately authorized organization-management workflow.
  if exists (
    select 1 from public.organization_members m
    where m.user_id = v_user_id
  ) then
    raise exception 'An organization is already associated with this account' using errcode = '23505';
  end if;

  insert into public.organizations (name, slug)
  values (v_name, v_slug)
  returning id into v_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org_id, v_user_id, 'owner');

  insert into public.subscriptions (organization_id, plan, status)
  values (v_org_id, 'free', 'trialing');

  return v_org_id;
end;
$$;

revoke all on function public.create_initial_organization(text, text) from public;
revoke all on function public.create_initial_organization(text, text) from anon;
grant execute on function public.create_initial_organization(text, text) to authenticated;

comment on function public.create_initial_organization(text, text) is
  'Atomically creates the first organization, owner membership, and free subscription for the authenticated user.';
 then
    raise exception 'Use a 2-40 character slug with lowercase letters, numbers, and internal hyphens' using errcode = '22023';
  end if;

  -- This endpoint is for first-time setup only. Additional organizations
  -- require a separately authorized organization-management workflow.
  if exists (
    select 1 from public.organization_members m
    where m.user_id = v_user_id
  ) then
    raise exception 'An organization is already associated with this account' using errcode = '23505';
  end if;

  insert into public.organizations (name, slug)
  values (v_name, v_slug)
  returning id into v_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org_id, v_user_id, 'owner');

  insert into public.subscriptions (organization_id, plan, status)
  values (v_org_id, 'free', 'trialing');

  return v_org_id;
end;
$$;

revoke all on function public.create_initial_organization(text, text) from public;
revoke all on function public.create_initial_organization(text, text) from anon;
grant execute on function public.create_initial_organization(text, text) to authenticated;

comment on function public.create_initial_organization(text, text) is
  'Atomically creates the first organization, owner membership, and free subscription for the authenticated user.';
