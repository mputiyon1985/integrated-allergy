import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

function escape(v: unknown) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

export async function GET() {
  try {
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
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    console.error('Export audit log error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
