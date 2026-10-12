import React,{useEffect,useState} from 'react';
import {supabase} from './supabase.js';

const MODULES=[['dashboard','Dashboard'],['order','Order Taking'],['orderHistory','Order History'],['inventory','Inventory SKU'],['recipe','Recipe Management'],['config','Master Configuration'],['production','Production SKU']];
export default function AdminUserMatrix({context}) {
 const [data,setData]=useState({companies:[],roles:[],permissions:[]});
 const [companyId,setCompanyId]=useState('');
 const [busy,setBusy]=useState('');
 const [error,setError]=useState('');
 async function load(){const {data:result,error:e}=await supabase.rpc('mha_admin_user_matrix_catalog');if(e)throw e;return result||{companies:[],roles:[],permissions:[]};}
 useEffect(()=>{let active=true;load().then(result=>{if(active)setData(result);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 if(!context?.is_super_admin)return <p>Super Admin access required.</p>;
 const roles=(data.roles||[]).filter(r=>r.is_active&&(!companyId||String(r.company_id)===companyId));
 async function setPermission(roleId,moduleId,level){
  const key=roleId+':'+moduleId;setBusy(key);setError('');
  try{
   const {error:e}=await supabase.rpc('mha_admin_set_role_permission',{p_role_id:roleId,p_submodule_code:moduleId,p_access_level:level});
   if(e)throw e;
   setData(await load());
  }catch(e){setError(e.message||'Unable to save permission.');}
  finally{setBusy('');}
 }
 return <section className="chart-card">
  <h2>User Matrix</h2>
  <p>Configure each company role's access to operational submodules. System Configuration is always Super Admin only.</p>
  {error&&<p role="alert" style={{color:'crimson'}}>{error}</p>}
  <label>Company <select value={companyId} onChange={e=>setCompanyId(e.target.value)}><option value="">All companies</option>{(data.companies||[]).map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></label>
  <div style={{overflowX:'auto',marginTop:16}}><table style={{width:'100%'}}>
   <thead><tr><th>Company</th><th>Role</th><th>Submodule</th><th>Permission</th></tr></thead>
   <tbody>{roles.flatMap(role=>MODULES.map(([id,label])=>{
    const existing=(data.permissions||[]).find(p=>p.role_id===role.id&&p.submodule_code===id);
    return <tr key={role.id+':'+id}>
     <td>{(data.companies||[]).find(c=>c.id===role.company_id)?.company_name||role.company_id}</td>
     <td>{role.role_name}</td><td>{label}</td>
     <td><select aria-label={role.role_name+' '+label} disabled={Boolean(busy)} value={existing?.access_level||'NONE'} onChange={e=>setPermission(role.id,id,e.target.value)}>
      <option value="NONE">NONE</option><option value="VIEW">VIEW</option><option value="EDIT">EDIT</option>
     </select></td>
    </tr>;
   }))}</tbody>
  </table></div>
 </section>;
}
