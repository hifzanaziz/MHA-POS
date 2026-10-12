-- Phase 1 public menu: company/store filtered, in-stock active variants only.
create or replace function public.mha_public_store_menu(p_store_slug text)
returns table(store_code text,store_name text,production_sku_id bigint,sku_code text,sku_name text,product_variant_id bigint,variant_name text,selling_price numeric,available_stock numeric)
language sql security definer set search_path=''
as $f$
select s.store_code,s.store_name,p.id,p.sku_code,p.sku_name,v.id,v.variant_name,v.selling_price,st.current_stock
from public.mha_store s
join public.mha_company c on c.id=s.company_id and c.is_active
join public.production_sku p on p.company_id=s.company_id and p.is_active
join public.product_variant v on v.production_sku_id=p.id and v.is_active
join public.mha_variant_store_stock st on st.store_id=s.id and st.company_id=s.company_id and st.production_sku_id=p.id and st.product_variant_id=v.id and st.current_stock>0
left join public.mha_store_product_availability a on a.store_id=s.id and a.production_sku_id=p.id and a.company_id=s.company_id
where s.public_slug=p_store_slug and s.is_active and coalesce(a.is_available,true)
$f$;
revoke all on function public.mha_public_store_menu(text) from public;
grant execute on function public.mha_public_store_menu(text) to anon,authenticated;
