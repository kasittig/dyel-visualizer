import type { Point, ChartPoint } from '@dyel/pipeline';
import { mergeRechartsRowsToChartPoints } from './pipelineChartUtils';

export interface TeamHistoryChartData {
  lifters: string[];
  data: ChartPoint[];
}

/**
 * Builds one ChartPoint[] series-per-lifter from each lifter's e1RM Point[] history
 * (already filtered to that lifter's effective canonical exercise by the caller), for the
 * team-view "history across lifters" chart. Lifters with no points for the selected
 * exercise are simply omitted, mirroring how conjugate chart "variations" only include
 * labels with real data.
 */
export function buildTeamHistoryChartData(
  pointsByLifter: Map<string, Point[]>,
  unit: 'lbs' | 'kg'
): TeamHistoryChartData {
  const lifters = [...pointsByLifter.entries()]
    .filter(([, pts]) => pts.length > 0)
    .map(([name]) => name)
    .sort();

  const datasets: Record<string, { t: number; [key: string]: number }[]> = {};
  for (const name of lifters) {
    datasets[name] = pointsByLifter.get(name)!.map((p) => ({ t: p.t, [name]: p.v }));
  }

  return { lifters, data: mergeRechartsRowsToChartPoints(datasets, lifters, unit) };
}
