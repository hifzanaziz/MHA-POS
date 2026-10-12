# Phase 1 security test matrix

Development-only checklist. Do not run against production.

- Regular user in Company A cannot read or modify Company B masters.
- Store A user cannot read or modify Store B orders, stock or production.
- VIEW role can read permitted records but cannot insert, update or delete.
- Inactive user, role, company or store cannot access operations.
- Unauthenticated public ordering can only access an active store menu and available products.
- User cannot promote self to Super Admin or change company or assigned stores.
- Cross-company product availability assignment is rejected.
- Order, payment, stock and production RPCs reject unauthorized store IDs.
- Existing broad access policies are removed before multi-tenant launch.
- Deletion of legacy operational data and other Auth users occurs only at final approved cutover.

Result: NOT RUN. Requires isolated local database and end-to-end verification.
