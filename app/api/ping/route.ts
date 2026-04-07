/**
 * @file /api/ping — Lightweight keep-warm endpoint
 * Fires a minimal DB query to keep the Turso connection warm.
 * Called from the client layout on app load.
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Minimal query — just checks connection is alive
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
