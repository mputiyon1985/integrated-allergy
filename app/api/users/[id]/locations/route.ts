/**
 * GET /api/users/[id]/locations  — Get user location access
 * PUT /api/users/[id]/locations  — Replace user location access
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

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
