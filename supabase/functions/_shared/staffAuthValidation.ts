// Staff login is intentionally not exposed until the trusted API and rate limiting are ready.
// This module defines credential-validation helpers for the future Edge Function.
export function normalizeUsername(input: unknown): string {
  if (typeof input !== 'string') throw new Error('Invalid username');
  const value = input.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,80}$/.test(value)) throw new Error('Invalid username');
  return value;
}

export function isValidPasswordInput(input: unknown): input is string {
  return typeof input === 'string' && input.length >= 8 && input.length <= 1024;
}

// All password verification must run on a trusted server.
// Do not put service-role keys, password hashes or staff signing keys in the browser.
// Use a memory-hard password KDF (Argon2id preferred) and constant-time verifier.
// Always validate current account status, company, role and store on every operation.
