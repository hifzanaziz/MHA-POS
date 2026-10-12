-- READ-ONLY production preflight. No changes to data or schema.
-- Run and retain results before any migration.
select 'inventory_sku' as entity,count(*) as row_count from public.inventory_sku
union all select 'production_sku',count(*) from public.production_sku
union all select 'sales_order',count(*) from public.sales_order
union all select 'sales_order_item',count(*) from public.sales_order_item
union all select 'payment',count(*) from public.payment
union all select 'inventory_purchase',count(*) from public.inventory_purchase
union all select 'stock_transaction',count(*) from public.stock_transaction
union all select 'production_entry',count(*) from public.production_entry
union all select 'product_variant_stock',count(*) from public.product_variant_stock;
select 'inventory_sku.current_stock' as source, coalesce(sum(current_stock),0) as total from public.inventory_sku
union all select 'product_variant_stock.current_stock',coalesce(sum(current_stock),0) from public.product_variant_stock;
select p.proname as function_name, pg_get_function_identity_arguments(p.oid) as signature,
 p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prokind='f'
order by p.proname;
select tablename,policyname,roles,cmd,qual,with_check
from pg_policies where schemaname='public' order by tablename,policyname;
-- Compare snapshots before and after migration; any unexpected difference blocks release.
