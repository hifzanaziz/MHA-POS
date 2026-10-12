-- Read-only readiness check before enforcing company-scoped SKU policies.
-- Every mismatch_count must be zero before applying an RLS migration.
with checks as (
  select 'inventory_missing_company' check_name, count(*)::bigint mismatch_count
  from public.inventory_sku where company_id is null
  union all
  select 'production_missing_company', count(*)
  from public.production_sku where company_id is null
  union all
  select 'active_profile_missing_company', count(*)
  from public.mha_user_profile where is_active and company_id is null
  union all
  select 'store_assignment_company_mismatch', count(*)
  from public.mha_user_store us
  join public.mha_store s on s.id=us.store_id
  where us.company_id is distinct from s.company_id
  union all
  select 'inventory_unrestricted_policies', count(*)
  from pg_policies where schemaname='public' and tablename='inventory_sku'
    and (qual='true' or with_check='true')
  union all
  select 'production_unrestricted_policies', count(*)
  from pg_policies where schemaname='public' and tablename='production_sku'
    and (qual='true' or with_check='true')
)
select * from checks order by check_name;
