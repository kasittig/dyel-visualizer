import type { Point, SetRecord } from '../types';
import type { NormalizationModel } from '../derive/normalize';
import type { BaselineRange } from '../tag/detect/canonical';
import { groupBy } from '../groupBy';

export type Quality = string;
export type PerformanceStatus = 'optimal' | 'weakness' | 'overperforming';
export type UnassessedReason = 'missing-lift' | 'missing-factor' | 'missing-baseline';
export interface UnassessedVariant {
  canonical: string;
  displayName: string;
  lift: string | null;
  reason: UnassessedReason;
}
export interface VariantAssessment {
  canonical: string;
  displayName: string;
  lift: string;
  expectedE1rmKg: number;
  actualE1rmKg: number;
  baselineE1rmKg: number;
  expectedFactor: number;
  latestAt: number;
  latestSet: Pick<SetRecord, 'weight' | 'reps' | 'rpe' | 'sets'> | null;
  previousE1rmKg: number | null;
  observationCount: number;
  comparisonCount: number | null;
  ratio: number;
  status: PerformanceStatus | 'stale';
  fittedStatus: PerformanceStatus | null;
  averageIndex: number;
  expectedBaseline: string | null;
  staleDays: number;
  effects: Quality[];
  isCompLift: boolean;
  addlWtOffset?: { offsetKg: number; n: number };
}
export interface DiagnosticsReport {
  variants: VariantAssessment[];
  weaknesses: { quality: Quality; score: number; evidence: string[] }[];
  unassessed: UnassessedVariant[];
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
  baselineRangeByCanonical: ReadonlyMap<string, BaselineRange> = new Map(),
  maxEffortSetByPoint: ReadonlyMap<string, SetRecord> = new Map()
): DiagnosticsReport {
  const timestamp = now ?? Date.now();
  const pointsBySeries = groupBy(points, (p) => p.series);
  const latestBySeries = new Map(Array.from(pointsBySeries, ([s, p]) => [s, latestOf(p)]));

  const variants: VariantAssessment[] = [];
  const unassessed: UnassessedVariant[] = [];
  const votes = new Map<Quality, { score: number; evidence: string[] }>();

  for (const [canonical, latest] of latestBySeries) {
    const observations = pointsBySeries.get(canonical)!;
    let previous: Point | null = null;
    for (const point of observations) {
      if (point.t < latest.t && (!previous || point.t > previous.t)) {
        previous = point;
      }
    }
    const lift = Array.from(latest.tags).find((t) => t.startsWith('lift:'));
    if (!lift || lift === 'lift:accessory') {
      continue;
    }
    const factor = Object.values(model.baseline).includes(canonical)
      ? 1
      : model.variantFactor[canonical]?.factor;
    const baseLatest = latestBySeries.get(model.baseline[lift]);

    if (!factor || !baseLatest) {
      unassessed.push({
        canonical,
        displayName: displayNameByCanonical.get(canonical) ?? canonical,
        lift,
        reason: !factor ? 'missing-factor' : 'missing-baseline',
      });
      continue;
    }

    const addlWt = model.addlWtOffset[canonical];
    const expectedE1rmKg = Math.max(0, factor * baseLatest.v - (addlWt?.offsetKg ?? 0));
    const ratio = latest.v / expectedE1rmKg;
    const averageIndex = factor * 100;
    const range = baselineRangeByCanonical.get(canonical);

    const normalStatus: PerformanceStatus =
      Math.abs(ratio - 1) <= opts.tolerance
        ? 'optimal'
        : ratio < 1 - opts.tolerance
          ? 'weakness'
          : 'overperforming';
    const fittedStatus: PerformanceStatus | null = range
      ? averageIndex < range.min
        ? 'weakness'
        : averageIndex > range.max
          ? 'overperforming'
          : 'optimal'
      : null;

    const status: VariantAssessment['status'] =
      timestamp - latest.t > opts.staleDays * DAY_MS ? 'stale' : normalStatus;
    const v: VariantAssessment = {
      canonical,
      displayName: displayNameByCanonical.get(canonical) ?? canonical,
      lift,
      expectedE1rmKg,
      baselineE1rmKg: baseLatest.v,
      expectedFactor: factor,
      latestAt: latest.t,
      latestSet: maxEffortSetByPoint.get(`${canonical}::${latest.t}`) ?? null,
      previousE1rmKg: previous?.v ?? null,
      observationCount: observations.length,
      comparisonCount: model.variantFactor[canonical]?.n ?? null,
      ratio,
      status,
      fittedStatus,
      averageIndex,
      expectedBaseline: range ? `${range.min}-${range.max}%` : null,
      actualE1rmKg: latest.v,
      staleDays: (timestamp - latest.t) / DAY_MS,
      effects: effectsByCanonical.get(canonical) ?? [],
      isCompLift: latest.tags.has('comp-lift'),
      ...(addlWt && addlWt.n > 0
        ? { addlWtOffset: { offsetKg: addlWt.offsetKg, n: addlWt.n } }
        : {}),
    };
    variants.push(v);

    if (status !== 'optimal' && status !== 'stale') {
      const delta = status === 'weakness' ? 1 : -1;
      v.effects.forEach((q) => {
        const entry = votes.get(q) ?? { score: 0, evidence: [] };
        votes.set(q, { score: entry.score + delta, evidence: [...entry.evidence, canonical] });
      });
    }
  }

  const weaknesses = Array.from(votes)
    .filter(([, v]) => v.score > 0)
    .map(([quality, v]) => ({ quality, ...v }));

  return { variants, weaknesses, unassessed };
}
