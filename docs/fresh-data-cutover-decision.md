# Fresh-data cutover decision (12 October 2026)

The owner approved starting the multi-company/multi-store system with new operational data rather than migrating historical records.

## New baseline
- Company: HanaAzz Enterprise (company code HANAAZZ)
- Initial store: Store 001 (store code 001, public slug hanaazz-001)
- Company-shared masters: new inventory SKUs, production SKUs, variants, recipes, configuration, selling prices
- Store-specific: opening stock entered explicitly; new orders, payments, inventory movements and production transactions
- The owner has selected permanent deletion of legacy operational data at the final cutover. Existing production rows must remain untouched until the new system passes validation and the cutover is explicitly authorized for execution.

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
- Do not delete/truncate historical production data before final cutover validation and explicit execution authorization.
- Do not set existing rows' company_id or store_id to the new tenant.
- Do not expose old rows through unscoped queries or legacy RPCs.
- Do not promote drafts to production until code, schema, and security are tested together.\n- Prepare a dependency-ordered deletion plan with a verified backup, dry-run row counts, and a rollback/recovery procedure before destructive execution.\n- The owner explicitly authorized deletion of existing Supabase Auth accounts other than the designated Super Admin (m.hifzanaziz@gmail.com) at the final validated cutover. Read-only production audit on 12 Oct 2026 found 3 Auth accounts and exactly 1 matching designated email. Preserve the designated account by verified immutable Auth UUID; never select deletion targets based only on a mutable client profile or unverified email. Re-enumerate and verify accounts at cutover; do not hardcode the historical count.\n- Deletion of other Auth users may cascade to business records, storage ownership, and audit metadata; audit all FK dependencies and retention requirements before execution.\n- Do not delete Auth users until the new login, permissions, and account bootstrap flow is tested and final cutover is explicitly authorized.\n- Never execute a destructive script as part of ordinary schema migration or application startup.
