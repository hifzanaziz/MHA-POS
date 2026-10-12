-- READ ONLY. Execute after a rehearsal migration, never as a replacement for end-to-end tests.
-- Zero is required for every mismatch_count row.
with target as (
 select s.id store_id,c.id company_id from public.mha_store s
 join public.mha_company c on c.id=s.company_id
 where c.company_code='HANAAZZ' and s.store_code='001'
), audit as (
 select 'target_store_exists' check_name,case when count(*)=1 then 0 else 1 end::bigint mismatch_count from target
 union all select 'inventory_company_ownership' check_name,count(*)::bigint mismatch_count
 from public.inventory_sku i cross join target t where i.company_id is distinct from t.company_id
 union all select 'production_company_ownership',count(*)
 from public.production_sku p cross join target t where p.company_id is distinct from t.company_id
 union all select 'config_company_ownership',count(*)
 from public.config_option c cross join target t where c.company_id is distinct from t.company_id
 union all select 'order_store_ownership',count(*)
 from public.sales_order o cross join target t where o.store_id is distinct from t.store_id
 union all select 'production_store_ownership',count(*)
 from public.production_entry e cross join target t where e.store_id is distinct from t.store_id
 union all select 'purchase_store_ownership',count(*)
 from public.inventory_purchase p cross join target t where p.store_id is distinct from t.store_id
 union all select 'transaction_store_ownership',count(*)
 from public.stock_transaction x cross join target t where x.store_id is distinct from t.store_id
 union all select 'inventory_stock_balance',count(*)
 from public.inventory_sku i cross join target t
 left join public.mha_inventory_store_stock st on st.store_id=t.store_id and st.inventory_sku_id=i.id
 where st.current_stock is distinct from coalesce(i.current_stock,0)
    or st.minimum_stock is distinct from coalesce(i.minimum_stock,0)
 union all select 'variant_stock_balance',count(*)
 from public.product_variant_stock v cross join target t
 left join public.mha_variant_store_stock st on st.store_id=t.store_id and st.product_variant_id=v.product_variant_id
 where st.current_stock is distinct from coalesce(v.current_stock,0)
    or st.minimum_stock is distinct from coalesce(v.minimum_stock,0)
)
select * from audit order by check_name;
-- Note: this assumes an isolated rehearsal database containing only the legacy tenant.
-- In a true multi-tenant database, restrict source rows to the intended legacy set.
