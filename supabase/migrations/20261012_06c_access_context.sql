-- Versioned copy of existing live access-context RPC. Non-destructive; not applied here.
CREATE OR REPLACE FUNCTION public.mha_my_access_context()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_user uuid;v_profile record;v_stores jsonb;v_permissions jsonb;
begin
 v_user:=auth.uid();
 if v_user is null then raise exception 'Authentication required' using errcode='42501';end if;
 select user_id,username,company_id,role_id,default_store_id,is_active,is_super_admin into v_profile
 from public.mha_user_profile where user_id=v_user;
 if not found or not v_profile.is_active then raise exception 'User profile inactive or missing' using errcode='42501';end if;
 if v_profile.is_super_admin then
  if not exists(select 1 from public.mha_super_admin_identity where user_id=v_user) then raise exception 'Invalid super admin identity' using errcode='42501';end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'company_id',s.company_id,'store_code',s.store_code,'store_name',s.store_name,'company_name',c.company_name) order by c.company_name,s.store_code),'[]'::jsonb) into v_stores
  from public.mha_store s join public.mha_company c on c.id=s.company_id where s.is_active and c.is_active;
  v_permissions:='{"all":"EDIT"}'::jsonb;
 else
  if v_profile.company_id is null or v_profile.role_id is null or not exists(select 1 from public.mha_company where id=v_profile.company_id and is_active) then raise exception 'Company or role missing' using errcode='42501';end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'company_id',s.company_id,'store_code',s.store_code,'store_name',s.store_name,'company_name',c.company_name) order by s.store_code),'[]'::jsonb) into v_stores
  from public.mha_user_store us join public.mha_store s on s.id=us.store_id and s.company_id=us.company_id and s.is_active
  join public.mha_company c on c.id=s.company_id and c.is_active
  where us.user_id=v_user and us.company_id=v_profile.company_id;
  select coalesce(jsonb_object_agg(p.submodule_code,p.access_level),'{}'::jsonb) into v_permissions
  from public.mha_role_permission p where p.role_id=v_profile.role_id;
 end if;
 return jsonb_build_object('user_id',v_user,'username',v_profile.username,'company_id',v_profile.company_id,'is_super_admin',v_profile.is_super_admin,'default_store_id',v_profile.default_store_id,'stores',v_stores,'permissions',v_permissions);
end $function$;
REVOKE ALL ON FUNCTION public.mha_my_access_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mha_my_access_context() TO authenticated;
