export interface DashboardStats {
  totalPatients: number;
  activeTreatments: number;
  vialsExpiringSoon: number;
  dosesThisWeek: number;
  shotsToday: number;
  testsToday: number;
  evalsToday: number;
  activeDoctors: number;
  activeNurses: number;
}

export interface KpiDef {
  id: string;
  label: string;
  icon: string;
  getValue: (s: DashboardStats) => number;
  sub: string;
  color: string;
  danger?: (s: DashboardStats) => boolean;
  note?: (s: DashboardStats) => string | undefined;
}
