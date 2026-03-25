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

export type VialColor = 'silver' | 'blue' | 'yellow' | 'red';

export const vialColorMap: Record<VialColor, { bg: string; text: string; label: string }> = {
  silver: { bg: '#9e9e9e', text: '#fff', label: 'Silver (#1)' },
  blue: { bg: '#1565c0', text: '#fff', label: 'Blue (#2)' },
  yellow: { bg: '#f9a825', text: '#333', label: 'Yellow (#3)' },
  red: { bg: '#c62828', text: '#fff', label: 'Red (#4)' },
};

export type PatientStatus = 'Build-Up' | 'Maintenance' | 'Complete' | 'Inactive';

export const statusBadgeClass: Record<PatientStatus, string> = {
  'Build-Up': 'badge badge-buildup',
  'Maintenance': 'badge badge-maintenance',
  'Complete': 'badge badge-complete',
  'Inactive': 'badge badge-inactive',
};
