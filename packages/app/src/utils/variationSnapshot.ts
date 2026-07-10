import type { RechartsRow } from '@dyel/pipeline';

const KG_TO_LBS = 2.20462262185;

/**
 * Converts a unit enum to a converter function.
 * Pipeline data is always in kg; this converts to the target display unit.
 */
const getConverter = (unit: 'lbs' | 'kg') =>
  unit === 'lbs' ? (v: number) => Math.round(v * KG_TO_LBS) : (v: number) => v;

/**
 * Extracts the latest per-variation normalized e1RM snapshot from a pipeline
 * variations dataset (RechartsRow[] time series), converting to the display unit.
 *
 * Returns an object keyed by variation label with the latest e1RM value for each.
 * Non-numeric values and the timestamp key 't' are excluded.
 *
 * Since the input dataset is not forward-filled (each row only contains variations
 * actually logged on that calendar day), this function scans ALL rows chronologically,
 * and for each variation key, keeps the value from the row with the maximum timestamp
 * at which that key has a defined numeric value — i.e., each variation's own latest
 * logged value, not the literal last row's contents.
 */
export function snapshotVariationsFromPipeline(
  variationRows: RechartsRow[],
  unit: 'lbs' | 'kg' = 'lbs'
): Record<string, number | undefined> {
  if (!variationRows.length) {
    return {};
  }

  const conv = getConverter(unit);
  const result: Record<string, number> = {};

  // Sort rows by timestamp ascending so that later rows' values naturally overwrite earlier ones
  const sorted = [...variationRows].sort((a, b) => (a.t as number) - (b.t as number));

  // For each row (in chronological order), update all numeric non-`t` keys
  // Since we process chronologically, the final value in result[key] is the latest one for that key
  for (const row of sorted) {
    for (const [k, v] of Object.entries(row)) {
      if (k !== 't' && typeof v === 'number') {
        result[k] = Math.round(conv(v));
      }
    }
  }

  return result;
}
