// Dilution engine for allergy immunotherapy compounding

export const VIAL_CONFIGS = [
  { vialNumber: 1, ratio: 10000, colorCode: 'silver', label: '1:10,000' },
  { vialNumber: 2, ratio: 1000,  colorCode: 'blue',   label: '1:1,000'  },
  { vialNumber: 3, ratio: 100,   colorCode: 'yellow', label: '1:100'    },
  { vialNumber: 4, ratio: 10,    colorCode: 'red',    label: '1:10'     },
]

export const BUILDUP_SCHEDULE = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5]

export function calculateDilution(stockConc: number, ratio: number): number {
  return stockConc / ratio
}

export function generateVials(patientId: string) {
  return VIAL_CONFIGS.map(v => ({
    patientId,
    vialNumber: v.vialNumber,
    dilutionRatio: v.label,
    totalVolumeMl: 5.0,
    glycerinPercent: 10,
    colorCode: v.colorCode,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
  }))
}

export function generateBuildupSchedule(
  patientId: string,
  vialId: string,
  vialNumber: number,
  startWeek = 1,
) {
  // vialNumber kept for future per-vial schedule customization
  void vialNumber
  return BUILDUP_SCHEDULE.map((dose, i) => ({
    patientId,
    vialId,
    weekNumber: startWeek + i,
    doseMl: dose,
    phase: 'buildup' as const,
  }))
}
