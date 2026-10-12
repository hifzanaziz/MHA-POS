// Staff session token helpers for trusted server-side use only.
// Requires a high-entropy STAFF_SESSION_SECRET configured as a server secret.
const encoder = new TextEncoder();
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
const fromB64 = (input: string) => Uint8Array.from(atob(input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - input.length % 4) % 4)), c => c.charCodeAt(0));
async function key(secret: string) {
  if (secret.length < 32) throw new Error('Session signing secret is not configured');
  return crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign','verify']);
}
export type StaffClaims = { staff_id:string; company_id:number; session_version:number; iat:number; exp:number };
export async function issueStaffToken(secret:string, claims:Omit<StaffClaims,'iat'|'exp'>, ttlSeconds=900):Promise<string> {
  const now=Math.floor(Date.now()/1000);
  const payload=b64(encoder.encode(JSON.stringify({...claims,iat:now,exp:now+ttlSeconds})));
  const signature=b64(new Uint8Array(await crypto.subtle.sign('HMAC',await key(secret),encoder.encode(payload))));
  return payload+'.'+signature;
}
export async function verifyStaffToken(secret:string, token:string):Promise<StaffClaims|null> {
  try {
    const parts=token.split('.');
    if(parts.length!==2 || parts[0].length>4096 || parts[1].length>256)return null;
    const valid=await crypto.subtle.verify('HMAC',await key(secret),fromB64(parts[1]),encoder.encode(parts[0]));
    if(!valid)return null;
    const value=JSON.parse(new TextDecoder().decode(fromB64(parts[0]))) as StaffClaims;
    const now=Math.floor(Date.now()/1000);
    if(!value || typeof value.staff_id!=='string' || !Number.isSafeInteger(value.company_id) || !Number.isSafeInteger(value.session_version) || !Number.isSafeInteger(value.iat) || !Number.isSafeInteger(value.exp) || value.iat>now+30 || value.exp<=now || value.exp>value.iat+900)return null;
    return value;
  } catch { return null; }
}
// Token validity alone never authorizes an operation: fetch current account,
// session_version, company, role, assigned stores and permissions on each request.
