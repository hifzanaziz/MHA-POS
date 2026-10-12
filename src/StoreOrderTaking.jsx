import React, { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { accessLevel } from './tenantAccess.js';

export default function StoreOrderTaking({ context, storeId, onCompleted }) {
  const [menu,setMenu] = useState([]);
  const [cart,setCart] = useState({});
  const [customerName,setCustomerName] = useState('');
  const [telephone,setTelephone] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const canEdit = accessLevel(context,'order') === 'EDIT';
  async function refresh() {
    const {data,error:rpcError} = await supabase.rpc('mha_staff_store_menu',{p_store_id:storeId});
    if(rpcError) throw rpcError;
    setMenu(data || []);
  }
  useEffect(()=>{
    let active=true;
    setMenu([]);setCart({});setError('');
    supabase.rpc('mha_staff_store_menu',{p_store_id:storeId}).then(({data,error:rpcError})=>{
      if(!active)return;
      if(rpcError)setError(rpcError.message);else setMenu(data || []);
    });
    return ()=>{active=false;};
  },[storeId]);
  const selected=menu.filter(item=>Number(cart[item.product_variant_id]||0)>0);
  const total=selected.reduce((sum,item)=>sum+Number(item.selling_price)*Number(cart[item.product_variant_id]),0);
  async function submit(paymentStatus) {
    if(!canEdit || busy || !selected.length)return;
    setBusy(true);setError('');
    try {
      const items=selected.map(item=>({product_variant_id:item.product_variant_id,quantity:Number(cart[item.product_variant_id])}));
      const {data,error:rpcError}=await supabase.rpc('mha_create_store_sales_order',{
        p_store_id:storeId,p_customer_name:customerName.trim()||null,
        p_customer_telephone:telephone.trim()||null,p_payment_status:paymentStatus,p_items:items
      });
      if(rpcError)throw rpcError;
      setCart({});setCustomerName('');setTelephone('');
      await refresh();
      if(onCompleted)await onCompleted();
      window.alert('Order saved: '+String(data));
    }catch(e){setError(e.message || 'Unable to save order.');}
    finally{setBusy(false);}
  }
  return <section className="chart-card">
    <h2>Order Taking</h2>
    <p>Products and stock are loaded for the selected store. Prices and stock deductions are validated by Supabase.</p>
    {error && <p role="alert" style={{color:'crimson'}}>{error}</p>}
    {!menu.length && !error && <p>No available products at this store.</p>}
    <div style={{display:'grid',gap:12}}>
      {menu.map(item=><div key={item.product_variant_id} style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}>
        <span><strong>{item.sku_name}</strong> — {item.variant_name || item.sku_code} (RM {Number(item.selling_price).toFixed(2)}) · Available: {item.available_stock}</span>
        <input aria-label={`Quantity for ${item.sku_name} ${item.variant_name||''}`} type="number" min="0" max={item.available_stock} step="1" disabled={!canEdit||busy}
          value={cart[item.product_variant_id]??0} onChange={e=>setCart(current=>({...current,[item.product_variant_id]:Math.max(0,Math.min(Math.floor(Number(e.target.value)||0),Number(item.available_stock)))}))} style={{width:75}}/>
      </div>)}
    </div>
    <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:20}}>
      <label>Customer <input value={customerName} onChange={e=>setCustomerName(e.target.value)} disabled={!canEdit||busy}/></label>
      <label>Telephone <input value={telephone} onChange={e=>setTelephone(e.target.value)} disabled={!canEdit||busy}/></label>
    </div>
    <p><strong>Subtotal: RM {total.toFixed(2)}</strong> · Final total and tax calculated by server.</p>
    <button className="primary-btn" disabled={!canEdit||busy||!selected.length} onClick={()=>submit('Pending')}>Save Pay Later</button>
    {!canEdit && <p>View-only access: order submission disabled.</p>}
  </section>;
}
