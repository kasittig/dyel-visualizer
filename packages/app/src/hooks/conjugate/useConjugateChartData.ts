import { useMemo } from 'react';
import { buildVariationChartData } from '@dyel/core';
export { NORMALIZED_KEY } from '@dyel/core';
import type { RepCalcStats } from '@dyel/core';
import type { ConjugateDataPair } from './useConjugateData';

export const NORMALIZED_COLOR = '#3b82f6';
export const NORMALIZED_LABEL = 'Normalized e1RM';

export function useConjugateChartData(
  rows: ConjugateDataPair[],
  baselineNames: Partial<Record<string, string>>,
  stats: RepCalcStats,
  targetName: string | null
) {
  return useMemo(
    () => buildVariationChartData(rows, baselineNames, stats, targetName),
    [rows, baselineNames, stats, targetName]
  );
}
