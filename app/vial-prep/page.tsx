'use client';

import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import VialCard from '@/components/clinical/VialCard';
import SafetyAlert from '@/components/clinical/SafetyAlert';
import { type VialColor } from '@/lib/ui/theme';

interface VialBatch {
  patientId: string;
  patientName: string;
  vials: {
    vialNumber: number;
    color: VialColor;
    dilutionRatio: string;
    volume: number;
    expiry: string;
    status: 'Active' | 'Expired' | 'Depleted' | 'Pending';
  }[];
  preparedDate: string;
  preparedBy: string;
}

const MOCK_BATCHES: VialBatch[] = [
  {
    patientId: 'PA-001',
    patientName: 'Johnson, Sarah M.',
    preparedDate: '2026-03-20',
    preparedBy: 'Nurse Chen',
    vials: [
      { vialNumber: 1, color: 'silver', dilutionRatio: '1:1000', volume: 5.0, expiry: '2026-06-20', status: 'Active' },
      { vialNumber: 2, color: 'blue', dilutionRatio: '1:100', volume: 5.0, expiry: '2026-06-20', status: 'Active' },
      { vialNumber: 3, color: 'yellow', dilutionRatio: '1:10', volume: 5.0, expiry: '2026-06-20', status: 'Active' },
      { vialNumber: 4, color: 'red', dilutionRatio: '1:1', volume: 5.0, expiry: '2026-06-20', status: 'Pending' },
    ],
  },
  {
    patientId: 'PA-002',
    patientName: 'Williams, Robert K.',
    preparedDate: '2026-03-15',
    preparedBy: 'Nurse Kim',
    vials: [
      { vialNumber: 1, color: 'silver', dilutionRatio: '1:1000', volume: 3.2, expiry: '2026-03-28', status: 'Depleted' },
      { vialNumber: 2, color: 'blue', dilutionRatio: '1:100', volume: 5.0, expiry: '2026-06-15', status: 'Active' },
      { vialNumber: 3, color: 'yellow', dilutionRatio: '1:10', volume: 5.0, expiry: '2026-06-15', status: 'Active' },
      { vialNumber: 4, color: 'red', dilutionRatio: '1:1', volume: 5.0, expiry: '2026-06-15', status: 'Active' },
    ],
  },
];

export default function VialPrepPage() {
  const [batches] = useState(MOCK_BATCHES);

  return (
    <>
      <TopBar
        title="Vial Preparation"
        breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Vial Prep' }]}
        actions={
          <button className="btn btn-primary">
            🧪 New Vial Batch
          </button>
        }
      />
      <div className="page-content">
        <SafetyAlert
          level="warning"
          message="Always verify patient allergen mix before preparing vials"
          detail="Double-check concentrations and vial labeling. Two-nurse verification required for maintenance vials."
        />

        {batches.map((batch) => (
          <div key={batch.patientId} className="card" style={{ marginBottom: 16, padding: 0 }}>
            <div
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{batch.patientName}</span>
                <span style={{ color: '#6b7280', fontSize: 12, marginLeft: 10 }}>{batch.patientId}</span>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'right' }}>
                <div>Prepared: {batch.preparedDate}</div>
                <div>By: {batch.preparedBy}</div>
              </div>
            </div>
            <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {batch.vials.map((v) => (
                <VialCard
                  key={v.vialNumber}
                  vialNumber={v.vialNumber}
                  color={v.color}
                  dilutionRatio={v.dilutionRatio}
                  volume={v.volume}
                  expiry={v.expiry}
                  status={v.status}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
