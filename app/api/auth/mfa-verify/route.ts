/**
 * @file /api/auth/mfa-verify — TOTP MFA verification endpoint
 *
 * @description
 * Verifies a user's TOTP code during the login MFA step (after credentials are validated).
 * On success, issues the full session cookie and returns user info.
 *
 * POST /api/auth/mfa-verify
 *   Body: { tempToken: string, code: string }
 *   - tempToken: short-lived JWT with purpose='mfa_verify' (obtained from /api/auth/login)
 *   - code: 6-digit TOTP code from user's authenticator app
 *   - 200: Sets ia_session cookie, returns { success: true, user }
 *   - 401: Invalid or expired tempToken, or invalid TOTP code
 *
 * @security TOTP verified with window=2 (±60 sec tolerance for clock skew).
 */
import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import { verifyJWT, setSessionCookie, TempTokenPayload, UserContext } from '@/lib/auth/session';
import { getUserById, getUserLocationIds, getDoctorById, getNurseById } from '@/lib/auth/turso';

export const dynamic = 'force-dynamic';

/**
 * Verifies a TOTP code for an existing MFA-enabled user and issues a session.
 * @param req - POST request with { tempToken, code } body
 * @returns Sets session cookie and returns { success: true, user } or error
 */
export async function POST(req: NextRequest) {
  try {
    const { tempToken, code } = await req.json();

    if (!tempToken || !code) {
      return NextResponse.json({ error: 'tempToken and code are required' }, { status: 400 });
    }

    const payload = await verifyJWT<TempTokenPayload>(tempToken);
    if (!payload || payload.purpose !== 'mfa_verify') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const user = await getUserById(payload.userId);
    if (!user || !user.mfaSecret) {
      return NextResponse.json({ error: 'User not found or MFA not configured' }, { status: 401 });
    }

    const valid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!valid) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 401 });
    }

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
  } catch (error) {
    console.error('[mfa-verify] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
