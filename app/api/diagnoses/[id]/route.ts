/**
 * GET    /api/diagnoses/[id]  — Get one diagnosis
 * PUT    /api/diagnoses/[id]  — Update
 * DELETE /api/diagnoses/[id]  — Soft delete
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const diagnosis = await prisma.diagnosisOption.findUnique({ where: { id } });
  if (!diagnosis) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ diagnosis });
}

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
