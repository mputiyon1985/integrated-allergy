'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import TopBar from '@/components/layout/TopBar';
import { KpiCard } from '@/components/dashboard/KpiCard';
import type { DashboardStats, KpiDef } from '@/components/dashboard/types';

// Dynamically imported so react-grid-layout (and its useContainerWidth hook)
// only runs on the client — avoids SSR issues.
const DraggableKpiGrid = dynamic(
  () => import('@/components/dashboard/DraggableKpiGrid'),
  { ssr: false }
);

const MOCK_STATS: DashboardStats = {
  totalPatients: 0,
  activeTreatments: 0,
  vialsExpiringSoon: 0,
  dosesThisWeek: 0,
  shotsToday: 0,
  testsToday: 0,
  evalsToday: 0,
  activeDoctors: 0,
  activeNurses: 0,
};

const typeColors: Record<string, string> = {
  'Dose Administered':   '#0055a5',
  'Vials Generated':     '#2e7d32',
  'Patient Created':     '#6a1b9a',
  'Patient Added':       '#6a1b9a',
  'Reaction Recorded':   '#c62828',
  'Vial Expiry Alert':   '#f57c00',
  'Allergen Updated':    '#00695c',
  'Allergen Added':      '#00695c',
  'Patient Updated':     '#1565c0',
  'Appointment Created': '#0097a7',
  'Appointment Updated': '#0097a7',
  'vial_batch_created':  '#2e7d32',
};

// --- Layout persistence ---
const LAYOUT_KEY = 'ia-dashboard-layout';

function isBrowser() {
  return typeof window !== 'undefined';
}

const DEFAULT_LAYOUT = {
  lg: [
    { i: 'patients',  x: 0, y: 0, w: 2, h: 3 },
    { i: 'active',    x: 2, y: 0, w: 2, h: 3 },
    { i: 'expiring',  x: 4, y: 0, w: 2, h: 3 },
    { i: 'doses',     x: 6, y: 0, w: 2, h: 3 },
    { i: 'shots',     x: 0, y: 3, w: 2, h: 3 },
    { i: 'tests',     x: 2, y: 3, w: 2, h: 3 },
    { i: 'evals',     x: 4, y: 3, w: 2, h: 3 },
    { i: 'doctors',   x: 6, y: 3, w: 2, h: 3 },
    { i: 'nurses',    x: 0, y: 6, w: 2, h: 3 },
  ],
  md: [
    { i: 'patients',  x: 0, y: 0, w: 2, h: 3 },
    { i: 'active',    x: 2, y: 0, w: 2, h: 3 },
    { i: 'expiring',  x: 4, y: 0, w: 2, h: 3 },
    { i: 'doses',     x: 0, y: 3, w: 2, h: 3 },
    { i: 'shots',     x: 2, y: 3, w: 2, h: 3 },
    { i: 'tests',     x: 4, y: 3, w: 2, h: 3 },
    { i: 'evals',     x: 0, y: 6, w: 2, h: 3 },
    { i: 'doctors',   x: 2, y: 6, w: 2, h: 3 },
    { i: 'nurses',    x: 4, y: 6, w: 2, h: 3 },
  ],
  sm: [
    { i: 'patients',  x: 0, y: 0,  w: 2, h: 3 },
    { i: 'active',    x: 2, y: 0,  w: 2, h: 3 },
    { i: 'expiring',  x: 0, y: 3,  w: 2, h: 3 },
    { i: 'doses',     x: 2, y: 3,  w: 2, h: 3 },
    { i: 'shots',     x: 0, y: 6,  w: 2, h: 3 },
    { i: 'tests',     x: 2, y: 6,  w: 2, h: 3 },
    { i: 'evals',     x: 0, y: 9,  w: 2, h: 3 },
    { i: 'doctors',   x: 2, y: 9,  w: 2, h: 3 },
    { i: 'nurses',    x: 0, y: 12, w: 2, h: 3 },
  ],
};

function loadLayout() {
  try {
    if (!isBrowser()) return DEFAULT_LAYOUT;
    const s = localStorage.getItem(LAYOUT_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return DEFAULT_LAYOUT;
}

function saveLayout(layouts: object) {
  try {
    if (!isBrowser()) return;
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layouts));
  } catch {}
}

const KPI_DEFS: KpiDef[] = [
  {
    id: 'patients',
    href: '/patients',
    label: 'Total Patients',
    icon: '🧑‍🤝‍🧑',
    getValue: (s) => s.totalPatients,
    sub: 'Enrolled in IMS',
    color: '#0055a5',
  },
  {
    id: 'active',
    href: '/patients',
    label: 'Active Treatments',
    icon: '💉',
    getValue: (s) => s.activeTreatments,
    sub: 'Build-Up + Maintenance',
    color: '#2e7d32',
  },
  {
    id: 'expiring',
    href: '/vial-prep',
    label: 'Vials Due to Expire',
    icon: '⚠️',
    getValue: (s) => s.vialsExpiringSoon,
    sub: 'Within 30 days',
    color: '#f57c00',
    danger: (s) => s.vialsExpiringSoon > 3,
  },
  {
    id: 'doses',
    href: '/dosing',
    label: 'Doses This Week',
    icon: '📅',
    getValue: (s) => s.dosesThisWeek,
    sub: 'Administered Mon–Sun',
    color: '#0055a5',
  },
  {
    id: 'shots',
    href: '/calendar',
    label: 'Shots Today',
    icon: '🩺',
    getValue: (s) => s.shotsToday,
    sub: 'Appointments today',
    color: '#1565c0',
  },
  {
    id: 'tests',
    href: '/calendar',
    label: 'Tests Today',
    icon: '🔬',
    getValue: (s) => s.testsToday,
    sub: 'Skin tests today',
    color: '#2e7d32',
    note: (s) => (s.testsToday === 0 ? 'via calendar' : undefined),
  },
  {
    id: 'evals',
    href: '/calendar',
    label: 'Evals Today',
    icon: '📋',
    getValue: (s) => s.evalsToday,
    sub: 'Evaluations today',
    color: '#6a1b9a',
    note: (s) => (s.evalsToday === 0 ? 'via calendar' : undefined),
  },
  {
    id: 'doctors',
    href: '/doctors',
    label: '# of Doctors',
    icon: '👨‍⚕️',
    getValue: (s) => s.activeDoctors,
    sub: 'Active physicians',
    color: '#0097a7',
  },
  {
    id: 'nurses',
    href: '/nurses',
    label: '# of Nurses',
    icon: '👩‍⚕️',
    getValue: (s) => s.activeNurses,
    sub: 'Active nursing staff',
    color: '#00695c',
  },
];

interface ActivityItem {
  id: string;
  timestamp: string;
  type: string;
  patient: string;
  details: string;
  user: string;
}

export default function DashboardPage() {
  const [stats, setStats]       = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [layouts, setLayouts]   = useState<object>(DEFAULT_LAYOUT);
  const [mounted, setMounted]   = useState(false);

  useEffect(() => {
    setLayouts(loadLayout());
    setMounted(true);
  }, []);

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

  const handleLayoutChange = useCallback((_layout: unknown, allLayouts: object) => {
    setLayouts(allLayouts);
    saveLayout(allLayouts);
  }, []);

  const handleReset = () => {
    setLayouts(DEFAULT_LAYOUT);
    saveLayout(DEFAULT_LAYOUT);
  };

  return (
    <>
      <TopBar
        title="Dashboard"
        breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Dashboard' }]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {editMode && (
              <button
                onClick={handleReset}
                style={{
                  fontSize: 12,
                  padding: '4px 12px',
                  background: '#fff',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: '#374151',
                  fontWeight: 500,
                }}
              >
                ↺ Reset Layout
              </button>
            )}
            <button
              onClick={() => setEditMode((e) => !e)}
              style={{
                fontSize: 12,
                padding: '4px 12px',
                background: editMode ? '#F59E0B' : '#fff',
                border: `1px solid ${editMode ? '#F59E0B' : '#d1d5db'}`,
                borderRadius: 6,
                cursor: 'pointer',
                color: editMode ? '#fff' : '#374151',
                fontWeight: 600,
                transition: 'all 0.15s',
              }}
            >
              ✏️ {editMode ? 'Done Editing' : 'Edit Layout'}
            </button>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        }
      />

      <div className="page-content">
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Loading dashboard…
          </div>
        )}

        {!loading && stats && (
          <>
            {editMode && (
              <div
                style={{
                  marginBottom: 12,
                  padding: '8px 14px',
                  background: '#fffbeb',
                  border: '1px solid #F59E0B',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#92400e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 18 }}>⠿</span>
                <span>
                  <strong>Edit mode active</strong> — drag tiles to rearrange, resize from the
                  bottom-right corner. Layout saves automatically.
                </span>
              </div>
            )}

            {/* Draggable KPI grid (client-only) */}
            <div style={{ marginBottom: 24 }}>
              {mounted ? (
                <DraggableKpiGrid
                  stats={stats}
                  kpiDefs={KPI_DEFS}
                  layouts={layouts}
                  editMode={editMode}
                  onLayoutChange={handleLayoutChange}
                />
              ) : (
                /* SSR / pre-mount: plain static grid */
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 16,
                  }}
                >
                  {KPI_DEFS.map((def) => {
                    const value      = def.getValue(stats);
                    const isDanger   = def.danger ? def.danger(stats) : false;
                    const note       = def.note ? def.note(stats) : undefined;
                    const valueColor = isDanger
                      ? value > 3 ? '#c62828' : '#f57c00'
                      : def.color;
                    return (
                      <div key={def.id} style={{ height: 130 }}>
                        <KpiCard
                          label={def.label}
                          icon={def.icon}
                          value={value}
                          sub={def.sub}
                          note={note}
                          valueColor={valueColor}
                          editMode={false}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Activity — stays below grid, not draggable */}
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
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>
                  Recent Activity
                </h2>
                <span style={{ fontSize: 11, color: '#6b7280' }}>{activity.length} events</span>
              </div>
              {activity.length === 0 ? (
                <div
                  style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}
                >
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
                          <td
                            style={{
                              fontFamily: 'monospace',
                              fontSize: 12,
                              whiteSpace: 'nowrap',
                              color: '#6b7280',
                            }}
                          >
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
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
