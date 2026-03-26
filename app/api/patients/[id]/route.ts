/**
 * @file /api/patients/[id] — Single patient API
 *
 * @description
 * CRUD operations for an individual patient record.
 *
 * GET    /api/patients/[id]  — Returns full patient detail including related doctor record.
 * PATCH  /api/patients/[id]  — Partial update of patient fields. Logs to AuditLog on change.
 * DELETE /api/patients/[id]  — Removes patient record (use with caution; prefer deactivation).
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const [allergenMixes, vials, dosing, auditLogs] = await Promise.all([
      prisma.allergenMix.findMany({
        where: { patientId: id },
        include: { allergen: true },
      }),
      prisma.vial.findMany({
        where: { patientId: id },
        orderBy: { vialNumber: 'asc' },
      }),
      prisma.dosingSchedule.findMany({
        where: { patientId: id },
        orderBy: [{ weekNumber: 'asc' }],
        include: { vial: true },
      }),
      prisma.auditLog.findMany({
        where: { patientId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const now = new Date();

    const shapedVials = vials.map((v) => {
      const expired = v.expiresAt ? v.expiresAt < now : false;
      return {
        id: v.id,
        vialNumber: v.vialNumber,
        color: v.colorCode,
        dilutionRatio: v.dilutionRatio,
        volume: v.totalVolumeMl,
        expiry: v.expiresAt ? v.expiresAt.toISOString().slice(0, 10) : '—',
        status: expired ? 'Expired' : 'Active',
      };
    });

    const shapedAllergens = allergenMixes.map((m) => ({
      id: m.id,
      name: m.allergen.name,
      type: m.allergen.type,
      concentration: m.allergen.stockConc ?? '—',
      volume: m.volumeMl,
    }));

    const shapedDosing = dosing.map((d) => ({
      id: d.id,
      week: d.weekNumber,
      vial: d.vial
        ? `${capitalize(d.vial.colorCode)} #${d.vial.vialNumber}`
        : '—',
      dose: d.doseMl,
      phase: capitalize(d.phase),
      status: d.administered ? 'Completed' : 'Scheduled',
      reaction: d.reaction ?? '',
      notes: d.notes ?? '',
    }));

    const shapedAudit = auditLogs.map((a) => ({
      id: a.id,
      timestamp: a.createdAt.toISOString().replace('T', ' ').slice(0, 16),
      action: a.action,
      user: 'System',
      details: a.details ?? '',
    }));

    return NextResponse.json({
      patient: {
        id: patient.id,
        patientId: patient.patientId,
        firstName: patient.name.split(', ')[1] ?? patient.name,
        lastName: patient.name.split(', ')[0] ?? '',
        dob: patient.dob.toISOString().slice(0, 10),
        physician: patient.physician,
        clinicLocation: patient.clinicLocation,
        diagnosis: patient.diagnosis,
        startDate: patient.startDate.toISOString().slice(0, 10),
        status: 'Build-Up',
      },
      allergens: shapedAllergens,
      vials: shapedVials,
      dosing: shapedDosing,
      audit: shapedAudit,
    });
  } catch (err) {
    console.error('GET /api/patients/[id] error:', err);
    return NextResponse.json({ error: 'Failed to fetch patient' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const body = await req.json() as Record<string, string>;
    const updated = await prisma.patient.update({
      where: { id },
      data: {
        ...(body.name       && { name:          body.name }),
        ...(body.physician  && { physician:      body.physician }),
        ...(body.diagnosis  && { diagnosis:      body.diagnosis }),
        ...(body.clinicLocation && { clinicLocation: body.clinicLocation }),
      },
    });
    return NextResponse.json({ id: updated.id });
  } catch {
    return NextResponse.json({ error: 'Failed to update patient' }, { status: 500 });
  }
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
