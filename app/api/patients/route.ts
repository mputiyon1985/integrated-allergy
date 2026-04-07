/**
 * @file /api/patients — Patient roster API
 *
 * @description
 * Manages the core patient registry for the Integrated Allergy IMS.
 *
 * GET  /api/patients         — Returns enrolled patients with pagination (?page=&limit=, default limit 50).
 *                              Response shape includes derived `status` field (Build-Up).
 *
 * POST /api/patients         — Enrolls a new patient. Auto-generates a `patientId` (PA-XXXXXXXX)
 *                              via nanoid if not provided. Creates an AuditLog entry on success.
 *                              Required: `name` (or `firstName`+`lastName`), `dob`, `physician`.
 *                              Returns: `{ id, patientId, name, dob, physician, status }` with HTTP 201.
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { refreshDashboardStats } from '@/lib/refreshDashboardStats';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const skip = (page - 1) * limit;

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.patient.count({ where: { deletedAt: null } }),
    ]);

    // Normalize to the shape the UI expects
    const STATUS_DISPLAY: Record<string, string> = {
      'build-up': 'Build-Up',
      'maintenance': 'Maintenance',
      'complete': 'Complete',
      'inactive': 'Inactive',
    };
    const shaped = patients.map((p) => ({
      id: p.id,
      patientId: p.patientId,
      name: p.name,
      dob: p.dob.toISOString().slice(0, 10),
      physician: p.physician,
      clinicLocation: p.clinicLocation,
      diagnosis: p.diagnosis,
      startDate: p.startDate.toISOString().slice(0, 10),
      status: STATUS_DISPLAY[p.status] ?? 'Build-Up',
    }));
    return NextResponse.json({ patients: shaped, page, limit, total }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('GET /api/patients error:', err);
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      firstName?: string;
      lastName?: string;
      name?: string;
      dob: string;
      patientId?: string;
      physician: string;
      doctorId?: string;
      clinicLocation?: string;
      diagnosis?: string;
      startDate?: string;
      phone?: string;
      email?: string;
      insuranceId?: string;
      notes?: string;
    };

    const fullName =
      body.name ??
      `${body.lastName ?? ''}, ${body.firstName ?? ''}`.trim().replace(/^,\s*/, '');

    if (!fullName || !body.dob || !body.physician) {
      return NextResponse.json(
        { error: 'name, dob, and physician are required' },
        { status: 400 }
      );
    }

    // Auto-generate patientId via nanoid to avoid race conditions
    const patientId =
      body.patientId ||
      `PA-${nanoid(8).toUpperCase()}`;

    const patient = await prisma.patient.create({
      data: {
        name: fullName,
        dob: new Date(body.dob),
        patientId,
        physician: body.physician,
        clinicLocation: body.clinicLocation ?? '',
        diagnosis: body.diagnosis ?? '',
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        phone: body.phone ?? null,
        email: body.email ?? null,
        insuranceId: body.insuranceId ?? null,
        notes: body.notes ?? null,
        ...(body.doctorId ? { doctorId: body.doctorId } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        patientId: patient.id,
        action: 'Patient Created',
        entity: 'Patient',
        entityId: patient.id,
        details: `New patient enrolled: ${fullName}`,
      },
    });

    void refreshDashboardStats(); // fire-and-forget — update stats table in background
    return NextResponse.json(
      {
        id: patient.id,
        patientId: patient.patientId,
        name: patient.name,
        dob: patient.dob.toISOString().slice(0, 10),
        physician: patient.physician,
        status: 'Build-Up', // default for new patients
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/patients error:', err);
    return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 });
  }
}
