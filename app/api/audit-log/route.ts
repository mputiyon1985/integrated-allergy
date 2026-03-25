import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');
    const entity    = searchParams.get('entity');
    const limit     = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500);
    const offset    = parseInt(searchParams.get('offset') ?? '0', 10);

    const where = {
      ...(patientId && { patientId }),
      ...(entity    && { entity }),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { patient: { select: { name: true, patientId: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const entries = logs.map((log) => ({
      id:        log.id,
      timestamp: log.createdAt.toISOString().replace('T', ' ').slice(0, 16),
      action:    log.action,
      entity:    log.entity,
      entityId:  log.entityId  ?? '—',
      user:      'System',
      details:   log.details   ?? '',
      patient:   log.patient   ?? null,
    }));

    return NextResponse.json({ entries, total, limit, offset });
  } catch {
    return NextResponse.json({ entries: [], total: 0, limit: 100, offset: 0 });
  }
}
