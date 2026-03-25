import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

type RouteParams = { params: Promise<{ id: string; doseId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id, doseId } = await params;
  try {
    const body = await req.json() as {
      administered?: boolean;
      reaction?: string;
      notes?: string;
    };

    const data: Record<string, unknown> = {};
    if (body.administered !== undefined) {
      data.administered = body.administered;
      data.administeredAt = body.administered ? new Date() : null;
    }
    if (body.reaction !== undefined) data.reaction = body.reaction;
    if (body.notes !== undefined) data.notes = body.notes;

    const dose = await prisma.dosingSchedule.update({
      where: { id: doseId },
      data,
    });

    await prisma.auditLog.create({
      data: {
        patientId: id,
        action: body.administered ? 'Dose Administered' : 'Dose Updated',
        entity: 'DosingSchedule',
        entityId: doseId,
        details: JSON.stringify({
          administered: dose.administered,
          reaction: dose.reaction ?? null,
          notes: dose.notes ?? null,
        }),
      },
    });

    return NextResponse.json({ dose });
  } catch (err) {
    console.error('PATCH /api/patients/[id]/schedule/[doseId] error:', err);
    return NextResponse.json({ error: 'Failed to update dose' }, { status: 500 });
  }
}
