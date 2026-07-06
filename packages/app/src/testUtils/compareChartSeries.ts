import type { ChartPoint } from '@dyel/core';

/**
 * Statistics about a filtered series from chart data.
 * Used for parity testing and assertion composition across multiple series.
 */
export interface SeriesComparison {
  seriesName: string;
  pointsWithSeries: ChartPoint[];
  count: number;
  values: number[];
  min: number;
  max: number;
  range: number; // max - min
  ratio: number; // max / min, or 0 if empty, or 1 if single value
}

/**
 * Extract and analyze a single series from chart data.
 *
 * Filters data to points containing the series, collects numeric values,
 * and computes min/max/range/ratio statistics for assertion composition.
 *
 * @param data - array of chart points
 * @param seriesName - property name to filter and extract (e.g. 'squat', 'bench')
 * @returns statistics about the filtered series
 */
export function compareChartSeries(data: ChartPoint[], seriesName: string): SeriesComparison {
  const pointsWithSeries = data.filter((p) => seriesName in p && p[seriesName] !== undefined);
  const values = pointsWithSeries
    .map((p) => p[seriesName])
    .filter((v): v is number => typeof v === 'number');

  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  const range = max - min;
  const ratio = values.length > 1 ? max / min : values.length === 1 ? 1 : 0;

  return {
    seriesName,
    pointsWithSeries,
    count: pointsWithSeries.length,
    values,
    min,
    max,
    range,
    ratio,
  };
}
