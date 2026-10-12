CREATE OR REPLACE FUNCTION public.mha_add_store_inventory_stock(p_store_id bigint, p_inventory_sku_id bigint, p_quantity_order_uom numeric, p_unit_price numeric DEFAULT 0, p_reference_no text DEFAULT NULL::text, p_remarks text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_company bigint;v_order_factor numeric;v_recipe_factor numeric;v_qty numeric;v_purchase bigint;
begin
if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
select company_id into v_company from public.mha_current_store_context(p_store_id);
if not public.mha_has_permission(v_company,'inventory','EDIT') then raise exception 'Inventory permission denied' using errcode='42501';end if;
if p_quantity_order_uom is null or p_quantity_order_uom<=0 or p_quantity_order_uom>100000 or coalesce(p_unit_price,0)<0 then raise exception 'Invalid quantity or price';end if;
select order_to_inventory,inventory_to_recipe into v_order_factor,v_recipe_factor from public.inventory_sku where id=p_inventory_sku_id and company_id=v_company and is_active;
if not found or v_order_factor is null or v_recipe_factor is null or v_order_factor<=0 or v_recipe_factor<=0 then raise exception 'Invalid company inventory SKU or UOM';end if;
v_qty:=p_quantity_order_uom*v_order_factor*v_recipe_factor;
insert into public.inventory_purchase(inventory_sku_id,quantity_order_uom,quantity_recipe_uom,unit_price,total_cost,reference_no,remarks,store_id)
values(p_inventory_sku_id,p_quantity_order_uom,v_qty,coalesce(p_unit_price,0),p_quantity_order_uom*coalesce(p_unit_price,0),p_reference_no,p_remarks,p_store_id) returning id into v_purchase;
insert into public.mha_inventory_store_stock(store_id,inventory_sku_id,company_id,current_stock,minimum_stock,updated_at)
values(p_store_id,p_inventory_sku_id,v_company,v_qty,0,now())
on conflict(store_id,inventory_sku_id) do update set current_stock=public.mha_inventory_store_stock.current_stock+excluded.current_stock,updated_at=now();
insert into public.stock_transaction(inventory_sku_id,transaction_type,quantity,reference_no,remarks,store_id)
values(p_inventory_sku_id,'PURCHASE',v_qty,p_reference_no,coalesce(p_remarks,'Inventory stock purchase'),p_store_id);
return v_purchase;
end $function$

revoke all on function public.mha_add_store_inventory_stock(bigint,bigint,numeric,numeric,text,text) from public,anon;
grant execute on function public.mha_add_store_inventory_stock(bigint,bigint,numeric,numeric,text,text) to authenticated;
