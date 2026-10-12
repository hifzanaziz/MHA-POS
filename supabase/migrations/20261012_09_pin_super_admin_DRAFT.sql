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

-- Replace earlier helper definitions so the immutable identity pin is enforced.
-- DEVELOPMENT DRAFT ONLY. Apply after foundation/ownership migrations, backfill and security review.
-- Server-side user context: no client-provided company or store grants access.
create or replace function public.mha_can_access_store(p_store_id bigint)
returns boolean language sql stable security definer set search_path = ''
as $$
 select exists (
   select 1 from public.mha_user_profile u
   join public.mha_store s on s.id = p_store_id and s.is_active
   join public.mha_company c on c.id = s.company_id and c.is_active
   where u.user_id = (select auth.uid()) and u.is_active
     and ((u.is_super_admin and u.company_id is null and u.role_id is null and exists (select 1 from public.mha_super_admin_identity sa where sa.user_id=u.user_id)) or (
       u.company_id = s.company_id
       and exists (select 1 from public.mha_user_store us
         where us.user_id = u.user_id and us.store_id = s.id
           and us.company_id = s.company_id)
     ))
 );
$$;
revoke all on function public.mha_can_access_store(bigint) from public;
grant execute on function public.mha_can_access_store(bigint) to authenticated;

create or replace function public.mha_has_permission(p_company_id bigint,p_submodule_code text,p_required_level text default 'VIEW')
returns boolean language sql stable security definer set search_path = ''
as $$
 select exists (
   select 1 from public.mha_user_profile u
   join public.mha_company c on c.id = p_company_id and c.is_active
   where u.user_id = (select auth.uid()) and u.is_active
     and (
       (u.is_super_admin and u.company_id is null and u.role_id is null and exists (select 1 from public.mha_super_admin_identity sa where sa.user_id=u.user_id))
       or (
         u.company_id = p_company_id
         and p_submodule_code not in ('company_management','store_management','user_access','user_matrix')
         and exists (
           select 1 from public.mha_role_permission rp
           join public.mha_role r on r.id = rp.role_id
           where rp.role_id = u.role_id and r.is_active
             and r.company_id = p_company_id and rp.submodule_code = p_submodule_code
             and (rp.access_level = 'EDIT' or (rp.access_level = 'VIEW' and p_required_level = 'VIEW'))
         )
       )
     )
     and p_required_level in ('VIEW','EDIT')
 );
$$;
revoke all on function public.mha_has_permission(bigint,text,text) from public;
grant execute on function public.mha_has_permission(bigint,text,text) to authenticated;
-- Defense in depth: these helpers must never be treated as an authorization
-- mechanism for user-profile writes. All changes to is_super_admin, role_id,
-- company_id, and store assignments require audited privileged server functions.
-- Never grant client roles UPDATE on mha_user_profile or mha_user_store.
-- IMPORTANT: These helpers alone do not secure legacy tables or SECURITY DEFINER RPCs.
-- Before release, enforce ownership on every table and all transaction functions.
