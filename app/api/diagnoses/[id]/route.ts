/**
 * @file /api/diagnoses/[id] — Single diagnosis option API
 *
 * @description
 * CRUD operations for an individual diagnosis option record.
 *
 * GET    /api/diagnoses/[id]  — Returns a single diagnosis option
 * PUT    /api/diagnoses/[id]  — Updates name, icdCode, active, or sortOrder
 * DELETE /api/diagnoses/[id]  — Soft-deletes and deactivates the option
 *
 * @security Requires authenticated session (ia_session cookie via proxy.ts)
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Returns a single diagnosis option by ID.
 * @param _req - Incoming request (unused)
 * @param params.id - DiagnosisOption UUID
 * @returns JSON { diagnosis } or 404
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const diagnosis = await prisma.diagnosisOption.findUnique({ where: { id } });
  if (!diagnosis) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ diagnosis });
}

/**
 * Updates a diagnosis option's fields.
 * @param req - PUT request. Body (all optional): { name?, icdCode?, active?, sortOrder? }
 * @param params.id - DiagnosisOption UUID
 * @returns JSON { diagnosis } or error
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json() as { name?: string; icdCode?: string; active?: boolean; sortOrder?: number };
    const diagnosis = await prisma.diagnosisOption.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.icdCode !== undefined && { icdCode: body.icdCode?.trim() || null }),
        ...(body.active !== undefined && { active: body.active }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });
    await prisma.auditLog.create({
      data: { action: 'Diagnosis Updated', entity: 'DiagnosisOption', entityId: id, details: `Updated: ${diagnosis.name}` },
    });
    return NextResponse.json({ diagnosis });
  } catch (err) {
    console.error('PUT /api/diagnoses/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

/**
 * Soft-deletes a diagnosis option (sets deletedAt and active: false).
 * @param _req - Incoming request (unused)
 * @param params.id - DiagnosisOption UUID
 * @returns JSON { ok: true } or error
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const diagnosis = await prisma.diagnosisOption.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
    await prisma.auditLog.create({
      data: { action: 'Diagnosis Deleted', entity: 'DiagnosisOption', entityId: id, details: `Soft-deleted: ${diagnosis.name}` },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/diagnoses/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
