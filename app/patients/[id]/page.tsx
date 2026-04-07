/**
 * @file app/patients/[id]/page.tsx — Patient detail page (server shell)
 *
 * Wraps the PatientDetailClient in a Suspense boundary so the page renders
 * a loading fallback while the client component hydrates and fetches patient data.
 */
import { Suspense } from 'react';
import PatientDetailClient from './PatientDetailClient';

export default function PatientDetailPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading patient…</div>}>
      <PatientDetailClient />
    </Suspense>
  );
}
