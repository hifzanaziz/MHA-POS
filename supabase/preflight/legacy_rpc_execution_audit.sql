-- Phase 1: read-only legacy RPC exposure audit.
-- SECURITY DEFINER functions can bypass table RLS; validate internal
-- company/store authorization before retaining authenticated EXECUTE.
select p.proname as function_name,
       p.prosecdef as security_definer,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
 'add_inventory_stock','create_production_sku','get_recipe_management',
 'save_base_recipe','save_variant_recipe','process_production',
 'mha_staff_store_inventory','mha_staff_store_production_catalog'
)
order by p.proname;
-- Do not revoke EXECUTE until frontend call sites and legacy functions
-- have been migrated to the company-aware mha_* RPCs.
