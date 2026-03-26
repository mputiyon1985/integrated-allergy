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
  | 'locations' | 'diagnoses' | 'doctor-titles' | 'nurse-titles';

// ─── Layout persistence ───────────────────────────────────────────────────────

const LAYOUT_KEY = 'ia-settings-layout-v2';

const TILE_IDS: TileId[] = [
  'branding', 'notifications', 'appearance', 'clinic', 'security', 'export',
  'locations', 'diagnoses', 'doctor-titles', 'nurse-titles',
];

function makeDefaultLayouts(): ResponsiveLayouts {
  // 3-col desktop grid: each tile is 1 wide, auto height (h=1 for collapsed, grid adjusts)
  const ids = TILE_IDS;
  const lg  = ids.map((id, i) => ({ i: id, x: i % 3, y: Math.floor(i / 3), w: 1, h: 1 }));
  const md  = ids.map((id, i) => ({ i: id, x: i % 2, y: Math.floor(i / 2), w: 1, h: 1 }));
  const sm  = ids.map((id, i) => ({ i: id, x: 0,     y: i,                 w: 1, h: 1 }));
  const xs  = ids.map((id, i) => ({ i: id, x: 0,     y: i,                 w: 1, h: 1 }));
  return { lg, md, sm, xs };
}

function isBrowser() { return typeof window !== 'undefined'; }

function loadLayouts(): ResponsiveLayouts {
  try {
    if (!isBrowser()) return makeDefaultLayouts();
    const s = localStorage.getItem(LAYOUT_KEY);
    if (s) return JSON.parse(s) as ResponsiveLayouts;
  } catch {}
  return makeDefaultLayouts();
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
  const [layouts, setLayouts]   = useState<ResponsiveLayouts>(() => loadLayouts());

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then((r) => r.json()).catch(() => ({})),
      fetch('/api/doctors?active=true').then((r) => r.json()).catch(() => ({ doctors: [] })),
    ]).then(([s, d]) => {
      setSettings(s as Settings);
      setDoctors((d as { doctors: Doctor[] }).doctors ?? []);
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
    const def = makeDefaultLayouts();
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

  const tiles = [
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
      id: 'locations' as TileId,
      node: <LocationsTile {...tileProps('locations')} />,
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
  ];

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
    <SettingsTile id="locations" icon="📍" title="Clinic Locations" editMode={editMode}
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
