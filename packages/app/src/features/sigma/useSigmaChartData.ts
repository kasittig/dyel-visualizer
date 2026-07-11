import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import type { ChartPoint } from '@dyel/api';
import { mergeVolumeIntoChartPoints } from '@dyel/api';
import { usePipelineTotalChartData } from './usePipelineTotalChartData';

/**
 * Hook for the Σ (Sigma) tab that builds total chart data and merges volume data.
 *
 * Wraps `usePipelineTotalChartData` and memoizes the `mergeVolumeIntoChartPoints`
 * operation to combine competition total data with volume information.
 *
 * @param dateRange Date range for rendering (from, to)
 * @param unit Display unit ('lbs' or 'kg')
 * @param volumeByDate Map of calendar date (YYYY-MM-DD) to total volume
 * @returns Array of chart points with volume data merged; empty array if model is loading or unavailable
 */
export function useSigmaChartData(
  dateRange: DateRange,
  unit: 'lbs' | 'kg',
  volumeByDate: Map<string, number>
): ChartPoint[] {
  const pipelineChartData = usePipelineTotalChartData(dateRange, unit);

  return useMemo(
    () => mergeVolumeIntoChartPoints(pipelineChartData, volumeByDate),
    [pipelineChartData, volumeByDate]
  );
}
