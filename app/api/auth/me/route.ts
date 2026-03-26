import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';

export async function GET() {
  try {
    const user = await verifySession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        entityId: user.entityId,
        locationIds: user.locationIds,
      },
    });
  } catch (error) {
    console.error('[me] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
