# Live MHA POS read-only security verification — 2026-10-12

Project: `aauyrowsdboatwgjvefb`. **Executed only SELECT queries** against PostgreSQL catalogs and existing records. No migrations, DML, Auth account creation, policy changes or production deployment.

## Results

| Check | Result | Evidence |
|---|---|---|
| Tenant ownership integrity | PASS (limited coverage) | 0 wrong-company user/store assignments; 0 wrong-company inventory stock; 0 wrong-company variant stock |
| New administrative RPC grants | PASS (catalog-level) | `mha_admin_assign_existing_user`, `mha_admin_create_company`, `mha_admin_user_access_catalog`, `mha_admin_user_matrix_catalog` deny `anon` EXECUTE |
| Internal reservation RPC grants | PASS (catalog-level) | `mha_reserve_variant_stock` denies `anon` and `authenticated` direct EXECUTE |
| Store inventory and recipe RPC grants | PASS (catalog-level) | `mha_staff_store_inventory` and `mha_company_recipe_catalog` deny `anon` EXECUTE |
| Legacy table isolation | FAIL | `sales_order`, `payment`, `customer`, `sales_order_item` and other legacy tables still have `true` policies |
| Anonymous legacy function exposure | FAIL | `create_public_sales_order` and `rls_auto_enable` remain executable by `anon` |
| Legacy ownership backfill | NOT READY | 41 orders with NULL store_id, 22 inventory SKUs and 10 production SKUs with NULL company_id |
| Authenticated cross-company test | NOT EXECUTED | Only one seeded company and store; no safe multi-tenant fixtures or separate authenticated test sessions available |

## Inventory

- Companies: 1
- Stores: 1
- User profiles: 1
- Sales orders: 41
- Inventory SKUs: 22
- Production SKUs: 10

## Next safe steps on current project

1. Add read-only checks for all existing function grants and constraints to CI documentation.
2. Review each SECURITY DEFINER function for authorization bypass, search_path, and unexpected side effects.
3. Prepare (but do not execute) tenant-isolation policies and a rollback plan.
4. Before enabling multiple tenants, secure or replace old functions and permissive policies in a coordinated approved cutover.
5. To test actual authenticated cross-company isolation on this project, establish synthetic users/companies/stores only with explicit agreement on test-data writes and cleanup, and use genuine separate JWT sessions. Catalog-level grants do not prove per-user behavior.

**Status: Security audit completed; tenant isolation not approved.**
