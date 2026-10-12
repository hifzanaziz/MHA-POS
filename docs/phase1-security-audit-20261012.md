# Phase 1 security audit — 12 October 2026

**Scope:** Supabase project aauyrowsdboatwgjvefb, existing public schema, current feature branch. Read-only database inspection; **no production RLS, grants, data, Auth users or legacy RPCs changed** in this review.

## Confirmed critical findings

1. **Legacy RLS is tenant-unaware.** `sales_order`, `payment`, `sales_order_item`, `sales_order_item_option`, `customer`, `product_variant`, `product_variant_value`, `variation_type`, `variation_value` have authenticated ALL policies with `USING (true)` and `WITH CHECK (true)`. `inventory_sku` and `production_sku` have authenticated broad INSERT/UPDATE/DELETE/SELECT policies. RLS enabled does **not** imply isolation when policies allow every row.
2. **Anonymous inventory leak:** `inventory_sku` has `Allow public read inventory`, anon SELECT `true`.
3. **Legacy SECURITY DEFINER entry points:** authenticated can execute `create_sales_order`, `complete_sales_order_payment`, `complete_sales_order_pickup`, `process_production`, `add_inventory_stock`, `save_base_recipe`, `save_variant_recipe`, `create_production_sku`, `add_config_option`, `remove_config_option`, and unscoped reporting/config RPCs. Anonymous can execute `create_public_sales_order`, `get_public_order_menu`, and `rls_auto_enable`. These must be individually reviewed and disabled/replaced at cutover.
4. **Tenant-scoped data not yet populated:** legacy orders have nullable `store_id`, legacy SKUs nullable `company_id`; broad read policies expose them while active.
5. **Cross-company SKU code collisions:** legacy unique constraints `inventory_sku_sku_code_key`, `production_sku_sku_code_key`, and `product_variant_variant_code_key` enforce global uniqueness. Migration to company-scoped uniqueness requires dependency audit and backup.
6. **Frontend legacy paths:** `src/main.jsx` still contains unscoped `loadMasterData()`, `get_config_options`, and `get_inventory_production_usage` implementations; inspect all callers before cutover. Public ordering recognizes only `/order` and `/customer-order`, not `/order/store/:slug`. Existing order history uses direct `sales_order` SELECT filtered by `store_id`; a secure RLS policy is needed before legacy policies are removed.
7. **Migration reproducibility:** earlier GitHub files generated with `pg_get_functiondef` may omit `REVOKE`/`GRANT` statements that were separately applied to the live database. Compare every committed migration against live function privileges; do not treat replay as secure without fixing grants.

## Existing protections confirmed

- New `mha_*` administration, recipe, inventory, production and store RPCs use tenant-context and/or pinned Super Admin checks.
- `mha_reserve_variant_stock` is not directly executable by `authenticated` or `anon`.
- New administrative RPCs deny `anon` EXECUTE.
- New tenant tables have RLS enabled; access policies restrict store stock reads.

## Non-destructive branch improvements

- Added **review-only** draft at `docs/security-cutover-REVIEW-ONLY.sql` containing legacy policy replacement, store-scoped order SELECT policies, and legacy RPC privilege revocations. This file is deliberately **outside** `supabase/migrations/` to prevent accidental execution.
- Frontend default navigation now favors migrated pages instead of disabled dashboard/config placeholders.

## Cutover prerequisites and tests

1. Independent backup **and verified restore**; migration rollback rehearsal.
2. Authenticated test users across two companies and two stores, each with VIEW/EDIT/NONE role permutations.
3. Assert cross-company and unassigned-store SELECT/INSERT/UPDATE/DELETE and RPC attempts are denied; anon cannot read inventory or invoke legacy mutators.
4. Verify order history and item option joins, sales payment, pickup, stock receipt, production, recipe inheritance, and public store-slug orders.
5. Review draft SQL against current schema, dependent functions, client code, and policies; test in isolated staging before applying.
6. Remove remaining unscoped frontend paths and reconcile all SQL migration grants and missing versioned RPCs.
7. Obtain explicit production-cutover approval. **Do not merge/deploy the draft or delete legacy data beforehand.**

**Status: NOT production-safe for multi-company rollout.**
