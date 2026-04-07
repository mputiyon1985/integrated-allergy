/**
 * @file /api/auth/change-password — Self-service password change
 *
 * @description
 * Allows an authenticated user to change their own password.
 * Validates current password, enforces minimum strength policy,
 * and writes an audit log entry on success.
 *
 * POST /api/auth/change-password
 *   Body: { currentPassword: string, newPassword: string }
 *   - 200: { success: true }
 *   - 400: { error } — missing fields or password too weak
 *   - 401: { error } — unauthenticated or wrong current password
 *   - 404: { error } — user account not found
 *
 * @security Requires authenticated session. New password hashed with bcrypt (cost 12).
 */
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/auth/session';
import { isStrongPassword } from '@/lib/auth/password';

export const dynamic = 'force-dynamic';

/**
 * Changes the authenticated user's password after verifying their current password.
 * @param req - POST request with { currentPassword, newPassword } body
 * @returns JSON { success: true } or error
 */
export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new passwords are required' }, { status: 400 });
    }

    // Validate new password strength
    const pwCheck = isStrongPassword(newPassword);
    if (!pwCheck.ok) {
      return NextResponse.json({ error: pwCheck.reason }, { status: 400 });
    }

    // Fetch current user from DB to get password hash
    const user = await prisma.appUser.findUnique({ where: { id: session.userId } });
    if (!user || !user.active) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    // Hash and update
    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.appUser.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'Password Changed',
        entity: 'AppUser',
        entityId: user.id,
        details: `User changed their own password: ${user.name} (${user.email})`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[change-password] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
