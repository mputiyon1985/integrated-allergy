/**
 * GET  /api/locations          — List active (or all) clinic locations
 * POST /api/locations          — Create a new clinic location
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';
    const locations = await prisma.clinicLocation.findMany({
      where: activeOnly ? { active: true, deletedAt: null } : { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json({ locations });
  } catch (err) {
    console.error('GET /api/locations error:', err);
    return NextResponse.json({ locations: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { name: string; address?: string; sortOrder?: number };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const location = await prisma.clinicLocation.create({
      data: {
        name: body.name.trim(),
        address: body.address?.trim() || null,
        sortOrder: body.sortOrder ?? 0,
      },
    });
    await prisma.auditLog.create({
      data: { action: 'Location Created', entity: 'ClinicLocation', entityId: location.id, details: `Added: ${location.name}` },
    });
    return NextResponse.json({ location }, { status: 201 });
  } catch (err) {
    console.error('POST /api/locations error:', err);
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
  }
}
