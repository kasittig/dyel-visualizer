/**
 * Reads the weight unit from a `weight (lbs)` / `weight (kg)` style column header, or from a
 * rep-max column header like `1rm (kg)` when no `weight` column is present.
 */
export function detectWeightUnit(keys: string[]): 'lbs' | 'kg' | null {
  const key = keys.find((k) => /^weight(\W|$)/.test(k)) ?? keys.find((k) => /^\d+rm(\W|$)/.test(k));
  if (!key) {
    return null;
  }
  if (key.includes('kg')) {
    return 'kg';
  }
  if (key.includes('lb')) {
    return 'lbs';
  }
  return null;
}
