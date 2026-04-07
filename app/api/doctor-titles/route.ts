/**
 * GET  /api/doctor-titles   — List doctor titles
 * POST /api/doctor-titles   — Create a new doctor title
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';
    const titles = await prisma.doctorTitle.findMany({
      where: activeOnly ? { active: true, deletedAt: null } : { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json({ titles }, {
      headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('GET /api/doctor-titles error:', err);
    return NextResponse.json({ titles: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { name: string; sortOrder?: number };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const title = await prisma.doctorTitle.create({
      data: { name: body.name.trim(), sortOrder: body.sortOrder ?? 0 },
    });
    await prisma.auditLog.create({
      data: { action: 'DoctorTitle Created', entity: 'DoctorTitle', entityId: title.id, details: `Added: ${title.name}` },
    });
    return NextResponse.json({ title }, { status: 201 });
  } catch (err) {
    console.error('POST /api/doctor-titles error:', err);
    return NextResponse.json({ error: 'Failed to create title' }, { status: 500 });
  }
}
