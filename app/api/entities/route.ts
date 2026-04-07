/**
 * @file /api/entities — Business entity management API
 *
 * @description
 * Manages the top-level business entity hierarchy (e.g., the parent company or clinic group).
 * Each entity can have multiple locations. Used for multi-tenant configuration.
 *
 * GET  /api/entities  — Returns all non-deleted entities with their location count.
 * POST /api/entities  — Creates a new business entity.
 *                       Required: name. Optional: ein, phone, email, website, logo.
 *                       Returns the created entity with HTTP 201.
 *
 * @security Requires authenticated session (ia_session cookie via proxy.ts)
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Returns all non-deleted business entities with their active location count.
 * @param req - Incoming request (session checked via ia_session cookie)
 * @returns JSON { entities[] } or 401
 */
export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const entities = await prisma.businessEntity.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { locations: { where: { deletedAt: null } } } },
      },
    });

    return NextResponse.json({ entities });
  } catch (err) {
    console.error('GET /api/entities error:', err);
    return NextResponse.json({ entities: [] });
  }
}

/**
 * Creates a new business entity.
 * @param req - POST request. Body: { name: string, ein?, phone?, email?, website?, logo? }
 * @returns JSON { entity } with HTTP 201, or 400/401/500 on failure
 */
export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json() as {
      name: string;
      ein?: string;
      phone?: string;
      email?: string;
      website?: string;
      logo?: string;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const entity = await prisma.businessEntity.create({
      data: {
        name: body.name.trim(),
        ein: body.ein?.trim() || null,
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        website: body.website?.trim() || null,
        logo: body.logo || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'Entity Created',
        entity: 'BusinessEntity',
        entityId: entity.id,
        details: `Created entity: ${entity.name}`,
      },
    });

    return NextResponse.json({ entity }, { status: 201 });
  } catch (err) {
    console.error('POST /api/entities error:', err);
    return NextResponse.json({ error: 'Failed to create entity' }, { status: 500 });
  }
}
