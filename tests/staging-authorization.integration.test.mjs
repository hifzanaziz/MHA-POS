import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';

// Run only against an isolated Supabase staging project populated with test fixtures.
// Never run this suite against the production Supabase project.
// Required env: MHA_TEST_SUPABASE_URL, MHA_TEST_SUPABASE_ANON_KEY,
// MHA_TEST_ADMIN_EMAIL/PASSWORD, MHA_TEST_MANAGER_EMAIL/PASSWORD,
// MHA_TEST_VIEWER_EMAIL/PASSWORD, MHA_TEST_OTHER_COMPANY_EMAIL/PASSWORD,
// MHA_TEST_STORE_ID, MHA_TEST_UNASSIGNED_STORE_ID,
// MHA_TEST_OTHER_COMPANY_STORE_ID.
// Fixtures: Manager can EDIT orders in selected store, Viewer can VIEW only,
// Other-company user belongs to a different company. All fixture stores must be active.

const names=['ADMIN','MANAGER','VIEWER','OTHER_COMPANY'];
const env=process.env;
const required=['MHA_TEST_SUPABASE_URL','MHA_TEST_SUPABASE_ANON_KEY',
 ...names.flatMap(n=>['MHA_TEST_'+n+'_EMAIL','MHA_TEST_'+n+'_PASSWORD']),
 'MHA_TEST_STORE_ID','MHA_TEST_UNASSIGNED_STORE_ID','MHA_TEST_OTHER_COMPANY_STORE_ID'];
const configured=required.every(key=>Boolean(env[key]));
const url=env.MHA_TEST_SUPABASE_URL||'';
const projectId=(()=>{try{return new URL(url).hostname.split('.')[0];}catch{return '';}})();
const productionProject='aauyrowsdboatwgjvefb';
const allowedHost=(()=>{try{return new URL(url).hostname.endsWith('.supabase.co')&&new URL(url).protocol==='https:';}catch{return false;}})();
const safe=configured&&allowedHost&&projectId!==productionProject&&env.MHA_TEST_ALLOW_STAGING==='YES';

const client=()=>createClient(url,env.MHA_TEST_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const storeId=Number(env.MHA_TEST_STORE_ID);
const unassignedId=Number(env.MHA_TEST_UNASSIGNED_STORE_ID);
const otherCompanyStoreId=Number(env.MHA_TEST_OTHER_COMPANY_STORE_ID);

test('staging integration suite safety guard', {skip:!configured},()=>{
 assert.ok(safe,'Refusing to run: staging URL, explicit MHA_TEST_ALLOW_STAGING=YES and non-production project required');
 assert.ok([storeId,unassignedId,otherCompanyStoreId].every(Number.isSafeInteger));
 assert.ok(new Set([storeId,unassignedId,otherCompanyStoreId]).size===3,'Fixture stores must differ');
});
if(!safe){
 test('integration tests skipped: configure a separate staging project and opt in', {skip:true},()=>{});
}else{
 async function login(name){
  const c=client();
  const {error}=await c.auth.signInWithPassword({email:env['MHA_TEST_'+name+'_EMAIL'],password:env['MHA_TEST_'+name+'_PASSWORD']});
  assert.ifError(error);
  return c;
 }
 async function mustReject(result,description){
  assert.ok(result.error,description+' must be denied');
 }
 test('anonymous users cannot invoke privileged catalog and admin RPCs',async()=>{
  const c=client();
  for(const [fn,args] of [
   ['mha_admin_user_access_catalog',{}],
   ['mha_admin_user_matrix_catalog',{}],
   ['mha_staff_store_inventory',{p_store_id:storeId}],
   ['mha_company_recipe_catalog',{p_store_id:storeId}]
  ])await mustReject(await c.rpc(fn,args),fn);
 });
 test('non-admin users cannot enumerate or change administration configuration',async()=>{
  for(const role of ['MANAGER','VIEWER','OTHER_COMPANY']){
   const c=await login(role);
   await mustReject(await c.rpc('mha_admin_user_access_catalog'),role+' user catalog');
   await mustReject(await c.rpc('mha_admin_user_matrix_catalog'),role+' permission matrix');
   await mustReject(await c.rpc('mha_admin_create_company',{p_company_code:'TEST_DENIED',p_company_name:'Should Not Create'}),role+' create company');
  }
 });
 test('manager can read own store inventory but not other company or unassigned stores',async()=>{
  const c=await login('MANAGER');
  const allowed=await c.rpc('mha_staff_store_inventory',{p_store_id:storeId});
  assert.ifError(allowed.error);
  await mustReject(await c.rpc('mha_staff_store_inventory',{p_store_id:unassignedId}),'unassigned store');
  await mustReject(await c.rpc('mha_staff_store_inventory',{p_store_id:otherCompanyStoreId}),'other company');
 });
 test('viewer cannot mutate store inventory and cannot read cross-company inventory',async()=>{
  const c=await login('VIEWER');
  await mustReject(await c.rpc('mha_add_store_inventory_stock',{
   p_store_id:storeId,p_inventory_sku_id:-1,p_quantity_order_uom:1,p_unit_price:0,
   p_reference_no:'SECURITY-TEST',p_remarks:'should never write'
  }),'viewer stock receipt');
  await mustReject(await c.rpc('mha_staff_store_inventory',{p_store_id:otherCompanyStoreId}),'viewer cross-company inventory');
 });
 test('other-company user cannot read first-company order history',async()=>{
  const c=await login('OTHER_COMPANY');
  const {data,error}=await c.from('sales_order').select('id').eq('store_id',storeId).limit(1);
  assert.ifError(error);
  assert.deepEqual(data,[],'RLS must hide other company sales orders');
 });
 test('anonymous clients cannot read company SKU masters directly',async()=>{
  const c=client();
  for(const table of ['inventory_sku','production_sku']){
   const {data,error}=await c.from(table).select('id').limit(5);
   assert.ifError(error);
   assert.deepEqual(data,[],table+' must not expose anonymous company data');
  }
 });
 test('authenticated users cannot read another company SKU masters directly',async()=>{
  const other=await login('OTHER_COMPANY');
  const manager=await login('MANAGER');
  for(const table of ['inventory_sku','production_sku']){
   const own=await manager.from(table).select('id,company_id').limit(1);
   assert.ifError(own.error);
   assert.ok(own.data.length>0,'Fixture requires at least one '+table+' in manager company');
   const companyId=own.data[0].company_id;
   const cross=await other.from(table).select('id').eq('company_id',companyId).limit(1);
   assert.ifError(cross.error);
   assert.deepEqual(cross.data,[],table+' cross-company data must be hidden');
  }
 });
 test('Super Admin can read administration catalog',async()=>{
  const c=await login('ADMIN');
  const {data,error}=await c.rpc('mha_admin_user_matrix_catalog');
  assert.ifError(error);
  assert.ok(Array.isArray(data?.roles));
 });
}
