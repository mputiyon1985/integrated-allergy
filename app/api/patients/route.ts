import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' },
    });
    // Normalize to the shape the UI expects
    const shaped = patients.map((p) => ({
      id: p.id,
      patientId: p.patientId,
      name: p.name,
      dob: p.dob.toISOString().slice(0, 10),
      physician: p.physician,
      clinicLocation: p.clinicLocation,
      diagnosis: p.diagnosis,
      startDate: p.startDate.toISOString().slice(0, 10),
      // Derive status from createdAt for now — real status would be its own field
      status: 'Build-Up',
    }));
    return NextResponse.json({ patients: shaped });
  } catch {
    return NextResponse.json({ patients: [] });
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

    // Auto-generate patientId if not provided
    const count = await prisma.patient.count().catch(() => 0);
    const patientId =
      body.patientId ||
      `PA-${String(count + 1).padStart(3, '0')}-${Date.now().toString(36).toUpperCase()}`;

    const patient = await prisma.patient.create({
      data: {
        name: fullName,
        dob: new Date(body.dob),
        patientId,
        physician: body.physician,
        clinicLocation: body.clinicLocation ?? '',
        diagnosis: body.diagnosis ?? '',
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
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

    return NextResponse.json(
      {
        id: patient.id,
        patientId: patient.patientId,
        name: patient.name,
        dob: patient.dob.toISOString().slice(0, 10),
        physician: patient.physician,
        status: 'Build-Up',
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/patients error:', err);
    // Fallback for demo without DB
    const id = `demo-${Date.now()}`;
    return NextResponse.json({ id, patientId: 'PA-NEW' }, { status: 201 });
  }
}
