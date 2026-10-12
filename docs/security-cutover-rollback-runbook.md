# MHA POS — security cutover and rollback runbook (review only)

**Status:** NOT APPROVED FOR EXECUTION. The existing MHA POS Supabase project is the only environment. Do not apply the draft cutover during ordinary testing. No new paid staging project is required for read-only checks.

## Pre-cutover gate (all mandatory)

1. Obtain an independently verified, restorable database backup and a secure copy of the exact schema/RLS/ACL state. Confirm the restore process with a real rehearsal. The snapshot query `docs/security-cutover-snapshot-READ-ONLY.sql` is **not** a backup.
2. Resolve legacy data ownership (41 orders without store, 22 inventory SKUs and 10 production SKUs without company at audit). Explicitly decide archive/backfill versus fresh start. No deletion before backup.
3. Ensure the new public store-slug order route is implemented and tested; old public ordering RPC will be revoked by the draft.
4. Verify new scoped order, payment, pickup, stock, recipe, production, admin and public RPCs with genuine Auth identities and access levels. Check NONE, VIEW, EDIT, unassigned store, inactive user/store/company, and other-company access.
5. Verify the function dependency graph and new schema constraints; do not rely on the UI's permission checks as a security boundary.
6. Review `docs/security-cutover-REVIEW-ONLY.sql` line by line; confirm every legacy RPC and direct-table consumer has a replacement. Require explicit user approval for live security changes.
7. Agree a maintenance window, accountable operator, go/no-go criteria, and an application rollback version. Freeze writes during cutover and validation.

## Execution procedure (only after approval)

- Record exact Git commit, migration checksum, current table counts and Supabase configuration.
- Execute `docs/security-cutover-snapshot-READ-ONLY.sql` as a **SELECT only**. Save and independently review its generated statements outside Git.
- Take and verify final backup. Record timestamps and change ticket.
- Apply the reviewed cutover as a single transaction. Stop immediately on any error.
- Validate policy and EXECUTE grants using `pg_policies`, `pg_proc`, `aclexplode`, and Auth session tests. Confirm unauthorized operations fail and authorized operations work.
- Exercise actual staff order creation/payment/pickup, inventory receiving, production, company-shared recipe editing, and public store-slug ordering using controlled transactions.
- Deploy the matching application only after database and application compatibility is confirmed. Monitor error rates and stop new writes if rollback is needed.

## Rollback decision and limitations

- **Before COMMIT:** ROLLBACK the transaction. Verify catalog state and normal application behavior.
- **After COMMIT:** Stop writes. Restore the pre-cutover RLS policies and function EXECUTE ACLs from the reviewed snapshot **only if** the schema and app remain compatible. Restore original app version together with required RPC contracts.
- If schema/data have changed or business writes occurred, policy restoration alone is insufficient. Use the verified database recovery plan with an explicit reconciliation strategy for writes since the snapshot. Never blindly replay old policy statements over modified policies.
- Recheck permission denials and legitimate operations after rollback. Record incident and hold the next attempt.

## Known blockers at 2026-10-12

- Permissive legacy policies on sales orders, payments, customers, inventory and product data.
- Legacy unscoped SECURITY DEFINER RPCs still executable; `create_public_sales_order` and `rls_auto_enable` retain anonymous EXECUTE grants. An EXECUTE grant alone does not prove a callable event trigger, but is still unnecessary exposure.
- Legacy records lack company/store ownership; current integrity checks have limited coverage.
- New User Access cross-company reassignment fix is committed to the feature branch, not applied live.
- No separate authenticated tenant integration tests have been completed.
- No verified backup restoration, cutover rehearsal, or deployment authorization.

**Decision:** HOLD. Continue non-destructive code review and read-only catalog verification.
