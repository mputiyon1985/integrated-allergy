'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Layout, ResponsiveLayouts } from 'react-grid-layout';
import TopBar from '@/components/layout/TopBar';

// Draggable grid — client-only (react-grid-layout uses useContainerWidth)
const DraggableSettingsGrid = dynamic(
  () => import('@/components/settings/DraggableSettingsGrid'),
  { ssr: false }
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface Settings {
  app_title?: string;
  clinic_name?: string;
  tagline?: string;
  version_label?: string;
  notify_email?: string;
  notify_expiry_days?: string;
  notify_doses?: string;
  primary_color?: string;
  sidebar_style?: string;
  date_format?: string;
  default_physician?: string;
  default_location?: string;
  default_vial_expiry_days?: string;
  default_glycerin_pct?: string;
  session_timeout?: string;
  require_confirm_delete?: string;
  audit_log_public?: string;
}

interface Doctor { id: string; name: string; title: string; }
interface LocRow  { id: string; name: string; address: string | null; active: boolean; }
interface DiagRow { id: string; name: string; icdCode: string | null; active: boolean; }
interface TitleRow { id: string; name: string; active: boolean; }

type TileId =
  | 'branding' | 'notifications' | 'appearance' | 'clinic' | 'security' | 'export'
  | 'diagnoses' | 'doctor-titles' | 'nurse-titles'
  | 'entities' | 'entity-locations' | 'users';

// ─── Layout persistence ───────────────────────────────────────────────────────

const LAYOUT_KEY = 'ia-settings-layout-v3';

const ALL_TILE_IDS: TileId[] = [
  'branding', 'notifications', 'appearance', 'clinic', 'security', 'export',
  'diagnoses', 'doctor-titles', 'nurse-titles',
  'entities', 'entity-locations', 'users',
];

function makeDefaultLayouts(ids: TileId[]): ResponsiveLayouts {
  // 3-col desktop grid: each tile is 1 wide, auto height (h=1 for collapsed, grid adjusts)
  const lg  = ids.map((id, i) => ({ i: id, x: i % 3, y: Math.floor(i / 3), w: 1, h: 1 }));
  const md  = ids.map((id, i) => ({ i: id, x: i % 2, y: Math.floor(i / 2), w: 1, h: 1 }));
  const sm  = ids.map((id, i) => ({ i: id, x: 0,     y: i,                 w: 1, h: 1 }));
  const xs  = ids.map((id, i) => ({ i: id, x: 0,     y: i,                 w: 1, h: 1 }));
  return { lg, md, sm, xs };
}

function isBrowser() { return typeof window !== 'undefined'; }

function loadLayouts(ids: TileId[]): ResponsiveLayouts {
  try {
    if (!isBrowser()) return makeDefaultLayouts(ids);
    const s = localStorage.getItem(LAYOUT_KEY);
    if (s) return JSON.parse(s) as ResponsiveLayouts;
  } catch {}
  return makeDefaultLayouts(ids);
}

function saveLayouts(l: ResponsiveLayouts) {
  try { if (isBrowser()) localStorage.setItem(LAYOUT_KEY, JSON.stringify(l)); } catch {}
}

// ─── Save helper ──────────────────────────────────────────────────────────────

async function saveSettings(pairs: Record<string, string>): Promise<void> {
  const body = Object.entries(pairs).map(([key, value]) => ({ key, value }));
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Save failed');
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {children}
    </label>
  );
}

function Input({ value, onChange, type = 'text', placeholder }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <input type={type} className="form-input" value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)} />
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string; }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
      <div onClick={() => onChange(!checked)} style={{
        width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer',
        background: checked ? '#2ec4b6' : '#d1d5db', transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18,
          borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.2s',
        }} />
      </div>
      <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
    </label>
  );
}

function SaveBar({ saving, saved, error, onSave }: {
  saving: boolean; saved: boolean; error: string | null; onSave: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
      <button onClick={onSave} disabled={saving} className="btn btn-teal" style={{ minWidth: 120 }}>
        {saving ? '⏳ Saving…' : '💾 Save Changes'}
      </button>
      {saved && !saving && <span style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>✓ Saved</span>}
      {error && !saving && <span style={{ fontSize: 13, color: '#c62828' }}>⚠ {error}</span>}
    </div>
  );
}

// ─── Tile wrapper ─────────────────────────────────────────────────────────────

function SettingsTile({
  id: _id, icon, title, description, open, onToggle, editMode, children,
}: {
  id: TileId; icon: string; title: string; description: string;
  open: boolean; onToggle: () => void; editMode: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14,
      border: editMode ? '2px dashed #f59e0b' : '1px solid #e5e7eb',
      boxShadow: open ? '0 4px 24px rgba(0,0,0,0.10)' : '0 2px 8px rgba(0,0,0,0.06)',
      overflow: 'hidden', transition: 'box-shadow 0.2s, border 0.2s',
      minHeight: '100%', display: 'flex', flexDirection: 'column',
    }}>
      {/* Card header */}
      <div
        onClick={editMode ? undefined : onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px',
          cursor: editMode ? 'grab' : 'pointer',
          background: open ? '#f0fffe' : '#fff',
          borderBottom: open ? '1px solid #e5e7eb' : 'none',
          transition: 'background 0.15s',
          userSelect: editMode ? 'none' : 'auto',
        }}
      >
        {editMode && (
          <div style={{ fontSize: 18, color: '#f59e0b', flexShrink: 0, cursor: 'grab' }}>⠿</div>
        )}
        <div style={{
          fontSize: 28, width: 48, height: 48, borderRadius: 12,
          background: open ? '#e8f9f7' : '#f4f6f9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s', flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937', marginBottom: 2 }}>{title}</div>
          <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>{description}</div>
        </div>
        {!editMode && (
          <div style={{
            fontSize: 11, fontWeight: 700, color: open ? '#0d9488' : '#9ca3af',
            textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
          }}>
            {open ? 'Close ↑' : 'Edit →'}
          </div>
        )}
        {editMode && (
          <div style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
            drag
          </div>
        )}
      </div>

      {/* Expanded panel */}
      {open && !editMode && (
        <div style={{ padding: '20px 24px', flex: 1 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Additional row types ─────────────────────────────────────────────────────

interface EntityRow {
  id: string;
  name: string;
  ein: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo: string | null;
  active: boolean;
  _count?: { locations: number };
}

interface EntityLocRow {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  active: boolean;
  entityId: string | null;
  entity?: { id: string; name: string } | null;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  entityId: string | null;
  entityName: string | null;
  locationCount: number;
  locationIds: string[];
  active: boolean;
  mfaEnabled: boolean;
  createdAt: string;
}

// ─── Lookup table component (for Locations, Diagnoses, Titles) ────────────────

interface LookupTableProps<T extends { id: string; name: string; active: boolean }> {
  rows: T[];
  loading: boolean;
  extraCol?: { header: string; render: (r: T) => React.ReactNode };
  addForm: React.ReactNode;
  showAdd: boolean;
  onShowAdd: (v: boolean) => void;
  onEdit: (row: T) => void;
  onToggle: (row: T) => void;
  onDelete: (row: T) => void;
  editingId: string | null;
  editForm: React.ReactNode;
}

function LookupTable<T extends { id: string; name: string; active: boolean }>({
  rows, loading, extraCol, addForm, showAdd, onShowAdd, onEdit, onToggle, onDelete, editingId, editForm,
}: LookupTableProps<T>) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 14px' }}
          onClick={() => onShowAdd(!showAdd)}>
          {showAdd ? '✕ Cancel' : '+ Add'}
        </button>
      </div>
      {showAdd && (
        <div style={{ background: '#f0fffe', border: '1px solid #99f6e4', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          {addForm}
        </div>
      )}
      {loading ? (
        <div style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0' }}>⏳ Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0' }}>No items yet. Click + Add above.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={thStyle}>Name</th>
              {extraCol && <th style={thStyle}>{extraCol.header}</th>}
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <>
                <tr key={row.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={tdStyle}>{row.name}</td>
                  {extraCol && <td style={{ ...tdStyle, color: '#6b7280', fontFamily: 'monospace', fontSize: 12 }}>{extraCol.render(row)}</td>}
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                      background: row.active ? '#dcfce7' : '#f3f4f6',
                      color: row.active ? '#15803d' : '#6b7280',
                    }}>{row.active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px' }}
                        onClick={() => onEdit(row)}>Edit</button>
                      <button className="btn btn-secondary" style={{
                        fontSize: 11, padding: '2px 8px',
                        background: row.active ? '#fff7ed' : '#f0fdf4',
                        color: row.active ? '#c2410c' : '#15803d',
                        border: `1px solid ${row.active ? '#fed7aa' : '#bbf7d0'}`,
                      }} onClick={() => onToggle(row)}>
                        {row.active ? 'Disable' : 'Enable'}
                      </button>
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}
                        onClick={() => onDelete(row)}>Del</button>
                    </div>
                  </td>
                </tr>
                {editingId === row.id && (
                  <tr key={`edit-${row.id}`}>
                    <td colSpan={extraCol ? 4 : 3} style={{ padding: '0 0 8px 0', background: '#fffbeb' }}>
                      <div style={{ padding: '10px 12px', border: '1px solid #fde68a', borderRadius: 8, margin: '4px 8px' }}>
                        {editForm}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700,
  color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em',
};
const tdStyle: React.CSSProperties = { padding: '8px 12px', color: '#374151' };

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading]   = useState(true);
  const [openTile, setOpenTile] = useState<TileId | null>(null);
  const [doctors, setDoctors]   = useState<Doctor[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [tileIds, setTileIds]   = useState<TileId[]>(ALL_TILE_IDS.filter((id) => id !== 'users'));
  const [layouts, setLayouts]   = useState<ResponsiveLayouts>(() => loadLayouts(ALL_TILE_IDS.filter((id) => id !== 'users')));

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then((r) => r.json()).catch(() => ({})),
      fetch('/api/doctors?active=true').then((r) => r.json()).catch(() => ({ doctors: [] })),
      fetch('/api/auth/me').then((r) => r.ok ? r.json() : null).catch(() => null),
    ]).then(([s, d, me]) => {
      setSettings(s as Settings);
      setDoctors((d as { doctors: Doctor[] }).doctors ?? []);
      const role = (me as { user?: { role: string } } | null)?.user?.role ?? null;
      setUserRole(role);
      // Include 'users' tile only for super_admin
      const ids = role === 'super_admin' ? ALL_TILE_IDS : ALL_TILE_IDS.filter((id) => id !== 'users');
      setTileIds(ids);
      setLayouts(loadLayouts(ids));
      setLoading(false);
    });
  }, []);

  const toggleTile = useCallback((id: TileId) => {
    if (editMode) return;
    setOpenTile((prev) => (prev === id ? null : id));
  }, [editMode]);

  const handleLayoutChange = useCallback((_layout: Layout, allLayouts: ResponsiveLayouts) => {
    setLayouts(allLayouts);
    saveLayouts(allLayouts);
  }, []);

  const resetLayout = () => {
    const def = makeDefaultLayouts(tileIds);
    setLayouts(def);
    saveLayouts(def);
  };

  if (loading) {
    return (
      <>
        <TopBar title="Settings" breadcrumbs={[{ label: 'Settings' }]} />
        <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <div style={{ color: '#6b7280', fontSize: 14 }}>⏳ Loading settings…</div>
        </div>
      </>
    );
  }

  const tileProps = (id: TileId) => ({
    id, open: openTile === id, onToggle: () => toggleTile(id), editMode,
  });

  const allTileNodes: { id: TileId; node: React.ReactNode }[] = [
    {
      id: 'branding' as TileId,
      node: <BrandingTile {...tileProps('branding')} settings={settings} onSettingsChange={setSettings} />,
    },
    {
      id: 'notifications' as TileId,
      node: <NotificationsTile {...tileProps('notifications')} settings={settings} onSettingsChange={setSettings} />,
    },
    {
      id: 'appearance' as TileId,
      node: <AppearanceTile {...tileProps('appearance')} settings={settings} onSettingsChange={setSettings} />,
    },
    {
      id: 'clinic' as TileId,
      node: <ClinicDefaultsTile {...tileProps('clinic')} settings={settings} onSettingsChange={setSettings} doctors={doctors} />,
    },
    {
      id: 'security' as TileId,
      node: <SecurityTile {...tileProps('security')} settings={settings} onSettingsChange={setSettings} />,
    },
    {
      id: 'export' as TileId,
      node: <ExportTile {...tileProps('export')} />,
    },

    {
      id: 'diagnoses' as TileId,
      node: <DiagnosesTile {...tileProps('diagnoses')} />,
    },
    {
      id: 'doctor-titles' as TileId,
      node: <DoctorTitlesTile {...tileProps('doctor-titles')} />,
    },
    {
      id: 'nurse-titles' as TileId,
      node: <NurseTitlesTile {...tileProps('nurse-titles')} />,
    },
    {
      id: 'entities' as TileId,
      node: <EntitiesTile {...tileProps('entities')} />,
    },
    {
      id: 'entity-locations' as TileId,
      node: <EntityLocationsTile {...tileProps('entity-locations')} />,
    },
    ...(userRole === 'super_admin' ? [{
      id: 'users' as TileId,
      node: <UsersTile {...tileProps('users')} />,
    }] : []),
  ];

  const tiles = allTileNodes.filter((t) => tileIds.includes(t.id));

  return (
    <>
      <TopBar
        title="Settings"
        breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Settings' }]}
        actions={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {editMode && (
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={resetLayout}>
                ↺ Reset Layout
              </button>
            )}
            <button
              className="btn btn-secondary"
              style={{
                fontSize: 12,
                background: editMode ? '#fffbeb' : undefined,
                border: editMode ? '1.5px solid #f59e0b' : undefined,
                color: editMode ? '#b45309' : undefined,
                fontWeight: editMode ? 700 : undefined,
              }}
              onClick={() => { setEditMode((v) => !v); setOpenTile(null); }}
            >
              {editMode ? '✓ Done Editing' : '✏️ Edit Layout'}
            </button>
          </div>
        }
      />
      <div className="page-content">
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>⚙️ Admin Control Center</h2>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            Configure your IMS settings. Click any tile to expand it.
            {editMode && <strong style={{ color: '#b45309' }}> Drag tiles to rearrange. Click &ldquo;Done Editing&rdquo; when finished.</strong>}
          </p>
        </div>

        {editMode ? (
          <DraggableSettingsGrid
            tiles={tiles}
            layouts={layouts}
            editMode={true}
            onLayoutChange={handleLayoutChange}
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%' }}>
            {tiles.map(tile => (
              <div key={tile.id} style={{ width: '100%' }}>
                {tile.node}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── TILE 1: Branding ─────────────────────────────────────────────────────────

function BrandingTile({ open, onToggle, editMode, settings, onSettingsChange }: {
  open: boolean; onToggle: () => void; editMode: boolean;
  settings: Settings; onSettingsChange: (s: Settings) => void;
}) {
  const [appTitle, setAppTitle]       = useState('');
  const [clinicName, setClinicName]   = useState('');
  const [tagline, setTagline]         = useState('');
  const [versionLabel, setVersionLabel] = useState('');
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setAppTitle(settings.app_title ?? 'Integrated Allergy IMS');
    setClinicName(settings.clinic_name ?? 'Integrated Allergy');
    setTagline(settings.tagline ?? 'Testing & Treatment');
    setVersionLabel(settings.version_label ?? 'IMS v2.0 · © 2026');
  }, [settings]);

  const handleSave = async () => {
    setSaving(true); setSaved(false); setError(null);
    try {
      const patch = { app_title: appTitle, clinic_name: clinicName, tagline, version_label: versionLabel };
      await saveSettings(patch);
      onSettingsChange({ ...settings, ...patch });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch { setError('Failed to save.'); }
    finally { setSaving(false); }
  };

  return (
    <SettingsTile id="branding" icon="🏷️" title="Title & Branding" editMode={editMode}
      description="Clinic name, app title, tagline" open={open} onToggle={onToggle}>
      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <Label>App Title (browser tab)</Label>
          <Input value={appTitle} onChange={setAppTitle} placeholder="Integrated Allergy IMS" />
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>⚠ Tab title reflects on next redeployment</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><Label>Clinic Name</Label><Input value={clinicName} onChange={setClinicName} /></div>
          <div><Label>Tagline</Label><Input value={tagline} onChange={setTagline} /></div>
        </div>
        <div><Label>Version Label</Label><Input value={versionLabel} onChange={setVersionLabel} /></div>
      </div>
      <SaveBar saving={saving} saved={saved} error={error} onSave={handleSave} />
    </SettingsTile>
  );
}

// ─── TILE 2: Notifications ────────────────────────────────────────────────────

function NotificationsTile({ open, onToggle, editMode, settings, onSettingsChange }: {
  open: boolean; onToggle: () => void; editMode: boolean;
  settings: Settings; onSettingsChange: (s: Settings) => void;
}) {
  const [email, setEmail]           = useState('');
  const [expiryDays, setExpiryDays] = useState('14');
  const [doseReminders, setDoseReminders] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    setEmail(settings.notify_email ?? '');
    setExpiryDays(settings.notify_expiry_days ?? '14');
    setDoseReminders((settings.notify_doses ?? 'true') === 'true');
  }, [settings]);

  const handleSave = async () => {
    setSaving(true); setSaved(false); setError(null);
    try {
      const patch = { notify_email: email, notify_expiry_days: expiryDays, notify_doses: String(doseReminders) };
      await saveSettings(patch);
      onSettingsChange({ ...settings, ...patch });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch { setError('Failed to save.'); }
    finally { setSaving(false); }
  };

  return (
    <SettingsTile id="notifications" icon="🔔" title="Notifications" editMode={editMode}
      description="Vial expiry alerts and dose reminders" open={open} onToggle={onToggle}>
      <div style={{ display: 'grid', gap: 14 }}>
        <div><Label>Alert Email</Label><Input type="email" value={email} onChange={setEmail} placeholder="clinic@example.com" /></div>
        <div>
          <Label>Days Before Expiry</Label>
          <select className="form-input" value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)}>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
          </select>
        </div>
        <Toggle checked={doseReminders} onChange={setDoseReminders} label="Enable dose reminder notifications" />
      </div>
      <SaveBar saving={saving} saved={saved} error={error} onSave={handleSave} />
    </SettingsTile>
  );
}

// ─── TILE 3: Appearance ───────────────────────────────────────────────────────

function AppearanceTile({ open, onToggle, editMode, settings, onSettingsChange }: {
  open: boolean; onToggle: () => void; editMode: boolean;
  settings: Settings; onSettingsChange: (s: Settings) => void;
}) {
  const [primaryColor, setPrimaryColor] = useState('#2ec4b6');
  const [sidebarStyle, setSidebarStyle] = useState('light');
  const [dateFormat, setDateFormat]     = useState('MM/DD/YYYY');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    setPrimaryColor(settings.primary_color ?? '#2ec4b6');
    setSidebarStyle(settings.sidebar_style ?? 'light');
    setDateFormat(settings.date_format ?? 'MM/DD/YYYY');
  }, [settings]);

  const handleSave = async () => {
    setSaving(true); setSaved(false); setError(null);
    try {
      const patch = { primary_color: primaryColor, sidebar_style: sidebarStyle, date_format: dateFormat };
      await saveSettings(patch);
      onSettingsChange({ ...settings, ...patch });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch { setError('Failed to save.'); }
    finally { setSaving(false); }
  };

  return (
    <SettingsTile id="appearance" icon="🎨" title="Appearance" editMode={editMode}
      description="Primary color, sidebar style, date format" open={open} onToggle={onToggle}>
      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <Label>Primary Accent Color</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
              style={{ width: 48, height: 36, padding: 2, border: '1.5px solid #d1d5db', borderRadius: 8, cursor: 'pointer' }} />
            <Input value={primaryColor} onChange={setPrimaryColor} placeholder="#2ec4b6" />
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['#2ec4b6', '#0055a5', '#7c3aed', '#dc2626', '#059669', '#d97706'].map((c) => (
              <div key={c} onClick={() => setPrimaryColor(c)} style={{
                width: 28, height: 28, borderRadius: 6, background: c, cursor: 'pointer',
                border: primaryColor === c ? '3px solid #1f2937' : '2px solid transparent',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'border 0.15s',
              }} />
            ))}
          </div>
        </div>
        <div>
          <Label>Sidebar Style</Label>
          <div style={{ display: 'flex', gap: 10 }}>
            {['light', 'dark'].map((s) => (
              <button key={s} onClick={() => setSidebarStyle(s)} style={{
                flex: 1, padding: '10px 0', borderRadius: 10, border: '1.5px solid',
                borderColor: sidebarStyle === s ? '#2ec4b6' : '#e5e7eb',
                background: sidebarStyle === s ? '#e8f9f7' : '#fff',
                color: sidebarStyle === s ? '#0d9488' : '#374151',
                fontWeight: sidebarStyle === s ? 700 : 500,
                cursor: 'pointer', fontSize: 13,
              }}>{s === 'light' ? '☀️ Light' : '🌙 Dark'}</button>
            ))}
          </div>
        </div>
        <div>
          <Label>Date Format</Label>
          <select className="form-input" value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
            <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY (International)</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
          </select>
        </div>
      </div>
      <SaveBar saving={saving} saved={saved} error={error} onSave={handleSave} />
    </SettingsTile>
  );
}

// ─── TILE 4: Clinic Defaults ──────────────────────────────────────────────────

function ClinicDefaultsTile({ open, onToggle, editMode, settings, onSettingsChange, doctors }: {
  open: boolean; onToggle: () => void; editMode: boolean;
  settings: Settings; onSettingsChange: (s: Settings) => void; doctors: Doctor[];
}) {
  const [defaultPhysician, setDefaultPhysician] = useState('');
  const [defaultLocation, setDefaultLocation]   = useState('');
  const [vialExpiryDays, setVialExpiryDays]     = useState('90');
  const [glycerinPct, setGlycerinPct]           = useState('10');
  const [locations, setLocations]               = useState<LocRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    setDefaultPhysician(settings.default_physician ?? '');
    setDefaultLocation(settings.default_location ?? '');
    setVialExpiryDays(settings.default_vial_expiry_days ?? '90');
    setGlycerinPct(settings.default_glycerin_pct ?? '10');
  }, [settings]);

  useEffect(() => {
    if (open) {
      fetch('/api/locations?active=true').then((r) => r.json())
        .then((d: { locations: LocRow[] }) => setLocations(d.locations ?? []))
        .catch(() => setLocations([]));
    }
  }, [open]);

  const handleSave = async () => {
    setSaving(true); setSaved(false); setError(null);
    try {
      const patch = {
        default_physician: defaultPhysician, default_location: defaultLocation,
        default_vial_expiry_days: vialExpiryDays, default_glycerin_pct: glycerinPct,
      };
      await saveSettings(patch);
      onSettingsChange({ ...settings, ...patch });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch { setError('Failed to save.'); }
    finally { setSaving(false); }
  };

  return (
    <SettingsTile id="clinic" icon="👥" title="Clinic Defaults" editMode={editMode}
      description="Default physician, location, vial expiry, glycerin %" open={open} onToggle={onToggle}>
      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <Label>Default Physician</Label>
          <select className="form-input" value={defaultPhysician} onChange={(e) => setDefaultPhysician(e.target.value)}>
            <option value="">No default</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}, {d.title}</option>)}
          </select>
        </div>
        <div>
          <Label>Default Clinic Location</Label>
          <select className="form-input" value={defaultLocation} onChange={(e) => setDefaultLocation(e.target.value)}>
            <option value="">No default</option>
            {locations.map((l) => <option key={l.id} value={l.name}>{l.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><Label>Default Vial Expiry (days)</Label><Input type="number" value={vialExpiryDays} onChange={setVialExpiryDays} /></div>
          <div><Label>Default Glycerin %</Label><Input type="number" value={glycerinPct} onChange={setGlycerinPct} /></div>
        </div>
      </div>
      <SaveBar saving={saving} saved={saved} error={error} onSave={handleSave} />
    </SettingsTile>
  );
}

// ─── TILE 5: Security ─────────────────────────────────────────────────────────

function SecurityTile({ open, onToggle, editMode, settings, onSettingsChange }: {
  open: boolean; onToggle: () => void; editMode: boolean;
  settings: Settings; onSettingsChange: (s: Settings) => void;
}) {
  const [sessionTimeout, setSessionTimeout] = useState('60');
  const [requireConfirm, setRequireConfirm] = useState(true);
  const [auditPublic, setAuditPublic]       = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    setSessionTimeout(settings.session_timeout ?? '60');
    setRequireConfirm((settings.require_confirm_delete ?? 'true') === 'true');
    setAuditPublic((settings.audit_log_public ?? 'false') === 'true');
  }, [settings]);

  const handleSave = async () => {
    setSaving(true); setSaved(false); setError(null);
    try {
      const patch = {
        session_timeout: sessionTimeout,
        require_confirm_delete: String(requireConfirm),
        audit_log_public: String(auditPublic),
      };
      await saveSettings(patch);
      onSettingsChange({ ...settings, ...patch });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch { setError('Failed to save.'); }
    finally { setSaving(false); }
  };

  return (
    <SettingsTile id="security" icon="🔒" title="Security & Access" editMode={editMode}
      description="Session timeout, delete confirmation, audit visibility" open={open} onToggle={onToggle}>
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <Label>Session Timeout</Label>
          <select className="form-input" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)}>
            <option value="30">30 minutes</option>
            <option value="60">60 minutes</option>
            <option value="120">2 hours</option>
            <option value="never">Never</option>
          </select>
        </div>
        <Toggle checked={requireConfirm} onChange={setRequireConfirm} label="Require confirmation before deleting records" />
        <Toggle checked={auditPublic} onChange={setAuditPublic} label="Show audit log to all users" />
      </div>
      <SaveBar saving={saving} saved={saved} error={error} onSave={handleSave} />
    </SettingsTile>
  );
}

// ─── TILE 6: Data & Export ────────────────────────────────────────────────────

function ExportTile({ open, onToggle, editMode }: { open: boolean; onToggle: () => void; editMode: boolean; }) {
  const [status, setStatus] = useState<Record<string, 'idle' | 'loading' | 'done' | 'error'>>({
    patients: 'idle', audit: 'idle', backup: 'idle',
  });

  const doExport = async (key: string, url: string, filename: string) => {
    setStatus((s) => ({ ...s, [key]: 'loading' }));
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setStatus((s) => ({ ...s, [key]: 'done' }));
      setTimeout(() => setStatus((s) => ({ ...s, [key]: 'idle' })), 3000);
    } catch {
      setStatus((s) => ({ ...s, [key]: 'error' }));
      setTimeout(() => setStatus((s) => ({ ...s, [key]: 'idle' })), 3000);
    }
  };

  const btnLabel = (key: string, idle: string) => {
    if (status[key] === 'loading') return '⏳ Exporting…';
    if (status[key] === 'done') return '✓ Downloaded';
    if (status[key] === 'error') return '⚠ Failed';
    return idle;
  };

  return (
    <SettingsTile id="export" icon="📊" title="Data & Export" editMode={editMode}
      description="Export patients, audit logs, or full backup" open={open} onToggle={onToggle}>
      <div style={{ display: 'grid', gap: 10 }}>
        {[
          { key: 'patients', icon: '👥', title: 'Patient List (CSV)', url: '/api/export/patients', fn: `patients-${new Date().toISOString().slice(0,10)}.csv`, label: '⬇ Export CSV' },
          { key: 'audit',    icon: '📋', title: 'Audit Log (CSV)',    url: '/api/export/audit-log', fn: `audit-log-${new Date().toISOString().slice(0,10)}.csv`, label: '⬇ Export CSV' },
          { key: 'backup',   icon: '💾', title: 'Full Backup (JSON)', url: '/api/export/backup', fn: `ims-backup-${new Date().toISOString().slice(0,10)}.json`, label: '⬇ Download' },
        ].map(({ key, icon, title, url, fn, label }) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
            background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb',
          }}>
            <div style={{ fontSize: 24, flexShrink: 0 }}>{icon}</div>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div></div>
            <button
              className="btn btn-secondary btn-sm"
              disabled={status[key] === 'loading'}
              onClick={() => doExport(key, url, fn)}
              style={{
                flexShrink: 0,
                ...(status[key] === 'done'  ? { background: '#059669', color: '#fff', border: 'none' } : {}),
                ...(status[key] === 'error' ? { background: '#dc2626', color: '#fff', border: 'none' } : {}),
              }}
            >
              {btnLabel(key, label)}
            </button>
          </div>
        ))}
      </div>
    </SettingsTile>
  );
}

// ─── TILE 7: Clinic Locations ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LocationsTile({ open, onToggle, editMode }: { open: boolean; onToggle: () => void; editMode: boolean; }) {
  const [rows, setRows]         = useState<LocRow[]>([]);
  const [loading, setLoading]   = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const [addName, setAddName]   = useState('');
  const [addAddr, setAddAddr]   = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddr, setEditAddr] = useState('');
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetch('/api/locations').then((r) => r.json()) as { locations: LocRow[] };
      setRows(d.locations ?? []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  const handleAdd = async () => {
    if (!addName.trim()) return;
    setSaving(true);
    await fetch('/api/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: addName.trim(), address: addAddr.trim() }) });
    setAddName(''); setAddAddr(''); setShowAdd(false); setSaving(false);
    load();
  };

  const startEdit = (row: LocRow) => {
    setEditingId(row.id); setEditName(row.name); setEditAddr(row.address ?? '');
  };

  const saveEdit = async (id: string) => {
    await fetch(`/api/locations/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), address: editAddr.trim() }) });
    setEditingId(null); load();
  };

  const toggleRow = async (row: LocRow) => {
    await fetch(`/api/locations/${row.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !row.active }) });
    load();
  };

  const deleteRow = async (row: LocRow) => {
    if (!confirm(`Delete "${row.name}"?`)) return;
    await fetch(`/api/locations/${row.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <SettingsTile id="entity-locations" icon="📍" title="Clinic Locations" editMode={editMode}
      description="Manage clinic locations used in patient forms" open={open} onToggle={onToggle}>
      <LookupTable
        rows={rows} loading={loading}
        extraCol={{ header: 'Address', render: (r: LocRow) => r.address ?? '—' }}
        showAdd={showAdd} onShowAdd={setShowAdd}
        editingId={editingId}
        onEdit={startEdit}
        onToggle={toggleRow}
        onDelete={deleteRow}
        addForm={
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <Label>Name</Label>
                <input className="form-input" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Branch name" />
              </div>
              <div>
                <Label>Address</Label>
                <input className="form-input" value={addAddr} onChange={(e) => setAddAddr(e.target.value)} placeholder="City, State" />
              </div>
            </div>
            <button className="btn btn-teal" style={{ alignSelf: 'flex-start', fontSize: 12 }}
              onClick={handleAdd} disabled={saving || !addName.trim()}>
              {saving ? 'Saving…' : '✓ Add Location'}
            </button>
          </div>
        }
        editForm={
          editingId ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><Label>Name</Label><input className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
                <div><Label>Address</Label><input className="form-input" value={editAddr} onChange={(e) => setEditAddr(e.target.value)} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-teal" style={{ fontSize: 12 }} onClick={() => saveEdit(editingId)}>Save</button>
                <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </div>
          ) : null
        }
      />
    </SettingsTile>
  );
}

// ─── TILE 8: Diagnosis Options ────────────────────────────────────────────────

function DiagnosesTile({ open, onToggle, editMode }: { open: boolean; onToggle: () => void; editMode: boolean; }) {
  const [rows, setRows]         = useState<DiagRow[]>([]);
  const [loading, setLoading]   = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const [addName, setAddName]   = useState('');
  const [addIcd, setAddIcd]     = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcd, setEditIcd]   = useState('');
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetch('/api/diagnoses').then((r) => r.json()) as { diagnoses: DiagRow[] };
      setRows(d.diagnoses ?? []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  const handleAdd = async () => {
    if (!addName.trim()) return;
    setSaving(true);
    await fetch('/api/diagnoses', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: addName.trim(), icdCode: addIcd.trim() }) });
    setAddName(''); setAddIcd(''); setShowAdd(false); setSaving(false);
    load();
  };

  const startEdit = (row: DiagRow) => {
    setEditingId(row.id); setEditName(row.name); setEditIcd(row.icdCode ?? '');
  };

  const saveEdit = async (id: string) => {
    await fetch(`/api/diagnoses/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), icdCode: editIcd.trim() }) });
    setEditingId(null); load();
  };

  const toggleRow = async (row: DiagRow) => {
    await fetch(`/api/diagnoses/${row.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !row.active }) });
    load();
  };

  const deleteRow = async (row: DiagRow) => {
    if (!confirm(`Delete "${row.name}"?`)) return;
    await fetch(`/api/diagnoses/${row.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <SettingsTile id="diagnoses" icon="🩺" title="Diagnosis Options" editMode={editMode}
      description="Manage diagnoses shown in patient enrollment" open={open} onToggle={onToggle}>
      <LookupTable
        rows={rows} loading={loading}
        extraCol={{ header: 'ICD Code', render: (r: DiagRow) => r.icdCode ?? '—' }}
        showAdd={showAdd} onShowAdd={setShowAdd}
        editingId={editingId}
        onEdit={startEdit}
        onToggle={toggleRow}
        onDelete={deleteRow}
        addForm={
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
              <div><Label>Diagnosis Name</Label><input className="form-input" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. Allergic Rhinitis" /></div>
              <div><Label>ICD Code</Label><input className="form-input" value={addIcd} onChange={(e) => setAddIcd(e.target.value)} placeholder="e.g. J30.9" /></div>
            </div>
            <button className="btn btn-teal" style={{ alignSelf: 'flex-start', fontSize: 12 }}
              onClick={handleAdd} disabled={saving || !addName.trim()}>
              {saving ? 'Saving…' : '✓ Add Diagnosis'}
            </button>
          </div>
        }
        editForm={
          editingId ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                <div><Label>Name</Label><input className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
                <div><Label>ICD Code</Label><input className="form-input" value={editIcd} onChange={(e) => setEditIcd(e.target.value)} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-teal" style={{ fontSize: 12 }} onClick={() => saveEdit(editingId)}>Save</button>
                <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </div>
          ) : null
        }
      />
    </SettingsTile>
  );
}

// ─── TILE 9: Doctor Titles ────────────────────────────────────────────────────

function DoctorTitlesTile({ open, onToggle, editMode }: { open: boolean; onToggle: () => void; editMode: boolean; }) {
  const [rows, setRows]         = useState<TitleRow[]>([]);
  const [loading, setLoading]   = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const [addName, setAddName]   = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetch('/api/doctor-titles').then((r) => r.json()) as { titles: TitleRow[] };
      setRows(d.titles ?? []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  const handleAdd = async () => {
    if (!addName.trim()) return;
    setSaving(true);
    await fetch('/api/doctor-titles', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: addName.trim() }) });
    setAddName(''); setShowAdd(false); setSaving(false); load();
  };

  const startEdit = (row: TitleRow) => { setEditingId(row.id); setEditName(row.name); };

  const saveEdit = async (id: string) => {
    await fetch(`/api/doctor-titles/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }) });
    setEditingId(null); load();
  };

  const toggleRow = async (row: TitleRow) => {
    await fetch(`/api/doctor-titles/${row.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !row.active }) });
    load();
  };

  const deleteRow = async (row: TitleRow) => {
    if (!confirm(`Delete title "${row.name}"?`)) return;
    await fetch(`/api/doctor-titles/${row.id}`, { method: 'DELETE' }); load();
  };

  return (
    <SettingsTile id="doctor-titles" icon="👨‍⚕️" title="Doctor Titles" editMode={editMode}
      description="Titles available in the doctor add/edit form" open={open} onToggle={onToggle}>
      <LookupTable
        rows={rows} loading={loading}
        showAdd={showAdd} onShowAdd={setShowAdd}
        editingId={editingId}
        onEdit={startEdit}
        onToggle={toggleRow}
        onDelete={deleteRow}
        addForm={
          <div style={{ display: 'grid', gap: 8 }}>
            <div><Label>Title Name</Label><input className="form-input" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. MD, DO, NP" /></div>
            <button className="btn btn-teal" style={{ alignSelf: 'flex-start', fontSize: 12 }}
              onClick={handleAdd} disabled={saving || !addName.trim()}>
              {saving ? 'Saving…' : '✓ Add Title'}
            </button>
          </div>
        }
        editForm={
          editingId ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <div><Label>Title Name</Label><input className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-teal" style={{ fontSize: 12 }} onClick={() => saveEdit(editingId)}>Save</button>
                <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </div>
          ) : null
        }
      />
    </SettingsTile>
  );
}

// ─── TILE 10: Nurse Titles ────────────────────────────────────────────────────
// (keep existing NurseTitlesTile — new tiles appended below)

function NurseTitlesTile({ open, onToggle, editMode }: { open: boolean; onToggle: () => void; editMode: boolean; }) {
  const [rows, setRows]         = useState<TitleRow[]>([]);
  const [loading, setLoading]   = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const [addName, setAddName]   = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetch('/api/nurse-titles').then((r) => r.json()) as { titles: TitleRow[] };
      setRows(d.titles ?? []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  const handleAdd = async () => {
    if (!addName.trim()) return;
    setSaving(true);
    await fetch('/api/nurse-titles', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: addName.trim() }) });
    setAddName(''); setShowAdd(false); setSaving(false); load();
  };

  const startEdit = (row: TitleRow) => { setEditingId(row.id); setEditName(row.name); };

  const saveEdit = async (id: string) => {
    await fetch(`/api/nurse-titles/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }) });
    setEditingId(null); load();
  };

  const toggleRow = async (row: TitleRow) => {
    await fetch(`/api/nurse-titles/${row.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !row.active }) });
    load();
  };

  const deleteRow = async (row: TitleRow) => {
    if (!confirm(`Delete title "${row.name}"?`)) return;
    await fetch(`/api/nurse-titles/${row.id}`, { method: 'DELETE' }); load();
  };

  return (
    <SettingsTile id="nurse-titles" icon="👩‍⚕️" title="Nurse Titles" editMode={editMode}
      description="Titles available in the nurse add/edit form" open={open} onToggle={onToggle}>
      <LookupTable
        rows={rows} loading={loading}
        showAdd={showAdd} onShowAdd={setShowAdd}
        editingId={editingId}
        onEdit={startEdit}
        onToggle={toggleRow}
        onDelete={deleteRow}
        addForm={
          <div style={{ display: 'grid', gap: 8 }}>
            <div><Label>Title Name</Label><input className="form-input" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. RN, LPN, CMA" /></div>
            <button className="btn btn-teal" style={{ alignSelf: 'flex-start', fontSize: 12 }}
              onClick={handleAdd} disabled={saving || !addName.trim()}>
              {saving ? 'Saving…' : '✓ Add Title'}
            </button>
          </div>
        }
        editForm={
          editingId ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <div><Label>Title Name</Label><input className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-teal" style={{ fontSize: 12 }} onClick={() => saveEdit(editingId)}>Save</button>
                <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </div>
          ) : null
        }
      />
    </SettingsTile>
  );
}

// ─── TILE 11: Entities ────────────────────────────────────────────────────────

const AVATAR_COLORS_ENT = [
  '#0055a5', '#059669', '#7c3aed', '#b45309', '#dc2626',
  '#0891b2', '#d97706', '#15803d', '#9333ea', '#1d4ed8',
];

function entityAvatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS_ENT[Math.abs(h) % AVATAR_COLORS_ENT.length];
}

function EntityAvatar({ name, logo, size = 36 }: { name: string; logo: string | null; size?: number }) {
  const initials = name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const color = entityAvatarColor(name);
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: logo ? 'transparent' : color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {logo
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={logo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ color: '#fff', fontWeight: 700, fontSize: size * 0.36 }}>{initials}</span>
      }
    </div>
  );
}

function EntitiesTile({ open, onToggle, editMode }: { open: boolean; onToggle: () => void; editMode: boolean }) {
  const [rows, setRows] = useState<EntityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EntityRow | null>(null);
  const [form, setForm] = useState({ name: '', ein: '', phone: '', email: '', website: '', logo: '', active: true });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<EntityRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetch('/api/entities').then((r) => r.json()) as { entities: EntityRow[] };
      setRows(d.entities ?? []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', ein: '', phone: '', email: '', website: '', logo: '', active: true });
    setFormError(null); setShowModal(true);
  };

  const openEdit = (row: EntityRow) => {
    setEditing(row);
    setForm({ name: row.name, ein: row.ein ?? '', phone: row.phone ?? '', email: row.email ?? '', website: row.website ?? '', logo: row.logo ?? '', active: row.active });
    setFormError(null); setShowModal(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Logo must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, logo: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Entity name is required'); return; }
    setSaving(true); setFormError(null);
    try {
      const url = editing ? `/api/entities/${editing.id}` : '/api/entities';
      const method = editing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await r.json();
      if (!r.ok) { setFormError((data as { error?: string }).error ?? 'Failed to save'); return; }
      setShowModal(false); load();
    } catch { setFormError('Network error'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (row: EntityRow) => {
    await fetch(`/api/entities/${row.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !row.active }) });
    load();
  };

  const handleDelete = async (row: EntityRow) => {
    await fetch(`/api/entities/${row.id}`, { method: 'DELETE' });
    setConfirmDel(null); load();
  };

  return (
    <SettingsTile id="entities" icon="🏢" title="Entities" editMode={editMode}
      description="Business entities that own clinic locations" open={open} onToggle={onToggle}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 14px' }} onClick={openAdd}>+ Add Entity</button>
      </div>
      {loading ? (
        <div style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0' }}>⏳ Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0' }}>No entities yet. Click + Add Entity above.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['', 'Name', 'EIN', 'Phone', 'Email', 'Locs', 'Status', 'Actions'].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer', transition: 'background 0.1s' }}
                onClick={() => openEdit(row)}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fffe')}
                onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa')}>
                <td style={{ padding: '8px 8px 8px 12px', width: 44 }}><EntityAvatar name={row.name} logo={row.logo} /></td>
                <td style={{ ...tdStyle, fontWeight: 600, color: '#111827' }}>{row.name}</td>
                <td style={{ ...tdStyle, color: '#6b7280', fontFamily: 'monospace', fontSize: 12 }}>{row.ein ?? '—'}</td>
                <td style={tdStyle}>{row.phone ?? '—'}</td>
                <td style={tdStyle}>{row.email ?? '—'}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{row._count?.locations ?? 0}</td>
                <td style={tdStyle}>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: row.active ? '#dcfce7' : '#f3f4f6', color: row.active ? '#15803d' : '#6b7280' }}>
                    {row.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => openEdit(row)}>Edit</button>
                    <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px', background: row.active ? '#fff7ed' : '#f0fdf4', color: row.active ? '#c2410c' : '#15803d', border: `1px solid ${row.active ? '#fed7aa' : '#bbf7d0'}` }} onClick={() => toggleActive(row)}>
                      {row.active ? 'Disable' : 'Enable'}
                    </button>
                    <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }} onClick={() => setConfirmDel(row)}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: '#fff', width: 520, maxHeight: '90vh', overflowY: 'auto', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{editing ? '✏️ Edit Entity' : '🏢 Add Entity'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <EntityAvatar name={form.name || 'E'} logo={form.logo} size={64} />
                <div style={{ marginTop: 8 }}>
                  <label style={{ cursor: 'pointer', color: '#0055a5', fontSize: 13, fontWeight: 600 }}>
                    📷 Upload Logo
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
                  </label>
                  {form.logo && <button type="button" onClick={() => setForm((f) => ({ ...f, logo: '' }))} style={{ marginLeft: 8, color: '#dc2626', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>}
                </div>
              </div>
              {formError && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', borderRadius: 6, fontSize: 13, border: '1px solid #fecaca' }}>{formError}</div>}
              <div><Label>Entity Name <span style={{ color: '#c62828' }}>*</span></Label><input className="form-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Acme Medical Group" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><Label>EIN / Tax ID</Label><input className="form-input" value={form.ein} onChange={(e) => setForm((f) => ({ ...f, ein: e.target.value }))} placeholder="XX-XXXXXXX" /></div>
                <div><Label>Phone</Label><input className="form-input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><Label>Email</Label><input type="email" className="form-input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="admin@entity.com" /></div>
                <div><Label>Website</Label><input className="form-input" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://…" /></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Label>Active</Label>
                <div onClick={() => setForm((f) => ({ ...f, active: !f.active }))} style={{ width: 44, height: 24, borderRadius: 12, background: form.active ? '#2ec4b6' : '#d1d5db', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: 3, left: form.active ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </div>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{form.active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Entity'}</button>
            </div>
          </div>
        </div>
      )}
      {confirmDel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div style={{ background: '#fff', width: 380, borderRadius: 12, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>⚠️ Delete Entity?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#374151' }}>Delete <strong>{confirmDel.name}</strong>? This will soft-delete the entity.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDel(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: '#dc2626', borderColor: '#dc2626' }} onClick={() => handleDelete(confirmDel)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </SettingsTile>
  );
}

// ─── TILE 12: Entity Locations ────────────────────────────────────────────────

function EntityLocationsTile({ open, onToggle, editMode }: { open: boolean; onToggle: () => void; editMode: boolean }) {
  const [rows, setRows] = useState<EntityLocRow[]>([]);
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterEntityId, setFilterEntityId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EntityLocRow | null>(null);
  const [form, setForm] = useState({ name: '', entityId: '', address: '', phone: '', active: true });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadEntities = useCallback(async () => {
    try {
      const d = await fetch('/api/entities').then((r) => r.json()) as { entities: EntityRow[] };
      setEntities(d.entities?.filter((e) => e.active) ?? []);
    } catch { setEntities([]); }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterEntityId ? `/api/locations?entityId=${filterEntityId}` : '/api/locations';
      const d = await fetch(url).then((r) => r.json()) as { locations: EntityLocRow[] };
      setRows(d.locations ?? []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [filterEntityId]);

  useEffect(() => { if (open) { loadEntities(); } }, [open, loadEntities]);
  useEffect(() => { if (open) load(); }, [open, load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', entityId: filterEntityId, address: '', phone: '', active: true });
    setFormError(null); setShowModal(true);
  };

  const openEdit = (row: EntityLocRow) => {
    setEditing(row);
    setForm({ name: row.name, entityId: row.entityId ?? '', address: row.address ?? '', phone: row.phone ?? '', active: row.active });
    setFormError(null); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Location name is required'); return; }
    if (!form.entityId) { setFormError('Entity is required'); return; }
    setSaving(true); setFormError(null);
    try {
      const url = editing ? `/api/locations/${editing.id}` : '/api/locations';
      const method = editing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await r.json();
      if (!r.ok) { setFormError((data as { error?: string }).error ?? 'Failed to save'); return; }
      setShowModal(false); load();
    } catch { setFormError('Network error'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (row: EntityLocRow) => {
    await fetch(`/api/locations/${row.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !row.active }) });
    load();
  };

  const handleDelete = async (row: EntityLocRow) => {
    if (!confirm(`Delete location "${row.name}"?`)) return;
    await fetch(`/api/locations/${row.id}`, { method: 'DELETE' }); load();
  };

  return (
    <SettingsTile id="entity-locations" icon="🗺️" title="Entity Locations" editMode={editMode}
      description="Clinic locations linked to business entities" open={open} onToggle={onToggle}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <select className="form-input" style={{ flex: 1, minWidth: 160, fontSize: 12 }} value={filterEntityId} onChange={(e) => setFilterEntityId(e.target.value)}>
          <option value="">All Entities</option>
          {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 14px', flexShrink: 0 }} onClick={openAdd}>+ Add Location</button>
      </div>
      {loading ? (
        <div style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0' }}>⏳ Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0' }}>No locations found. Click + Add Location above.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['Name', 'Entity', 'Address', 'Phone', 'Status', 'Actions'].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer', transition: 'background 0.1s' }}
                onClick={() => openEdit(row)}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fffe')}
                onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa')}>
                <td style={{ ...tdStyle, fontWeight: 600, color: '#111827' }}>{row.name}</td>
                <td style={{ ...tdStyle, color: '#6b7280' }}>{row.entity?.name ?? '—'}</td>
                <td style={{ ...tdStyle, color: '#6b7280' }}>{row.address ?? '—'}</td>
                <td style={tdStyle}>{row.phone ?? '—'}</td>
                <td style={tdStyle}>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: row.active ? '#dcfce7' : '#f3f4f6', color: row.active ? '#15803d' : '#6b7280' }}>
                    {row.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => openEdit(row)}>Edit</button>
                    <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px', background: row.active ? '#fff7ed' : '#f0fdf4', color: row.active ? '#c2410c' : '#15803d', border: `1px solid ${row.active ? '#fed7aa' : '#bbf7d0'}` }} onClick={() => toggleActive(row)}>
                      {row.active ? 'Disable' : 'Enable'}
                    </button>
                    <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }} onClick={() => handleDelete(row)}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: '#fff', width: 480, maxHeight: '90vh', overflowY: 'auto', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{editing ? '✏️ Edit Location' : '📍 Add Location'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {formError && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', borderRadius: 6, fontSize: 13, border: '1px solid #fecaca' }}>{formError}</div>}
              <div><Label>Location Name <span style={{ color: '#c62828' }}>*</span></Label><input className="form-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Main Street Clinic" /></div>
              <div>
                <Label>Entity <span style={{ color: '#c62828' }}>*</span></Label>
                <select className="form-input" value={form.entityId} onChange={(e) => setForm((f) => ({ ...f, entityId: e.target.value }))}>
                  <option value="">Select entity…</option>
                  {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div><Label>Address</Label><input className="form-input" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="123 Main St, City, VA" /></div>
              <div><Label>Phone</Label><input className="form-input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" /></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Label>Active</Label>
                <div onClick={() => setForm((f) => ({ ...f, active: !f.active }))} style={{ width: 44, height: 24, borderRadius: 12, background: form.active ? '#2ec4b6' : '#d1d5db', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: 3, left: form.active ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </div>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{form.active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Location'}</button>
            </div>
          </div>
        </div>
      )}
    </SettingsTile>
  );
}

// ─── TILE 13: Users (super_admin only) ────────────────────────────────────────

const ROLE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  super_admin:    { bg: '#f3e8ff', color: '#7c3aed', label: 'Super Admin' },
  entity_admin:   { bg: '#dbeafe', color: '#1d4ed8', label: 'Entity Admin' },
  location_staff: { bg: '#f3f4f6', color: '#6b7280', label: 'Location Staff' },
};

function userAvatarColor(name: string) {
  const colors = ['#0d9488', '#2563eb', '#7c3aed', '#db2777', '#ea580c'];
  return colors[name.charCodeAt(0) % colors.length];
}

function UsersTile({ open, onToggle, editMode }: { open: boolean; onToggle: () => void; editMode: boolean }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [allLocations, setAllLocations] = useState<EntityLocRow[]>([]);
  const [doctors, setDoctors] = useState<{ id: string; name: string; title: string; email: string | null; entityId: string | null }[]>([]);
  const [nurses, setNurses] = useState<{ id: string; name: string; title: string; email: string | null; entityId: string | null }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'location_staff', entityId: '', locationIds: [] as string[], active: true });
  const [importValue, setImportValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetch('/api/users').then((r) => r.json()) as { users: UserRow[] };
      setUsers(d.users ?? []);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  }, []);

  const loadRef = useCallback(async () => {
    const [entD, locD, docD, nurD] = await Promise.all([
      fetch('/api/entities').then((r) => r.json()).catch(() => ({ entities: [] })),
      fetch('/api/locations?active=true').then((r) => r.json()).catch(() => ({ locations: [] })),
      fetch('/api/doctors?active=true').then((r) => r.json()).catch(() => ({ doctors: [] })),
      fetch('/api/nurses?active=true').then((r) => r.json()).catch(() => ({ nurses: [] })),
    ]);
    setEntities((entD as { entities: EntityRow[] }).entities ?? []);
    setAllLocations((locD as { locations: EntityLocRow[] }).locations ?? []);
    setDoctors((docD as { doctors: { id: string; name: string; title: string; email: string | null; entityId: string | null }[] }).doctors ?? []);
    setNurses((nurD as { nurses: { id: string; name: string; title: string; email: string | null; entityId: string | null }[] }).nurses ?? []);
  }, []);

  useEffect(() => { if (open) { load(); loadRef(); } }, [open, load, loadRef]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role: 'location_staff', entityId: '', locationIds: [], active: true });
    setImportValue(''); setFormError(null); setShowModal(true);
  };

  const openEdit = (user: UserRow) => {
    setEditing(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role, entityId: user.entityId ?? '', locationIds: user.locationIds, active: user.active });
    setImportValue(''); setFormError(null); setShowModal(true);
  };

  const handleImport = (value: string) => {
    setImportValue(value);
    if (!value) return;
    const [type, id] = value.split(':');
    if (type === 'doctor') {
      const doc = doctors.find((d) => d.id === id);
      if (doc) setForm((f) => ({ ...f, name: doc.name, email: doc.email ?? f.email, entityId: doc.entityId ?? f.entityId }));
    } else if (type === 'nurse') {
      const nur = nurses.find((n) => n.id === id);
      if (nur) setForm((f) => ({ ...f, name: nur.name, email: nur.email ?? f.email, entityId: nur.entityId ?? f.entityId }));
    }
  };

  const filteredLocations = allLocations.filter((l) => !form.entityId || l.entityId === form.entityId || !l.entityId);

  const toggleLocation = (locationId: string) => {
    setForm((f) => ({
      ...f,
      locationIds: f.locationIds.includes(locationId) ? f.locationIds.filter((id) => id !== locationId) : [...f.locationIds, locationId],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    if (!form.email.trim()) { setFormError('Email is required'); return; }
    if (!editing && !form.password) { setFormError('Password is required for new users'); return; }
    setSaving(true); setFormError(null);
    try {
      const payload = {
        name: form.name, email: form.email,
        ...(form.password ? { password: form.password } : {}),
        role: form.role, entityId: form.entityId || null,
        locationIds: form.locationIds, active: form.active,
      };
      const url = editing ? `/api/users/${editing.id}` : '/api/users';
      const method = editing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await r.json();
      if (!r.ok) { setFormError((data as { error?: string }).error ?? 'Failed to save user'); return; }
      setShowModal(false); load();
    } catch { setFormError('Network error'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (user: UserRow) => {
    await fetch(`/api/users/${user.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !user.active }) });
    load();
  };

  const handleDelete = async (user: UserRow) => {
    if (!confirm(`Delete user ${user.name}? This cannot be undone.`)) return;
    setDeleting(user.id);
    try { await fetch(`/api/users/${user.id}`, { method: 'DELETE' }); load(); }
    finally { setDeleting(null); }
  };

  return (
    <SettingsTile id="users" icon="👤" title="Users" editMode={editMode}
      description="System users, roles, and access (super admin only)" open={open} onToggle={onToggle}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 14px' }} onClick={openAdd}>+ Add User</button>
      </div>
      {loading ? (
        <div style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0' }}>⏳ Loading…</div>
      ) : users.length === 0 ? (
        <div style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0' }}>No users found.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['', 'Name', 'Email', 'Role', 'Entity', 'Status', 'Actions'].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => {
              const rs = ROLE_STYLES[user.role] ?? ROLE_STYLES.location_staff;
              const color = userAvatarColor(user.name);
              const initials = user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <tr key={user.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer', transition: 'background 0.1s' }}
                  onClick={() => openEdit(user)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fffe')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa')}>
                  <td style={{ padding: '8px 8px 8px 12px', width: 40 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{initials}</div>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#111827' }}>{user.name}</td>
                  <td style={{ ...tdStyle, color: '#6b7280' }}>{user.email}</td>
                  <td style={tdStyle}><span style={{ background: rs.bg, color: rs.color, borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{rs.label}</span></td>
                  <td style={{ ...tdStyle, color: '#6b7280' }}>{user.entityName ?? '—'}</td>
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: user.active ? '#dcfce7' : '#f3f4f6', color: user.active ? '#15803d' : '#6b7280' }}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px', background: user.active ? '#fff7ed' : '#f0fdf4', color: user.active ? '#c2410c' : '#15803d', border: `1px solid ${user.active ? '#fed7aa' : '#bbf7d0'}` }} onClick={() => handleToggle(user)}>
                        {user.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }} onClick={() => handleDelete(user)} disabled={deleting === user.id}>
                        {deleting === user.id ? '…' : 'Del'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: '#fff', width: 560, maxHeight: '90vh', overflowY: 'auto', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{editing ? '✏️ Edit User' : '👤 Add User'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {formError && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', borderRadius: 6, fontSize: 13, border: '1px solid #fecaca' }}>{formError}</div>}
              {!editing && (doctors.length > 0 || nurses.length > 0) && (
                <div>
                  <Label>Import from existing staff…</Label>
                  <select className="form-input" value={importValue} onChange={(e) => handleImport(e.target.value)}>
                    <option value="">— Select to pre-fill —</option>
                    {doctors.length > 0 && <optgroup label="Doctors">{doctors.map((d) => <option key={`doctor:${d.id}`} value={`doctor:${d.id}`}>{d.title} {d.name}</option>)}</optgroup>}
                    {nurses.length > 0 && <optgroup label="Nurses">{nurses.map((n) => <option key={`nurse:${n.id}`} value={`nurse:${n.id}`}>{n.title} {n.name}</option>)}</optgroup>}
                  </select>
                </div>
              )}
              <div><Label>Name <span style={{ color: '#c62828' }}>*</span></Label><input className="form-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" /></div>
              <div><Label>Email <span style={{ color: '#c62828' }}>*</span></Label><input type="email" className="form-input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" /></div>
              <div>
                <Label>{editing ? 'New Password (leave blank to keep current)' : 'Temporary Password'} {!editing && <span style={{ color: '#c62828' }}>*</span>}</Label>
                <input type="password" className="form-input" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder={editing ? 'Enter new password…' : 'Temporary password'} />
              </div>
              <div>
                <Label>Role</Label>
                <select className="form-input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                  <option value="super_admin">Super Admin</option>
                  <option value="entity_admin">Entity Admin</option>
                  <option value="location_staff">Location Staff</option>
                </select>
              </div>
              <div>
                <Label>Entity</Label>
                <select className="form-input" value={form.entityId} onChange={(e) => setForm((f) => ({ ...f, entityId: e.target.value, locationIds: [] }))}>
                  <option value="">All — Super Admin</option>
                  {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              {filteredLocations.length > 0 && (
                <div>
                  <Label>Location Access</Label>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {filteredLocations.map((loc) => (
                      <label key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                        <input type="checkbox" checked={form.locationIds.includes(loc.id)} onChange={() => toggleLocation(loc.id)} style={{ accentColor: '#0d9488' }} />
                        {loc.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Label>Active</Label>
                <div onClick={() => setForm((f) => ({ ...f, active: !f.active }))} style={{ width: 44, height: 24, borderRadius: 12, background: form.active ? '#2ec4b6' : '#d1d5db', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: 3, left: form.active ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </div>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{form.active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create User'}</button>
            </div>
          </div>
        </div>
      )}
    </SettingsTile>
  );
}
