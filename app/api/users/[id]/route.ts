/**
 * @file /api/users/[id] — Single system user API
 *
 * @description
 * CRUD operations for an individual system user account. All operations require super_admin role.
 *
 * GET    /api/users/[id]  — Returns user detail with entity and location access
 * PUT    /api/users/[id]  — Updates user fields. Optionally resets password (bcrypt, cost 12).
 *                           Replaces location access list if locationIds provided.
 * DELETE /api/users/[id]  — Soft-deletes and deactivates the account.
 *                           Cannot delete your own account.
 *
 * @security Requires super_admin role.
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/auth/session';
import { isStrongPassword } from '@/lib/auth/password';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

/**
 * Returns a single user with entity and location access details.
 * @param req - Incoming request. Must be authenticated as super_admin.
 * @param params.id - AppUser UUID
 * @returns JSON { user } or 401/403/404/500
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const user = await prisma.appUser.findUnique({
      where: { id },
      include: {
        entity: { select: { id: true, name: true } },
        locationAccess: { include: { location: { select: { id: true, name: true } } } },
      },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        entityId: user.entityId,
        entityName: user.entity?.name ?? null,
        locationIds: user.locationAccess.map((la) => la.locationId),
        locations: user.locationAccess.map((la) => ({ id: la.locationId, name: la.location.name })),
        active: user.active,
        mfaEnabled: user.mfaEnabled,
        createdAt: user.createdAt,
        deletedAt: user.deletedAt,
      },
    });
  } catch (err) {
    console.error('GET /api/users/[id] error:', err);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

/**
 * Updates a user account. Only provided fields are changed.
 * Replaces location access list when locationIds is supplied.
 * @param req - PUT request. Body (all optional): { name?, email?, password?, role?, entityId?, locationIds?, doctorId?, nurseId?, active? }
 * @param params.id - AppUser UUID
 * @returns JSON { user } or 400/401/403/409/500
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await req.json() as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      entityId?: string | null;
      locationIds?: string[];
      doctorId?: string | null;
      nurseId?: string | null;
      active?: boolean;
    };

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.email !== undefined) {
      // Check uniqueness
      const existing = await prisma.appUser.findUnique({ where: { email: body.email.trim().toLowerCase() } });
      if (existing && existing.id !== id) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      updateData.email = body.email.trim().toLowerCase();
    }
    if (body.password) {
      const pwCheck = isStrongPassword(body.password);
      if (!pwCheck.ok) return NextResponse.json({ error: pwCheck.reason }, { status: 400 });
      updateData.passwordHash = await bcrypt.hash(body.password, 12);
    }
    if (body.role !== undefined) updateData.role = body.role;
    if (body.entityId !== undefined) updateData.entityId = body.entityId || null;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.doctorId !== undefined) updateData.doctorId = body.doctorId || null;
    if (body.nurseId !== undefined) updateData.nurseId = body.nurseId || null;

    const user = await prisma.appUser.update({
      where: { id },
      data: updateData,
    });

    // Update location access if provided
    if (body.locationIds !== undefined) {
      await prisma.userLocationAccess.deleteMany({ where: { userId: id } });
      if (body.locationIds.length > 0) {
        await prisma.userLocationAccess.createMany({
          data: body.locationIds.map((locationId) => ({ userId: id, locationId })),
        });
      }
    }

    // Link doctor record
    if (body.doctorId !== undefined) {
      if (body.doctorId) {
        await prisma.doctor.update({
          where: { id: body.doctorId },
          data: { appUserId: id },
        });
      }
    }

    // Link nurse record
    if (body.nurseId !== undefined) {
      if (body.nurseId) {
        await prisma.nurse.update({
          where: { id: body.nurseId },
          data: { appUserId: id },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        action: 'User Updated',
        entity: 'AppUser',
        entityId: id,
        details: `User updated: ${user.name} (${user.email})`,
      },
    });

    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active } });
  } catch (err) {
    console.error('PUT /api/users/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

/**
 * Soft-deletes and deactivates a user account. Cannot delete own account.
 * @param req - Incoming request. Must be authenticated as super_admin.
 * @param params.id - AppUser UUID
 * @returns JSON { success: true } or 400/401/403/500
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    // Can't delete yourself
    if (session.userId === id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const user = await prisma.appUser.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });

    await prisma.auditLog.create({
      data: {
        action: 'User Deleted',
        entity: 'AppUser',
        entityId: id,
        details: `User soft-deleted: ${user.name} (${user.email})`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/users/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
