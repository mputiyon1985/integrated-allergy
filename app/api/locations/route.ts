/**
 * @file /api/locations — Clinic location management API
 *
 * @description
 * Manages clinic location records. Each location belongs to a business entity
 * and is used for patient assignment, user access scoping, and scheduling.
 *
 * GET  /api/locations  — Returns all non-deleted locations with their parent entity.
 *                        Query: ?active=true to return only active locations.
 *                        Query: ?entityId=<id> to filter by business entity.
 *
 * POST /api/locations  — Creates a new clinic location.
 *                        Required: name, entityId.
 *                        Optional: address, phone, sortOrder.
 *                        Returns the created location with HTTP 201.
 *
 * @security Requires authenticated session (ia_session cookie via proxy.ts)
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Lists clinic locations, optionally filtered by active status or entity.
 * @param req - Query params: active? (boolean string), entityId?
 * @returns JSON { locations[] } with 30-second CDN cache
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';
    const entityId = searchParams.get('entityId');

    const where: Record<string, unknown> = activeOnly
      ? { active: true, deletedAt: null }
      : { deletedAt: null };

    if (entityId) {
      where.entityId = entityId;
    }

    const locations = await prisma.clinicLocation.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        entity: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ locations }, {
      headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('GET /api/locations error:', err);
    return NextResponse.json({ locations: [] });
  }
}

/**
 * Creates a new clinic location within a business entity.
 * @param req - POST request. Body: { name: string, entityId: string, address?, phone?, sortOrder? }
 * @returns JSON { location } with HTTP 201, or 400/500 on failure
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      name: string;
      address?: string;
      phone?: string;
      sortOrder?: number;
      entityId?: string;
    };
    if (!body.entityId) {
      return NextResponse.json({ error: 'Entity is required — every location must belong to a business entity' }, { status: 400 });
    }
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const location = await prisma.clinicLocation.create({
      data: {
        name: body.name.trim(),
        address: body.address?.trim() || null,
        sortOrder: body.sortOrder ?? 0,
        ...(body.entityId && { entityId: body.entityId }),
      },
    });
    await prisma.auditLog.create({
      data: { action: 'Location Created', entity: 'ClinicLocation', entityId: location.id, details: `Added: ${location.name}` },
    });
    return NextResponse.json({ location }, { status: 201 });
  } catch (err) {
    console.error('POST /api/locations error:', err);
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
  }
}
