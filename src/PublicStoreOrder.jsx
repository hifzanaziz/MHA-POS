import React, { useEffect, useState } from 'react';
import { supabase } from './supabase.js';

export function parsePublicStoreSlug(pathname) {
  const match = /^\/order\/store\/([a-z0-9][a-z0-9-]{0,79})\/?$/.exec(pathname || '');
  return match ? match[1] : null;
}

export default function PublicStoreOrder({ slug }) {
  const [menu,setMenu] = useState([]);
  const [cart,setCart] = useState({});
  const [storeName,setStoreName] = useState('');
  const [name,setName] = useState('');
  const [telephone,setTelephone] = useState('');
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [confirmation,setConfirmation] = useState('');

  async function refresh() {
    const {data,error:rpcError} = await supabase.rpc('mha_public_store_menu',{p_store_slug:slug});
    if(rpcError) throw rpcError;
    return data || [];
  }
  useEffect(()=>{
    let active=true;
    setMenu([]);setCart({});setError('');setConfirmation('');setStoreName('');setLoading(true);
    refresh().then(rows=>{
      if(!active)return;
      setMenu(rows);
      setStoreName(rows[0]?.store_name || '');
    }).catch(e=>{if(active)setError(e.message||'Unable to load store menu.');})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[slug]);

  const selected=menu.filter(item=>Number(cart[item.product_variant_id]||0)>0);
  const subtotal=selected.reduce((sum,item)=>sum+Number(item.selling_price)*Number(cart[item.product_variant_id]),0);
  async function submit(){
    if(busy||!selected.length||confirmation)return;
    setBusy(true);setError('');
    try{
      const items=selected.map(item=>({product_variant_id:item.product_variant_id,quantity:Number(cart[item.product_variant_id])}));
      const {data,error:rpcError}=await supabase.rpc('mha_create_public_store_order',{
        p_store_slug:slug,p_customer_name:name.trim()||null,
        p_customer_telephone:telephone.trim()||null,p_items:items
      });
      if(rpcError)throw rpcError;
      setConfirmation(String(data));
      setCart({});
      const rows=await refresh();
      setMenu(rows);setStoreName(rows[0]?.store_name||storeName);
    }catch(e){setError(e.message||'Unable to submit order. Please retry.');}
    finally{setBusy(false);}
  }
  return <main className="login-page">
    <section className="login-card" style={{maxWidth:760,width:'100%'}}>
      <h1>{storeName||'MHA POS'} — Customer Order</h1>
      <p>Store: {slug}. Payment is made at the counter. Stock and final price are confirmed by the server.</p>
      {error&&<p role="alert" style={{color:'crimson'}}>{error}</p>}
      {confirmation?<div role="status"><h2>Order submitted</h2><p>Order reference: <strong>{confirmation}</strong></p><p>Please keep this reference for collection and payment.</p></div>:<>
        {loading?<p>Loading store menu…</p>:!menu.length?<p>No products are currently available for this store.</p>:<div style={{display:'grid',gap:12}}>
          {menu.map(item=><div key={item.product_variant_id} style={{display:'flex',gap:12,alignItems:'center',justifyContent:'space-between'}}>
            <span><strong>{item.sku_name}</strong> — {item.variant_name||item.sku_code}<br/>RM {Number(item.selling_price).toFixed(2)} · In stock: {item.available_stock}</span>
            <input aria-label={`Quantity for ${item.sku_name} ${item.variant_name||''}`} type="number" min="0" step="1"
              max={Math.min(50,Number(item.available_stock))} disabled={busy}
              value={cart[item.product_variant_id]??0}
              onChange={e=>setCart(current=>({...current,[item.product_variant_id]:Math.max(0,Math.min(50,Math.floor(Number(e.target.value)||0),Number(item.available_stock)))}))}
              style={{width:80}}/>
          </div>)}
        </div>}
        <div style={{display:'grid',gap:10,marginTop:20}}>
          <label>Customer name <input value={name} maxLength={150} disabled={busy} onChange={e=>setName(e.target.value)}/></label>
          <label>Telephone <input value={telephone} maxLength={40} disabled={busy} onChange={e=>setTelephone(e.target.value)}/></label>
        </div>
        <p><strong>Estimated subtotal: RM {subtotal.toFixed(2)}</strong></p>
        <button className="primary-btn" disabled={busy||loading||!selected.length} onClick={submit}>{busy?'Submitting…':'Place Order'}</button>
      </>}
    </section>
  </main>;
}
