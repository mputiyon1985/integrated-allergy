/**
 * @file /api/patients/[id]/vials — Patient vial management API
 *
 * @description
 * Manages the compounded vial set for a specific patient.
 *
 * GET  /api/patients/[id]/vials  — Returns all vials for the patient ordered by vial number (1-4).
 *                                  Response includes: vialNumber, dilutionRatio, colorCode,
 *                                  totalVolumeMl, glycerinPercent, expiresAt.
 *
 * POST /api/patients/[id]/vials  — Generates a new 4-vial AAAI dilution series for the patient
 *                                  using the `generateVials()` dilution engine.
 *                                  Returns the created vials with HTTP 201.
 */
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateVials } from '@/lib/clinical/dilution'
import { validateGlycerin } from '@/lib/clinical/safety'

type RouteParams = { params: Promise<{ id: string }> }


export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Returns all vials for a patient ordered by vial number (1–4), including linked doses.
 * @param _req - Incoming request (unused)
 * @param params.id - Patient UUID
 * @returns JSON array of Vial records with nested doses[], or 404/500
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const patient = await prisma.patient.findUnique({ where: { id, deletedAt: null } })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    const vials = await prisma.vial.findMany({
      where: { patientId: id, deletedAt: null },
      orderBy: { vialNumber: 'asc' },
      include: { doses: { orderBy: { weekNumber: 'asc' } } },
    })
    return NextResponse.json(vials)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch vials' }, { status: 500 })
  }
}

/**
 * Generates a new 4-vial AAAI dilution series for the patient using the clinical dilution engine.
 * Validates glycerin percentage before creating vials. Warns on proteolytic incompatibilities.
 * @param req - POST request. Body: { glycerinPercent?: number (default 10) }
 * @param params.id - Patient UUID
 * @returns JSON { vials[], warnings[] } with HTTP 201, or 400/404/500 on failure
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const patient = await prisma.patient.findUnique({ where: { id, deletedAt: null } })
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
