/**
 * @file /api/entities/[id] — Single business entity API
 *
 * @description
 * CRUD operations for an individual business entity record.
 *
 * GET    /api/entities/[id]  — Returns a single entity by ID
 * PUT    /api/entities/[id]  — Updates entity fields (name, ein, phone, email, website, logo, active)
 * DELETE /api/entities/[id]  — Soft-deletes and deactivates the entity
 *
 * @security Requires authenticated session (ia_session cookie via proxy.ts)
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * Returns a single business entity by ID.
 * @param req - Incoming request (session checked via ia_session cookie)
 * @param params.id - BusinessEntity UUID
 * @returns JSON { entity } or 401/404
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const entity = await prisma.businessEntity.findUnique({ where: { id } });
  if (!entity) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ entity });
}

/**
 * Updates a business entity's fields.
 * @param req - PUT request. Body (all optional): { name?, ein?, phone?, email?, website?, logo?, active? }
 * @param params.id - BusinessEntity UUID
 * @returns JSON { entity } or 401/500
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json() as {
      name?: string;
      ein?: string;
      phone?: string;
      email?: string;
      website?: string;
      logo?: string;
      active?: boolean;
    };

    const entity = await prisma.businessEntity.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.ein !== undefined && { ein: body.ein?.trim() || null }),
        ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
        ...(body.email !== undefined && { email: body.email?.trim() || null }),
        ...(body.website !== undefined && { website: body.website?.trim() || null }),
        ...(body.logo !== undefined && { logo: body.logo || null }),
        ...(body.active !== undefined && { active: body.active }),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'Entity Updated',
        entity: 'BusinessEntity',
        entityId: id,
        details: `Updated entity: ${entity.name}`,
      },
    });

    return NextResponse.json({ entity });
  } catch (err) {
    console.error('PUT /api/entities/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update entity' }, { status: 500 });
  }
}

/**
 * Soft-deletes a business entity (sets deletedAt and active: false).
 * @param req - Incoming request (session checked via ia_session cookie)
 * @param params.id - BusinessEntity UUID
 * @returns JSON { ok: true } or 401/500
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const entity = await prisma.businessEntity.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });

    await prisma.auditLog.create({
      data: {
        action: 'Entity Deleted',
        entity: 'BusinessEntity',
        entityId: id,
        details: `Soft-deleted entity: ${entity.name}`,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/entities/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete entity' }, { status: 500 });
  }
}
