/**
 * @file /api/doctors — Physician roster API
 *
 * @description
 * Manages the clinic's physician directory. Doctors are linked to patient records
 * and appear in patient enrollment forms for physician assignment.
 *
 * GET  /api/doctors           — Returns all physicians ordered by name.
 *                               Query: `?active=true` to filter to active physicians only.
 *
 * POST /api/doctors           — Adds a new physician to the roster.
 *                               Required: `name`.
 *                               Optional: title (MD), specialty, email, phone, clinicLocation, npi.
 *                               Logs to AuditLog. Returns the created doctor with HTTP 201.
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';


export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';

    const doctors = await prisma.doctor.findMany({
      where: activeOnly ? { active: true, deletedAt: null } : { deletedAt: null },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ doctors });
  } catch (err) {
    console.error('GET /api/doctors error:', err);
    return NextResponse.json({ doctors: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      name: string;
      title?: string;
      specialty?: string;
      email?: string;
      phone?: string;
      clinicLocation?: string;
      npi?: string;
      photoUrl?: string;
    };

    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'Doctor name is required' },
        { status: 400 }
      );
    }

    const doctor = await prisma.doctor.create({
      data: {
        name: body.name.trim(),
        title: body.title ?? 'MD',
        specialty: body.specialty ?? 'Allergy & Immunology',
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        clinicLocation: body.clinicLocation?.trim() || null,
        npi: body.npi?.trim() || null,
        photoUrl: body.photoUrl || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'Doctor Created',
        entity: 'Doctor',
        entityId: doctor.id,
        details: `New doctor added: ${doctor.title} ${doctor.name}`,
      },
    });

    return NextResponse.json({ doctor }, { status: 201 });
  } catch (err) {
    console.error('POST /api/doctors error:', err);
    return NextResponse.json({ error: 'Failed to create doctor' }, { status: 500 });
  }
}
