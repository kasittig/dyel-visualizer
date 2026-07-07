import type { ChartPoint } from '@dyel/core';

/**
 * One joined row: the same local calendar date as seen by two independently-produced
 * `ChartPoint[]` arrays (e.g. a legacy `@dyel/core` run and a `@dyel/pipeline` run over
 * the same fixture). Either side may be missing a point for a given date.
 */
export interface JoinedChartPoint {
  dateKey: string; // local YYYY-MM-DD
  a?: ChartPoint;
  b?: ChartPoint;
}

/**
 * Statistics comparing one named series across two joined `ChartPoint[]` arrays.
 * Used for live core-vs-pipeline diffing (as opposed to `compareChartSeries`, which
 * summarizes a single series from a single array).
 */
export interface SeriesDiff {
  seriesName: string;
  comparedCount: number; // dates where both sides have a numeric value for this series
  missingInA: number; // dates where b has the series but a does not
  missingInB: number; // dates where a has the series but b does not
  maxAbsDiff: number;
  maxRelDiff: number; // |a - b| / max(|a|, |b|), 0 when both are 0
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
 * Joins two `ChartPoint[]` arrays by local calendar date so series values can be diffed
 * directly, even when the two sources key their `date` fields differently (e.g. a local
 * date string vs. a UTC ISO instant string).
 */
export function joinChartPointsByDate(a: ChartPoint[], b: ChartPoint[]): JoinedChartPoint[] {
  const byKey = new Map<string, JoinedChartPoint>();

  for (const point of a) {
    const dateKey = localDateKey(String(point.date));
    const existing = byKey.get(dateKey);
    if (existing) {
      existing.a = point;
    } else {
      byKey.set(dateKey, { dateKey, a: point });
    }
  }

  for (const point of b) {
    const dateKey = localDateKey(String(point.date));
    const existing = byKey.get(dateKey);
    if (existing) {
      existing.b = point;
    } else {
      byKey.set(dateKey, { dateKey, b: point });
    }
  }

  return [...byKey.values()].sort((x, y) => x.dateKey.localeCompare(y.dateKey));
}

/**
 * Diffs a single named series across a joined point set produced by `joinChartPointsByDate`.
 * Single-pass: tallies comparison and gap counts together rather than filtering/mapping/
 * reducing separately.
 */
export function diffSeries(joined: JoinedChartPoint[], seriesName: string): SeriesDiff {
  let comparedCount = 0;
  let missingInA = 0;
  let missingInB = 0;
  let maxAbsDiff = 0;
  let maxRelDiff = 0;

  for (const { a, b } of joined) {
    const aVal = a?.[seriesName];
    const bVal = b?.[seriesName];
    const hasA = typeof aVal === 'number';
    const hasB = typeof bVal === 'number';

    if (hasA && hasB) {
      comparedCount++;
      const absDiff = Math.abs(aVal - bVal);
      const denom = Math.max(Math.abs(aVal), Math.abs(bVal));
      const relDiff = denom === 0 ? 0 : absDiff / denom;
      if (absDiff > maxAbsDiff) {
        maxAbsDiff = absDiff;
      }
      if (relDiff > maxRelDiff) {
        maxRelDiff = relDiff;
      }
    } else if (hasA && !hasB) {
      missingInB++;
    } else if (hasB && !hasA) {
      missingInA++;
    }
  }

  return { seriesName, comparedCount, missingInA, missingInB, maxAbsDiff, maxRelDiff };
}
