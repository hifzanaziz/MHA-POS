-- DRAFT ONLY: dependent on 20261012_01; do not apply to live project.
-- Company-shared master records; store-specific stock and transactions.
begin;
alter table public.inventory_sku add column if not exists company_id bigint references public.mha_company(id);
alter table public.production_sku add column if not exists company_id bigint references public.mha_company(id);
alter table public.config_option add column if not exists company_id bigint references public.mha_company(id);
-- Recipes, variants and variation values inherit company ownership through their master SKU FKs.
alter table public.sales_order add column if not exists store_id bigint references public.mha_store(id);
alter table public.production_entry add column if not exists store_id bigint references public.mha_store(id);
alter table public.inventory_purchase add column if not exists store_id bigint references public.mha_store(id);
alter table public.stock_transaction add column if not exists store_id bigint references public.mha_store(id);
create table if not exists public.mha_inventory_store_stock (
 store_id bigint not null references public.mha_store(id),
 inventory_sku_id bigint not null references public.inventory_sku(id),
 current_stock numeric not null default 0,
 minimum_stock numeric not null default 0,
 updated_at timestamptz not null default now(),
 primary key(store_id,inventory_sku_id)
);
create table if not exists public.mha_variant_store_stock (
 store_id bigint not null references public.mha_store(id),
 product_variant_id bigint not null references public.product_variant(id),
 current_stock numeric not null default 0,
 minimum_stock numeric not null default 0,
 updated_at timestamptz not null default now(),
 primary key(store_id,product_variant_id)
);
alter table public.mha_inventory_store_stock enable row level security;
alter table public.mha_variant_store_stock enable row level security;
-- Migration must backfill historical rows and stock, then validate all ownership,
-- update every RPC to require server-verified store context, replace legacy RLS,
-- and only then enforce NOT NULL on ownership columns.
-- Never expose a client-supplied store_id as an authorization bypass.
commit;
