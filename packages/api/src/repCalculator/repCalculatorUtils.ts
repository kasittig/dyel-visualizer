import type { Point, NormalizationModel } from '@dyel/pipeline';
import { invertE1RM, projectE1RMToDate } from '@dyel/pipeline';
import { convertWeight } from '../weightUnit';

export interface E1RMEstimate {
  e1rm: number;
  date: Date;
  sourceName: string;
  method: 'exact' | 'variantFactor';
}

export function selectBestE1RMPoint(canonicalPoints: Point[]): { e1rm: number; t: number } | null {
  if (!canonicalPoints.length) {
    return null;
  }
  const best = canonicalPoints.reduce((acc, p) => {
    return p.v > acc.v ? p : acc;
  });
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
  if (!baselineSourceName) {
    return null;
  }

  // Compute e1RM via trend projection to today, not flat max
  const compE1RM = projectE1RMToDate(baselineE1RMPoints, today.getTime());
  if (compE1RM === null) {
    return null;
  }

  // sourceDate is the last actual baseline point (most recent), not the highest-value point
  if (!baselineE1RMPoints.length) {
    return null;
  }
  const lastPoint = baselineE1RMPoints.reduce((acc, p) => {
    return p.t > acc.t ? p : acc;
  });
  const sourceDate = new Date(lastPoint.t);

  if (targetCanonical === baselineCanonical) {
    return { e1rm: compE1RM, date: sourceDate, sourceName: baselineSourceName, method: 'exact' };
  }

  const vf = model.variantFactor[targetCanonical];
  if (!vf || vf.n === 0 || vf.factor <= 0) {
    return null;
  }

  let e1rm = compE1RM * vf.factor;
  const offsetData = model.addlWtOffset[targetCanonical];
  if (offsetData && offsetData.n > 0) {
    {
      e1rm = Math.max(0, e1rm - offsetData.offsetKg);
    }
  }

  return { e1rm, date: sourceDate, sourceName: baselineSourceName, method: 'variantFactor' };
}

export function predictWeightForReps(e1rm: number, reps: number): number {
  return reps <= 0 ? 0 : invertE1RM(e1rm, reps);
}

export function predictRepsForWeight(e1rm: number, weight: number): number {
  return weight <= 0 || weight >= e1rm ? 1 : Math.max(1, 30 * (e1rm / weight - 1));
}

// Pipeline output is always kg (see packages/pipeline/src/dataset/CLAUDE.md); display-unit
// conversion is the app's job.
export function convertE1RMToDisplayUnit(e1rmKg: number, unit: 'lbs' | 'kg'): number {
  return convertWeight(e1rmKg, unit);
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
