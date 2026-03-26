/**
 * GET    /api/locations/[id]  — Get one location
 * PUT    /api/locations/[id]  — Update (name, address, phone, active, sortOrder, entityId)
 * DELETE /api/locations/[id]  — Soft delete
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const location = await prisma.clinicLocation.findUnique({ where: { id } });
  if (!location) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ location });
}

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
