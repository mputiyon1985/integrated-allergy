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

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: { select: { id: true, name: true, patientId: true } } },
    });
    if (!appt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ appointment: appt });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch appointment' }, { status: 500 });
  }
}

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

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const appt = await prisma.appointment.findUnique({ where: { id } });
    if (!appt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.appointment.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        patientId: appt.patientId,
        action:    'Appointment Deleted',
        entity:    'Appointment',
        entityId:  id,
        details:   `Deleted: ${appt.title}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete appointment' }, { status: 500 });
  }
}
