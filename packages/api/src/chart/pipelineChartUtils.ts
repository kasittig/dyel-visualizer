import type { RechartsRow, ChartPoint } from '@dyel/pipeline';
import { roundWeight } from '../weightUnit';

export function latestLiftE1RMs(data: ChartPoint[]): {
  squat?: number;
  bench?: number;
  deadlift?: number;
  total?: number;
} {
  const result: { squat?: number; bench?: number; deadlift?: number; total?: number } = {};
  for (const p of data) {
    if (p.squat !== undefined) {
      result.squat = p.squat as number;
    }
    if (p.bench !== undefined) {
      result.bench = p.bench as number;
    }
    if (p.deadlift !== undefined) {
      result.deadlift = p.deadlift as number;
    }
    if (p.total !== undefined) {
      result.total = p.total as number;
    }
  }
  return result;
}

export function mergeRechartsRowsToChartPoints(
  datasets: Record<string, RechartsRow[]>,
  ids: string[],
  unit: 'lbs' | 'kg'
): ChartPoint[] {
  const points = new Map<number, ChartPoint & { t: number }>();

  for (const id of ids) {
    for (const row of datasets[id] ?? []) {
      const point = points.get(row.t) ?? { date: new Date(row.t).toISOString(), t: row.t };
      point[id] = roundWeight(row[id], unit);
      points.set(row.t, point);
    }
  }

  return Array.from(points.values())
    .sort((a, b) => a.t - b.t)
    .map(
      ({ t: _t, ...point }) => point as ChartPoint // eslint-disable-line @typescript-eslint/no-unused-vars
    );
}

export function mergeWideRechartsRows(rows: RechartsRow[], unit: 'lbs' | 'kg'): ChartPoint[] {
  return rows
    .map(({ t, ...lifts }) => ({
      date: new Date(t).toISOString(),
      ...Object.fromEntries(Object.entries(lifts).map(([k, v]) => [k, roundWeight(v, unit)])),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function formatChartDate(str: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(str) ? new Date(`${str}T00:00:00`) : new Date(str);
  return isNaN(d.getTime())
    ? str
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

function localDateKey(date: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function mergeVolumeIntoChartPoints(
  chartData: ChartPoint[],
  volumeByDate: Map<string, number>
): ChartPoint[] {
  return chartData.map((point) => {
    const volume = volumeByDate.get(localDateKey(String(point.date)));
    return volume !== undefined ? { ...point, volume: Math.round(volume) } : point;
  });
}
