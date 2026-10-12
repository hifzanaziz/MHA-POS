import { supabase } from './supabase.js';
import { requireSelectedStore } from './tenantAccess.js';

export async function fetchAccessContext() {
  const { data, error } = await supabase.rpc('mha_my_access_context');
  if (error) throw new Error(error.message || 'Unable to verify your access.');
  if (!data || !Array.isArray(data.stores)) throw new Error('Invalid account access context.');
  return data;
}
export async function createStoreOrder(context,storeId,customer,items,paymentStatus='Pending') {
  requireSelectedStore(context,storeId,'order','EDIT');
  const {data,error}=await supabase.rpc('mha_create_store_sales_order',{
    p_store_id:storeId,p_customer_name:customer.name,p_customer_telephone:customer.telephone,
    p_payment_status:paymentStatus,p_items:items
  });
  if(error) throw error;
  return data;
}
export async function createPublicOrder(slug,customer,items) {
  if(!/^[a-zA-Z0-9_-]{1,48}$/.test(slug)) throw new Error('Invalid store URL.');
  const {data,error}=await supabase.rpc('mha_create_public_store_order',{
    p_store_slug:slug,p_customer_name:customer.name,p_customer_telephone:customer.telephone,p_items:items
  });
  if(error) throw error;
  return data;
}
export async function fetchPublicMenu(slug) {
  const {data,error}=await supabase.rpc('mha_public_store_menu',{p_store_slug:slug});
  if(error) throw error;
  return data ?? [];
}
export async function receiveStoreStock(context,storeId,skuId,quantity,price=0,reference=null,remarks=null) {
  requireSelectedStore(context,storeId,'inventory','EDIT');
  const {data,error}=await supabase.rpc('mha_add_store_inventory_stock',{
    p_store_id:storeId,p_inventory_sku_id:skuId,p_quantity_order_uom:quantity,
    p_unit_price:price,p_reference_no:reference,p_remarks:remarks
  });
  if(error) throw error;
  return data;
}
export async function processStoreProduction(context,storeId,productId,variantId,quantity,reference=null) {
  requireSelectedStore(context,storeId,'production','EDIT');
  const {data,error}=await supabase.rpc('mha_process_store_production',{
    p_store_id:storeId,p_production_sku_id:productId,p_product_variant_id:variantId,
    p_quantity:quantity,p_reference_no:reference
  });
  if(error) throw error;
  return data;
}
