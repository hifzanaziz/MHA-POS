-- Draft only: do not apply to production.
-- Apply after 01, 02, 03, tenant bootstrap and permission seeding.
-- New tables have RLS enabled and no direct client write policies.
begin;
create policy mha_company_select on public.mha_company for select to authenticated using (public.mha_has_permission(id, 'dashboard', 'VIEW'));
create policy mha_store_select on public.mha_store for select to authenticated using (public.mha_can_access_store(id));
create policy mha_inventory_stock_select on public.mha_inventory_store_stock for select to authenticated using (public.mha_can_access_store(store_id) and public.mha_has_permission(company_id, 'inventory', 'VIEW'));
create policy mha_variant_stock_select on public.mha_variant_store_stock for select to authenticated using (public.mha_can_access_store(store_id) and public.mha_has_permission(company_id, 'production', 'VIEW'));
create policy mha_product_availability_select on public.mha_store_product_availability for select to authenticated using (public.mha_can_access_store(store_id) and public.mha_has_permission(company_id, 'production', 'VIEW'));
-- No client write policies: privileged audited RPCs must manage these records.
-- Do not expose user profile, assignments or admin audit tables directly.
commit;
