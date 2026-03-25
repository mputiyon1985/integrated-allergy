'use client';

import { vialColorMap, type VialColor } from '@/lib/ui/theme';

interface VialCardProps {
  vialNumber: number;
  color: VialColor;
  dilutionRatio: string;
  volume: number;
  expiry: string;
  status: 'Active' | 'Expired' | 'Depleted' | 'Pending';
}

const statusColors: Record<string, { bg: string; text: string }> = {
  Active: { bg: '#e8f5e9', text: '#2e7d32' },
  Expired: { bg: '#ffebee', text: '#c62828' },
  Depleted: { bg: '#f5f5f5', text: '#616161' },
  Pending: { bg: '#fff3e0', text: '#f57c00' },
};

export default function VialCard({ vialNumber, color, dilutionRatio, volume, expiry, status }: VialCardProps) {
  const colorInfo = vialColorMap[color];
  const statusStyle = statusColors[status] || statusColors.Active;

  return (
    <div className="vial-card">
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>
          Vial #{vialNumber}
        </div>
        <span
          style={{
            background: statusStyle.bg,
            color: statusStyle.text,
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            border: `1px solid ${statusStyle.text}30`,
          }}
        >
          {status}
        </span>
      </div>

      {/* Color badge */}
      <div>
        <span
          className="vial-color-badge"
          style={{
            background: colorInfo.bg,
            color: colorInfo.text,
            border: `1px solid ${colorInfo.bg}`,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: colorInfo.text === '#fff' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.3)',
              display: 'inline-block',
            }}
          />
          {colorInfo.label}
        </span>
      </div>

      {/* Details */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px 12px',
          marginTop: 4,
        }}
      >
        <div>
          <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Dilution
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginTop: 1 }}>
            {dilutionRatio}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Volume
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginTop: 1 }}>
            {volume} mL
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Expiry
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: status === 'Expired' ? '#c62828' : '#1a1a2e',
              marginTop: 1,
            }}
          >
            {expiry}
          </div>
        </div>
      </div>
    </div>
  );
}
