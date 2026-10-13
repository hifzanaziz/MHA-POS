import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyStaffToken } from '../_shared/staffSession.ts';
const cors={'access-control-allow-origin':'https://mha-pos.vercel.app','access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'authorization,content-type,apikey'};
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'content-type':'application/json','cache-control':'no-store'}});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return respond({error:'Method not allowed'},405);
 const secret=Deno.env.get('STAFF_SESSION_SECRET'),url=Deno.env.get('SUPABASE_URL'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!secret||!url||!service)return respond({error:'Service unavailable'},503);
 const bearer=/^Bearer (.+)$/.exec(req.headers.get('authorization')||'');
 if(!bearer)return respond({error:'Unauthorized'},401);
 const claims=await verifyStaffToken(secret,bearer[1]);
 if(!claims)return respond({error:'Unauthorized'},401);
 let input:Record<string,unknown>;
 try{input=await req.json();}catch{return respond({error:'Invalid request'},400);}
 const id=Number(input?.variant_id);
 if(!Number.isSafeInteger(id)||id<1||!Array.isArray(input.ingredients)||input.ingredients.length>100)return respond({error:'Invalid ingredients'},400);
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.rpc('mha_staff_save_variant_recipe',{p_staff_id:claims.staff_id,p_company_id:claims.company_id,p_session_version:claims.session_version,p_variant_id:id,p_ingredients:input.ingredients});
 if(error)return respond({error:'Update not permitted or invalid'},403);
 return respond({result:data});
});