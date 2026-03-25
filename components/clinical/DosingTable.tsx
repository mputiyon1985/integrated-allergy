'use client';

import { useState } from 'react';

export interface DosingRow {
  id: string;
  week: number;
  vial: string;
  dose: number;
  phase: string;
  status: 'Scheduled' | 'Completed' | 'Skipped' | 'Reacted';
  reaction?: string;
  notes?: string;
}

interface DosingTableProps {
  rows: DosingRow[];
  editable?: boolean;
  onUpdate?: (id: string, field: 'reaction' | 'notes', value: string) => void;
}

const statusStyle: Record<string, { bg: string; color: string }> = {
  Scheduled: { bg: '#e3f2fd', color: '#1565c0' },
  Completed: { bg: '#e8f5e9', color: '#2e7d32' },
  Skipped: { bg: '#f5f5f5', color: '#616161' },
  Reacted: { bg: '#ffebee', color: '#c62828' },
};

export default function DosingTable({ rows, editable = false, onUpdate }: DosingTableProps) {
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'reaction' | 'notes' } | null>(null);
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
