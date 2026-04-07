/**
 * @file /api/allergens — Allergen library API
 *
 * @description
 * Manages the clinic's allergen extract library used for patient mix formulation.
 *
 * GET  /api/allergens  — Returns all allergens sorted alphabetically by name.
 *                        Response includes: id, name, type, manufacturer, lotNumber,
 *                        stockConcentration, expiryDate, inStock (derived from expiresAt).
 *
 * POST /api/allergens  — Adds a new allergen to the library.
 *                        Required: `name`. Optional: type, manufacturer, lotNumber,
 *                        stockConcentration, expiryDate.
 *                        Returns the created allergen with HTTP 201.
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';


export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const allergens = await prisma.allergen.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
    const shaped = allergens.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      manufacturer: a.manufacturer ?? '',
      lotNumber: a.lotNumber ?? '',
      stockConcentration: a.stockConc ?? '',
      expiryDate: a.expiresAt ? a.expiresAt.toISOString().slice(0, 10) : '',
      inStock: a.expiresAt ? a.expiresAt > new Date() : true,
    }));
    return NextResponse.json({ allergens: shaped }, {
      headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
    });
  } catch {
    return NextResponse.json({ allergens: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      name: string;
      type?: string;
      manufacturer?: string;
      lotNumber?: string;
      stockConcentration?: string;
      stockConc?: string;
      expiryDate?: string;
    };

    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const allergen = await prisma.allergen.create({
      data: {
        name: body.name,
        type: body.type ?? 'Other',
        manufacturer: body.manufacturer ?? null,
        lotNumber: body.lotNumber ?? null,
        stockConc: body.stockConcentration ?? body.stockConc ?? null,
        expiresAt: body.expiryDate ? new Date(body.expiryDate) : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'Allergen Created',
        entity: 'Allergen',
        entityId: allergen.id,
        details: `Allergen added to library: ${allergen.name}`,
      },
    });

    return NextResponse.json(
      {
        id: allergen.id,
        name: allergen.name,
        type: allergen.type,
        manufacturer: allergen.manufacturer ?? '',
        lotNumber: allergen.lotNumber ?? '',
        stockConcentration: allergen.stockConc ?? '',
        expiryDate: allergen.expiresAt ? allergen.expiresAt.toISOString().slice(0, 10) : '',
        inStock: true,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/allergens error:', err);
    return NextResponse.json({ error: 'Failed to create allergen' }, { status: 500 });
  }
}
