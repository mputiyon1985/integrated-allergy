import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateVials } from '@/lib/clinical/dilution'
import { validateGlycerin } from '@/lib/clinical/safety'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const patient = await prisma.patient.findUnique({ where: { id } })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    const vials = await prisma.vial.findMany({
      where: { patientId: id },
      orderBy: { vialNumber: 'asc' },
      include: { doses: { orderBy: { weekNumber: 'asc' } } },
    })
    return NextResponse.json(vials)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch vials' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const patient = await prisma.patient.findUnique({ where: { id } })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    // Optional body: override glycerinPercent
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const glycerinPercent = typeof body.glycerinPercent === 'number' ? body.glycerinPercent : 10

    const glycerinWarning = validateGlycerin(glycerinPercent)
    if (glycerinWarning?.level === 'error') {
      return NextResponse.json({ error: glycerinWarning.message }, { status: 400 })
    }

    const vialData = generateVials(id).map(v => ({ ...v, glycerinPercent }))
    const created = await prisma.$transaction(
      vialData.map(v => prisma.vial.create({ data: v }))
    )

    await prisma.auditLog.create({
      data: {
        patientId: id,
        action:    'CREATE',
        entity:    'Vial',
        entityId:  id,
        details:   `Generated ${created.length} vials for patient ${patient.name}`,
      },
    })

    return NextResponse.json({ vials: created, warnings: glycerinWarning ? [glycerinWarning] : [] }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to generate vials' }, { status: 500 })
  }
}
