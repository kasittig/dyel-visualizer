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
}

export interface CompositeSpec {
  id: string;
  kind: 'composite';
  components: Array<{ label: string; include: TagQuery }>;
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

const pointTags = (p: Point): ReadonlySet<string> => new Set([...p.tags, p.series]);

function mergeChipsIntoQuery(base: TagQuery, chips?: RenderParams['chips']): TagQuery {
  if (!chips) {
    return base;
  }
  return {
    all: [...(base.all ?? []), ...chips.include],
    any: base.any,
    none: [...(base.none ?? []), ...chips.exclude],
  };
}

function buildSeriesRows(points: Point[], spec: SeriesSpec, query: TagQuery): RechartsRow[] {
  const rows = new Map<number, RechartsRow>();

  for (const p of points) {
    if (!matches(pointTags(p), query)) {
      continue;
    }
    // Assumes derive/ already collapsed to one value per (date, canonical);
    // if multiple points share (t, series), last one wins.
    const row = rows.get(p.t) ?? { t: p.t };
    row[p.series] = p.v;
    rows.set(p.t, row);
  }

  return [...rows.values()].sort((a, b) => a.t - b.t);
}

function normalizedComponentGrid(
  points: Point[],
  query: TagQuery,
  model: NormalizationModel
): Map<number, number> {
  const grid = new Map<number, number>();

  for (const p of points) {
    if (!matches(pointTags(p), query)) {
      continue;
    }
    const normalized = normalizeE1rm(p.series, p.v, model);
    if (normalized === null) {
      continue;
    }
    const prev = grid.get(p.t);
    if (prev === undefined || normalized > prev) {
      grid.set(p.t, normalized);
    }
  }

  return grid;
}

function computeCompositeRows(
  points: Point[],
  spec: CompositeSpec,
  mergedQueries: TagQuery[],
  model: NormalizationModel
): RechartsRow[] {
  const grids = mergedQueries.map((q) => normalizedComponentGrid(points, q, model));
  const allDates = [...new Set(grids.flatMap((g) => [...g.keys()]))].sort((a, b) => a - b);

  const last: (number | undefined)[] = grids.map(() => undefined);
  const rows: RechartsRow[] = [];

  for (const date of allDates) {
    grids.forEach((grid, i) => {
      const v = grid.get(date);
      if (v !== undefined) {
        last[i] = v;
      }
    });

    if (last.every((v) => v !== undefined)) {
      const total = last.reduce((sum, v) => sum + v!, 0);
      rows.push({ t: date, [spec.id]: total });
    }
  }

  return rows;
}

function applyPost(
  rows: RechartsRow[],
  spec: CompositeSpec,
  athlete: AthleteContext
): RechartsRow[] {
  if (!spec.post) {
    return rows;
  }
  const transform = spec.post === 'wilks' ? wilks : dots;
  return rows.map((row) => ({ ...row, [spec.id]: transform(row[spec.id], athlete) }));
}

function applyDateRange(rows: RechartsRow[], dateRange?: [number, number]): RechartsRow[] {
  if (!dateRange) {
    return rows;
  }
  const [start, end] = dateRange;
  return rows.filter((row) => row.t >= start && row.t <= end);
}

export function buildDataset(
  points: Point[],
  spec: DatasetSpec,
  ui: RenderParams,
  model: NormalizationModel,
  athlete: AthleteContext
): RechartsRow[] {
  let rows: RechartsRow[];

  if (spec.kind === 'series') {
    const query = mergeChipsIntoQuery(spec.include, ui.chips);
    rows = buildSeriesRows(points, spec, query);
  } else {
    const mergedQueries = spec.components.map((c) => mergeChipsIntoQuery(c.include, ui.chips));
    rows = applyPost(computeCompositeRows(points, spec, mergedQueries, model), spec, athlete);
  }

  return applyDateRange(rows, ui.dateRange);
}
