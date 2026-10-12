// Pure helpers only. Authorization must always be enforced by Supabase RLS/RPCs.
export const ADMIN_ONLY_MODULES = new Set(['company_management','store_management','user_access','user_matrix']);
export const MODULES = Object.freeze(['dashboard','order','orderHistory','inventory','recipe','config','production','company_management','store_management','user_access','user_matrix']);
export function canUseModule(profile, permissions, moduleId, mode = 'VIEW') {
  if (!profile?.is_active || !MODULES.includes(moduleId) || !['VIEW','EDIT'].includes(mode)) return false;
  if (profile.is_super_admin === true) return true; // UI convenience; never an auth decision
  if (ADMIN_ONLY_MODULES.has(moduleId)) return false;
  const level = permissions?.[moduleId] ?? 'NONE';
  return level === 'EDIT' || (mode === 'VIEW' && level === 'VIEW');
}
export function assignedStores(profile, stores, assignments) {
  if (!profile?.is_active) return [];
  const allowed = new Set((assignments ?? []).filter(a => a.user_id === profile.user_id && a.company_id === profile.company_id).map(a => a.store_id));
  return (stores ?? []).filter(s => s.is_active && (profile.is_super_admin === true || (s.company_id === profile.company_id && allowed.has(s.id))));
}
export function parseStoreOrderPath(pathname) {
  // New URLs are /order/store/STORECODE; legacy /order must not infer a destination.
  const m = /^\/order\/store\/([A-Za-z0-9_-]{1,48})\/?$/.exec(pathname ?? '');
  return m ? m[1] : null;
}
