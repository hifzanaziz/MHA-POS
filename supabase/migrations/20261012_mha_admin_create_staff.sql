-- Super Admin creates DB-managed staff; no auth.users entry.
-- This endpoint is NOT a staff login mechanism.
create or replace function public.mha_admin_create_staff(
 p_company_id bigint,p_username text,p_display_name text,p_password text,
 p_role_id bigint,p_store_ids bigint[],p_default_store_id bigint
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare v_id uuid; v_store bigint;
begin
 if auth.uid() is null or not exists (
  select 1 from public.mha_super_admin_identity a
  join public.mha_user_profile p on p.user_id=a.user_id
  where a.user_id=auth.uid() and p.is_active and p.is_super_admin
 ) then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_username is null or p_username !~ '^[A-Za-z0-9._-]{3,80}$'
    or p_display_name is null or length(btrim(p_display_name)) not between 1 and 120
    or p_password is null or length(p_password) < 12 or length(p_password)>1024
 then raise exception 'Invalid staff account details'; end if;
 if p_store_ids is null or cardinality(p_store_ids)=0 or not (p_default_store_id=any(p_store_ids))
 then raise exception 'Select assigned stores and a valid default store'; end if;
 if not exists (select 1 from public.mha_company where id=p_company_id and is_active)
 or not exists (select 1 from public.mha_role where id=p_role_id and company_id=p_company_id and is_active)
 then raise exception 'Invalid company or role'; end if;
 if exists (
  select 1 from unnest(p_store_ids) as s(id)
  left join public.mha_store st on st.id=s.id and st.company_id=p_company_id and st.is_active
  where st.id is null
 ) then raise exception 'Invalid assigned store'; end if;
 insert into public.mha_staff_account(company_id,username,display_name,password_hash,role_id,default_store_id)
 values(p_company_id,lower(p_username),btrim(p_display_name),
        extensions.crypt(p_password,extensions.gen_salt('bf',12)),p_role_id,p_default_store_id)
 returning id into v_id;
 insert into public.mha_staff_store(staff_id,company_id,store_id)
 select v_id,p_company_id,s.id from (select distinct unnest(p_store_ids) id) s;
 return v_id;
end $$;
revoke all on function public.mha_admin_create_staff(bigint,text,text,text,bigint,bigint[],bigint) from public,anon;
grant execute on function public.mha_admin_create_staff(bigint,text,text,text,bigint,bigint[],bigint) to authenticated;
