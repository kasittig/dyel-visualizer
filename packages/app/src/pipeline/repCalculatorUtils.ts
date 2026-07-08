import type { Point, NormalizationModel } from '@dyel/pipeline';
import { invertE1RM } from '@dyel/pipeline';

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
  model: NormalizationModel,
  baselineSourceName: string
): E1RMEstimate | null {
  if (!baselineSourceName) {
    return null;
  }
  const bestBaseline = selectBestE1RMPoint(baselineE1RMPoints);
  if (!bestBaseline) {
    return null;
  }

  const sourceDate = new Date(bestBaseline.t);
  const compE1RM = bestBaseline.e1rm;

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
