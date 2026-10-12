-- Phase 1: read-only privileged RPC authorization comparison.
-- A false result means the function lacks a DIRECT reference to the check;
-- it does not prove absence of indirect authorization or an exploit.
select p.proname as function_name,
       p.prosecdef as security_definer,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
       position('mha_has_permission' in pg_get_functiondef(p.oid))>0 as direct_permission_check,
       position('mha_current_store_context' in pg_get_functiondef(p.oid))>0 as direct_store_check
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
 'add_inventory_stock','create_production_sku','get_recipe_management',
 'process_production','save_base_recipe','save_variant_recipe',
 'mha_staff_store_inventory','mha_staff_store_production_catalog',
 'mha_create_company_inventory_sku','mha_create_company_production_sku',
 'mha_save_company_recipe','mha_add_store_inventory_stock',
 'mha_process_store_production','mha_company_recipe_catalog'
) order by p.proname;
