/**
 * @file /api/auth/logout — Session termination endpoint
 *
 * POST /api/auth/logout — Clears the ia_session cookie, logging the user out.
 * Returns { success: true }. Always succeeds even if no session exists.
 */
import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * Clears the session cookie to log out the current user.
 * @returns JSON { success: true }
 */
export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
