import React, { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { accessLevel } from './tenantAccess.js';

export default function StoreInventory({ context, storeId }) {
  const [rows,setRows] = useState([]);
  const [selectedSku,setSelectedSku] = useState('');
  const [quantity,setQuantity] = useState('');
  const [price,setPrice] = useState('0');
  const [reference,setReference] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [creating,setCreating] = useState(false);
  const [skuForm,setSkuForm] = useState({sku_code:'',sku_name:'',category:'',order_uom:'Carton',inventory_uom:'Pack',recipe_uom:'g',order_to_inventory:'1',inventory_to_recipe:'1'});
  const canEdit=accessLevel(context,'inventory')==='EDIT';
  async function load() {
    const {data,error:rpcError}=await supabase.rpc('mha_staff_store_inventory',{p_store_id:storeId});
    if(rpcError)throw rpcError;
    return data || [];
  }
  useEffect(()=>{
    let alive=true;
    setRows([]);setSelectedSku('');setError('');
    load().then(data=>{if(alive)setRows(data);}).catch(e=>{if(alive)setError(e.message);});
    return ()=>{alive=false;};
  },[storeId]);
  async function receive(event) {
    event.preventDefault();
    if(!canEdit || busy)return;
    const qty=Number(quantity),unitPrice=Number(price);
    if(!selectedSku || !Number.isFinite(qty) || qty<=0 || !Number.isFinite(unitPrice) || unitPrice<0) {
      setError('Select an inventory SKU and enter a valid quantity and price.');return;
    }
    setBusy(true);setError('');
    try {
      const {error:rpcError}=await supabase.rpc('mha_add_store_inventory_stock',{
        p_store_id:storeId,p_inventory_sku_id:Number(selectedSku),
        p_quantity_order_uom:qty,p_unit_price:unitPrice,p_reference_no:reference.trim()||null,p_remarks:null
      });
      if(rpcError)throw rpcError;
      setRows(await load());setQuantity('');setReference('');
    }catch(e){setError(e.message || 'Unable to receive stock.');}
    finally{setBusy(false);}
  }
  async function createSku(event) {
    event.preventDefault();
    if(!canEdit||creating)return;
    setCreating(true);setError("");
    try {
      const {error:rpcError}=await supabase.rpc("mha_create_company_inventory_sku",{
        p_store_id:storeId,p_sku_code:skuForm.sku_code.trim(),p_sku_name:skuForm.sku_name.trim(),p_category:skuForm.category.trim()||null,
        p_order_uom:skuForm.order_uom.trim(),p_inventory_uom:skuForm.inventory_uom.trim(),p_recipe_uom:skuForm.recipe_uom.trim(),
        p_order_to_inventory:Number(skuForm.order_to_inventory),p_inventory_to_recipe:Number(skuForm.inventory_to_recipe)
      });
      if(rpcError)throw rpcError;
      setRows(await load());setSkuForm(current=>({...current,sku_code:"",sku_name:"",category:""}));
    }catch(e){setError(e.message||"Unable to create inventory SKU.");}
    finally{setCreating(false);}
  }
  return <section className="chart-card">
    <h2>Inventory Management — Inventory SKU</h2>
    <p>Company-shared SKU masters, with stock balances and receiving recorded separately for each store.</p>
    {error && <p role="alert" style={{color:'crimson'}}>{error}</p>}
    <div style={{overflowX:'auto'}}>
      <table style={{width:'100%'}}><thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>Stock (Recipe UOM)</th><th>Minimum</th></tr></thead>
      <tbody>{rows.map(item=><tr key={item.inventory_sku_id}><td>{item.sku_code}</td><td>{item.sku_name}</td><td>{item.category}</td><td>{Number(item.current_stock).toLocaleString()} {item.recipe_uom}</td><td>{Number(item.minimum_stock).toLocaleString()}</td></tr>)}</tbody></table>
    </div>
    {!rows.length && !error && <p>No company inventory SKUs have been created yet.</p>}
    {canEdit && <form onSubmit={createSku} style={{display:'grid',gap:12,marginTop:20}}>
      <h3>Create Company Inventory SKU</h3>
      <p>This SKU will be shared with all stores in your company. Stock remains store-specific.</p>
      {['sku_code','sku_name','category','order_uom','inventory_uom','recipe_uom','order_to_inventory','inventory_to_recipe'].map(field=><label key={field}>{field.replaceAll('_',' ')} <input required={field!=='category'} type={field.includes('to_')?'number':'text'} min={field.includes('to_')?'0.000001':undefined} step={field.includes('to_')?'any':undefined} value={skuForm[field]} onChange={e=>setSkuForm(current=>({...current,[field]:e.target.value}))} disabled={creating}/></label>)}
      <button className="primary-btn" type="submit" disabled={creating}>{creating?'Creating...':'Create Inventory SKU'}</button>
    </form>}
    {canEdit && <form onSubmit={receive} style={{display:'grid',gap:12,marginTop:20}}>
      <h3>Receive Stock</h3>
      <label>Inventory SKU <select required value={selectedSku} onChange={e=>setSelectedSku(e.target.value)} disabled={busy}>
        <option value="">Select SKU</option>{rows.map(item=><option key={item.inventory_sku_id} value={item.inventory_sku_id}>{item.sku_code} — {item.sku_name} ({item.order_uom})</option>)}
      </select></label>
      <label>Quantity (Order UOM) <input type="number" min="0.0001" step="any" required value={quantity} onChange={e=>setQuantity(e.target.value)} disabled={busy}/></label>
      <label>Unit Price (RM) <input type="number" min="0" step="0.01" required value={price} onChange={e=>setPrice(e.target.value)} disabled={busy}/></label>
      <label>Reference <input value={reference} onChange={e=>setReference(e.target.value)} disabled={busy}/></label>
      <button className="primary-btn" type="submit" disabled={busy||!rows.length}>{busy?'Saving...':'Receive Stock'}</button>
    </form>}
    {!canEdit && <p>View-only access: stock receiving disabled.</p>}
  </section>;
}
