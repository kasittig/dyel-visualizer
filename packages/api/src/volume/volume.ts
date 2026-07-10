import type { TaggedSetRecord } from '@dyel/pipeline';

/**
 * Calculates volume (tonnage) correlation from TaggedSetRecord[].
 *
 * Groups records by local calendar date and sums tonnage (sets × reps × weight per record).
 * Handles unit conversion from kg to display unit.
 *
 * @param records - Array of TaggedSetRecord (weight always in kg)
 * @param unit - Target display unit ('lbs' or 'kg')
 * @returns Map of date string (YYYY-MM-DD) to tonnage in display unit
 */
export function calculateVolumeCorrelationFromTagged(
  records: TaggedSetRecord[],
  unit: 'lbs' | 'kg'
): Map<string, number> {
  const KG_TO_LBS = 2.20462262185;

  const volumeByDate = new Map<string, number>();
  for (const record of records) {
    // Convert epoch ms UTC to local date key (YYYY-MM-DD)
    const dateObj = new Date(record.date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const key = `${year}-${month}-${day}`;

    // Tonnage = sets × reps × weight (weight already in kg)
    // Default sets to 1 if undefined (for top-set / freeform entries with no explicit set count)
    const sets = record.sets ?? 1;
    const weight = record.weight * (unit === 'lbs' ? KG_TO_LBS : 1);
    const tonnage = sets * record.reps * weight;

    volumeByDate.set(key, (volumeByDate.get(key) ?? 0) + tonnage);
  }
  return volumeByDate;
}
