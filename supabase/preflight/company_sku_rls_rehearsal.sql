-- Phase 1: company-scoped direct table access (review before applying).
-- Existing SECDEF RPCs must be reviewed separately; RLS does not restrict their owner.
-- Legacy anonymous menu/ordering integrations must be tested before deployment.
begin;
alter table public.inventory_sku enable row level security;
alter table public.production_sku enable row level security;
drop policy if exists "Allow public read inventory" on public.inventory_sku;
drop policy if exists "Authenticated users can add inventory" on public.inventory_sku;
drop policy if exists "Authenticated users can delete inventory" on public.inventory_sku;
drop policy if exists "Authenticated users can read inventory" on public.inventory_sku;
drop policy if exists "Authenticated users can update inventory" on public.inventory_sku;
drop policy if exists "Authenticated users can add production sku" on public.production_sku;
drop policy if exists "Authenticated users can delete production sku" on public.production_sku;
drop policy if exists "Authenticated users can read production sku" on public.production_sku;
drop policy if exists "Authenticated users can update production sku" on public.production_sku;
create policy inventory_company_read on public.inventory_sku for select to authenticated
using (public.mha_has_permission(company_id,'inventory','VIEW'));
create policy inventory_company_insert on public.inventory_sku for insert to authenticated
with check (public.mha_has_permission(company_id,'inventory','EDIT'));
create policy inventory_company_update on public.inventory_sku for update to authenticated
using (public.mha_has_permission(company_id,'inventory','EDIT'))
with check (public.mha_has_permission(company_id,'inventory','EDIT'));
create policy inventory_company_delete on public.inventory_sku for delete to authenticated
using (public.mha_has_permission(company_id,'inventory','EDIT'));
create policy production_company_read on public.production_sku for select to authenticated
using (public.mha_has_permission(company_id,'production','VIEW'));
create policy production_company_insert on public.production_sku for insert to authenticated
with check (public.mha_has_permission(company_id,'production','EDIT'));
create policy production_company_update on public.production_sku for update to authenticated
using (public.mha_has_permission(company_id,'production','EDIT'))
with check (public.mha_has_permission(company_id,'production','EDIT'));
create policy production_company_delete on public.production_sku for delete to authenticated
using (public.mha_has_permission(company_id,'production','EDIT'));
-- Intentionally rollback-only pending application compatibility and RPC audit.
rollback;
