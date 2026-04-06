/**
 * Shared password utilities for the Integrated Allergy IMS.
 */

export function isStrongPassword(pwd: string): { ok: boolean; reason?: string } {
  if (pwd.length < 8) return { ok: false, reason: 'Password must be at least 8 characters' };
  if (!/[A-Z]/.test(pwd)) return { ok: false, reason: 'Must contain at least one uppercase letter' };
  if (!/[0-9]/.test(pwd)) return { ok: false, reason: 'Must contain at least one number' };
  return { ok: true };
}
