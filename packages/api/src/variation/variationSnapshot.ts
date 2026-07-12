import type { RechartsRow, NormalizationModel } from '@dyel/pipeline';
import { normalizeE1rm } from '@dyel/pipeline';
import { roundWeight } from '../weightUnit';

function latestRawValuesByLabel(variationRows: RechartsRow[]): Map<string, number> {
  const result = new Map<string, number>();
  if (!variationRows.length) {
    return result;
  }
  const sorted = [...variationRows].sort((a, b) => (a.t as number) - (b.t as number));

  for (const row of sorted) {
    for (const [k, v] of Object.entries(row)) {
      if (k !== 't' && typeof v === 'number') {
        result.set(k, v);
      }
    }
  }
  return result;
}

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
      continue;
    }
    const normalizedKgValue = normalizeE1rm(canonical, rawKgValue, normalizationModel);
    if (normalizedKgValue === null) {
      continue;
    }
    result[label] = roundWeight(normalizedKgValue, unit);
  }
  return result;
}
