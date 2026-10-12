import React, { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { accessLevel } from './tenantAccess.js';

export default function StoreProduction({ context, storeId }) {
  const [rows,setRows]=useState([]);
  const [variantId,setVariantId]=useState('');
  const [quantity,setQuantity]=useState('');
  const [reference,setReference]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const canEdit=accessLevel(context,'production')==='EDIT';
  async function load() {
    const {data,error:rpcError}=await supabase.rpc('mha_staff_store_production_catalog',{p_store_id:storeId});
    if(rpcError)throw rpcError;
    return data || [];
  }
  useEffect(()=>{
    let active=true;
    setRows([]);setVariantId('');setError('');
    load().then(data=>{if(active)setRows(data);}).catch(e=>{if(active)setError(e.message);});
    return ()=>{active=false;};
  },[storeId]);
  async function produce(event) {
    event.preventDefault();
    if(!canEdit || busy)return;
    const product=rows.find(item=>String(item.product_variant_id)===String(variantId));
    const qty=Number(quantity);
    if(!product || !Number.isFinite(qty) || qty<=0) {setError('Choose a product variant and valid production quantity.');return;}
    setBusy(true);setError('');
    try {
      const {error:rpcError}=await supabase.rpc('mha_process_store_production',{
        p_store_id:storeId,p_production_sku_id:product.production_sku_id,
        p_product_variant_id:product.product_variant_id,p_quantity:qty,
        p_reference_no:reference.trim()||null
      });
      if(rpcError)throw rpcError;
      setRows(await load());setQuantity('');setReference('');
    }catch(e){setError(e.message || 'Unable to process production.');}
    finally{setBusy(false);}
  }
  return <section className="chart-card">
    <h2>Production Management</h2>
    <p>Finished-product stock is tracked by store. Production deducts that store's recipe ingredients and increases that store's finished stock.</p>
    {error && <p role="alert" style={{color:'crimson'}}>{error}</p>}
    <div style={{overflowX:'auto'}}><table style={{width:'100%'}}>
      <thead><tr><th>SKU</th><th>Product</th><th>Variant</th><th>Store Stock</th><th>Minimum</th></tr></thead>
      <tbody>{rows.map(item=><tr key={item.product_variant_id}><td>{item.sku_code}</td><td>{item.sku_name}</td><td>{item.variant_name||item.variant_code}</td><td>{Number(item.current_stock).toLocaleString()}</td><td>{Number(item.minimum_stock).toLocaleString()}</td></tr>)}</tbody>
    </table></div>
    {!rows.length && !error && <p>No company production SKUs or variants are available yet.</p>}
    {canEdit && <form onSubmit={produce} style={{display:'grid',gap:12,marginTop:20}}>
      <h3>Record Production</h3>
      <label>Product Variant <select required disabled={busy} value={variantId} onChange={e=>setVariantId(e.target.value)}>
        <option value="">Select variant</option>{rows.map(item=><option key={item.product_variant_id} value={item.product_variant_id}>{item.sku_code} — {item.sku_name} / {item.variant_name||item.variant_code}</option>)}
      </select></label>
      <label>Quantity <input required type="number" min="0.0001" step="any" value={quantity} onChange={e=>setQuantity(e.target.value)} disabled={busy}/></label>
      <label>Reference <input value={reference} onChange={e=>setReference(e.target.value)} disabled={busy}/></label>
      <button className="primary-btn" type="submit" disabled={busy||!rows.length}>{busy?'Processing...':'Record Production'}</button>
    </form>}
    {!canEdit && <p>View-only access: production submission disabled.</p>}
  </section>;
}
