-- SECURITY CUTOVER DRAFT — NOT APPLIED
-- Prerequisites: independently restored backup, authenticated UAT, rollback rehearsal,
-- new public store-slug ordering route, and explicit approval of production cutover.
-- This migration intentionally breaks old direct-table and legacy-RPC workflows.
BEGIN;
-- Remove all legacy permissive policies from legacy operational tables.
DO $$
DECLARE r record;
BEGIN
 FOR r IN SELECT schemaname,tablename,policyname FROM pg_policies
 WHERE schemaname='public' AND tablename=ANY(ARRAY[
  'customer','inventory_purchase','inventory_sku','payment','product_recipe',
  'product_variant','product_variant_stock','product_variant_value','production_entry',
  'production_sku','sales_order','sales_order_item','sales_order_item_option',
  'variant_recipe','variation_type','variation_value','stock_transaction','config_option'])
 LOOP
  EXECUTE format('DROP POLICY %I ON %I.%I',r.policyname,r.schemaname,r.tablename);
 END LOOP;
END $$;
-- Direct table reads are permitted only for store-scoped order history.
-- All writes must go through permission-checking, tenant-scoped RPCs.
CREATE POLICY mha_scoped_order_read ON public.sales_order
 FOR SELECT TO authenticated
 USING (
  store_id IS NOT NULL AND public.mha_can_access_store(store_id)
  AND EXISTS (
   SELECT 1 FROM public.mha_store s WHERE s.id=store_id
   AND (public.mha_has_permission(s.company_id,'orderHistory','VIEW')
     OR public.mha_has_permission(s.company_id,'order','VIEW'))
  )
 );
CREATE POLICY mha_scoped_order_item_read ON public.sales_order_item
 FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.sales_order o WHERE o.id=sales_order_id));
CREATE POLICY mha_scoped_order_item_option_read ON public.sales_order_item_option
 FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.sales_order_item i WHERE i.id=sales_order_item_id));
-- Remove PUBLIC and authenticated execute grants from legacy unscoped RPCs.
-- New mha_* RPCs remain available with their existing scoped authorization.
DO $$
DECLARE r record;
BEGIN
 FOR r IN SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname=ANY(ARRAY[
  'add_config_option','add_inventory_stock','complete_sales_order_payment',
  'complete_sales_order_pickup','create_production_sku','create_public_sales_order',
  'create_sales_order','get_config_options','get_inventory_production_usage',
  'get_public_order_menu','get_recipe_management','get_variant_recipe',
  'process_production','remove_config_option','rls_auto_enable',
  'save_base_recipe','save_variant_recipe','validate_product_variant_setup'])
 LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
   r.proname,r.args);
 END LOOP;
END $$;
COMMIT;
