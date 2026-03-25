'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';

interface DashboardStats {
  totalPatients: number;
  activeTreatments: number;
  vialsExpiringSoon: number;
  dosesThisWeek: number;
}

interface ActivityItem {
  id: string;
  timestamp: string;
  type: string;
  patient: string;
  details: string;
  user: string;
}

// Mock data for display
const MOCK_STATS: DashboardStats = {
  totalPatients: 142,
  activeTreatments: 87,
  vialsExpiringSoon: 6,
  dosesThisWeek: 34,
};

const MOCK_ACTIVITY: ActivityItem[] = [
  { id: '1', timestamp: '2026-03-25 14:32', type: 'Dose Administered', patient: 'Johnson, Sarah', details: 'Vial #2 Blue — 0.50 mL', user: 'Dr. Patel' },
  { id: '2', timestamp: '2026-03-25 13:15', type: 'Vial Generated', patient: 'Williams, Robert', details: '4 vials generated — Build-Up set', user: 'Nurse Chen' },
  { id: '3', timestamp: '2026-03-25 11:48', type: 'Patient Added', patient: 'Martinez, Elena', details: 'New patient enrolled', user: 'Dr. Thompson' },
  { id: '4', timestamp: '2026-03-25 10:20', type: 'Reaction Recorded', patient: 'Davis, Michael', details: 'Local reaction — Week 8 dose', user: 'Nurse Kim' },
  { id: '5', timestamp: '2026-03-25 09:05', type: 'Vial Expiry Alert', patient: 'Anderson, Lisa', details: 'Silver vial expires in 7 days', user: 'System' },
  { id: '6', timestamp: '2026-03-24 16:40', type: 'Dose Administered', patient: 'Brown, James', details: 'Vial #3 Yellow — 0.45 mL', user: 'Dr. Patel' },
  { id: '7', timestamp: '2026-03-24 15:22', type: 'Allergen Updated', patient: '—', details: 'Grass pollen lot #GP-2024-88 added', user: 'Admin' },
];

const typeColors: Record<string, string> = {
  'Dose Administered': '#0055a5',
  'Vial Generated': '#2e7d32',
  'Patient Added': '#6a1b9a',
  'Reaction Recorded': '#c62828',
  'Vial Expiry Alert': '#f57c00',
  'Allergen Updated': '#00695c',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Try API first, fall back to mock
        const res = await fetch('/api/dashboard').catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setActivity(data.activity || []);
        } else {
          setStats(MOCK_STATS);
          setActivity(MOCK_ACTIVITY);
        }
      } catch {
        setStats(MOCK_STATS);
        setActivity(MOCK_ACTIVITY);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <>
      <TopBar
        title="Dashboard"
        breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Dashboard' }]}
        actions={
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        }
      />
      <div className="page-content">
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Loading dashboard…
          </div>
        )}

        {!loading && error && (
          <div style={{ background: '#ffebee', color: '#c62828', padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        {!loading && stats && (
          <>
            {/* KPI Tiles */}
            <div className="kpi-grid">
              <div className="kpi-tile">
                <div className="kpi-label">Total Patients</div>
                <div className="kpi-value">{stats.totalPatients}</div>
                <div className="kpi-sub">Enrolled in IMS</div>
              </div>
              <div className="kpi-tile">
                <div className="kpi-label">Active Treatments</div>
                <div className="kpi-value" style={{ color: '#2e7d32' }}>{stats.activeTreatments}</div>
                <div className="kpi-sub">Build-Up + Maintenance</div>
              </div>
              <div className="kpi-tile">
                <div className="kpi-label">Vials Due to Expire</div>
                <div className="kpi-value" style={{ color: stats.vialsExpiringSoon > 3 ? '#c62828' : '#f57c00' }}>
                  {stats.vialsExpiringSoon}
                </div>
                <div className="kpi-sub">Within 30 days</div>
              </div>
              <div className="kpi-tile">
                <div className="kpi-label">Doses This Week</div>
                <div className="kpi-value" style={{ color: '#0055a5' }}>{stats.dosesThisWeek}</div>
                <div className="kpi-sub">Administered Mon–Sun</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card" style={{ padding: 0 }}>
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #d1d5db',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>Recent Activity</h2>
                <span style={{ fontSize: 11, color: '#6b7280' }}>{activity.length} events</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="clinical-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Type</th>
                      <th>Patient</th>
                      <th>Details</th>
                      <th>User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap', color: '#6b7280' }}>
                          {item.timestamp}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: typeColors[item.type] || '#374151',
                              background: `${typeColors[item.type] || '#374151'}15`,
                              padding: '2px 7px',
                            }}
                          >
                            {item.type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500 }}>{item.patient}</td>
                        <td style={{ color: '#4b5563', fontSize: 12 }}>{item.details}</td>
                        <td style={{ color: '#6b7280', fontSize: 12 }}>{item.user}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
