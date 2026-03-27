import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserByEmail, getUserLocationIds, getDoctorById, getNurseById, getSettings } from '@/lib/auth/turso';
import { signTempJWT, setSessionCookie, UserContext } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

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
