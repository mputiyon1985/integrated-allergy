import { Suspense } from 'react';
import CalendarClient from './CalendarClient';

export default function CalendarPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading calendar…</div>}>
      <CalendarClient />
    </Suspense>
  );
}
