'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/layout/TopBar';

interface PatientFormData {
  firstName: string;
  lastName: string;
  dob: string;
  patientId: string;
  physician: string;
  clinicLocation: string;
  diagnosis: string;
  startDate: string;
  phone: string;
  email: string;
  insuranceId: string;
  notes: string;
}

const EMPTY_FORM: PatientFormData = {
  firstName: '',
  lastName: '',
  dob: '',
  patientId: '',
  physician: '',
  clinicLocation: '',
  diagnosis: '',
  startDate: '',
  phone: '',
  email: '',
  insuranceId: '',
  notes: '',
};

const PHYSICIANS = ['Dr. Patel', 'Dr. Thompson', 'Dr. Kim', 'Dr. Rivera', 'Dr. Chen'];
const LOCATIONS = ['Main Clinic — Dumfries, VA', 'North Branch — Woodbridge, VA', 'South Branch — Stafford, VA'];
const DIAGNOSES = [
  'Allergic Rhinitis',
  'Asthma',
  'Asthma + Allergic Rhinitis',
  'Allergic Rhinitis + Eczema',
  'AR + Asthma + Eczema',
  'Other',
];

export default function NewPatientPage() {
  const router = useRouter();
  const [form, setForm] = useState<PatientFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof PatientFormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.firstName || !form.lastName || !form.dob || !form.physician) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/patients/${data.id || data.patient?.id || '1'}`);
      } else {
        // In development without backend, just redirect to patients list
        router.push('/patients');
      }
    } catch {
      router.push('/patients');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <TopBar
        title="New Patient"
        breadcrumbs={[
          { label: 'Integrated Allergy IMS' },
          { label: 'Patients', href: '/patients' },
          { label: 'New Patient' },
        ]}
        actions={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push('/patients')}
          >
            Cancel
          </button>
        }
      />
      <div className="page-content">
        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                background: '#ffebee',
                color: '#c62828',
                padding: '10px 14px',
                marginBottom: 16,
                fontSize: 13,
                border: '1px solid #ef9a9a',
              }}
            >
              {error}
            </div>
          )}

          {/* Patient Identity */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Patient Identity
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <label className="form-label">First Name <span style={{ color: '#c62828' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  value={form.firstName}
                  onChange={(e) => set('firstName', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="form-label">Last Name <span style={{ color: '#c62828' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  value={form.lastName}
                  onChange={(e) => set('lastName', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="form-label">Patient ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Auto-generated if blank"
                  value={form.patientId}
                  onChange={(e) => set('patientId', e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Date of Birth <span style={{ color: '#c62828' }}>*</span></label>
                <input
                  type="date"
                  className="form-input"
                  value={form.dob}
                  onChange={(e) => set('dob', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="(555) 000-0000"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Insurance ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.insuranceId}
                  onChange={(e) => set('insuranceId', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Clinical Info */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Clinical Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <label className="form-label">Physician <span style={{ color: '#c62828' }}>*</span></label>
                <select
                  className="form-input"
                  value={form.physician}
                  onChange={(e) => set('physician', e.target.value)}
                  required
                >
                  <option value="">Select physician…</option>
                  {PHYSICIANS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Clinic Location</label>
                <select
                  className="form-input"
                  value={form.clinicLocation}
                  onChange={(e) => set('clinicLocation', e.target.value)}
                >
                  <option value="">Select location…</option>
                  {LOCATIONS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Diagnosis</label>
                <select
                  className="form-input"
                  value={form.diagnosis}
                  onChange={(e) => set('diagnosis', e.target.value)}
                >
                  <option value="">Select diagnosis…</option>
                  {DIAGNOSES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Treatment Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.startDate}
                  onChange={(e) => set('startDate', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Additional Notes
            </h3>
            <textarea
              className="form-input"
              rows={4}
              style={{ resize: 'vertical' }}
              placeholder="Clinical notes, special instructions, allergies to medications…"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => router.push('/patients')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Create Patient'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
