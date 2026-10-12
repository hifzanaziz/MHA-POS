-- DRAFT ONLY: dependent on 20261012_01; do not apply to live project.
-- Company-shared master records; store-specific stock and transactions.
begin;
alter table public.inventory_sku add column if not exists company_id bigint references public.mha_company(id);
alter table public.production_sku add column if not exists company_id bigint references public.mha_company(id);
alter table public.config_option add column if not exists company_id bigint references public.mha_company(id);
-- Composite keys ensure store availability cannot reference another company's SKU.
alter table public.production_sku add constraint mha_production_sku_company_key unique(id,company_id);
alter table public.inventory_sku add constraint mha_inventory_sku_company_key unique(id,company_id);
alter table public.mha_store_product_availability add column if not exists company_id bigint;
-- Populate any pre-existing availability rows before enforcing NOT NULL.
update public.mha_store_product_availability a
set company_id=s.company_id from public.mha_store s
where s.id=a.store_id and a.company_id is null;
alter table public.mha_store_product_availability alter column company_id set not null;
alter table public.mha_store_product_availability
 add constraint mha_availability_store_company_fk foreign key(store_id,company_id)
 references public.mha_store(id,company_id);
alter table public.mha_store_product_availability
 add constraint mha_availability_sku_company_fk foreign key(production_sku_id,company_id)
 references public.production_sku(id,company_id);
-- Recipes, variants and variation values inherit company ownership through their master SKU FKs.
alter table public.sales_order add column if not exists store_id bigint references public.mha_store(id);
alter table public.production_entry add column if not exists store_id bigint references public.mha_store(id);
alter table public.inventory_purchase add column if not exists store_id bigint references public.mha_store(id);
alter table public.stock_transaction add column if not exists store_id bigint references public.mha_store(id);
create table if not exists public.mha_inventory_store_stock (
 store_id bigint not null references public.mha_store(id),
 inventory_sku_id bigint not null references public.inventory_sku(id),
 company_id bigint not null,
 current_stock numeric not null default 0,
 minimum_stock numeric not null default 0,
 updated_at timestamptz not null default now(),
 primary key(store_id,inventory_sku_id)
);
create table if not exists public.mha_variant_store_stock (
 store_id bigint not null references public.mha_store(id),
 product_variant_id bigint not null references public.product_variant(id),
 company_id bigint not null,
 current_stock numeric not null default 0,
 minimum_stock numeric not null default 0,
 updated_at timestamptz not null default now(),
 primary key(store_id,product_variant_id)
);
-- Store stock must reference an SKU owned by the same company.
alter table public.mha_inventory_store_stock
 add constraint mha_inventory_stock_store_company_fk foreign key(store_id,company_id) references public.mha_store(id,company_id);
alter table public.mha_inventory_store_stock
 add constraint mha_inventory_stock_sku_company_fk foreign key(inventory_sku_id,company_id) references public.inventory_sku(id,company_id);
-- Variant ownership is validated through product_variant -> production_sku in RLS/RPC.
alter table public.mha_variant_store_stock
 add constraint mha_variant_stock_store_company_fk foreign key(store_id,company_id) references public.mha_store(id,company_id);
alter table public.mha_inventory_store_stock enable row level security;
-- Enforce variant ownership by linking its parent production SKU to the company.
-- A composite variant key is required to validate both product and company.
alter table public.product_variant add constraint mha_variant_id_product_key unique(id,production_sku_id);
alter table public.mha_variant_store_stock add column production_sku_id bigint;
alter table public.mha_variant_store_stock
 add constraint mha_variant_stock_variant_fk foreign key(product_variant_id,production_sku_id)
 references public.product_variant(id,production_sku_id);
alter table public.mha_variant_store_stock
 add constraint mha_variant_stock_product_company_fk foreign key(production_sku_id,company_id)
 references public.production_sku(id,company_id);
alter table public.mha_variant_store_stock alter column production_sku_id set not null;
alter table public.mha_variant_store_stock enable row level security;
-- Migration must backfill historical rows and stock, then validate all ownership,
-- update every RPC to require server-verified store context, replace legacy RLS,
-- and only then enforce NOT NULL on ownership columns.
-- Never expose a client-supplied store_id as an authorization bypass.
commit;
