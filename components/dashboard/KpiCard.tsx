'use client';

import Link from 'next/link';
import { useState } from 'react';

interface KpiCardProps {
  label: string;
  icon: string;
  value: number;
  sub: string;
  note?: string;
  valueColor: string;
  editMode: boolean;
  href?: string;
}

export function KpiCard({ label, icon, value, sub, note, valueColor, editMode, href }: KpiCardProps) {
  const [hovered, setHovered] = useState(false);

  const inner = (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#ffffff',
        borderRadius: 12,
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.08)',
        border: editMode ? '2px solid #F59E0B' : '1px solid #e5e7eb',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 6,
        height: '100%',
        position: 'relative',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        cursor: editMode ? 'grab' : href ? 'pointer' : 'default',
        userSelect: 'none',
        overflow: 'hidden',
        boxSizing: 'border-box',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      {editMode && (
        <span style={{ position: 'absolute', top: 8, left: 10, fontSize: 16, color: '#F59E0B', lineHeight: 1, cursor: 'grab' }}>⠿</span>
      )}
      <div style={{ fontSize: 24, lineHeight: 1, marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: valueColor, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#9ca3af' }}>
        {sub}
        {note && <span style={{ marginLeft: 4, fontStyle: 'italic' }}>({note})</span>}
      </div>
      {!editMode && href && (
        <div style={{ fontSize: 10, color: '#2ec4b6', marginTop: 4, fontWeight: 600 }}>View →</div>
      )}
    </div>
  );

  if (href && !editMode) {
    return <Link href={href} style={{ display: 'block', height: '100%', textDecoration: 'none' }}>{inner}</Link>;
  }

  return <div style={{ height: '100%' }}>{inner}</div>;
}
