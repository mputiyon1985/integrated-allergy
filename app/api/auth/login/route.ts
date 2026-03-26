import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserByEmail, getUserLocationIds } from '@/lib/auth/turso';
import { signTempJWT, setSessionCookie, UserContext } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await getUserByEmail(email.toLowerCase().trim());

    if (!user || !user.active) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const locationIds = await getUserLocationIds(user.id);

    // MFA already set up — require verification
    if (user.mfaEnabled && user.mfaSecret) {
      const tempToken = await signTempJWT({ userId: user.id, purpose: 'mfa_verify' });
      return NextResponse.json({ requiresMfa: true, tempToken });
    }

    // MFA not set up yet — require setup
    const tempToken = await signTempJWT({ userId: user.id, purpose: 'mfa_setup' });
    return NextResponse.json({ requiresMfaSetup: true, tempToken });

  } catch (error) {
    console.error('[login] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
