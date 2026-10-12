-- Reproducible definition of live verified store context. Non-destructive; not applied here.
CREATE OR REPLACE FUNCTION public.mha_current_store_context(p_store_id bigint)
RETURNS TABLE(company_id bigint,store_id bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_company bigint;
begin
 select s.company_id into v_company
 from public.mha_store s join public.mha_company c on c.id=s.company_id
 where s.id=p_store_id and s.is_active and c.is_active;
 if v_company is null or not public.mha_can_access_store(p_store_id)
 then raise exception 'Store access denied' using errcode='42501'; end if;
 return query select v_company,p_store_id;
end
$function$;
REVOKE ALL ON FUNCTION public.mha_current_store_context(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mha_current_store_context(bigint) TO authenticated;
