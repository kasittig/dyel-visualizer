import type { Point, ChartPoint, NormalizationModel } from '@dyel/pipeline';
import { normalizeE1rm } from '@dyel/pipeline';
import { mergeRechartsRowsToChartPoints } from './pipelineChartUtils';

export interface TeamHistoryChartData {
  lifters: string[];
  data: ChartPoint[];
}

export const NORMALIZED_KEY_SUFFIX = '::normalized';

export function normalizeTeamHistoryPoints(
  points: Point[],
  canonical: string,
  model: NormalizationModel
): Point[] {
  return points.flatMap((p) => {
    const normalizedKg = normalizeE1rm(canonical, p.v, model);
    return normalizedKg === null ? [] : [{ ...p, v: normalizedKg }];
  });
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
  unit: 'lbs' | 'kg',
  normalizedPointsByLifter?: Map<string, Point[]>
): TeamHistoryChartData {
  const lifters = [...pointsByLifter.entries()]
    .filter(([, pts]) => pts.length > 0)
    .map(([name]) => name)
    .sort();

  const datasets: Record<string, { t: number; [key: string]: number }[]> = {};
  const seriesKeys: string[] = [...lifters];
  for (const name of lifters) {
    datasets[name] = pointsByLifter.get(name)!.map((p) => ({ t: p.t, [name]: p.v }));
  }
  for (const [name, pts] of normalizedPointsByLifter ?? []) {
    if (!pts.length) {
      continue;
    }
    const key = `${name}${NORMALIZED_KEY_SUFFIX}`;
    datasets[key] = pts.map((p) => ({ t: p.t, [key]: p.v }));
    seriesKeys.push(key);
  }

  return { lifters, data: mergeRechartsRowsToChartPoints(datasets, seriesKeys, unit) };
}
