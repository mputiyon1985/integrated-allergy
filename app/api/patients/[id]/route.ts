/**
 * @file /api/patients/[id] — Single patient API
 *
 * @description
 * CRUD operations for an individual patient record.
 *
 * GET    /api/patients/[id]  — Returns full patient detail including related doctor record.
 * PUT    /api/patients/[id]  — Full update of patient fields. Logs to AuditLog on change.
 * PATCH  /api/patients/[id]  — Partial update of patient fields. Logs to AuditLog on change.
 * DELETE /api/patients/[id]  — Removes patient record (use with caution; prefer deactivation).
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

type RouteParams = { params: Promise<{ id: string }> };


export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: { doctor: true },
    });
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

    // Build physician display string with title
    let physicianDisplay = patient.physician;
    if (patient.doctor) {
      physicianDisplay = `${patient.doctor.name}, ${patient.doctor.title}`;
    }

    return NextResponse.json({
      patient: {
        id: patient.id,
        patientId: patient.patientId,
        firstName: patient.name.split(', ')[1] ?? patient.name,
        lastName: patient.name.split(', ')[0] ?? '',
        name: patient.name,
        dob: patient.dob.toISOString().slice(0, 10),
        physician: physicianDisplay,
        physicianRaw: patient.physician,
        doctorId: patient.doctorId ?? '',
        clinicLocation: patient.clinicLocation,
        diagnosis: patient.diagnosis,
        startDate: patient.startDate.toISOString().slice(0, 10),
        status: 'Build-Up',
        phone: patient.phone ?? '',
        email: patient.email ?? '',
        insuranceId: patient.insuranceId ?? '',
        notes: patient.notes ?? '',
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
    const body = await req.json() as {
      name?: string;
      dob?: string;
      physician?: string;
      doctorId?: string;
      clinicLocation?: string;
      diagnosis?: string;
      startDate?: string;
      phone?: string;
      email?: string;
      insuranceId?: string;
      notes?: string;
    };

    // Build update data — only include provided fields
    const data: Record<string, unknown> = {};
    if (body.name !== undefined)           data.name           = body.name;
    if (body.physician !== undefined)      data.physician      = body.physician;
    if (body.doctorId !== undefined)       data.doctorId       = body.doctorId || null;
    if (body.clinicLocation !== undefined) data.clinicLocation = body.clinicLocation;
    if (body.diagnosis !== undefined)      data.diagnosis      = body.diagnosis;
    if (body.phone !== undefined)          data.phone          = body.phone || null;
    if (body.email !== undefined)          data.email          = body.email || null;
    if (body.insuranceId !== undefined)    data.insuranceId    = body.insuranceId || null;
    if (body.notes !== undefined)          data.notes          = body.notes || null;
    if (body.dob !== undefined)            data.dob            = new Date(body.dob);
    if (body.startDate !== undefined)      data.startDate      = new Date(body.startDate);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updated = await prisma.patient.update({
      where: { id },
      data,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        patientId: id,
        action: 'Patient Updated',
        entity: 'Patient',
        entityId: id,
        details: JSON.stringify({
          ...Object.fromEntries(
            Object.entries(body).filter(([, v]) => v !== undefined)
          ),
          updatedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({ id: updated.id, success: true });
  } catch (err) {
    console.error('PUT /api/patients/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update patient' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  // Delegate to PUT for consistency
  return PUT(req, { params });
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
