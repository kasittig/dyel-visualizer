import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import type { ChartPoint } from '@dyel/api';
import { usePipelineModel } from '../../app/PipelineContext';
import { usePipelineDatasets } from './usePipelineDatasets';
import {
  TOTAL_CHART_SPECS,
  mergeRechartsRowsToChartPoints,
  dateRangeToRenderParams,
} from '@dyel/api';

const TOTAL_CHART_IDS = ['squat', 'bench', 'deadlift', 'pushPull', 'total'];

export function usePipelineTotalChartData(dateRange: DateRange, unit: 'lbs' | 'kg'): ChartPoint[] {
  const { status } = usePipelineModel();
  const ui = useMemo(
    () => dateRangeToRenderParams(dateRange?.from, dateRange?.to),
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
