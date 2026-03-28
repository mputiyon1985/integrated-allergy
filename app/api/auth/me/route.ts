import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, getTokenAge } from '@/lib/auth/session';
import { getSettings } from '@/lib/auth/turso';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await verifySession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Session timeout enforcement ───────────────────────────────────────────
    try {
      const settings = await getSettings();
      const timeoutSetting = settings.session_timeout ?? 'never';
      if (timeoutSetting && timeoutSetting !== 'never' && timeoutSetting !== '0') {
        const timeoutMinutes = parseInt(timeoutSetting, 10);
        if (!isNaN(timeoutMinutes) && timeoutMinutes > 0) {
          // Read the raw cookie to get token age
          const cookieStore = await cookies();
          const token = cookieStore.get('ia_session')?.value;
          if (token) {
            const ageMinutes = getTokenAge(token);
            if (ageMinutes > timeoutMinutes) {
              return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
            }
          }
        }
      }
    } catch {
      // If settings unavailable, skip timeout check
    }

    return NextResponse.json({
      user: {
        id: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        entityId: user.entityId,
        locationIds: user.locationIds,
        doctorId: user.doctorId ?? null,
        nurseId: user.nurseId ?? null,
        doctorName: user.doctorName ?? null,
        nurseTitle: user.nurseTitle ?? null,
      },
    });
  } catch (error) {
    console.error('[me] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
