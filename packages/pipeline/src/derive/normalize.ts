import type { TaggedSetRecord } from '../tag/tag';
import { calcE1RM, invertE1RM } from './e1rm';
import type { AthleteContext } from './athlete';

// DESIGN FLAG (issue #429): no `minSamples` default exists anywhere in the legacy codebase
// (packages/core). Callers must pass `opts.minSamples` explicitly; 3 is the recommended
// starting point used in this module's own tests — flag any change for reviewer sign-off.

export interface NormalizationModel {
  fittedAt: number;
  baseline: Record<string, string>;
  variantFactor: Record<string, { factor: number; n: number }>;
  addlWtOffset: Record<string, { offsetKg: number; n: number }>;
}

interface GridPoint {
  t: number;
  e1rm: number;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

const buildSessionGrid = (records: TaggedSetRecord[]): GridPoint[] => {
  const map = new Map<number, number>();
  records.forEach((r) =>
    map.set(r.date, Math.max(map.get(r.date) || 0, calcE1RM(r.weight, r.reps, r.rpe)))
  );
  return [...map.entries()].map(([t, e1rm]) => ({ t, e1rm })).sort((a, b) => a.t - b.t);
};

const interpolateGrid = (grid: GridPoint[], target: number): number | null => {
  if (!grid.length) {
    return null;
  }
  if (grid.length === 1) {
    return grid[0].e1rm;
  }
  const edgeRate = (i: number, j: number) => {
    const dt = grid[j].t - grid[i].t;
    return dt ? (grid[j].e1rm - grid[i].e1rm) / dt : 0;
  };

  const first = grid[0],
    last = grid[grid.length - 1];
  if (target <= first.t) {
    return Math.max(0, first.e1rm + edgeRate(0, 1) * (target - first.t));
  }
  if (target >= last.t) {
    return Math.max(0, last.e1rm + edgeRate(grid.length - 2, grid.length - 1) * (target - last.t));
  }

  let lo = 0,
    hi = grid.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (grid[mid].t <= target) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const a = grid[lo],
    b = grid[hi],
    dt = b.t - a.t;
  return dt ? a.e1rm + (b.e1rm - a.e1rm) * ((target - a.t) / dt) : a.e1rm;
};

const fitMetric = (
  grid: GridPoint[],
  records: TaggedSetRecord[],
  fn: (p: number, r: TaggedSetRecord) => number
) => {
  const vals = records
    .filter((r) => r.reps > 0)
    .map((r) => ({ p: interpolateGrid(grid, r.date), r }))
    .filter(({ p }) => p !== null)
    .map(({ p, r }) => fn(p!, r));
  return vals.length ? { v: mean(vals), n: vals.length } : null;
};

const getTag = (tags: ReadonlySet<string>, prefix: string) =>
  [...tags].find((t) => t.startsWith(prefix));

export function fitNormalizationModel(
  history: TaggedSetRecord[],
  opts: { minSamples: number },
  athlete: AthleteContext
): NormalizationModel {
  const byCanonical = Object.groupBy(history, (r) => r.canonical);
  const byFamily = new Map<string, string[]>();

  for (const [can, recs] of Object.entries(byCanonical)) {
    if (!recs) {
      continue;
    }
    const fam = getTag(recs[0]?.tags || new Set(), 'lift:');
    if (fam) {
      byFamily.set(fam, [...(byFamily.get(fam) || []), can]);
    }
  }

  const baseline: Record<string, string> = {},
    variantFactor: NormalizationModel['variantFactor'] = {},
    addlWtOffset: NormalizationModel['addlWtOffset'] = {};

  for (const [family, canonicals] of byFamily) {
    const entries = canonicals.map((c) => ({ c, r: byCanonical[c]! }));
    // A logged name containing "competition" (e.g. "Competition Bench") is a stronger
    // signal of the true competition lift than the bare comp-lift tag alone — some logs
    // use the bare name for other work (e.g. speed/rep-effort days) and reserve
    // "Competition X" for the real thing.
    const competitionNamed = entries.filter((e) =>
      e.r.some((r) => /competition/i.test(r.meta?.rawExercise ?? ''))
    );
    const comp = entries.filter((e) => e.r.some((r) => r.tags.has('comp-lift')));
    const preferredStance =
      family === 'lift:deadlift'
        ? athlete.deadliftStance === 'sumo'
          ? 'sumo'
          : 'conventional'
        : null;
    const stancePool = preferredStance
      ? entries.filter((e) => e.r.some((r) => r.tags.has(`stance:${preferredStance}`)))
      : [];
    // A paused/"commands" bench (equip:pause, otherwise competition-shaped — no bar/stance/
    // addlWt deviation) is a truer competition lift than a plain no-equipment bench, mirroring
    // legacy's defaultCompExerciseName commandsBench preference. Only applies to lift:bench;
    // pausedPool is always empty for other families by construction.
    const pausedPool =
      family === 'lift:bench'
        ? entries.filter((e) =>
            e.r.some(
              (r) =>
                r.tags.has('equip:pause') &&
                !getTag(r.tags, 'bar:') &&
                !getTag(r.tags, 'stance:') &&
                !getTag(r.tags, 'addl:')
            )
          )
        : [];
    const pool = competitionNamed.length
      ? competitionNamed
      : stancePool.length
        ? stancePool
        : pausedPool.length
          ? pausedPool
          : comp.length
            ? comp
            : entries;
    const [baseCan] = pool.sort((a, b) => b.r.length - a.r.length || a.c.localeCompare(b.c));

    baseline[family] = baseCan.c;
    const grid = buildSessionGrid(byCanonical[baseCan.c]!);

    for (const { c, r } of entries) {
      if (c === baseCan.c) {
        continue;
      }

      // Task 10a: For addlWt canonicals, fit offset first, then offset-adjust weights before fitting variantFactor
      const hasAddlWt = getTag(r[0]?.tags || new Set(), 'addl:');
      let offsetKg: number | null = null;

      if (hasAddlWt) {
        const o = fitMetric(grid, r, (p, rec) => invertE1RM(p, rec.reps) - rec.weight);
        if (o && o.n >= opts.minSamples) {
          addlWtOffset[c] = { offsetKg: o.v, n: o.n };
          offsetKg = o.v;
        }
      }

      // Fit variantFactor on offset-adjusted records if offset was fit, otherwise on raw records
      const recordsToFit =
        offsetKg !== null ? r.map((rec) => ({ ...rec, weight: rec.weight + offsetKg })) : r;
      const f = fitMetric(
        grid,
        recordsToFit,
        (p, rec) => calcE1RM(rec.weight, rec.reps, rec.rpe) / p
      );
      if (f && f.n >= opts.minSamples && f.v !== 0) {
        variantFactor[c] = { factor: f.v, n: f.n };
      }
    }
  }

  return { fittedAt: Date.now(), baseline, variantFactor, addlWtOffset };
}

// Design C: applies each addlWt canonical's fitted weight-space offset to its records'
// raw `weight` field, mirroring legacy's normalizeToBaseE1RM (the actual TotalChart/
// ConjugateCharts data path — NOT findBestE1RM's e1RM-space approximation, which Task 10b
// tried to mirror instead). Records for canonicals with no fitted offset (including the
// baseline canonical itself, and all non-addlWt canonicals) pass through unchanged. Used
// both at fit time (fitNormalizationModel, to keep variantFactor fitted on offset-adjusted
// weights) and pre-derivation (pipeline.ts, so composite-spec e1RM values are derived from
// already-corrected raw weights).
export function offsetAdjustRecords(
  records: TaggedSetRecord[],
  model: NormalizationModel
): TaggedSetRecord[] {
  return records.map((r) => {
    const off = model.addlWtOffset[r.canonical]?.offsetKg;
    return off === undefined ? r : { ...r, weight: r.weight + off };
  });
}

const getFactor = (can: string, model: NormalizationModel) =>
  Object.values(model.baseline).includes(can) ? 1 : model.variantFactor[can]?.factor || null;

// Design C supersedes Task 10b: addlWt weight-space correction now happens upstream
// (pipeline.ts, pre-derivation, composite specs only, via offsetAdjustRecords), so this
// is a pure factor operation again.
export const normalizeE1rm = (can: string, e1rmKg: number, model: NormalizationModel) => {
  const f = getFactor(can, model);
  return f ? e1rmKg / f : null;
};

// Design C supersedes Task 10b: addlWt weight-space correction now happens upstream,
// so this is a pure factor operation again. Note: projectToVariant has no principled way
// to reintroduce a target's offset post-hoc now (offset is inherently a raw-weight/per-set
// concept) — this is a known, pre-existing approximation limitation, not a new regression.
// Currently has zero production callers; only tests and index.ts re-export reference it.
export const projectToVariant = (
  baseE1rmKg: number,
  targetCan: string,
  model: NormalizationModel
) => {
  const f = getFactor(targetCan, model);
  return f ? Math.max(0, baseE1rmKg * f) : null;
};
