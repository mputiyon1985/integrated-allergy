/**
 * @file /api/nurses — Nursing staff API
 *
 * @description
 * Manages the clinic's nursing and clinical support staff directory.
 * Supports credential types: RN, LPN, MA, CMA, NP.
 *
 * GET  /api/nurses  — Returns all nursing staff ordered by name.
 *                     Query: `?active=true` to filter to active staff only.
 *
 * POST /api/nurses  — Adds a new nurse/clinical staff member.
 *                     Required: `name`.
 *                     Optional: title (RN default), email, phone, clinicLocation, npi.
 *                     Logs to AuditLog. Returns the created nurse with HTTP 201.
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { refreshDashboardStats } from '@/lib/refreshDashboardStats';


export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Returns all nursing staff ordered by name, optionally filtered to active only.
 * @param req - Query params: active? (boolean string)
 * @returns JSON { nurses[] } with 30-second CDN cache
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';

    const nurses = await prisma.nurse.findMany({
      where: activeOnly ? { active: true, deletedAt: null } : { deletedAt: null },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ nurses }, {
      headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('GET /api/nurses error:', err);
    return NextResponse.json({ nurses: [] });
  }
}

/**
 * Adds a new nursing staff member to the clinic roster.
 * @param req - POST request. Body: { name: string, title?, email?, phone?, clinicLocation?, npi?, photoUrl? }
 * @returns JSON { nurse } with HTTP 201, or 400/500 on failure
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      name: string;
      title?: string;
      email?: string;
      phone?: string;
      clinicLocation?: string;
      npi?: string;
      photoUrl?: string;
    };

    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'Nurse name is required' },
        { status: 400 }
      );
    }

    const nurse = await prisma.nurse.create({
      data: {
        name: body.name.trim(),
        title: body.title ?? 'RN',
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        clinicLocation: body.clinicLocation?.trim() || null,
        npi: body.npi?.trim() || null,
        photoUrl: body.photoUrl || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'Nurse Created',
        entity: 'Nurse',
        entityId: nurse.id,
        details: `New nurse added: ${nurse.title} ${nurse.name}`,
      },
    });

    void refreshDashboardStats();
    return NextResponse.json({ nurse }, { status: 201 });
  } catch (err) {
    console.error('POST /api/nurses error:', err);
    return NextResponse.json({ error: 'Failed to create nurse' }, { status: 500 });
  }
}
