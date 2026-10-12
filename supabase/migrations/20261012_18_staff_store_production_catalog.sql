create or replace function public.mha_staff_store_production_catalog(p_store_id bigint)
returns table(production_sku_id bigint,sku_code text,sku_name text,product_variant_id bigint,variant_code text,variant_name text,current_stock numeric,minimum_stock numeric)
language plpgsql security definer set search_path='' as $$
declare v_company_id bigint;
begin
 select company_id into v_company_id from public.mha_current_store_context(p_store_id);
 if not public.mha_has_permission(v_company_id,'production','VIEW') then raise exception 'Production access denied' using errcode='42501'; end if;
 return query
 select p.id,p.sku_code::text,p.sku_name::text,v.id,v.variant_code::text,v.variant_name::text,coalesce(st.current_stock,0),coalesce(st.minimum_stock,0)
 from public.production_sku p
 join public.product_variant v on v.production_sku_id=p.id and v.is_active
 left join public.mha_variant_store_stock st on st.store_id=p_store_id and st.company_id=v_company_id and st.production_sku_id=p.id and st.product_variant_id=v.id
 where p.company_id=v_company_id and p.is_active order by p.sku_code,v.variant_code;
end $$;
revoke all on function public.mha_staff_store_production_catalog(bigint) from public,anon;
grant execute on function public.mha_staff_store_production_catalog(bigint) to authenticated;