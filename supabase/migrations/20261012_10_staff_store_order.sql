-- Phase 1 staff order function, installed in production.
CREATE OR REPLACE FUNCTION public.mha_create_store_sales_order(p_store_id bigint, p_customer_name text, p_customer_telephone text, p_payment_status text, p_items jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_company bigint;v_item jsonb;v_variant bigint;v_qty numeric;v_price numeric;v_product bigint;v_sku_code text;v_sku_name text;v_variant_code text;v_variant_name text;v_taxable boolean;v_subtotal numeric:=0;v_taxable_total numeric:=0;v_tax numeric;v_total numeric;v_customer bigint;v_order bigint;v_order_no text;v_opt jsonb;v_order_item bigint;
begin
if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
select company_id into v_company from public.mha_current_store_context(p_store_id);
if not public.mha_has_permission(v_company,'order','EDIT') then raise exception 'Order permission denied' using errcode='42501';end if;
if p_payment_status not in ('Pending','Completed') then raise exception 'Invalid payment status';end if;
if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Invalid order items';end if;
for v_item in select value from jsonb_array_elements(p_items) loop
v_variant:=nullif(v_item->>'product_variant_id','')::bigint;v_qty:=nullif(v_item->>'quantity','')::numeric;
if v_variant is null or v_qty is null or v_qty<=0 or v_qty<>trunc(v_qty) or v_qty>100 then raise exception 'Invalid variant or quantity';end if;
select pv.production_sku_id,pv.selling_price,coalesce(ps.tax_applicable,true)
into v_product,v_price,v_taxable from public.product_variant pv join public.production_sku ps on ps.id=pv.production_sku_id
where pv.id=v_variant and pv.is_active and ps.is_active and ps.company_id=v_company;
if not found or v_price is null or v_price<0 or not public.mha_is_variant_available_at_store(p_store_id,v_variant) then raise exception 'Product unavailable for store';end if;
v_subtotal:=v_subtotal+v_price*v_qty;
if v_taxable then v_taxable_total:=v_taxable_total+v_price*v_qty;end if;
end loop;
v_subtotal:=round(v_subtotal,2);v_tax:=round(v_taxable_total*0.06,2);v_total:=v_subtotal+v_tax;
if nullif(trim(coalesce(p_customer_name,'')),'') is not null or nullif(trim(coalesce(p_customer_telephone,'')),'') is not null then
insert into public.customer(customer_name,telephone) values(nullif(trim(p_customer_name),''),nullif(trim(p_customer_telephone),'')) returning id into v_customer;end if;
v_order_no:='ORD-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISSUS')||'-'||p_store_id;
insert into public.sales_order(order_no,customer_id,customer_name,customer_telephone,subtotal,tax_amount,grand_total,payment_status,pickup_status,created_by,paid_at,store_id)
values(v_order_no,v_customer,nullif(trim(coalesce(p_customer_name,'')),''),nullif(trim(coalesce(p_customer_telephone,'')),''),v_subtotal,v_tax,v_total,p_payment_status,'Pending',auth.uid(),case when p_payment_status='Completed' then now() end,p_store_id)
returning id into v_order;
for v_item in select value from jsonb_array_elements(p_items) loop
v_variant:=(v_item->>'product_variant_id')::bigint;v_qty:=(v_item->>'quantity')::numeric;
select pv.production_sku_id,pv.variant_code,pv.variant_name,pv.selling_price,ps.sku_code,ps.sku_name into v_product,v_variant_code,v_variant_name,v_price,v_sku_code,v_sku_name
from public.product_variant pv join public.production_sku ps on ps.id=pv.production_sku_id where pv.id=v_variant and ps.company_id=v_company;
perform public.mha_reserve_variant_stock(p_store_id,v_variant,v_qty);
insert into public.sales_order_item(sales_order_id,production_sku_id,product_variant_id,sku_code,sku_name,variant_code,variant_name,unit_price,quantity,line_total)
values(v_order,v_product,v_variant,v_sku_code,v_sku_name,v_variant_code,v_variant_name,v_price,v_qty,v_price*v_qty) returning id into v_order_item;
if jsonb_typeof(v_item->'options')='array' then
for v_opt in select value from jsonb_array_elements(v_item->'options') loop
insert into public.sales_order_item_option(sales_order_item_id,variation_type_id,variation_value_id,option_group_name,option_value_name)
values(v_order_item,nullif(v_opt->>'variation_type_id','')::bigint,nullif(v_opt->>'variation_value_id','')::bigint,v_opt->>'group_name',v_opt->>'value_name');
end loop;end if;
end loop;
if p_payment_status='Completed' then
insert into public.payment(sales_order_id,payment_type,payment_method,amount,payment_status,created_by)
values(v_order,'FULL','CASH',v_total,'Completed',auth.uid());end if;
return v_order_no;
end $function$

revoke all on function public.mha_create_store_sales_order(bigint,text,text,text,jsonb) from public,anon;
grant execute on function public.mha_create_store_sales_order(bigint,text,text,text,jsonb) to authenticated;
