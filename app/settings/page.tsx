'use client';

import { useState, useEffect, useCallback } from 'react';
import TopBar from '@/components/layout/TopBar';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Settings {
  app_title?: string;
  clinic_name?: string;
  tagline?: string;
  version_label?: string;
  clinic_locations?: string;
  diagnosis_options?: string;
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

type TileId = 'branding' | 'notifications' | 'appearance' | 'clinic' | 'security' | 'export';

// ─── Save helper ─────────────────────────────────────────────────────────────

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
    <input
      type={type}
      className="form-input"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Textarea({ value, onChange, rows = 4, placeholder }: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  return (
    <textarea
      className="form-input"
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
    />
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string; }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer',
          background: checked ? '#2ec4b6' : '#d1d5db', transition: 'background 0.2s',
        }}
      >
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
      <button
        onClick={onSave}
        disabled={saving}
        className="btn btn-teal"
        style={{ minWidth: 120 }}
      >
        {saving ? '⏳ Saving…' : '💾 Save Changes'}
      </button>
      {saved && !saving && (
        <span style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>✓ Saved successfully</span>
      )}
      {error && !saving && (
        <span style={{ fontSize: 13, color: '#c62828' }}>⚠ {error}</span>
      )}
    </div>
  );
}

// ─── Tile card ────────────────────────────────────────────────────────────────

function SettingsTile({
  id, icon, title, description, open, onToggle, children,
}: {
  id: TileId; icon: string; title: string; description: string;
  open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb',
        boxShadow: open ? '0 4px 24px rgba(0,0,0,0.10)' : '0 2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden', transition: 'box-shadow 0.2s',
      }}
    >
      {/* Card Header */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px',
          cursor: 'pointer', background: open ? '#f0fffe' : '#fff',
          borderBottom: open ? '1px solid #e5e7eb' : 'none',
          transition: 'background 0.15s',
        }}
      >
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
        <div style={{
          fontSize: 11, fontWeight: 700, color: open ? '#0d9488' : '#9ca3af',
          textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
        }}>
          {open ? 'Close ↑' : 'Edit →'}
        </div>
      </div>

      {/* Expanded Panel */}
      {open && (
        <div style={{ padding: '20px 24px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [openTile, setOpenTile] = useState<TileId | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Load all settings + doctors on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then((r) => r.json()),
      fetch('/api/doctors?active=true').then((r) => r.json()).catch(() => ({ doctors: [] })),
    ]).then(([s, d]) => {
      setSettings(s as Settings);
      setDoctors((d as { doctors: Doctor[] }).doctors ?? []);
      setLoading(false);
    });
  }, []);

  const toggleTile = useCallback((id: TileId) => {
    setOpenTile((prev) => (prev === id ? null : id));
  }, []);

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

  return (
    <>
      <TopBar
        title="Settings"
        breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Settings' }]}
      />
      <div className="page-content">
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>⚙️ Admin Control Center</h2>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            Configure your IMS settings. Changes take effect immediately except where noted.
          </p>
        </div>

        {/* Tile Grid — 3-col desktop, responsive */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 16,
        }}>

          {/* ── TILE 1: Branding ─────────────────────────────────────────── */}
          <BrandingTile
            open={openTile === 'branding'}
            onToggle={() => toggleTile('branding')}
            settings={settings}
            onSettingsChange={setSettings}
          />

          {/* ── TILE 2: Notifications ────────────────────────────────────── */}
          <NotificationsTile
            open={openTile === 'notifications'}
            onToggle={() => toggleTile('notifications')}
            settings={settings}
            onSettingsChange={setSettings}
          />

          {/* ── TILE 3: Appearance ───────────────────────────────────────── */}
          <AppearanceTile
            open={openTile === 'appearance'}
            onToggle={() => toggleTile('appearance')}
            settings={settings}
            onSettingsChange={setSettings}
          />

          {/* ── TILE 4: Clinic Defaults ──────────────────────────────────── */}
          <ClinicDefaultsTile
            open={openTile === 'clinic'}
            onToggle={() => toggleTile('clinic')}
            settings={settings}
            onSettingsChange={setSettings}
            doctors={doctors}
          />

          {/* ── TILE 5: Security ─────────────────────────────────────────── */}
          <SecurityTile
            open={openTile === 'security'}
            onToggle={() => toggleTile('security')}
            settings={settings}
            onSettingsChange={setSettings}
          />

          {/* ── TILE 6: Data & Export ─────────────────────────────────────── */}
          <ExportTile
            open={openTile === 'export'}
            onToggle={() => toggleTile('export')}
          />
        </div>
      </div>
    </>
  );
}

// ─── TILE 1: Branding ────────────────────────────────────────────────────────

function BrandingTile({ open, onToggle, settings, onSettingsChange }: {
  open: boolean; onToggle: () => void;
  settings: Settings; onSettingsChange: (s: Settings) => void;
}) {
  const [appTitle, setAppTitle] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [tagline, setTagline] = useState('');
  const [versionLabel, setVersionLabel] = useState('');
  const [locations, setLocations] = useState('');
  const [diagnoses, setDiagnoses] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAppTitle(settings.app_title ?? 'Integrated Allergy IMS');
    setClinicName(settings.clinic_name ?? 'Integrated Allergy');
    setTagline(settings.tagline ?? 'Testing & Treatment');
    setVersionLabel(settings.version_label ?? 'IMS v2.0 · © 2026');
    const locs = parseJsonArray(settings.clinic_locations, [
      'Main Clinic — Dumfries, VA',
      'North Branch — Woodbridge, VA',
      'South Branch — Stafford, VA',
    ]);
    const diags = parseJsonArray(settings.diagnosis_options, [
      'Allergic Rhinitis', 'Asthma', 'Asthma + Allergic Rhinitis',
      'Allergic Rhinitis + Eczema', 'AR + Asthma + Eczema', 'Other',
    ]);
    setLocations(locs.join('\n'));
    setDiagnoses(diags.join('\n'));
  }, [settings]);

  const handleSave = async () => {
    setSaving(true); setSaved(false); setError(null);
    try {
      const locArr = locations.split('\n').map((l) => l.trim()).filter(Boolean);
      const diagArr = diagnoses.split('\n').map((d) => d.trim()).filter(Boolean);
      const patch: Record<string, string> = {
        app_title: appTitle,
        clinic_name: clinicName,
        tagline,
        version_label: versionLabel,
        clinic_locations: JSON.stringify(locArr),
        diagnosis_options: JSON.stringify(diagArr),
      };
      await saveSettings(patch);
      onSettingsChange({ ...settings, ...patch });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save. Check connection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsTile id="branding" icon="🏷️" title="Title & Branding" open={open} onToggle={onToggle}
      description="Clinic name, app title, locations, and diagnosis options">
      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <Label>App Title (browser tab)</Label>
          <Input value={appTitle} onChange={setAppTitle} placeholder="Integrated Allergy IMS" />
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>⚠ Tab title reflects on next redeployment</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <Label>Clinic Name</Label>
            <Input value={clinicName} onChange={setClinicName} placeholder="Integrated Allergy" />
          </div>
          <div>
            <Label>Tagline</Label>
            <Input value={tagline} onChange={setTagline} placeholder="Testing & Treatment" />
          </div>
        </div>
        <div>
          <Label>Version Label</Label>
          <Input value={versionLabel} onChange={setVersionLabel} placeholder="IMS v2.0 · © 2026" />
        </div>
        <div>
          <Label>Clinic Locations (one per line)</Label>
          <Textarea value={locations} onChange={setLocations} rows={4} placeholder="Main Clinic — Dumfries, VA&#10;North Branch — Woodbridge, VA" />
        </div>
        <div>
          <Label>Diagnosis Options (one per line)</Label>
          <Textarea value={diagnoses} onChange={setDiagnoses} rows={6} placeholder="Allergic Rhinitis&#10;Asthma&#10;Other" />
        </div>
      </div>
      <SaveBar saving={saving} saved={saved} error={error} onSave={handleSave} />
    </SettingsTile>
  );
}

// ─── TILE 2: Notifications ───────────────────────────────────────────────────

function NotificationsTile({ open, onToggle, settings, onSettingsChange }: {
  open: boolean; onToggle: () => void;
  settings: Settings; onSettingsChange: (s: Settings) => void;
}) {
  const [email, setEmail] = useState('');
  const [expiryDays, setExpiryDays] = useState('14');
  const [doseReminders, setDoseReminders] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEmail(settings.notify_email ?? '');
    setExpiryDays(settings.notify_expiry_days ?? '14');
    setDoseReminders((settings.notify_doses ?? 'true') === 'true');
  }, [settings]);

  const handleSave = async () => {
    setSaving(true); setSaved(false); setError(null);
    try {
      const patch: Record<string, string> = {
        notify_email: email,
        notify_expiry_days: expiryDays,
        notify_doses: String(doseReminders),
      };
      await saveSettings(patch);
      onSettingsChange({ ...settings, ...patch });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsTile id="notifications" icon="🔔" title="Notifications" open={open} onToggle={onToggle}
      description="Vial expiry alerts and dose reminder settings">
      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <Label>Alert Email Address</Label>
          <Input type="email" value={email} onChange={setEmail} placeholder="clinic@example.com" />
        </div>
        <div>
          <Label>Days Before Expiry to Alert</Label>
          <select
            className="form-input"
            value={expiryDays}
            onChange={(e) => setExpiryDays(e.target.value)}
          >
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
          </select>
        </div>
        <div>
          <Toggle checked={doseReminders} onChange={setDoseReminders} label="Enable dose reminder notifications" />
        </div>
        <div style={{ fontSize: 12, color: '#9ca3af', background: '#f9fafb', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          💡 Notification delivery requires integration with an email provider (SendGrid, SES, etc). These settings store your preferences for when that integration is configured.
        </div>
      </div>
      <SaveBar saving={saving} saved={saved} error={error} onSave={handleSave} />
    </SettingsTile>
  );
}

// ─── TILE 3: Appearance ──────────────────────────────────────────────────────

function AppearanceTile({ open, onToggle, settings, onSettingsChange }: {
  open: boolean; onToggle: () => void;
  settings: Settings; onSettingsChange: (s: Settings) => void;
}) {
  const [primaryColor, setPrimaryColor] = useState('#2ec4b6');
  const [sidebarStyle, setSidebarStyle] = useState('light');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrimaryColor(settings.primary_color ?? '#2ec4b6');
    setSidebarStyle(settings.sidebar_style ?? 'light');
    setDateFormat(settings.date_format ?? 'MM/DD/YYYY');
  }, [settings]);

  const handleSave = async () => {
    setSaving(true); setSaved(false); setError(null);
    try {
      const patch: Record<string, string> = {
        primary_color: primaryColor,
        sidebar_style: sidebarStyle,
        date_format: dateFormat,
      };
      await saveSettings(patch);
      onSettingsChange({ ...settings, ...patch });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsTile id="appearance" icon="🎨" title="Appearance" open={open} onToggle={onToggle}
      description="Primary color, sidebar style, and date format">
      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <Label>Primary Accent Color</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              style={{ width: 48, height: 36, padding: 2, border: '1.5px solid #d1d5db', borderRadius: 8, cursor: 'pointer' }}
            />
            <Input value={primaryColor} onChange={setPrimaryColor} placeholder="#2ec4b6" />
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['#2ec4b6', '#0055a5', '#7c3aed', '#dc2626', '#059669', '#d97706'].map((c) => (
              <div
                key={c}
                onClick={() => setPrimaryColor(c)}
                style={{
                  width: 28, height: 28, borderRadius: 6, background: c, cursor: 'pointer',
                  border: primaryColor === c ? '3px solid #1f2937' : '2px solid transparent',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'border 0.15s',
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>⚠ Color theme applies on next page reload</div>
        </div>
        <div>
          <Label>Sidebar Style</Label>
          <div style={{ display: 'flex', gap: 10 }}>
            {['light', 'dark'].map((s) => (
              <button
                key={s}
                onClick={() => setSidebarStyle(s)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, border: '1.5px solid',
                  borderColor: sidebarStyle === s ? '#2ec4b6' : '#e5e7eb',
                  background: sidebarStyle === s ? '#e8f9f7' : '#fff',
                  color: sidebarStyle === s ? '#0d9488' : '#374151',
                  fontWeight: sidebarStyle === s ? 700 : 500,
                  cursor: 'pointer', fontSize: 13, textTransform: 'capitalize',
                }}
              >
                {s === 'light' ? '☀️ Light' : '🌙 Dark'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Date Format</Label>
          <select
            className="form-input"
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
          >
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

// ─── TILE 4: Clinic Defaults ─────────────────────────────────────────────────

function ClinicDefaultsTile({ open, onToggle, settings, onSettingsChange, doctors }: {
  open: boolean; onToggle: () => void;
  settings: Settings; onSettingsChange: (s: Settings) => void;
  doctors: Doctor[];
}) {
  const [defaultPhysician, setDefaultPhysician] = useState('');
  const [defaultLocation, setDefaultLocation] = useState('');
  const [vialExpiryDays, setVialExpiryDays] = useState('90');
  const [glycerinPct, setGlycerinPct] = useState('10');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locations = parseJsonArray(settings.clinic_locations, [
    'Main Clinic — Dumfries, VA',
    'North Branch — Woodbridge, VA',
    'South Branch — Stafford, VA',
  ]);

  useEffect(() => {
    setDefaultPhysician(settings.default_physician ?? '');
    setDefaultLocation(settings.default_location ?? '');
    setVialExpiryDays(settings.default_vial_expiry_days ?? '90');
    setGlycerinPct(settings.default_glycerin_pct ?? '10');
  }, [settings]);

  const handleSave = async () => {
    setSaving(true); setSaved(false); setError(null);
    try {
      const patch: Record<string, string> = {
        default_physician: defaultPhysician,
        default_location: defaultLocation,
        default_vial_expiry_days: vialExpiryDays,
        default_glycerin_pct: glycerinPct,
      };
      await saveSettings(patch);
      onSettingsChange({ ...settings, ...patch });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsTile id="clinic" icon="👥" title="Clinic Defaults" open={open} onToggle={onToggle}
      description="Default physician, location, vial expiry, and glycerin percentage">
      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <Label>Default Physician</Label>
          <select className="form-input" value={defaultPhysician} onChange={(e) => setDefaultPhysician(e.target.value)}>
            <option value="">No default</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.name}, {d.title}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Default Clinic Location</Label>
          <select className="form-input" value={defaultLocation} onChange={(e) => setDefaultLocation(e.target.value)}>
            <option value="">No default</option>
            {locations.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <Label>Default Vial Expiry (days)</Label>
            <Input type="number" value={vialExpiryDays} onChange={setVialExpiryDays} placeholder="90" />
          </div>
          <div>
            <Label>Default Glycerin %</Label>
            <Input type="number" value={glycerinPct} onChange={setGlycerinPct} placeholder="10" />
          </div>
        </div>
      </div>
      <SaveBar saving={saving} saved={saved} error={error} onSave={handleSave} />
    </SettingsTile>
  );
}

// ─── TILE 5: Security ────────────────────────────────────────────────────────

function SecurityTile({ open, onToggle, settings, onSettingsChange }: {
  open: boolean; onToggle: () => void;
  settings: Settings; onSettingsChange: (s: Settings) => void;
}) {
  const [sessionTimeout, setSessionTimeout] = useState('60');
  const [requireConfirm, setRequireConfirm] = useState(true);
  const [auditPublic, setAuditPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSessionTimeout(settings.session_timeout ?? '60');
    setRequireConfirm((settings.require_confirm_delete ?? 'true') === 'true');
    setAuditPublic((settings.audit_log_public ?? 'false') === 'true');
  }, [settings]);

  const handleSave = async () => {
    setSaving(true); setSaved(false); setError(null);
    try {
      const patch: Record<string, string> = {
        session_timeout: sessionTimeout,
        require_confirm_delete: String(requireConfirm),
        audit_log_public: String(auditPublic),
      };
      await saveSettings(patch);
      onSettingsChange({ ...settings, ...patch });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsTile id="security" icon="🔒" title="Security & Access" open={open} onToggle={onToggle}
      description="Session timeout, delete confirmation, and audit log visibility">
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
        <Toggle checked={auditPublic} onChange={setAuditPublic} label="Show audit log to all users (not just admins)" />
        <div style={{ fontSize: 12, color: '#9ca3af', background: '#fffbeb', padding: '10px 12px', borderRadius: 8, border: '1px solid #fef08a' }}>
          🔒 Full auth and session enforcement requires an auth provider (NextAuth, Clerk, etc). These settings store your security preferences for when that is configured.
        </div>
      </div>
      <SaveBar saving={saving} saved={saved} error={error} onSave={handleSave} />
    </SettingsTile>
  );
}

// ─── TILE 6: Data & Export ───────────────────────────────────────────────────

function ExportTile({ open, onToggle }: { open: boolean; onToggle: () => void; }) {
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
    if (status[key] === 'error') return '⚠ Failed — retry';
    return idle;
  };

  const btnColor = (key: string): React.CSSProperties => {
    if (status[key] === 'done') return { background: '#059669', color: '#fff', border: 'none' };
    if (status[key] === 'error') return { background: '#dc2626', color: '#fff', border: 'none' };
    return {};
  };

  const ExportCard = ({ icon, title, desc, btnKey, url, filename, label }: {
    icon: string; title: string; desc: string; btnKey: string; url: string; filename: string; label: string;
  }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
      background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb',
    }}>
      <div style={{ fontSize: 24, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#1f2937' }}>{title}</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{desc}</div>
      </div>
      <button
        className="btn btn-secondary btn-sm"
        disabled={status[btnKey] === 'loading'}
        onClick={() => doExport(btnKey, url, filename)}
        style={{ ...btnColor(btnKey), flexShrink: 0, whiteSpace: 'nowrap' }}
      >
        {btnLabel(btnKey, label)}
      </button>
    </div>
  );

  return (
    <SettingsTile id="export" icon="📊" title="Data & Export" open={open} onToggle={onToggle}
      description="Export patients, audit logs, or create a full data backup">
      <div style={{ display: 'grid', gap: 10 }}>
        <ExportCard
          icon="👥" title="Patient List (CSV)"
          desc="All active patients with clinical info"
          btnKey="patients" url="/api/export/patients"
          filename={`patients-${new Date().toISOString().slice(0, 10)}.csv`}
          label="⬇ Export CSV"
        />
        <ExportCard
          icon="📋" title="Audit Log (CSV)"
          desc="Full activity history, most recent first"
          btnKey="audit" url="/api/export/audit-log"
          filename={`audit-log-${new Date().toISOString().slice(0, 10)}.csv`}
          label="⬇ Export CSV"
        />
        <ExportCard
          icon="💾" title="Full Backup (JSON)"
          desc="All data: patients, doctors, vials, allergens, appointments"
          btnKey="backup" url="/api/export/backup"
          filename={`ims-backup-${new Date().toISOString().slice(0, 10)}.json`}
          label="⬇ Download Backup"
        />
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
          Exports contain live data. Store securely and in compliance with your data retention policy.
        </div>
      </div>
    </SettingsTile>
  );
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function parseJsonArray(val: string | undefined, fallback: string[]): string[] {
  if (!val) return fallback;
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed as string[];
  } catch { /* ignore */ }
  return fallback;
}
