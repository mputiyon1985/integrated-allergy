/**
 * @file /api/doctor-titles — Doctor title reference API
 *
 * @description
 * Manages the configurable list of physician title designations (e.g., MD, DO, PhD)
 * used in the doctor roster and patient enrollment forms.
 *
 * GET  /api/doctor-titles  — Returns all titles ordered by sortOrder then name.
 *                            Query: ?active=true to return only active titles.
 *
 * POST /api/doctor-titles  — Creates a new title designation.
 *                            Required: name. Optional: sortOrder.
 *                            Returns the created title with HTTP 201.
 *
 * @security Requires authenticated session (ia_session cookie via proxy.ts)
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Lists all doctor title designations, sorted by sortOrder then name.
 * @param req - Query params: active? (boolean string)
 * @returns JSON { titles[] } with 30-second CDN cache
 */
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

/**
 * Creates a new doctor title designation.
 * @param req - POST request. Body: { name: string, sortOrder? }
 * @returns JSON { title } with HTTP 201, or 400/500 on failure
 */
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
