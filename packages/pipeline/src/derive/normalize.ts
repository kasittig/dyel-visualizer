import type { TaggedSetRecord } from '../tag/tag';
import { calcE1RM, invertE1RM } from './e1rm';

// DESIGN FLAG (issue #429): no `minSamples` default exists anywhere in the legacy codebase
// (packages/core). Callers must pass `opts.minSamples` explicitly; 3 is the recommended
// starting point used in this module's own tests — flag any change for reviewer sign-off.
//
// `addlWtOffset` is keyed by canonical rather than by the raw `addl:*` tag (as the original
// interface comment suggested), so that offsets fitted against different lift families'
// baselines are never pooled together under one key — flagged for reviewer awareness.

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
  const bestByDate = new Map<number, number>();
  for (const r of records) {
    const e1rm = calcE1RM(r.weight, r.reps);
    const prev = bestByDate.get(r.date);
    if (prev === undefined || e1rm > prev) {
      bestByDate.set(r.date, e1rm);
    }
  }
  return [...bestByDate.entries()].map(([t, e1rm]) => ({ t, e1rm })).sort((a, b) => a.t - b.t);
};

const interpolateGrid = (grid: GridPoint[], targetDate: number): number | null => {
  if (grid.length === 0) {
    return null;
  }
  if (grid.length === 1) {
    return grid[0].e1rm;
  }

  const first = grid[0];
  const last = grid[grid.length - 1];

  if (targetDate <= first.t) {
    const next = grid[1];
    const dt = next.t - first.t;
    const rate = dt === 0 ? 0 : (next.e1rm - first.e1rm) / dt;
    return Math.max(0, first.e1rm + rate * (targetDate - first.t));
  }
  if (targetDate >= last.t) {
    const prev = grid[grid.length - 2];
    const dt = last.t - prev.t;
    const rate = dt === 0 ? 0 : (last.e1rm - prev.e1rm) / dt;
    return Math.max(0, last.e1rm + rate * (targetDate - last.t));
  }

  let lo = 0;
  let hi = grid.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (grid[mid].t <= targetDate) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const a = grid[lo];
  const b = grid[hi];
  const dt = b.t - a.t;
  if (dt === 0) {
    return a.e1rm;
  }
  return a.e1rm + (b.e1rm - a.e1rm) * ((targetDate - a.t) / dt);
};

const fitVariantFactorAgainstGrid = (
  grid: GridPoint[],
  variantRecords: TaggedSetRecord[]
): { factor: number; n: number } => {
  const ratios: number[] = [];
  for (const r of variantRecords) {
    if (r.reps <= 0) {
      continue;
    }
    const predicted = interpolateGrid(grid, r.date);
    if (predicted === null || predicted === 0) {
      continue;
    }
    ratios.push(calcE1RM(r.weight, r.reps) / predicted);
  }
  return ratios.length === 0 ? { factor: 0, n: 0 } : { factor: mean(ratios), n: ratios.length };
};

const fitAddlOffsetAgainstGrid = (
  grid: GridPoint[],
  variantRecords: TaggedSetRecord[]
): { offsetKg: number; n: number } => {
  const offsets: number[] = [];
  for (const r of variantRecords) {
    if (r.reps <= 0) {
      continue;
    }
    const predicted = interpolateGrid(grid, r.date);
    if (predicted === null) {
      continue;
    }
    offsets.push(invertE1RM(predicted, r.reps) - r.weight);
  }
  return offsets.length === 0
    ? { offsetKg: 0, n: 0 }
    : { offsetKg: mean(offsets), n: offsets.length };
};

const groupBy = <T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> => {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const arr = map.get(key);
    if (arr) {
      arr.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
};

const liftFamilyTag = (tags: ReadonlySet<string>): string | undefined =>
  [...tags].find((t) => t.startsWith('lift:'));

const hasAddlTag = (tags: ReadonlySet<string>): boolean =>
  [...tags].some((t) => t.startsWith('addl:'));

const pickBaselineCanonical = (
  entries: { canonical: string; records: TaggedSetRecord[] }[]
): string => {
  const compLiftEntries = entries.filter((e) => e.records.some((r) => r.tags.has('comp-lift')));
  const pool = compLiftEntries.length > 0 ? compLiftEntries : entries;
  return [...pool].sort(
    (a, b) => b.records.length - a.records.length || a.canonical.localeCompare(b.canonical)
  )[0].canonical;
};

const isBaselineCanonical = (model: NormalizationModel, canonical: string) =>
  Object.values(model.baseline).includes(canonical);

export function fitNormalizationModel(
  history: TaggedSetRecord[],
  opts: { minSamples: number }
): NormalizationModel {
  const byCanonical = groupBy(history, (r) => r.canonical);
  const byFamily = new Map<string, string[]>();

  for (const [canonical, records] of byCanonical) {
    const family = liftFamilyTag(records[0].tags);
    if (!family) {
      continue;
    }
    const arr = byFamily.get(family);
    if (arr) {
      arr.push(canonical);
    } else {
      byFamily.set(family, [canonical]);
    }
  }

  const baseline: Record<string, string> = {};
  const variantFactor: Record<string, { factor: number; n: number }> = {};
  const addlWtOffset: Record<string, { offsetKg: number; n: number }> = {};

  for (const [family, canonicals] of byFamily) {
    const entries = canonicals.map((c) => ({ canonical: c, records: byCanonical.get(c)! }));
    const baselineCanonical = pickBaselineCanonical(entries);
    baseline[family] = baselineCanonical;

    const grid = buildSessionGrid(byCanonical.get(baselineCanonical)!);

    for (const { canonical, records } of entries) {
      if (canonical === baselineCanonical) {
        continue;
      }

      const { factor, n } = fitVariantFactorAgainstGrid(grid, records);
      if (n >= opts.minSamples) {
        variantFactor[canonical] = { factor, n };
      }

      if (hasAddlTag(records[0].tags)) {
        const { offsetKg, n: offsetN } = fitAddlOffsetAgainstGrid(grid, records);
        if (offsetN >= opts.minSamples) {
          addlWtOffset[canonical] = { offsetKg, n: offsetN };
        }
      }
    }
  }

  return { fittedAt: Date.now(), baseline, variantFactor, addlWtOffset };
}

export function normalizeE1rm(
  canonical: string,
  e1rmKg: number,
  model: NormalizationModel
): number | null {
  if (isBaselineCanonical(model, canonical)) {
    return e1rmKg;
  }
  const entry = model.variantFactor[canonical];
  if (!entry || entry.factor === 0) {
    return null;
  }
  return e1rmKg / entry.factor;
}

export function projectToVariant(
  baselineE1rmKg: number,
  targetCanonical: string,
  model: NormalizationModel
): number | null {
  if (isBaselineCanonical(model, targetCanonical)) {
    return baselineE1rmKg;
  }
  const entry = model.variantFactor[targetCanonical];
  if (!entry || entry.factor === 0) {
    return null;
  }
  return baselineE1rmKg * entry.factor;
}
