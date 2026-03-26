import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { verifyJWT, setSessionCookie, TempTokenPayload, UserContext } from '@/lib/auth/session';
import { getUserById, getUserLocationIds, setMfaSecret } from '@/lib/auth/turso';

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

    const userContext: UserContext = {
      userId: user.id,
      role: user.role,
      entityId: user.entityId,
      locationIds,
      name: user.name,
      email: user.email,
    };

    await setSessionCookie(userContext);

    return NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error('[mfa-setup POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
