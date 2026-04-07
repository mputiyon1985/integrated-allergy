/**
 * @file /api/users/[id]/locations — User location access API
 *
 * @description
 * Manages which clinic locations a specific user has access to.
 * PUT replaces the complete location access list atomically.
 *
 * GET /api/users/[id]/locations  — Returns the user's currently assigned clinic locations.
 * PUT /api/users/[id]/locations  — Replaces the user's location access with a new list.
 *                                  Body: { locationIds: string[] }
 *
 * @security Requires super_admin role (ia_session cookie via proxy.ts)
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * Returns the clinic locations the user currently has access to.
 * @param req - Incoming request. Must be authenticated as super_admin.
 * @param params.id - AppUser UUID
 * @returns JSON { locations: { id, name, address }[] } or 401/403/500
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const access = await prisma.userLocationAccess.findMany({
      where: { userId: id },
      include: { location: { select: { id: true, name: true, address: true } } },
    });

    return NextResponse.json({ locations: access.map((a) => a.location) });
  } catch (err) {
    console.error('GET /api/users/[id]/locations error:', err);
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}

/**
 * Replaces the user's clinic location access list atomically (delete-all then insert).
 * @param req - PUT request. Body: { locationIds: string[] }
 * @param params.id - AppUser UUID
 * @returns JSON { success: true } or 401/403/500
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await req.json() as { locationIds: string[] };

    await prisma.userLocationAccess.deleteMany({ where: { userId: id } });

    if (body.locationIds && body.locationIds.length > 0) {
      await prisma.userLocationAccess.createMany({
        data: body.locationIds.map((locationId) => ({ userId: id, locationId })),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PUT /api/users/[id]/locations error:', err);
    return NextResponse.json({ error: 'Failed to update locations' }, { status: 500 });
  }
}
