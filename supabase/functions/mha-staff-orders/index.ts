import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyStaffToken } from '../_shared/staffSession.ts';
const cors={'access-control-allow-origin':'https://mha-pos.vercel.app','access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'authorization,content-type,apikey'};
const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'content-type':'application/json','cache-control':'no-store'}});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 const secret=Deno.env.get('STAFF_SESSION_SECRET');
 const url=Deno.env.get('SUPABASE_URL');
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!secret||!url||!key)return reply({error:'Unavailable'},503);
 const token=/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(req.headers.get('authorization')||'');
 if(!token)return reply({error:'Unauthorized'},401);
 const claims=await verifyStaffToken(secret,token[1]);
 if(!claims)return reply({error:'Unauthorized'},401);
 let body:unknown;try{body=await req.json();}catch{return reply({error:'Invalid request'},400);}
 const storeId=Number((body as Record<string,unknown>)?.store_id);
 if(!Number.isSafeInteger(storeId)||storeId<=0)return reply({error:'Invalid store'},400);
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.rpc('mha_staff_authorized_order_list',{p_staff_id:claims.staff_id,p_company_id:claims.company_id,p_session_version:claims.session_version,p_store_id:storeId});
 if(error)return reply({error:'Not authorized for this store or module'},403);
 return reply({orders:data});
});