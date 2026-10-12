import test from 'node:test';
import assert from 'node:assert/strict';
import { accessLevel, availableStores, selectDefaultStore, requireSelectedStore } from './tenantAccess.js';

const staff = { is_super_admin:false, default_store_id:2, stores:[{id:1,company_id:1},{id:2,company_id:1}], permissions:{dashboard:'VIEW',order:'EDIT',inventory:'NONE'} };
test('staff cannot access super-admin modules',()=>assert.equal(accessLevel(staff,'user_matrix'),'NONE'));
test('VIEW permission cannot edit',()=>assert.throws(()=>requireSelectedStore(staff,2,'dashboard','EDIT')));
test('assigned store is required',()=>assert.throws(()=>requireSelectedStore(staff,3,'order','EDIT')));
test('staff can edit assigned store order',()=>assert.equal(requireSelectedStore(staff,2,'order','EDIT').id,2));
test('default store belongs to assigned stores',()=>assert.equal(selectDefaultStore(staff).id,2));
test('missing context denies everything',()=>assert.equal(accessLevel(null,'order'),'NONE'));
test('super admin module enabled only for pinned server context',()=>assert.equal(accessLevel({...staff,is_super_admin:true},'user_matrix'),'EDIT'));
test('invalid store entries excluded',()=>assert.equal(availableStores({stores:[{id:'invalid'},{id:4}]}).length,1));
