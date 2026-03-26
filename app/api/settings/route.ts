/**
 * @file /api/settings — App Settings API
 *
 * GET  /api/settings  — Returns all settings as { key: value } map
 * PUT  /api/settings  — Upserts one or more settings: { key: string, value: string }[]
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
      SELECT key, value FROM Settings
    `;
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return NextResponse.json(result);
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
