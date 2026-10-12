-- OBSOLETE HISTORICAL DRAFT. DO NOT EXECUTE. Retained only for audit history.
-- MIGRATION DRAFT. DO NOT RUN IN PRODUCTION.
-- Run only after 01 and 02 have passed staging validation.
-- Creates exactly one legacy tenant and store, preserving all legacy rows.
begin;
insert into public.mha_company(company_code,company_name)
values ('HANAAZZ','HanaAzz Enterprise')
on conflict(company_code) do update set company_name=excluded.company_name;
insert into public.mha_store(company_id,store_code,store_name,public_slug)
select c.id,'001','Store 001','hanaazz-001'
from public.mha_company c where c.company_code='HANAAZZ'
on conflict(company_id,store_code) do update set store_name=excluded.store_name;
-- Guard against accidental reassignment of existing records from another tenant.\ndo $\nbegin\n if exists (select 1 from public.inventory_sku where company_id is not null and company_id <> (select id from public.mha_company where company_code='HANAAZZ'))\n or exists (select 1 from public.production_sku where company_id is not null and company_id <> (select id from public.mha_company where company_code='HANAAZZ'))\n or exists (select 1 from public.sales_order where store_id is not null and store_id <> (select s.id from public.mha_store s join public.mha_company c on c.id=s.company_id where c.company_code='HANAAZZ' and s.store_code='001'))\n then raise exception 'Migration aborted: unexpected pre-existing tenant ownership'; end if;\nend $;\n-- Do not overwrite any previously assigned ownership.
update public.inventory_sku set company_id=(select id from public.mha_company where company_code='HANAAZZ')
where company_id is null;
update public.production_sku set company_id=(select id from public.mha_company where company_code='HANAAZZ')
where company_id is null;
update public.config_option set company_id=(select id from public.mha_company where company_code='HANAAZZ')
where company_id is null;
update public.sales_order set store_id=(select s.id from public.mha_store s join public.mha_company c on c.id=s.company_id where c.company_code='HANAAZZ' and s.store_code='001')
where store_id is null;
update public.production_entry set store_id=(select s.id from public.mha_store s join public.mha_company c on c.id=s.company_id where c.company_code='HANAAZZ' and s.store_code='001')
where store_id is null;
update public.inventory_purchase set store_id=(select s.id from public.mha_store s join public.mha_company c on c.id=s.company_id where c.company_code='HANAAZZ' and s.store_code='001')
where store_id is null;
update public.stock_transaction set store_id=(select s.id from public.mha_store s join public.mha_company c on c.id=s.company_id where c.company_code='HANAAZZ' and s.store_code='001')
where store_id is null;
insert into public.mha_inventory_store_stock(store_id,inventory_sku_id,company_id,current_stock,minimum_stock)
select s.id,i.id,c.id,coalesce(i.current_stock,0),coalesce(i.minimum_stock,0)
from public.inventory_sku i cross join public.mha_store s
join public.mha_company c on c.id=s.company_id
where c.company_code='HANAAZZ' and s.store_code='001'
on conflict(store_id,inventory_sku_id) do nothing;
insert into public.mha_variant_store_stock(store_id,product_variant_id,company_id,current_stock,minimum_stock)
select s.id,v.product_variant_id,c.id,coalesce(v.current_stock,0),coalesce(v.minimum_stock,0)
from public.product_variant_stock v cross join public.mha_store s
join public.mha_company c on c.id=s.company_id
where c.company_code='HANAAZZ' and s.store_code='001'
on conflict(store_id,product_variant_id) do nothing;
-- Abort if ownership or stock reconciliation fails.
do $$
begin
 if exists(select 1 from public.inventory_sku where company_id is null)
 or exists(select 1 from public.production_sku where company_id is null)
 or exists(select 1 from public.sales_order where store_id is null)
 or exists(select 1 from public.production_entry where store_id is null)
 or exists(select 1 from public.inventory_purchase where store_id is null)
 or exists(select 1 from public.stock_transaction where store_id is null)
 then raise exception 'Migration aborted: unassigned legacy ownership'; end if;
 if exists (
 select 1 from public.inventory_sku i
 left join public.mha_inventory_store_stock st on st.inventory_sku_id=i.id
 and st.store_id=(select s.id from public.mha_store s join public.mha_company c on c.id=s.company_id where c.company_code='HANAAZZ' and s.store_code='001')
 where st.current_stock is distinct from coalesce(i.current_stock,0)
 ) then raise exception 'Migration aborted: inventory balance mismatch'; end if;
if exists (
 select 1 from public.product_variant_stock v
 left join public.mha_variant_store_stock st on st.product_variant_id=v.product_variant_id
 and st.store_id=(select s.id from public.mha_store s join public.mha_company c on c.id=s.company_id where c.company_code='HANAAZZ' and s.store_code='001')
 where st.current_stock is distinct from coalesce(v.current_stock,0)
 ) then raise exception 'Migration aborted: variant stock mismatch'; end if;
end $;
commit;
-- IMPORTANT: This migration alone does not activate tenant RLS or store-aware RPCs.
