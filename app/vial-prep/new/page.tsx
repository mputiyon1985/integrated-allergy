/**
 * @file app/vial-prep/new/page.tsx — New vial batch wizard page (server shell)
 *
 * Wraps VialBatchClient in a Suspense boundary. The client component implements
 * a multi-step wizard for selecting a patient, reviewing their allergen mix,
 * confirming safety checks, and generating a new 4-vial compounding batch.
 */
import { Suspense } from 'react';
import VialBatchClient from './VialBatchClient';

export default function NewVialBatchPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading vial batch wizard…</div>}>
      <VialBatchClient />
    </Suspense>
  );
}
