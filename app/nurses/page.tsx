/**
 * @file app/nurses/page.tsx — Nursing staff roster management page
 *
 * Displays, creates, edits, and toggles active status for nurse records.
 * Mirrors the doctors page structure. Nursing credential titles (RN, LPN, MA, etc.)
 * are loaded from the Settings API (NurseTitle model) with a hardcoded fallback list.
 * Supports active/inactive filter toggle and photo URL entry.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import TopBar from '@/components/layout/TopBar';
import { SkeletonRow } from '@/components/ui/SkeletonRow';

const FALLBACK_TITLES = ['RN', 'LPN', 'MA', 'CMA', 'NP', 'Other'];
const OTHER_SENTINEL = '__other__';

interface Nurse {
  id: string;
  name: string;
  title: string;
  email: string | null;
  phone: string | null;
  clinicLocation: string | null;
  npi: string | null;
  photoUrl: string | null;
  active: boolean;
  createdAt: string;
}

interface NurseFormData {
  name: string;
  title: string;
  email: string;
  phone: string;
  clinicLocation: string;
  npi: string;
}

const EMPTY_FORM: NurseFormData = {
  name: '',
  title: 'RN',
  email: '',
  phone: '',
  clinicLocation: '',
  npi: '',
};

const AVATAR_COLORS = [
  '#0055a5', '#059669', '#7c3aed', '#b45309', '#dc2626',
  '#0891b2', '#d97706', '#15803d', '#9333ea', '#1d4ed8',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Avatar({ name, photoUrl, size = 40 }: { name: string; photoUrl: string | null; size?: number }) {
  const initials = getInitials(name);
  const color = getAvatarColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden',
      background: photoUrl ? 'transparent' : color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {photoUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={photoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ color: '#fff', fontWeight: 700, fontSize: size * 0.35 }}>{initials}</span>
      }
    </div>
  );
}

export default function NursesPage() {
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNurse, setEditingNurse] = useState<Nurse | null>(null);
  const [form, setForm] = useState<NurseFormData>(EMPTY_FORM);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Nurse | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  // Title dropdown + free-text
  const [titleOptions, setTitleOptions] = useState<string[]>(FALLBACK_TITLES);
  const [titleDropdown, setTitleDropdown] = useState('RN');
  const [titleCustom, setTitleCustom] = useState('');
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  // Load title options + locations once
  useEffect(() => {
    fetch('/api/nurse-titles?active=true')
      .then((r) => r.json())
      .then((d: { titles: { id: string; name: string }[] }) => {
        const names = d.titles?.map((t) => t.name) ?? [];
        setTitleOptions(names.length ? names : FALLBACK_TITLES);
      })
      .catch(() => setTitleOptions(FALLBACK_TITLES));
    fetch('/api/locations?active=true')
      .then((r) => r.json())
      .then((d: { locations: { id: string; name: string }[] }) => setLocations(d.locations ?? []))
      .catch(() => setLocations([]));
  }, []);

  const fetchNurses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/nurses');
      const data = await res.json();
      setNurses(data.nurses ?? []);
    } catch {
      setNurses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNurses(); }, [fetchNurses]);

  const set = (field: keyof NurseFormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Photo must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const titleToState = useCallback((t: string) => {
    if (titleOptions.includes(t)) return { drop: t, custom: '' };
    return { drop: OTHER_SENTINEL, custom: t };
  }, [titleOptions]);

  const openAdd = () => {
    setEditingNurse(null);
    setForm(EMPTY_FORM);
    setPhotoPreview('');
    setFormError(null);
    const { drop, custom } = titleToState('RN');
    setTitleDropdown(drop);
    setTitleCustom(custom);
    setShowModal(true);
  };

  const openEdit = (nurse: Nurse) => {
    setEditingNurse(nurse);
    const { drop, custom } = titleToState(nurse.title);
    setTitleDropdown(drop);
    setTitleCustom(custom);
    setForm({
      name: nurse.name,
      title: nurse.title,
      email: nurse.email ?? '',
      phone: nurse.phone ?? '',
      clinicLocation: nurse.clinicLocation ?? '',
      npi: nurse.npi ?? '',
    });
    setPhotoPreview(nurse.photoUrl ?? '');
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingNurse(null);
    setPhotoPreview('');
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Nurse name is required.');
      return;
    }
    const resolvedTitle = titleDropdown === OTHER_SENTINEL
      ? (titleCustom.trim() || 'Other')
      : titleDropdown;
    setSubmitting(true);
    try {
      const url = editingNurse ? `/api/nurses/${editingNurse.id}` : '/api/nurses';
      const method = editingNurse ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, title: resolvedTitle, photoUrl: photoPreview }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error ?? 'Failed to save nurse.');
        return;
      }
      await fetchNurses();
      closeModal();
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (nurse: Nurse) => {
    try {
      await fetch(`/api/nurses/${nurse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !nurse.active }),
      });
      await fetchNurses();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (nurse: Nurse) => {
    try {
      await fetch(`/api/nurses/${nurse.id}`, { method: 'DELETE' });
      await fetchNurses();
      setConfirmDelete(null);
    } catch {
      // ignore
    }
  };

  const displayed = showInactive ? nurses : nurses.filter((n) => n.active);

  return (
    <>
      <TopBar
        title="Nurses"
        breadcrumbs={[
          { label: 'Integrated Allergy IMS' },
          { label: 'Nurses' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Show inactive
            </label>
            <button className="btn btn-primary" onClick={openAdd}>
              + Add Nurse
            </button>
          </div>
        }
      />
      <div className="page-content">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['', 'Name', 'Title', 'Clinic Location', 'Email', 'Phone', 'NPI', 'Status', 'Actions'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonRow key={i} cols={9} />
                ))}
              </tbody>
            </table>
          ) : displayed.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👩‍⚕️</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No nurses found</div>
              <div>Add a nurse to get started.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['', 'Name', 'Title', 'Clinic Location', 'Email', 'Phone', 'NPI', 'Status', 'Actions'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 14px',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#374151',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((nurse, i) => (
                  <tr
                    key={nurse.id}
                    onClick={() => openEdit(nurse)}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      background: i % 2 === 0 ? '#fff' : '#fafafa',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fffe')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa')}
                  >
                    <td style={{ padding: '8px 8px 8px 14px', width: 48 }}>
                      <Avatar name={nurse.name} photoUrl={nurse.photoUrl} size={40} />
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>
                      {nurse.name}, {nurse.title}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#374151' }}>{nurse.title}</td>
                    <td style={{ padding: '10px 14px', color: '#374151' }}>{nurse.clinicLocation ?? '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#374151' }}>{nurse.email ?? '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#374151' }}>{nurse.phone ?? '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#6b7280', fontFamily: 'monospace', fontSize: 12 }}>
                      {nurse.npi ?? '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          background: nurse.active ? '#dcfce7' : '#f3f4f6',
                          color: nurse.active ? '#15803d' : '#6b7280',
                        }}
                      >
                        {nurse.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6, whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '3px 10px', fontSize: 12 }}
                          onClick={(e) => { e.stopPropagation(); openEdit(nurse); }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{
                            padding: '3px 10px',
                            fontSize: 12,
                            background: nurse.active ? '#fff7ed' : '#f0fdf4',
                            color: nurse.active ? '#c2410c' : '#15803d',
                            border: `1px solid ${nurse.active ? '#fed7aa' : '#bbf7d0'}`,
                          }}
                          onClick={(e) => { e.stopPropagation(); toggleActive(nurse); }}
                        >
                          {nurse.active ? 'Deactivate' : 'Reactivate'}
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '3px 10px', fontSize: 12, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete(nurse); }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            style={{
              background: '#fff', width: 540, maxHeight: '90vh', overflowY: 'auto',
              borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
                {editingNurse ? '✏️ Edit Nurse' : '👩‍⚕️ Add Nurse'}
              </h2>
              <button
                onClick={closeModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280', padding: 4 }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Photo Upload */}
                <div style={{ textAlign: 'center', marginBottom: 4 }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%', margin: '0 auto 10px',
                    overflow: 'hidden', background: photoPreview ? 'transparent' : (form.name ? getAvatarColor(form.name) : '#e5e7eb'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {photoPreview
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : form.name
                        ? <span style={{ fontSize: 28, color: '#fff', fontWeight: 700 }}>{getInitials(form.name)}</span>
                        : <span style={{ fontSize: 28, color: '#9ca3af' }}>👤</span>
                    }
                  </div>
                  <label style={{ cursor: 'pointer', color: '#0055a5', fontSize: 13, fontWeight: 600 }}>
                    📷 Upload Photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={handlePhotoChange}
                    />
                  </label>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={() => setPhotoPreview('')}
                      style={{ marginLeft: 8, color: '#dc2626', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                {formError && (
                  <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', fontSize: 13, borderRadius: 4, border: '1px solid #fecaca' }}>
                    {formError}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                  <div>
                    <label className="form-label">Name <span style={{ color: '#c62828' }}>*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      placeholder="Johnson"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Title</label>
                    <select
                      className="form-input"
                      value={titleDropdown}
                      onChange={(e) => {
                        setTitleDropdown(e.target.value);
                        if (e.target.value !== OTHER_SENTINEL) {
                          setTitleCustom('');
                          set('title', e.target.value);
                        }
                      }}
                    >
                      {titleOptions.filter((t) => t !== 'Other').map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                      <option value={OTHER_SENTINEL}>Other (type custom)…</option>
                    </select>
                    {titleDropdown === OTHER_SENTINEL && (
                      <input
                        type="text"
                        className="form-input"
                        style={{ marginTop: 6 }}
                        placeholder="Type custom title…"
                        value={titleCustom}
                        onChange={(e) => { setTitleCustom(e.target.value); set('title', e.target.value); }}
                        autoFocus
                      />
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder="nurse@clinic.com"
                    />
                  </div>
                  <div>
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={form.phone}
                      onChange={(e) => set('phone', e.target.value)}
                      placeholder="(555) 000-0000"
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Clinic Location</label>
                  <select className="form-input" value={form.clinicLocation} onChange={(e) => set('clinicLocation', e.target.value)}>
                    <option value="">Select location…</option>
                    {locations.map((l) => <option key={l.id} value={l.name}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">NPI Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.npi}
                    onChange={(e) => set('npi', e.target.value)}
                    placeholder="1234567890"
                    maxLength={10}
                  />
                </div>
              </div>
              <div style={{ padding: '14px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving…' : editingNurse ? 'Save Changes' : 'Add Nurse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001,
          }}
        >
          <div style={{ background: '#fff', width: 400, borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: 24 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#111827' }}>⚠️ Confirm Deactivation</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#374151' }}>
              Are you sure you want to deactivate <strong>{confirmDelete.title} {confirmDelete.name}</strong>?
              They will be set to inactive and removed from vial batch dropdowns.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
                onClick={() => handleDelete(confirmDelete)}
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
