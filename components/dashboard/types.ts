/**
 * @file components/dashboard/types.ts — Dashboard KPI type definitions
 *
 * Shared TypeScript interfaces for the dashboard statistics and KPI card configuration.
 * DashboardStats mirrors the DashboardStats Prisma model (pre-computed singleton row).
 * KpiDef defines how each card derives its value and display from the stats object.
 */

/**
 * Pre-computed dashboard statistics from the DashboardStats singleton row.
 * All counts reflect the current state at time of last refreshDashboardStats() call.
 */
export interface DashboardStats {
  /** Total enrolled patients (not soft-deleted) */
  totalPatients: number;
  /** Number of vials with a future expiry date (active treatments) */
  activeTreatments: number;
  /** Number of vials expiring within the next 30 days */
  vialsExpiringSoon: number;
  /** Number of vials expiring within the next 7 days (urgent) */
  vialsExpiring7Days: number;
  /** Number of doses administered in the past 7 days */
  dosesThisWeek: number;
  /** Number of shot-type appointments scheduled for today */
  shotsToday: number;
  /** Number of skin test appointments scheduled for today */
  testsToday: number;
  /** Number of evaluation appointments scheduled for today */
  evalsToday: number;
  /** Number of active (non-deleted, active=true) physicians */
  activeDoctors: number;
  /** Number of active (non-deleted, active=true) nursing staff */
  activeNurses: number;
}

/**
 * Configuration for a single KPI card on the dashboard.
 * Each KpiDef drives one card in DraggableKpiGrid.
 */
export interface KpiDef {
  /** Optional Next.js href — card becomes a Link when set and not in editMode */
  href?: string;
  /** Unique identifier matching the react-grid-layout key */
  id: string;
  /** Short display label shown above the metric value */
  label: string;
  /** Emoji icon rendered at the top of the card */
  icon: string;
  /** Extracts the numeric value to display from the current DashboardStats */
  getValue: (s: DashboardStats) => number;
  /** Subtitle description shown below the value */
  sub: string;
  /** Default CSS color string for the value (e.g., '#0055a5') */
  color: string;
  /** Optional function returning true when the metric exceeds a danger threshold */
  danger?: (s: DashboardStats) => boolean;
  /** Optional function returning an italic note to append to the subtitle */
  note?: (s: DashboardStats) => string | undefined;
}
