/**
 * @file app/patients/new/page.tsx — New Patient enrollment form
 *
 * Multi-section form for enrolling a new patient in the immunotherapy program.
 * Collects demographic info, physician assignment, clinic location, diagnosis,
 * and treatment start date. On successful submission, redirects to the new
 * patient's detail page.
 *
 * Features:
 * - Fetches active doctors and diagnosis options from the API for dropdown selection
 * - Custom title support via Settings API (falls back to clinic defaults)
 * - Inline validation feedback before API submission
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/layout/TopBar';

interface Doctor {
  id: string;
  name: string;
  title: string;
  specialty: string;
  active: boolean;
}

interface PatientFormData {
  firstName: string;
  lastName: string;
  dob: string;
  patientId: string;
  physician: string;
  doctorId: string;
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
  doctorId: '',
  clinicLocation: '',
  diagnosis: '',
  startDate: '',
  phone: '',
  email: '',
  insuranceId: '',
  notes: '',
};

interface ApiLocation { id: string; name: string; address: string | null; }
interface ApiDiagnosis { id: string; name: string; icdCode: string | null; }

export default function NewPatientPage() {
  const router = useRouter();
  const [form, setForm] = useState<PatientFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doctors, setDoctors]     = useState<Doctor[]>([]);
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [diagnoses, setDiagnoses] = useState<ApiDiagnosis[]>([]);

  // Support ?doctorId= query param pre-population
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const doctorIdParam = params.get('doctorId');
    if (doctorIdParam) {
      setForm((f) => ({ ...f, doctorId: doctorIdParam }));
    }
  }, []);

  // Load locations and diagnoses from dedicated API tables
  useEffect(() => {
    fetch('/api/locations?active=true')
      .then((r) => r.json())
      .then((d: { locations: ApiLocation[] }) => setLocations(d.locations ?? []))
      .catch(() => setLocations([]));
    fetch('/api/diagnoses?active=true')
      .then((r) => r.json())
      .then((d: { diagnoses: ApiDiagnosis[] }) => setDiagnoses(d.diagnoses ?? []))
      .catch(() => setDiagnoses([]));
  }, []);

  useEffect(() => {
    fetch('/api/doctors?active=true')
      .then((r) => r.json())
      .then((data) => {
        const docs: Doctor[] = data.doctors ?? [];
        setDoctors(docs);
        // Pre-populate physician name once doctors are loaded
        const params = new URLSearchParams(window.location.search);
        const doctorIdParam = params.get('doctorId');
        if (doctorIdParam) {
          const doc = docs.find((d) => d.id === doctorIdParam);
          if (doc) {
            setForm((f) => ({
              ...f,
              doctorId: doctorIdParam,
              physician: `${doc.name}, ${doc.title}`,
            }));
          }
        }
      })
      .catch(() => setDoctors([]));
  }, []);

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
        router.push(`/patients/${data.id || data.patient?.id}`);
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? `Server error (${res.status}). Please try again.`);
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
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
                  value={form.doctorId}
                  onChange={(e) => {
                    const doc = doctors.find((d) => d.id === e.target.value);
                    set('doctorId', e.target.value);
                    set('physician', doc ? `${doc.name}, ${doc.title}` : '');
                  }}
                  required
                >
                  <option value="">Select physician…</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}, {d.title}</option>
                  ))}
                  {doctors.length === 0 && (
                    <option disabled>No active doctors — add one in Doctors section</option>
                  )}
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
                  {locations.map((l) => (
                    <option key={l.id} value={l.name}>{l.name}</option>
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
                  {diagnoses.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
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
