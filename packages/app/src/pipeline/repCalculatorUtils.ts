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

// Pipeline output is always kg (see packages/pipeline/src/dataset/CLAUDE.md); display-unit
// conversion is the app's job.
const KG_TO_LBS = 2.20462262185;

export function convertE1RMToDisplayUnit(e1rmKg: number, unit: 'lbs' | 'kg'): number {
  return unit === 'lbs' ? e1rmKg * KG_TO_LBS : e1rmKg;
}

/**
 * Finds the canonical string for a given exercise by display name.
 * Searches through available canonicals in the model and points.
 *
 * Matching strategy:
 * 1. If display name matches the baseline canonical, return the baseline
 * 2. Search for a canonical that exactly matches the slugified display name
 * 3. Search for a canonical that contains the slugified display name as a substring
 * 4. For variants, look in model.variantFactor keys
 */
export function findCanonicalForExercise(
  displayName: string,
  baselineCanonical: string,
  model: NormalizationModel,
  e1rmPoints: Point[],
  liftType: string
): string | null {
  // If the display name matches the baseline, use the baseline canonical
  if (displayName === baselineCanonical) {
    return baselineCanonical;
  }

  // Get all unique canonicals that appear in the e1rm points for this lift type
  const pointsForLift = e1rmPoints.filter((p) => p.tags.has(`lift:${liftType}`));
  const canonicalsInPoints = new Set(pointsForLift.map((p) => p.series));

  // Try to find a canonical by display name match
  // First, try exact match after kebab-slugifying
  const slugifiedDisplay = displayName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[()]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Exact match takes priority over substring matching: a bare exercise's slug (e.g.
  // "bench") is a substring of every compound variant's canonical (e.g. "bench-american"),
  // so checking substrings before exact matches picks the wrong variant depending on
  // Set iteration (insertion/chronological) order. Resolve all exact matches first.
  if (canonicalsInPoints.has(slugifiedDisplay)) {
    return slugifiedDisplay;
  }

  // Check if any canonical starts with or contains the slugified display name
  for (const canonical of canonicalsInPoints) {
    if (canonical.includes(slugifiedDisplay)) {
      return canonical;
    }
  }

  // If no match found by name, look for any variant canonical in variantFactor
  // This is a fallback for cases where we can't match by name
  for (const canonical of canonicalsInPoints) {
    if (canonical !== baselineCanonical && model.variantFactor[canonical]) {
      // Return the first available variant (this is imperfect but handles cases
      // where we don't have enough info to match by name)
      return canonical;
    }
  }

  // Fallback: return baseline if nothing else matches
  if (canonicalsInPoints.has(baselineCanonical)) {
    return baselineCanonical;
  }

  return null;
}

export function resolveE1RMEstimate(params: {
  liftType: string;
  facetDisplayName: string;
  baselineName: string | null | undefined;
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

  const targetCanonical = findCanonicalForExercise(
    params.facetDisplayName,
    baselineCanonical,
    params.model,
    params.e1rmPoints,
    params.liftType
  );
  if (!targetCanonical) {
    return null;
  }

  return findBestE1RMFromPipeline(
    targetCanonical,
    baselineCanonical,
    baselinePoints,
    params.model,
    params.baselineName ?? baselineCanonical
  );
}
