/**
 * @file /api/allergens/[id] — Single allergen CRUD
 *
 * GET    /api/allergens/[id] — Fetch a single allergen
 * PUT    /api/allergens/[id] — Update allergen fields
 * DELETE /api/allergens/[id] — Delete an allergen
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function shapeAllergen(a: {
  id: string;
  name: string;
  type: string | null;
  manufacturer: string | null;
  lotNumber: string | null;
  stockConc: string | null;
  expiresAt: Date | null;
}) {
  return {
    id: a.id,
    name: a.name,
    type: a.type ?? '',
    manufacturer: a.manufacturer ?? '',
    lotNumber: a.lotNumber ?? '',
    stockConcentration: a.stockConc ?? '',
    expiryDate: a.expiresAt ? a.expiresAt.toISOString().slice(0, 10) : '',
    inStock: a.expiresAt ? a.expiresAt > new Date() : true,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const allergen = await prisma.allergen.findUnique({ where: { id, deletedAt: null } });
    if (!allergen) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ allergen: shapeAllergen(allergen) });
  } catch (err) {
    console.error('GET /api/allergens/[id] error:', err);
    return NextResponse.json({ error: 'Failed to fetch allergen' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json() as {
      name?: string;
      type?: string;
      manufacturer?: string;
      lotNumber?: string;
      stockConcentration?: string;
      expiryDate?: string;
    };

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined)              updateData.name         = body.name;
    if (body.type !== undefined)              updateData.type         = body.type;
    if (body.manufacturer !== undefined)      updateData.manufacturer = body.manufacturer || null;
    if (body.lotNumber !== undefined)         updateData.lotNumber    = body.lotNumber || null;
    if (body.stockConcentration !== undefined) updateData.stockConc   = body.stockConcentration || null;
    if (body.expiryDate !== undefined)        updateData.expiresAt    = body.expiryDate ? new Date(body.expiryDate) : null;

    const allergen = await prisma.allergen.update({ where: { id }, data: updateData });
    return NextResponse.json({ allergen: shapeAllergen(allergen) });
  } catch (err) {
    console.error('PUT /api/allergens/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update allergen' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const existing = await prisma.allergen.findUnique({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Soft delete — set deletedAt timestamp (data always retained)
    await prisma.allergen.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        action: 'Soft Delete',
        entity: 'Allergen',
        entityId: id,
        details: `Allergen soft-deleted (data retained): ${existing.name}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/allergens/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete allergen' }, { status: 500 });
  }
}
