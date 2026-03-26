/**
 * GET /api/entities — List all business entities
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const entities = await prisma.businessEntity.findMany({
      where: { deletedAt: null, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, phone: true },
    });

    return NextResponse.json({ entities });
  } catch (err) {
    console.error('GET /api/entities error:', err);
    return NextResponse.json({ entities: [] });
  }
}
