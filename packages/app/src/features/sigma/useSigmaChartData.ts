import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import type { ChartPoint } from '@dyel/api';
import { mergeVolumeIntoChartPoints } from '@dyel/api';
import { usePipelineTotalChartData } from './usePipelineTotalChartData';

export function useSigmaChartData(
  dateRange: DateRange,
  unit: 'lbs' | 'kg',
  volumeByDate: Map<string, number>
): ChartPoint[] {
  const chartData = usePipelineTotalChartData(dateRange, unit);
  return useMemo(() => {
    return mergeVolumeIntoChartPoints(chartData, volumeByDate);
  }, [chartData, volumeByDate]);
}
