# Authenticated tenant isolation tests — staging only

The integration suite is in `tests/staging-authorization.integration.test.mjs`. It is **not part of the normal CI test command** and does not create, update or delete business records when authorization works correctly. One negative test attempts to create a company with a denied non-admin account; a faulty authorization implementation could create that fixture, so **run only on disposable staging**.

## Prerequisites

Create a separate, disposable Supabase staging project with the Phase 1 schema, RLS cutover under test, and synthetic fixtures. Do not use the existing production project `aauyrowsdboatwgjvefb`. Create four test Auth accounts: pinned Super Admin, company A Manager, company A Viewer, and company B user. Create three active fixture stores: A assigned to Manager/Viewer, A unassigned to Manager, and B belonging to company B. Ensure Manager has inventory VIEW/EDIT and Viewer does not have inventory EDIT.

Configure the following environment variables in a **local process or isolated staging runner only** (never commit credentials):

```text
MHA_TEST_SUPABASE_URL=https://YOUR-STAGING-PROJECT.supabase.co
MHA_TEST_SUPABASE_ANON_KEY=<staging publishable/anon key>
MHA_TEST_ADMIN_EMAIL=<test account email>
MHA_TEST_ADMIN_PASSWORD=<test account password>
MHA_TEST_MANAGER_EMAIL=<test account email>
MHA_TEST_MANAGER_PASSWORD=<test account password>
MHA_TEST_VIEWER_EMAIL=<test account email>
MHA_TEST_VIEWER_PASSWORD=<test account password>
MHA_TEST_OTHER_COMPANY_EMAIL=<test account email>
MHA_TEST_OTHER_COMPANY_PASSWORD=<test account password>
MHA_TEST_STORE_ID=<company A assigned store ID>
MHA_TEST_UNASSIGNED_STORE_ID=<company A unassigned store ID>
MHA_TEST_OTHER_COMPANY_STORE_ID=<company B store ID>
MHA_TEST_ALLOW_STAGING=YES
```

Run `npm run test:security:staging`. The script refuses production project ID and requires explicit staging opt-in.

## Tests

- Anonymous cannot call staff/admin RPCs.
- Regular roles cannot enumerate administration data or create companies.
- Manager can read assigned store inventory, not unassigned or other-company stores.
- Viewer cannot perform stock receiving.
- Company B cannot read company A orders via direct table SELECT.
- Pinned Super Admin can read the role matrix.

## Interpretation

Passing static CI checks is not equivalent to passing this suite. The staging tests require real Auth sessions and seeded fixture data. If any test fails, do not deploy or cut over. Also separately verify the SQL draft and migration grant replay, public store-slug ordering, payments, recipe/production mutations, rollback, and backup restore.

**No staging environment or fixture accounts were created by this change.**
