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
