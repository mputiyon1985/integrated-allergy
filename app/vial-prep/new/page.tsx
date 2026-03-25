import { Suspense } from 'react';
import VialBatchClient from './VialBatchClient';

export default function NewVialBatchPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading vial batch wizard…</div>}>
      <VialBatchClient />
    </Suspense>
  );
}
