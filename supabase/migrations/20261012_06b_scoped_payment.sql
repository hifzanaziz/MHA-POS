-- Versioned copy of existing live payment RPC. Non-destructive; not applied here.
CREATE OR REPLACE FUNCTION public.mha_complete_store_order_payment(p_store_id bigint,p_order_no text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_order_id bigint;v_total numeric;v_status text;v_company bigint;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select company_id into v_company from public.mha_current_store_context(p_store_id);
 if not public.mha_has_permission(v_company,'order','EDIT') then raise exception 'Permission denied' using errcode='42501';end if;
 select o.id,o.grand_total,o.payment_status into v_order_id,v_total,v_status
 from public.sales_order o where o.store_id=p_store_id and o.order_no=p_order_no and o.order_status='Active'
 for update;
 if not found then raise exception 'Order not found for selected store';end if;
 if v_status='Completed' then return;end if;
 update public.sales_order set payment_status='Completed',paid_at=now(),updated_at=now() where id=v_order_id;
 insert into public.payment(sales_order_id,payment_type,payment_method,amount,payment_status,created_by)
 values(v_order_id,'FULL','CASH',v_total,'Completed',auth.uid());
end
$function$;
REVOKE ALL ON FUNCTION public.mha_complete_store_order_payment(bigint,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mha_complete_store_order_payment(bigint,text) TO authenticated;
