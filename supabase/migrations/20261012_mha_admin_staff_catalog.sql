create or replace function public.mha_admin_staff_catalog()
returns jsonb language plpgsql security definer set search_path = ''
as $$
begin
 if auth.uid() is null or not exists (
  select 1 from public.mha_super_admin_identity a
  join public.mha_user_profile p on p.user_id=a.user_id
  where a.user_id=auth.uid() and p.is_super_admin and p.is_active
 ) then raise exception 'Not authorized' using errcode='42501'; end if;
 return jsonb_build_object(
  'users', coalesce((select jsonb_agg(jsonb_build_object(
   'id',s.id,'company_id',s.company_id,'username',s.username,
   'display_name',s.display_name,'role_id',s.role_id,
   'default_store_id',s.default_store_id,'is_active',s.is_active
  ) order by s.username) from public.mha_staff_account s),'[]'::jsonb),
  'assignments', coalesce((select jsonb_agg(jsonb_build_object(
   'staff_id',a.staff_id,'store_id',a.store_id,'company_id',a.company_id
  )) from public.mha_staff_store a),'[]'::jsonb)
 );
end $$;
revoke all on function public.mha_admin_staff_catalog() from public,anon;
grant execute on function public.mha_admin_staff_catalog() to authenticated;
