/**
 * @file /api/locations/[id] — Single clinic location API
 *
 * @description
 * CRUD operations for an individual clinic location record.
 *
 * GET    /api/locations/[id]  — Returns a single location by ID
 * PUT    /api/locations/[id]  — Updates name, address, phone, active, sortOrder, or entityId
 * DELETE /api/locations/[id]  — Soft-deletes and deactivates the location
 *
 * @security Requires authenticated session (ia_session cookie via proxy.ts)
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Returns a single clinic location by ID.
 * @param _req - Incoming request (unused)
 * @param params.id - ClinicLocation UUID
 * @returns JSON { location } or 404
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const location = await prisma.clinicLocation.findUnique({ where: { id } });
  if (!location) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ location });
}

/**
 * Updates a clinic location's fields.
 * @param req - PUT request. Body (all optional): { name?, address?, phone?, active?, sortOrder?, entityId? }
 * @param params.id - ClinicLocation UUID
 * @returns JSON { location } or error
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json() as {
      name?: string;
      address?: string;
      phone?: string;
      active?: boolean;
      sortOrder?: number;
      entityId?: string | null;
    };
    const location = await prisma.clinicLocation.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.address !== undefined && { address: body.address?.trim() || null }),
        ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
        ...(body.active !== undefined && { active: body.active }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.entityId !== undefined && { entityId: body.entityId || null }),
      },
    });
    await prisma.auditLog.create({
      data: { action: 'Location Updated', entity: 'ClinicLocation', entityId: id, details: `Updated: ${location.name}` },
    });
    return NextResponse.json({ location });
  } catch (err) {
    console.error('PUT /api/locations/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

/**
 * Soft-deletes a clinic location (sets deletedAt and active: false).
 * @param _req - Incoming request (unused)
 * @param params.id - ClinicLocation UUID
 * @returns JSON { ok: true } or error
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const location = await prisma.clinicLocation.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
    await prisma.auditLog.create({
      data: { action: 'Location Deleted', entity: 'ClinicLocation', entityId: id, details: `Soft-deleted: ${location.name}` },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/locations/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
