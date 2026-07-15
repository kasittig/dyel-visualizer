import type { TaggedSetRecord } from '../tag/tag';
import { calcE1RM, invertE1RM } from './e1rm';
import { isSpeedWork } from './derivers';
import type { AthleteContext } from './athlete';

export interface NormalizationModel {
  fittedAt: number;
  baseline: Record<string, string>;
  variantFactor: Record<string, { factor: number; n: number }>;
  addlWtOffset: Record<string, { offsetKg: number; n: number }>;
}
interface GridPoint {
  t: number;
  v: number;
}

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

const buildSessionGrid = (recs: TaggedSetRecord[]): GridPoint[] => {
  const m = new Map<number, number>();
  recs.forEach((r: TaggedSetRecord) => {
    m.set(r.date, Math.max(m.get(r.date) || 0, calcE1RM(r.weight, r.reps, r.rpe)));
  });
  return [...m.entries()].map(([t, v]): GridPoint => ({ t, v })).sort((a, b) => a.t - b.t);
};

const interpolateGrid = (grid: GridPoint[], tgt: number): number | null => {
  if (!grid.length) {
    return null;
  }
  if (grid.length === 1) {
    return grid[0].v;
  }
  const rate = (i: number, j: number): number => {
    const dt = grid[j].t - grid[i].t;
    return dt ? (grid[j].v - grid[i].v) / dt : 0;
  };
  const first = grid[0],
    last = grid[grid.length - 1];
  if (tgt <= first.t) {
    return Math.max(0, first.v + rate(0, 1) * (tgt - first.t));
  }
  if (tgt >= last.t) {
    return Math.max(0, last.v + rate(grid.length - 2, grid.length - 1) * (tgt - last.t));
  }
  let lo = 0,
    hi = grid.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (grid[mid].t <= tgt) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const a = grid[lo],
    b = grid[hi],
    dt = b.t - a.t;
  return dt ? a.v + (b.v - a.v) * ((tgt - a.t) / dt) : a.v;
};

const fitMetric = (
  grid: GridPoint[],
  recs: TaggedSetRecord[],
  fn: (p: number, r: TaggedSetRecord) => number
): { v: number; n: number } | null => {
  const vals = recs
    .filter((r: TaggedSetRecord) => r.reps > 0)
    .map((r: TaggedSetRecord) => ({ p: interpolateGrid(grid, r.date), r }))
    .filter((x): x is { p: number; r: TaggedSetRecord } => x.p !== null)
    .map((x) => fn(x.p, x.r));
  return vals.length ? { v: mean(vals), n: vals.length } : null;
};

const getTag = (tags: ReadonlySet<string>, pfx: string): string | undefined =>
  [...tags].find((t: string) => t.startsWith(pfx));

const getNonAddlSignature = (tags: ReadonlySet<string>): string =>
  [...tags]
    .filter(
      (t: string) =>
        !t.startsWith('addl:') &&
        !['bar:standard', 'stance:competition'].includes(t) &&
        ['lift:', 'bar:', 'stance:', 'equip:'].some((p: string) => t.startsWith(p))
    )
    .sort()
    .join('|');

export function fitNormalizationModel(
  history: TaggedSetRecord[],
  opts: { minSamples: number },
  athlete: AthleteContext
): NormalizationModel {
  const byCan = Object.groupBy(history, (r: TaggedSetRecord) => r.canonical);
  // Build effort-filtered-with-fallback view: each canonical uses only non-speed-work sets,
  // but falls back to all sets if it has zero effort records
  const byCanFitted = Object.fromEntries(
    Object.entries(byCan).map(([c, recs]) => {
      if (!recs) {
        return [c, recs];
      }
      const effort = recs.filter((r) => !isSpeedWork(r));
      return [c, effort.length ? effort : recs];
    })
  );
  const byFam = new Map<string, string[]>();
  for (const [can, recs] of Object.entries(byCan)) {
    if (!recs) {
      continue;
    }
    const fam = getTag(recs[0]?.tags || new Set<string>(), 'lift:');
    if (fam) {
      byFam.set(fam, [...(byFam.get(fam) || []), can]);
    }
  }

  const baseline: Record<string, string> = {};
  const variantFactor: NormalizationModel['variantFactor'] = {};
  const addlWtOffset: NormalizationModel['addlWtOffset'] = {};

  for (const [family, canonicals] of byFam) {
    const entries = canonicals.map((c: string) => ({ c, r: byCan[c]! }));
    const straightBySig = new Map<string, string>();
    for (const { c, r } of entries) {
      if (!getTag(r[0]?.tags || new Set<string>(), 'addl:')) {
        straightBySig.set(getNonAddlSignature(r[0]?.tags || new Set<string>()), c);
      }
    }

    const compNamed = entries.filter((e) =>
      e.r.some((r: TaggedSetRecord) => /competition/i.test(r.meta?.rawExercise ?? ''))
    );
    const comp = entries.filter((e) => e.r.some((r: TaggedSetRecord) => r.tags.has('comp-lift')));
    const prefStance =
      family === 'lift:deadlift'
        ? athlete.deadliftStance === 'sumo'
          ? 'sumo'
          : 'conventional'
        : null;
    const stancePool = prefStance
      ? entries.filter((e) => e.r.some((r: TaggedSetRecord) => r.tags.has(`stance:${prefStance}`)))
      : [];
    const pausedPool =
      family === 'lift:bench'
        ? entries.filter((e) =>
            e.r.some(
              (r: TaggedSetRecord) =>
                r.tags.has('equip:pause') &&
                !getTag(r.tags, 'bar:') &&
                !getTag(r.tags, 'stance:') &&
                !getTag(r.tags, 'addl:')
            )
          )
        : [];

    const pool = compNamed.length
      ? compNamed
      : stancePool.length
        ? stancePool
        : pausedPool.length
          ? pausedPool
          : comp.length
            ? comp
            : entries;
    const [baseCan] = pool.sort((a, b) => b.r.length - a.r.length || a.c.localeCompare(b.c));
    baseline[family] = baseCan.c;
    const grid = buildSessionGrid(byCanFitted[baseCan.c]!);

    for (const { c, r } of entries) {
      if (c === baseCan.c) {
        continue;
      }
      let offsetKg: number | null = null;
      if (getTag(r[0]?.tags || new Set<string>(), 'addl:')) {
        const straightCan = straightBySig.get(getNonAddlSignature(r[0]?.tags || new Set<string>()));
        if (straightCan) {
          const o = fitMetric(
            buildSessionGrid(byCanFitted[straightCan]!),
            byCanFitted[c]!,
            (p: number, rec: TaggedSetRecord) => invertE1RM(p, rec.reps) - rec.weight
          );
          if (o && o.n >= opts.minSamples) {
            addlWtOffset[c] = { offsetKg: o.v, n: o.n };
            offsetKg = o.v;
          }
        }
      }
      const rFit =
        offsetKg !== null
          ? byCanFitted[c]!.map(
              (rec: TaggedSetRecord): TaggedSetRecord => ({
                ...rec,
                weight: rec.weight + (offsetKg as number),
              })
            )
          : byCanFitted[c]!;
      const f = fitMetric(
        grid,
        rFit,
        (p: number, rec: TaggedSetRecord) => calcE1RM(rec.weight, rec.reps, rec.rpe) / p
      );
      if (f && f.n >= opts.minSamples && f.v !== 0) {
        variantFactor[c] = { factor: f.v, n: f.n };
      }
    }
  }
  return { fittedAt: Date.now(), baseline, variantFactor, addlWtOffset };
}

export function offsetAdjustRecords(
  records: TaggedSetRecord[],
  model: NormalizationModel
): TaggedSetRecord[] {
  return records.map((r: TaggedSetRecord): TaggedSetRecord => {
    const off = model.addlWtOffset[r.canonical]?.offsetKg;
    return off === undefined ? r : { ...r, weight: r.weight + off };
  });
}

const getFactor = (can: string, model: NormalizationModel): number | null =>
  Object.values(model.baseline).includes(can) ? 1 : model.variantFactor[can]?.factor || null;

export const normalizeE1rm = (
  can: string,
  e1rmKg: number,
  model: NormalizationModel
): number | null => {
  const f = getFactor(can, model);
  return f ? e1rmKg / f : null;
};

export const projectToVariant = (
  baseE1rmKg: number,
  targetCan: string,
  model: NormalizationModel
): number | null => {
  const f = getFactor(targetCan, model);
  return f ? Math.max(0, baseE1rmKg * f) : null;
};

export const buildGridFromPoints = (points: { t: number; v: number }[]): GridPoint[] => {
  const m = new Map<number, number>();
  points.forEach((p: { t: number; v: number }) => {
    m.set(p.t, Math.max(m.get(p.t) || 0, p.v));
  });
  return [...m.entries()].map(([t, v]): GridPoint => ({ t, v })).sort((a, b) => a.t - b.t);
};

export const projectE1RMToDate = (
  points: { t: number; v: number }[],
  targetDate: number
): number | null => interpolateGrid(buildGridFromPoints(points), targetDate);
