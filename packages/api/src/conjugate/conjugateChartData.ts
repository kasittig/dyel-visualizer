import type { RechartsRow, ChartPoint } from '@dyel/pipeline';
import { mergeWideRechartsRows } from '../chart/pipelineChartUtils';
import { roundWeight } from '../weightUnit';
import type { BestSet } from './conjugateBestSet';

export interface ConjugateChartData {
  variations: string[];
  data: ChartPoint[];
}

export function buildConjugateChartData(
  rawVariations: RechartsRow[],
  rawNormalized: RechartsRow[],
  unit: 'lbs' | 'kg'
): ConjugateChartData {
  const variations = [
    ...new Set(rawVariations.flatMap((r) => Object.keys(r).filter((k) => k !== 't'))),
  ].sort();
  const combinedByT = new Map<number, RechartsRow>();

  for (const row of [...rawVariations, ...rawNormalized]) {
    combinedByT.set(row.t, { ...combinedByT.get(row.t), ...row });
  }

  return { variations, data: mergeWideRechartsRows([...combinedByT.values()], unit) };
}

export function roundBestSetsForDisplay(
  bestSetByLabelAndDate: Map<string, Map<string, BestSet>>,
  unit: 'lbs' | 'kg'
): Map<string, Map<string, BestSet>> {
  return new Map(
    Array.from(bestSetByLabelAndDate, ([label, byDate]) => [
      label,
      new Map(
        Array.from(byDate, ([date, set]) => [
          date,
          { ...set, weight: roundWeight(set.weight, unit) },
        ])
      ),
    ])
  );
}
