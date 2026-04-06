/**
 * GET  /api/users  — List all users with entity/location info
 * POST /api/users  — Create a new user
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/auth/session';
import { isStrongPassword } from '@/lib/auth/password';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const users = await prisma.appUser.findMany({
      where: { deletedAt: null },
      include: {
        entity: { select: { id: true, name: true } },
        locationAccess: { include: { location: { select: { id: true, name: true } } } },
      },
      orderBy: { name: 'asc' },
    });

    const result = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      entityId: u.entityId,
      entityName: u.entity?.name ?? null,
      locationCount: u.locationAccess.length,
      locationIds: u.locationAccess.map((la) => la.locationId),
      locations: u.locationAccess.map((la) => ({ id: la.locationId, name: la.location.name })),
      active: u.active,
      mfaEnabled: u.mfaEnabled,
      createdAt: u.createdAt,
      doctorId: u.doctorId ?? null,
      nurseId: u.nurseId ?? null,
    }));

    return NextResponse.json({ users: result });
  } catch (err) {
    console.error('GET /api/users error:', err);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json() as {
      name: string;
      email: string;
      password: string;
      role?: string;
      entityId?: string | null;
      locationIds?: string[];
      doctorId?: string | null;
      nurseId?: string | null;
      active?: boolean;
    };

    if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    if (!body.email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    if (!body.password) return NextResponse.json({ error: 'Password is required' }, { status: 400 });

    // Password strength check
    const pwCheck = isStrongPassword(body.password);
    if (!pwCheck.ok) return NextResponse.json({ error: pwCheck.reason }, { status: 400 });

    // Check email uniqueness
    const existing = await prisma.appUser.findUnique({ where: { email: body.email.trim().toLowerCase() } });
    if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });

    const passwordHash = await bcrypt.hash(body.password, 12);

    const user = await prisma.appUser.create({
      data: {
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        passwordHash,
        role: body.role ?? 'location_staff',
        entityId: body.entityId || null,
        active: body.active ?? true,
        doctorId: body.doctorId || null,
        nurseId: body.nurseId || null,
      },
    });

    // Create location access records
    if (body.locationIds && body.locationIds.length > 0) {
      await prisma.userLocationAccess.createMany({
        data: body.locationIds.map((locationId) => ({
          userId: user.id,
          locationId,
        })),
      });
    }

    // Link doctor record
    if (body.doctorId) {
      await prisma.doctor.update({
        where: { id: body.doctorId },
        data: { appUserId: user.id },
      });
    }

    // Link nurse record
    if (body.nurseId) {
      await prisma.nurse.update({
        where: { id: body.nurseId },
        data: { appUserId: user.id },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: 'User Created',
        entity: 'AppUser',
        entityId: user.id,
        details: `New user created: ${user.name} (${user.email}) with role ${user.role}`,
      },
    });

    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }, { status: 201 });
  } catch (err) {
    console.error('POST /api/users error:', err);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
