-- DRAFT ONLY: run once in a controlled cutover after reviewing the target Auth user.
-- The email is used for one-time bootstrap only. Authorization uses the pinned UUID.
begin;
create table if not exists public.mha_super_admin_identity (
 singleton boolean primary key default true check(singleton),
 user_id uuid not null unique references auth.users(id) on delete restrict,
 pinned_at timestamptz not null default now()
);
alter table public.mha_super_admin_identity enable row level security;
revoke all on public.mha_super_admin_identity from anon,authenticated;
do $body$
declare v_user_id uuid; v_matches integer;
begin
 select count(*),min(id) into v_matches,v_user_id
 from auth.users
 where lower(email)='m.hifzanaziz@gmail.com'
 and email_confirmed_at is not null;
 if v_matches <> 1 then
   raise exception 'Expected exactly one verified designated administrator';
 end if;
 insert into public.mha_super_admin_identity(singleton,user_id)
 values(true,v_user_id)
 on conflict(singleton) do update
 set user_id=public.mha_super_admin_identity.user_id;
 if not exists(select 1 from public.mha_super_admin_identity where user_id=v_user_id)
 then raise exception 'Pinned Super Admin differs from verified Auth account'; end if;
end;
$body$;
commit;
-- Every Super Admin helper MUST require a match to this table by auth.uid().
-- is_super_admin in the profile is not authoritative on its own.
