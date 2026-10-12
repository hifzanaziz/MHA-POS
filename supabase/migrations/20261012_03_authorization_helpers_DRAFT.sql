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
     and (u.is_super_admin or (
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
       u.is_super_admin
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
-- IMPORTANT: These helpers alone do not secure legacy tables or SECURITY DEFINER RPCs.
-- Before release, enforce ownership on every table and all transaction functions.
