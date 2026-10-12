-- Phase 1: read-only post-cutover validation for company SKU policies.
-- Expected: no unrestricted policies, no anonymous inventory SELECT,
-- and one policy per SELECT/INSERT/UPDATE/DELETE for each SKU table.
select tablename,cmd,policyname,roles,qual,with_check
from pg_policies
where schemaname='public' and tablename in ('inventory_sku','production_sku')
order by tablename,cmd,policyname;
select 'unrestricted_sku_policies' check_name,count(*)::bigint failures
from pg_policies where schemaname='public'
and tablename in ('inventory_sku','production_sku')
and (qual='true' or with_check='true')
union all
select 'anonymous_inventory_read',count(*)
from pg_policies where schemaname='public' and tablename='inventory_sku'
and cmd in ('SELECT','ALL') and 'anon'=any(roles)
union all
select 'missing_company_inventory',count(*)
from public.inventory_sku where company_id is null
union all
select 'missing_company_production',count(*)
from public.production_sku where company_id is null;
