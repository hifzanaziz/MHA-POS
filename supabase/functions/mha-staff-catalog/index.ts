import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyStaffToken } from '../_shared/staffSession.ts';
const cors={'access-control-allow-origin':'https://mha-pos.vercel.app','access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'authorization,content-type,apikey'};
const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'content-type':'application/json','cache-control':'no-store'}});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 const secret=Deno.env.get('STAFF_SESSION_SECRET'),url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!secret||!url||!key)return reply({error:'Unavailable'},503);
 const bearer=/^Bearer (.+)$/.exec(req.headers.get('authorization')||'');
 if(!bearer)return reply({error:'Unauthorized'},401);
 const claims=await verifyStaffToken(secret,bearer[1]);
 if(!claims)return reply({error:'Unauthorized'},401);
 let body:unknown;try{body=await req.json();}catch{return reply({error:'Invalid request'},400);}
 const module=(body as Record<string,unknown>)?.module;
 if(module!=='inventory'&&module!=='production'&&module!=='variations'&&module!=='recipe'&&module!=='recipe_ingredients'&&module!=='base_recipe')return reply({error:'Invalid module'},400);
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const skuId=Number(body?.production_sku_id);
 const variantId=Number(body?.variant_id);
 if(module==='recipe'&&(!Number.isSafeInteger(variantId)||variantId<1))return reply({error:'Invalid variation'},400);
 if((module==='variations'||module==='base_recipe')&&(!Number.isSafeInteger(skuId)||skuId<1))return reply({error:'Invalid SKU'},400);
 const {data,error}=module==='base_recipe'?await db.rpc('mha_staff_effective_base_recipe',{p_staff_id:claims.staff_id,p_company_id:claims.company_id,p_session_version:claims.session_version,p_production_sku_id:skuId}):module==='recipe_ingredients'?await db.rpc('mha_staff_recipe_ingredients',{p_staff_id:claims.staff_id,p_company_id:claims.company_id,p_session_version:claims.session_version}):module==='recipe'?await db.rpc('mha_staff_effective_variant_recipe',{p_staff_id:claims.staff_id,p_company_id:claims.company_id,p_session_version:claims.session_version,p_variant_id:variantId}):module==='variations'?await db.rpc('mha_staff_company_variations',{p_staff_id:claims.staff_id,p_company_id:claims.company_id,p_session_version:claims.session_version,p_production_sku_id:skuId}):await db.rpc('mha_staff_company_catalog',{p_staff_id:claims.staff_id,p_company_id:claims.company_id,p_session_version:claims.session_version,p_module:module});
 if(error)return reply({error:'Not authorized for this module'},403);
 return reply(module==='recipe'?{recipe:data}:{items:data});
});