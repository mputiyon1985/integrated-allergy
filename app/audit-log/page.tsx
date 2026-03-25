'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  entity: string;
  entityId: string;
  user: string;
  details: string;
  ipAddress?: string;
}

const MOCK_AUDIT: AuditEntry[] = [
  { id: '1', timestamp: '2026-03-25 14:32:11', action: 'Dose Administered', entity: 'Patient', entityId: 'PA-001', user: 'Dr. Patel', details: 'Blue #2 — 0.50 mL — Week 3', ipAddress: '192.168.1.45' },
  { id: '2', timestamp: '2026-03-25 13:15:44', action: 'Vials Generated', entity: 'Patient', entityId: 'PA-002', user: 'Nurse Chen', details: '4 vials created for Build-Up set', ipAddress: '192.168.1.32' },
  { id: '3', timestamp: '2026-03-25 11:48:03', action: 'Patient Created', entity: 'Patient', entityId: 'PA-008', user: 'Dr. Thompson', details: 'New patient enrolled — Martinez, Elena', ipAddress: '192.168.1.15' },
  { id: '4', timestamp: '2026-03-25 10:20:57', action: 'Reaction Recorded', entity: 'Dosing', entityId: 'DOSE-442', user: 'Nurse Kim', details: 'Local erythema 2cm — Week 8 dose — PA-004', ipAddress: '192.168.1.32' },
  { id: '5', timestamp: '2026-03-25 09:05:22', action: 'Vial Expiry Alert', entity: 'Vial', entityId: 'VL-0021', user: 'System', details: 'Silver vial PA-005 expires in 7 days', ipAddress: '127.0.0.1' },
  { id: '6', timestamp: '2026-03-24 16:40:18', action: 'Dose Administered', entity: 'Patient', entityId: 'PA-006', user: 'Dr. Patel', details: 'Yellow #3 — 0.45 mL — Week 7', ipAddress: '192.168.1.45' },
  { id: '7', timestamp: '2026-03-24 15:22:33', action: 'Allergen Updated', entity: 'Allergen', entityId: 'ALG-012', user: 'Admin', details: 'Grass pollen lot #GP-2024-88 — expiry updated', ipAddress: '192.168.1.10' },
  { id: '8', timestamp: '2026-03-24 14:10:05', action: 'Patient Updated', entity: 'Patient', entityId: 'PA-003', user: 'Dr. Thompson', details: 'Status changed: Build-Up → Maintenance', ipAddress: '192.168.1.15' },
  { id: '9', timestamp: '2026-03-23 11:30:00', action: 'Vials Generated', entity: 'Patient', entityId: 'PA-003', user: 'Nurse Chen', details: '4 maintenance vials prepared', ipAddress: '192.168.1.32' },
  { id: '10', timestamp: '2026-03-22 09:15:44', action: 'Allergen Added', entity: 'Allergen', entityId: 'ALG-015', user: 'Dr. Patel', details: 'Dog Dander added to allergen library', ipAddress: '192.168.1.45' },
];

const ACTION_COLORS: Record<string, string> = {
  'Dose Administered': '#0055a5',
  'Vials Generated': '#2e7d32',
  'Patient Created': '#6a1b9a',
  'Reaction Recorded': '#c62828',
  'Vial Expiry Alert': '#f57c00',
  'Allergen Updated': '#00695c',
  'Patient Updated': '#1565c0',
  'Allergen Added': '#00695c',
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/audit-log').catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          setEntries(data.entries || data);
        } else {
          setEntries(MOCK_AUDIT);
        }
      } catch {
        setEntries(MOCK_AUDIT);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const uniqueActions = Array.from(new Set(entries.map((e) => e.action)));

  const filtered = entries.filter((e) => {
    const matchSearch = !search ||
      e.user.toLowerCase().includes(search.toLowerCase()) ||
      e.details.toLowerCase().includes(search.toLowerCase()) ||
      e.entityId.toLowerCase().includes(search.toLowerCase());
    const matchAction = !actionFilter || e.action === actionFilter;
    return matchSearch && matchAction;
  });

  return (
    <>
      <TopBar
        title="Audit Log"
        breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Audit Log' }]}
        actions={
          <button className="btn btn-secondary">
            ⬇ Export CSV
          </button>
        }
      />
      <div className="page-content">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
          <div className="search-bar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search by user, patient ID, details…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-input"
            style={{ width: 200 }}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            {uniqueActions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 'auto' }}>
            {filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Loading audit log…</div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="clinical-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>ID</th>
                    <th>User</th>
                    <th>Details</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#6b7280' }}>No entries found.</td>
                    </tr>
                  ) : (
                    filtered.map((entry) => (
                      <tr key={entry.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap', color: '#6b7280' }}>
                          {entry.timestamp}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: ACTION_COLORS[entry.action] || '#374151',
                              background: `${ACTION_COLORS[entry.action] || '#374151'}15`,
                              padding: '2px 7px',
                            }}
                          >
                            {entry.action}
                          </span>
                        </td>
                        <td style={{ color: '#4b5563' }}>{entry.entity}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{entry.entityId}</td>
                        <td style={{ fontWeight: 500 }}>{entry.user}</td>
                        <td style={{ color: '#4b5563', fontSize: 12 }}>{entry.details}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#9ca3af' }}>{entry.ipAddress}</td>
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
