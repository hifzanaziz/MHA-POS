-- DRAFT ONLY: prerequisite for store-aware order creation.
-- Use this validator inside both staff and public ordering RPCs.
-- It validates the company ownership, active product and per-store availability.
-- It does not grant the caller permission to place an order.
create or replace function public.mha_is_variant_available_at_store(
  p_store_id bigint, p_variant_id bigint
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1
    from public.mha_store s
    join public.mha_company c on c.id = s.company_id
    join public.product_variant v on v.id = p_variant_id
    join public.production_sku p on p.id = v.production_sku_id
    left join public.mha_store_product_availability a
      on a.store_id = s.id
     and a.production_sku_id = p.id
     and a.company_id = c.id
    where s.id = p_store_id
      and s.is_active
      and c.is_active
      and p.company_id = c.id
      and p.is_active
      and v.is_active
      and coalesce(a.is_available, true)
  );
$fn$;
-- Default availability is TRUE until explicitly disabled per store.
-- This helper reveals only a boolean, not private tenant information.
revoke all on function public.mha_is_variant_available_at_store(bigint,bigint) from public;
grant execute on function public.mha_is_variant_available_at_store(bigint,bigint) to authenticated;
-- Public access should be through a validated, rate-limited menu/order endpoint,
-- not direct execution of this internal helper.
