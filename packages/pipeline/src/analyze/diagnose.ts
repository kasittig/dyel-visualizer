import type { Point } from '../types';
import type { NormalizationModel } from '../derive/normalize';
import type { BaselineRange } from '../tag/detect/canonical';

export type Quality = string;

export interface VariantAssessment {
  canonical: string;
  displayName: string;
  lift: string;
  expectedE1rmKg: number;
  actualE1rmKg: number;
  ratio: number;
  status: 'optimal' | 'weakness' | 'overperforming' | 'stale';
  /** Fitted variant-factor strength as a %, legacy's `averageIndex`. Only meaningful
   *  (and only drives `status`) when `expectedBaseline` is non-null — see `diagnose()`. */
  averageIndex: number;
  /** Expected baseline %-range string (e.g. "90-95%"), legacy's `expectedBaseline`.
   *  `null` when no modifier-derived range exists for this canonical (falls back to
   *  the flat-tolerance `ratio` comparison for `status` in that case). */
  expectedBaseline: string | null;
  staleDays: number;
  effects: Quality[];
  /** Additional weight offset in lbs with sample count. Only present when the canonical
   *  has a fitted offset with n > 0 (e.g. chains/bands resistance offset). */
  addlWtOffset?: { offsetLbs: number; n: number };
}

export interface DiagnosticsReport {
  variants: VariantAssessment[];
  weaknesses: { quality: Quality; score: number; evidence: string[] }[];
  unassessed: string[];
}

const DAY_MS = 86400000;

const latestOf = (points: Point[]) => points.reduce((a, b) => (b.t > a.t ? b : a));

export function diagnose(
  points: Point[],
  model: NormalizationModel,
  effectsByCanonical: ReadonlyMap<string, string[]>,
  opts: { tolerance: number; staleDays: number },
  now: number | undefined,
  displayNameByCanonical: ReadonlyMap<string, string> = new Map(),
  baselineRangeByCanonical: ReadonlyMap<string, BaselineRange> = new Map()
): DiagnosticsReport {
  now = now ?? Date.now();

  // Group by series and immediately find the latest point per series
  const seriesLatest = Map.groupBy(points, (p) => p.series);
  const latestBySeries = new Map([...seriesLatest].map(([s, p]) => [s, latestOf(p)]));

  const variants: VariantAssessment[] = [];
  const unassessed: string[] = [];
  const votes = new Map<Quality, { score: number; evidence: string[] }>();

  for (const [canonical, latest] of latestBySeries) {
    const lift = [...latest.tags].find((t) => t.startsWith('lift:'));
    const factor = Object.values(model.baseline).includes(canonical)
      ? 1
      : model.variantFactor[canonical]?.factor;
    const baseLatest = lift ? latestBySeries.get(model.baseline[lift]) : null;

    // Unassessable canonicals: no lift tag, no fitted factor, or no baseline data
    if (!lift || !factor || !baseLatest) {
      unassessed.push(canonical);
      continue;
    }

    const expectedE1rmKg = factor * baseLatest.v;
    const ratio = latest.v / expectedE1rmKg;
    const averageIndex = factor * 100;

    // Prefer legacy's range-based classification (fitted variant-factor strength vs. a
    // modifier-derived expected %-range) when a range is available for this canonical;
    // it answers "is this variant structurally over/under-performing", matching
    // generateDiagnostics.ts. Falls back to the flat-tolerance ratio comparison
    // (session-freshness signal) when no range data exists for the canonical (e.g. the
    // baseline itself, or a modifier combination with no pct-bearing entry).
    const range = baselineRangeByCanonical.get(canonical);
    const normalStatus: VariantAssessment['status'] = range
      ? averageIndex < range.min
        ? 'weakness'
        : averageIndex > range.max
          ? 'overperforming'
          : 'optimal'
      : Math.abs(ratio - 1) <= opts.tolerance
        ? 'optimal'
        : ratio < 1 - opts.tolerance
          ? 'weakness'
          : 'overperforming';

    // Staleness takes priority: a stale variant is always marked 'stale', regardless
    // of its underlying range/tolerance classification
    const isStale = now - latest.t > opts.staleDays * DAY_MS;
    const status: VariantAssessment['status'] = isStale ? 'stale' : normalStatus;

    const addlWt = model.addlWtOffset[canonical];
    const v: VariantAssessment = {
      canonical,
      displayName: displayNameByCanonical.get(canonical) ?? canonical,
      lift,
      expectedE1rmKg,
      ratio,
      status,
      averageIndex,
      expectedBaseline: range ? `${range.min}-${range.max}%` : null,
      actualE1rmKg: latest.v,
      staleDays: (now - latest.t) / DAY_MS,
      effects: effectsByCanonical.get(canonical) ?? [],
      ...(addlWt && addlWt.n > 0
        ? { addlWtOffset: { offsetLbs: addlWt.offsetKg * 2.20462262185, n: addlWt.n } }
        : {}),
    };
    variants.push(v);

    // Vote tallying combined directly into the main loop. Stale variants don't contribute
    // since their data reliability is questionable.
    if (status !== 'optimal' && status !== 'stale') {
      const delta = status === 'weakness' ? 1 : -1;
      v.effects.forEach((q) => {
        const entry = votes.get(q) ?? { score: 0, evidence: [] };
        votes.set(q, { score: entry.score + delta, evidence: [...entry.evidence, canonical] });
      });
    }
  }

  const weaknesses = [...votes]
    .filter(([, v]) => v.score > 0)
    .map(([quality, v]) => ({ quality, ...v }));

  return { variants, weaknesses, unassessed };
}
