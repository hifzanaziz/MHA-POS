create or replace function public.mha_staff_verify_credentials(
 p_company_code text, p_username text, p_password text
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v record;
begin
 if auth.role() is distinct from 'service_role' then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 if p_company_code is null or p_username is null or p_password is null
    or length(p_company_code)>80 or length(p_username)>80
    or octet_length(p_password)>72 then return null; end if;
 select s.id,s.company_id,s.role_id,s.default_store_id,s.session_version,s.password_hash
 into v from public.mha_staff_account s
 join public.mha_company c on c.id=s.company_id and c.is_active
 join public.mha_role r on r.id=s.role_id and r.company_id=s.company_id and r.is_active
 where lower(c.company_code)=lower(btrim(p_company_code))
 and lower(s.username)=lower(btrim(p_username)) and s.is_active;
 if not found then return null; end if;
 if extensions.crypt(p_password,v.password_hash) is distinct from v.password_hash
 then return null; end if;
 if not exists(
  select 1 from public.mha_staff_store a
  join public.mha_store st on st.id=a.store_id and st.is_active
  where a.staff_id=v.id and a.store_id=v.default_store_id
 ) then return null; end if;
 return jsonb_build_object('staff_id',v.id,'company_id',v.company_id,
  'role_id',v.role_id,'default_store_id',v.default_store_id,
  'session_version',v.session_version);
end $$;
revoke all on function public.mha_staff_verify_credentials(text,text,text) from public,anon,authenticated;
grant execute on function public.mha_staff_verify_credentials(text,text,text) to service_role;