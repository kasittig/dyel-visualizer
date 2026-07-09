import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import type { RenderParams, ChartPoint } from '@dyel/pipeline';
import { usePipelineModel } from '../../context/PipelineContext';
import { usePipelineDatasets } from './usePipelineDatasets';
import { TOTAL_CHART_SPECS } from '@dyel/api';
import { mergeRechartsRowsToChartPoints } from '../../utils/pipelineChartUtils';

const TOTAL_CHART_IDS = ['squat', 'bench', 'deadlift', 'pushPull', 'total'];

/**
 * Hook that builds total chart data from the pipeline model and dataset specs.
 *
 * Fetches and pipeline orchestration are handled by the PipelineProvider context;
 * this hook only applies TOTAL_CHART_SPECS and merges the result into ChartPoint[].
 *
 * @param dateRange Date range for rendering (from, to)
 * @param unit Display unit ('lbs' or 'kg')
 * @returns Array of chart points; empty array if model is loading or unavailable
 */
export function usePipelineTotalChartData(dateRange: DateRange, unit: 'lbs' | 'kg'): ChartPoint[] {
  const { status } = usePipelineModel();

  const ui: RenderParams = useMemo(
    () =>
      dateRange.from && dateRange.to
        ? { dateRange: [dateRange.from.getTime(), dateRange.to.getTime()] }
        : {},
    [dateRange.from, dateRange.to]
  );

  const datasets = usePipelineDatasets(TOTAL_CHART_SPECS, ui);

  return useMemo(() => {
    if (status !== 'success') {
      return [];
    }
    return mergeRechartsRowsToChartPoints(datasets, TOTAL_CHART_IDS, unit);
  }, [datasets, unit, status]);
}
