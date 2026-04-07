/**
 * @file /api/export/patients — CSV export of the patient roster
 *
 * @description
 * Exports the complete patient list as a downloadable CSV for reporting,
 * billing, or integration with external EMR/EHR systems.
 *
 * GET /api/export/patients
 *   Returns a CSV file attachment with all active (non-deleted) patients.
 *   Columns: ID, Name, Date of Birth, Patient ID, Physician, Clinic Location,
 *            Diagnosis, Start Date, Phone, Email, Insurance ID, Created At
 *   File name: patients-YYYY-MM-DD.csv
 *
 * @security Contains PHI. Restricted to authorized clinical staff.
 *           All exports are logged to the audit trail (HIPAA).
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { HIPAA_HEADERS } from '@/lib/hipaaHeaders';

export const dynamic = 'force-dynamic';

/** CSV-escapes a value by wrapping in double quotes and escaping internal quotes. */
function escape(v: unknown) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

/**
 * Exports the full patient roster as a CSV download.
 * Logs the export action to the audit trail.
 * @returns CSV file response or 500 error JSON
 */
export async function GET(req: NextRequest) {
  try {
    // HIPAA: log PHI export to audit trail
    await prisma.auditLog.create({
      data: {
        action: 'PHI Export',
        entity: 'Export',
        entityId: 'patients-csv',
        details: `Patient data exported by user ${req.headers.get('x-user-id') ?? 'unknown'}`,
      },
    });

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
        ...HIPAA_HEADERS,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="patients-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    console.error('Export patients error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
