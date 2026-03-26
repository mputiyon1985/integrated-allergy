/**
 * @file /api/patients/[id]/allergens — Patient allergen mix API
 *
 * @description
 * Manages the allergen mix formulation for a specific patient.
 *
 * GET  /api/patients/[id]/allergens  — Returns the patient's current allergen mix
 *                                      with full allergen details and per-allergen volumes (mL).
 *
 * POST /api/patients/[id]/allergens  — Replaces the patient's allergen mix entirely.
 *                                      Accepts an array of { allergenId, volumeMl } objects.
 *                                      Deletes existing mix entries before creating new ones.
 *                                      Logs the update to AuditLog.
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

type RouteParams = { params: Promise<{ id: string }> };


export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const mixes = await prisma.allergenMix.findMany({
      where: { patientId: id },
      include: { allergen: true },
    });
    const allergens = mixes.map((m) => ({
      id: m.id,
      name: m.allergen.name,
      type: m.allergen.type,
      concentration: m.allergen.stockConc ?? '—',
      volume: m.volumeMl,
    }));
    return NextResponse.json({ allergens });
  } catch (err) {
    console.error('GET /api/patients/[id]/allergens error:', err);
    return NextResponse.json({ error: 'Failed to fetch allergens' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const body = await req.json() as {
      allergenId?: string;
      name?: string;
      type?: string;
      concentration?: string;
      volumeMl?: number;
    };

    const volumeMl = body.volumeMl ?? 1.0;

    let allergenId = body.allergenId;

    // If no allergenId provided, look up or create by name
    if (!allergenId && body.name) {
      const existing = await prisma.allergen.findFirst({ where: { name: body.name } });
      if (existing) {
        allergenId = existing.id;
      } else {
        const created = await prisma.allergen.create({
          data: {
            name: body.name,
            type: body.type ?? 'Other',
            stockConc: body.concentration ?? null,
          },
        });
        allergenId = created.id;
      }
    }

    if (!allergenId) {
      return NextResponse.json({ error: 'allergenId or name is required' }, { status: 400 });
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const mix = await prisma.allergenMix.create({
      data: { patientId: id, allergenId, volumeMl },
      include: { allergen: true },
    });

    await prisma.auditLog.create({
      data: {
        patientId: id,
        action: 'Allergen Added to Mix',
        entity: 'AllergenMix',
        entityId: mix.id,
        details: `Added ${mix.allergen.name} (${volumeMl} mL) to patient mix`,
      },
    });

    return NextResponse.json(
      {
        id: mix.id,
        name: mix.allergen.name,
        type: mix.allergen.type,
        concentration: mix.allergen.stockConc ?? '—',
        volume: mix.volumeMl,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/patients/[id]/allergens error:', err);
    return NextResponse.json({ error: 'Failed to add allergen' }, { status: 500 });
  }
}
