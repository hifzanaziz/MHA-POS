create table if not exists public.mha_staff_login_attempt (
 key_hash text primary key,
 window_start timestamptz not null default now(),
 attempts integer not null default 0,
 updated_at timestamptz not null default now()
);
alter table public.mha_staff_login_attempt enable row level security;
revoke all on public.mha_staff_login_attempt from public,anon,authenticated;
create or replace function public.mha_staff_login_rate_limit(p_key_hash text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_key_hash is null or p_key_hash !~ '^[a-f0-9]{64}$' then return false; end if;
 insert into public.mha_staff_login_attempt(key_hash,window_start,attempts)
 values(p_key_hash,now(),1)
 on conflict(key_hash) do update set
 attempts=case when public.mha_staff_login_attempt.window_start<now()-interval '15 minutes' then 1 else public.mha_staff_login_attempt.attempts+1 end,
 window_start=case when public.mha_staff_login_attempt.window_start<now()-interval '15 minutes' then now() else public.mha_staff_login_attempt.window_start end,
 updated_at=now()
 returning attempts into v_count;
 return v_count<=5;
end $$;
revoke all on function public.mha_staff_login_rate_limit(text) from public,anon,authenticated;
grant execute on function public.mha_staff_login_rate_limit(text) to service_role;