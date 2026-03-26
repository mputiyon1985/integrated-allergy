/**
 * @file /api/audit — Alias for /api/audit-log
 *
 * @description
 * Convenience alias route providing the same paginated audit log as /api/audit-log.
 * Exists for backward compatibility with earlier API consumers.
 *
 * GET /api/audit — See /api/audit-log for full parameter and response documentation.
 *   Query params: patientId, entity, limit, offset
 *   Response: { entries[], total, limit, offset }
 */
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'


export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get('patientId')
    const entity    = searchParams.get('entity')
    const limit     = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500)
    const offset    = parseInt(searchParams.get('offset') ?? '0', 10)

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(patientId && { patientId }),
        ...(entity    && { entity }),
      },
      orderBy: { createdAt: 'desc' },
      take:   limit,
      skip:   offset,
      include: { patient: { select: { name: true, patientId: true } } },
    })

    const total = await prisma.auditLog.count({
      where: {
        ...(patientId && { patientId }),
        ...(entity    && { entity }),
      },
    })

    return NextResponse.json({ logs, total, limit, offset })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
