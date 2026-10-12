-- Phase 1: legacy tenant ownership backfill, guarded and idempotent.
-- Review and execute only during an approved migration window.
-- This script does not change permissions, roles, stock, orders, or recipes.
begin;
do $$
declare v_company_id bigint;
begin
  if (select count(*) from public.mha_company) <> 1
     or (select count(*) from public.mha_store) <> 1 then
    raise exception 'Expected exactly one legacy company and store';
  end if;
  select id into strict v_company_id from public.mha_company where company_code='HANAAZZ';
  if not exists (select 1 from public.mha_store
                 where company_id=v_company_id and store_code='001') then
    raise exception 'HanaAzz Store 001 is missing';
  end if;
  if exists (select 1 from public.inventory_sku where company_id is not null and company_id<>v_company_id)
    or exists (select 1 from public.production_sku where company_id is not null and company_id<>v_company_id)
    or exists (select 1 from public.mha_user_profile where company_id is not null and company_id<>v_company_id) then
    raise exception 'Existing company ownership conflict';
  end if;
  update public.inventory_sku set company_id=v_company_id where company_id is null;
  update public.production_sku set company_id=v_company_id where company_id is null;
  update public.mha_user_profile set company_id=v_company_id where company_id is null;
end $$;
-- This is deliberately rollback-only until the rehearsal is validated.
select 'inventory_missing_company' check_name,count(*) remaining from public.inventory_sku where company_id is null
union all select 'production_missing_company',count(*) from public.production_sku where company_id is null
union all select 'profile_missing_company',count(*) from public.mha_user_profile where company_id is null;
rollback;
