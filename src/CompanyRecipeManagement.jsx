import React,{useEffect,useState} from 'react';
import {supabase} from './supabase.js';
import {accessLevel} from './tenantAccess.js';

const EMPTY={products:[],variants:[],ingredients:[],base_recipes:[],variant_recipes:[]};
export default function CompanyRecipeManagement({context,storeId}) {
 const [catalog,setCatalog]=useState(EMPTY);
 const [productId,setProductId]=useState('');
 const [variantId,setVariantId]=useState('');
 const [lines,setLines]=useState([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const canEdit=accessLevel(context,'recipe')==='EDIT';
 async function load(){const {data,error:e}=await supabase.rpc('mha_company_recipe_catalog',{p_store_id:storeId});if(e)throw e;return data||EMPTY;}
 useEffect(()=>{let alive=true;setCatalog(EMPTY);setProductId('');setVariantId('');setLines([]);setError('');load().then(data=>{if(alive)setCatalog(data);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[storeId]);
 const variants=(catalog.variants||[]).filter(v=>String(v.production_sku_id)===String(productId));
 useEffect(()=>{
  const rows=variantId
   ?(catalog.variant_recipes||[]).filter(r=>String(r.product_variant_id)===String(variantId))
   :(catalog.base_recipes||[]).filter(r=>String(r.production_sku_id)===String(productId));
  setLines(rows.map(r=>({inventory_sku_id:String(r.inventory_sku_id),quantity:String(r.quantity)})));
 },[productId,variantId,catalog]);
 const hasOverride=variantId && (catalog.variant_recipes||[]).some(r=>String(r.product_variant_id)===String(variantId));
 const effective=hasOverride?lines:variantId?(catalog.base_recipes||[]).filter(r=>String(r.production_sku_id)===String(productId)):lines;
 async function save(event){
  event.preventDefault();if(!canEdit||busy||!productId)return;
  if(lines.some(l=>!l.inventory_sku_id||!(Number(l.quantity)>0)) || new Set(lines.map(l=>l.inventory_sku_id)).size!==lines.length){setError('Ingredients must be unique and quantities positive.');return;}
  if(!variantId&&!lines.length){setError('Base recipe requires an ingredient.');return;}
  setBusy(true);setError('');
  try{
   const {error:e}=await supabase.rpc('mha_save_company_recipe',{
    p_store_id:storeId,p_production_sku_id:Number(productId),p_product_variant_id:variantId?Number(variantId):null,
    p_lines:lines.map(l=>({inventory_sku_id:Number(l.inventory_sku_id),quantity:Number(l.quantity)}))
   });if(e)throw e;
   setCatalog(await load());
  }catch(e){setError(e.message||'Unable to save recipe.');}
  finally{setBusy(false);}
 }
 return <section className="chart-card">
  <h2>Recipe Management</h2>
  <p>Recipes are shared by all stores in the company. A variant uses its own recipe when present; otherwise it inherits the base recipe.</p>
  {error&&<p role="alert" style={{color:'crimson'}}>{error}</p>}
  <div style={{display:'grid',gap:12}}>
   <label>Production SKU <select value={productId} onChange={e=>{setProductId(e.target.value);setVariantId('');}}><option value="">Select product</option>{(catalog.products||[]).map(p=><option key={p.id} value={p.id}>{p.sku_code} — {p.sku_name}</option>)}</select></label>
   <label>Recipe Type <select disabled={!productId} value={variantId} onChange={e=>setVariantId(e.target.value)}><option value="">Base Recipe</option>{variants.map(v=><option key={v.id} value={v.id}>Variant: {v.variant_name||v.variant_code}</option>)}</select></label>
  </div>
  {variantId&&!hasOverride&&<p>This variant currently inherits the base recipe. Add ingredients below to create a variant-specific override.</p>}
  {productId&&<form onSubmit={save} style={{display:'grid',gap:12,marginTop:16}}>
   {lines.map((line,index)=><div key={index} style={{display:'flex',gap:8,alignItems:'center'}}>
    <select aria-label={`Ingredient ${index+1}`} disabled={!canEdit||busy} value={line.inventory_sku_id} onChange={e=>setLines(old=>old.map((v,i)=>i===index?{...v,inventory_sku_id:e.target.value}:v))}>
     <option value="">Select ingredient</option>{(catalog.ingredients||[]).map(i=><option key={i.id} value={i.id}>{i.sku_code} — {i.sku_name} ({i.recipe_uom})</option>)}
    </select>
    <input aria-label={`Quantity ${index+1}`} type="number" min="0.000001" step="any" disabled={!canEdit||busy} value={line.quantity} onChange={e=>setLines(old=>old.map((v,i)=>i===index?{...v,quantity:e.target.value}:v))} style={{width:100}}/>
    {canEdit&&<button type="button" disabled={busy} onClick={()=>setLines(old=>old.filter((_,i)=>i!==index))}>Remove</button>}
   </div>)}
   {canEdit&&<div style={{display:'flex',gap:8}}>
    <button type="button" disabled={busy} onClick={()=>setLines(old=>[...old,{inventory_sku_id:'',quantity:'1'}])}>Add Ingredient</button>
    <button className="primary-btn" type="submit" disabled={busy}>{busy?'Saving...':'Save Recipe'}</button>
    {variantId&&<button type="button" disabled={busy} onClick={()=>setLines([])}>Clear Variant Override</button>}
   </div>}
   {!canEdit&&<p>View-only access: recipe editing disabled.</p>}
   {variantId&&<p>Effective recipe: {hasOverride?'Variant-specific':'Base recipe inherited'} ({effective.length} ingredients)</p>}
  </form>}
 </section>;
}
