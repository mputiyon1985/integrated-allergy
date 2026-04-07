/**
 * Refreshes the DashboardStats singleton row with live counts.
 * Call this after any mutation that affects dashboard KPIs:
 * - Patient create/delete
 * - Vial create/delete/update
 * - Appointment create/delete
 * - DosingSchedule administered
 * - Doctor/Nurse create/toggle/delete
 */
import prisma from '@/lib/db';

export async function refreshDashboardStats(): Promise<void> {
  try {
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
  } catch {
    // Non-fatal — dashboard will fall back to live queries
  }
}
