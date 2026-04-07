/**
 * @file /api/entities/[id]/locations — Entity location sub-collection API
 *
 * @description
 * Returns all active clinic locations belonging to a specific business entity.
 * Useful for populating entity-scoped location dropdowns in the admin UI.
 *
 * GET /api/entities/[id]/locations
 *   Returns locations ordered by sortOrder then name.
 *   Response: { locations[] }
 *
 * @security Requires authenticated session (ia_session cookie via proxy.ts)
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * Returns all active clinic locations for a given business entity.
 * @param req - Incoming request (session checked via ia_session cookie)
 * @param params.id - BusinessEntity UUID
 * @returns JSON { locations[] } or 401
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const locations = await prisma.clinicLocation.findMany({
      where: { entityId: id, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json({ locations });
  } catch (err) {
    console.error('GET /api/entities/[id]/locations error:', err);
    return NextResponse.json({ locations: [] });
  }
}
