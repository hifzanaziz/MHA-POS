# Fresh-data cutover decision (12 October 2026)

The owner approved starting the multi-company/multi-store system with new operational data rather than migrating historical records.

## New baseline
- Company: HanaAzz Enterprise (company code HANAAZZ)
- Initial store: Store 001 (store code 001, public slug hanaazz-001)
- Company-shared masters: new inventory SKUs, production SKUs, variants, recipes, configuration, selling prices
- Store-specific: opening stock entered explicitly; new orders, payments, inventory movements and production transactions
- Existing production rows remain untouched until a separately approved cutover/retention decision.

## Phase 1 release gates
1. Apply the foundation and store ownership schema to a validated target environment only.
2. Pin Super Admin to the verified Supabase Auth UUID, never an editable email or user flag.
3. Implement deny-by-default RLS for all new and existing business tables.
4. Replace/audit all legacy SECURITY DEFINER RPCs for server-verified tenant and store access.
5. Implement a new-tenant bootstrap using privileged, audited server-side execution.
6. Provide a safe cutover mechanism so legacy data is not exposed as new tenant data.
7. Validate access isolation and all transaction flows before production deployment.

## Explicit exclusions
- Do not execute 20261012_04_hanaazz_legacy_backfill_DRAFT.sql.
- Do not delete/truncate historical production data.
- Do not set existing rows' company_id or store_id to the new tenant.
- Do not expose old rows through unscoped queries or legacy RPCs.
- Do not promote drafts to production until code, schema, and security are tested together.
