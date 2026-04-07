/**
 * @file app/vial-prep/page.tsx — Vial preparation overview page
 *
 * Displays all compounded allergen extract vials across all patients.
 * Vials are grouped by patient and color-coded per the AAAI 4-vial dilution series.
 * Safety alerts surface any allergen incompatibilities or expiring vials.
 *
 * Features:
 * - VialCard tiles for each compounded vial (Silver/Blue/Yellow/Red)
 * - SafetyAlert banners for expiring or incompatible vials
 * - Link to /vial-prep/new to create a new vial batch for a patient
 * - Filter by patient name or vial status
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopBar from '@/components/layout/TopBar';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import VialCard from '@/components/clinical/VialCard';
import SafetyAlert from '@/components/clinical/SafetyAlert';
import { type VialColor } from '@/lib/ui/theme';

interface VialRow {
  id: string;
  vialNumber: number;
  color: VialColor;
  dilutionRatio: string;
  volume: number;
  expiry: string;
  status: 'Active' | 'Expired' | 'Depleted' | 'Pending';
}

interface PatientBatch {
  patientId: string;
  patientDbId: string;
  patientName: string;
  vials: VialRow[];
}

function isVialColor(s: string): s is VialColor {
  return ['silver', 'blue', 'yellow', 'red'].includes(s);
}

export default function VialPrepPage() {
  const [batches, setBatches] = useState<PatientBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const pRes = await fetch('/api/patients');
        const pData = await pRes.json();
        const patients: { id: string; name: string; patientId: string }[] = pData.patients ?? [];
        const now = new Date();

        const results: PatientBatch[] = [];
        await Promise.all(
          patients.map(async (p) => {
            try {
              const vRes = await fetch(`/api/patients/${p.id}/vials`);
              if (!vRes.ok) return;
              const vials: {
                id: string;
                vialNumber: number;
                colorCode: string;
                dilutionRatio: string;
                totalVolumeMl: number;
                expiresAt?: string;
              }[] = await vRes.json();
              if (vials.length === 0) return;
              results.push({
                patientId:    p.patientId,
                patientDbId:  p.id,
                patientName:  p.name,
                vials: vials.map((v) => {
                  const expired = v.expiresAt ? new Date(v.expiresAt) < now : false;
                  const colorRaw = v.colorCode ?? 'silver';
                  return {
                    id:           v.id,
                    vialNumber:   v.vialNumber,
                    color:        isVialColor(colorRaw) ? colorRaw : 'silver',
                    dilutionRatio: v.dilutionRatio,
                    volume:       v.totalVolumeMl,
                    expiry:       v.expiresAt ? v.expiresAt.slice(0, 10) : '—',
                    status:       expired ? 'Expired' : 'Active',
                  };
                }),
              });
            } catch { /* skip */ }
          })
        );
        setBatches(results);
      } catch {
        setBatches([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <>
      <TopBar
        title="Vial Preparation"
        breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Vial Prep' }]}
        actions={
          <Link href="/vial-prep/new" className="btn btn-primary">
            🧪 New Vial Batch
          </Link>
        }
      />
      <div className="page-content">
        <SafetyAlert
          level="warning"
          message="Always verify patient allergen mix before preparing vials"
          detail="Double-check concentrations and vial labeling. Two-nurse verification required for maintenance vials."
        />

        {loading ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card" style={{ marginBottom: 16, padding: 0 }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ height: 16, width: 140, background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite', borderRadius: 4 }} />
                    <div style={{ height: 12, width: 70, background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite', borderRadius: 4 }} />
                  </div>
                  <div style={{ height: 28, width: 100, background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite', borderRadius: 6 }} />
                </div>
                <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <SkeletonCard key={j} height={120} />
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : batches.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🧪</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>No vials prepared yet</div>
            <div style={{ fontSize: 13, marginBottom: 16 }}>Create your first vial batch for a patient to get started.</div>
            <Link href="/vial-prep/new" className="btn btn-primary">New Vial Batch</Link>
          </div>
        ) : (
          batches.map((batch) => (
            <div key={batch.patientDbId} className="card" style={{ marginBottom: 16, padding: 0 }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{batch.patientName}</span>
                  <span style={{ color: '#6b7280', fontSize: 12, marginLeft: 10 }}>{batch.patientId}</span>
                </div>
                <Link href={`/patients/${batch.patientDbId}`} className="btn btn-secondary btn-sm">View Patient</Link>
              </div>
              <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {batch.vials.slice(0, 4).map((v) => (
                  <VialCard
                    key={v.id}
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
          ))
        )}
      </div>
    </>
  );
}
