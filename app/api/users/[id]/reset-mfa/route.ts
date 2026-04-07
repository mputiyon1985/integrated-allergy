/**
 * @file /api/users/[id]/reset-mfa — Admin MFA reset endpoint
 *
 * @description
 * Allows a super_admin to reset another user's TOTP MFA enrollment.
 * After reset, the user will be required to set up MFA again on their next login.
 *
 * POST /api/users/[id]/reset-mfa
 *   Clears mfaSecret and sets mfaEnabled=false for the specified user.
 *   Writes an audit log entry for the reset event.
 *   Returns: { ok: true }
 *
 * @security Requires super_admin role (ia_session cookie via proxy.ts)
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * Resets a user's MFA enrollment so they must re-enroll on next login.
 * @param req - Incoming POST request. Must be authenticated as super_admin.
 * @param params.id - AppUser UUID of the target user
 * @returns JSON { ok: true } or 401/403/500
 */
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
