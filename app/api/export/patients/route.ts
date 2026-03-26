import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

function escape(v: unknown) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

export async function GET() {
  try {
    const patients = await prisma.patient.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });

    const headers = [
      'ID', 'Name', 'Date of Birth', 'Patient ID', 'Physician',
      'Clinic Location', 'Diagnosis', 'Start Date', 'Phone', 'Email', 'Insurance ID', 'Created At',
    ];

    const rows = patients.map((p) => [
      p.id,
      p.name,
      p.dob.toISOString().slice(0, 10),
      p.patientId,
      p.physician,
      p.clinicLocation,
      p.diagnosis,
      p.startDate.toISOString().slice(0, 10),
      p.phone ?? '',
      p.email ?? '',
      p.insuranceId ?? '',
      p.createdAt.toISOString().slice(0, 10),
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map(escape).join(','))
      .join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="patients-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    console.error('Export patients error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
