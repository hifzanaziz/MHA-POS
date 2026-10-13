import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyStaffToken } from '../_shared/staffSession.ts';

const cors={'access-control-allow-origin':'https://mha-pos.vercel.app','access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'authorization,content-type,apikey'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{...cors,'content-type':'application/json','cache-control':'no-store'}
});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='GET')return reply({error:'Method not allowed'},405);
 const url=Deno.env.get('SUPABASE_URL');
 const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 const secret=Deno.env.get('STAFF_SESSION_SECRET');
 if(!url||!serviceKey||!secret||secret.length<32)return reply({error:'Session service unavailable'},503);
 const match=/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(req.headers.get('authorization')||'');
 if(!match)return reply({error:'Unauthorized'},401);
 const claims=await verifyStaffToken(secret,match[1]);
 if(!claims)return reply({error:'Unauthorized'},401);
 const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.rpc('mha_staff_session_context',{
  p_staff_id:claims.staff_id,p_company_id:claims.company_id,p_session_version:claims.session_version
 });
 if(error)return reply({error:'Session service unavailable'},503);
 if(!data)return reply({error:'Unauthorized'},401);
 return reply({staff:data});
});
