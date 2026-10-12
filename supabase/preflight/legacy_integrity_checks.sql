-- Read-only integrity checks; safe to run before migration on the source database.
-- Every failures value must equal zero before the Store 001 backfill.
with checks as (
 select 'duplicate_variant_stock' as check_name,count(*)::bigint as failures
 from (select product_variant_id from public.product_variant_stock group by product_variant_id having count(*) > 1) t
 union all select 'orphan_variant_stock',count(*)
 from public.product_variant_stock v left join public.product_variant p on p.id=v.product_variant_id where p.id is null
 union all select 'orphan_production_entry_variant',count(*)
 from public.production_entry e left join public.product_variant p on p.id=e.product_variant_id
 where e.product_variant_id is not null and p.id is null
 union all select 'null_inventory_stock',count(*) from public.inventory_sku where current_stock is null
 union all select 'null_variant_stock',count(*) from public.product_variant_stock where current_stock is null
)
select * from checks order by check_name;
