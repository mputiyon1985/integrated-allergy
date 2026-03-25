'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TopBar from '@/components/layout/TopBar';
import VialCard from '@/components/clinical/VialCard';
import SafetyAlert from '@/components/clinical/SafetyAlert';
import DosingTable, { DosingRow } from '@/components/clinical/DosingTable';
import { type VialColor } from '@/lib/ui/theme';

interface PatientDetail {
  id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  dob: string;
  physician: string;
  clinicLocation: string;
  diagnosis: string;
  startDate: string;
  status: string;
  phone?: string;
  email?: string;
  insuranceId?: string;
  notes?: string;
}

interface AllergenMixItem {
  id: string;
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

// Mock data
const MOCK_PATIENT: PatientDetail = {
  id: '1',
  patientId: 'PA-001',
  firstName: 'Sarah',
  lastName: 'Johnson',
  dob: '1985-04-12',
  physician: 'Dr. Patel',
  clinicLocation: 'Main Clinic — Dumfries, VA',
  diagnosis: 'Allergic Rhinitis',
  startDate: '2025-09-01',
  status: 'Build-Up',
  phone: '(540) 555-0142',
  email: 's.johnson@email.com',
  insuranceId: 'UHC-884921',
  notes: 'Seasonal allergies predominantly spring/fall. No prior SCIT.',
};

const MOCK_ALLERGENS: AllergenMixItem[] = [
  { id: 'a1', name: 'Timothy Grass', type: 'Grass Pollen', concentration: '1:20', volume: 0.4 },
  { id: 'a2', name: 'Bermuda Grass', type: 'Grass Pollen', concentration: '1:20', volume: 0.3 },
  { id: 'a3', name: 'Mountain Cedar', type: 'Tree Pollen', concentration: '1:20', volume: 0.3, warning: 'High cross-reactivity with juniper' },
  { id: 'a4', name: 'Dermatophagoides pt.', type: 'Dust Mite', concentration: '1:10', volume: 0.5 },
  { id: 'a5', name: 'Cat Dander', type: 'Animal', concentration: '1:20', volume: 0.2, warning: 'Patient reported mild cat exposure; monitor' },
];

const MOCK_VIALS: Vial[] = [
  { id: 'v1', vialNumber: 1, color: 'silver', dilutionRatio: '1:1000', volume: 5.0, expiry: '2026-06-01', status: 'Active' },
  { id: 'v2', vialNumber: 2, color: 'blue', dilutionRatio: '1:100', volume: 5.0, expiry: '2026-06-01', status: 'Active' },
  { id: 'v3', vialNumber: 3, color: 'yellow', dilutionRatio: '1:10', volume: 5.0, expiry: '2026-06-01', status: 'Active' },
  { id: 'v4', vialNumber: 4, color: 'red', dilutionRatio: '1:1', volume: 5.0, expiry: '2026-06-01', status: 'Pending' },
];

const MOCK_DOSING: DosingRow[] = [
  { id: 'd1', week: 1, vial: 'Silver #1', dose: 0.05, phase: 'Build-Up', status: 'Completed' },
  { id: 'd2', week: 1, vial: 'Silver #1', dose: 0.10, phase: 'Build-Up', status: 'Completed' },
  { id: 'd3', week: 2, vial: 'Silver #1', dose: 0.20, phase: 'Build-Up', status: 'Completed' },
  { id: 'd4', week: 2, vial: 'Silver #1', dose: 0.40, phase: 'Build-Up', status: 'Completed', reaction: 'Local erythema 2cm' },
  { id: 'd5', week: 3, vial: 'Silver #1', dose: 0.40, phase: 'Build-Up', status: 'Completed', notes: 'Repeated per protocol' },
  { id: 'd6', week: 3, vial: 'Silver #1', dose: 0.50, phase: 'Build-Up', status: 'Completed' },
  { id: 'd7', week: 4, vial: 'Blue #2', dose: 0.05, phase: 'Build-Up', status: 'Scheduled' },
  { id: 'd8', week: 4, vial: 'Blue #2', dose: 0.10, phase: 'Build-Up', status: 'Scheduled' },
];

const MOCK_AUDIT: AuditEntry[] = [
  { id: 'au1', timestamp: '2026-03-25 14:32', action: 'Dose Administered', user: 'Dr. Patel', details: 'Blue #2 — 0.50 mL — Week 3' },
  { id: 'au2', timestamp: '2026-03-18 11:10', action: 'Vials Generated', user: 'Nurse Chen', details: '4 vials created for Build-Up set' },
  { id: 'au3', timestamp: '2026-03-11 09:45', action: 'Allergen Mix Updated', user: 'Dr. Patel', details: 'Cat Dander added to mix' },
  { id: 'au4', timestamp: '2026-02-15 13:20', action: 'Patient Enrolled', user: 'Dr. Patel', details: 'Initial enrollment — Allergic Rhinitis' },
];

const TABS = ['Patient Info', 'Allergen Mix', 'Vials', 'Dosing Schedule', 'Audit Log'];

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [allergens, setAllergens] = useState<AllergenMixItem[]>([]);
  const [vials, setVials] = useState<Vial[]>([]);
  const [dosing, setDosing] = useState<DosingRow[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [alerts, setAlerts] = useState<{ level: 'warning' | 'danger'; message: string; detail?: string }[]>([]);
  const [showAddAllergen, setShowAddAllergen] = useState(false);
  const [newAllergen, setNewAllergen] = useState({ name: '', type: '', concentration: '', volume: '' });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/patients/${patientId}`).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          setPatient(data.patient || data);
          setAllergens(data.allergens || []);
          setVials(data.vials || []);
          setDosing(data.dosing || []);
          setAudit(data.audit || []);
        } else {
          setPatient(MOCK_PATIENT);
          setAllergens(MOCK_ALLERGENS);
          setVials(MOCK_VIALS);
          setDosing(MOCK_DOSING);
          setAudit(MOCK_AUDIT);
        }
      } catch {
        setPatient(MOCK_PATIENT);
        setAllergens(MOCK_ALLERGENS);
        setVials(MOCK_VIALS);
        setDosing(MOCK_DOSING);
        setAudit(MOCK_AUDIT);
      } finally {
        setLoading(false);
      }

      // Build safety alerts
      const newAlerts: typeof alerts = [];
      const warnings = MOCK_ALLERGENS.filter((a) => a.warning);
      if (warnings.length > 0) {
        newAlerts.push({
          level: 'warning',
          message: `${warnings.length} allergen(s) have clinical warnings`,
          detail: warnings.map((w) => `${w.name}: ${w.warning}`).join('; '),
        });
      }
      const expiredVials = MOCK_VIALS.filter((v) => v.status === 'Expired');
      if (expiredVials.length > 0) {
        newAlerts.push({
          level: 'danger',
          message: `${expiredVials.length} vial(s) have expired`,
          detail: 'Do not administer. Generate new vials immediately.',
        });
      }
      setAlerts(newAlerts);
    };
    load();
  }, [patientId]);

  const handleDosingUpdate = (id: string, field: 'reaction' | 'notes', value: string) => {
    setDosing((rows) =>
      rows.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleAddAllergen = () => {
    if (!newAllergen.name) return;
    setAllergens((prev) => [
      ...prev,
      {
        id: `a${Date.now()}`,
        name: newAllergen.name,
        type: newAllergen.type || 'Unknown',
        concentration: newAllergen.concentration || '1:20',
        volume: parseFloat(newAllergen.volume) || 0,
      },
    ]);
    setNewAllergen({ name: '', type: '', concentration: '', volume: '' });
    setShowAddAllergen(false);
  };

  if (loading) {
    return (
      <>
        <TopBar title="Patient Detail" />
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading…</div>
      </>
    );
  }

  if (!patient) {
    return (
      <>
        <TopBar title="Patient Not Found" />
        <div style={{ padding: 24, color: '#c62828' }}>Patient not found.</div>
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
            <span className={statusClass[patient.status] || 'badge badge-inactive'}>
              {patient.status}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={() => router.push('/patients')}>
              ← Back
            </button>
          </div>
        }
      />
      <div className="page-content">
        {/* Safety alerts */}
        {alerts.map((alert, i) => (
          <SafetyAlert
            key={i}
            level={alert.level}
            message={alert.message}
            detail={alert.detail}
            onDismiss={() => setAlerts((a) => a.filter((_, j) => j !== i))}
          />
        ))}

        {/* Patient header card */}
        <div
          className="card"
          style={{
            marginBottom: 16,
            display: 'flex',
            gap: 24,
            alignItems: 'center',
            padding: '12px 16px',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              background: '#0055a5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 20,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
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
            <button
              key={tab}
              className={`tab-item${activeTab === i ? ' active' : ''}`}
              onClick={() => setActiveTab(i)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 0 && (
          <div className="card">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: 12 }}>
                  Personal Information
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <tbody>
                    {[
                      ['First Name', patient.firstName],
                      ['Last Name', patient.lastName],
                      ['Date of Birth', patient.dob],
                      ['Patient ID', patient.patientId],
                      ['Phone', patient.phone || '—'],
                      ['Email', patient.email || '—'],
                      ['Insurance ID', patient.insuranceId || '—'],
                    ].map(([label, value]) => (
                      <tr key={label} style={{ borderBottom: '1px solid #f0f2f5' }}>
                        <td style={{ padding: '6px 0', color: '#6b7280', fontWeight: 600, fontSize: 12, width: 140 }}>{label}</td>
                        <td style={{ padding: '6px 0' }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: 12 }}>
                  Clinical Details
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <tbody>
                    {[
                      ['Physician', patient.physician],
                      ['Clinic Location', patient.clinicLocation || '—'],
                      ['Diagnosis', patient.diagnosis],
                      ['Treatment Start', patient.startDate || '—'],
                      ['Current Status', patient.status],
                    ].map(([label, value]) => (
                      <tr key={label} style={{ borderBottom: '1px solid #f0f2f5' }}>
                        <td style={{ padding: '6px 0', color: '#6b7280', fontWeight: 600, fontSize: 12, width: 140 }}>{label}</td>
                        <td style={{ padding: '6px 0' }}>
                          {label === 'Current Status' ? (
                            <span className={statusClass[value] || 'badge badge-inactive'}>{value}</span>
                          ) : value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {patient.notes && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Notes</div>
                    <div style={{ fontSize: 13, color: '#374151', background: '#f9fafb', padding: '8px 10px', border: '1px solid #e5e7eb' }}>
                      {patient.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 1 && (
          <div>
            {allergens.filter((a) => a.warning).length > 0 && (
              <SafetyAlert
                level="warning"
                message="Some allergens in this mix have clinical warnings"
                detail={allergens.filter((a) => a.warning).map((a) => `${a.name}: ${a.warning}`).join('; ')}
              />
            )}
            <div className="card" style={{ padding: 0, marginBottom: 12 }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700 }}>Allergen Mix ({allergens.length} components)</h3>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAddAllergen(!showAddAllergen)}
                >
                  + Add Allergen
                </button>
              </div>
              <table className="clinical-table">
                <thead>
                  <tr>
                    <th>Allergen</th>
                    <th>Type</th>
                    <th>Concentration</th>
                    <th>Volume (mL)</th>
                    <th>Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  {allergens.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 500 }}>{a.name}</td>
                      <td style={{ color: '#6b7280' }}>{a.type}</td>
                      <td style={{ fontFamily: 'monospace' }}>{a.concentration}</td>
                      <td style={{ fontFamily: 'monospace' }}>{a.volume.toFixed(2)}</td>
                      <td>
                        {a.warning ? (
                          <span style={{ fontSize: 11, color: '#f57c00' }}>⚠ {a.warning}</span>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {showAddAllergen && (
                <div style={{ padding: '12px 16px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div>
                      <label className="form-label">Allergen Name</label>
                      <input type="text" className="form-input" style={{ width: 180 }} value={newAllergen.name} onChange={(e) => setNewAllergen((n) => ({ ...n, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="form-label">Type</label>
                      <input type="text" className="form-input" style={{ width: 130 }} value={newAllergen.type} onChange={(e) => setNewAllergen((n) => ({ ...n, type: e.target.value }))} />
                    </div>
                    <div>
                      <label className="form-label">Conc.</label>
                      <input type="text" className="form-input" style={{ width: 80 }} placeholder="1:20" value={newAllergen.concentration} onChange={(e) => setNewAllergen((n) => ({ ...n, concentration: e.target.value }))} />
                    </div>
                    <div>
                      <label className="form-label">Volume (mL)</label>
                      <input type="number" className="form-input" style={{ width: 90 }} step="0.1" value={newAllergen.volume} onChange={(e) => setNewAllergen((n) => ({ ...n, volume: e.target.value }))} />
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={handleAddAllergen}>Add</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowAddAllergen(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 2 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="btn btn-primary btn-sm">
                🧪 Generate New Vials
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {vials.map((vial) => (
                <VialCard
                  key={vial.id}
                  vialNumber={vial.vialNumber}
                  color={vial.color}
                  dilutionRatio={vial.dilutionRatio}
                  volume={vial.volume}
                  expiry={vial.expiry}
                  status={vial.status}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 3 && (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700 }}>Dosing Schedule — click Reaction/Notes cells to edit</h3>
            </div>
            <DosingTable rows={dosing} editable onUpdate={handleDosingUpdate} />
          </div>
        )}

        {activeTab === 4 && (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700 }}>Audit Log</h3>
            </div>
            <table className="clinical-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{entry.timestamp}</td>
                    <td style={{ fontWeight: 500 }}>{entry.action}</td>
                    <td style={{ color: '#4b5563' }}>{entry.user}</td>
                    <td style={{ color: '#6b7280', fontSize: 12 }}>{entry.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
