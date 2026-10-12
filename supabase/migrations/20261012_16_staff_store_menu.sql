create or replace function public.mha_staff_store_menu(p_store_id bigint)
returns table(production_sku_id bigint,sku_code text,sku_name text,product_variant_id bigint,variant_name text,selling_price numeric,available_stock numeric)
language plpgsql security definer set search_path='' as $$
begin
 if not public.mha_can_access_store(p_store_id) then raise exception 'Store access denied' using errcode='42501'; end if;
 if not (public.mha_has_permission(p_store_id,'order','VIEW') or public.mha_has_permission(p_store_id,'order','EDIT')) then raise exception 'Order access denied' using errcode='42501'; end if;
 return query select p.id,p.sku_code::text,p.sku_name::text,v.id,v.variant_name::text,v.selling_price,st.current_stock
 from public.mha_store s join public.mha_company c on c.id=s.company_id and c.is_active
 join public.production_sku p on p.company_id=s.company_id and p.is_active
 join public.product_variant v on v.production_sku_id=p.id and v.is_active
 join public.mha_variant_store_stock st on st.store_id=s.id and st.company_id=s.company_id and st.production_sku_id=p.id and st.product_variant_id=v.id and st.current_stock>0
 left join public.mha_store_product_availability a on a.store_id=s.id and a.company_id=s.company_id and a.production_sku_id=p.id
 where s.id=p_store_id and s.is_active and coalesce(a.is_available,true);
end $$;
revoke all on function public.mha_staff_store_menu(bigint) from public,anon;
grant execute on function public.mha_staff_store_menu(bigint) to authenticated;