/**
 * @module safety
 * @description Safety validation engine for allergen immunotherapy compounding.
 *
 * Enforces clinical compounding safety rules at the point of allergen mix formulation,
 * preventing common errors that could result in reduced efficacy or patient harm.
 *
 * Clinical Standards Implemented:
 * - **AAAI Practice Parameters**: Allergen incompatibility and separation guidelines
 * - **USP <797>**: Pharmaceutical compounding — sterile preparations glycerin limits
 * - **Meditab IMS Protocol**: Standard allergy practice management rules
 *
 * @see {@link https://www.jacionline.org/article/S0091-6749(10)01616-0/fulltext} AAAI Immunotherapy Practice Parameters
 * @see {@link https://www.usp.org/compounding/general-chapter-797} USP 797 Sterile Compounding
 */

/** Represents a clinical safety warning with severity level and human-readable message. */
export type SafetyWarning = { level: 'error' | 'warn'; message: string }

/**
 * Validates an allergen mix for known proteolytic incompatibilities and separation requirements.
 *
 * **Proteolytic Incompatibility — Mold + Pollen:**
 * Mold extracts (e.g., Alternaria, Cladosporium, Aspergillus) contain proteolytic enzymes
 * that, when mixed with pollen extracts in the same vial, progressively degrade the protein
 * antigens in the pollen over time. This reduces immunologic potency and can lead to
 * inadequate desensitization. AAAI recommends maintaining mold and pollen extracts in
 * separate vials to preserve potency throughout the 90-day vial lifespan.
 *
 * **Insect Venom Separation:**
 * Insect venoms (Hymenoptera) and whole-body insect extracts are typically compounded in
 * dedicated vials separate from inhalant allergens, per standard allergy practice protocols.
 * Co-mixing with other allergen classes is not routinely recommended.
 *
 * @param {string[]} allergenTypes - Array of allergen type strings (e.g., ['mold', 'pollen', 'dust'])
 *   Valid types: 'mold' | 'pollen' | 'dust' | 'animal' | 'food' | 'insect'
 * @returns {SafetyWarning[]} Array of warnings (may be empty if no issues detected)
 *
 * @example
 * const warnings = validateAllergenMix(['mold', 'pollen', 'dust']);
 * // Returns: [{ level: 'warn', message: 'Proteolytic degradation risk: separate mold and pollen vials recommended' }]
 *
 * @example
 * const warnings = validateAllergenMix(['dust', 'animal']);
 * // Returns: [] (no incompatibilities)
 */
export function validateAllergenMix(allergenTypes: string[]): SafetyWarning[] {
  const warnings: SafetyWarning[] = []
  const hasMold   = allergenTypes.includes('mold')
  const hasPollen = allergenTypes.includes('pollen')
  const hasInsect = allergenTypes.includes('insect')

  if (hasMold && hasPollen)
    warnings.push({
      level: 'warn',
      message: 'Proteolytic degradation risk: separate mold and pollen vials recommended',
    })

  if (hasInsect)
    warnings.push({
      level: 'warn',
      message: 'Insect allergens: verify separate vial protocol',
    })

  return warnings
}

/**
 * Validates glycerin concentration against USP 797 compounding safety limits.
 *
 * **USP 797 Glycerin Limits:**
 * Glycerin (glycerol) is used as a preservative and stabilizer in allergen extracts,
 * inhibiting bacterial and fungal growth during the vial's 90-day lifespan. However,
 * concentrations above 50% (v/v) are caustic to subcutaneous tissue and can cause
 * significant local reactions, tissue necrosis, or patient discomfort.
 *
 * Safety thresholds:
 * - **> 50%** → Error: Exceeds USP 797 safe limit for injectable preparations. Must not be used.
 * - **> 40%** → Warning: Approaching the safe limit; clinical review recommended.
 * - **≤ 40%** → Safe: No action required.
 *
 * Standard clinical practice uses 10% glycerin for most allergy extracts.
 *
 * @param {number} percent - Glycerin concentration as a percentage (0–100)
 * @returns {SafetyWarning | null} A warning object if a limit is exceeded, or `null` if safe
 *
 * @example
 * validateGlycerin(10);  // null (safe, standard concentration)
 * validateGlycerin(45);  // { level: 'warn', message: 'Glycerin 45% approaching limit' }
 * validateGlycerin(55);  // { level: 'error', message: 'Glycerin 55% exceeds safe limit of 50%' }
 */
export function validateGlycerin(percent: number): SafetyWarning | null {
  if (percent > 50)
    return { level: 'error', message: `Glycerin ${percent}% exceeds safe limit of 50%` }
  if (percent > 40)
    return { level: 'warn', message: `Glycerin ${percent}% approaching limit` }
  return null
}
