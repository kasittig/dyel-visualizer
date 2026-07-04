import type { Point } from '../types';
import type { ExerciseTagMap } from '../tag/tag';
import type { NormalizationModel } from '../derive/normalize';

export type Quality = string;

export interface VariantAssessment {
  canonical: string;
  lift: string;
  expectedE1rmKg: number;
  actualE1rmKg: number;
  ratio: number;
  status: 'optimal' | 'weakness' | 'overperforming';
  staleDays: number;
  effects: Quality[];
}

export interface DiagnosticsReport {
  variants: VariantAssessment[];
  weaknesses: Array<{ quality: Quality; score: number; evidence: string[] }>;
  unassessed: string[];
}

const DAY_MS = 86400000;

const getTag = (tags: ReadonlySet<string>, prefix: string) =>
  [...tags].find((t) => t.startsWith(prefix));

const getFactor = (can: string, model: NormalizationModel) =>
  Object.values(model.baseline).includes(can) ? 1 : model.variantFactor[can]?.factor || null;

const latestOf = (points: Point[]) => points.reduce((a, b) => (b.t > a.t ? b : a));

const groupBySeries = (points: Point[]) => {
  const groups = new Map<string, Point[]>();
  points.forEach((p) => groups.set(p.series, [...(groups.get(p.series) || []), p]));
  return groups;
};

export function diagnose(
  points: Point[],
  model: NormalizationModel,
  map: ExerciseTagMap,
  opts: { tolerance: number; staleDays: number }
): DiagnosticsReport {
  const now = Date.now();
  const groups = groupBySeries(points);
  const variants: VariantAssessment[] = [];
  const unassessed: string[] = [];

  for (const [canonical, group] of groups) {
    const latest = latestOf(group);
    const lift = getTag(latest.tags, 'lift:');
    const factor = getFactor(canonical, model);
    const baselineCanonical = lift ? model.baseline[lift] : undefined;
    const baselineLatest = baselineCanonical
      ? groups
          .get(baselineCanonical)
          ?.reduce((a, b) => (!a || b.t > a.t ? b : a), undefined as Point | undefined)
      : undefined;

    if (!lift || !factor || !baselineCanonical || !baselineLatest) {
      unassessed.push(canonical);
      continue;
    }

    if (now - latest.t > opts.staleDays * DAY_MS) {
      unassessed.push(canonical);
      continue;
    }

    const expectedE1rmKg = factor * baselineLatest.v;
    const actualE1rmKg = latest.v;
    const ratio = actualE1rmKg / expectedE1rmKg;
    const status: VariantAssessment['status'] =
      Math.abs(ratio - 1) <= opts.tolerance
        ? 'optimal'
        : ratio < 1 - opts.tolerance
          ? 'weakness'
          : 'overperforming';

    variants.push({
      canonical,
      lift,
      expectedE1rmKg,
      actualE1rmKg,
      ratio,
      status,
      staleDays: (now - latest.t) / DAY_MS,
      effects: map[canonical]?.effects ?? [],
    });
  }

  const votes = new Map<Quality, { score: number; evidence: string[] }>();
  for (const v of variants) {
    if (v.status === 'optimal') {
      continue;
    }
    const delta = v.status === 'weakness' ? 1 : -1;
    for (const quality of v.effects) {
      const entry = votes.get(quality) || { score: 0, evidence: [] };
      entry.score += delta;
      entry.evidence.push(v.canonical);
      votes.set(quality, entry);
    }
  }

  const weaknesses = [...votes.entries()]
    .filter(([, { score }]) => score > 0)
    .map(([quality, { score, evidence }]) => ({ quality, score, evidence }));

  return { variants, weaknesses, unassessed };
}
