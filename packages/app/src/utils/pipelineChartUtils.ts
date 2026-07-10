import type { RechartsRow, ChartPoint } from '@dyel/pipeline';
import { roundWeight } from './weightUnit';

// Pipeline output is always kg (see packages/pipeline/src/dataset/CLAUDE.md); display-unit
// conversion is the app's job, so lbs-displaying callers convert here at the merge boundary.

export function mergeRechartsRowsToChartPoints(
  datasets: Record<string, RechartsRow[]>,
  ids: string[],
  unit: 'lbs' | 'kg'
): ChartPoint[] {
  const points = new Map<number, ChartPoint>();

  for (const id of ids) {
    for (const row of datasets[id] ?? []) {
      const point = points.get(row.t) ?? { date: new Date(row.t).toISOString() };
      point[id] = roundWeight(row[id], unit);
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
          point[key] = roundWeight(value, unit);
        }
      }
      return point;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/** Formats a date string for chart axis ticks; falls back to the raw string if unparseable. */
export function formatChartDate(str: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(str) ? new Date(str + 'T00:00:00') : new Date(str);
  return isNaN(d.getTime())
    ? str
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

/** Local (not UTC) YYYY-MM-DD key for a `ChartPoint.date` string, for cross-timezone-safe joins. */
function localDateKey(date: string): string {
  // Bare YYYY-MM-DD date strings are already local calendar keys; no need to round-trip through
  // new Date() (which parses them as UTC midnight, causing off-by-one in negative-offset timezones).
  const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.exec(date);
  if (dateOnlyMatch) {
    return date;
  }

  // Full datetime/instant strings: extract local date components.
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Merges volume data from `volumeByDate` into `chartData` by matching local calendar dates.
 * For each point in chartData, looks up its date in volumeByDate and adds a `volume` key if found.
 * Points with no matching volume entry have the `volume` key omitted (not set to undefined).
 */
export function mergeVolumeIntoChartPoints(
  chartData: ChartPoint[],
  volumeByDate: Map<string, number>
): ChartPoint[] {
  return chartData.map((point) => {
    const dateKey = localDateKey(String(point.date));
    const volume = volumeByDate.get(dateKey);
    if (volume !== undefined) {
      return { ...point, volume };
    }
    return point;
  });
}
