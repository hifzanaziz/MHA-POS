# Phase 1 security review

Read-only production policy review identified existing tenant-unscoped permissions on operational tables. Company/store ownership checks must replace the existing rules before multi-tenant release.

Release requirements:
1. Implement company and assigned-store restrictions on all relevant tables.
2. Restrict role and user management to audited privileged operations.
3. Secure existing transaction functions and public ordering endpoints.
4. Verify inactive users/stores/companies cannot operate.
5. Run cross-company and cross-store negative tests.
6. Validate schema and application together before deploying.

Production remains unchanged. No reset or user deletion has occurred.
