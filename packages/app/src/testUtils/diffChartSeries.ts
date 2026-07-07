import type { ChartPoint, ConjugateExercise } from '@dyel/core';

/**
 * One joined row: the same local calendar date as seen by two independently-produced
 * `ChartPoint[]` arrays (e.g. a legacy `@dyel/core` run and a `@dyel/pipeline` run over
 * the same fixture). Either side may be missing a point for a given date.
 */
export interface JoinedChartPoint {
  dateKey: string; // local YYYY-MM-DD
  a?: ChartPoint;
  b?: ChartPoint;
}

/**
 * Result of comparing a legacy baseline `ConjugateExercise` with a pipeline canonical id string.
 * Used in parity tests to verify the two implementations selected the same baseline exercise.
 */
export interface BaselineIdentityComparison {
  family: string;
  legacyLabel: string | null;
  pipelineLabel: string | null;
  matches: boolean;
}

/**
 * Statistics comparing one named series across two joined `ChartPoint[]` arrays.
 * Used for live core-vs-pipeline diffing (as opposed to `compareChartSeries`, which
 * summarizes a single series from a single array).
 */
export interface SeriesDiff {
  seriesName: string;
  comparedCount: number; // dates where both sides have a numeric value for this series
  missingInA: number; // dates where b has the series but a does not
  missingInB: number; // dates where a has the series but b does not
  maxAbsDiff: number;
  maxRelDiff: number; // |a - b| / max(|a|, |b|), 0 when both are 0
}

/** Local (not UTC) YYYY-MM-DD key for a `ChartPoint.date` string, for cross-timezone-safe joins. */
function localDateKey(date: string): string {
  // Bare YYYY-MM-DD date strings are already local calendar keys; no need to round-trip through
  // new Date() (which parses them as UTC midnight, causing off-by-one in negative-offset timezones).
  const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.exec(date);
  if (dateOnlyMatch) {
    return date;
  }

  // Full datetime/instant strings: extract local date components.
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Joins two `ChartPoint[]` arrays by local calendar date so series values can be diffed
 * directly, even when the two sources key their `date` fields differently (e.g. a local
 * date string vs. a UTC ISO instant string).
 */
export function joinChartPointsByDate(a: ChartPoint[], b: ChartPoint[]): JoinedChartPoint[] {
  const byKey = new Map<string, JoinedChartPoint>();

  for (const point of a) {
    const dateKey = localDateKey(String(point.date));
    const existing = byKey.get(dateKey);
    if (existing) {
      existing.a = point;
    } else {
      byKey.set(dateKey, { dateKey, a: point });
    }
  }

  for (const point of b) {
    const dateKey = localDateKey(String(point.date));
    const existing = byKey.get(dateKey);
    if (existing) {
      existing.b = point;
    } else {
      byKey.set(dateKey, { dateKey, b: point });
    }
  }

  return [...byKey.values()].sort((x, y) => x.dateKey.localeCompare(y.dateKey));
}

/**
 * Diffs a single named series across a joined point set produced by `joinChartPointsByDate`.
 * Single-pass: tallies comparison and gap counts together rather than filtering/mapping/
 * reducing separately.
 */
export function diffSeries(joined: JoinedChartPoint[], seriesName: string): SeriesDiff {
  let comparedCount = 0;
  let missingInA = 0;
  let missingInB = 0;
  let maxAbsDiff = 0;
  let maxRelDiff = 0;

  for (const { a, b } of joined) {
    const aVal = a?.[seriesName];
    const bVal = b?.[seriesName];
    const hasA = typeof aVal === 'number';
    const hasB = typeof bVal === 'number';

    if (hasA && hasB) {
      comparedCount++;
      const absDiff = Math.abs(aVal - bVal);
      const denom = Math.max(Math.abs(aVal), Math.abs(bVal));
      const relDiff = denom === 0 ? 0 : absDiff / denom;
      if (absDiff > maxAbsDiff) {
        maxAbsDiff = absDiff;
      }
      if (relDiff > maxRelDiff) {
        maxRelDiff = relDiff;
      }
    } else if (hasA && !hasB) {
      missingInB++;
    } else if (hasB && !hasA) {
      missingInA++;
    }
  }

  return { seriesName, comparedCount, missingInA, missingInB, maxAbsDiff, maxRelDiff };
}

/**
 * Rebuilds a canonical-format slug from a legacy `ConjugateExercise`'s structural fields
 * (bar, stance, equipment, addlWts), omitting defaults (standard bar, competition stance)
 * to match the pipeline's canonical format. Used for baseline identity comparison in parity tests.
 */
function buildBaselineCanonical(ex: ConjugateExercise): string {
  const parts: string[] = [ex.type];

  if (ex.bar && ex.bar !== 'standard') {
    parts.push(ex.bar);
  }
  if (ex.stance && ex.stance !== 'competition') {
    parts.push(ex.stance);
  }
  if (ex.equipment) {
    parts.push(ex.equipment);
  }
  ex.addlWts.forEach((w) => {
    if (w === 'rev. bands') {
      parts.push('rev-bands');
    } else {
      parts.push(w);
    }
  });

  return parts.join('-');
}

/**
 * Compares a legacy `ConjugateExercise` baseline with a pipeline canonical id string,
 * returning a comparison result with human-readable labels and a match boolean.
 *
 * For deadlift, compares resolved stance (accounting for 'opposite' and null stances).
 * For squat/bench, compares full canonical structure (bar, equipment, addlWts).
 *
 * @param family - lift type ('squat', 'bench', 'deadlift')
 * @param legacyEx - legacy ConjugateExercise or undefined
 * @param pipelineCanonical - pipeline canonical id string or undefined
 * @param deadliftStance - user's primary deadlift stance preference, for resolving 'opposite' and null
 * @returns comparison with labels and match boolean
 */
export function compareBaselineIdentity(
  family: string,
  legacyEx: ConjugateExercise | undefined,
  pipelineCanonical: string | undefined,
  deadliftStance: 'sumo' | 'conventional' = 'sumo'
): BaselineIdentityComparison {
  const legacyLabel = legacyEx?.displayName ?? null;
  const pipelineLabel = pipelineCanonical ?? null;

  // Both undefined: match
  if (!legacyEx && !pipelineCanonical) {
    return { family, legacyLabel, pipelineLabel, matches: true };
  }

  // One undefined: mismatch
  if (!legacyEx || !pipelineCanonical) {
    return { family, legacyLabel, pipelineLabel, matches: false };
  }

  // For deadlift, compare resolved stance (accounting for opposite and null)
  if (family === 'deadlift') {
    const legacyStance =
      legacyEx.stance === 'sumo' || legacyEx.stance === 'conventional'
        ? legacyEx.stance
        : legacyEx.stance === 'opposite'
          ? deadliftStance === 'sumo'
            ? 'conventional'
            : 'sumo'
          : deadliftStance;

    const pipelineStance = pipelineCanonical.endsWith('-sumo')
      ? 'sumo'
      : pipelineCanonical.endsWith('-opposite')
        ? deadliftStance === 'sumo'
          ? 'conventional'
          : 'sumo'
        : pipelineCanonical.endsWith('-conventional')
          ? 'conventional'
          : deadliftStance; // Default/comp canonical (no stance suffix) uses athlete preference

    return {
      family,
      legacyLabel: legacyStance,
      pipelineLabel: pipelineStance,
      matches: legacyStance === pipelineStance,
    };
  }

  // For squat and bench, rebuild canonical from legacy fields and compare
  const legacyCanonical = buildBaselineCanonical(legacyEx);
  return {
    family,
    legacyLabel: legacyEx.displayName,
    pipelineLabel: pipelineCanonical,
    matches: legacyCanonical === pipelineCanonical,
  };
}
