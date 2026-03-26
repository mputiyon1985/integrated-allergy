'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  entityId: string | null;
  entityName: string | null;
  locationCount: number;
  locationIds: string[];
  locations: { id: string; name: string }[];
  active: boolean;
  mfaEnabled: boolean;
  createdAt: string;
}

interface BusinessEntity {
  id: string;
  name: string;
}

interface ClinicLocation {
  id: string;
  name: string;
  entityId: string | null;
}

interface Doctor {
  id: string;
  name: string;
  title: string;
  email: string | null;
  entityId: string | null;
}

interface Nurse {
  id: string;
  name: string;
  title: string;
  email: string | null;
  entityId: string | null;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  role: string;
  entityId: string;
  locationIds: string[];
  doctorId: string;
  nurseId: string;
  active: boolean;
}

const EMPTY_FORM: FormData = {
  name: '',
  email: '',
  password: '',
  role: 'location_staff',
  entityId: '',
  locationIds: [],
  doctorId: '',
  nurseId: '',
  active: true,
};

// ─── Role badge ──────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    super_admin: { bg: '#f3e8ff', color: '#7c3aed', label: 'Super Admin' },
    entity_admin: { bg: '#dbeafe', color: '#1d4ed8', label: 'Entity Admin' },
    location_staff: { bg: '#f3f4f6', color: '#6b7280', label: 'Location Staff' },
  };
  const s = styles[role] ?? styles.location_staff;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 9999, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
      {s.label}
    </span>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#0d9488', '#2563eb', '#7c3aed', '#db2777', '#ea580c'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [entities, setEntities] = useState<BusinessEntity[]>([]);
  const [locations, setLocations] = useState<ClinicLocation[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [importValue, setImportValue] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Check auth
  useEffect(() => {
    fetch('/api/auth/me').then((r) => {
      if (!r.ok) { router.push('/login'); return; }
      return r.json();
    }).then((data) => {
      if (data?.user?.role !== 'super_admin') {
        router.push('/dashboard');
      }
    }).catch(() => router.push('/login'));
  }, [router]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/users');
      if (!r.ok) throw new Error('Failed to fetch');
      const data = await r.json();
      setUsers(data.users ?? []);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReferenceData = useCallback(async () => {
    const [entR, locR, docR, nurR] = await Promise.all([
      fetch('/api/settings').then((r) => r.json()).catch(() => ({})),
      fetch('/api/locations?active=true').then((r) => r.json()).catch(() => ({ locations: [] })),
      fetch('/api/doctors?active=true').then((r) => r.json()).catch(() => ({ doctors: [] })),
      fetch('/api/nurses?active=true').then((r) => r.json()).catch(() => ({ nurses: [] })),
    ]);
    // entities via a separate route (or settings)
    const entRes = await fetch('/api/entities').then((r) => r.json()).catch(() => ({ entities: [] }));
    setEntities(entRes.entities ?? []);
    setLocations(locR.locations ?? []);
    setDoctors(docR.doctors ?? []);
    setNurses(nurR.nurses ?? []);
  }, []);

  useEffect(() => {
    loadUsers();
    loadReferenceData();
  }, [loadUsers, loadReferenceData]);

  const openAdd = () => {
    setEditUser(null);
    setFormData(EMPTY_FORM);
    setImportValue('');
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (user: AppUser) => {
    setEditUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      entityId: user.entityId ?? '',
      locationIds: user.locationIds,
      doctorId: '',
      nurseId: '',
      active: user.active,
    });
    setImportValue('');
    setFormError(null);
    setShowModal(true);
  };

  const handleImport = (value: string) => {
    setImportValue(value);
    if (!value) return;
    const [type, id] = value.split(':');
    if (type === 'doctor') {
      const doc = doctors.find((d) => d.id === id);
      if (doc) {
        setFormData((f) => ({
          ...f,
          name: doc.name,
          email: doc.email ?? f.email,
          entityId: doc.entityId ?? f.entityId,
          doctorId: doc.id,
        }));
      }
    } else if (type === 'nurse') {
      const nur = nurses.find((n) => n.id === id);
      if (nur) {
        setFormData((f) => ({
          ...f,
          name: nur.name,
          email: nur.email ?? f.email,
          entityId: nur.entityId ?? f.entityId,
          nurseId: nur.id,
        }));
      }
    }
  };

  const filteredLocations = locations.filter(
    (l) => !formData.entityId || l.entityId === formData.entityId || !l.entityId
  );

  const toggleLocation = (locationId: string) => {
    setFormData((f) => ({
      ...f,
      locationIds: f.locationIds.includes(locationId)
        ? f.locationIds.filter((id) => id !== locationId)
        : [...f.locationIds, locationId],
    }));
  };

  const handleSave = async () => {
    setFormError(null);
    if (!formData.name.trim()) { setFormError('Name is required'); return; }
    if (!formData.email.trim()) { setFormError('Email is required'); return; }
    if (!editUser && !formData.password) { setFormError('Password is required for new users'); return; }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        ...(formData.password ? { password: formData.password } : {}),
        role: formData.role,
        entityId: formData.entityId || null,
        locationIds: formData.locationIds,
        doctorId: formData.doctorId || null,
        nurseId: formData.nurseId || null,
        active: formData.active,
      };

      const url = editUser ? `/api/users/${editUser.id}` : '/api/users';
      const method = editUser ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await r.json();

      if (!r.ok) {
        setFormError(data.error ?? 'Failed to save user');
        return;
      }

      setShowModal(false);
      loadUsers();
    } catch {
      setFormError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: AppUser) => {
    if (!confirm(`Delete user ${user.name}? This cannot be undone.`)) return;
    setDeleting(user.id);
    try {
      await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      loadUsers();
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleActive = async (user: AppUser) => {
    await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !user.active }),
    });
    loadUsers();
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>👤 User Management</h1>
          <p style={{ color: '#6b7280', marginTop: 4, fontSize: 14 }}>Manage system users, roles, and access</p>
        </div>
        <button
          onClick={openAdd}
          style={{ background: '#0d9488', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span style={{ fontSize: 18 }}>+</span> Add User
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>Loading users…</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#ef4444' }}>{error}</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['', 'Name', 'Email', 'Role', 'Entity', 'Locations', 'Status', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>No users found</td>
                </tr>
              ) : users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => openEdit(user)}
                  style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  <td style={{ padding: '12px 16px', width: 48 }}><Avatar name={user.name} /></td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827', fontSize: 14 }}>{user.name}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 14 }}>{user.email}</td>
                  <td style={{ padding: '12px 16px' }}><RoleBadge role={user.role} /></td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 14 }}>{user.entityName ?? <span style={{ color: '#d1d5db' }}>—</span>}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 14 }}>
                    {user.locationCount > 0 ? `${user.locationCount} location${user.locationCount > 1 ? 's' : ''}` : <span style={{ color: '#d1d5db' }}>All</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: user.active ? '#d1fae5' : '#fee2e2', color: user.active ? '#065f46' : '#991b1b', borderRadius: 9999, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleToggleActive(user)}
                        style={{ background: user.active ? '#fef3c7' : '#d1fae5', color: user.active ? '#92400e' : '#065f46', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                      >
                        {user.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={deleting === user.id}
                        style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                      >
                        {deleting === user.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div
            style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', padding: 32, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>
                {editUser ? 'Edit User' : 'Add User'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af', padding: '4px 8px' }}>✕</button>
            </div>

            {formError && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
                {formError}
              </div>
            )}

            {/* Import from Doctor/Nurse */}
            {!editUser && (
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Import from existing staff...</label>
                <select
                  value={importValue}
                  onChange={(e) => handleImport(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">— Select to pre-fill —</option>
                  {doctors.length > 0 && (
                    <optgroup label="Doctors">
                      {doctors.map((d) => (
                        <option key={`doctor:${d.id}`} value={`doctor:${d.id}`}>{d.title} {d.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {nurses.length > 0 && (
                    <optgroup label="Nurses">
                      {nurses.map((n) => (
                        <option key={`nurse:${n.id}`} value={`nurse:${n.id}`}>{n.title} {n.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gap: 16 }}>
              {/* Name */}
              <div>
                <label style={labelStyle}>Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                  style={inputStyle}
                />
              </div>

              {/* Email */}
              <div>
                <label style={labelStyle}>Email <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@example.com"
                  style={inputStyle}
                />
              </div>

              {/* Password */}
              <div>
                <label style={labelStyle}>
                  {editUser ? 'New Password (leave blank to keep current)' : 'Temporary Password'} {!editUser && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
                  placeholder={editUser ? 'Enter new password…' : 'Temporary password'}
                  style={inputStyle}
                />
              </div>

              {/* Role */}
              <div>
                <label style={labelStyle}>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData((f) => ({ ...f, role: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="entity_admin">Entity Admin</option>
                  <option value="location_staff">Location Staff</option>
                </select>
              </div>

              {/* Entity */}
              <div>
                <label style={labelStyle}>Entity</label>
                <select
                  value={formData.entityId}
                  onChange={(e) => {
                    setFormData((f) => ({ ...f, entityId: e.target.value, locationIds: [] }));
                  }}
                  style={inputStyle}
                >
                  <option value="">All — Super Admin</option>
                  {entities.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              {/* Location Access */}
              {filteredLocations.length > 0 && (
                <div>
                  <label style={labelStyle}>Location Access</label>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filteredLocations.map((loc) => (
                      <label key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#374151' }}>
                        <input
                          type="checkbox"
                          checked={formData.locationIds.includes(loc.id)}
                          onChange={() => toggleLocation(loc.id)}
                          style={{ accentColor: '#0d9488' }}
                        />
                        {loc.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Link Doctor */}
              <div>
                <label style={labelStyle}>Link to Doctor Record (optional)</label>
                <select
                  value={formData.doctorId}
                  onChange={(e) => setFormData((f) => ({ ...f, doctorId: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">— None —</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.title} {d.name}</option>
                  ))}
                </select>
              </div>

              {/* Link Nurse */}
              <div>
                <label style={labelStyle}>Link to Nurse Record (optional)</label>
                <select
                  value={formData.nurseId}
                  onChange={(e) => setFormData((f) => ({ ...f, nurseId: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">— None —</option>
                  {nurses.map((n) => (
                    <option key={n.id} value={n.id}>{n.title} {n.name}</option>
                  ))}
                </select>
              </div>

              {/* Active toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Active</label>
                <button
                  type="button"
                  onClick={() => setFormData((f) => ({ ...f, active: !f.active }))}
                  style={{
                    width: 44, height: 24, borderRadius: 9999, border: 'none', cursor: 'pointer',
                    background: formData.active ? '#0d9488' : '#d1d5db',
                    position: 'relative', transition: 'background 0.2s',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 2, left: formData.active ? 22 : 2,
                    width: 20, height: 20, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s',
                  }} />
                </button>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{formData.active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 28, paddingTop: 20, borderTop: '1px solid #f3f4f6' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ background: '#0d9488', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Saving…' : editUser ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  fontSize: 14,
  color: '#111827',
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
};
