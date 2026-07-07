import type { Point, TagQuery } from '../types';
import { matches } from '../tag/tag';
import type { NormalizationModel } from '../derive/normalize';
import { normalizeE1rm } from '../derive/normalize';
import type { AthleteContext } from '../derive/athlete';
import { wilks, dots } from '../derive/athlete';

export interface SeriesSpec {
  id: string;
  kind: 'series';
  include: TagQuery;
  derive: string;
  // When 'label', the caller must pass points where p.series holds the raw logged exercise
  // string instead of the canonical slug. This is an intentional, narrow exception to Point.series's
  // normal "canonical id" contract, used only for charts that need per-exact-variant granularity
  // (e.g., ConjugateCharts showing "Bench (1 board)" vs "Bench (2 board)" as distinct lines).
  // Default (omitted) = canonical grouping, preserving existing behavior unchanged.
  groupBy?: 'label';
}
export interface CompositeSpec {
  id: string;
  kind: 'composite';
  components: { label: string; include: TagQuery }[];
  derive: 'e1rm';
  normalize: true;
  combine: 'sum';
  post?: 'wilks' | 'dots';
}
export type DatasetSpec = SeriesSpec | CompositeSpec;
export interface RenderParams {
  chips?: { include: string[]; exclude: string[] };
  dateRange?: [number, number];
}
export interface RechartsRow {
  t: number;
  [column: string]: number;
}

export type ChartPoint = Record<string, string | number>;

const mergeChips = (base: TagQuery, chips?: RenderParams['chips']): TagQuery => ({
  all: [...(base.all ?? []), ...(chips?.include ?? [])],
  any: base.any,
  none: [...(base.none ?? []), ...(chips?.exclude ?? [])],
});

export function buildDataset(
  points: Point[],
  spec: DatasetSpec,
  ui: RenderParams,
  model: NormalizationModel,
  athlete: AthleteContext
): RechartsRow[] {
  let rows: RechartsRow[] = [];

  if (spec.kind === 'series') {
    const q = mergeChips(spec.include, ui.chips);
    const rowMap = new Map<number, RechartsRow>();

    points.forEach((p) => {
      if (matches(new Set([...p.tags, p.series]), q)) {
        rowMap.set(p.t, { ...(rowMap.get(p.t) ?? { t: p.t }), [p.series]: p.v });
      }
    });
    rows = [...rowMap.values()].sort((a, b) => a.t - b.t);
  } else {
    // 1. Generate grids mapping timestamp to maximum normalized e1rm value
    const queries = spec.components.map((c) => mergeChips(c.include, ui.chips));
    const grids = queries.map((q) => {
      const grid = new Map<number, number>();
      points.forEach((p) => {
        if (matches(new Set([...p.tags, p.series]), q)) {
          const val = normalizeE1rm(p.series, p.v, model);
          if (val !== null && val > (grid.get(p.t) ?? -Infinity)) {
            grid.set(p.t, val);
          }
        }
      });
      return grid;
    });

    // 2. Compute composite metrics across the sorted timeline using forward-filled lookups
    const timestamps = [...new Set(grids.flatMap((g) => [...g.keys()]))].sort((a, b) => a - b);
    const lastValues = new Array(grids.length).fill(undefined);

    timestamps.forEach((t) => {
      grids.forEach((grid, idx) => {
        if (grid.has(t)) {
          lastValues[idx] = grid.get(t);
        }
      });
      if (lastValues.every((v) => v !== undefined)) {
        rows.push({ t, [spec.id]: lastValues.reduce((sum, v) => sum + v, 0) });
      }
    });

    // 3. Apply optional post-processing metrics (Wilks or Dots coefficients)
    if (spec.post) {
      const transform = spec.post === 'wilks' ? wilks : dots;
      rows = rows.map((r) => ({ ...r, [spec.id]: transform(r[spec.id], athlete) }));
    }
  }

  // 4. Inline filtering using the date range constraints
  return ui.dateRange
    ? rows.filter((r) => r.t >= ui.dateRange![0] && r.t <= ui.dateRange![1])
    : rows;
}
