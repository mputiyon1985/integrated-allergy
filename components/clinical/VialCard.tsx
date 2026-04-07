/**
 * @file components/clinical/VialCard.tsx — Allergen extract vial summary card
 *
 * Displays the details of a single compounded allergen vial following the
 * AAAI 4-vial dilution color-coding system. Used in the patient detail view
 * and the vial preparation summary screen.
 */
'use client';

import { vialColorMap, type VialColor } from '@/lib/ui/theme';

/**
 * Props for the VialCard component.
 */
interface VialCardProps {
  /** Vial position in the AAAI series (1=Silver, 2=Blue, 3=Yellow, 4=Red) */
  vialNumber: number;
  /** AAAI color code determining the visual badge and dilution context */
  color: VialColor;
  /** Dilution ratio label, e.g., "1:10,000" or "1:10" */
  dilutionRatio: string;
  /** Total volume of extract in milliliters (typically 5.0 mL) */
  volume: number;
  /** ISO date string (YYYY-MM-DD) or "—" for the expiry date */
  expiry: string;
  /** Current vial status affecting the status badge color */
  status: 'Active' | 'Expired' | 'Depleted' | 'Pending';
}

const statusColors: Record<string, { bg: string; text: string }> = {
  Active: { bg: '#e8f5e9', text: '#2e7d32' },
  Expired: { bg: '#ffebee', text: '#c62828' },
  Depleted: { bg: '#f5f5f5', text: '#616161' },
  Pending: { bg: '#fff3e0', text: '#f57c00' },
};

/**
 * Renders a compact card showing vial number, color badge, dilution ratio,
 * volume, expiry date, and a status badge (Active/Expired/Depleted/Pending).
 * Expiry date text turns red when status is 'Expired'.
 */
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
