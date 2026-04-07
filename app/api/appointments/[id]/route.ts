/**
 * @file /api/appointments/[id] — Single appointment API
 *
 * @description
 * Update and delete operations for individual appointment records.
 *
 * PATCH  /api/appointments/[id]  — Partial update of appointment fields.
 *   Accepts any subset of: type, title, startTime, endTime, provider, notes, status.
 *   Status transitions: scheduled → confirmed → completed / cancelled / no_show.
 *   Logs status changes to AuditLog.
 *
 * DELETE /api/appointments/[id]  — Permanently removes the appointment record.
 *   For clinical auditing, consider setting status: 'cancelled' instead of hard delete.
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

type RouteParams = { params: Promise<{ id: string }> };


export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Returns a single appointment with patient context.
 * @param _req - Incoming request (unused)
 * @param params.id - Appointment UUID
 * @returns JSON { appointment } or 404
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id, deletedAt: null },
      include: { patient: { select: { id: true, name: true, patientId: true } } },
    });
    if (!appt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ appointment: appt });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch appointment' }, { status: 500 });
  }
}

/**
 * Updates appointment fields and logs the change to AuditLog.
 * @param req - PUT request. Body (all optional): { type?, title?, startTime?, endTime?, provider?, notes?, status? }
 * @param params.id - Appointment UUID
 * @returns JSON { appointment } or error
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const body = await req.json() as {
      type?: string;
      title?: string;
      startTime?: string;
      endTime?: string;
      provider?: string;
      notes?: string;
      status?: string;
    };

    const appt = await prisma.appointment.update({
      where: { id },
      data: {
        ...(body.type      !== undefined && { type:      body.type }),
        ...(body.title     !== undefined && { title:     body.title }),
        ...(body.startTime !== undefined && { startTime: new Date(body.startTime) }),
        ...(body.endTime   !== undefined && { endTime:   new Date(body.endTime) }),
        ...(body.provider  !== undefined && { provider:  body.provider }),
        ...(body.notes     !== undefined && { notes:     body.notes }),
        ...(body.status    !== undefined && { status:    body.status }),
      },
      include: { patient: { select: { id: true, name: true, patientId: true } } },
    });

    await prisma.auditLog.create({
      data: {
        patientId: appt.patientId,
        action:    'Appointment Updated',
        entity:    'Appointment',
        entityId:  id,
        details:   `Status: ${appt.status} — ${appt.title}`,
      },
    });

    return NextResponse.json({ appointment: appt });
  } catch {
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
  }
}

/**
 * Soft-deletes an appointment (sets deletedAt; data is retained).
 * @param _req - Incoming request (unused)
 * @param params.id - Appointment UUID
 * @returns JSON { success: true } or 404/500
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const appt = await prisma.appointment.findUnique({ where: { id, deletedAt: null } });
    if (!appt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Soft delete — set deletedAt timestamp (data always retained)
    await prisma.appointment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        patientId: appt.patientId,
        action:    'Soft Delete',
        entity:    'Appointment',
        entityId:  id,
        details:   `Appointment soft-deleted (data retained): ${appt.title}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete appointment' }, { status: 500 });
  }
}
