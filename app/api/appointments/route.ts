/**
 * @file /api/appointments — Appointment scheduling API
 *
 * @description
 * Manages patient appointments for the integrated calendar and scheduling module.
 *
 * GET  /api/appointments  — Returns appointments with optional filtering.
 *   Query params: patientId, from (ISO date), to (ISO date), type (shot|skin_test|evaluation|follow_up|other)
 *   Response includes patient summary (id, name, patientId) via relation join.
 *
 * POST /api/appointments  — Creates a new appointment and logs to AuditLog.
 *   Required: patientId, type, title, startTime (ISO), endTime (ISO).
 *   Optional: provider, notes, status (default: 'scheduled').
 *   Returns the created appointment with patient context, HTTP 201.
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { refreshDashboardStats } from '@/lib/refreshDashboardStats';


export const dynamic = 'force-dynamic';

/**
 * Returns appointments filtered by optional query parameters.
 * Defaults to the current calendar month if no date range is provided.
 * @param req - Query params: patientId?, from? (ISO date), to? (ISO date), type?
 * @returns JSON { appointments[] } with 15-second CDN cache
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');
    const from      = searchParams.get('from');
    const to        = searchParams.get('to');
    const type      = searchParams.get('type');

    // Default date range: current month if none provided (prevents full table scan)
    const now = new Date();
    const defaultFrom = from ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const defaultTo   = to   ?? new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const appointments = await prisma.appointment.findMany({
      where: {
        deletedAt: null,
        ...(patientId && { patientId }),
        ...(type      && { type }),
        startTime: {
          gte: new Date(defaultFrom),
          lte: new Date(defaultTo),
        },
      },
      orderBy: { startTime: 'asc' },
      take: 500,
      include: { patient: { select: { id: true, name: true, patientId: true } } },
    });

    return NextResponse.json({ appointments }, {
      headers: { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=30' },
    });
  } catch (err) {
    console.error('GET /api/appointments error:', err);
    return NextResponse.json({ appointments: [] });
  }
}

/**
 * Creates a new patient appointment and logs the event to AuditLog.
 * @param req - POST request. Body: { patientId, type, title, startTime, endTime, provider?, notes?, status? }
 * @returns JSON { appointment } with HTTP 201, or 400/500 on failure
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      patientId: string;
      type: string;
      title: string;
      startTime: string;
      endTime: string;
      provider?: string;
      notes?: string;
      status?: string;
    };

    if (!body.patientId || !body.type || !body.title || !body.startTime || !body.endTime) {
      return NextResponse.json(
        { error: 'patientId, type, title, startTime, endTime are required' },
        { status: 400 }
      );
    }

    const appt = await prisma.appointment.create({
      data: {
        patientId: body.patientId,
        type:      body.type,
        title:     body.title,
        startTime: new Date(body.startTime),
        endTime:   new Date(body.endTime),
        provider:  body.provider  ?? null,
        notes:     body.notes     ?? null,
        status:    body.status    ?? 'scheduled',
      },
      include: { patient: { select: { id: true, name: true, patientId: true } } },
    });

    await prisma.auditLog.create({
      data: {
        patientId: body.patientId,
        action:    'Appointment Created',
        entity:    'Appointment',
        entityId:  appt.id,
        details:   `${body.type} — ${body.title} at ${new Date(body.startTime).toISOString()}`,
      },
    });

    return NextResponse.json({ appointment: appt }, { status: 201 });
  } catch (err) {
    console.error('POST /api/appointments error:', err);
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
  }
}
