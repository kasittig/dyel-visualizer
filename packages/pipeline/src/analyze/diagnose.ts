import type { Point } from '../types';
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
  weaknesses: { quality: Quality; score: number; evidence: string[] }[];
  unassessed: string[];
}

const DAY_MS = 86400000;

const latestOf = (points: Point[]) => points.reduce((a, b) => (b.t > a.t ? b : a));

export function diagnose(
  points: Point[],
  model: NormalizationModel,
  effectsByCanonical: ReadonlyMap<string, string[]>,
  opts: { tolerance: number; staleDays: number }
): DiagnosticsReport {
  const now = Date.now();

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

    if (!lift || !factor || !baseLatest || now - latest.t > opts.staleDays * DAY_MS) {
      unassessed.push(canonical);
      continue;
    }

    const expectedE1rmKg = factor * baseLatest.v;
    const ratio = latest.v / expectedE1rmKg;

    const status: VariantAssessment['status'] =
      Math.abs(ratio - 1) <= opts.tolerance
        ? 'optimal'
        : ratio < 1 - opts.tolerance
          ? 'weakness'
          : 'overperforming';

    const v: VariantAssessment = {
      canonical,
      lift,
      expectedE1rmKg,
      ratio,
      status,
      actualE1rmKg: latest.v,
      staleDays: (now - latest.t) / DAY_MS,
      effects: effectsByCanonical.get(canonical) ?? [],
    };
    variants.push(v);

    // Vote tallying combined directly into the main loop
    if (status !== 'optimal') {
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
