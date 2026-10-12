-- Phase 1 production function, deployed to Supabase.
CREATE OR REPLACE FUNCTION public.mha_process_store_production(p_store_id bigint, p_production_sku_id bigint, p_product_variant_id bigint, p_quantity numeric, p_reference_no text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_company bigint;v_entry bigint;v_recipe record;v_required numeric;v_count integer:=0;
begin
if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
select company_id into v_company from public.mha_current_store_context(p_store_id);
if not public.mha_has_permission(v_company,'production','EDIT') then raise exception 'Production permission denied' using errcode='42501';end if;
if p_quantity is null or p_quantity<=0 or p_quantity>10000 then raise exception 'Invalid production quantity';end if;
if not exists(select 1 from public.production_sku ps join public.product_variant pv on pv.production_sku_id=ps.id where ps.id=p_production_sku_id and ps.company_id=v_company and ps.is_active and pv.id=p_product_variant_id and pv.is_active) then raise exception 'Invalid company product or variant';end if;
for v_recipe in select inventory_sku_id,quantity from public.get_variant_recipe(p_product_variant_id) order by inventory_sku_id loop
v_count:=v_count+1;
v_required:=v_recipe.quantity*p_quantity;
if v_required is null or v_required<=0 or not exists(select 1 from public.inventory_sku where id=v_recipe.inventory_sku_id and company_id=v_company and is_active) then raise exception 'Invalid recipe ingredient';end if;
update public.mha_inventory_store_stock set current_stock=current_stock-v_required,updated_at=now()
where store_id=p_store_id and company_id=v_company and inventory_sku_id=v_recipe.inventory_sku_id and current_stock>=v_required;
if not found then raise exception 'Insufficient store ingredient stock for %',v_recipe.inventory_sku_id;end if;
end loop;
if v_count=0 then raise exception 'Recipe required';end if;
insert into public.production_entry(production_sku_id,product_variant_id,production_quantity,reference_no,store_id)
values(p_production_sku_id,p_product_variant_id,p_quantity,p_reference_no,p_store_id) returning id into v_entry;
for v_recipe in select inventory_sku_id,quantity from public.get_variant_recipe(p_product_variant_id) order by inventory_sku_id loop
insert into public.stock_transaction(inventory_sku_id,transaction_type,quantity,reference_no,remarks,store_id)
values(v_recipe.inventory_sku_id,'PRODUCTION',v_recipe.quantity*p_quantity,p_reference_no,'Production Entry ID: '||v_entry,p_store_id);
end loop;
insert into public.mha_variant_store_stock(store_id,product_variant_id,company_id,production_sku_id,current_stock,minimum_stock,updated_at)
values(p_store_id,p_product_variant_id,v_company,p_production_sku_id,p_quantity,0,now())
on conflict(store_id,product_variant_id) do update set current_stock=public.mha_variant_store_stock.current_stock+excluded.current_stock,updated_at=now();
return v_entry;
end $function$

revoke all on function public.mha_process_store_production(bigint,bigint,bigint,numeric,text) from public,anon;
grant execute on function public.mha_process_store_production(bigint,bigint,bigint,numeric,text) to authenticated;
