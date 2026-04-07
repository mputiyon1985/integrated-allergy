/**
 * @file /api/diagnoses — Diagnosis options reference API
 *
 * @description
 * Manages the configurable list of allergy diagnosis options shown in patient enrollment.
 *
 * GET  /api/diagnoses  — Returns all diagnosis options ordered by sortOrder then name.
 *                        Query: ?active=true to return only active options.
 *
 * POST /api/diagnoses  — Creates a new diagnosis option.
 *                        Required: name. Optional: icdCode, sortOrder.
 *                        Returns the created option with HTTP 201.
 *
 * @security Requires authenticated session (ia_session cookie via proxy.ts)
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Lists all diagnosis options, sorted by sortOrder then name.
 * @param req - Query params: active? (boolean string)
 * @returns JSON { diagnoses[] } with 30-second CDN cache
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';
    const diagnoses = await prisma.diagnosisOption.findMany({
      where: activeOnly ? { active: true, deletedAt: null } : { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json({ diagnoses }, {
      headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('GET /api/diagnoses error:', err);
    return NextResponse.json({ diagnoses: [] });
  }
}

/**
 * Creates a new diagnosis option.
 * @param req - POST request. Body: { name: string, icdCode?, sortOrder? }
 * @returns JSON { diagnosis } with HTTP 201, or 400/500 on failure
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { name: string; icdCode?: string; sortOrder?: number };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const diagnosis = await prisma.diagnosisOption.create({
      data: {
        name: body.name.trim(),
        icdCode: body.icdCode?.trim() || null,
        sortOrder: body.sortOrder ?? 0,
      },
    });
    await prisma.auditLog.create({
      data: { action: 'Diagnosis Created', entity: 'DiagnosisOption', entityId: diagnosis.id, details: `Added: ${diagnosis.name}` },
    });
    return NextResponse.json({ diagnosis }, { status: 201 });
  } catch (err) {
    console.error('POST /api/diagnoses error:', err);
    return NextResponse.json({ error: 'Failed to create diagnosis' }, { status: 500 });
  }
}
