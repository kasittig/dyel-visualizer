import type { Point, NormalizationModel } from '@dyel/pipeline';
import { invertE1RM, projectE1RMToDate } from '@dyel/pipeline';
import { convertWeight } from '../weightUnit';

export interface E1RMEstimate {
  e1rm: number;
  date: Date;
  sourceName: string;
  method: 'exact' | 'variantFactor' | 'familyMostRecent';
  daysForward: number;
}

export function selectBestE1RMPoint(canonicalPoints: Point[]): { e1rm: number; t: number } | null {
  if (!canonicalPoints.length) {
    return null;
  }
  const best = canonicalPoints.reduce((acc, p) => (p.v > acc.v ? p : acc));
  return { e1rm: best.v, t: best.t };
}

export function findBestE1RMFromPipeline(
  targetCanonical: string,
  baselineCanonical: string,
  baselineE1RMPoints: Point[],
  today: Date,
  model: NormalizationModel,
  baselineSourceName: string
): E1RMEstimate | null {
  if (!baselineSourceName || !baselineE1RMPoints.length) {
    return null;
  }
  const compE1RM = projectE1RMToDate(baselineE1RMPoints, today.getTime());
  if (compE1RM === null) {
    return null;
  }

  const lastPoint = baselineE1RMPoints.reduce((acc, p) => (p.t > acc.t ? p : acc));
  const sourceDate = new Date(lastPoint.t);
  const daysForward = Math.max(
    0,
    Math.round((today.getTime() - sourceDate.getTime()) / 86_400_000)
  );

  if (targetCanonical === baselineCanonical) {
    return {
      e1rm: compE1RM,
      date: sourceDate,
      sourceName: baselineSourceName,
      method: 'exact',
      daysForward,
    };
  }

  const vf = model.variantFactor[targetCanonical];
  if (!vf || vf.n === 0 || vf.factor <= 0) {
    return null;
  }

  let e1rm = compE1RM * vf.factor;
  const offsetData = model.addlWtOffset[targetCanonical];
  if (offsetData && offsetData.n > 0) {
    e1rm = Math.max(0, e1rm - offsetData.offsetKg);
  }

  return {
    e1rm,
    date: sourceDate,
    sourceName: baselineSourceName,
    method: 'variantFactor',
    daysForward,
  };
}

export function findMostRecentFamilyE1RM(
  targetCanonical: string,
  baselineCanonical: string,
  familyE1RMPoints: Point[],
  today: Date,
  model: NormalizationModel
): E1RMEstimate | null {
  if (!familyE1RMPoints.length) {
    return null;
  }

  // Group by series (canonical) and find the one with the most recent point
  const byCanonical = Map.groupBy(familyE1RMPoints, (p) => p.series);
  let mostRecentCanonical: string | null = null;
  let maxT = -Infinity;

  for (const [canonical, points] of byCanonical) {
    const latest = points.reduce((acc, p) => (p.t > acc.t ? p : acc));
    if (latest.t > maxT) {
      maxT = latest.t;
      mostRecentCanonical = canonical;
    }
  }

  if (!mostRecentCanonical) {
    return null;
  }

  const sourcePoints = byCanonical.get(mostRecentCanonical)!;
  const projectedE1RM = projectE1RMToDate(sourcePoints, today.getTime());
  if (projectedE1RM === null) {
    return null;
  }

  const lastPoint = sourcePoints.reduce((acc, p) => (p.t > acc.t ? p : acc));
  const sourceDate = new Date(lastPoint.t);
  const daysForward = Math.max(
    0,
    Math.round((today.getTime() - sourceDate.getTime()) / 86_400_000)
  );

  // If source canonical equals target canonical, return directly
  if (mostRecentCanonical === targetCanonical) {
    return {
      e1rm: projectedE1RM,
      date: sourceDate,
      sourceName: mostRecentCanonical,
      method: 'exact',
      daysForward,
    };
  }

  // Two-hop conversion: source → baseline → target
  // First, convert from source space to baseline space
  let baselineE1RM = projectedE1RM;
  if (mostRecentCanonical !== baselineCanonical) {
    const sourceVF = model.variantFactor[mostRecentCanonical];
    if (!sourceVF || sourceVF.n === 0 || sourceVF.factor <= 0) {
      return null;
    }
    // Reverse the variant factor and offset: baseline = (source + offset) / factor
    const sourceOffset = model.addlWtOffset[mostRecentCanonical];
    baselineE1RM =
      sourceOffset && sourceOffset.n > 0
        ? (projectedE1RM + sourceOffset.offsetKg) / sourceVF.factor
        : projectedE1RM / sourceVF.factor;
  }

  // Then, convert from baseline space to target space
  const targetVF = model.variantFactor[targetCanonical];
  if (!targetVF || targetVF.n === 0 || targetVF.factor <= 0) {
    return null;
  }

  let e1rm = baselineE1RM * targetVF.factor;
  const targetOffset = model.addlWtOffset[targetCanonical];
  if (targetOffset && targetOffset.n > 0) {
    e1rm = Math.max(0, e1rm - targetOffset.offsetKg);
  }

  return {
    e1rm,
    date: sourceDate,
    sourceName: mostRecentCanonical,
    method: 'familyMostRecent',
    daysForward,
  };
}

export function predictWeightForReps(e1rm: number, reps: number): number {
  return reps <= 0 ? 0 : invertE1RM(e1rm, reps);
}

export function predictRepsForWeight(e1rm: number, weight: number): number {
  return weight <= 0 || weight >= e1rm ? 1 : Math.floor(Math.max(1, 30 * (e1rm / weight - 1)));
}

export function convertE1RMToDisplayUnit(e1rmKg: number, unit: 'lbs' | 'kg'): number {
  return convertWeight(e1rmKg, unit);
}

export function roundTo5(n: number): number {
  return Math.round(n / 5) * 5;
}

export function resolveE1RMEstimate(params: {
  liftType: string;
  targetCanonical: string;
  baselineName: string | null | undefined;
  today: Date;
  model: NormalizationModel;
  e1rmPoints: Point[];
}): E1RMEstimate | null {
  const baselineCanonical = params.model.baseline[`lift:${params.liftType}`];
  if (!baselineCanonical) {
    return null;
  }
  const baselinePoints = params.e1rmPoints.filter((p) => p.series === baselineCanonical);
  if (baselinePoints.length === 0) {
    return null;
  }
  return findBestE1RMFromPipeline(
    params.targetCanonical,
    baselineCanonical,
    baselinePoints,
    params.today,
    params.model,
    params.baselineName ?? baselineCanonical
  );
}

export function formatE1RMSourceLabel(estimate: E1RMEstimate | null): string | null {
  if (!estimate) {
    return null;
  }
  const base =
    estimate.method === 'exact'
      ? `Based on ${estimate.sourceName} · ${estimate.date.toLocaleDateString()}`
      : `Projected from ${estimate.sourceName} - ${estimate.date.toLocaleDateString()}`;
  return estimate.daysForward > 0
    ? `${base} (${estimate.daysForward} day${estimate.daysForward === 1 ? '' : 's'} ago)`
    : base;
}
