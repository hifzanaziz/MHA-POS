-- Installed production Phase 1 public store order RPC.
CREATE OR REPLACE FUNCTION public.mha_create_public_store_order(p_store_slug text, p_customer_name text, p_customer_telephone text, p_items jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_store bigint;v_company bigint;v_item jsonb;v_variant bigint;v_qty numeric;v_price numeric;v_product bigint;v_code text;v_name text;v_vcode text;v_vname text;v_taxable boolean;v_subtotal numeric:=0;v_taxbase numeric:=0;v_tax numeric;v_total numeric;v_order bigint;v_order_no text;v_customer bigint;
begin
select s.id,s.company_id into v_store,v_company from public.mha_store s join public.mha_company c on c.id=s.company_id where s.public_slug=p_store_slug and s.is_active and c.is_active;
if not found then raise exception 'Store unavailable';end if;
if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Invalid order items';end if;
for v_item in select value from jsonb_array_elements(p_items) loop
v_variant:=nullif(v_item->>'product_variant_id','')::bigint;v_qty:=nullif(v_item->>'quantity','')::numeric;
if v_variant is null or v_qty is null or v_qty<>trunc(v_qty) or v_qty<1 or v_qty>50 then raise exception 'Invalid item';end if;
select pv.production_sku_id,pv.selling_price,coalesce(ps.tax_applicable,true) into v_product,v_price,v_taxable from public.product_variant pv join public.production_sku ps on ps.id=pv.production_sku_id where pv.id=v_variant and pv.is_active and ps.is_active and ps.company_id=v_company;
if not found or v_price is null or v_price<0 then raise exception 'Product unavailable';end if;
if exists(select 1 from public.mha_store_product_availability a where a.store_id=v_store and a.production_sku_id=v_product and not a.is_available) then raise exception 'Product unavailable at store';end if;
v_subtotal:=v_subtotal+v_price*v_qty;
if v_taxable then v_taxbase:=v_taxbase+v_price*v_qty;end if;
end loop;
v_subtotal:=round(v_subtotal,2);v_tax:=round(v_taxbase*0.06,2);v_total:=v_subtotal+v_tax;
if length(coalesce(p_customer_name,''))>150 or length(coalesce(p_customer_telephone,''))>40 then raise exception 'Customer details too long';end if;
if nullif(trim(coalesce(p_customer_name,'')),'') is not null or nullif(trim(coalesce(p_customer_telephone,'')),'') is not null then
insert into public.customer(customer_name,telephone) values(nullif(trim(p_customer_name),''),nullif(trim(p_customer_telephone),'')) returning id into v_customer;end if;
v_order_no:='WEB-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISSUS')||'-'||v_store;
insert into public.sales_order(order_no,customer_id,customer_name,customer_telephone,subtotal,tax_amount,grand_total,payment_status,pickup_status,order_source,store_id)
values(v_order_no,v_customer,nullif(trim(coalesce(p_customer_name,'')),''),nullif(trim(coalesce(p_customer_telephone),''),''),v_subtotal,v_tax,v_total,'Pending','Pending','Public',v_store) returning id into v_order;
for v_item in select value from jsonb_array_elements(p_items) loop
v_variant:=(v_item->>'product_variant_id')::bigint;v_qty:=(v_item->>'quantity')::numeric;
select pv.production_sku_id,pv.selling_price,pv.variant_code,pv.variant_name,ps.sku_code,ps.sku_name into v_product,v_price,v_vcode,v_vname,v_code,v_name from public.product_variant pv join public.production_sku ps on ps.id=pv.production_sku_id where pv.id=v_variant and ps.company_id=v_company;
update public.mha_variant_store_stock set current_stock=current_stock-v_qty,updated_at=now() where store_id=v_store and company_id=v_company and product_variant_id=v_variant and production_sku_id=v_product and current_stock>=v_qty;
if not found then raise exception 'Insufficient store stock';end if;
insert into public.sales_order_item(sales_order_id,production_sku_id,product_variant_id,sku_code,sku_name,variant_code,variant_name,unit_price,quantity,line_total)
values(v_order,v_product,v_variant,v_code,v_name,v_vcode,v_vname,v_price,v_qty,v_price*v_qty);
end loop;
return v_order_no;
end $function$

revoke all on function public.mha_create_public_store_order(text,text,text,jsonb) from public;
grant execute on function public.mha_create_public_store_order(text,text,text,jsonb) to anon,authenticated;
