/**
 * @file lib/auth/password.ts — Password strength validation utilities
 *
 * @description
 * Shared password validation used during user creation and password changes.
 * Enforces HIPAA best-practice password policy to prevent weak credentials.
 */

/**
 * Validates a password against the minimum security requirements.
 * Requirements:
 *   - 10+ characters (HIPAA best practice; increased from 8)
 *   - At most 128 characters (protects against bcrypt 72-byte truncation attacks)
 *   - At least one uppercase letter
 *   - At least one digit
 *   - At least one special character
 *
 * @param pwd - The plaintext password to validate
 * @returns An object with `ok: true` if strong, or `ok: false` with a `reason` message
 *
 * @example
 * isStrongPassword('abc')           // { ok: false, reason: 'Password must be at least 10 characters' }
 * isStrongPassword('password1!')    // { ok: false, reason: 'Must contain at least one uppercase letter' }
 * isStrongPassword('Password1!')    // { ok: true }
 */
export function isStrongPassword(pwd: string): { ok: boolean; reason?: string } {
  if (pwd.length < 10) return { ok: false, reason: 'Password must be at least 10 characters' };
  if (pwd.length > 128) return { ok: false, reason: 'Password must be no more than 128 characters' };
  if (!/[A-Z]/.test(pwd)) return { ok: false, reason: 'Must contain at least one uppercase letter' };
  if (!/[0-9]/.test(pwd)) return { ok: false, reason: 'Must contain at least one number' };
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pwd)) return { ok: false, reason: 'Must contain at least one special character' };
  return { ok: true };
}
