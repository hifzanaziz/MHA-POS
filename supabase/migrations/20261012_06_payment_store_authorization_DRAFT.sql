-- DRAFT ONLY. Do not apply to production.
-- Requires tenant schema, assigned-store profiles, and role permissions.
-- Replaces the legacy unscoped payment completion function.
begin;
create or replace function public.complete_sales_order_payment(p_order_no text)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_order_id bigint;
  v_store_id bigint;
  v_company_id bigint;
  v_total numeric;
  v_payment_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select o.id, o.store_id, s.company_id, o.grand_total, o.payment_status
    into v_order_id, v_store_id, v_company_id, v_total, v_payment_status
  from public.sales_order o
  join public.mha_store s on s.id = o.store_id
  where o.order_no = p_order_no and o.order_status = 'Active'
  for update of o;

  if not found then
    raise exception 'Order not found';
  end if;

  if not public.mha_can_access_store(v_store_id)
     or not public.mha_has_permission(v_company_id, 'order', 'EDIT') then
    raise exception 'Not authorized to complete payment for this store'
      using errcode = '42501';
  end if;

  if v_payment_status = 'Completed' then
    return;
  end if;

  update public.sales_order
     set payment_status = 'Completed', paid_at = now(), updated_at = now()
   where id = v_order_id;

  insert into public.payment
    (sales_order_id, payment_type, payment_method, amount, payment_status, created_by)
  values
    (v_order_id, 'FULL', 'CASH', v_total, 'Completed', auth.uid());
end;
$fn$;

revoke all on function public.complete_sales_order_payment(text) from public;
revoke all on function public.complete_sales_order_payment(text) from anon;
grant execute on function public.complete_sales_order_payment(text) to authenticated;
commit;
-- Still requires coordinated legacy RLS/RPC cutover and isolated tests.
