'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import TopBar from '@/components/layout/TopBar';
import VialCard from '@/components/clinical/VialCard';
import SafetyAlert from '@/components/clinical/SafetyAlert';
import DosingTable, { DosingRow } from '@/components/clinical/DosingTable';
import { type VialColor } from '@/lib/ui/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientDetail {
  id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  name: string;
  dob: string;
  physician: string;
  physicianRaw?: string;
  doctorId?: string;
  clinicLocation: string;
  diagnosis: string;
  startDate: string;
  status: string;
  phone?: string;
  email?: string;
  insuranceId?: string;
  notes?: string;
}

interface DoctorOption {
  id: string;
  name: string;
  title: string;
  active: boolean;
}

interface ApiLocation { id: string; name: string; }
interface ApiDiagnosis { id: string; name: string; }

interface AllergenMixItem {
  id: string;
  allergenId: string;
  name: string;
  type: string;
  concentration: string;
  volume: number;
  warning?: string;
}

interface Vial {
  id: string;
  vialNumber: number;
  color: VialColor;
  dilutionRatio: string;
  volume: number;
  expiry: string;
  status: 'Active' | 'Expired' | 'Depleted' | 'Pending';
}

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details: string;
}

interface Appointment {
  id: string;
  type: string;
  title: string;
  startTime: string;
  endTime: string;
  provider: string | null;
  status: string;
  notes: string | null;
}

function isVialColor(s: string): s is VialColor {
  return ['silver', 'blue', 'yellow', 'red'].includes(s);
}

const APPT_TYPE_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  shot:       { emoji: '💉', color: '#1565c0', bg: '#e3f2fd' },
  skin_test:  { emoji: '🧪', color: '#2e7d32', bg: '#e8f5e9' },
  evaluation: { emoji: '🩺', color: '#6a1b9a', bg: '#f3e5f5' },
  follow_up:  { emoji: '📋', color: '#e65100', bg: '#fff3e0' },
  other:      { emoji: '📌', color: '#424242', bg: '#f5f5f5' },
};

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  scheduled:  { bg: '#e3f2fd', color: '#1565c0' },
  confirmed:  { bg: '#e8f5e9', color: '#2e7d32' },
  completed:  { bg: '#f3e5f5', color: '#6a1b9a' },
  cancelled:  { bg: '#ffebee', color: '#c62828' },
  no_show:    { bg: '#f5f5f5', color: '#616161' },
};

const TABS = ['Patient Info', 'Allergen Mix', 'Vials', 'Dosing Schedule', 'Audit Log', 'Appointments'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PatientDetailPage() {
  const params       = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const patientDbId  = params.id as string;

  const tabParam = searchParams.get('tab');

  const [patient, setPatient]     = useState<PatientDetail | null>(null);
  const [allergens, setAllergens] = useState<AllergenMixItem[]>([]);
  const [vials, setVials]         = useState<Vial[]>([]);
  const [dosing, setDosing]       = useState<DosingRow[]>([]);
  const [audit, setAudit]         = useState<AuditEntry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState(tabParam ? parseInt(tabParam) : 0);
  const [alerts, setAlerts]       = useState<{ level: 'warning' | 'danger'; message: string; detail?: string }[]>([]);

  // Edit patient modal state
  const [showEditModal, setShowEditModal]     = useState(false);
  const [editForm, setEditForm]               = useState<{
    firstName: string; lastName: string; dob: string; phone: string; email: string;
    insuranceId: string; doctorId: string; physician: string; clinicLocation: string;
    diagnosis: string; startDate: string; notes: string;
  }>({ firstName: '', lastName: '', dob: '', phone: '', email: '', insuranceId: '', doctorId: '', physician: '', clinicLocation: '', diagnosis: '', startDate: '', notes: '' });
  const [editSaving, setEditSaving]           = useState(false);
  const [editError, setEditError]             = useState<string | null>(null);
  const [doctorOptions, setDoctorOptions]     = useState<DoctorOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<ApiLocation[]>([]);
  const [diagnosisOptions, setDiagnosisOptions] = useState<ApiDiagnosis[]>([]);

  // Allergen add form
  const [_showAddAllergen, setShowAddAllergen] = useState(false);
  const [newAllergen, setNewAllergen]         = useState({ name: '', type: '', concentration: '', volume: '' });
  const [_addingAllergen, setAddingAllergen]   = useState(false);
  const [allergenError, setAllergenError]     = useState<string | null>(null);
  const [allergenOptions, setAllergenOptions] = useState<{ id: string; name: string; type: string; stockConcentration: string }[]>([]);

  // Schedule generate state
  const [generatingSchedule, setGeneratingSchedule] = useState(false);
  const [scheduleMsg, setScheduleMsg]               = useState<string | null>(null);

  // Allergen picker state
  const [showAllergenPicker, setShowAllergenPicker] = useState(false);
  const [allergenPickerSearch, setAllergenPickerSearch] = useState('');
  const [selectedAllergenId, setSelectedAllergenId] = useState('');
  const [selectedAllergenVolume, setSelectedAllergenVolume] = useState('1.0');
  // Multi-select state: { allergenId -> volumeMl }
  const [selectedAllergens, setSelectedAllergens] = useState<Record<string, string>>({});
  const [addingAllergens, setAddingAllergens] = useState(false);
  // Edit-allergen mode: if set, picker is editing an existing mix row
  const [editingMixId, setEditingMixId] = useState<string | null>(null);
  // Remove confirm dialog
  const [removeConfirm, setRemoveConfirm] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);

  // ── Inline allergen grid state ───────────────────────────────────────────────
  // gridChecked: allergenId → volume string (checked = in selection)
  const [gridChecked, setGridChecked] = useState<Record<string, string>>({});
  const [gridSaving, setGridSaving] = useState(false);
  const [gridSaveMsg, setGridSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    if (tabParam !== null) setActiveTab(parseInt(tabParam));
  }, [tabParam]);

  // ── Load allergen library for picker ────────────────────────────────────────
  useEffect(() => {
    fetch('/api/allergens')
      .then((r) => r.json())
      .then((d) => setAllergenOptions(d.allergens ?? []))
      .catch(() => {});
  }, []);

  // ── Load patient data ───────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/patients/${patientDbId}`);
        if (res.ok) {
          const data = await res.json();
          setPatient(data.patient);
          const loadedAllergens: AllergenMixItem[] = data.allergens ?? [];
          setAllergens(loadedAllergens);
          // Pre-check allergens already in mix
          const initChecked: Record<string, string> = {};
          loadedAllergens.forEach((a) => {
            initChecked[a.allergenId] = String(a.volume);
          });
          setGridChecked(initChecked);
          setVials((data.vials ?? []).map((v: { id: string; vialNumber: number; color?: string; dilutionRatio: string; volume: number; expiry: string; status: string }) => ({
            ...v,
            color: isVialColor(v.color ?? '') ? (v.color as VialColor) : 'silver',
            status: (['Active','Expired','Depleted','Pending'].includes(v.status) ? v.status : 'Active') as Vial['status'],
          })));
          setDosing(data.dosing ?? []);
          setAudit(data.audit ?? []);
        }

        // Load appointments separately
        const aRes = await fetch(`/api/appointments?patientId=${patientDbId}`);
        if (aRes.ok) {
          const aData = await aRes.json();
          setAppointments(aData.appointments ?? []);
        }

        // Build safety alerts
        const newAlerts: typeof alerts = [];
        const expiredVials = vials.filter((v) => v.status === 'Expired');
        if (expiredVials.length > 0) {
          newAlerts.push({ level: 'danger', message: `${expiredVials.length} vial(s) have expired`, detail: 'Do not administer. Generate new vials immediately.' });
        }
        setAlerts(newAlerts);
      } catch {
        setPatient(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientDbId]);

  // ── Add allergen ────────────────────────────────────────────────────────────
  const _handleAddAllergen = async () => {
    setAllergenError(null);
    if (!selectedAllergenId) { setAllergenError('Please select an allergen.'); return; }
    const volumeNum = parseFloat(selectedAllergenVolume);
    if (!volumeNum || volumeNum <= 0) { setAllergenError('Please enter a valid volume.'); return; }

    setAddingAllergen(true);
    try {
      const res = await fetch(`/api/patients/${patientDbId}/allergens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allergenId: selectedAllergenId, volumeMl: volumeNum }),
      });
      if (res.ok) {
        const added = await res.json() as AllergenMixItem;
        setAllergens((prev) => [...prev, added]);
        setSelectedAllergenId('');
        setSelectedAllergenVolume('1.0');
        setShowAllergenPicker(false);
        setShowAddAllergen(false);
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setAllergenError(data.error ?? 'Failed to add allergen.');
      }
    } catch {
      setAllergenError('Network error. Please try again.');
    } finally {
      setAddingAllergen(false);
    }
  };

  // ── Legacy manual allergen add (fallback) ───────────────────────────────────
  const _handleAddAllergenManual = async () => {
    if (!newAllergen.name) return;
    setAddingAllergen(true);
    setAllergenError(null);
    try {
      const res = await fetch(`/api/patients/${patientDbId}/allergens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAllergen.name,
          type: newAllergen.type || 'Other',
          concentration: newAllergen.concentration,
          volumeMl: parseFloat(newAllergen.volume) || 1.0,
        }),
      });
      if (res.ok) {
        const added = await res.json() as AllergenMixItem;
        setAllergens((prev) => [...prev, added]);
        setNewAllergen({ name: '', type: '', concentration: '', volume: '' });
        setShowAddAllergen(false);
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setAllergenError(data.error ?? 'Failed to add allergen.');
      }
    } catch {
      setAllergenError('Network error. Please try again.');
    } finally {
      setAddingAllergen(false);
    }
  };

  // ── Open picker to edit an existing allergen row ───────────────────────────
  const openEditAllergen = (a: AllergenMixItem) => {
    setEditingMixId(a.id);
    // Pre-check only that one allergen with its current volume
    setSelectedAllergens({ [a.id]: String(a.volume) });
    setAllergenPickerSearch('');
    setAllergenError(null);
    setShowAllergenPicker(true);
  };

  // ── Save edited volume via PATCH ────────────────────────────────────────────
  const handleSaveEditAllergen = async () => {
    if (!editingMixId) return;
    const entry = Object.entries(selectedAllergens)[0];
    if (!entry) return;
    const [, volumeStr] = entry;
    const volumeNum = parseFloat(volumeStr);
    if (!volumeNum || volumeNum <= 0) { setAllergenError('Please enter a valid volume.'); return; }
    setAddingAllergens(true);
    try {
      const res = await fetch(`/api/patients/${patientDbId}/allergens/${editingMixId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volumeMl: volumeNum }),
      });
      if (res.ok) {
        const updated = await res.json() as AllergenMixItem;
        setAllergens((prev) => prev.map((a) => a.id === editingMixId ? { ...a, volume: updated.volume } : a));
        setShowAllergenPicker(false);
        setEditingMixId(null);
        setSelectedAllergens({});
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setAllergenError(data.error ?? 'Failed to update volume.');
      }
    } catch {
      setAllergenError('Network error. Please try again.');
    } finally {
      setAddingAllergens(false);
    }
  };

  // ── Soft-delete allergen from mix ───────────────────────────────────────────
  const handleRemoveAllergen = async (mixId: string) => {
    setRemoving(true);
    try {
      const res = await fetch(`/api/patients/${patientDbId}/allergens/${mixId}`, { method: 'DELETE' });
      if (res.ok) {
        setAllergens((prev) => prev.filter((a) => a.id !== mixId));
        setRemoveConfirm(null);
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setAllergenError(data.error ?? 'Failed to remove allergen.');
        setRemoveConfirm(null);
      }
    } catch {
      setAllergenError('Network error. Please try again.');
      setRemoveConfirm(null);
    } finally {
      setRemoving(false);
    }
  };

  // ── Generate dosing schedule ────────────────────────────────────────────────
  const handleGenerateSchedule = async () => {
    setGeneratingSchedule(true);
    setScheduleMsg(null);
    try {
      const res = await fetch(`/api/patients/${patientDbId}/schedule`, { method: 'POST' });
      const data = await res.json() as { schedule?: unknown[]; error?: string };
      if (res.ok) {
        setScheduleMsg(`✓ Generated ${(data.schedule ?? []).length} dosing entries.`);
        // Reload patient data
        const pRes = await fetch(`/api/patients/${patientDbId}`);
        if (pRes.ok) {
          const pData = await pRes.json();
          setDosing(pData.dosing ?? []);
        }
      } else {
        setScheduleMsg(`⚠ ${data.error ?? 'Failed to generate schedule.'}`);
      }
    } catch {
      setScheduleMsg('⚠ Network error.');
    } finally {
      setGeneratingSchedule(false);
    }
  };

  // ── Dosing row update ───────────────────────────────────────────────────────
  const handleDosingUpdate = async (id: string, field: 'reaction' | 'notes', value: string) => {
    // Optimistic update
    setDosing((rows) => rows.map((r) => r.id === id ? { ...r, [field]: value } : r));
    // Persist to API
    try {
      await fetch(`/api/patients/${patientDbId}/schedule/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
    } catch {
      // Non-critical: keep optimistic update
    }
  };

  // ── Mark dose administered ──────────────────────────────────────────────────
  const handleMarkAdministered = async (doseId: string, administered: boolean) => {
    // Optimistic update
    setDosing((rows) => rows.map((r) => r.id === doseId ? { ...r, status: administered ? 'Completed' : 'Scheduled' } : r));
    try {
      const res = await fetch(`/api/patients/${patientDbId}/schedule/${doseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ administered }),
      });
      if (!res.ok) {
        // Revert on failure
        setDosing((rows) => rows.map((r) => r.id === doseId ? { ...r, status: administered ? 'Scheduled' : 'Completed' } : r));
      }
    } catch {
      // Revert on network error
      setDosing((rows) => rows.map((r) => r.id === doseId ? { ...r, status: administered ? 'Scheduled' : 'Completed' } : r));
    }
  };

  // ── Open edit modal ─────────────────────────────────────────────────────────
  const openEditModal = () => {
    if (!patient) return;
    setEditForm({
      firstName:     patient.firstName,
      lastName:      patient.lastName,
      dob:           patient.dob,
      phone:         patient.phone ?? '',
      email:         patient.email ?? '',
      insuranceId:   patient.insuranceId ?? '',
      doctorId:      patient.doctorId ?? '',
      physician:     patient.physicianRaw ?? patient.physician,
      clinicLocation: patient.clinicLocation ?? '',
      diagnosis:     patient.diagnosis ?? '',
      startDate:     patient.startDate ?? '',
      notes:         patient.notes ?? '',
    });
    setEditError(null);
    setShowEditModal(true);
    // Load doctors if not yet loaded
    if (doctorOptions.length === 0) {
      fetch('/api/doctors?active=true')
        .then((r) => r.json())
        .then((d) => setDoctorOptions(d.doctors ?? []))
        .catch(() => {});
    }
    // Load locations + diagnoses from dedicated tables
    if (locationOptions.length === 0) {
      fetch('/api/locations?active=true')
        .then((r) => r.json())
        .then((d: { locations: ApiLocation[] }) => setLocationOptions(d.locations ?? []))
        .catch(() => {});
    }
    if (diagnosisOptions.length === 0) {
      fetch('/api/diagnoses?active=true')
        .then((r) => r.json())
        .then((d: { diagnoses: ApiDiagnosis[] }) => setDiagnosisOptions(d.diagnoses ?? []))
        .catch(() => {});
    }
  };

  const handleSaveEdit = async () => {
    if (!patient) return;
    setEditError(null);
    // Validation
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      setEditError('First name and last name are required.');
      return;
    }
    if (!editForm.dob) {
      setEditError('Date of birth is required.');
      return;
    }
    if (!editForm.physician.trim()) {
      setEditError('Physician is required.');
      return;
    }
    setEditSaving(true);
    try {
      const name = `${editForm.lastName.trim()}, ${editForm.firstName.trim()}`;
      const res = await fetch(`/api/patients/${patientDbId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          dob:           editForm.dob,
          physician:     editForm.physician,
          doctorId:      editForm.doctorId || undefined,
          clinicLocation: editForm.clinicLocation,
          diagnosis:     editForm.diagnosis,
          startDate:     editForm.startDate || undefined,
          phone:         editForm.phone,
          email:         editForm.email,
          insuranceId:   editForm.insuranceId,
          notes:         editForm.notes,
        }),
      });
      if (res.ok) {
        setShowEditModal(false);
        // Refresh patient data
        const pRes = await fetch(`/api/patients/${patientDbId}`);
        if (pRes.ok) {
          const pData = await pRes.json();
          setPatient(pData.patient ?? null);
        }
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setEditError(data.error ?? 'Failed to save. Please try again.');
      }
    } catch {
      setEditError('Network error. Please try again.');
    } finally {
      setEditSaving(false);
    }
  };

  // ── Loading / not found ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <TopBar
          title="Patient Detail"
          breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Patients', href: '/patients' }, { label: '…' }]}
        />
        <div className="page-content">
          {/* Header info skeleton */}
          <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{ height: 48, width: 48, borderRadius: '50%', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ height: 20, width: '35%', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite', borderRadius: 4 }} />
                <div style={{ height: 13, width: '20%', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite', borderRadius: 4 }} />
              </div>
              <div style={{ height: 22, width: 80, borderRadius: 12, background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite' }} />
            </div>
            {/* Tab bar skeleton */}
            <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', paddingBottom: 0 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ height: 32, width: 90, borderRadius: '6px 6px 0 0', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite' }} />
              ))}
            </div>
          </div>
          {/* Tab content skeleton */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {Array.from({ length: 2 }).map((_, col) => (
                <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ height: 13, width: '40%', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite', borderRadius: 4, marginBottom: 4 }} />
                  {Array.from({ length: 5 }).map((_, r) => (
                    <div key={r} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ height: 12, width: '30%', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite', borderRadius: 4 }} />
                      <div style={{ height: 12, width: '55%', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite', borderRadius: 4 }} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!patient) {
    return (
      <>
        <TopBar title="Patient Not Found" />
        <div style={{ padding: 24, color: '#c62828' }}>Patient not found. <Link href="/patients" style={{ color: '#0055a5' }}>← Back to Patients</Link></div>
      </>
    );
  }

  const fullName = `${patient.lastName}, ${patient.firstName}`;
  const statusClass: Record<string, string> = {
    'Build-Up': 'badge badge-buildup',
    'Maintenance': 'badge badge-maintenance',
    'Complete': 'badge badge-complete',
    'Inactive': 'badge badge-inactive',
  };

  return (
    <>
      <TopBar
        title={fullName}
        breadcrumbs={[
          { label: 'Integrated Allergy IMS' },
          { label: 'Patients', href: '/patients' },
          { label: fullName },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={statusClass[patient.status] || 'badge badge-inactive'}>{patient.status}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => router.push('/patients')}>← Back</button>
          </div>
        }
      />
      <div className="page-content">
        {/* Safety alerts */}
        {alerts.map((alert, i) => (
          <SafetyAlert key={i} level={alert.level} message={alert.message} detail={alert.detail} onDismiss={() => setAlerts((a) => a.filter((_, j) => j !== i))} />
        ))}

        {/* Patient header card */}
        <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 24, alignItems: 'center', padding: '12px 16px' }}>
          <div style={{ width: 48, height: 48, background: '#0055a5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
            {patient.firstName[0]}{patient.lastName[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{fullName}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {patient.patientId} · DOB: {patient.dob} · {patient.physician}
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'right' }}>
            <div>{patient.diagnosis}</div>
            <div>Started: {patient.startDate}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          {TABS.map((tab, i) => (
            <button key={tab} className={`tab-item${activeTab === i ? ' active' : ''}`} onClick={() => setActiveTab(i)}>
              {tab}
            </button>
          ))}
        </div>

        {/* ── Tab 0: Patient Info ── */}
        {activeTab === 0 && (
          <div className="card" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: 24 }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Patient Information</h3>
              <button
                className="btn btn-teal btn-sm"
                onClick={openEditModal}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
              >
                <span>✏️</span> Edit Patient
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Personal column */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', marginBottom: 12, padding: '5px 10px', background: '#f3f4f6', borderRadius: 6 }}>
                  Personal Information
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <tbody>
                    {([
                      ['First Name',    patient.firstName],
                      ['Last Name',     patient.lastName],
                      ['Date of Birth', patient.dob],
                      ['Patient ID',    patient.patientId],
                      ['Phone',         patient.phone || '—'],
                      ['Email',         patient.email || '—'],
                      ['Insurance ID',  patient.insuranceId || '—'],
                    ] as [string, string][]).map(([label, value]) => (
                      <tr key={label} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '8px 4px 8px 0', color: '#9ca3af', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', width: 130, verticalAlign: 'top' }}>{label}</td>
                        <td style={{ padding: '8px 0', color: '#111827', fontWeight: 500 }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Clinical column */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', marginBottom: 12, padding: '5px 10px', background: '#f3f4f6', borderRadius: 6 }}>
                  Clinical Details
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <tbody>
                    {([
                      ['Physician',       patient.physician],
                      ['Clinic Location', patient.clinicLocation || '—'],
                      ['Diagnosis',       patient.diagnosis],
                      ['Treatment Start', patient.startDate || '—'],
                      ['Current Status',  patient.status],
                    ] as [string, string][]).map(([label, value]) => (
                      <tr key={label} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '8px 4px 8px 0', color: '#9ca3af', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', width: 130, verticalAlign: 'top' }}>{label}</td>
                        <td style={{ padding: '8px 0' }}>
                          {label === 'Current Status'
                            ? <span className={statusClass[value] || 'badge badge-inactive'}>{value}</span>
                            : <span style={{ color: '#111827', fontWeight: 500 }}>{value}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {patient.notes && (
                  <div style={{ marginTop: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', marginBottom: 8, padding: '5px 10px', background: '#f3f4f6', borderRadius: 6 }}>
                      Notes
                    </div>
                    <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, background: '#f9fafb', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                      {patient.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 1: Allergen Mix (inline grid) ── */}
        {activeTab === 1 && (() => {
          // Group allergen library by type, sorted alphabetically
          const typeOrder = ['Pollen', 'Mold', 'Dust', 'Animals', 'Insects', 'Foods', 'Other'];
          const groups: Record<string, typeof allergenOptions> = {};
          allergenOptions.forEach((a) => {
            const key = a.type || 'Other';
            if (!groups[key]) groups[key] = [];
            groups[key].push(a);
          });
          Object.keys(groups).forEach((k) => { groups[k].sort((a, b) => a.name.localeCompare(b.name)); });
          const sortedGroupKeys = [
            ...typeOrder.filter((t) => groups[t]),
            ...Object.keys(groups).filter((t) => !typeOrder.includes(t)).sort(),
          ];

          // Column layout: 3 columns, 2 groups each (desktop)
          const col1 = sortedGroupKeys.slice(0, 2);
          const col2 = sortedGroupKeys.slice(2, 4);
          const col3 = sortedGroupKeys.slice(4);

          const totalSelected = Object.keys(gridChecked).length;
          const totalVolume = Object.values(gridChecked).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);

          // Safety warnings
          const checkedTypes = new Set(allergenOptions.filter((a) => gridChecked[a.id]).map((a) => (a.type || '').toLowerCase()));
          const hasMoldPollenWarning = checkedTypes.has('mold') && checkedTypes.has('pollen');

          const handleSaveMix = async () => {
            setGridSaving(true);
            setGridSaveMsg(null);
            try {
              // Build map of allergenId → mixId for existing allergens
              const existingByAllergenId: Record<string, string> = {};
              allergens.forEach((a) => { existingByAllergenId[a.allergenId] = a.id; });

              const checkedIds = new Set(Object.keys(gridChecked));
              const existingIds = new Set(Object.keys(existingByAllergenId));

              // Items to add (checked but not in existing)
              const toAdd = [...checkedIds].filter((id) => !existingIds.has(id));
              // Items to update (checked and in existing, volume may differ)
              const toUpdate = [...checkedIds].filter((id) => existingIds.has(id));
              // Items to remove (existing but not checked)
              const toRemove = [...existingIds].filter((id) => !checkedIds.has(id));

              let anyError = false;

              // Add new allergens
              for (const allergenId of toAdd) {
                const res = await fetch(`/api/patients/${patientDbId}/allergens`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ allergenId, volumeMl: parseFloat(gridChecked[allergenId]) || 1.0 }),
                });
                if (!res.ok) anyError = true;
              }

              // Update volumes for existing
              for (const allergenId of toUpdate) {
                const mixId = existingByAllergenId[allergenId];
                const newVol = parseFloat(gridChecked[allergenId]) || 1.0;
                const existing = allergens.find((a) => a.allergenId === allergenId);
                if (existing && existing.volume !== newVol) {
                  const res = await fetch(`/api/patients/${patientDbId}/allergens/${mixId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ volumeMl: newVol }),
                  });
                  if (!res.ok) anyError = true;
                }
              }

              // Remove unchecked allergens
              for (const allergenId of toRemove) {
                const mixId = existingByAllergenId[allergenId];
                const res = await fetch(`/api/patients/${patientDbId}/allergens/${mixId}`, { method: 'DELETE' });
                if (!res.ok) anyError = true;
              }

              if (anyError) {
                setGridSaveMsg('⚠ Some changes failed. Please try again.');
              } else {
                setGridSaveMsg('Saved ✓');
                // Refresh allergens list
                const r = await fetch(`/api/patients/${patientDbId}/allergens`);
                if (r.ok) {
                  const d = await r.json();
                  const updated: AllergenMixItem[] = d.allergens ?? [];
                  setAllergens(updated);
                  const newChecked: Record<string, string> = {};
                  updated.forEach((a) => { newChecked[a.allergenId] = String(a.volume); });
                  setGridChecked(newChecked);
                }
                setTimeout(() => setGridSaveMsg(null), 3000);
              }
            } catch {
              setGridSaveMsg('⚠ Network error. Please try again.');
            } finally {
              setGridSaving(false);
            }
          };

          const renderGroup = (key: string) => {
            const items = groups[key];
            if (!items) return null;
            return (
              <div key={key} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #e5e7eb' }}>
                  {key}
                </div>
                {items.map((a) => {
                  const isChecked = !!gridChecked[a.id];
                  return (
                    <div
                      key={a.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 6,
                        background: isChecked ? '#e8f9f7' : 'transparent',
                        marginBottom: 2, cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onClick={() => {
                        setGridChecked((prev) => {
                          const next = { ...prev };
                          if (next[a.id]) delete next[a.id];
                          else next[a.id] = '1.0';
                          return next;
                        });
                        setGridSaveMsg(null);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: 14, height: 14, cursor: 'pointer', flexShrink: 0, accentColor: '#0d9488' }}
                      />
                      <span style={{ flex: 1, fontSize: 12, color: '#111827', fontWeight: isChecked ? 600 : 400, lineHeight: 1.3 }}>{a.name}</span>
                      {isChecked && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            value={gridChecked[a.id]}
                            min={0.05}
                            step={0.05}
                            onChange={(e) => {
                              const val = e.target.value;
                              setGridChecked((prev) => ({ ...prev, [a.id]: val }));
                              setGridSaveMsg(null);
                            }}
                            style={{ width: 52, padding: '2px 4px', border: '1px solid #0d9488', borderRadius: 4, fontSize: 11, textAlign: 'right', background: '#f0fdfa' }}
                          />
                          <span style={{ fontSize: 10, color: '#6b7280' }}>mL</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          };

          return (
            <div>
              {/* Top bar */}
              <div className="card" style={{ padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, fontSize: 13, color: '#374151' }}>
                  <span style={{ fontWeight: 700, color: '#0d9488' }}>{totalSelected}</span>
                  <span style={{ color: '#6b7280' }}> allergens selected · </span>
                  <span style={{ fontWeight: 700, color: '#0d9488' }}>{totalVolume.toFixed(1)}</span>
                  <span style={{ color: '#6b7280' }}> mL total</span>
                </div>
                {hasMoldPollenWarning && (
                  <div style={{ fontSize: 11, color: '#b45309', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 6, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    ⚠ Mold + Pollen cross-reactivity — verify with physician
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {gridSaveMsg && (
                    <span style={{ fontSize: 12, color: gridSaveMsg.startsWith('⚠') ? '#b45309' : '#0d9488', fontWeight: 600 }}>
                      {gridSaveMsg}
                    </span>
                  )}
                  <button
                    className="btn btn-teal btn-sm"
                    onClick={handleSaveMix}
                    disabled={gridSaving}
                    style={{ fontWeight: 600, minWidth: 100 }}
                  >
                    {gridSaving ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                        Saving…
                      </span>
                    ) : '💾 Save Mix'}
                  </button>
                </div>
              </div>

              {/* Allergen grid */}
              <div className="card" style={{ padding: 16 }}>
                {allergenOptions.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '20px 0' }}>Loading allergens…</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                    <div>{col1.map(renderGroup)}</div>
                    <div>{col2.map(renderGroup)}</div>
                    <div>{col3.map(renderGroup)}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Edit Patient Modal ── */}
        {showEditModal && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(2px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}
          >
            <div style={{ background: '#fff', width: '100%', maxWidth: 680, maxHeight: '92vh', display: 'flex', flexDirection: 'column', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>

              {/* Modal header */}
              <div style={{ padding: '16px 24px', background: 'linear-gradient(135deg, #0055a5 0%, #0077cc 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>✏️ Edit Patient</div>
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>{patient.name}</div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, lineHeight: 1 }}
                >×</button>
              </div>

              {/* Error banner */}
              {editError && (
                <div style={{ padding: '10px 24px', background: '#fef2f2', color: '#b91c1c', fontSize: 13, borderBottom: '1px solid #fecaca', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>⚠️</span> {editError}
                </div>
              )}

              {/* Scrollable body */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>

                {/* Personal Info section */}
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6b7280', marginBottom: 14, padding: '6px 12px', background: '#f3f4f6', borderRadius: 8 }}>
                  Personal Information
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
                  <div>
                    <label className="form-label">First Name <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="form-label">Last Name <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                      placeholder="Last name"
                    />
                  </div>
                  <div>
                    <label className="form-label">Date of Birth <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="date"
                      className="form-input"
                      value={editForm.dob}
                      onChange={(e) => setEditForm((f) => ({ ...f, dob: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={editForm.phone}
                      onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="(555) 000-0000"
                    />
                  </div>
                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={editForm.email}
                      onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="patient@email.com"
                    />
                  </div>
                  <div>
                    <label className="form-label">Insurance ID</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.insuranceId}
                      onChange={(e) => setEditForm((f) => ({ ...f, insuranceId: e.target.value }))}
                      placeholder="INS-XXXXXXX"
                    />
                  </div>
                </div>

                {/* Clinical Info section */}
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6b7280', marginBottom: 14, padding: '6px 12px', background: '#f3f4f6', borderRadius: 8 }}>
                  Clinical Information
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
                  <div>
                    <label className="form-label">Physician <span style={{ color: '#ef4444' }}>*</span></label>
                    <select
                      className="form-input"
                      value={editForm.doctorId}
                      onChange={(e) => {
                        const doc = doctorOptions.find((d) => d.id === e.target.value);
                        setEditForm((f) => ({
                          ...f,
                          doctorId: e.target.value,
                          physician: doc ? `${doc.name}, ${doc.title}` : f.physician,
                        }));
                      }}
                    >
                      <option value="">Select physician…</option>
                      {doctorOptions.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}, {d.title}</option>
                      ))}
                      {doctorOptions.length === 0 && (
                        <option disabled>Loading physicians…</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Clinic Location</label>
                    <select
                      className="form-input"
                      value={editForm.clinicLocation}
                      onChange={(e) => setEditForm((f) => ({ ...f, clinicLocation: e.target.value }))}
                    >
                      <option value="">Select location…</option>
                      {locationOptions.map((l) => <option key={l.id} value={l.name}>{l.name}</option>)}
                      {/* Preserve existing value even if not in current list */}
                      {editForm.clinicLocation && !locationOptions.find((l) => l.name === editForm.clinicLocation) && (
                        <option value={editForm.clinicLocation}>{editForm.clinicLocation}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Diagnosis</label>
                    <select
                      className="form-input"
                      value={editForm.diagnosis}
                      onChange={(e) => setEditForm((f) => ({ ...f, diagnosis: e.target.value }))}
                    >
                      <option value="">Select diagnosis…</option>
                      {diagnosisOptions.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                      {editForm.diagnosis && !diagnosisOptions.find((d) => d.name === editForm.diagnosis) && (
                        <option value={editForm.diagnosis}>{editForm.diagnosis}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Treatment Start Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={editForm.startDate}
                      onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Notes section */}
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6b7280', marginBottom: 14, padding: '6px 12px', background: '#f3f4f6', borderRadius: 8 }}>
                  Notes
                </div>
                <textarea
                  className="form-input"
                  rows={4}
                  style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
                  placeholder="Clinical notes, special instructions, medication allergies…"
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>

              {/* Modal footer */}
              <div style={{ padding: '14px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center', background: '#f9fafb', flexShrink: 0 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                  disabled={editSaving}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-teal"
                  onClick={handleSaveEdit}
                  disabled={editSaving}
                  style={{ minWidth: 120, fontWeight: 600, justifyContent: 'center' }}
                >
                  {editSaving ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                      Saving…
                    </span>
                  ) : '✓ Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Allergen Picker Modal ── */}
        {showAllergenPicker && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowAllergenPicker(false); setSelectedAllergens({}); } }}>
            <div style={{ background: '#fff', width: '100%', maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', borderRadius: 16, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0055a5' }}>
                <div>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Add Allergens to Mix</span>
                  {Object.keys(selectedAllergens).length > 0 && (
                    <span style={{ marginLeft: 10, background: '#fff', color: '#0055a5', borderRadius: 999, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>
                      {Object.keys(selectedAllergens).length} selected
                    </span>
                  )}
                </div>
                <button onClick={() => { setShowAllergenPicker(false); setSelectedAllergens({}); }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>×</button>
              </div>

              {allergenError && (
                <div style={{ padding: '8px 16px', background: '#fef2f2', color: '#b91c1c', fontSize: 13, borderBottom: '1px solid #fecaca' }}>{allergenError}</div>
              )}

              {/* Search */}
              <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>
                <input type="text" className="form-input" placeholder="Search by name or type (pollen, mold, dust, animal, insect, food)…" value={allergenPickerSearch} onChange={(e) => setAllergenPickerSearch(e.target.value)} autoFocus />
              </div>

              {/* Allergen list with checkboxes + volume inputs */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {(() => {
                  const filtered = allergenOptions.filter((a) => !allergenPickerSearch || a.name.toLowerCase().includes(allergenPickerSearch.toLowerCase()) || a.type.toLowerCase().includes(allergenPickerSearch.toLowerCase()));
                  if (filtered.length === 0) return (
                    <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No allergens found.</div>
                  );
                  // Group by type
                  const groups: Record<string, typeof filtered> = {};
                  filtered.forEach((a) => { if (!groups[a.type]) groups[a.type] = []; groups[a.type].push(a); });
                  return Object.entries(groups).map(([type, items]) => (
                    <div key={type}>
                      <div style={{ padding: '6px 16px', background: '#f3f4f6', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>
                        {type}
                      </div>
                      {items.map((a) => {
                        const isChecked = !!selectedAllergens[a.id];
                        return (
                          <div key={a.id} style={{ padding: '8px 16px', borderBottom: '1px solid #f0f2f5', display: 'flex', alignItems: 'center', gap: 10, background: isChecked ? '#eff6ff' : '#fff' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                setSelectedAllergens((prev) => {
                                  const next = { ...prev };
                                  if (e.target.checked) next[a.id] = '1.0';
                                  else delete next[a.id];
                                  return next;
                                });
                              }}
                              style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
                            />
                            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => {
                              setSelectedAllergens((prev) => {
                                const next = { ...prev };
                                if (next[a.id]) delete next[a.id];
                                else next[a.id] = '1.0';
                                return next;
                              });
                            }}>
                              <div style={{ fontWeight: isChecked ? 700 : 400, fontSize: 13, color: '#111827' }}>{a.name}</div>
                              <div style={{ fontSize: 11, color: '#6b7280' }}>{a.stockConcentration || ''}</div>
                            </div>
                            {isChecked && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                <input
                                  type="number"
                                  value={selectedAllergens[a.id]}
                                  min={0.05}
                                  step={0.05}
                                  onChange={(e) => setSelectedAllergens((prev) => ({ ...prev, [a.id]: e.target.value }))}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ width: 70, padding: '3px 6px', border: '1px solid #d1d5db', fontSize: 13, textAlign: 'right' }}
                                />
                                <span style={{ fontSize: 11, color: '#6b7280' }}>mL</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>

              {/* Footer */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center', background: '#f9fafb' }}>
                <span style={{ fontSize: 12, color: '#6b7280', marginRight: 'auto' }}>
                  {Object.keys(selectedAllergens).length === 0 ? 'Check allergens to select' : `${Object.keys(selectedAllergens).length} allergen(s) — set volumes above`}
                </span>
                <button className="btn btn-secondary" onClick={() => { setShowAllergenPicker(false); setSelectedAllergens({}); }}>Cancel</button>
                <button
                  className="btn btn-primary"
                  disabled={addingAllergens || Object.keys(selectedAllergens).length === 0}
                  onClick={async () => {
                    setAddingAllergens(true);
                    setAllergenError(null);
                    let anyError = false;
                    for (const [allergenId, volume] of Object.entries(selectedAllergens)) {
                      try {
                        const res = await fetch(`/api/patients/${patient.id}/allergens`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ allergenId, volumeMl: parseFloat(volume) }),
                        });
                        if (!res.ok) { anyError = true; }
                      } catch { anyError = true; }
                    }
                    if (anyError) {
                      setAllergenError('Some allergens failed to add. Please try again.');
                    } else {
                      setShowAllergenPicker(false);
                      setSelectedAllergens({});
                      // Refresh patient mix
                      const r = await fetch(`/api/patients/${patient.id}`);
                      if (r.ok) { const d = await r.json(); setPatient(d.patient ?? patient); }
                    }
                    setAddingAllergens(false);
                  }}
                >
                  {addingAllergens ? 'Adding…' : `Add ${Object.keys(selectedAllergens).length || ''} to Mix`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 2: Vials ── */}
        {activeTab === 2 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
              <Link href={`/vial-prep/new?patientId=${patient.id}`} className="btn btn-primary btn-sm">
                🧪 New Vial Batch
              </Link>
            </div>
            {vials.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '32px 20px', color: '#9ca3af' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🧪</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No vials prepared</div>
                <div style={{ fontSize: 13, marginBottom: 14 }}>Create a vial batch to begin treatment.</div>
                <Link href={`/vial-prep/new?patientId=${patient.id}`} className="btn btn-primary btn-sm">New Vial Batch</Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {vials.map((vial) => (
                  <VialCard key={vial.id} vialNumber={vial.vialNumber} color={vial.color} dilutionRatio={vial.dilutionRatio} volume={vial.volume} expiry={vial.expiry} status={vial.status} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab 3: Dosing Schedule ── */}
        {activeTab === 3 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12, alignItems: 'center' }}>
              {scheduleMsg && <span style={{ fontSize: 12, color: scheduleMsg.startsWith('✓') ? '#2e7d32' : '#f57c00' }}>{scheduleMsg}</span>}
              <button className="btn btn-primary btn-sm" onClick={handleGenerateSchedule} disabled={generatingSchedule}>
                {generatingSchedule ? 'Generating…' : '⚡ Generate Build-Up Schedule'}
              </button>
            </div>
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700 }}>Dosing Schedule — click Reaction/Notes cells to edit</h3>
              </div>
              {dosing.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No dosing schedule yet. Generate vials first, then click &quot;Generate Build-Up Schedule&quot;.</div>
              ) : (
                <DosingTable rows={dosing} editable onUpdate={handleDosingUpdate} onMarkAdministered={handleMarkAdministered} />
              )}
            </div>
          </div>
        )}

        {/* ── Tab 4: Audit Log ── */}
        {activeTab === 4 && (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700 }}>Audit Log</h3>
            </div>
            {audit.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No audit entries yet.</div>
            ) : (
              <table className="clinical-table">
                <thead>
                  <tr><th>Timestamp</th><th>Action</th><th>User</th><th>Details</th></tr>
                </thead>
                <tbody>
                  {audit.map((entry) => (
                    <tr key={entry.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{entry.timestamp}</td>
                      <td style={{ fontWeight: 500 }}>{entry.action}</td>
                      <td style={{ color: '#4b5563' }}>{entry.user}</td>
                      <td style={{ color: '#6b7280', fontSize: 12 }}>
                        {(() => { try { const p = JSON.parse(entry.details); return typeof p === 'object' ? Object.entries(p).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(' · ') : entry.details; } catch { return entry.details; } })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Tab 5: Appointments ── */}
        {activeTab === 5 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <Link href={`/calendar?new=1&patientId=${patient.id}`} className="btn btn-primary btn-sm">
                📅 Schedule Appointment
              </Link>
            </div>
            {appointments.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '32px 20px', color: '#9ca3af' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📅</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No appointments scheduled</div>
                <div style={{ fontSize: 13, marginBottom: 14 }}>Schedule a shot, skin test, or evaluation for this patient.</div>
                <Link href={`/calendar?new=1&patientId=${patient.id}`} className="btn btn-primary btn-sm">Schedule Now</Link>
              </div>
            ) : (
              <div className="card" style={{ padding: 0 }}>
                <table className="clinical-table">
                  <thead>
                    <tr><th>Type</th><th>Title</th><th>Date & Time</th><th>Provider</th><th>Status</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {appointments
                      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                      .map((appt) => {
                        const tc = APPT_TYPE_CONFIG[appt.type] ?? APPT_TYPE_CONFIG.other;
                        const sb = STATUS_BADGE[appt.status] ?? STATUS_BADGE.scheduled;
                        const start = new Date(appt.startTime);
                        return (
                          <tr key={appt.id}>
                            <td>
                              <span style={{ background: tc.bg, color: tc.color, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>{tc.emoji} {appt.type.replace('_', ' ')}</span>
                            </td>
                            <td style={{ fontWeight: 500 }}>{appt.title}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                              {start.toLocaleDateString()} {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ color: '#4b5563', fontSize: 12 }}>{appt.provider ?? '—'}</td>
                            <td>
                              <span style={{ background: sb.bg, color: sb.color, padding: '2px 7px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                {appt.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td style={{ color: '#6b7280', fontSize: 12 }}>{appt.notes ?? '—'}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
