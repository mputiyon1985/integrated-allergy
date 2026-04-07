/**
 * @file /api/doctors/[id] — Single physician API
 *
 * @description
 * CRUD operations for an individual physician record.
 *
 * PATCH  /api/doctors/[id]  — Partial update of physician fields (name, title, specialty,
 *                             email, phone, clinicLocation, npi, active).
 *                             Logs to AuditLog on change.
 * DELETE /api/doctors/[id]  — Deactivates the physician (sets active: false) rather than
 *                             hard-deleting to preserve patient record integrity.
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';


export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Returns a single physician record by ID.
 * @param _req - Incoming request (unused)
 * @param params.id - Doctor UUID
 * @returns JSON { doctor } or 404
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doctor = await prisma.doctor.findUnique({ where: { id, deletedAt: null } });
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }
    return NextResponse.json({ doctor });
  } catch (err) {
    console.error('GET /api/doctors/[id] error:', err);
    return NextResponse.json({ error: 'Failed to fetch doctor' }, { status: 500 });
  }
}

/**
 * Updates physician fields. Only provided fields are changed.
 * @param req - PUT request. Body (all optional): { name?, title?, specialty?, email?, phone?, clinicLocation?, npi?, photoUrl?, active? }
 * @param params.id - Doctor UUID
 * @returns JSON { doctor } or 404/500
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as {
      name?: string;
      title?: string;
      specialty?: string;
      email?: string;
      phone?: string;
      clinicLocation?: string;
      npi?: string;
      photoUrl?: string;
      active?: boolean;
    };

    const existing = await prisma.doctor.findUnique({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    const doctor = await prisma.doctor.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.specialty !== undefined && { specialty: body.specialty }),
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
        action: 'Doctor Updated',
        entity: 'Doctor',
        entityId: id,
        details: `Doctor updated: ${doctor.title} ${doctor.name}`,
      },
    });

    return NextResponse.json({ doctor });
  } catch (err) {
    console.error('PUT /api/doctors/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update doctor' }, { status: 500 });
  }
}

/**
 * Soft-deletes a physician (sets deletedAt and active: false; data is retained).
 * @param _req - Incoming request (unused)
 * @param params.id - Doctor UUID
 * @returns JSON { success: true, doctor } or 404/500
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.doctor.findUnique({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    // Soft delete — set deletedAt timestamp and deactivate (data always retained)
    const doctor = await prisma.doctor.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });

    await prisma.auditLog.create({
      data: {
        action: 'Soft Delete',
        entity: 'Doctor',
        entityId: id,
        details: `Doctor soft-deleted (data retained): ${doctor.title} ${doctor.name}`,
      },
    });

    return NextResponse.json({ success: true, doctor });
  } catch (err) {
    console.error('DELETE /api/doctors/[id] error:', err);
    return NextResponse.json({ error: 'Failed to deactivate doctor' }, { status: 500 });
  }
}
