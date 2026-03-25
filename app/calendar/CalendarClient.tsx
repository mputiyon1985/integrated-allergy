'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TopBar from '@/components/layout/TopBar';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Patient {
  id: string;
  name: string;
  patientId: string;
}

interface Appointment {
  id: string;
  patientId: string;
  type: string;
  title: string;
  startTime: string;
  endTime: string;
  provider: string | null;
  notes: string | null;
  status: string;
  patient?: { id: string; name: string; patientId: string };
}

type ViewMode = 'month' | 'week' | 'day';
type ApptType = 'all' | 'shot' | 'skin_test' | 'evaluation' | 'follow_up' | 'other';

// ─── Constants ────────────────────────────────────────────────────────────────

const APPT_TYPES: { value: string; label: string; emoji: string; color: string; bg: string }[] = [
  { value: 'shot',       label: 'Shot',        emoji: '💉', color: '#1565c0', bg: '#e3f2fd' },
  { value: 'skin_test',  label: 'Skin Test',   emoji: '🧪', color: '#2e7d32', bg: '#e8f5e9' },
  { value: 'evaluation', label: 'Evaluation',  emoji: '🩺', color: '#6a1b9a', bg: '#f3e5f5' },
  { value: 'follow_up',  label: 'Follow-up',   emoji: '📋', color: '#e65100', bg: '#fff3e0' },
  { value: 'other',      label: 'Other',       emoji: '📌', color: '#424242', bg: '#f5f5f5' },
];

const STATUS_OPTIONS = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];
const DURATION_OPTIONS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 hour', minutes: 60 },
];

const PROVIDERS = ['Dr. Patel', 'Dr. Thompson', 'Dr. Kim', 'Dr. Rivera', 'Dr. Chen', 'Nurse Chen', 'Nurse Kim'];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function typeConfig(type: string) {
  return APPT_TYPES.find((t) => t.value === type) ?? APPT_TYPES[4];
}

function fmt(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Empty form ───────────────────────────────────────────────────────────────

const emptyForm = (dateStr = '') => ({
  patientId: '',
  type: 'shot',
  title: '',
  date: dateStr || fmt(new Date()),
  time: '09:00',
  durationMinutes: 30,
  provider: '',
  notes: '',
  status: 'scheduled',
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [viewMode, setViewMode]           = useState<ViewMode>('month');
  const [currentDate, setCurrentDate]     = useState(new Date());
  const [typeFilter, setTypeFilter]       = useState<ApptType>('all');
  const [appointments, setAppointments]   = useState<Appointment[]>([]);
  const [patients, setPatients]           = useState<Patient[]>([]);
  const [loading, setLoading]             = useState(true);

  // Modal state
  const [showModal, setShowModal]         = useState(false);
  const [editAppt, setEditAppt]           = useState<Appointment | null>(null);
  const [form, setForm]                   = useState(emptyForm());
  const [saving, setSaving]               = useState(false);
  const [formError, setFormError]         = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');

  // Open new-appt modal from query param
  const newParam = searchParams.get('new');
  const patientIdParam = searchParams.get('patientId');

  useEffect(() => {
    if (newParam === '1') {
      const d = emptyForm();
      if (patientIdParam) d.patientId = patientIdParam;
      setForm(d);
      setEditAppt(null);
      setShowModal(true);
    }
  }, [newParam, patientIdParam]);

  // Load patients
  useEffect(() => {
    fetch('/api/patients')
      .then((r) => r.json())
      .then((d) => setPatients(d.patients ?? []))
      .catch(() => {});
  }, []);

  // Load appointments for current view window
  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const [from, to] = getViewRange(currentDate, viewMode);
      const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
      if (typeFilter !== 'all') params.set('type', typeFilter);
      const res = await fetch(`/api/appointments?${params}`);
      const data = await res.json();
      setAppointments(data.appointments ?? []);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode, typeFilter]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  function navigate(dir: -1 | 1) {
    setCurrentDate((d) => {
      const n = new Date(d);
      if (viewMode === 'month') n.setMonth(n.getMonth() + dir);
      else if (viewMode === 'week') n.setDate(n.getDate() + 7 * dir);
      else n.setDate(n.getDate() + dir);
      return n;
    });
  }

  // ── Save appointment ────────────────────────────────────────────────────────
  async function handleSave() {
    setFormError(null);
    if (!form.patientId) { setFormError('Please select a patient.'); return; }
    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    setSaving(true);
    try {
      const start = new Date(`${form.date}T${form.time}`);
      const end   = new Date(start.getTime() + form.durationMinutes * 60 * 1000);
      const payload = {
        patientId: form.patientId,
        type:      form.type,
        title:     form.title,
        startTime: start.toISOString(),
        endTime:   end.toISOString(),
        provider:  form.provider || null,
        notes:     form.notes    || null,
        status:    form.status,
      };

      let res: Response;
      if (editAppt) {
        res = await fetch(`/api/appointments/${editAppt.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setFormError(data.error ?? `Server error (${res.status}). Please try again.`);
        return;
      }

      setShowModal(false);
      setEditAppt(null);
      loadAppointments();
      // Clear query params
      router.replace('/calendar');
    } catch {
      setFormError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editAppt) return;
    if (!confirm('Delete this appointment?')) return;
    await fetch(`/api/appointments/${editAppt.id}`, { method: 'DELETE' });
    setShowModal(false);
    setEditAppt(null);
    loadAppointments();
  }

  function openEdit(appt: Appointment) {
    const start = new Date(appt.startTime);
    const end   = new Date(appt.endTime);
    const mins  = Math.round((end.getTime() - start.getTime()) / 60000);
    setForm({
      patientId:       appt.patientId,
      type:            appt.type,
      title:           appt.title,
      date:            fmt(start),
      time:            toLocalDatetime(appt.startTime).slice(11, 16),
      durationMinutes: DURATION_OPTIONS.find((d) => d.minutes === mins)?.minutes ?? 30,
      provider:        appt.provider ?? '',
      notes:           appt.notes    ?? '',
      status:          appt.status,
    });
    setPatientSearch(appt.patient?.name ?? '');
    setEditAppt(appt);
    setFormError(null);
    setShowModal(true);
  }

  function openNew(dateStr?: string) {
    setForm(emptyForm(dateStr));
    setPatientSearch('');
    setEditAppt(null);
    setFormError(null);
    setShowModal(true);
  }

  function setField<K extends keyof ReturnType<typeof emptyForm>>(k: K, v: ReturnType<typeof emptyForm>[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Title bar label
  const viewLabel = viewMode === 'month'
    ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : viewMode === 'week'
    ? `Week of ${fmt(getWeekStart(currentDate))}`
    : fmt(currentDate);

  const filteredPts = patients.filter((p) =>
    !patientSearch || p.name.toLowerCase().includes(patientSearch.toLowerCase()) || p.patientId.toLowerCase().includes(patientSearch.toLowerCase())
  );

  return (
    <>
      <TopBar
        title="Calendar"
        breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Calendar' }]}
        actions={
          <button className="btn btn-primary" onClick={() => openNew()}>
            📅 New Appointment
          </button>
        }
      />

      <div className="page-content">
        {/* Controls row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid #d1d5db', overflow: 'hidden' }}>
            {(['month','week','day'] as ViewMode[]).map((v) => (
              <button key={v} onClick={() => setViewMode(v)} style={{ padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: viewMode === v ? '#0055a5' : '#fff', color: viewMode === v ? '#fff' : '#374151', border: 'none', textTransform: 'capitalize' }}>
                {v}
              </button>
            ))}
          </div>

          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>◀</button>
            <span style={{ fontWeight: 600, fontSize: 14, minWidth: 180, textAlign: 'center' }}>{viewLabel}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate(1)}>▶</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setCurrentDate(new Date())}>Today</button>
          </div>

          {/* Type filter */}
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button onClick={() => setTypeFilter('all')} style={{ padding: '3px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: typeFilter === 'all' ? '#1a2233' : '#fff', color: typeFilter === 'all' ? '#fff' : '#374151', border: '1px solid #d1d5db' }}>All</button>
            {APPT_TYPES.map((t) => (
              <button key={t.value} onClick={() => setTypeFilter(t.value as ApptType)} style={{ padding: '3px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: typeFilter === t.value ? t.color : '#fff', color: typeFilter === t.value ? '#fff' : t.color, border: `1px solid ${t.color}40` }}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar grid */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading calendar…</div>
          ) : viewMode === 'month' ? (
            <MonthView date={currentDate} appointments={appointments} onDayClick={(d) => openNew(d)} onApptClick={openEdit} />
          ) : viewMode === 'week' ? (
            <WeekView date={currentDate} appointments={appointments} onSlotClick={(d) => openNew(d)} onApptClick={openEdit} />
          ) : (
            <DayView date={currentDate} appointments={appointments} onSlotClick={(d) => openNew(d)} onApptClick={openEdit} />
          )}
        </div>
      </div>

      {/* ── Appointment Modal ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); router.replace('/calendar'); } }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* Modal header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0055a5' }}>
              <h2 style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>
                {editAppt ? '✏️ Edit Appointment' : '📅 New Appointment'}
              </h2>
              <button onClick={() => { setShowModal(false); router.replace('/calendar'); }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {formError && (
                <div style={{ background: '#ffebee', color: '#c62828', padding: '8px 12px', fontSize: 13, border: '1px solid #ef9a9a' }}>{formError}</div>
              )}

              {/* Patient selector */}
              <div>
                <label className="form-label">Patient <span style={{ color: '#c62828' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search patient by name or ID…"
                  value={patientSearch}
                  onChange={(e) => { setPatientSearch(e.target.value); if (!e.target.value) setField('patientId', ''); }}
                />
                {patientSearch && !form.patientId && filteredPts.length > 0 && (
                  <div style={{ border: '1px solid #d1d5db', maxHeight: 160, overflowY: 'auto', background: '#fff' }}>
                    {filteredPts.slice(0, 8).map((p) => (
                      <div key={p.id} onClick={() => { setField('patientId', p.id); setPatientSearch(p.name); }} style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f0f2f5' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f7ff')} onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}>
                        <strong>{p.name}</strong> <span style={{ color: '#6b7280', fontSize: 11 }}>{p.patientId}</span>
                      </div>
                    ))}
                  </div>
                )}
                {form.patientId && (
                  <div style={{ fontSize: 11, color: '#2e7d32', marginTop: 3 }}>
                    ✓ Patient selected: {patients.find((p) => p.id === form.patientId)?.patientId}
                  </div>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="form-label">Appointment Type</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {APPT_TYPES.map((t) => (
                    <button key={t.value} type="button" onClick={() => { setField('type', t.value); if (!form.title) setField('title', t.label); }} style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: form.type === t.value ? t.color : t.bg, color: form.type === t.value ? '#fff' : t.color, border: `1px solid ${t.color}60`, transition: 'all 0.1s' }}>
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="form-label">Title <span style={{ color: '#c62828' }}>*</span></label>
                <input type="text" className="form-input" value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="e.g. Shot Week 4 — Vial #2" />
              </div>

              {/* Date + Time + Duration */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={form.date} onChange={(e) => setField('date', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Time</label>
                  <input type="time" className="form-input" value={form.time} onChange={(e) => setField('time', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Duration</label>
                  <select className="form-input" value={form.durationMinutes} onChange={(e) => setField('durationMinutes', parseInt(e.target.value))}>
                    {DURATION_OPTIONS.map((d) => (
                      <option key={d.minutes} value={d.minutes}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Provider */}
              <div>
                <label className="form-label">Provider / Staff</label>
                <select className="form-input" value={form.provider} onChange={(e) => setField('provider', e.target.value)}>
                  <option value="">Select provider…</option>
                  {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows={3} style={{ resize: 'vertical' }} value={form.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Clinical notes, instructions…" />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', paddingTop: 4 }}>
                <div>
                  {editAppt && (
                    <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); router.replace('/calendar'); }}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : editAppt ? 'Update' : 'Create Appointment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Helper: view date ranges ─────────────────────────────────────────────────

function getViewRange(date: Date, view: ViewMode): [Date, Date] {
  if (view === 'month') {
    const from = new Date(date.getFullYear(), date.getMonth(), 1);
    const to   = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    return [from, to];
  }
  if (view === 'week') {
    const from = getWeekStart(date);
    const to   = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    return [from, to];
  }
  const from = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const to   = new Date(from.getTime() + 24 * 60 * 60 * 1000 - 1);
  return [from, to];
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({ date, appointments, onDayClick, onApptClick }: {
  date: Date;
  appointments: Appointment[];
  onDayClick: (dateStr: string) => void;
  onApptClick: (a: Appointment) => void;
}) {
  const year  = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = fmt(new Date());

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e5e7eb' }}>
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
        ))}
      </div>

      {/* Date cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cells.map((day, idx) => {
          const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
          const dayAppts = day
            ? appointments.filter((a) => a.startTime.slice(0, 10) === dateStr)
            : [];
          const isToday = dateStr === today;

          return (
            <div
              key={idx}
              onClick={() => day && onDayClick(dateStr)}
              style={{
                minHeight: 90,
                padding: '4px 6px',
                borderRight: (idx + 1) % 7 !== 0 ? '1px solid #f0f2f5' : 'none',
                borderBottom: '1px solid #f0f2f5',
                background: !day ? '#fafafa' : isToday ? '#f0f7ff' : '#fff',
                cursor: day ? 'pointer' : 'default',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { if (day) (e.currentTarget as HTMLDivElement).style.background = isToday ? '#e0efff' : '#f8fafc'; }}
              onMouseLeave={(e) => { if (day) (e.currentTarget as HTMLDivElement).style.background = isToday ? '#f0f7ff' : '#fff'; }}
            >
              {day && (
                <>
                  <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, marginBottom: 3, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: isToday ? '#0055a5' : 'transparent', color: isToday ? '#fff' : '#374151' }}>
                    {day}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayAppts.slice(0, 3).map((a) => {
                      const tc = typeConfig(a.type);
                      return (
                        <div
                          key={a.id}
                          onClick={(e) => { e.stopPropagation(); onApptClick(a); }}
                          style={{ background: tc.bg, color: tc.color, padding: '1px 5px', fontSize: 10, fontWeight: 600, cursor: 'pointer', borderLeft: `3px solid ${tc.color}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          title={`${a.title} — ${new Date(a.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`}
                        >
                          {tc.emoji} {new Date(a.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} {a.title}
                        </div>
                      );
                    })}
                    {dayAppts.length > 3 && (
                      <div style={{ fontSize: 10, color: '#6b7280', paddingLeft: 5 }}>+{dayAppts.length - 3} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ date, appointments, onSlotClick, onApptClick }: {
  date: Date;
  appointments: Appointment[];
  onSlotClick: (dateStr: string) => void;
  onApptClick: (a: Appointment) => void;
}) {
  const weekStart = getWeekStart(date);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const today = fmt(new Date());

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', minWidth: 700 }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid #e5e7eb' }} />
        {days.map((d) => {
          const ds = fmt(d);
          const isToday = ds === today;
          return (
            <div key={ds} style={{ padding: '8px 4px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', borderLeft: '1px solid #f0f2f5', background: isToday ? '#f0f7ff' : undefined }}>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{DAYS_OF_WEEK[d.getDay()]}</div>
              <div style={{ fontSize: 14, fontWeight: isToday ? 700 : 400, color: isToday ? '#0055a5' : '#374151' }}>{d.getDate()}</div>
            </div>
          );
        })}

        {/* Hour rows */}
        {Array.from({ length: 24 }, (_, h) => (
          <>
            <div key={`h-${h}`} style={{ padding: '2px 6px', fontSize: 10, color: '#9ca3af', borderBottom: '1px solid #f0f2f5', textAlign: 'right', paddingRight: 8 }}>
              {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
            </div>
            {days.map((d) => {
              const ds = fmt(d);
              const slotAppts = appointments.filter((a) => {
                const st = new Date(a.startTime);
                return fmt(st) === ds && st.getHours() === h;
              });
              return (
                <div
                  key={`${ds}-${h}`}
                  onClick={() => { const d2 = `${ds}T${String(h).padStart(2,'0')}:00`; onSlotClick(ds); }}
                  style={{ minHeight: 40, borderBottom: '1px solid #f0f2f5', borderLeft: '1px solid #f0f2f5', padding: '2px 3px', cursor: 'pointer', background: fmt(new Date()) === ds ? '#fafeff' : undefined }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.background = '#f0f7ff'}
                  onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.background = fmt(new Date()) === ds ? '#fafeff' : '#fff'}
                >
                  {slotAppts.map((a) => {
                    const tc = typeConfig(a.type);
                    return (
                      <div key={a.id} onClick={(e) => { e.stopPropagation(); onApptClick(a); }} style={{ background: tc.bg, color: tc.color, padding: '2px 5px', fontSize: 10, fontWeight: 600, marginBottom: 2, cursor: 'pointer', borderLeft: `3px solid ${tc.color}` }}>
                        {tc.emoji} {new Date(a.startTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} {a.title}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({ date, appointments, onSlotClick, onApptClick }: {
  date: Date;
  appointments: Appointment[];
  onSlotClick: (dateStr: string) => void;
  onApptClick: (a: Appointment) => void;
}) {
  const ds = fmt(date);

  return (
    <div>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 700, fontSize: 14, color: '#0055a5' }}>
        {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      </div>
      {Array.from({ length: 24 }, (_, h) => {
        const slotAppts = appointments.filter((a) => {
          const st = new Date(a.startTime);
          return fmt(st) === ds && st.getHours() === h;
        });
        return (
          <div
            key={h}
            onClick={() => onSlotClick(ds)}
            style={{ display: 'grid', gridTemplateColumns: '70px 1fr', borderBottom: '1px solid #f0f2f5', minHeight: 52, cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.background = '#f8fafc'}
            onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.background = '#fff'}
          >
            <div style={{ padding: '6px 12px', fontSize: 11, color: '#9ca3af', fontWeight: 600, borderRight: '1px solid #f0f2f5', display: 'flex', alignItems: 'flex-start' }}>
              {h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h-12}:00 PM`}
            </div>
            <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {slotAppts.map((a) => {
                const tc = typeConfig(a.type);
                const end = new Date(a.endTime);
                return (
                  <div key={a.id} onClick={(e) => { e.stopPropagation(); onApptClick(a); }} style={{ background: tc.bg, color: tc.color, padding: '6px 10px', borderLeft: `4px solid ${tc.color}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{tc.emoji} {a.title}</div>
                      <div style={{ fontSize: 11, opacity: 0.8 }}>
                        {new Date(a.startTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} – {end.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                        {a.patient && ` · ${a.patient.name}`}
                        {a.provider && ` · ${a.provider}`}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, background: '#fff', padding: '2px 6px', borderRadius: 99, fontWeight: 600 }}>{a.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
