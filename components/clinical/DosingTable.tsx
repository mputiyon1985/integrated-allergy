/**
 * @file components/clinical/DosingTable.tsx — Immunotherapy dosing schedule table
 *
 * Displays and manages a patient's weekly injection schedule.
 * When `editable` is true, reaction and notes cells become inline text inputs
 * that commit on blur or Enter. Used in the patient detail view (PatientDetailClient).
 */
'use client';

import { useState } from 'react';

/** A single row in the dosing schedule table representing one weekly injection. */
export interface DosingRow {
  /** Database ID of the DosingSchedule record */
  id: string;
  /** Sequential week number in the treatment course */
  week: number;
  /** Vial label, e.g., "Silver #1" or "Blue #2" */
  vial: string;
  /** Prescribed injection volume in milliliters */
  dose: number;
  /** Treatment phase: 'Buildup' or 'Maintenance' */
  phase: string;
  /** Current status of this dose */
  status: 'Scheduled' | 'Completed' | 'Skipped' | 'Reacted';
  /** Clinical reaction recorded at time of injection (e.g., "local redness 5mm") */
  reaction?: string;
  /** Additional clinical notes from the administering nurse or physician */
  notes?: string;
}

/**
 * Props for the DosingTable component.
 */
interface DosingTableProps {
  /** Array of dose rows to display */
  rows: DosingRow[];
  /** When true, reaction and notes cells are editable inline. Default: false. */
  editable?: boolean;
  /** Callback fired when a reaction or notes cell value is committed */
  onUpdate?: (id: string, field: 'reaction' | 'notes', value: string) => void;
  /** Callback fired when the Administer/Undo button is clicked */
  onMarkAdministered?: (id: string, administered: boolean) => void;
}

const statusStyle: Record<string, { bg: string; color: string }> = {
  Scheduled: { bg: '#e3f2fd', color: '#1565c0' },
  Completed: { bg: '#e8f5e9', color: '#2e7d32' },
  Skipped: { bg: '#f5f5f5', color: '#616161' },
  Reacted: { bg: '#ffebee', color: '#c62828' },
};

/**
 * Renders an interactive dosing schedule table with optional inline editing.
 * Shows week number, vial, dose volume, phase, status badge, reaction, notes,
 * and an administer/undo action button when onMarkAdministered is provided.
 */
export default function DosingTable({ rows, editable = false, onUpdate, onMarkAdministered }: DosingTableProps) {
  // Tracks which cell (id + field) is currently being edited inline
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'reaction' | 'notes' } | null>(null);
  // Holds the current value being typed in the active inline editor
  const [editValue, setEditValue] = useState('');

  const startEdit = (id: string, field: 'reaction' | 'notes', current: string) => {
    if (!editable) return;
    setEditingCell({ id, field });
    setEditValue(current || '');
  };

  const commitEdit = () => {
    if (editingCell && onUpdate) {
      onUpdate(editingCell.id, editingCell.field, editValue);
    }
    setEditingCell(null);
  };

  if (rows.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
        No dosing schedule available.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="clinical-table">
        <thead>
          <tr>
            <th>Week</th>
            <th>Vial</th>
            <th>Dose (mL)</th>
            <th>Phase</th>
            <th>Status</th>
            <th>Reaction</th>
            <th>Notes</th>
            {onMarkAdministered && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const st = statusStyle[row.status] || statusStyle.Scheduled;
            return (
              <tr key={row.id}>
                <td style={{ fontWeight: 600 }}>Week {row.week}</td>
                <td>{row.vial}</td>
                <td style={{ fontFamily: 'monospace' }}>{row.dose.toFixed(2)}</td>
                <td>{row.phase}</td>
                <td>
                  <span
                    style={{
                      background: st.bg,
                      color: st.color,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 7px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {row.status}
                  </span>
                </td>
                <td
                  style={{ cursor: editable ? 'text' : 'default', minWidth: 120 }}
                  onClick={() => startEdit(row.id, 'reaction', row.reaction || '')}
                >
                  {editingCell?.id === row.id && editingCell?.field === 'reaction' ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                      style={{ width: '100%', padding: '2px 4px', fontSize: 12, border: '1px solid #0055a5' }}
                    />
                  ) : (
                    <span style={{ color: row.reaction ? '#c62828' : '#9ca3af', fontSize: 12 }}>
                      {row.reaction || (editable ? '— click to edit' : '—')}
                    </span>
                  )}
                </td>
                <td
                  style={{ cursor: editable ? 'text' : 'default', minWidth: 160 }}
                  onClick={() => startEdit(row.id, 'notes', row.notes || '')}
                >
                  {editingCell?.id === row.id && editingCell?.field === 'notes' ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                      style={{ width: '100%', padding: '2px 4px', fontSize: 12, border: '1px solid #0055a5' }}
                    />
                  ) : (
                    <span style={{ color: row.notes ? '#374151' : '#9ca3af', fontSize: 12 }}>
                      {row.notes || (editable ? '— click to edit' : '—')}
                    </span>
                  )}
                </td>
                {onMarkAdministered && (
                  <td>
                    {row.status === 'Completed' ? (
                      <button
                        style={{ fontSize: 11, padding: '2px 8px', background: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db', cursor: 'pointer' }}
                        onClick={() => onMarkAdministered(row.id, false)}
                      >
                        Undo
                      </button>
                    ) : (
                      <button
                        style={{ fontSize: 11, padding: '2px 8px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', cursor: 'pointer' }}
                        onClick={() => onMarkAdministered(row.id, true)}
                      >
                        ✓ Administer
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
