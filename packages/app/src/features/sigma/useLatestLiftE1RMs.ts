import { useMemo } from 'react';
import type { ChartPoint } from '@dyel/api';
import { latestLiftE1RMs } from '@dyel/api';

/**
 * Hook to compute latest e1RM by lift type from chart data.
 * Wraps the memoized `latestLiftE1RMs` derivation.
 */
export function useLatestLiftE1RMs(chartData: ChartPoint[]) {
  return useMemo(() => latestLiftE1RMs(chartData), [chartData]);
}
