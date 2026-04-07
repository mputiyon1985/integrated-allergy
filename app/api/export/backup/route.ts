/**
 * @file /api/export/backup — Full database JSON backup export
 *
 * @description
 * Exports all non-deleted clinical data as a structured JSON file for backup,
 * migration, or disaster recovery purposes. Includes patients, doctors, nurses,
 * allergens, appointments, vials, dosing schedules, and recent audit logs.
 *
 * GET /api/export/backup
 *   Returns a JSON file attachment with all active records.
 *   File name: ims-backup-YYYY-MM-DD.json
 *   Shape: { exportedAt, version, data: { patients[], doctors[], nurses[], ... } }
 *
 * @security Should be restricted to super_admin in production.
 *           Contains full PHI — handle with care.
 *           All exports are logged to the audit trail (HIPAA).
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { HIPAA_HEADERS } from '@/lib/hipaaHeaders';

export const dynamic = 'force-dynamic';

/**
 * Exports a full JSON backup of all active clinical records.
 * Logs the export action to the audit trail.
 * @returns JSON file download or 500 error
 */
export async function GET(req: NextRequest) {
  try {
    // HIPAA: log PHI export to audit trail
    await prisma.auditLog.create({
      data: {
        action: 'PHI Export',
        entity: 'Export',
        entityId: 'backup-json',
        details: `Full backup exported by user ${req.headers.get('x-user-id') ?? 'unknown'}`,
      },
    });

    const [patients, doctors, nurses, allergens, appointments, auditLogs, vials, dosingSchedules] =
      await Promise.all([
        prisma.patient.findMany({ where: { deletedAt: null } }),
        prisma.doctor.findMany({ where: { deletedAt: null } }),
        prisma.nurse.findMany({ where: { deletedAt: null } }),
        prisma.allergen.findMany({ where: { deletedAt: null } }),
        prisma.appointment.findMany({ where: { deletedAt: null } }),
        prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5000 }),
        prisma.vial.findMany({ where: { deletedAt: null } }),
        prisma.dosingSchedule.findMany({ where: { deletedAt: null } }),
      ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: '2.0',
      data: { patients, doctors, nurses, allergens, appointments, auditLogs, vials, dosingSchedules },
    };

    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        ...HIPAA_HEADERS,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="ims-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    console.error('Backup error:', err);
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 });
  }
}
