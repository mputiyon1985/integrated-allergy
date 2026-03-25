import { Suspense } from 'react';
import PatientDetailClient from './PatientDetailClient';

export default function PatientDetailPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading patient…</div>}>
      <PatientDetailClient />
    </Suspense>
  );
}
