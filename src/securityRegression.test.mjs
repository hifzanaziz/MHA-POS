import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {accessLevel,requireSelectedStore} from './tenantAccess.js';

const root=new URL('../',import.meta.url);
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const modules=['dashboard','order','orderHistory','inventory','recipe','config','production'];
const admin=['company_management','store_management','user_access','user_matrix'];
const staff={is_super_admin:false,company_id:11,default_store_id:101,
 stores:[{id:101,company_id:11},{id:102,company_id:11}],
 permissions:{dashboard:'VIEW',order:'EDIT',orderHistory:'VIEW',inventory:'NONE',recipe:'EDIT',production:'VIEW'}};

test('anonymous and absent access context have no UI permissions',()=>{
 for(const moduleId of [...modules,...admin]) assert.equal(accessLevel(null,moduleId),'NONE');
});
test('staff can never open Super Admin screens, even with forged permission map',()=>{
 for(const moduleId of admin)assert.equal(accessLevel({...staff,permissions:{...staff.permissions,[moduleId]:'EDIT'}},moduleId),'NONE');
});
test('VIEW cannot mutate and NONE cannot read',()=>{
 assert.throws(()=>requireSelectedStore(staff,101,'dashboard','EDIT'));
 assert.throws(()=>requireSelectedStore(staff,101,'inventory','VIEW'));
 assert.doesNotThrow(()=>requireSelectedStore(staff,101,'orderHistory','VIEW'));
 assert.doesNotThrow(()=>requireSelectedStore(staff,101,'recipe','EDIT'));
});
test('unassigned stores are rejected, even when a role has EDIT',()=>{
 assert.throws(()=>requireSelectedStore(staff,103,'order','EDIT'));
});
test('unknown modules default deny',()=>{
 assert.equal(accessLevel(staff,'arbitrary_admin'),'NONE');
});
test('review-only security cutover cannot be applied by migration runner',()=>{
 const migrationNames=readdirSync(new URL('../supabase/migrations/',import.meta.url));
 assert.ok(!migrationNames.some(name=>/SECURITY_CUTOVER|CUTOVER_NOT_APPLIED/i.test(name)));
 const review=read('docs/security-cutover-REVIEW-ONLY.sql');
 assert.match(review,/NOT APPLIED/i);
 assert.match(review,/REVOKE ALL ON FUNCTION/i);
 assert.match(review,/DROP POLICY/i);
});
test('recent tenant RPC migrations explicitly revoke public and anon grants',()=>{
 const migrations=readdirSync(new URL('../supabase/migrations/',import.meta.url))
  .filter(name=>/^20261012_(19|2[0-9])_/.test(name));
 assert.equal(migrations.length,11,'Expected eleven scoped RPC migration files');
 for(const file of migrations){
  const sql=read('supabase/migrations/'+file);
  assert.match(sql,/SECURITY DEFINER/i,file);
  assert.match(sql,/REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon/i,file);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION[\s\S]*TO authenticated/i,file);
 }
});
test('migrated main App does not contain old unscoped loader calls',()=>{
 const app=read('src/main.jsx').split('  // Legacy unscoped master/config/usage loaders removed for Phase 1 tenant isolation.')[1] || '';
 assert.doesNotMatch(app,/supabase\.from\(["']inventory_sku["']\)\.select\(["']\*["']\)/);
 assert.doesNotMatch(app,/supabase\.rpc\(["']get_inventory_production_usage["']\)/);
 assert.doesNotMatch(app,/supabase\.rpc\(["']get_config_options["']\)/);
});
// These tests check repository invariants only. Real RLS, JWT claims, tenant isolation,
// Auth user provisioning, and SECURITY DEFINER behavior require a separate authenticated
// database integration suite and must NOT be inferred from passing static tests.

test('cross-company reassignment removes old store links before updating profile',()=>{
 const sql=read('supabase/migrations/20261012_29_admin_assign_existing_user.sql');
 const remove=sql.indexOf('delete from public.mha_user_store where user_id=v_user;');
 const update=sql.indexOf('insert into public.mha_user_profile(');
 const assign=sql.indexOf('insert into public.mha_user_store(');
 assert.ok(remove>=0 && update>=0 && assign>=0);
 assert.ok(remove<update && update<assign,'Old company links must be removed before profile company changes');
});

test('obsolete legacy backfill is archived and cannot be auto-applied',()=>{
 const migrations=readdirSync(new URL('../supabase/migrations/',import.meta.url));
 assert.ok(!migrations.some(name=>/legacy_backfill/i.test(name)));
 assert.match(read('docs/obsolete-hanaazz-legacy-backfill-DO-NOT-APPLY.sql'),/DO NOT EXECUTE/);
});
test('foundational tenant RPC migration order is reproducible',()=>{
 const files=readdirSync(new URL('../supabase/migrations/',import.meta.url)).sort();
 const expect={
  foundation:'20261012_01_multi_company_foundation_DRAFT.sql',
  ownership:'20261012_02_store_ownership_DRAFT.sql',
  auth:'20261012_03_authorization_helpers_DRAFT.sql',
  storeContext:'20261012_06_verified_store_context.sql',
  payment:'20261012_06b_scoped_payment.sql',
  accessContext:'20261012_06c_access_context.sql',
  reservation:'20261012_08_store_stock_reservation_DRAFT.sql',
  pin:'20261012_09_pin_super_admin_DRAFT.sql',
  order:'20261012_10_staff_store_order.sql'
 };
 for(const [key,file] of Object.entries(expect))assert.ok(files.includes(file),key+' migration missing');
 const index=key=>files.indexOf(expect[key]);
 for(const [before,after] of [
  ['foundation','ownership'],['ownership','auth'],['auth','storeContext'],
  ['storeContext','payment'],['storeContext','accessContext'],
  ['storeContext','reservation'],['reservation','order'],['pin','order']
 ])assert.ok(index(before)<index(after),before+' must precede '+after);
 const context=read('supabase/migrations/'+expect.storeContext);
 assert.match(context,/mha_can_access_store/);
 assert.match(context,/REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon/i);
 const payment=read('supabase/migrations/'+expect.payment);
 assert.match(payment,/mha_current_store_context/);
 assert.match(payment,/mha_has_permission/);
 const access=read('supabase/migrations/'+expect.accessContext);
 assert.match(access,/mha_super_admin_identity/);
 assert.match(access,/GRANT EXECUTE ON FUNCTION[\s\S]*TO authenticated/i);
});

test('read-only RPC grant audit covers public, internal and administrative functions',()=>{
 const sql=read('docs/mha-rpc-grant-audit-READ-ONLY.sql');
 for(const name of ['mha_public_store_menu','mha_create_public_store_order','mha_reserve_variant_stock','mha_admin_assign_existing_user','mha_my_access_context'])
  assert.ok(sql.includes(name),name+' absent from grant matrix');
 assert.match(sql,/UNREVIEWED_FUNCTION/);
 assert.match(sql,/MISSING_FUNCTION/);
 assert.doesNotMatch(sql,/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|REVOKE|GRANT)\s+(?:ON|INTO|FROM|TABLE|FUNCTION|public\.)/i);
});

test('Phase 1 preview cannot mount legacy unscoped public ordering',()=>{
 const app=read('src/main.jsx');
 assert.match(app,/const publicOrderPath =/);
 assert.match(app,/window\.location\.pathname\.startsWith\("\/order\/store\/"\)/);
 assert.doesNotMatch(app,/if \(isPublicOrder\) return <PublicOrderPage/);
 assert.match(app,/if \(isPublicOrder\) return <div className="public-loading">Public ordering is temporarily unavailable/);
});
