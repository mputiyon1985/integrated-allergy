/**
 * GET  /api/entities — List all business entities (active + non-deleted)
 * POST /api/entities — Create a new business entity
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
