'use client';

import { useState, useEffect, useCallback } from 'react';
import TopBar from '@/components/layout/TopBar';

const TITLES = ['RN', 'LPN', 'MA', 'CMA', 'NP', 'Other'];
const LOCATIONS = [
  'Main Clinic — Dumfries, VA',
  'North Branch — Woodbridge, VA',
  'South Branch — Stafford, VA',
];

interface Nurse {
  id: string;
  name: string;
  title: string;
  email: string | null;
  phone: string | null;
  clinicLocation: string | null;
  npi: string | null;
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

export default function NursesPage() {
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNurse, setEditingNurse] = useState<Nurse | null>(null);
  const [form, setForm] = useState<NurseFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Nurse | null>(null);
  const [showInactive, setShowInactive] = useState(false);

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

  const openAdd = () => {
    setEditingNurse(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (nurse: Nurse) => {
    setEditingNurse(nurse);
    setForm({
      name: nurse.name,
      title: nurse.title,
      email: nurse.email ?? '',
      phone: nurse.phone ?? '',
      clinicLocation: nurse.clinicLocation ?? '',
      npi: nurse.npi ?? '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingNurse(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Nurse name is required.');
      return;
    }
    setSubmitting(true);
    try {
      const url = editingNurse ? `/api/nurses/${editingNurse.id}` : '/api/nurses';
      const method = editingNurse ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
            <div style={{ padding: 32, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
              Loading nurses…
            </div>
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
                  {['Name', 'Title', 'Clinic Location', 'Email', 'Phone', 'NPI', 'Status', 'Actions'].map((h) => (
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
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      background: i % 2 === 0 ? '#fff' : '#fafafa',
                    }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>
                      {nurse.title} {nurse.name}
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
                          onClick={() => openEdit(nurse)}
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
                          onClick={() => toggleActive(nurse)}
                        >
                          {nurse.active ? 'Deactivate' : 'Reactivate'}
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '3px 10px', fontSize: 12, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}
                          onClick={() => setConfirmDelete(nurse)}
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
                    <select className="form-input" value={form.title} onChange={(e) => set('title', e.target.value)}>
                      {TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
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
                    {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
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
