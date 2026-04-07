/**
 * @file lib/auth/password.ts — Password strength validation utilities
 *
 * @description
 * Shared password validation used during user creation and password changes.
 * Enforces the clinic's minimum password policy to prevent weak credentials.
 */

/**
 * Validates a password against the minimum security requirements.
 * Requirements: 8+ characters, at least one uppercase letter, at least one digit.
 *
 * @param pwd - The plaintext password to validate
 * @returns An object with `ok: true` if strong, or `ok: false` with a `reason` message
 *
 * @example
 * isStrongPassword('abc')        // { ok: false, reason: 'Password must be at least 8 characters' }
 * isStrongPassword('password1')  // { ok: false, reason: 'Must contain at least one uppercase letter' }
 * isStrongPassword('Password1')  // { ok: true }
 */
export function isStrongPassword(pwd: string): { ok: boolean; reason?: string } {
  if (pwd.length < 8) return { ok: false, reason: 'Password must be at least 8 characters' };
  if (!/[A-Z]/.test(pwd)) return { ok: false, reason: 'Must contain at least one uppercase letter' };
  if (!/[0-9]/.test(pwd)) return { ok: false, reason: 'Must contain at least one number' };
  return { ok: true };
}
