import test from 'node:test';
import assert from 'node:assert/strict';
import {canUseModule, assignedStores, parseStoreOrderPath} from './storeContextUtils.js';
const user={user_id:'u1',company_id:1,is_active:true,is_super_admin:false};
test('role matrix is deny by default and separates view/edit',()=>{
 assert.equal(canUseModule(user,{},'order'),false);
 assert.equal(canUseModule(user,{order:'VIEW'},'order'),true);
 assert.equal(canUseModule(user,{order:'VIEW'},'order','EDIT'),false);
 assert.equal(canUseModule(user,{order:'EDIT'},'order','EDIT'),true);
 assert.equal(canUseModule(user,{user_access:'EDIT'},'user_access'),false);
 assert.equal(canUseModule({...user,is_active:false},{order:'EDIT'},'order'),false);
});
test('assigned stores never leak from another company',()=>{
 const stores=[{id:1,company_id:1,is_active:true},{id:2,company_id:2,is_active:true},{id:3,company_id:1,is_active:false}];
 const assignments=[{user_id:'u1',company_id:1,store_id:1},{user_id:'u1',company_id:2,store_id:2},{user_id:'u1',company_id:1,store_id:3}];
 assert.deepEqual(assignedStores(user,stores,assignments).map(s=>s.id),[1]);
});
test('public ordering route requires an explicit store',()=>{
 assert.equal(parseStoreOrderPath('/order/store/STORE001'),'STORE001');
 assert.equal(parseStoreOrderPath('/order'),null);
 assert.equal(parseStoreOrderPath('/order/store/../secret'),null);
});
