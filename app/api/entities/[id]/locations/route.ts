/**
 * GET /api/entities/[id]/locations — List locations for a specific entity
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const locations = await prisma.clinicLocation.findMany({
      where: { entityId: id, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json({ locations });
  } catch (err) {
    console.error('GET /api/entities/[id]/locations error:', err);
    return NextResponse.json({ locations: [] });
  }
}
