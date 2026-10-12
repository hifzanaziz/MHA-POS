create or replace function public.mha_staff_session_context(p_staff_id uuid,p_company_id bigint,p_session_version integer)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v record;
begin
 if auth.role() is distinct from 'service_role' then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 select s.id,s.company_id,s.role_id,s.default_store_id,s.session_version,s.username,s.display_name
 into v
 from public.mha_staff_account s
 join public.mha_company c on c.id=s.company_id and c.is_active
 join public.mha_role r on r.id=s.role_id and r.company_id=s.company_id and r.is_active
 where s.id=p_staff_id and s.company_id=p_company_id
 and s.session_version=p_session_version and s.is_active;
 if not found then return null; end if;
 if not exists (
  select 1 from public.mha_staff_store ss
  join public.mha_store st on st.id=ss.store_id and st.company_id=ss.company_id and st.is_active
  where ss.staff_id=v.id and ss.store_id=v.default_store_id
 ) then return null; end if;
 return jsonb_build_object(
  'staff_id',v.id,'company_id',v.company_id,'role_id',v.role_id,
  'default_store_id',v.default_store_id,'username',v.username,'display_name',v.display_name,
  'session_version',v.session_version,
  'stores',coalesce((
   select jsonb_agg(jsonb_build_object('id',st.id,'code',st.store_code,'name',st.store_name) order by st.store_code)
   from public.mha_staff_store ss
   join public.mha_store st on st.id=ss.store_id and st.company_id=ss.company_id and st.is_active
   where ss.staff_id=v.id and ss.company_id=v.company_id
  ),'[]'::jsonb),
  'permissions',coalesce((
   select jsonb_object_agg(rp.submodule_code,rp.access_level)
   from public.mha_role_permission rp where rp.role_id=v.role_id
  ),'{}'::jsonb)
 );
end $$;
revoke all on function public.mha_staff_session_context(uuid,bigint,integer) from public,anon,authenticated;
grant execute on function public.mha_staff_session_context(uuid,bigint,integer) to service_role;