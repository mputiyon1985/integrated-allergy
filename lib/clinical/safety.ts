export type SafetyWarning = { level: 'error' | 'warn'; message: string }

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

export function validateGlycerin(percent: number): SafetyWarning | null {
  if (percent > 50)
    return { level: 'error', message: `Glycerin ${percent}% exceeds safe limit of 50%` }
  if (percent > 40)
    return { level: 'warn', message: `Glycerin ${percent}% approaching limit` }
  return null
}
