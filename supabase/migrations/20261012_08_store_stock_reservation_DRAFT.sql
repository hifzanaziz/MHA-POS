-- DEVELOPMENT DRAFT. Requires migrations 01-03 and 07.
-- Stock reservation is atomic and restricted to a verified assigned store.
-- Invoke only inside an authorized order transaction.
create or replace function public.mha_reserve_variant_stock(
 p_store_id bigint, p_variant_id bigint, p_quantity numeric
) returns void
language plpgsql security definer set search_path = ''
as $body$
declare v_company_id bigint;
begin
 if p_quantity is null or p_quantity <= 0 or p_quantity <> trunc(p_quantity) or p_quantity > 100
 then raise exception 'Invalid quantity'; end if;
 select s.company_id into v_company_id
 from public.mha_store s where s.id=p_store_id and s.is_active;
 if v_company_id is null
   or not public.mha_can_access_store(p_store_id)
   or not public.mha_has_permission(v_company_id,'order','EDIT')
 then raise exception 'Store access denied' using errcode='42501'; end if;
 if not public.mha_is_variant_available_at_store(p_store_id,p_variant_id)
 then raise exception 'Variant unavailable at selected store'; end if;
 update public.mha_variant_store_stock st
 set current_stock=st.current_stock-p_quantity,updated_at=now()
 where st.store_id=p_store_id and st.company_id=v_company_id
 and st.product_variant_id=p_variant_id and st.current_stock>=p_quantity;
 if not found then raise exception 'Insufficient store variant stock'; end if;
end;
$body$;
revoke all on function public.mha_reserve_variant_stock(bigint,bigint,numeric) from public;
revoke all on function public.mha_reserve_variant_stock(bigint,bigint,numeric) from anon;
-- No client execute grant: reservation must only be called by audited transaction RPCs.
