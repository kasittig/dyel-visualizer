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
  groupBy?: 'label';
  normalize?: true;
}
export interface CompositeSpec {
  id: string;
  kind: 'composite';
  components: { label: string; include: TagQuery }[];
  derive: string;
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
  const scoped = ui.dateRange
    ? points.filter((p) => p.t >= ui.dateRange![0] && p.t <= ui.dateRange![1])
    : points;

  if (spec.kind === 'series') {
    const q = mergeChips(spec.include, ui.chips);
    const rowMap = new Map<number, RechartsRow>();

    for (const p of scoped) {
      if (matches(new Set([...p.tags, p.series]), q)) {
        rowMap.set(p.t, { ...(rowMap.get(p.t) ?? { t: p.t }), [p.series]: p.v });
      }
    }
    rows = Array.from(rowMap.values()).sort((a, b) => a.t - b.t);
  } else {
    const grids = spec.components.map((c) => {
      const q = mergeChips(c.include, ui.chips);
      const grid = new Map<number, number>();

      for (const p of scoped) {
        if (matches(new Set([...p.tags, p.series]), q)) {
          const val = normalizeE1rm(p.series, p.v, model);
          if (val !== null && val > (grid.get(p.t) ?? -Infinity)) {
            grid.set(p.t, val);
          }
        }
      }
      return grid;
    });

    const timestamps = Array.from(new Set(grids.flatMap((g) => Array.from(g.keys())))).sort(
      (a, b) => a - b
    );
    const lastValues = new Array(grids.length).fill(undefined);

    for (const t of timestamps) {
      grids.forEach((grid, idx) => {
        if (grid.has(t)) {
          lastValues[idx] = grid.get(t);
        }
      });
      if (lastValues.every((v) => v !== undefined)) {
        rows.push({ t, [spec.id]: lastValues.reduce((sum, v) => sum + v, 0) });
      }
    }

    if (spec.post) {
      const transform = spec.post === 'wilks' ? wilks : dots;
      rows = rows.map((r) => ({ ...r, [spec.id]: transform(r[spec.id], athlete) }));
    }
  }
  return rows;
}
