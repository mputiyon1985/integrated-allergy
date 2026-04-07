/**
 * @file /api/export/audit-log — CSV export of the full audit trail
 *
 * @description
 * Exports the complete system audit log as a downloadable CSV file.
 * Intended for compliance reporting, accreditation audits, and record-keeping.
 *
 * GET /api/export/audit-log
 *   Returns a CSV file attachment with all audit log entries.
 *   Columns: ID, Action, Entity, Entity ID, Patient Name, Patient ID, Details, Timestamp
 *   File name: audit-log-YYYY-MM-DD.csv
 *
 * @security Should be restricted to entity_admin or super_admin in production.
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
 * Streams the full audit log as a CSV file download.
 * Logs the export action to the audit trail.
 * @returns CSV file response or 500 error JSON
 */
export async function GET(req: NextRequest) {
  try {
    // HIPAA: log audit-log export to audit trail
    await prisma.auditLog.create({
      data: {
        action: 'PHI Export',
        entity: 'Export',
        entityId: 'audit-log-csv',
        details: `Audit log exported by user ${req.headers.get('x-user-id') ?? 'unknown'}`,
      },
    });

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: { patient: { select: { name: true, patientId: true } } },
    });

    const headers = ['ID', 'Action', 'Entity', 'Entity ID', 'Patient Name', 'Patient ID', 'Details', 'Timestamp'];

    const rows = logs.map((l) => [
      l.id,
      l.action,
      l.entity,
      l.entityId ?? '',
      l.patient?.name ?? '',
      l.patient?.patientId ?? '',
      l.details ?? '',
      l.createdAt.toISOString(),
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map(escape).join(','))
      .join('\n');

    return new Response(csv, {
      headers: {
        ...HIPAA_HEADERS,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    console.error('Export audit log error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
