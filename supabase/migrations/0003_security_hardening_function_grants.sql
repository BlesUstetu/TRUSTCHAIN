-- Explicitly prevent anonymous RPC calls to organization membership helpers.
-- These functions remain available to authenticated users for RLS policy checks.
revoke execute on function public.is_org_member(uuid) from anon;
revoke execute on function public.is_org_admin(uuid) from anon;
revoke execute on function public.is_org_reviewer(uuid) from anon;
