-- Read-only, repeatable RPC execution grant audit for existing MHA POS project.
-- Returns rows ONLY when current grants violate the intended Phase 1 matrix.
-- Does not call functions or modify the database.
WITH expected AS (
 SELECT proname,expected_anon,expected_authenticated
 FROM (VALUES
 ('mha_add_store_inventory_stock',false,true),
 ('mha_admin_assign_existing_user',false,true),
 ('mha_admin_company_store_catalog',false,true),
 ('mha_admin_create_company',false,true),
 ('mha_admin_create_store',false,true),
 ('mha_admin_set_role_permission',false,true),
 ('mha_admin_user_access_catalog',false,true),
 ('mha_admin_user_matrix_catalog',false,true),
 ('mha_can_access_store',false,true),
 ('mha_company_recipe_catalog',false,true),
 ('mha_complete_store_order_payment',false,true),
 ('mha_complete_store_order_pickup',false,true),
 ('mha_create_company_inventory_sku',false,true),
 ('mha_create_company_production_sku',false,true),
 ('mha_create_public_store_order',true,true),
 ('mha_create_store_sales_order',false,true),
 ('mha_current_store_context',false,true),
 ('mha_has_permission',false,true),
 ('mha_is_variant_available_at_store',false,true),
 ('mha_my_access_context',false,true),
 ('mha_process_store_production',false,true),
 ('mha_public_store_menu',true,true),
 ('mha_reserve_variant_stock',false,false),
 ('mha_save_company_recipe',false,true),
 ('mha_staff_store_inventory',false,true),
 ('mha_staff_store_menu',false,true),
 ('mha_staff_store_production_catalog',false,true)
 ) v(proname,expected_anon,expected_authenticated)
), actual AS (
 SELECT p.proname,
  has_function_privilege('anon',p.oid,'EXECUTE') actual_anon,
  has_function_privilege('authenticated',p.oid,'EXECUTE') actual_authenticated
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname LIKE 'mha_%'
), issues AS (
 SELECT e.proname,e.expected_anon,e.expected_authenticated,
  a.actual_anon,a.actual_authenticated,
  CASE WHEN a.proname IS NULL THEN 'MISSING_FUNCTION'
   WHEN a.actual_anon IS DISTINCT FROM e.expected_anon THEN 'ANON_GRANT_MISMATCH'
   WHEN a.actual_authenticated IS DISTINCT FROM e.expected_authenticated THEN 'AUTH_GRANT_MISMATCH'
  END issue
 FROM expected e LEFT JOIN actual a USING(proname)
 UNION ALL
 SELECT a.proname,null::boolean,null::boolean,a.actual_anon,a.actual_authenticated,'UNREVIEWED_FUNCTION'
 FROM actual a LEFT JOIN expected e USING(proname) WHERE e.proname IS NULL
)
SELECT * FROM issues WHERE issue IS NOT NULL ORDER BY proname,issue;
