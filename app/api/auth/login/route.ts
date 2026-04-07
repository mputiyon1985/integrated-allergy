/**
 * @file /api/auth/login — User authentication endpoint
 *
 * @description
 * Authenticates users with email/password and handles the MFA flow.
 * Includes an in-memory rate limiter (5 attempts per 15-minute window) to
 * prevent brute-force attacks. Rate limits reset on server restart.
 *
 * POST /api/auth/login
 *   Body: { email: string, password: string }
 *   Responses:
 *   - MFA disabled globally: Sets ia_session cookie, returns { success: true, user }
 *   - MFA required (already set up): Returns { requiresMfa: true, tempToken }
 *   - MFA setup needed: Returns { requiresMfaSetup: true, tempToken }
 *   - Invalid credentials: 401 { error }
 *   - Rate limited: 429 { error }
 *
 * @security Passwords are compared with bcrypt (cost factor 12).
 *           Same error message returned for unknown email vs wrong password (prevents user enumeration).
 */
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserByEmail, getUserLocationIds, getDoctorById, getNurseById, getSettings } from '@/lib/auth/turso';
import { signTempJWT, setSessionCookie, UserContext } from '@/lib/auth/session';
export { isStrongPassword } from '@/lib/auth/password';

export const dynamic = 'force-dynamic';

// ─── In-memory rate limiter (resets on server restart) ───────────────────────
const loginAttempts = (globalThis as any).__loginAttempts ??
  new Map<string, { count: number; resetAt: number }>();
(globalThis as any).__loginAttempts = loginAttempts;

/**
 * Handles user login with email/password credentials.
 * Enforces rate limiting, validates credentials, and initiates the MFA flow
 * or issues a session directly depending on global settings.
 * @param req - Incoming POST request with { email, password } body
 * @returns JSON response indicating success, MFA requirement, or error
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // ── Rate limit check ──────────────────────────────────────────────────────
    const key = email.toLowerCase().trim();
    const now = Date.now();
    const attempts = loginAttempts.get(key);
    if (attempts && attempts.count >= 5 && now < attempts.resetAt) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again in 15 minutes.' },
        { status: 429 }
      );
    }

    const user = await getUserByEmail(key);

    if (!user || !user.active) {
      // Increment attempt counter even for unknown emails (prevents enumeration via timing)
      const rec = loginAttempts.get(key) ?? { count: 0, resetAt: now + 15 * 60 * 1000 };
      if (now >= rec.resetAt) { rec.count = 0; rec.resetAt = now + 15 * 60 * 1000; }
      rec.count += 1;
      loginAttempts.set(key, rec);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      // Increment failed attempt counter
      const rec = loginAttempts.get(key) ?? { count: 0, resetAt: now + 15 * 60 * 1000 };
      if (now >= rec.resetAt) { rec.count = 0; rec.resetAt = now + 15 * 60 * 1000; }
      rec.count += 1;
      loginAttempts.set(key, rec);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // ── Success — clear rate-limit counter ────────────────────────────────────
    loginAttempts.delete(key);

    // Check if MFA is globally required
    let mfaRequired = true;
    try {
      const settings = await getSettings();
      mfaRequired = settings.mfa_required !== 'false'; // default true
    } catch {
      // If settings table missing, default to MFA required
      mfaRequired = true;
    }

    if (mfaRequired) {
      // MFA already set up — require verification
      if (user.mfaEnabled && user.mfaSecret) {
        const tempToken = await signTempJWT({ userId: user.id, purpose: 'mfa_verify' });
        return NextResponse.json({ requiresMfa: true, tempToken });
      }

      // MFA not set up yet — require setup
      const tempToken = await signTempJWT({ userId: user.id, purpose: 'mfa_setup' });
      return NextResponse.json({ requiresMfaSetup: true, tempToken });
    } else {
      // MFA disabled globally — skip MFA and issue full session directly
      const locationIds = await getUserLocationIds(user.id);

      let doctorName: string | null = null;
      let nurseTitle: string | null = null;
      if (user.doctorId) {
        const doctor = await getDoctorById(user.doctorId);
        if (doctor) doctorName = `${doctor.name}, ${doctor.title}`;
      }
      if (user.nurseId) {
        const nurse = await getNurseById(user.nurseId);
        if (nurse) nurseTitle = `${nurse.name}, ${nurse.title}`;
      }

      const userContext: UserContext = {
        userId: user.id,
        role: user.role,
        entityId: user.entityId,
        locationIds,
        name: user.name,
        email: user.email,
        doctorId: user.doctorId ?? null,
        nurseId: user.nurseId ?? null,
        doctorName,
        nurseTitle,
      };

      await setSessionCookie(userContext);
      return NextResponse.json({
        success: true,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    }
  } catch (error) {
    console.error('[login] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
