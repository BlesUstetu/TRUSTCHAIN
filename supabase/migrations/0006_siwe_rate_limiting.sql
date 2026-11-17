-- Trustchain SIWE abuse controls.
-- Apply after migrations 0001-0005 on the dedicated Trustchain Supabase project.

create table if not exists public.siwe_rate_limits (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.siwe_rate_limits enable row level security;
revoke all on table public.siwe_rate_limits from public, anon, authenticated;
grant all on table public.siwe_rate_limits to service_role;

create or replace function public.consume_siwe_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$'
     or p_limit < 1 or p_limit > 100
     or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate limit parameters';
  end if;

  insert into public.siwe_rate_limits (
    key_hash, window_started_at, request_count, updated_at
  )
  values (p_key_hash, now(), 1, now())
  on conflict (key_hash) do update
    set window_started_at = case
          when public.siwe_rate_limits.window_started_at
            <= now() - make_interval(secs => p_window_seconds)
          then now()
          else public.siwe_rate_limits.window_started_at
        end,
        request_count = case
          when public.siwe_rate_limits.window_started_at
            <= now() - make_interval(secs => p_window_seconds)
          then 1
          else public.siwe_rate_limits.request_count + 1
        end,
        updated_at = now()
  returning request_count into v_count;

  -- Opportunistic cleanup keeps this small table bounded without a scheduler.
  delete from public.siwe_rate_limits
  where updated_at < now() - interval '1 day';

  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_siwe_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_siwe_rate_limit(text, integer, integer) to service_role;

comment on table public.siwe_rate_limits is
  'Server-only HMAC-keyed SIWE request counters; raw client IP addresses are not stored.';
