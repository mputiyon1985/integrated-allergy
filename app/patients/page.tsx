'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopBar from '@/components/layout/TopBar';

interface Patient {
  id: string;
  name: string;
  dob: string;
  physician: string;
  diagnosis: string;
  status: string;
  patientId: string;
}

const statusClass: Record<string, string> = {
  'Build-Up': 'badge badge-buildup',
  'Maintenance': 'badge badge-maintenance',
  'Complete': 'badge badge-complete',
  'Inactive': 'badge badge-inactive',
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filtered, setFiltered] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/patients').catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          setPatients(data.patients || data);
        } else {
          setError('Failed to load patients from the database.');
        }
      } catch {
        setError('Network error — could not reach the database.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(patients);
    } else {
      const q = search.toLowerCase();
      setFiltered(
        patients.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.patientId.toLowerCase().includes(q) ||
            p.physician.toLowerCase().includes(q) ||
            p.diagnosis.toLowerCase().includes(q)
        )
      );
    }
  }, [search, patients]);

  return (
    <>
      <TopBar
        title="Patients"
        breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Patients' }]}
        actions={
          <Link href="/patients/new" className="btn btn-primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Patient
          </Link>
        }
      />
      <div className="page-content">
        {/* Search + filters bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div className="search-bar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search patients by name, ID, physician…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            {filtered.length} patient{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Loading patients…
          </div>
        )}

        {!loading && error && (
          <div style={{ background: '#ffebee', color: '#c62828', padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        {!loading && (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="clinical-table">
                <thead>
                  <tr>
                    <th>Patient ID</th>
                    <th>Name</th>
                    <th>DOB</th>
                    <th>Physician</th>
                    <th>Diagnosis</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                        {search.trim()
                          ? 'No patients match your search.'
                          : 'No patients found — add your first patient.'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((patient) => (
                      <tr key={patient.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>
                          {patient.patientId}
                        </td>
                        <td style={{ fontWeight: 600 }}>{patient.name}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{patient.dob}</td>
                        <td>{patient.physician}</td>
                        <td style={{ color: '#4b5563' }}>{patient.diagnosis}</td>
                        <td>
                          <span className={statusClass[patient.status] || 'badge badge-inactive'}>
                            {patient.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <Link
                              href={`/patients/${patient.id}`}
                              className="btn btn-secondary btn-sm"
                            >
                              View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
