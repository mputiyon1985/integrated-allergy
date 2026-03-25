import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doctor = await prisma.doctor.findUnique({ where: { id } });
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }
    return NextResponse.json({ doctor });
  } catch (err) {
    console.error('GET /api/doctors/[id] error:', err);
    return NextResponse.json({ error: 'Failed to fetch doctor' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as {
      name?: string;
      title?: string;
      specialty?: string;
      email?: string;
      phone?: string;
      clinicLocation?: string;
      npi?: string;
      active?: boolean;
    };

    const existing = await prisma.doctor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    const doctor = await prisma.doctor.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.specialty !== undefined && { specialty: body.specialty }),
        ...(body.email !== undefined && { email: body.email?.trim() || null }),
        ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
        ...(body.clinicLocation !== undefined && { clinicLocation: body.clinicLocation?.trim() || null }),
        ...(body.npi !== undefined && { npi: body.npi?.trim() || null }),
        ...(body.active !== undefined && { active: body.active }),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'Doctor Updated',
        entity: 'Doctor',
        entityId: id,
        details: `Doctor updated: ${doctor.title} ${doctor.name}`,
      },
    });

    return NextResponse.json({ doctor });
  } catch (err) {
    console.error('PUT /api/doctors/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update doctor' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.doctor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    // Soft delete — set active = false
    const doctor = await prisma.doctor.update({
      where: { id },
      data: { active: false },
    });

    await prisma.auditLog.create({
      data: {
        action: 'Doctor Deactivated',
        entity: 'Doctor',
        entityId: id,
        details: `Doctor deactivated: ${doctor.title} ${doctor.name}`,
      },
    });

    return NextResponse.json({ success: true, doctor });
  } catch (err) {
    console.error('DELETE /api/doctors/[id] error:', err);
    return NextResponse.json({ error: 'Failed to deactivate doctor' }, { status: 500 });
  }
}
