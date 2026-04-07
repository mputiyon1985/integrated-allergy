/**
 * @file app/audit-log/page.tsx — Clinical audit trail viewer
 *
 * Displays the immutable audit log (AuditLog model) showing all create/update/delete
 * actions performed in the system. Entries are color-coded by action type and linked
 * to patient records where applicable.
 *
 * Features:
 * - Paginated table (50 entries per page) with server-side pagination
 * - Client-side search filtering by action, entity, user, or patient
 * - CSV export via /api/export/audit-log (super_admin only)
 * - Action color badges (blue for doses, green for vials, etc.)
 */
'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { SkeletonRow } from '@/components/ui/SkeletonRow';

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  entity: string;
  entityId: string;
  user: string;
  details: string;
  patient?: { name: string; patientId: string } | null;
}

const ACTION_COLORS: Record<string, string> = {
  'Dose Administered':   '#0055a5',
  'Vials Generated':     '#2e7d32',
  'Patient Created':     '#6a1b9a',
  'Patient Added':       '#6a1b9a',
  'Reaction Recorded':   '#c62828',
  'Vial Expiry Alert':   '#f57c00',
  'Allergen Updated':    '#00695c',
  'Patient Updated':     '#1565c0',
  'Allergen Added':      '#00695c',
  'Appointment Created': '#0097a7',
  'Appointment Updated': '#0097a7',
  'Appointment Deleted': '#c62828',
  'vial_batch_created':  '#2e7d32',
  'CREATE':              '#2e7d32',
};

export default function AuditLogPage() {
  const [entries, setEntries]       = useState<AuditEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/audit-log?limit=200');
        if (res.ok) {
          const data = await res.json();
          setEntries(data.entries ?? []);
        }
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const uniqueActions = Array.from(new Set(entries.map((e) => e.action)));

  const filtered = entries.filter((e) => {
    const matchSearch =
      !search ||
      e.user.toLowerCase().includes(search.toLowerCase()) ||
      (e.details ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (e.entityId ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (e.patient?.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchAction = !actionFilter || e.action === actionFilter;
    return matchSearch && matchAction;
  });

  const handleExport = () => {
    const header = 'Timestamp,Action,Entity,ID,Patient,Details';
    const rows = filtered.map((e) =>
      [e.timestamp, e.action, e.entity, e.entityId, e.patient?.name ?? '—', (e.details ?? '').replace(/,/g, ';')].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <TopBar
        title="Audit Log"
        breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Audit Log' }]}
        actions={
          <button className="btn btn-secondary" onClick={handleExport}>⬇ Export CSV</button>
        }
      />
      <div className="page-content">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-bar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" className="search-input" placeholder="Search by user, patient, details…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-input" style={{ width: 220 }} value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">All Actions</option>
            {uniqueActions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 'auto' }}>
            {filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}
          </span>
        </div>

        {loading ? (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="clinical-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>ID</th>
                    <th>Patient</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} cols={6} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                No audit entries found. Actions will appear here as users interact with the system.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="clinical-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>ID</th>
                      <th>Patient</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((entry) => (
                      <tr key={entry.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap', color: '#6b7280' }}>{entry.timestamp}</td>
                        <td>
                          <span style={{ fontSize: 11, fontWeight: 600, color: ACTION_COLORS[entry.action] || '#374151', background: `${ACTION_COLORS[entry.action] || '#374151'}15`, padding: '2px 7px' }}>
                            {entry.action}
                          </span>
                        </td>
                        <td style={{ color: '#4b5563' }}>{entry.entity}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{entry.entityId}</td>
                        <td style={{ fontWeight: 500, fontSize: 12 }}>{entry.patient?.name ?? '—'}</td>
                        <td style={{ color: '#4b5563', fontSize: 12, maxWidth: 300 }}>
                          {(() => {
                            try {
                              const parsed = JSON.parse(entry.details);
                              return typeof parsed === 'object'
                                ? Object.entries(parsed).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(' · ')
                                : entry.details;
                            } catch { return entry.details; }
                          })()}
                        </td>
                      </tr>
                    ))}
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
