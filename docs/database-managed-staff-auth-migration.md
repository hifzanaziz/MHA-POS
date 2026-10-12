# Database-managed staff authentication — Phase 1 migration design

## Approved identity boundary
- Only the pinned MHA Super Admin signs in with Supabase Auth.
- Company admins, managers and staff are stored in MHA-owned tables and sign in using an MHA-managed identity flow.
- A regular user belongs to one company, has one role, and can be assigned multiple stores. Company-level SKU and recipe masters remain shared within that company.
- Never create ordinary staff in `auth.users` or silently reuse the old `mha_admin_assign_existing_user` workflow.

## Current implementation mismatch
- `mha_user_profile.user_id` has an FK to `auth.users(id)`.
- `src/AdminUserAccess.jsx` explicitly asks for an existing Supabase Auth user.
- Existing permission checks and store RPCs use `auth.uid()`. Changing the frontend alone would **not** authenticate staff or authorize their requests.
- Existing permissive SKU policies must not be treated as a staff authorization mechanism.

## Required server-side design
1. Create a separate `mha_staff_account` table with its own UUID primary key, tenant-scoped unique username, active flag, company/role/default store references, and a password verifier (never plaintext). Create `mha_staff_store` assignments with same-company foreign keys. Preserve the Super Admin's existing profile unchanged.
2. Provide a trusted server-side login endpoint (e.g. Supabase Edge Function) that verifies passwords using a slow salted password hash, applies rate limits and generic login errors, and issues short-lived signed staff session tokens with server-side revocation/rotation.
3. All staff operations must go through trusted server-side endpoints which validate the staff token, current account status, company, assigned store and role permission **on each request**. Never trust company_id, store_id or role sent by the browser alone.
4. Keep the existing Supabase-Auth-dependent RPCs for Super Admin until all staff call sites are migrated. Do not expose service-role credentials or a shared staff Supabase token to the browser.
5. Replace User Access's existing-auth assignment with staff-account create/disable/reset and store assignment endpoints, available only to the pinned Super Admin.
6. Run tests for Super Admin, editor, viewer, disabled staff, unassigned store, other company, expired/revoked session and anonymous caller. Ensure production data is not modified by test scenarios.

## Cutover gate
No live schema or RLS changes until the trusted staff API, credentials, session lifecycle and frontend integration exist and tests pass. Old Auth-user assignment RPC should be retired only after callers are removed.
