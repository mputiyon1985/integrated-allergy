/**
 * @file /api/dashboard — Dashboard KPIs and activity feed API
 *
 * @description
 * Aggregates real-time clinical statistics and recent system activity for the
 * dashboard landing page. Executes all queries in parallel via Promise.all for performance.
 *
 * GET /api/dashboard — Returns:
 *   stats: {
 *     totalPatients       — All enrolled patients (count)
 *     activeTreatments    — Vials with expiresAt in the future (count)
 *     vialsExpiringSoon   — Vials expiring within 30 days (count)
 *     dosesThisWeek       — Shots administered in past 7 days (count)
 *     shotsToday          — Shot-type appointments scheduled today (count)
 *     testsToday          — Skin test appointments today (count)
 *     evalsToday          — Evaluation appointments today (count)
 *   }
 *   activity — 20 most recent audit log entries with patient context
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const weekStart  = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const in30Days   = new Date(todayStart.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalPatients,
      activeVials,
      expiringVials,
      dosesThisWeek,
      shotsToday,
      testsToday,
      evalsToday,
      recentLogs,
    ] = await Promise.all([
      prisma.patient.count(),

      prisma.vial.count({
        where: { expiresAt: { gte: now } },
      }),

      prisma.vial.count({
        where: { expiresAt: { gte: now, lte: in30Days } },
      }),

      prisma.dosingSchedule.count({
        where: {
          administered: true,
          administeredAt: { gte: weekStart, lte: now },
        },
      }),

      // Shots today: appointments of type 'shot' starting today
      prisma.appointment.count({
        where: {
          type: 'shot',
          startTime: { gte: todayStart, lte: todayEnd },
        },
      }),

      // Skin tests today
      prisma.appointment.count({
        where: {
          type: 'skin_test',
          startTime: { gte: todayStart, lte: todayEnd },
        },
      }),

      // Evals today
      prisma.appointment.count({
        where: {
          type: 'evaluation',
          startTime: { gte: todayStart, lte: todayEnd },
        },
      }),

      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { patient: { select: { name: true, patientId: true } } },
      }),
    ]);

    const activity = recentLogs.map((log) => ({
      id: log.id,
      timestamp: log.createdAt.toISOString().replace('T', ' ').slice(0, 16),
      type: log.action,
      patient: log.patient ? log.patient.name : '—',
      details: log.details ?? '',
      user: 'System',
    }));

    return NextResponse.json({
      stats: {
        totalPatients,
        activeTreatments: activeVials,
        vialsExpiringSoon: expiringVials,
        dosesThisWeek,
        shotsToday,
        testsToday,
        evalsToday,
      },
      activity,
    });
  } catch (err) {
    console.error('Dashboard API error:', err);
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}
