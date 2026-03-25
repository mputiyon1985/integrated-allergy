import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateBuildupSchedule } from '@/lib/clinical/dilution'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const patient = await prisma.patient.findUnique({ where: { id } })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    const schedule = await prisma.dosingSchedule.findMany({
      where: { patientId: id },
      orderBy: [{ weekNumber: 'asc' }, { vialId: 'asc' }],
      include: { vial: true },
    })
    return NextResponse.json(schedule)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const patient = await prisma.patient.findUnique({ where: { id } })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const startWeek = typeof body.startWeek === 'number' ? body.startWeek : 1

    const vials = await prisma.vial.findMany({
      where: { patientId: id },
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
