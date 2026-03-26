/**
 * @module dilution
 * @description Dilution engine for allergy immunotherapy compounding.
 *
 * Implements the standard 4-vial allergen extract dilution series following
 * AAAI (American Academy of Allergy, Asthma & Immunology) practice parameters
 * for allergen immunotherapy and USP 797 pharmaceutical compounding standards.
 *
 * Clinical Standard: AAAI Practice Parameter — Allergen Immunotherapy (updated 2011)
 * Compounding Standard: USP <797> Pharmaceutical Compounding — Sterile Preparations
 *
 * @see {@link https://www.jacionline.org/article/S0091-6749(10)01616-0/fulltext} AAAI Immunotherapy Practice Parameters
 * @see {@link https://www.usp.org/compounding/general-chapter-797} USP 797
 */

/**
 * Configuration for each vial in the standard AAAI 4-vial dilution series.
 *
 * The series progresses from most dilute (Silver, 1:10,000) to most concentrated
 * (Red, 1:10), allowing gradual immunologic desensitization. Patients typically
 * complete buildup on each vial before advancing to the next.
 *
 * Color coding follows the AAAI/Meditab convention:
 * - 🩶 Silver  → 1:10,000  (starting dose — lowest antigen load)
 * - 🔵 Blue    → 1:1,000
 * - 🟡 Yellow  → 1:100
 * - 🔴 Red     → 1:10     (maintenance dose — highest antigen load)
 *
 * @constant
 * @type {Array<{ vialNumber: number; ratio: number; colorCode: string; label: string }>}
 */
export const VIAL_CONFIGS = [
  { vialNumber: 1, ratio: 10000, colorCode: 'silver', label: '1:10,000' },
  { vialNumber: 2, ratio: 1000,  colorCode: 'blue',   label: '1:1,000'  },
  { vialNumber: 3, ratio: 100,   colorCode: 'yellow', label: '1:100'    },
  { vialNumber: 4, ratio: 10,    colorCode: 'red',    label: '1:10'     },
]

/**
 * Standard buildup dose escalation schedule per AAAI guidelines.
 *
 * Ten weekly injection volumes (in mL) representing a conservative linear
 * buildup from 0.05 mL to 0.50 mL. This schedule is applied to each vial
 * in the series during the buildup phase before maintenance dosing begins.
 *
 * Clinical note: Actual dose increments may be modified by the supervising
 * allergist based on patient tolerance, local reactions, or systemic reactions.
 *
 * @constant
 * @type {number[]}
 * @example
 * // Week 1: 0.05 mL, Week 2: 0.10 mL, ..., Week 10: 0.50 mL
 */
export const BUILDUP_SCHEDULE = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5]

/**
 * Calculates the actual allergen concentration after dilution.
 *
 * @param {number} stockConc - Stock extract concentration (arbitrary units or w/v)
 * @param {number} ratio - Dilution denominator (e.g., 10000 for 1:10,000)
 * @returns {number} The diluted concentration
 */
export function calculateDilution(stockConc: number, ratio: number): number {
  return stockConc / ratio
}

/**
 * Generates the standard 4-vial batch for a patient following the AAAI dilution series.
 *
 * Each vial is compounded with:
 * - 5.0 mL total volume (standard single-patient vial size)
 * - 10% glycerin preservative (well within USP 797 50% max limit)
 * - 90-day expiry from date of compounding
 *
 * @param {string} patientId - The patient's database ID (cuid)
 * @returns {Array<object>} Array of 4 vial data objects ready for database insertion
 *
 * @example
 * const vials = generateVials('clp1234abc');
 * // Returns vials #1-#4: Silver → Blue → Yellow → Red
 */
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

/**
 * Generates a 10-week buildup dosing schedule for a specific vial.
 *
 * Creates weekly dose records following the AAAI buildup schedule constants,
 * starting at the specified week number. Each record tracks the expected dose
 * volume and is marked as `phase: 'buildup'` to distinguish from maintenance dosing.
 *
 * @param {string} patientId - The patient's database ID
 * @param {string} vialId - The vial's database ID (links doses to specific compounded vial)
 * @param {number} vialNumber - The vial number (1-4); reserved for future per-vial customization
 * @param {number} [startWeek=1] - The starting week number for this schedule segment
 * @returns {Array<object>} Array of 10 dosing schedule records for database insertion
 *
 * @example
 * // Generate buildup for vial #1 (Silver), starting at week 1
 * const doses = generateBuildupSchedule(patientId, vialId, 1, 1);
 * // doses[0] = { weekNumber: 1, doseMl: 0.05, phase: 'buildup', ... }
 * // doses[9] = { weekNumber: 10, doseMl: 0.50, phase: 'buildup', ... }
 */
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
