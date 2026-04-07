/**
 * @file /api/auth/mfa-setup — TOTP MFA enrollment endpoint
 *
 * @description
 * Handles two-step MFA setup for users who don't yet have TOTP configured.
 * Uses speakeasy for TOTP generation/verification and qrcode for QR rendering.
 *
 * GET /api/auth/mfa-setup?token=<tempToken>
 *   Generates a new TOTP secret and QR code for the user to scan.
 *   Requires a valid temp JWT with purpose='mfa_setup'.
 *   Returns: { secret: string, qrCode: string (data URL), otpauthUrl: string }
 *
 * POST /api/auth/mfa-setup
 *   Body: { tempToken, secret, code }
 *   Verifies the first TOTP code to confirm the user scanned correctly.
 *   On success: saves the secret, enables MFA, and issues the full session cookie.
 *   Returns: { success: true, user }
 *
 * @security Requires valid temp JWT (30m window). TOTP verified with window=1 (±30 sec).
 */
import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { verifyJWT, setSessionCookie, TempTokenPayload, UserContext } from '@/lib/auth/session';
import { getUserById, getUserLocationIds, setMfaSecret, getDoctorById, getNurseById } from '@/lib/auth/turso';

export const dynamic = 'force-dynamic';

// GET /api/auth/mfa-setup — generate TOTP secret + QR code
export async function GET(req: NextRequest) {
  try {
    const tempToken = req.headers.get('x-temp-token') || req.nextUrl.searchParams.get('token');

    if (!tempToken) {
      return NextResponse.json({ error: 'Temp token required' }, { status: 401 });
    }

    const payload = await verifyJWT<TempTokenPayload>(tempToken);
    if (!payload || payload.purpose !== 'mfa_setup') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const user = await getUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const secret = speakeasy.generateSecret({
      name: `Integrated Allergy (${user.email})`,
      issuer: 'Integrated Allergy IMS',
      length: 32,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return NextResponse.json({
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
      otpauthUrl: secret.otpauth_url,
    });
  } catch (error) {
    console.error('[mfa-setup GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/auth/mfa-setup — verify first TOTP code and activate MFA
export async function POST(req: NextRequest) {
  try {
    const { tempToken, secret, code } = await req.json();

    if (!tempToken || !secret || !code) {
      return NextResponse.json({ error: 'tempToken, secret, and code are required' }, { status: 400 });
    }

    const payload = await verifyJWT<TempTokenPayload>(tempToken);
    if (!payload || payload.purpose !== 'mfa_setup') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const valid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!valid) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 401 });
    }

    // Save MFA secret and enable MFA
    await setMfaSecret(payload.userId, secret);

    const user = await getUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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

    return NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error('[mfa-setup POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
