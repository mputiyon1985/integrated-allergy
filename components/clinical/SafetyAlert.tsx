/**
 * @file components/clinical/SafetyAlert.tsx — Clinical safety warning banner
 *
 * Displays a color-coded safety alert for clinical warnings (yellow) or
 * danger conditions (red). Used in the vial preparation workflow to surface
 * allergen incompatibility warnings and glycerin limit violations from the
 * safety validation engine (lib/clinical/safety.ts).
 */
'use client';

/**
 * Props for the SafetyAlert component.
 */
interface SafetyAlertProps {
  /** 'warning' renders a yellow cautionary banner; 'danger' renders a red blocking alert */
  level: 'warning' | 'danger';
  /** Short headline message (e.g., "Proteolytic degradation risk") */
  message: string;
  /** Optional longer explanation shown below the headline */
  detail?: string;
  /** If provided, shows a dismiss (×) button that calls this handler */
  onDismiss?: () => void;
}

/**
 * Renders a dismissible safety alert banner with an icon, message, and optional detail.
 * Warning alerts use a triangle icon; danger alerts use a circle-info icon.
 */
export default function SafetyAlert({ level, message, detail, onDismiss }: SafetyAlertProps) {
  const isWarning = level === 'warning';

  return (
    <div className={`safety-alert safety-alert-${level}`}>
      {/* Icon */}
      <div style={{ flexShrink: 0, marginTop: 1 }}>
        {isWarning ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>
          {isWarning ? '⚠ Warning' : '🚨 Safety Alert'}: {message}
        </div>
        {detail && (
          <div style={{ fontSize: 12, marginTop: 3, opacity: 0.85 }}>{detail}</div>
        )}
      </div>

      {/* Dismiss */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            opacity: 0.6,
            padding: '0 2px',
            fontSize: 16,
            lineHeight: 1,
          }}
          title="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}
