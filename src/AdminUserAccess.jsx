import React,{useEffect,useState} from 'react';
import {supabase} from './supabase.js';

export default function AdminUserAccess({context}) {
 const [data,setData]=useState({users:[],assignments:[],companies:[],stores:[],roles:[]});
 const [form,setForm]=useState({email:'',username:'',company_id:'',role_id:'',store_ids:[],default_store_id:'',is_active:true});
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 async function load(){const {data:result,error:e}=await supabase.rpc('mha_admin_user_access_catalog');if(e)throw e;return result||{};}
 useEffect(()=>{let alive=true;load().then(result=>{if(alive)setData(result);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[]);
 if(!context?.is_super_admin)return <p>Super Admin access required.</p>;
 const stores=(data.stores||[]).filter(s=>s.is_active&&String(s.company_id)===form.company_id);
 const roles=(data.roles||[]).filter(r=>r.is_active&&String(r.company_id)===form.company_id);
 async function save(event){
  event.preventDefault();if(busy)return;
  if(!form.store_ids.length||!form.store_ids.includes(Number(form.default_store_id))){setError('Choose at least one store and a default among assigned stores.');return;}
  setBusy(true);setError('');
  try {
   const {error:e}=await supabase.rpc('mha_admin_assign_existing_user',{
    p_user_email:form.email.trim(),p_username:form.username.trim(),p_company_id:Number(form.company_id),
    p_role_id:Number(form.role_id),p_store_ids:form.store_ids,p_default_store_id:Number(form.default_store_id),p_is_active:form.is_active
   });
   if(e)throw e;
   setData(await load());setForm({email:'',username:'',company_id:'',role_id:'',store_ids:[],default_store_id:'',is_active:true});
  }catch(e){setError(e.message||'Unable to assign user.');}
  finally{setBusy(false);}
 }
 return <section className="chart-card">
  <h2>User Access</h2>
  <p>Assign an existing Supabase Authentication user to one company, one role and multiple stores. Only the pinned Super Admin may manage assignments.</p>
  {error&&<p role="alert" style={{color:'crimson'}}>{error}</p>}
  <div style={{overflowX:'auto'}}><table style={{width:'100%'}}>
   <thead><tr><th>Email</th><th>Username</th><th>Company</th><th>Role</th><th>Assigned Stores</th><th>Status</th></tr></thead>
   <tbody>{(data.users||[]).map(u=><tr key={u.user_id}><td>{u.email}</td><td>{u.username}</td><td>{(data.companies||[]).find(c=>c.id===u.company_id)?.company_name||'MHA'}</td><td>{(data.roles||[]).find(r=>r.id===u.role_id)?.role_name||'Super Admin'}</td><td>{(data.assignments||[]).filter(a=>a.user_id===u.user_id).map(a=>(data.stores||[]).find(s=>s.id===a.store_id)?.store_name||a.store_id).join(', ')||'All (Super Admin)'}</td><td>{u.is_active?'Active':'Inactive'}</td></tr>)}</tbody>
  </table></div>
  <form onSubmit={save} style={{display:'grid',gap:12,marginTop:20}}>
   <h3>Assign Existing Auth User</h3>
   <p>For security, account creation and password management remain in Supabase Authentication. Enter the email of an existing Auth user.</p>
   <label>Email <input type="email" required value={form.email} onChange={e=>setForm(old=>({...old,email:e.target.value}))} disabled={busy}/></label>
   <label>Username <input required value={form.username} onChange={e=>setForm(old=>({...old,username:e.target.value}))} disabled={busy}/></label>
   <label>Company <select required value={form.company_id} disabled={busy} onChange={e=>setForm(old=>({...old,company_id:e.target.value,role_id:'',store_ids:[],default_store_id:''}))}><option value="">Select company</option>{(data.companies||[]).filter(c=>c.is_active).map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></label>
   <label>Role <select required value={form.role_id} disabled={busy} onChange={e=>setForm(old=>({...old,role_id:e.target.value}))}><option value="">Select role</option>{roles.map(r=><option key={r.id} value={r.id}>{r.role_name}</option>)}</select></label>
   <fieldset><legend>Assigned Stores</legend>{stores.map(s=><label key={s.id} style={{display:'block'}}><input type="checkbox" disabled={busy} checked={form.store_ids.includes(s.id)} onChange={e=>setForm(old=>{const ids=e.target.checked?[...old.store_ids,s.id]:old.store_ids.filter(id=>id!==s.id);return {...old,store_ids:ids,default_store_id:ids.includes(Number(old.default_store_id))?old.default_store_id:''};})}/> {s.store_code} — {s.store_name}</label>)}</fieldset>
   <label>Default Store <select required disabled={busy||!form.store_ids.length} value={form.default_store_id} onChange={e=>setForm(old=>({...old,default_store_id:e.target.value}))}><option value="">Select default</option>{stores.filter(s=>form.store_ids.includes(s.id)).map(s=><option key={s.id} value={s.id}>{s.store_name}</option>)}</select></label>
   <label><input type="checkbox" checked={form.is_active} disabled={busy} onChange={e=>setForm(old=>({...old,is_active:e.target.checked}))}/> Active</label>
   <button className="primary-btn" type="submit" disabled={busy}>{busy?'Saving...':'Save User Access'}</button>
  </form>
 </section>;
}
