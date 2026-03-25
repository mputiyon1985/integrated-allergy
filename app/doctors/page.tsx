'use client';

import { useState, useEffect, useCallback } from 'react';
import TopBar from '@/components/layout/TopBar';

const TITLES = ['MD', 'DO', 'NP', 'PA', 'Other'];
const LOCATIONS = [
  'Main Clinic — Dumfries, VA',
  'North Branch — Woodbridge, VA',
  'South Branch — Stafford, VA',
];

interface Doctor {
  id: string;
  name: string;
  title: string;
  specialty: string;
  email: string | null;
  phone: string | null;
  clinicLocation: string | null;
  npi: string | null;
  active: boolean;
  createdAt: string;
}

interface DoctorFormData {
  name: string;
  title: string;
  specialty: string;
  email: string;
  phone: string;
  clinicLocation: string;
  npi: string;
}

const EMPTY_FORM: DoctorFormData = {
  name: '',
  title: 'MD',
  specialty: 'Allergy & Immunology',
  email: '',
  phone: '',
  clinicLocation: '',
  npi: '',
};

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [form, setForm] = useState<DoctorFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Doctor | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/doctors');
      const data = await res.json();
      setDoctors(data.doctors ?? []);
    } catch {
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  const set = (field: keyof DoctorFormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const openAdd = () => {
    setEditingDoctor(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (doc: Doctor) => {
    setEditingDoctor(doc);
    setForm({
      name: doc.name,
      title: doc.title,
      specialty: doc.specialty,
      email: doc.email ?? '',
      phone: doc.phone ?? '',
      clinicLocation: doc.clinicLocation ?? '',
      npi: doc.npi ?? '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDoctor(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Doctor name is required.');
      return;
    }
    setSubmitting(true);
    try {
      const url = editingDoctor ? `/api/doctors/${editingDoctor.id}` : '/api/doctors';
      const method = editingDoctor ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error ?? 'Failed to save doctor.');
        return;
      }
      await fetchDoctors();
      closeModal();
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (doc: Doctor) => {
    try {
      await fetch(`/api/doctors/${doc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !doc.active }),
      });
      await fetchDoctors();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (doc: Doctor) => {
    try {
      await fetch(`/api/doctors/${doc.id}`, { method: 'DELETE' });
      await fetchDoctors();
      setConfirmDelete(null);
    } catch {
      // ignore
    }
  };

  const displayed = showInactive ? doctors : doctors.filter((d) => d.active);

  return (
    <>
      <TopBar
        title="Doctors"
        breadcrumbs={[
          { label: 'Integrated Allergy IMS' },
          { label: 'Doctors' },
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
              + Add Doctor
            </button>
          </div>
        }
      />
      <div className="page-content">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
              Loading doctors…
            </div>
          ) : displayed.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👨‍⚕️</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No doctors found</div>
              <div>Add a doctor to get started.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Name', 'Title', 'Specialty', 'Clinic Location', 'NPI', 'Email', 'Status', 'Actions'].map((h) => (
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
                {displayed.map((doc, i) => (
                  <tr
                    key={doc.id}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      background: i % 2 === 0 ? '#fff' : '#fafafa',
                    }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>
                      {doc.title} {doc.name}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#374151' }}>{doc.title}</td>
                    <td style={{ padding: '10px 14px', color: '#374151' }}>{doc.specialty}</td>
                    <td style={{ padding: '10px 14px', color: '#374151' }}>{doc.clinicLocation ?? '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#6b7280', fontFamily: 'monospace', fontSize: 12 }}>
                      {doc.npi ?? '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#374151' }}>{doc.email ?? '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          background: doc.active ? '#dcfce7' : '#f3f4f6',
                          color: doc.active ? '#15803d' : '#6b7280',
                        }}
                      >
                        {doc.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6, whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '3px 10px', fontSize: 12 }}
                          onClick={() => openEdit(doc)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{
                            padding: '3px 10px',
                            fontSize: 12,
                            background: doc.active ? '#fff7ed' : '#f0fdf4',
                            color: doc.active ? '#c2410c' : '#15803d',
                            border: `1px solid ${doc.active ? '#fed7aa' : '#bbf7d0'}`,
                          }}
                          onClick={() => toggleActive(doc)}
                        >
                          {doc.active ? 'Deactivate' : 'Reactivate'}
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '3px 10px', fontSize: 12, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}
                          onClick={() => setConfirmDelete(doc)}
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
                {editingDoctor ? '✏️ Edit Doctor' : '👨‍⚕️ Add Doctor'}
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
                      placeholder="Smith"
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
                <div>
                  <label className="form-label">Specialty</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.specialty}
                    onChange={(e) => set('specialty', e.target.value)}
                    placeholder="Allergy & Immunology"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder="doctor@clinic.com"
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
                  {submitting ? 'Saving…' : editingDoctor ? 'Save Changes' : 'Add Doctor'}
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
              They will be set to inactive and removed from patient assignment dropdowns.
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
