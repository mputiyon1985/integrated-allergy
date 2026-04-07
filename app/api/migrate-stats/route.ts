/**
 * @file /api/migrate-stats — DashboardStats migration endpoint
 *
 * @description
 * One-time migration utility that creates the DashboardStats denormalized table
 * (if it doesn't exist) and seeds it with live counts. Safe to call repeatedly —
 * uses INSERT ON CONFLICT DO UPDATE, so subsequent calls simply refresh the counts.
 *
 * POST /api/migrate-stats
 *   Creates/refreshes the DashboardStats singleton row.
 *   Returns: { ok: true, seeded: { totalPatients, activeDoctors, activeNurses } }
 *
 * @security Should be restricted to super_admin or deployment scripts in production.
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Creates the DashboardStats table if absent, then seeds/refreshes the singleton row with live counts.
 * @returns JSON { ok: true, seeded } or { ok: false, error }
 */
export async function POST() {
  try {
    // Create table if it doesn't exist
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "DashboardStats" (
        "id"                 TEXT    NOT NULL PRIMARY KEY DEFAULT 'singleton',
        "totalPatients"      INTEGER NOT NULL DEFAULT 0,
        "activeTreatments"   INTEGER NOT NULL DEFAULT 0,
        "vialsExpiringSoon"  INTEGER NOT NULL DEFAULT 0,
        "vialsExpiring7Days" INTEGER NOT NULL DEFAULT 0,
        "dosesThisWeek"      INTEGER NOT NULL DEFAULT 0,
        "shotsToday"         INTEGER NOT NULL DEFAULT 0,
        "testsToday"         INTEGER NOT NULL DEFAULT 0,
        "evalsToday"         INTEGER NOT NULL DEFAULT 0,
        "activeDoctors"      INTEGER NOT NULL DEFAULT 0,
        "activeNurses"       INTEGER NOT NULL DEFAULT 0,
        "updatedAt"          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Seed with live counts
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 86400000);
    const weekStart  = new Date(todayStart.getTime() - 7 * 86400000);
    const in7Days    = new Date(todayStart.getTime() + 7  * 86400000);
    const in30Days   = new Date(todayStart.getTime() + 30 * 86400000);

    const [tp, av, ev, ev7, dw, st, tt, et, ad, an] = await Promise.all([
      prisma.patient.count({ where: { deletedAt: null } }),
      prisma.vial.count({ where: { deletedAt: null, expiresAt: { gte: now } } }),
      prisma.vial.count({ where: { deletedAt: null, expiresAt: { gte: now, lte: in30Days } } }),
      prisma.vial.count({ where: { deletedAt: null, expiresAt: { gte: now, lte: in7Days } } }),
      prisma.dosingSchedule.count({ where: { deletedAt: null, administered: true, administeredAt: { gte: weekStart, lte: now } } }),
      prisma.appointment.count({ where: { deletedAt: null, type: 'shot', startTime: { gte: todayStart, lte: todayEnd } } }),
      prisma.appointment.count({ where: { deletedAt: null, type: 'skin_test', startTime: { gte: todayStart, lte: todayEnd } } }),
      prisma.appointment.count({ where: { deletedAt: null, type: 'evaluation', startTime: { gte: todayStart, lte: todayEnd } } }),
      prisma.doctor.count({ where: { active: true, deletedAt: null } }),
      prisma.nurse.count({ where: { active: true, deletedAt: null } }),
    ]);

    await prisma.$executeRaw`
      INSERT INTO "DashboardStats" (
        "id", "totalPatients", "activeTreatments", "vialsExpiringSoon",
        "vialsExpiring7Days", "dosesThisWeek", "shotsToday", "testsToday",
        "evalsToday", "activeDoctors", "activeNurses", "updatedAt"
      ) VALUES (
        'singleton', ${tp}, ${av}, ${ev}, ${ev7}, ${dw}, ${st}, ${tt}, ${et}, ${ad}, ${an}, CURRENT_TIMESTAMP
      )
      ON CONFLICT("id") DO UPDATE SET
        "totalPatients"      = excluded."totalPatients",
        "activeTreatments"   = excluded."activeTreatments",
        "vialsExpiringSoon"  = excluded."vialsExpiringSoon",
        "vialsExpiring7Days" = excluded."vialsExpiring7Days",
        "dosesThisWeek"      = excluded."dosesThisWeek",
        "shotsToday"         = excluded."shotsToday",
        "testsToday"         = excluded."testsToday",
        "evalsToday"         = excluded."evalsToday",
        "activeDoctors"      = excluded."activeDoctors",
        "activeNurses"       = excluded."activeNurses",
        "updatedAt"          = CURRENT_TIMESTAMP
    `;

    return NextResponse.json({ ok: true, seeded: { totalPatients: tp, activeDoctors: ad, activeNurses: an } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
