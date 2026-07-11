import { convertWeight, type DisplayUnit } from '../weightUnit';

/**
 * Formats an effect name for display.
 *
 * Converts to lowercase, replaces underscores with spaces, and capitalizes each word.
 * Example: 'hypertrophy' → 'Hypertrophy', 'power_development' → 'Power Development'
 *
 * @param effect - The effect name to format
 * @returns Formatted effect display string
 */
export function formatEffect(effect: string): string {
  return effect
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Formats a weight offset for display.
 *
 * Converts the offset from kg to the display unit, formats with a sign prefix (+/-),
 * and appends the unit suffix. Example: 5 (kg, 'lbs') → '+11.0lbs', -2.5 (kg, 'kg') → '-2.5kg'
 *
 * @param offsetKg - The offset in kilograms
 * @param unit - The target display unit ('lbs' or 'kg')
 * @returns Formatted offset string with sign and unit
 */
export function formatAddlWtOffset(offsetKg: number, unit: DisplayUnit): string {
  const converted = convertWeight(offsetKg, unit);
  const sign = converted >= 0 ? '+' : '-';
  const suffix = unit === 'lbs' ? 'lbs' : 'kg';
  return `${sign}${Math.abs(converted).toFixed(1)}${suffix}`;
}
