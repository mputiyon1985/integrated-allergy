/**
 * POST /api/users/[id]/reset-mfa
 * Resets MFA for a user — clears mfaSecret and mfaEnabled.
 * Super admin only. Writes audit log.
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    await prisma.$executeRaw`UPDATE AppUser SET mfaSecret=NULL, mfaEnabled=0 WHERE id=${id}`;

    await prisma.auditLog.create({
      data: {
        action: 'MFA Reset',
        entity: 'AppUser',
        entityId: id,
        details: `MFA reset by admin — user will re-enroll on next login`,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/users/[id]/reset-mfa error:', err);
    return NextResponse.json({ error: 'Failed to reset MFA' }, { status: 500 });
  }
}
