/**
 * @file /api/settings — Application settings API
 *
 * @description
 * Manages the key-value Settings table used to configure app behaviour at runtime
 * (clinic name, MFA policy, session timeout, diagnosis options, etc.).
 * Falls back to hardcoded defaults if the Settings table doesn't yet exist.
 *
 * GET  /api/settings  — Returns all settings as a flat { key: value } map.
 *                       Falls back to hardcoded defaults if the table is absent.
 *
 * PUT  /api/settings  — Upserts one or more settings.
 *                       Body: { key: string, value: string }[]
 *                       Uses INSERT ON CONFLICT DO UPDATE for idempotency.
 *                       Logs changes to AuditLog.
 *
 * @security Requires authenticated session (ia_session cookie via proxy.ts).
 *           Write access should be restricted to entity_admin / super_admin.
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Returns all application settings as a flat key-value map.
 * Falls back to hardcoded defaults if the Settings table does not yet exist.
 * @returns JSON Record<string, string> with 30-second CDN cache
 */
export async function GET() {
  try {
    const rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
      SELECT key, value FROM Settings
    `;
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('GET /api/settings error:', err);
    // Return defaults if table doesn't exist yet
    return NextResponse.json({
      app_title: 'Integrated Allergy IMS',
      clinic_name: 'Integrated Allergy',
      tagline: 'Testing & Treatment',
      version_label: 'IMS v2.0 · © 2026',
      clinic_locations: JSON.stringify([
        'Main Clinic — Dumfries, VA',
        'North Branch — Woodbridge, VA',
        'South Branch — Stafford, VA',
      ]),
      diagnosis_options: JSON.stringify([
        'Allergic Rhinitis',
        'Asthma',
        'Asthma + Allergic Rhinitis',
        'Allergic Rhinitis + Eczema',
        'AR + Asthma + Eczema',
        'Other',
      ]),
    });
  }
}

/**
 * Upserts one or more application settings.
 * @param req - PUT request. Body: { key: string, value: string }[]
 * @returns JSON { ok: true } or 400/500 on failure
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json() as { key: string; value: string }[];
    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ error: 'Expected array of { key, value }' }, { status: 400 });
    }
    for (const { key, value } of body) {
      if (!key || typeof value !== 'string') continue;
      await prisma.$executeRaw`
        INSERT INTO Settings (key, value, updatedAt)
        VALUES (${key}, ${value}, unixepoch())
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
      `;
    }

    await prisma.auditLog.create({
      data: {
        action: 'Settings Updated',
        entity: 'Settings',
        entityId: 'global',
        details: `Updated ${body.length} setting(s): ${body.map((b) => b.key).join(', ')}`,
      },
    }).catch(() => { /* non-fatal: settings save should succeed even if audit log fails */ });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/settings error:', err);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
