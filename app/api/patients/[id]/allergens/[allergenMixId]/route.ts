/**
 * @file /api/patients/[id]/allergens/[allergenMixId]
 *
 * PATCH  — Update volumeMl on an existing AllergenMix record
 * DELETE — Soft-delete an AllergenMix record (sets deletedAt)
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

type RouteParams = { params: Promise<{ id: string; allergenMixId: string }> };

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id, allergenMixId } = await params;
  try {
    const body = await req.json() as { volumeMl?: number };
    if (body.volumeMl === undefined || body.volumeMl <= 0) {
      return NextResponse.json({ error: 'volumeMl must be a positive number' }, { status: 400 });
    }

    const mix = await prisma.allergenMix.findUnique({ where: { id: allergenMixId }, include: { allergen: true } });
    if (!mix || mix.patientId !== id || mix.deletedAt) {
      return NextResponse.json({ error: 'AllergenMix not found' }, { status: 404 });
    }

    const updated = await prisma.allergenMix.update({
      where: { id: allergenMixId },
      data: { volumeMl: body.volumeMl },
      include: { allergen: true },
    });

    await prisma.auditLog.create({
      data: {
        patientId: id,
        action: 'Allergen Volume Updated',
        entity: 'AllergenMix',
        entityId: allergenMixId,
        details: `Updated ${updated.allergen.name} volume to ${body.volumeMl} mL`,
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.allergen.name,
      type: updated.allergen.type,
      concentration: updated.allergen.stockConc ?? '—',
      volume: updated.volumeMl,
    });
  } catch (err) {
    console.error('PATCH /api/patients/[id]/allergens/[allergenMixId] error:', err);
    return NextResponse.json({ error: 'Failed to update allergen volume' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id, allergenMixId } = await params;
  try {
    const mix = await prisma.allergenMix.findUnique({ where: { id: allergenMixId }, include: { allergen: true } });
    if (!mix || mix.patientId !== id || mix.deletedAt) {
      return NextResponse.json({ error: 'AllergenMix not found' }, { status: 404 });
    }

    await prisma.allergenMix.update({
      where: { id: allergenMixId },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        patientId: id,
        action: 'Allergen Removed from Mix',
        entity: 'AllergenMix',
        entityId: allergenMixId,
        details: `Removed ${mix.allergen.name} from patient mix`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/patients/[id]/allergens/[allergenMixId] error:', err);
    return NextResponse.json({ error: 'Failed to remove allergen' }, { status: 500 });
  }
}
