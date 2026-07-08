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
 */
export function snapshotVariationsFromPipeline(
  variationRows: RechartsRow[],
  unit: 'lbs' | 'kg' = 'lbs'
): Record<string, number | undefined> {
  if (!variationRows.length) {
    return {};
  }

  const conv = getConverter(unit);
  // Find the row with the maximum timestamp (most recent)
  const lastRow = variationRows.reduce((a, b) => ((b.t as number) > (a.t as number) ? b : a));

  // Extract all non-timestamp numeric values and convert to display unit
  return Object.fromEntries(
    Object.entries(lastRow)
      .filter(([k, v]) => k !== 't' && typeof v === 'number')
      .map(([k, v]) => [k, Math.round(conv(v as number))])
  );
}
