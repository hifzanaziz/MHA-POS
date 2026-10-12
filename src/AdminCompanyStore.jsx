import React,{useEffect,useState} from 'react';
import {supabase} from './supabase.js';

export default function AdminCompanyStore({mode='companies',context}) {
 const [data,setData]=useState({companies:[],stores:[]});
 const [form,setForm]=useState({company_code:'',company_name:'',company_id:'',store_code:'',store_name:'',public_slug:''});
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 async function load(){
  const {data:result,error:e}=await supabase.rpc('mha_admin_company_store_catalog');
  if(e)throw e;
  return result||{companies:[],stores:[]};
 }
 useEffect(()=>{let active=true;setError('');load().then(result=>{if(active)setData(result);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 if(!context?.is_super_admin)return <p>Super Admin access required.</p>;
 async function submit(event){
  event.preventDefault();if(busy)return;setBusy(true);setError('');
  try {
   const args=mode==='companies'?{p_company_code:form.company_code.trim(),p_company_name:form.company_name.trim()}:
    {p_company_id:Number(form.company_id),p_store_code:form.store_code.trim(),p_store_name:form.store_name.trim(),p_public_slug:form.public_slug.trim()};
   const {error:e}=await supabase.rpc(mode==='companies'?'mha_admin_create_company':'mha_admin_create_store',args);
   if(e)throw e;
   setData(await load());setForm({company_code:'',company_name:'',company_id:'',store_code:'',store_name:'',public_slug:''});
  }catch(e){setError(e.message||'Unable to save.');}
  finally{setBusy(false);}
 }
 return <section className="chart-card">
  <h2>{mode==='companies'?'Company Management':'Store Management'}</h2>
  <p>Restricted to the pinned MHA Super Admin identity. Company and store creation is validated by Supabase.</p>
  {error&&<p role="alert" style={{color:'crimson'}}>{error}</p>}
  <div style={{overflowX:'auto'}}><table style={{width:'100%'}}>
   <thead><tr>{(mode==='companies'?['Code','Company','Status']:['Company','Store Code','Store','Public URL Slug','Status']).map(x=><th key={x}>{x}</th>)}</tr></thead>
   <tbody>{mode==='companies'?(data.companies||[]).map(c=><tr key={c.id}><td>{c.company_code}</td><td>{c.company_name}</td><td>{c.is_active?'Active':'Inactive'}</td></tr>):
    (data.stores||[]).map(s=><tr key={s.id}><td>{(data.companies||[]).find(c=>c.id===s.company_id)?.company_name||s.company_id}</td><td>{s.store_code}</td><td>{s.store_name}</td><td>{s.public_slug}</td><td>{s.is_active?'Active':'Inactive'}</td></tr>)}</tbody>
  </table></div>
  <form onSubmit={submit} style={{display:'grid',gap:12,marginTop:20}}>
   <h3>{mode==='companies'?'Create Company':'Create Store'}</h3>
   {mode==='stores'&&<label>Company <select required value={form.company_id} onChange={e=>setForm(old=>({...old,company_id:e.target.value}))} disabled={busy}>
    <option value="">Select company</option>{(data.companies||[]).filter(c=>c.is_active).map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}
   </select></label>}
   {(mode==='companies'?['company_code','company_name']:['store_code','store_name','public_slug']).map(field=><label key={field}>{field.replaceAll('_',' ')} <input required value={form[field]} onChange={e=>setForm(old=>({...old,[field]:e.target.value}))} disabled={busy}/></label>)}
   <button className="primary-btn" type="submit" disabled={busy}>{busy?'Saving...':'Create'}</button>
  </form>
 </section>;
}
