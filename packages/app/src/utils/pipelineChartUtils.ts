import type { RechartsRow } from '@dyel/pipeline';
import type { ChartPoint } from '@dyel/core';

// Pipeline output is always kg (see packages/pipeline/src/dataset/CLAUDE.md); display-unit
// conversion is the app's job, so lbs-displaying callers convert here at the merge boundary.
const KG_TO_LBS = 2.20462262185;

export function mergeRechartsRowsToChartPoints(
  datasets: Record<string, RechartsRow[]>,
  ids: string[],
  unit: 'lbs' | 'kg'
): ChartPoint[] {
  const points = new Map<number, ChartPoint>();

  for (const id of ids) {
    for (const row of datasets[id] ?? []) {
      const point = points.get(row.t) ?? { date: new Date(row.t).toISOString() };
      point[id] = Math.round(unit === 'lbs' ? row[id] * KG_TO_LBS : row[id]);
      points.set(row.t, point);
    }
  }

  return [...points.values()].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export function mergeWideRechartsRows(rows: RechartsRow[], unit: 'lbs' | 'kg'): ChartPoint[] {
  return rows
    .map((row) => {
      const point: ChartPoint = { date: new Date(row.t).toISOString() };
      for (const [key, value] of Object.entries(row)) {
        if (key !== 't') {
          point[key] = Math.round(unit === 'lbs' ? value * KG_TO_LBS : value);
        }
      }
      return point;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
