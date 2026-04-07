/**
 * @file /api/audit-log — System audit log API
 *
 * @description
 * Provides paginated, filterable access to the system-wide AuditLog for compliance,
 * clinical review, and accreditation purposes. Every create/update/delete action in
 * the system is automatically written to this log.
 *
 * GET /api/audit-log — Returns paginated audit log entries with patient context.
 *   Query params:
 *     patientId  — Filter to a specific patient's audit history
 *     entity     — Filter by entity type (Patient, Doctor, Nurse, Appointment, Vial, etc.)
 *     limit      — Number of records to return (default: 100, max: 500)
 *     offset     — Pagination offset (default: 0)
 *   Response: { entries[], total, limit, offset }
 *   Each entry: { id, timestamp, action, entity, entityId, user, details, patient }
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';


export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Returns paginated audit log entries, optionally filtered by patientId or entity type.
 * @param req - Query params: patientId?, entity?, limit? (max 500), offset?
 * @returns JSON { entries[], total, limit, offset }
 */
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
