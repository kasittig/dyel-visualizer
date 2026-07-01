/** Reads the weight unit from a `weight (lbs)` / `weight (kg)` style column header. */
export function detectWeightUnit(keys: string[]): 'lbs' | 'kg' | null {
  const key = keys.find((k) => /^weight(\W|$)/.test(k));
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
