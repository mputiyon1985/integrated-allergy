/**
 * @file app/calendar/page.tsx — Appointment calendar page (server shell)
 *
 * Wraps CalendarClient in a Suspense boundary so the page renders a loading
 * fallback while the calendar component hydrates and loads appointment data.
 */
import { Suspense } from 'react';
import CalendarClient from './CalendarClient';

export default function CalendarPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading calendar…</div>}>
      <CalendarClient />
    </Suspense>
  );
}
