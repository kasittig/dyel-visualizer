import type { RechartsRow, ChartPoint } from '@dyel/pipeline';
import { mergeWideRechartsRows } from '../chart/pipelineChartUtils';
import { roundWeight } from '../weightUnit';
import type { BestSet } from './conjugateBestSet';

export interface ConjugateChartData {
  variations: string[];
  data: ChartPoint[];
}

/**
 * Builds conjugate chart data by deduplicating and sorting variation keys,
 * then merging variation and normalized rows by timestamp.
 *
 * Combines the raw variation and normalized datasets into a single time-series
 * with all variation columns, converting weights to the display unit.
 */
export function buildConjugateChartData(
  rawVariations: RechartsRow[],
  rawNormalized: RechartsRow[],
  unit: 'lbs' | 'kg'
): ConjugateChartData {
  // Dedupe and sort variation keys from both datasets
  const variations = [
    ...new Set(rawVariations.flatMap((r) => Object.keys(r).filter((k) => k !== 't'))),
  ].sort();

  // Merge rows by timestamp, combining variations and normalized data
  const combinedByT = new Map<number, RechartsRow>();
  for (const row of rawVariations) {
    combinedByT.set(row.t, { ...combinedByT.get(row.t), ...row });
  }
  for (const row of rawNormalized) {
    combinedByT.set(row.t, { ...combinedByT.get(row.t), ...row });
  }

  const data = mergeWideRechartsRows([...combinedByT.values()], unit);

  return {
    variations,
    data,
  };
}

/**
 * Remaps the weight values in a best-set lookup to the display unit,
 * converting from kg (pipeline convention) to lbs or keeping as kg.
 */
export function roundBestSetsForDisplay(
  bestSetByLabelAndDate: Map<string, Map<string, BestSet>>,
  unit: 'lbs' | 'kg'
): Map<string, Map<string, BestSet>> {
  return new Map(
    [...bestSetByLabelAndDate].map(([label, byDate]) => [
      label,
      new Map(
        [...byDate].map(([date, set]) => [date, { ...set, weight: roundWeight(set.weight, unit) }])
      ),
    ])
  );
}
