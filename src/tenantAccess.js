export const STAFF_MODULES = ['dashboard','order','orderHistory','inventory','recipe','config','production'];
export const SUPER_ADMIN_MODULES = ['company_management','store_management','user_access','user_matrix'];

export function accessLevel(context, moduleId) {
  if (!context || ![...STAFF_MODULES,...SUPER_ADMIN_MODULES].includes(moduleId)) return 'NONE';
  if (context.is_super_admin === true) return 'EDIT';
  if (SUPER_ADMIN_MODULES.includes(moduleId)) return 'NONE';
  return context.permissions?.[moduleId] === 'EDIT' ? 'EDIT' :
    context.permissions?.[moduleId] === 'VIEW' ? 'VIEW' : 'NONE';
}
export function availableStores(context) {
  return Array.isArray(context?.stores) ? context.stores.filter(s => Number.isSafeInteger(Number(s.id))) : [];
}
export function selectDefaultStore(context) {
  const stores = availableStores(context);
  return stores.find(s => s.id === context.default_store_id) || stores[0] || null;
}
export function requireSelectedStore(context, storeId, moduleId, mode = 'VIEW') {
  const store = availableStores(context).find(s => String(s.id) === String(storeId));
  const level = accessLevel(context,moduleId);
  if (!store || level === 'NONE' || (mode === 'EDIT' && level !== 'EDIT')) {
    throw new Error('You are not authorized for this store or operation.');
  }
  return store;
}
// UI checks are not security boundaries: every mutation must use server-side authorization.
