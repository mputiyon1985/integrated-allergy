'use client';

import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import DosingTable, { DosingRow } from '@/components/clinical/DosingTable';

const MOCK_SCHEDULE: (DosingRow & { patient: string; patientId: string })[] = [
  { id: 'd1', week: 7, vial: 'Silver #1', dose: 0.50, phase: 'Build-Up', status: 'Scheduled', patient: 'Johnson, Sarah', patientId: 'PA-001' },
  { id: 'd2', week: 8, vial: 'Blue #2', dose: 0.05, phase: 'Build-Up', status: 'Scheduled', patient: 'Johnson, Sarah', patientId: 'PA-001' },
  { id: 'd3', week: 4, vial: 'Red #4', dose: 0.50, phase: 'Maintenance', status: 'Scheduled', patient: 'Williams, Robert', patientId: 'PA-002' },
  { id: 'd4', week: 5, vial: 'Yellow #3', dose: 0.40, phase: 'Build-Up', status: 'Scheduled', patient: 'Martinez, Elena', patientId: 'PA-003' },
  { id: 'd5', week: 12, vial: 'Red #4', dose: 0.50, phase: 'Maintenance', status: 'Scheduled', patient: 'Davis, Michael', patientId: 'PA-004' },
];

export default function DosingPage() {
  const [rows, setRows] = useState(MOCK_SCHEDULE);
  const [filterPatient, setFilterPatient] = useState('');

  const handleUpdate = (id: string, field: 'reaction' | 'notes', value: string) => {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const filtered = filterPatient
    ? rows.filter((r) => r.patientId === filterPatient)
    : rows;

  const patients = Array.from(new Set(rows.map((r) => r.patientId))).map((id) => {
    const r = rows.find((row) => row.patientId === id)!;
    return { id, name: r.patient };
  });

  return (
    <>
      <TopBar
        title="Dosing Schedule"
        breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Dosing' }]}
        actions={
          <button className="btn btn-primary">
            + Record Dose
          </button>
        }
      />
      <div className="page-content">
        {/* Filter */}
        <div style={{ marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Filter by Patient:</label>
          <select
            className="form-input"
            style={{ width: 220 }}
            value={filterPatient}
            onChange={(e) => setFilterPatient(e.target.value)}
          >
            <option value="">All Patients</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 'auto' }}>
            {filtered.length} scheduled dose{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="clinical-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>ID</th>
                  <th>Week</th>
                  <th>Vial</th>
                  <th>Dose (mL)</th>
                  <th>Phase</th>
                  <th>Status</th>
                  <th>Reaction</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const statusStyle: Record<string, { bg: string; color: string }> = {
                    Scheduled: { bg: '#e3f2fd', color: '#1565c0' },
                    Completed: { bg: '#e8f5e9', color: '#2e7d32' },
                    Skipped: { bg: '#f5f5f5', color: '#616161' },
                    Reacted: { bg: '#ffebee', color: '#c62828' },
                  };
                  const st = statusStyle[row.status] || statusStyle.Scheduled;
                  return (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 500 }}>{row.patient}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{row.patientId}</td>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
