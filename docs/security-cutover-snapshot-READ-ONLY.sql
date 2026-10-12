-- READ-ONLY CUTOVER SNAPSHOT GENERATOR — DO NOT EXECUTE THE OUTPUT AUTOMATICALLY.
-- Run as database administrator immediately before an approved cutover.
-- Save the full output in a secured location outside Git. Review generated SQL manually.
-- This captures existing public schema RLS policy definitions and legacy function EXECUTE
-- grants to PUBLIC/anon/authenticated; it does not back up data, schema, triggers or roles.
-- WARNING: a SQL rollback is NOT a replacement for a verified database backup.
WITH policies AS (
 SELECT format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;',
  policyname,schemaname,tablename,permissive,cmd,
  array_to_string(ARRAY(SELECT quote_ident(r) FROM unnest(roles) r),', '),
  CASE WHEN qual IS NOT NULL THEN format(' USING (%s)',qual) ELSE '' END,
  CASE WHEN with_check IS NOT NULL THEN format(' WITH CHECK (%s)',with_check) ELSE '' END
 ) statement,
 'policy' kind,tablename object_name
 FROM pg_policies
 WHERE schemaname='public' AND tablename=ANY(ARRAY[
  'customer','inventory_purchase','inventory_sku','payment','product_recipe',
  'product_variant','product_variant_stock','product_variant_value','production_entry',
  'production_sku','sales_order','sales_order_item','sales_order_item_option',
  'variant_recipe','variation_type','variation_value','stock_transaction','config_option'])
), function_grants AS (
 SELECT format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO %s;',
  p.proname,pg_get_function_identity_arguments(p.oid),role_name) statement,
 'function_grant' kind,p.proname object_name
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 CROSS JOIN (VALUES ('PUBLIC'),('anon'),('authenticated')) roles(role_name)
 WHERE n.nspname='public' AND p.proname=ANY(ARRAY[
  'add_config_option','add_inventory_stock','complete_sales_order_payment',
  'complete_sales_order_pickup','create_production_sku','create_public_sales_order',
  'create_sales_order','get_config_options','get_inventory_production_usage',
  'get_public_order_menu','get_recipe_management','get_variant_recipe',
  'process_production','remove_config_option','rls_auto_enable',
  'save_base_recipe','save_variant_recipe','validate_product_variant_setup'])
 AND (CASE WHEN role_name='PUBLIC'
   THEN has_function_privilege('public',p.oid,'EXECUTE')
   ELSE has_function_privilege(role_name,p.oid,'EXECUTE') END)
)
SELECT kind,object_name,statement FROM policies
UNION ALL SELECT kind,object_name,statement FROM function_grants
ORDER BY kind,object_name,statement;
