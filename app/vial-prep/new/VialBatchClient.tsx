'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TopBar from '@/components/layout/TopBar';
import SafetyAlert from '@/components/clinical/SafetyAlert';
import VialCard from '@/components/clinical/VialCard';
import { VIAL_CONFIGS } from '@/lib/clinical/dilution';
import { validateAllergenMix, validateGlycerin, type SafetyWarning } from '@/lib/clinical/safety';
import { vialColorMap, type VialColor } from '@/lib/ui/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Patient {
  id: string;
  name: string;
  patientId: string;
}

interface AllergenOption {
  id: string;
  name: string;
  type: string;
  stockConcentration: string;
}

interface MixEntry {
  allergenId: string;
  name: string;
  type: string;
  volumeMl: number;
  stockConc: string;
}

interface VialPreview {
  vialNumber: number;
  colorCode: VialColor;
  dilutionRatio: string;
  totalVolumeMl: number;
  glycerinPercent: number;
  expiresAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const TARGET_VOLUMES = [5, 10, 15, 20];

function isVialColor(s: string): s is VialColor {
  return Object.keys(vialColorMap).includes(s);
}

// ─── Step indicators ──────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: 'Patient & Batch Info' },
  { n: 2, label: 'Allergen Mix' },
  { n: 3, label: 'Vial Preview' },
  { n: 4, label: 'Review & Submit' },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function NewVialBatchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prePatientId = searchParams.get('patientId') ?? '';

  const [step, setStep]         = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [dataReady, setDataReady]   = useState(false);

  // Patients
  const [patients, setPatients]     = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');

  // Nurses
  const [nurses, setNurses] = useState<Array<{id: string; name: string; title: string}>>([]);

  // Step 1
  const [patientId, setPatientId]   = useState(prePatientId);
  const [batchName, setBatchName]   = useState('');
  const [prescriptionDate, setPrescriptionDate] = useState(fmt(new Date()));
  const [preparedBy, setPreparedBy] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('');
  const [notes, setNotes]           = useState('');

  // Step 2 — allergen grid state (source of truth)
  const [allergenOptions, setAllergenOptions] = useState<AllergenOption[]>([]);
  const [gridChecked, setGridChecked]         = useState<Record<string, string>>({});
  const [prePopulated, setPrePopulated]       = useState(false);
  const [mixEntries, setMixEntries]           = useState<MixEntry[]>([]);
  const [targetVolume, setTargetVolume]       = useState(10);
  const [glycerinPct, setGlycerinPct]         = useState(10);
  const [safetyWarnings, setSafetyWarnings]   = useState<SafetyWarning[]>([]);

  // Step 3
  const [vialPreviews, setVialPreviews] = useState<VialPreview[]>([]);

  // ── Load patients + nurses + allergens ──────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/patients').then((r) => r.json()).catch(() => ({ patients: [] })),
      fetch('/api/nurses?active=true').then((r) => r.json()).catch(() => ({ nurses: [] })),
      fetch('/api/allergens').then((r) => r.json()).catch(() => ({ allergens: [] })),
    ]).then(([pData, nData, aData]) => {
      const pts: Patient[] = pData.patients ?? [];
      setPatients(pts);
      if (prePatientId) {
        const found = pts.find((p) => p.id === prePatientId);
        if (found) setPatientSearch(found.name);
      }
      setNurses(nData.nurses ?? []);
      setAllergenOptions(aData.allergens ?? []);
      setDataReady(true);
    });
  }, [prePatientId]);

  // ── Pre-populate grid from patient allergen mix when patientId is set ───────
  useEffect(() => {
    if (!patientId) {
      setGridChecked({});
      setPrePopulated(false);
      return;
    }
    fetch(`/api/patients/${patientId}/allergens`)
      .then((r) => r.json())
      .catch(() => ({ allergens: [] }))
      .then((data: { allergens?: Array<{ allergenId: string; volume: number }> }) => {
        const items = data.allergens ?? [];
        if (items.length > 0) {
          const checked: Record<string, string> = {};
          items.forEach((a) => { checked[a.allergenId] = String(a.volume); });
          setGridChecked(checked);
          setPrePopulated(true);
        }
      });
  }, [patientId]);

  // ── Sync gridChecked → mixEntries ───────────────────────────────────────────
  useEffect(() => {
    const entries: MixEntry[] = Object.entries(gridChecked)
      .map(([allergenId, vol]) => {
        const opt = allergenOptions.find((a) => a.id === allergenId);
        if (!opt) return null;
        return {
          allergenId,
          name: opt.name,
          type: opt.type,
          volumeMl: parseFloat(vol) || 0,
          stockConc: opt.stockConcentration,
        };
      })
      .filter(Boolean) as MixEntry[];
    setMixEntries(entries);
  }, [gridChecked, allergenOptions]);

  // ── Auto-batch name ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!batchName && patientId) setBatchName(`Batch #1`);
  }, [patientId, batchName]);

  // ── Recompute safety warnings when mix/glycerin changes ────────────────────
  useEffect(() => {
    const types = mixEntries.map((e) => e.type.toLowerCase());
    const mixWarns = validateAllergenMix(types);
    const glycWarn = validateGlycerin(glycerinPct);
    setSafetyWarnings([...mixWarns, ...(glycWarn ? [glycWarn] : [])]);
  }, [mixEntries, glycerinPct]);

  // ── Generate vial previews ──────────────────────────────────────────────────
  const buildVialPreviews = useCallback((): VialPreview[] => {
    return VIAL_CONFIGS.map((cfg) => ({
      vialNumber:     cfg.vialNumber,
      colorCode:      isVialColor(cfg.colorCode) ? cfg.colorCode : 'silver',
      dilutionRatio:  cfg.label,
      totalVolumeMl:  targetVolume,
      glycerinPercent: glycerinPct,
      expiresAt:      fmt(addDays(new Date(), 90)),
    }));
  }, [targetVolume, glycerinPct]);

  // ── Navigation ──────────────────────────────────────────────────────────────

  function goNext() {
    setStepError(null);
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 2) setVialPreviews(buildVialPreviews());
    setStep((s) => Math.min(s + 1, 4));
  }

  function goBack() { setStep((s) => Math.max(s - 1, 1)); setStepError(null); }

  function validateStep1(): boolean {
    if (!patientId) { setStepError('Please select a patient.'); return false; }
    if (!preparedBy.trim()) { setStepError('Prepared By is required.'); return false; }
    return true;
  }

  function validateStep2(): boolean {
    if (mixEntries.length === 0) { setStepError('Add at least one allergen to the mix.'); return false; }
    const hasHardError = safetyWarnings.some((w) => w.level === 'error');
    if (hasHardError) { setStepError('Fix safety errors before proceeding.'); return false; }
    return true;
  }

  const totalMixVol = mixEntries.reduce((s, e) => s + (e.volumeMl || 0), 0);

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const payload = {
        patientId,
        batchName,
        prescriptionDate,
        preparedBy,
        verifiedBy,
        notes,
        glycerinPercent: glycerinPct,
        targetVolumeMl:  targetVolume,
        allergens: mixEntries.map((e) => ({
          allergenId: e.allergenId,
          name:       e.name,
          type:       e.type,
          volumeMl:   e.volumeMl,
          stockConc:  e.stockConc,
        })),
        vials: vialPreviews.map((v) => ({
          vialNumber:     v.vialNumber,
          colorCode:      v.colorCode,
          dilutionRatio:  v.dilutionRatio,
          totalVolumeMl:  v.totalVolumeMl,
          glycerinPercent: v.glycerinPercent,
          expiresAt:      v.expiresAt,
        })),
      };

      const res = await fetch('/api/vial-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) { setSubmitError(data.error ?? 'Failed to create batch.'); return; }

      // Redirect to patient detail → Tab 3 (Vials)
      router.push(`/patients/${patientId}?tab=2`);
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Derived display ─────────────────────────────────────────────────────────
  const selectedPatient = patients.find((p) => p.id === patientId);

  if (!dataReady) {
    return (
      <>
        <TopBar
          title="New Vial Batch"
          breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Vial Prep', href: '/vial-prep' }, { label: 'New Batch' }]}
          actions={<button className="btn btn-secondary" onClick={() => router.push('/vial-prep')}>Cancel</button>}
        />
        <div className="page-content">
          <div style={{ display: 'flex', gap: 0, marginBottom: 24, border: '1px solid #d1d5db', overflow: 'hidden', borderRadius: 8 }}>
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ flex: 1, padding: '10px 16px', background: n === 1 ? '#f0f7ff' : '#fff', borderRight: n < 3 ? '1px solid #d1d5db' : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ height: 24, width: 24, borderRadius: '50%', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite', flexShrink: 0 }} />
                <div style={{ height: 12, width: '60%', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite', borderRadius: 4 }} />
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 24, borderRadius: 14 }}>
            <div style={{ height: 16, width: 180, background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite', borderRadius: 4, marginBottom: 20 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ height: 11, width: '40%', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite', borderRadius: 4 }} />
                  <div style={{ height: 34, width: '100%', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite', borderRadius: 10 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="New Vial Batch"
        breadcrumbs={[
          { label: 'Integrated Allergy IMS' },
          { label: 'Vial Prep', href: '/vial-prep' },
          { label: 'New Batch' },
        ]}
        actions={
          <button className="btn btn-secondary" onClick={() => router.push('/vial-prep')}>Cancel</button>
        }
      />

      <div className="page-content">
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, border: '1px solid #d1d5db', overflow: 'hidden', borderRadius: 10 }}>
          {STEPS.map((s) => {
            const done    = step > s.n;
            const active  = step === s.n;
            return (
              <div
                key={s.n}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  borderRight: s.n < 4 ? '1px solid #d1d5db' : 'none',
                  background: active ? '#0055a5' : done ? '#e8f5e9' : '#f9fafb',
                  cursor: done ? 'pointer' : 'default',
                }}
                onClick={() => done && setStep(s.n)}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0,
                  background: active ? '#fff' : done ? '#2e7d32' : '#d1d5db',
                  color: active ? '#0055a5' : done ? '#fff' : '#6b7280',
                }}>
                  {done ? '✓' : s.n}
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: active ? '#fff' : done ? '#2e7d32' : '#9ca3af' }}>
                    Step {s.n}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? '#fff' : done ? '#374151' : '#6b7280' }}>
                    {s.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── STEP 1: Patient + Batch Info ── */}
        {step === 1 && (
          <div className="card" style={{ borderRadius: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid #e5e7eb' }}>
              Patient &amp; Batch Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Patient selector */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Patient <span style={{ color: '#c62828' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search patient by name or ID…"
                  value={patientSearch}
                  onChange={(e) => { setPatientSearch(e.target.value); if (!e.target.value) setPatientId(''); }}
                  style={{ maxWidth: 400, borderRadius: 10 }}
                />
                {patientSearch && !patientId && (
                  <div style={{ border: '1px solid #d1d5db', maxHeight: 160, overflowY: 'auto', background: '#fff', maxWidth: 400, borderRadius: 10, marginTop: 4 }}>
                    {patients.filter((p) => p.name.toLowerCase().includes(patientSearch.toLowerCase()) || p.patientId.toLowerCase().includes(patientSearch.toLowerCase())).slice(0, 8).map((p) => (
                      <div key={p.id} onClick={() => { setPatientId(p.id); setPatientSearch(p.name); }} style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f0f2f5' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f7ff')} onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}>
                        <strong>{p.name}</strong> <span style={{ color: '#6b7280', fontSize: 11 }}>{p.patientId}</span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedPatient && (
                  <div style={{ marginTop: 4, fontSize: 11, color: '#2e7d32' }}>✓ {selectedPatient.name} ({selectedPatient.patientId})</div>
                )}
              </div>

              <div>
                <label className="form-label">Batch Name / Number</label>
                <input type="text" className="form-input" placeholder="e.g. Batch #3" value={batchName} onChange={(e) => setBatchName(e.target.value)} style={{ borderRadius: 10 }} />
              </div>
              <div>
                <label className="form-label">Prescription Date</label>
                <input type="date" className="form-input" value={prescriptionDate} onChange={(e) => setPrescriptionDate(e.target.value)} style={{ borderRadius: 10 }} />
              </div>
              <div>
                <label className="form-label">Prepared By <span style={{ color: '#c62828' }}>*</span></label>
                {nurses.length > 0 ? (
                  <select className="form-input" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} style={{ borderRadius: 10 }}>
                    <option value="">Select nurse…</option>
                    {nurses.map((n) => (
                      <option key={n.id} value={`${n.name}, ${n.title}`}>{n.name}, {n.title}</option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input type="text" className="form-input" placeholder="Nurse / pharmacist name" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} style={{ borderRadius: 10 }} />
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>No nurses on file — <a href="/nurses" style={{ color: '#0055a5' }}>add nurses first</a> or type name above</div>
                  </>
                )}
              </div>
              <div>
                <label className="form-label">Verified By</label>
                {nurses.length > 0 ? (
                  <select className="form-input" value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} style={{ borderRadius: 10 }}>
                    <option value="">Select nurse… (recommended: different from Prepared By)</option>
                    {nurses.map((n) => (
                      <option key={n.id} value={`${n.name}, ${n.title}`}>{n.name}, {n.title}</option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input type="text" className="form-input" placeholder="Second-check staff name" value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} style={{ borderRadius: 10 }} />
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>No nurses on file — <a href="/nurses" style={{ color: '#0055a5' }}>add nurses first</a> or type name above</div>
                  </>
                )}
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows={3} style={{ resize: 'vertical', borderRadius: 10 }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special instructions, clinical notes…" />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Allergen Mix (inline grid) ── */}
        {step === 2 && (() => {
          // Group allergen library by type, sorted alphabetically
          const typeOrder = ['Foods', 'Insects', 'Pollen', 'Mold', 'Dust', 'Animals', 'Other'];
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

          // 3-column layout: ANIMAL+DUST | FOOD+INSECT | MOLD+POLLEN (remaining distributed)
          const col1 = sortedGroupKeys.slice(0, 2);
          const col2 = sortedGroupKeys.slice(2, 4);
          const col3 = sortedGroupKeys.slice(4);

          const totalSelected = Object.keys(gridChecked).length;
          const totalVolume = Object.values(gridChecked).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);

          // Safety: mold+pollen cross-reactivity
          const checkedTypes = new Set(allergenOptions.filter((a) => gridChecked[a.id]).map((a) => (a.type || '').toLowerCase()));
          const hasMoldPollenWarning = checkedTypes.has('mold') && checkedTypes.has('pollen');

          const renderGroup = (key: string) => {
            const items = groups[key];
            if (!items) return null;
            return (
              <div key={key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', marginBottom: 4, paddingBottom: 3, borderBottom: '2px solid #e5e7eb' }}>
                  {key}
                </div>
                {items.map((a) => {
                  const isChecked = !!gridChecked[a.id];
                  return (
                    <div
                      key={a.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '2px 5px', borderRadius: 4,
                        background: isChecked ? '#f0fdfa' : 'transparent',
                        border: isChecked ? '1px solid #99f6e4' : '1px solid transparent',
                        marginBottom: 1, cursor: 'pointer',
                        transition: 'background 0.12s',
                      }}
                      onClick={() => {
                        setGridChecked((prev) => {
                          const next = { ...prev };
                          if (next[a.id]) delete next[a.id];
                          else next[a.id] = '1.0';
                          return next;
                        });
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: 14, height: 14, cursor: 'pointer', flexShrink: 0, accentColor: '#0d9488' }}
                      />
                      <span style={{ fontSize: 11, color: isChecked ? '#0f766e' : '#374151', fontWeight: isChecked ? 700 : 400, lineHeight: 1.3 }}>{a.name}</span>
                      {isChecked && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2, paddingLeft: 18 }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            value={gridChecked[a.id]}
                            min={0.05}
                            step={0.05}
                            onChange={(e) => {
                              const val = e.target.value;
                              setGridChecked((prev) => ({ ...prev, [a.id]: val }));
                            }}
                            style={{ width: 44, padding: '1px 4px', border: '1px solid #0d9488', borderRadius: 4, fontSize: 11, textAlign: 'right', background: '#f0fdfa' }}
                          />
                          <span style={{ fontSize: 10, color: '#0d9488', fontWeight: 600 }}>mL</span>
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
              {/* Safety warnings */}
              {safetyWarnings.map((w, i) => (
                <SafetyAlert key={i} level={w.level === 'error' ? 'danger' : 'warning'} message={w.message} />
              ))}

              {/* Pre-populated banner */}
              {prePopulated && (
                <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#2e7d32' }}>
                  <span style={{ fontSize: 16 }}>🌿</span>
                  <span><strong>Pre-populated from patient&apos;s allergen mix</strong> — adjust as needed</span>
                </div>
              )}

              {/* Batch parameters */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="card" style={{ borderRadius: 14 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', marginBottom: 12 }}>Batch Parameters</h4>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <label className="form-label">Target Total Volume</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {TARGET_VOLUMES.map((v) => (
                          <button key={v} type="button" onClick={() => setTargetVolume(v)} style={{ padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: targetVolume === v ? '#0055a5' : '#f9fafb', color: targetVolume === v ? '#fff' : '#374151', border: '1px solid #d1d5db', borderRadius: 8 }}>
                            {v} mL
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Glycerin % <span style={{ color: glycerinPct > 50 ? '#c62828' : glycerinPct > 40 ? '#f57c00' : '#9ca3af' }}>{glycerinPct > 50 ? '⛔ EXCEEDS LIMIT' : glycerinPct > 40 ? '⚠ Near limit' : ''}</span></label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input type="range" min={0} max={60} value={glycerinPct} onChange={(e) => setGlycerinPct(Number(e.target.value))} style={{ width: 120 }} />
                        <input type="number" className="form-input" style={{ width: 70, borderRadius: 10 }} min={0} max={60} value={glycerinPct} onChange={(e) => setGlycerinPct(Number(e.target.value))} />
                        <span style={{ fontSize: 13, color: '#6b7280' }}>%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Volume meter */}
                <div className="card" style={{ borderRadius: 14 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', marginBottom: 12 }}>Volume Status</h4>
                  <div style={{ fontSize: 28, fontWeight: 700, color: totalMixVol > targetVolume ? '#c62828' : totalMixVol === targetVolume ? '#2e7d32' : '#0055a5' }}>
                    {totalMixVol.toFixed(1)} / {targetVolume} mL
                  </div>
                  <div style={{ height: 8, background: '#f0f2f5', marginTop: 10, overflow: 'hidden', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (totalMixVol / targetVolume) * 100)}%`, background: totalMixVol > targetVolume ? '#c62828' : totalMixVol === targetVolume ? '#2e7d32' : '#0055a5', transition: 'width 0.2s' }} />
                  </div>
                  {totalMixVol > targetVolume && <div style={{ fontSize: 11, color: '#c62828', marginTop: 6 }}>⛔ Exceeds target by {(totalMixVol - targetVolume).toFixed(1)} mL</div>}
                  {totalMixVol < targetVolume && totalMixVol > 0 && <div style={{ fontSize: 11, color: '#f57c00', marginTop: 6 }}>⚠ {(targetVolume - totalMixVol).toFixed(1)} mL remaining</div>}
                  {totalMixVol === targetVolume && totalMixVol > 0 && <div style={{ fontSize: 11, color: '#2e7d32', marginTop: 6 }}>✓ Target reached</div>}
                </div>
              </div>

              {/* Allergen grid section */}
              <div className="card" style={{ borderRadius: 14 }}>
                {/* Top bar: counter + cross-reactivity warning */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #e5e7eb' }}>
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
                </div>

                {/* 4-column allergen grid */}
                {allergenOptions.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '20px 0' }}>Loading allergens…</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0 }}>
                    <div style={{ paddingRight: 14, borderRight: '1px solid #e5e7eb' }}>{col1.map(renderGroup)}</div>
                    <div style={{ padding: '0 14px', borderRight: '1px solid #e5e7eb' }}>{col2.map(renderGroup)}</div>
                    <div style={{ padding: '0 14px', borderRight: '1px solid #e5e7eb' }}>{col3.map(renderGroup)}</div>
                    <div style={{ paddingLeft: 14 }}>{col4.map(renderGroup)}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── STEP 3: Vial Preview ── */}
        {step === 3 && (
          <div>
            <SafetyAlert level="warning" message="Verify all vial details before proceeding. Labels will be generated from this data." />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
              {vialPreviews.map((v) => (
                <div key={v.vialNumber} className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 14 }}>
                  <div style={{ background: vialColorMap[v.colorCode]?.bg ?? '#f0f2f5', padding: '10px 14px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: vialColorMap[v.colorCode]?.text === '#fff' ? (vialColorMap[v.colorCode]?.bg ?? '#000') : '#1a1a2e' }}>
                      Vial #{v.vialNumber}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', background: vialColorMap[v.colorCode]?.bg ?? '#eee', color: vialColorMap[v.colorCode]?.text === '#fff' ? '#fff' : vialColorMap[v.colorCode]?.bg, border: `1px solid ${vialColorMap[v.colorCode]?.bg ?? '#ccc'}` }}>
                      {vialColorMap[v.colorCode]?.label ?? v.colorCode}
                    </span>
                  </div>
                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        ['Dilution', v.dilutionRatio],
                        ['Volume', `${v.totalVolumeMl} mL`],
                        ['Glycerin', `${v.glycerinPercent}%`],
                      ].map(([k, val]) => (
                        <div key={k}>
                          <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginTop: 1 }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    {/* Editable expiry */}
                    <div>
                      <label style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 2 }}>Expiry Date</label>
                      <input
                        type="date"
                        className="form-input"
                        style={{ fontSize: 12, borderRadius: 10 }}
                        value={v.expiresAt}
                        onChange={(e) => setVialPreviews((prev) => prev.map((vp) => vp.vialNumber === v.vialNumber ? { ...vp, expiresAt: e.target.value } : vp))}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 4: Review & Submit ── */}
        {step === 4 && (
          <div>
            {submitError && (
              <div style={{ background: '#ffebee', color: '#c62828', padding: '10px 14px', marginBottom: 16, fontSize: 13, border: '1px solid #ef9a9a', borderRadius: 10 }}>{submitError}</div>
            )}
            {safetyWarnings.map((w, i) => (
              <SafetyAlert key={i} level={w.level === 'error' ? 'danger' : 'warning'} message={w.message} />
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Summary card */}
              <div className="card" style={{ borderRadius: 14 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>Batch Summary</h4>
                {[
                  ['Patient', selectedPatient ? `${selectedPatient.name} (${selectedPatient.patientId})` : '—'],
                  ['Batch',   batchName || '—'],
                  ['Rx Date', prescriptionDate],
                  ['Prepared By', preparedBy],
                  ['Verified By', verifiedBy || '—'],
                  ['Target Vol', `${targetVolume} mL`],
                  ['Glycerin', `${glycerinPct}%`],
                  ['Allergens', mixEntries.length.toString()],
                  ['Vials', vialPreviews.length.toString()],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f0f2f5', fontSize: 13 }}>
                    <span style={{ color: '#6b7280', fontWeight: 600, fontSize: 12 }}>{k}</span>
                    <span style={{ fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Allergen list */}
              <div className="card" style={{ borderRadius: 14 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>Allergen Mix</h4>
                {mixEntries.map((e) => (
                  <div key={e.allergenId} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f0f2f5', fontSize: 13 }}>
                    <span style={{ fontWeight: 500 }}>{e.name}</span>
                    <span style={{ color: '#6b7280' }}>{e.volumeMl.toFixed(1)} mL</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, fontWeight: 700, marginTop: 4, borderTop: '2px solid #e5e7eb' }}>
                  <span>Total</span>
                  <span style={{ color: totalMixVol === targetVolume ? '#2e7d32' : '#c62828' }}>{totalMixVol.toFixed(1)} / {targetVolume} mL</span>
                </div>
                {notes && (
                  <div style={{ marginTop: 10, padding: '8px 10px', background: '#f9fafb', border: '1px solid #e5e7eb', fontSize: 12, color: '#4b5563', borderRadius: 8 }}>📝 {notes}</div>
                )}
              </div>
            </div>

            {/* Vial previews */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {vialPreviews.map((v) => (
                <VialCard
                  key={v.vialNumber}
                  vialNumber={v.vialNumber}
                  color={v.colorCode}
                  dilutionRatio={v.dilutionRatio}
                  volume={v.totalVolumeMl}
                  expiry={v.expiresAt}
                  status="Pending"
                />
              ))}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        {stepError && (
          <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '10px 14px', marginTop: 12, fontSize: 13, border: '1px solid #fecaca', borderRadius: 10 }}>
            {stepError}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={goBack} disabled={step === 1}>
            ← Back
          </button>
          {step < 4 ? (
            <button className="btn btn-primary" onClick={goNext}>
              Next: {STEPS[step]?.label} →
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ minWidth: 160 }}>
              {submitting ? 'Generating…' : '🧪 Generate Batch'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
