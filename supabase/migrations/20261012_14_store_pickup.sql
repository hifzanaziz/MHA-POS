CREATE OR REPLACE FUNCTION public.mha_complete_store_order_pickup(p_store_id bigint, p_order_no text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_company bigint;v_order bigint;v_status text;
begin
if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
select company_id into v_company from public.mha_current_store_context(p_store_id);
if not public.mha_has_permission(v_company,'orderHistory','EDIT') and not public.mha_has_permission(v_company,'order','EDIT') then raise exception 'Pickup permission denied' using errcode='42501';end if;
select id,pickup_status into v_order,v_status from public.sales_order where store_id=p_store_id and order_no=p_order_no and order_status='Active' for update;
if not found then raise exception 'Order not found at selected store';end if;
if v_status='Completed' then return;end if;
update public.sales_order set pickup_status='Completed',picked_up_at=now(),updated_at=now() where id=v_order;
end $function$

revoke all on function public.mha_complete_store_order_pickup(bigint,text) from public,anon;
grant execute on function public.mha_complete_store_order_pickup(bigint,text) to authenticated;
