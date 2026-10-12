create or replace function public.mha_staff_store_inventory(p_store_id bigint)
returns table(inventory_sku_id bigint,sku_code text,sku_name text,category text,order_uom text,inventory_uom text,recipe_uom text,order_to_inventory numeric,inventory_to_recipe numeric,current_stock numeric,minimum_stock numeric)
language plpgsql security definer set search_path='' as $$
declare v_company_id bigint;
begin
 select company_id into v_company_id from public.mha_current_store_context(p_store_id);
 if not public.mha_has_permission(v_company_id,'inventory','VIEW') then raise exception 'Inventory access denied' using errcode='42501'; end if;
 return query select i.id,i.sku_code::text,i.sku_name::text,i.category::text,i.order_uom::text,i.inventory_uom::text,i.recipe_uom::text,i.order_to_inventory,i.inventory_to_recipe,coalesce(st.current_stock,0),coalesce(st.minimum_stock,0)
 from public.inventory_sku i left join public.mha_inventory_store_stock st on st.inventory_sku_id=i.id and st.store_id=p_store_id and st.company_id=v_company_id
 where i.company_id=v_company_id and i.is_active order by i.sku_code;
end $$;
revoke all on function public.mha_staff_store_inventory(bigint) from public,anon;
grant execute on function public.mha_staff_store_inventory(bigint) to authenticated;