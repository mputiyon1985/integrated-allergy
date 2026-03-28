'use client';

import { useEffect, useState, useCallback } from 'react';
import TopBar from '@/components/layout/TopBar';
import { SkeletonRow } from '@/components/ui/SkeletonRow';

interface DosingRow {
  id: string;
  patientId: string;
  patient: string;
  week: number;
  vial: string;
  dose: number;
  phase: string;
  status: string;
  reaction?: string;
  notes?: string;
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Scheduled:  { bg: '#e3f2fd', color: '#1565c0' },
  Completed:  { bg: '#e8f5e9', color: '#2e7d32' },
  Skipped:    { bg: '#f5f5f5', color: '#616161' },
  Reacted:    { bg: '#ffebee', color: '#c62828' },
};

export default function DosingPage() {
  const [rows, setRows]           = useState<DosingRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filterPatient, setFilterPatient] = useState('');
  const [administeringId, setAdministeringId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Fetch all patients, then their dosing schedules
        const pRes = await fetch('/api/patients');
        const pData = await pRes.json();
        const patients: { id: string; name: string; patientId: string }[] = pData.patients ?? [];

        const allRows: DosingRow[] = [];
        await Promise.all(
          patients.map(async (p) => {
            try {
              const sRes = await fetch(`/api/patients/${p.id}/schedule`);
              if (!sRes.ok) return;
              const schedules: {
                id: string;
                weekNumber: number;
                doseMl: number;
                phase: string;
                administered: boolean;
                reaction?: string;
                notes?: string;
                vial?: { vialNumber: number; colorCode: string };
              }[] = await sRes.json();
              schedules.forEach((s) => {
                allRows.push({
                  id: s.id,
                  patientId: p.id,
                  patient: p.name,
                  week: s.weekNumber,
                  vial: s.vial
                    ? `${capitalize(s.vial.colorCode)} #${s.vial.vialNumber}`
                    : '—',
                  dose: s.doseMl,
                  phase: capitalize(s.phase),
                  status: s.administered ? 'Completed' : 'Scheduled',
                  reaction: s.reaction ?? '',
                  notes: s.notes ?? '',
                });
              });
            } catch { /* skip patient */ }
          })
        );
        setRows(allRows);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAdminister = useCallback(async (row: DosingRow) => {
    if (row.status === 'Completed') return;
    setAdministeringId(row.id);
    // Optimistic update
    setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, status: 'Completed' } : r));
    try {
      const res = await fetch(`/api/patients/${row.patientId}/schedule/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ administered: true }),
      });
      if (!res.ok) {
        // Revert on failure
        setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, status: 'Scheduled' } : r));
      }
    } catch {
      setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, status: 'Scheduled' } : r));
    } finally {
      setAdministeringId(null);
    }
  }, []);

  const uniquePatients = Array.from(new Map(rows.map((r) => [r.patientId, { id: r.patientId, name: r.patient }])).values());
  const filtered = filterPatient ? rows.filter((r) => r.patientId === filterPatient) : rows;

  return (
    <>
      <TopBar
        title="Today's Doses"
        breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: "Today's Doses" }]}
        actions={<button className="btn btn-primary">+ Record Dose</button>}
      />
      <div className="page-content">
        {/* Filter */}
        <div style={{ marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Filter by Patient:</label>
          <select className="form-input" style={{ width: 240 }} value={filterPatient} onChange={(e) => setFilterPatient(e.target.value)}>
            <option value="">All Patients</option>
            {uniquePatients.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 'auto' }}>
            {filtered.length} dose{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="clinical-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Week</th>
                    <th>Vial</th>
                    <th>Dose (mL)</th>
                    <th>Phase</th>
                    <th>Status</th>
                    <th>Reaction</th>
                    <th>Notes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} cols={9} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                No dosing records found. Generate vials and a build-up schedule from the patient detail page.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="clinical-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Week</th>
                      <th>Vial</th>
                      <th>Dose (mL)</th>
                      <th>Phase</th>
                      <th>Status</th>
                      <th>Reaction</th>
                      <th>Notes</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => {
                      const isCompleted = row.status === 'Completed';
                      const st = STATUS_STYLE[row.status] ?? STATUS_STYLE.Scheduled;
                      return (
                        <tr key={row.id} style={{ background: isCompleted ? '#f0fff4' : undefined }}>
                          <td style={{ fontWeight: 500 }}>{row.patient}</td>
                          <td style={{ fontWeight: 600 }}>Week {row.week}</td>
                          <td>{row.vial}</td>
                          <td style={{ fontFamily: 'monospace' }}>{row.dose.toFixed(2)}</td>
                          <td>{row.phase}</td>
                          <td>
                            <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {row.status}
                            </span>
                          </td>
                          <td style={{ color: '#9ca3af', fontSize: 12 }}>{row.reaction || '—'}</td>
                          <td style={{ color: '#9ca3af', fontSize: 12 }}>{row.notes || '—'}</td>
                          <td>
                            {isCompleted ? (
                              <span style={{ fontSize: 11, color: '#2e7d32', fontWeight: 700 }}>✓ Done</span>
                            ) : (
                              <button
                                onClick={() => handleAdminister(row)}
                                disabled={administeringId === row.id}
                                style={{
                                  background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 6,
                                  padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                  opacity: administeringId === row.id ? 0.6 : 1,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {administeringId === row.id ? '…' : '✓ Administer'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
