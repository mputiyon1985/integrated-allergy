/**
 * @file /api/patients/[id]/schedule — Dosing schedule API
 *
 * @description
 * Manages the week-by-week immunotherapy dosing schedule for a patient.
 *
 * GET  /api/patients/[id]/schedule  — Returns all dose records for the patient, ordered by
 *                                     week number. Each record includes: weekNumber, doseMl,
 *                                     phase (buildup/maintenance), administered, administeredAt,
 *                                     reaction, notes, and linked vial details.
 *
 * POST /api/patients/[id]/schedule  — Generates a 10-week buildup schedule for a given vial
 *                                     using the AAAI `generateBuildupSchedule()` engine.
 *                                     Body: { vialId, vialNumber, startWeek? }
 *                                     Returns the created dose records with HTTP 201.
 */
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateBuildupSchedule } from '@/lib/clinical/dilution'
import { HIPAA_HEADERS } from '@/lib/hipaaHeaders'

type RouteParams = { params: Promise<{ id: string }> }


export const dynamic = 'force-dynamic';

/**
 * Returns all dosing schedule records for a patient, ordered by week number.
 * @param _req - Incoming request (unused)
 * @param params.id - Patient UUID
 * @returns JSON array of DosingSchedule records including linked Vial, or 404/500
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const patient = await prisma.patient.findUnique({ where: { id, deletedAt: null } })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    const schedule = await prisma.dosingSchedule.findMany({
      where: { patientId: id, deletedAt: null },
      orderBy: [{ weekNumber: 'asc' }, { vialId: 'asc' }],
      include: { vial: true },
    })
    return NextResponse.json(schedule, { headers: { ...HIPAA_HEADERS } })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 })
  }
}

/**
 * Generates buildup dosing schedules for all of the patient's vials using the AAAI clinical engine.
 * Each vial receives a 10-week schedule, offset sequentially (vial 2 starts at week 11, etc.).
 * @param req - POST request. Body: { startWeek?: number (default 1) }
 * @param params.id - Patient UUID
 * @returns JSON { schedule[] } with HTTP 201, or 400/500 on failure
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const patient = await prisma.patient.findUnique({ where: { id, deletedAt: null } })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const startWeek = typeof body.startWeek === 'number' ? body.startWeek : 1

    const vials = await prisma.vial.findMany({
      where: { patientId: id, deletedAt: null },
      orderBy: { vialNumber: 'asc' },
    })

    if (vials.length === 0) {
      return NextResponse.json(
        { error: 'No vials found. Generate vials first.' },
        { status: 400 },
      )
    }

    // Generate buildup schedule for each vial, offset weeks sequentially
    const allSchedules = vials.flatMap((vial, idx) =>
      generateBuildupSchedule(id, vial.id, vial.vialNumber, startWeek + idx * 10)
    )

    const created = await prisma.$transaction(
      allSchedules.map(s => prisma.dosingSchedule.create({ data: s }))
    )

    await prisma.auditLog.create({
      data: {
        patientId: id,
        action:    'CREATE',
        entity:    'DosingSchedule',
        entityId:  id,
        details:   `Generated ${created.length} dosing entries for patient ${patient.name}`,
      },
    })

    return NextResponse.json({ schedule: created }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to generate schedule' }, { status: 500 })
  }
}
