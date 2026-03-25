'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';

interface DashboardStats {
  totalPatients: number;
  activeTreatments: number;
  vialsExpiringSoon: number;
  dosesThisWeek: number;
  shotsToday: number;
  testsToday: number;
  evalsToday: number;
}

interface ActivityItem {
  id: string;
  timestamp: string;
  type: string;
  patient: string;
  details: string;
  user: string;
}

const MOCK_STATS: DashboardStats = {
  totalPatients: 0,
  activeTreatments: 0,
  vialsExpiringSoon: 0,
  dosesThisWeek: 0,
  shotsToday: 0,
  testsToday: 0,
  evalsToday: 0,
};

const typeColors: Record<string, string> = {
  'Dose Administered':    '#0055a5',
  'Vials Generated':      '#2e7d32',
  'Patient Created':      '#6a1b9a',
  'Patient Added':        '#6a1b9a',
  'Reaction Recorded':    '#c62828',
  'Vial Expiry Alert':    '#f57c00',
  'Allergen Updated':     '#00695c',
  'Allergen Added':       '#00695c',
  'Patient Updated':      '#1565c0',
  'Appointment Created':  '#0097a7',
  'Appointment Updated':  '#0097a7',
  'vial_batch_created':   '#2e7d32',
};

interface KpiTile {
  label: string;
  value: number;
  sub: string;
  color?: string;
  danger?: boolean;
  note?: string;
}

export default function DashboardPage() {
  const [stats, setStats]     = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/dashboard').catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          setStats(data.stats ?? MOCK_STATS);
          setActivity(data.activity ?? []);
        } else {
          setStats(MOCK_STATS);
        }
      } catch {
        setStats(MOCK_STATS);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const tiles: KpiTile[] = stats
    ? [
        { label: 'Total Patients',      value: stats.totalPatients,     sub: 'Enrolled in IMS',       color: '#0055a5' },
        { label: 'Active Treatments',   value: stats.activeTreatments,  sub: 'Build-Up + Maintenance', color: '#2e7d32' },
        { label: 'Vials Due to Expire', value: stats.vialsExpiringSoon, sub: 'Within 30 days',         danger: stats.vialsExpiringSoon > 3 },
        { label: 'Doses This Week',     value: stats.dosesThisWeek,     sub: 'Administered Mon–Sun',   color: '#0055a5' },
        { label: 'Shots Today',         value: stats.shotsToday,        sub: 'Appointments today',     color: '#1565c0' },
        { label: 'Tests Today',         value: stats.testsToday,        sub: 'Skin tests today',       color: '#2e7d32', note: stats.testsToday === 0 ? 'via calendar' : undefined },
        { label: 'Evals Today',         value: stats.evalsToday,        sub: 'Evaluations today',      color: '#6a1b9a', note: stats.evalsToday === 0 ? 'via calendar' : undefined },
      ]
    : [];

  return (
    <>
      <TopBar
        title="Dashboard"
        breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Dashboard' }]}
        actions={<span style={{ fontSize: 12, color: '#6b7280' }}>Last updated: {new Date().toLocaleTimeString()}</span>}
      />
      <div className="page-content">
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading dashboard…</div>
        )}

        {!loading && stats && (
          <>
            {/* KPI grid — 7 tiles, 4 on first row, 3 on second */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
              {tiles.slice(0, 4).map((t) => <KpiCard key={t.label} tile={t} />)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
              {tiles.slice(4).map((t) => <KpiCard key={t.label} tile={t} />)}
            </div>

            {/* Recent Activity */}
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>Recent Activity</h2>
                <span style={{ fontSize: 11, color: '#6b7280' }}>{activity.length} events</span>
              </div>
              {activity.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  No activity yet — create patients and appointments to see events here.
                </div>
              ) : (
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
                          <td style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap', color: '#6b7280' }}>{item.timestamp}</td>
                          <td>
                            <span style={{ fontSize: 11, fontWeight: 600, color: typeColors[item.type] || '#374151', background: `${typeColors[item.type] || '#374151'}15`, padding: '2px 7px' }}>
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
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function KpiCard({ tile }: { tile: KpiTile }) {
  const valueColor = tile.danger
    ? tile.value > 3 ? '#c62828' : '#f57c00'
    : tile.color ?? '#0055a5';

  return (
    <div className="kpi-tile">
      <div className="kpi-label">{tile.label}</div>
      <div className="kpi-value" style={{ color: valueColor }}>{tile.value}</div>
      <div className="kpi-sub">
        {tile.sub}
        {tile.note && <span style={{ marginLeft: 4, color: '#9ca3af', fontStyle: 'italic' }}>({tile.note})</span>}
      </div>
    </div>
  );
}
