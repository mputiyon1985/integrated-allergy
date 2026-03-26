/**
 * @file /api/nurses/[id] — Single nurse/staff API
 *
 * @description
 * CRUD operations for an individual nursing staff record.
 *
 * PATCH  /api/nurses/[id]  — Partial update of nurse fields (name, title, email,
 *                            phone, clinicLocation, npi, active).
 *                            Logs to AuditLog on change.
 * DELETE /api/nurses/[id]  — Deactivates the nurse (sets active: false) to preserve
 *                            referential integrity in clinical records.
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';


export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const nurse = await prisma.nurse.findUnique({ where: { id } });
    if (!nurse) {
      return NextResponse.json({ error: 'Nurse not found' }, { status: 404 });
    }
    return NextResponse.json({ nurse });
  } catch (err) {
    console.error('GET /api/nurses/[id] error:', err);
    return NextResponse.json({ error: 'Failed to fetch nurse' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as {
      name?: string;
      title?: string;
      email?: string;
      phone?: string;
      clinicLocation?: string;
      npi?: string;
      photoUrl?: string;
      active?: boolean;
    };

    const existing = await prisma.nurse.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Nurse not found' }, { status: 404 });
    }

    const nurse = await prisma.nurse.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.email !== undefined && { email: body.email?.trim() || null }),
        ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
        ...(body.clinicLocation !== undefined && { clinicLocation: body.clinicLocation?.trim() || null }),
        ...(body.npi !== undefined && { npi: body.npi?.trim() || null }),
        ...(body.photoUrl !== undefined && { photoUrl: body.photoUrl || null }),
        ...(body.active !== undefined && { active: body.active }),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'Nurse Updated',
        entity: 'Nurse',
        entityId: id,
        details: `Nurse updated: ${nurse.title} ${nurse.name}`,
      },
    });

    return NextResponse.json({ nurse });
  } catch (err) {
    console.error('PUT /api/nurses/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update nurse' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.nurse.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Nurse not found' }, { status: 404 });
    }

    // Soft delete — set active = false
    const nurse = await prisma.nurse.update({
      where: { id },
      data: { active: false },
    });

    await prisma.auditLog.create({
      data: {
        action: 'Nurse Deactivated',
        entity: 'Nurse',
        entityId: id,
        details: `Nurse deactivated: ${nurse.title} ${nurse.name}`,
      },
    });

    return NextResponse.json({ success: true, nurse });
  } catch (err) {
    console.error('DELETE /api/nurses/[id] error:', err);
    return NextResponse.json({ error: 'Failed to deactivate nurse' }, { status: 500 });
  }
}
