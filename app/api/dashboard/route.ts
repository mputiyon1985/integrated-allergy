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
  } catch {
    return NextResponse.json({
      stats: {
        totalPatients: 0,
        activeTreatments: 0,
        vialsExpiringSoon: 0,
        dosesThisWeek: 0,
        shotsToday: 0,
        testsToday: 0,
        evalsToday: 0,
      },
      activity: [],
    });
  }
}
