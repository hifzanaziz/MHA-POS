import { createClient } from 'npm:@supabase/supabase-js@2';
import { issueStaffToken } from '../_shared/staffSession.ts';

const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const digest=async(secret:string,input:string)=> {
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(input)))).map(b=>b.toString(16).padStart(2,'0')).join('');
};
Deno.serve(async(req)=>{
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const url=Deno.env.get('SUPABASE_URL');
 const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 const secret=Deno.env.get('STAFF_SESSION_SECRET');
 if(!url||!serviceKey||!secret||secret.length<32)return json({error:'Login unavailable'},503);
 let input:unknown;
 try {if(Number(req.headers.get('content-length')||0)>4096)return json({error:'Invalid request'},400); input=await req.json();}catch{return json({error:'Invalid request'},400);}
 if(!input||typeof input!=='object')return json({error:'Invalid request'},400);
 const obj=input as Record<string,unknown>;
 const company=typeof obj.company_code==='string'?obj.company_code.trim().toLowerCase():'';
 const username=typeof obj.username==='string'?obj.username.trim().toLowerCase():'';
 const password=obj.password;
 if(!/^[a-z0-9_-]{2,80}$/.test(company)||!/^[a-z0-9._-]{3,80}$/.test(username)||typeof password!=='string'||password.length<12||new TextEncoder().encode(password).length>72)return json({error:'Invalid credentials'},401);
 const client=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 // Do not use user-supplied identifiers as authorization; they are only lookup inputs.
 const key=await digest(secret,'login:'+company+':'+username);
 const {data:allowed,error:limitError}=await client.rpc('mha_staff_login_rate_limit',{p_key_hash:key});
 if(limitError)return json({error:'Login unavailable'},503);
 if(!allowed)return json({error:'Too many attempts. Try again later.'},429);
 const {data:staff,error}=await client.rpc('mha_staff_verify_credentials',{p_company_code:company,p_username:username,p_password:password});
 if(error)return json({error:'Login unavailable'},503);
 if(!staff)return json({error:'Invalid credentials'},401);
 const token=await issueStaffToken(secret,{staff_id:staff.staff_id,company_id:staff.company_id,session_version:staff.session_version});
 return json({access_token:token,token_type:'Bearer',expires_in:900,default_store_id:staff.default_store_id});
});
