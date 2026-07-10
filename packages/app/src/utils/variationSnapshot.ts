import type { RechartsRow } from '@dyel/pipeline';
import type { NormalizationModel } from '@dyel/pipeline';
import { normalizeE1rm } from '@dyel/pipeline';
import { roundWeight } from './weightUnit';

/**
 * Extracts the latest per-label raw kg value from a variations dataset.
 *
 * Scans all rows chronologically and returns a Map of each variation label to its latest
 * defined numeric raw (un-rounded, un-converted) kg value. The timestamp key 't' and
 * non-numeric values are excluded.
 *
 * This helper is shared by both raw and normalized snapshot functions, isolating the
 * "find latest per label" reduction from the conversion/normalization logic.
 */
function latestRawValuesByLabel(variationRows: RechartsRow[]): Map<string, number> {
  const result = new Map<string, number>();

  if (!variationRows.length) {
    return result;
  }

  // Sort rows by timestamp ascending so that later rows' values naturally overwrite earlier ones
  const sorted = [...variationRows].sort((a, b) => (a.t as number) - (b.t as number));

  // For each row (in chronological order), update all numeric non-`t` keys
  // Since we process chronologically, the final value in result[key] is the latest one for that key
  for (const row of sorted) {
    for (const [k, v] of Object.entries(row)) {
      if (k !== 't' && typeof v === 'number') {
        result.set(k, v);
      }
    }
  }

  return result;
}

/**
 * Extracts the latest per-variation raw e1RM snapshot from a pipeline
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
  const result: Record<string, number> = {};

  for (const [label, rawKgValue] of latestRawValuesByLabel(variationRows)) {
    result[label] = roundWeight(rawKgValue, unit);
  }

  return result;
}

/**
 * Extracts the latest per-variation e1RM snapshot from a pipeline variations dataset,
 * applying cross-exercise normalization via the pipeline's NormalizationModel.
 *
 * For each variation label in the dataset:
 * 1. Looks up its canonical exercise ID via `canonicalByLabel`
 * 2. If no canonical mapping exists, omits the label from the result
 * 3. Calls `normalizeE1rm(canonical, rawKgValue, normalizationModel)`
 * 4. If the result is null (unfitted per the model's minSamples threshold), omits the label
 * 5. Otherwise, converts the normalized kg value to the display unit and rounds it
 *
 * This mirrors ConjugateCharts' `normalized` composite pattern (which applies `normalizeE1rm`
 * against the model's fixed lift-family baseline canonical) but per-variation instead of as
 * a composite sum. Unmapped or unfitted labels are silently excluded rather than shown with
 * a misleading raw value.
 *
 * @param variationRows - Raw pipeline RechartsRow[] time series (kg-valued, not yet unit-converted)
 * @param canonicalByLabel - Map of variation label → its most-recently-logged canonical exercise ID
 * @param normalizationModel - The fitted NormalizationModel from the pipeline
 * @param unit - Target display unit ('lbs' or 'kg', defaults to 'lbs')
 * @returns Object keyed by variation label with normalized e1RM values, excluding unmapped/unfitted labels
 */
export function snapshotNormalizedVariationsFromPipeline(
  variationRows: RechartsRow[],
  canonicalByLabel: Map<string, string>,
  normalizationModel: NormalizationModel,
  unit: 'lbs' | 'kg' = 'lbs'
): Record<string, number | undefined> {
  const result: Record<string, number> = {};

  for (const [label, rawKgValue] of latestRawValuesByLabel(variationRows)) {
    const canonical = canonicalByLabel.get(label);
    if (!canonical) {
      // No canonical mapping for this label; omit it entirely
      continue;
    }

    const normalizedKgValue = normalizeE1rm(canonical, rawKgValue, normalizationModel);
    if (normalizedKgValue === null) {
      // Unfitted (n < minSamples); omit it entirely per the invariant
      continue;
    }

    result[label] = roundWeight(normalizedKgValue, unit);
  }

  return result;
}
