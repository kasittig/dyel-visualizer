import type { Point, NormalizationModel } from '@dyel/pipeline';
import { invertE1RM } from '@dyel/pipeline';

export interface E1RMEstimate {
  e1rm: number;
  date: Date;
  sourceName: string;
  method: 'exact' | 'variantFactor';
}

/**
 * Selects the best (max) e1RM point from a canonical's history.
 * Used as the anchor for applying variant factors in the RepCalculator.
 */
export function selectBestE1RMPoint(canonicalPoints: Point[]): { e1rm: number; t: number } | null {
  if (canonicalPoints.length === 0) {
    return null;
  }

  // Select the point with the maximum e1RM value
  const best = canonicalPoints.reduce((acc, point) => {
    return point.v > acc.v ? point : acc;
  });

  return { e1rm: best.v, t: best.t };
}

/**
 * Finds the best e1RM estimate for a target exercise using pipeline's
 * NormalizationModel and baseline e1RM points.
 *
 * Mirrors the logic of @dyel/core's findBestE1RM but operates on
 * pipeline Point[] data instead of SessionStats.
 *
 * @param targetCanonical The target exercise's canonical name
 * @param baselineCanonical The baseline exercise's canonical name
 * @param baselineE1RMPoints The e1RM Point[] for the baseline canonical
 * @param model The fitted NormalizationModel
 * @param baselineSourceName The display name of the baseline (for sourceName in estimate)
 * @param today Fallback date if baseline has no session data
 * @returns E1RMEstimate with the computed e1RM, or null if not computable
 */
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

  // If target is the baseline itself, return exact match
  if (targetCanonical === baselineCanonical) {
    return {
      e1rm: compE1RM,
      date: sourceDate,
      sourceName: baselineSourceName,
      method: 'exact',
    };
  }

  // Look up variant factor for target
  const variantFactorData = model.variantFactor[targetCanonical];
  if (!variantFactorData || variantFactorData.n === 0 || variantFactorData.factor <= 0) {
    return null;
  }

  let e1rm = compE1RM * variantFactorData.factor;

  // Apply addlWt offset if target has additional weight
  const offsetData = model.addlWtOffset[targetCanonical];
  if (offsetData && offsetData.n > 0) {
    // offsetKg is the effective weight of chains/bands; subtract it from the projected e1RM
    e1rm = Math.max(0, e1rm - offsetData.offsetKg);
  }

  return {
    e1rm,
    date: sourceDate,
    sourceName: baselineSourceName,
    method: 'variantFactor',
  };
}

/**
 * Predicts weight for a given rep count based on an e1RM estimate.
 * Uses invertE1RM from @dyel/pipeline.
 */
export function predictWeightForReps(e1rm: number, reps: number): number {
  if (reps <= 0) {
    return 0;
  }
  return invertE1RM(e1rm, reps);
}

/**
 * Predicts rep count for a given weight based on an e1RM estimate.
 */
export function predictRepsForWeight(e1rm: number, weight: number): number {
  if (weight <= 0 || weight >= e1rm) {
    return 1;
  }
  return Math.max(1, 30 * (e1rm / weight - 1));
}
