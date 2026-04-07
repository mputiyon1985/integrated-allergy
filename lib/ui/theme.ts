/**
 * @file lib/ui/theme.ts — Shared design tokens and UI constants
 *
 * @description
 * Centralized color palette, vial color mappings, and patient status badge
 * class names used across all React components.
 *
 * Vial colors follow the AAAI standard 4-vial color coding system:
 * Silver (#1) → Blue (#2) → Yellow (#3) → Red (#4)
 * matching the dilution series from most dilute to most concentrated.
 *
 * @example
 * import { vialColorMap, theme } from '@/lib/ui/theme';
 * const badge = vialColorMap['silver']; // { bg: '#9e9e9e', text: '#fff', label: 'Silver (#1)' }
 */

/** Application-wide color palette. Used for consistent theming across all pages. */
export const theme = {
  colors: {
    sidebar: '#1a2233',
    bg: '#f4f6f9',
    card: '#ffffff',
    primary: '#0055a5',
    primaryHover: '#004494',
    success: '#2e7d32',
    warning: '#f57c00',
    danger: '#c62828',
    text: '#1a1a2e',
    textMuted: '#6b7280',
    border: '#d1d5db',
    vialSilver: '#9e9e9e',
    vialBlue: '#1565c0',
    vialYellow: '#f9a825',
    vialRed: '#c62828',
  },
} as const;

/** Union type of the four AAAI standard vial color codes. */
export type VialColor = 'silver' | 'blue' | 'yellow' | 'red';

/**
 * Maps each vial color to its display background, text color, and label.
 * Used by VialCard and DosingTable to render color-coded vial badges.
 */
export const vialColorMap: Record<VialColor, { bg: string; text: string; label: string }> = {
  silver: { bg: '#9e9e9e', text: '#fff', label: 'Silver (#1)' },
  blue: { bg: '#1565c0', text: '#fff', label: 'Blue (#2)' },
  yellow: { bg: '#f9a825', text: '#333', label: 'Yellow (#3)' },
  red: { bg: '#c62828', text: '#fff', label: 'Red (#4)' },
};

/** Union type of patient treatment statuses displayed in the UI. */
export type PatientStatus = 'Build-Up' | 'Maintenance' | 'Complete' | 'Inactive';

/**
 * Maps each patient status to its CSS class name for badge rendering.
 * Classes are defined in globals.css (.badge-buildup, .badge-maintenance, etc.).
 */
export const statusBadgeClass: Record<PatientStatus, string> = {
  'Build-Up': 'badge badge-buildup',
  'Maintenance': 'badge badge-maintenance',
  'Complete': 'badge badge-complete',
  'Inactive': 'badge badge-inactive',
};
