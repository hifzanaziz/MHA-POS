# Multi-company release assessment (2026-10-12)

## Implemented on feature branch
- Draft schema for companies, stores, roles, profiles, assignments, permissions, availability and audit.
- Draft ownership and per-store stock schema.
- Existing module navigation grouped into Order Management, Inventory Management, and Product Management.

## Production blockers
1. Both SQL files are **drafts only**; no migration was applied.
2. Existing policies grant broad authenticated access; replacing them with tenant-aware RLS requires auditing all tables and functions.
3. Existing RPCs operate on global inventory and variant stock. Every read/write and transaction must be made store-aware and authorization must derive from auth.uid(), not client-selected IDs alone.
4. Existing inventory_sku.current_stock and product_variant_stock are global. Store-specific balances must be backfilled transactionally and validated against original totals.
5. Super Admin must be provisioned against a verified auth.users UUID using a privileged procedure, not editable email or a client-settable is_super_admin flag.
6. Cross-company consistency must be enforced on user-store assignments and product availability; the current draft does not yet guarantee all composite relationships.
7. Public ordering requires a store-scoped route and server-side checks of availability, company/store active state, and order destination.
8. User management needs secure invitation/reset flow; permissions and audit trail need tested admin-only RPCs.
9. Regression suite must cover ordering, payment, refund, production, recipes, variant prices, inventory and product images.
10. Verify database backup, rollback, build and end-to-end tests before release.

## Release gate
Do not merge this branch or run draft SQL against live Supabase. Current implementation is partial.
