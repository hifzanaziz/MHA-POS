# Phase 1 frontend RPC cutover inventory

Verified against `src/main.jsx` and store-specific components on `feature/multi-company-store-v4`.

## Active routed screens
- `inventory` -> `StoreInventory`: `mha_staff_store_inventory`, `mha_add_store_inventory_stock`, `mha_create_company_inventory_sku`.
- `production` -> `StoreProduction`: `mha_staff_store_production_catalog`, `mha_process_store_production`, `mha_create_company_production_sku`.
- `recipe` -> `CompanyRecipeManagement`: `mha_company_recipe_catalog`, `mha_save_company_recipe`.

## Legacy calls still present in main.jsx
`add_inventory_stock`, `create_production_sku`, `get_recipe_management`, `save_base_recipe`, `save_variant_recipe`, `process_production` are present in legacy code. Their presence alone does **not** establish that a user can reach them from the current routed screens. Do not revoke execution until other consumers and call sites are reviewed.

## Cutover requirements
1. Confirm no live consumer relies on legacy functions (including other deployments or external integrations).
2. Run staging tests for Super Admin, company users with VIEW/EDIT, users assigned to other stores, anonymous users, and unauthorized cross-company access.
3. Verify company-aware RPC permissions independently of direct-table RLS, because SECURITY DEFINER may bypass table policies.
4. Rehearse the RLS SQL in a transaction, compare policies and effective access, and roll back.
5. Activate only after an approved production window and documented rollback plan.

No live access permissions are changed by this document.
