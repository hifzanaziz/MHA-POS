# Phase 1 production checkpoint

The company/store foundation, ownership schema, authorization helpers, pinned administrator identity, new-table read policies, variant availability validation, and restricted store-stock reservation have been applied to the existing Supabase project.

HanaAzz Enterprise / Store 001 are initialized. Four roles and 18 role permission rows are present.

The store-stock reservation function is not executable by anon or authenticated roles directly. It must be called by an audited order transaction function.

Legacy operational data and existing accounts remain. New store stock balances are empty. Legacy order, production and payment functions still need coordinated replacement; broad legacy RLS policies are still in place.

Do not treat this checkpoint as a completed security release. No end-to-end acceptance test has passed yet.
