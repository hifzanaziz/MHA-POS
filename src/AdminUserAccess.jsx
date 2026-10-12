import React,{useEffect,useState} from 'react';
import {supabase} from './supabase.js';

export default function AdminUserAccess({context}) {
 const [data,setData]=useState({users:[],assignments:[],companies:[],stores:[],roles:[]});
 const [form,setForm]=useState({username:'',display_name:'',password:'',company_id:'',role_id:'',store_ids:[],default_store_id:'',is_active:true});
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [editing,setEditing]=useState(null);
 async function load(){const [base,staff]=await Promise.all([supabase.rpc('mha_admin_user_access_catalog'),supabase.rpc('mha_admin_staff_catalog')]);if(base.error)throw base.error;if(staff.error)throw staff.error;return {...(base.data||{}),staffUsers:staff.data?.users||[],staffAssignments:staff.data?.assignments||[]};}
 useEffect(()=>{let alive=true;load().then(result=>{if(alive)setData(result);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[]);
 if(!context?.is_super_admin)return <p>Super Admin access required.</p>;
 const stores=(data.stores||[]).filter(s=>s.is_active&&String(s.company_id)===form.company_id);
 const roles=(data.roles||[]).filter(r=>r.is_active&&String(r.company_id)===form.company_id);
 async function save(event){
  event.preventDefault();if(busy)return;
  if(!form.store_ids.length||!form.store_ids.includes(Number(form.default_store_id))){setError('Choose at least one store and a default among assigned stores.');return;}
  setBusy(true);setError('');
  try {
   const {error:e}=await supabase.rpc('mha_admin_create_staff',{
    p_username:form.username.trim(),p_display_name:form.display_name.trim(),p_password:form.password,p_company_id:Number(form.company_id),
    p_role_id:Number(form.role_id),p_store_ids:form.store_ids,p_default_store_id:Number(form.default_store_id)
   });
   if(e)throw e;
   setData(await load());
   setError('Staff account created. Database-managed staff login requires the separate staff sign-in flow.');setForm({username:'',display_name:'',password:'',company_id:'',role_id:'',store_ids:[],default_store_id:'',is_active:true});
  }catch(e){setError(e.message||'Unable to assign user.');}
  finally{setBusy(false);}
 }
 async function updateStaff(event){
  event.preventDefault();if(busy||!editing)return;
  if(!editing.store_ids.length||!editing.store_ids.includes(Number(editing.default_store_id))){setError('Choose a valid default store.');return;}
  setBusy(true);setError('');
  try{
   const {error:e}=await supabase.rpc('mha_admin_update_staff',{
    p_staff_id:editing.id,p_display_name:editing.display_name,p_role_id:Number(editing.role_id),
    p_store_ids:editing.store_ids,p_default_store_id:Number(editing.default_store_id),
    p_is_active:editing.is_active,p_new_password:editing.new_password||null
   });
   if(e)throw e;
   setData(await load());setEditing(null);setError('Staff account updated. Existing sessions revoked.');
  }catch(e){setError(e.message||'Unable to update staff.');}finally{setBusy(false);}
 }
 function startEdit(u){
  setEditing({...u,role_id:String(u.role_id),default_store_id:String(u.default_store_id),
   store_ids:(data.staffAssignments||[]).filter(a=>a.staff_id===u.id).map(a=>a.store_id),new_password:''});
 }
 return <section className="chart-card">
  <h2>User Access</h2>
  <p>Create database-managed staff accounts with one company, one role and multiple assigned stores. Only the pinned Super Admin may create staff.</p>
  {error&&<p role="alert" style={{color:'crimson'}}>{error}</p>}
  <div style={{overflowX:'auto'}}><table style={{width:'100%'}}>
   <thead><tr><th>Username</th><th>Display Name</th><th>Company</th><th>Role</th><th>Assigned Stores</th><th>Status</th><th>Action</th></tr></thead>
   <tbody>{(data.staffUsers||[]).map(u=><tr key={u.id}><td>{u.username}</td><td>{u.display_name}</td><td>{(data.companies||[]).find(c=>c.id===u.company_id)?.company_name||u.company_id}</td><td>{(data.roles||[]).find(r=>r.id===u.role_id)?.role_name||u.role_id}</td><td>{(data.staffAssignments||[]).filter(a=>a.staff_id===u.id).map(a=>(data.stores||[]).find(s=>s.id===a.store_id)?.store_name||a.store_id).join(', ')||'None'}</td><td>{u.is_active?'Active':'Inactive'}</td><td><button type="button" disabled={busy} onClick={()=>startEdit(u)}>Edit</button></td></tr>)}</tbody>
  </table></div>
  {editing&&<form onSubmit={updateStaff} style={{display:'grid',gap:12,marginTop:20,padding:16,border:'1px solid #ddd'}}>
   <h3>Edit Staff: {editing.username}</h3>
   <label>Display Name <input required maxLength={120} value={editing.display_name} onChange={e=>setEditing(v=>({...v,display_name:e.target.value}))}/></label>
   <label>Role <select required value={editing.role_id} onChange={e=>setEditing(v=>({...v,role_id:e.target.value}))}>{(data.roles||[]).filter(r=>r.company_id===editing.company_id&&r.is_active).map(r=><option key={r.id} value={r.id}>{r.role_name}</option>)}</select></label>
   <fieldset><legend>Assigned Stores</legend>{(data.stores||[]).filter(s=>s.company_id===editing.company_id&&s.is_active).map(s=><label key={s.id} style={{display:'block'}}><input type="checkbox" checked={editing.store_ids.includes(s.id)} onChange={e=>setEditing(v=>{const ids=e.target.checked?[...v.store_ids,s.id]:v.store_ids.filter(id=>id!==s.id);return {...v,store_ids:ids,default_store_id:ids.includes(Number(v.default_store_id))?v.default_store_id:''};})}/> {s.store_code} — {s.store_name}</label>)}</fieldset>
   <label>Default Store <select required value={editing.default_store_id} onChange={e=>setEditing(v=>({...v,default_store_id:e.target.value}))}><option value="">Select default</option>{(data.stores||[]).filter(s=>editing.store_ids.includes(s.id)).map(s=><option key={s.id} value={s.id}>{s.store_name}</option>)}</select></label>
   <label>New Password (leave blank to keep existing) <input type="password" minLength={12} maxLength={72} value={editing.new_password} onChange={e=>setEditing(v=>({...v,new_password:e.target.value}))}/></label>
   <label><input type="checkbox" checked={editing.is_active} onChange={e=>setEditing(v=>({...v,is_active:e.target.checked}))}/> Active</label>
   <p>Saving changes invalidates all existing staff sessions.</p>
   <div><button className="primary-btn" type="submit" disabled={busy}>{busy?'Saving...':'Update Staff'}</button> <button type="button" disabled={busy} onClick={()=>setEditing(null)}>Cancel</button></div>
  </form>}
  <form onSubmit={save} style={{display:'grid',gap:12,marginTop:20}}>
   <h3>Create Staff Account</h3>
   <p>Staff accounts are stored in MHA, not Supabase Authentication. The password is securely hashed on the server.</p>
   <label>Display Name <input required maxLength={120} value={form.display_name} onChange={e=>setForm(old=>({...old,display_name:e.target.value}))} disabled={busy}/></label>
   <label>Username <input required minLength={3} maxLength={80} pattern="[A-Za-z0-9._-]+" value={form.username} onChange={e=>setForm(old=>({...old,username:e.target.value}))} disabled={busy}/></label>
   <label>Temporary Password <input type="password" required minLength={12} maxLength={72} autoComplete="new-password" value={form.password} onChange={e=>setForm(old=>({...old,password:e.target.value}))} disabled={busy}/></label>
   <label>Company <select required value={form.company_id} disabled={busy} onChange={e=>setForm(old=>({...old,company_id:e.target.value,role_id:'',store_ids:[],default_store_id:''}))}><option value="">Select company</option>{(data.companies||[]).filter(c=>c.is_active).map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></label>
   <label>Role <select required value={form.role_id} disabled={busy} onChange={e=>setForm(old=>({...old,role_id:e.target.value}))}><option value="">Select role</option>{roles.map(r=><option key={r.id} value={r.id}>{r.role_name}</option>)}</select></label>
   <fieldset><legend>Assigned Stores</legend>{stores.map(s=><label key={s.id} style={{display:'block'}}><input type="checkbox" disabled={busy} checked={form.store_ids.includes(s.id)} onChange={e=>setForm(old=>{const ids=e.target.checked?[...old.store_ids,s.id]:old.store_ids.filter(id=>id!==s.id);return {...old,store_ids:ids,default_store_id:ids.includes(Number(old.default_store_id))?old.default_store_id:''};})}/> {s.store_code} — {s.store_name}</label>)}</fieldset>
   <label>Default Store <select required disabled={busy||!form.store_ids.length} value={form.default_store_id} onChange={e=>setForm(old=>({...old,default_store_id:e.target.value}))}><option value="">Select default</option>{stores.filter(s=>form.store_ids.includes(s.id)).map(s=><option key={s.id} value={s.id}>{s.store_name}</option>)}</select></label>

   <button className="primary-btn" type="submit" disabled={busy}>{busy?'Saving...':'Save User Access'}</button>
  </form>
 </section>;
}
