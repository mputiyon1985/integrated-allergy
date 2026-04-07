/**
 * @file /api/doctor-titles/[id] — Single doctor title API
 *
 * @description
 * Update and soft-delete operations for an individual physician title record.
 *
 * PUT    /api/doctor-titles/[id]  — Updates name, active, or sortOrder
 * DELETE /api/doctor-titles/[id]  — Soft-deletes and deactivates the title
 *
 * @security Requires authenticated session (ia_session cookie via proxy.ts)
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Updates a doctor title's fields.
 * @param req - PUT request. Body (all optional): { name?, active?, sortOrder? }
 * @param params.id - DoctorTitle UUID
 * @returns JSON { title } or error
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json() as { name?: string; active?: boolean; sortOrder?: number };
    const title = await prisma.doctorTitle.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.active !== undefined && { active: body.active }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });
    await prisma.auditLog.create({
      data: { action: 'DoctorTitle Updated', entity: 'DoctorTitle', entityId: id, details: `Updated: ${title.name}` },
    });
    return NextResponse.json({ title });
  } catch (err) {
    console.error('PUT /api/doctor-titles/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

/**
 * Soft-deletes a doctor title (sets deletedAt and active: false).
 * @param _req - Incoming request (unused)
 * @param params.id - DoctorTitle UUID
 * @returns JSON { ok: true } or error
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const title = await prisma.doctorTitle.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
    await prisma.auditLog.create({
      data: { action: 'DoctorTitle Deleted', entity: 'DoctorTitle', entityId: id, details: `Soft-deleted: ${title.name}` },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/doctor-titles/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
